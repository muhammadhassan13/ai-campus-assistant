import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isValidObjectId } from 'mongoose';
import { generateEmbeddings } from '../utils/embedding.utils.js';
import { DocumentModel } from '../models/document.model.js';
import { cosineSimilarity } from '../utils/vector.util.js';
import { generateRagResponse } from '../services/rag.service.js';
import { RagRepository } from '../repositories/rag.repository.js';
import {
  parsePdfMultiColumn,
  parsePdfWithLlamaParse,
  type ParsedChunk,
} from '../services/pdfParserService.js';
import {
  authenticateToken,
  type AuthenticatedRequest,
} from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

function shouldUseLlamaParse(parser: unknown): boolean {
  if (parser === 'local') return false;
  return parser === 'llamaparse' || Boolean(process.env.LLAMA_CLOUD_API_KEY);
}

interface MappedChunk {
  chunkIndex: number;
  text: string;
  characterCount: number;
  pageNumber?: number;
  startOffset?: number;
  endOffset?: number;
  nodeId?: string;
  markdownBlockId: string;
  bbox?: { x: number; y: number; width: number; height: number };
}

interface CustomChunkType {
  chunkIndex?: number;
  text?: string;
  characterCount?: number;
  pageNumber?: number;
  startOffset?: number;
  endOffset?: number;
  nodeId?: string;
  markdownBlockId?: string;
  embedding?: number[];
  bbox?: { x?: number; y?: number; width?: number; height?: number };
}

function normalizeBbox(bbox: unknown) {
  if (Array.isArray(bbox) && bbox.length >= 4) {
    return {
      x: Number(bbox[0]),
      y: Number(bbox[1]),
      width: Number(bbox[2]),
      height: Number(bbox[3]),
    };
  }
  return bbox as
    { x: number; y: number; width: number; height: number } | undefined;
}

// 1. Get all documents
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const docs = await DocumentModel.find();
    const formattedDocs = docs.map((doc) => ({
      documentId: doc._id,
      filename: doc.filename,
      originalName: doc.originalName,
      fileSize: doc.fileSize,
      characterCount: doc.characterCount,
      totalChunks: doc.totalChunks,
      fullText: doc.fullText || '',
      chunks: doc.chunks.map((chunk) => {
        const c = chunk as unknown as CustomChunkType;
        return {
          chunkIndex: c.chunkIndex,
          text: c.text,
          characterCount: c.characterCount,
          pageNumber: c.pageNumber,
          startOffset: c.startOffset,
          endOffset: c.endOffset,
          nodeId: c.nodeId,
          markdownBlockId: c.markdownBlockId || `block-${c.chunkIndex}`,
          bbox: c.bbox,
          vectorDimensions: c.embedding?.length || 0,
        };
      }),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return res.status(200).json({ success: true, data: formattedDocs });
  } catch (error) {
    next(error);
  }
});

// 2. Upload, parse, map, store in DB, and save raw parser markdown file
router.post(
  '/upload',
  upload.single('file'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: 'No file uploaded.' });
      }

      const filePath = path.join(uploadDir, req.file.filename);
      const fileBuffer = fs.readFileSync(filePath);
      const useLlamaParse = shouldUseLlamaParse(req.query.parser);
      const numColumns = req.query.columns
        ? parseInt(req.query.columns as string, 10)
        : undefined;

      const parseResult = useLlamaParse
        ? await parsePdfWithLlamaParse(fileBuffer, req.file.originalname)
        : await parsePdfMultiColumn(
            fileBuffer,
            req.file.originalname,
            numColumns
          );

      const structuredText = parseResult.fullText;
      const chunksData: ParsedChunk[] = parseResult.chunks;

      const mappedChunks: MappedChunk[] = chunksData.map((c, index) => {
        const chunkIndex = c.chunkIndex ?? index;
        return {
          chunkIndex,
          text: c.text,
          characterCount: c.characterCount ?? c.text.length,
          pageNumber: c.pageNumber,
          startOffset: c.startOffset,
          endOffset: c.endOffset,
          nodeId: c.nodeId,
          markdownBlockId: c.nodeId || `block-${chunkIndex}`,
          bbox: normalizeBbox(c.bbox),
        };
      });

      const savedDoc = await DocumentModel.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        characterCount: structuredText.length,
        totalChunks: mappedChunks.length,
        fullText: structuredText,
        chunks: mappedChunks,
        blocks: parseResult.blocks || [],
        pageWidth: parseResult.pageDimensions?.width || 0,
        pageHeight: parseResult.pageDimensions?.height || 0,
      });

      const mdFilePath = path.join(uploadDir, `${savedDoc._id}.md`);
      fs.writeFileSync(mdFilePath, parseResult.fullText, 'utf-8');

      return res.status(201).json({
        success: true,
        data: {
          documentId: savedDoc._id,
          filename: savedDoc.filename,
          originalName: savedDoc.originalName,
          fileSize: savedDoc.fileSize,
          characterCount: savedDoc.characterCount,
          totalChunks: savedDoc.totalChunks,
          fullText: savedDoc.fullText,
          chunks: savedDoc.chunks,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// 3. Fetch saved Markdown file
router.get('/:id/markdown', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const mdFilePath = path.join(uploadDir, `${id}.md`);

    if (!fs.existsSync(mdFilePath)) {
      return res.status(404).json({
        success: false,
        error: 'Markdown file not found for this document.',
      });
    }

    const markdownContent = fs.readFileSync(mdFilePath, 'utf-8');
    return res.status(200).json({
      success: true,
      data: { documentId: id, markdownContent },
    });
  } catch (error) {
    next(error);
  }
});

// 4. Fetch raw Markdown + MongoDB blocks for visual comparison
router.get('/:id/comparison', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'Document not found.',
      });
    }

    const mdFilePath = path.join(uploadDir, `${id}.md`);
    let markdownContent = '';

    if (fs.existsSync(mdFilePath)) {
      markdownContent = fs.readFileSync(mdFilePath, 'utf-8');
    }

    return res.status(200).json({
      success: true,
      data: {
        documentId: doc._id,
        filename: doc.filename,
        originalName: doc.originalName,
        markdownContent,
        blocks: doc.blocks || [],
        pageWidth: doc.pageWidth || 0,
        pageHeight: doc.pageHeight || 0,
        chunks: doc.chunks.map((chunk) => {
          const c = chunk as unknown as CustomChunkType;
          return {
            chunkIndex: c.chunkIndex,
            text: c.text,
            characterCount: c.characterCount,
            pageNumber: c.pageNumber,
            startOffset: c.startOffset,
            endOffset: c.endOffset,
            nodeId: c.nodeId,
            markdownBlockId: c.markdownBlockId || `block-${c.chunkIndex}`,
            bbox: c.bbox,
          };
        }),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 5. Chunk & Embed existing document
router.post('/:id/chunk', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, error: 'Document not found.' });
    }

    if (doc.chunks && doc.chunks.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Document is already chunked and embedded.',
      });
    }

    const filePath = path.join(uploadDir, doc.filename);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, error: 'Physical file not found on disk.' });
    }

    const useLlamaParse = shouldUseLlamaParse(req.body.parser);
    const numColumns = req.body.numColumns
      ? Number(req.body.numColumns)
      : undefined;

    const fileBuffer = fs.readFileSync(filePath);
    const spatialChunks = useLlamaParse
      ? await parsePdfWithLlamaParse(fileBuffer, doc.originalName)
      : await parsePdfMultiColumn(fileBuffer, doc.originalName, numColumns);

    const formattedChunksForEmbedding = spatialChunks.chunks.map(
      (c: ParsedChunk, index: number) => {
        const chunkIndex = c.chunkIndex ?? index;
        return {
          chunkIndex,
          text: c.text,
          characterCount: c.characterCount ?? c.text.length,
          pageNumber: c.pageNumber,
          startOffset: c.startOffset,
          endOffset: c.endOffset,
          nodeId: c.nodeId,
          markdownBlockId: c.nodeId || `block-${chunkIndex}`,
          bbox: normalizeBbox(c.bbox),
        };
      }
    );

    const embeddedChunks = await generateEmbeddings(
      formattedChunksForEmbedding
    );

    const extractedText =
      spatialChunks.fullText ||
      doc.fullText ||
      spatialChunks.chunks.map((c: ParsedChunk) => c.text).join('\n\n');

    doc.characterCount = extractedText.length;
    doc.totalChunks = embeddedChunks.length;
    doc.fullText = extractedText;
    doc.chunks = embeddedChunks;
    doc.blocks = spatialChunks.blocks || doc.blocks || [];
    doc.pageWidth = spatialChunks.pageDimensions?.width || doc.pageWidth;
    doc.pageHeight = spatialChunks.pageDimensions?.height || doc.pageHeight;
    await doc.save();

    const mdFilePath = path.join(uploadDir, `${doc._id}.md`);
    fs.writeFileSync(mdFilePath, extractedText, 'utf-8');

    return res.status(200).json({
      success: true,
      data: {
        documentId: doc._id,
        originalName: doc.originalName,
        characterCount: doc.characterCount,
        totalChunks: doc.totalChunks,
        fullText: doc.fullText,
        chunks: doc.chunks.map((chunk) => {
          const c = chunk as unknown as CustomChunkType;
          return {
            chunkIndex: c.chunkIndex,
            text: c.text,
            characterCount: c.characterCount,
            pageNumber: c.pageNumber,
            startOffset: c.startOffset,
            endOffset: c.endOffset,
            nodeId: c.nodeId,
            markdownBlockId: c.markdownBlockId || `block-${c.chunkIndex}`,
            bbox: c.bbox,
            vectorDimensions: c.embedding?.length || 0,
          };
        }),
      },
    });
  } catch (error) {
    next(error);
  }
});

// 6. Unchunk a document
router.post('/:id/unchunk', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, error: 'Document not found.' });
    }

    doc.totalChunks = 0;
    doc.chunks = [];
    await doc.save();

    return res.status(200).json({
      success: true,
      data: {
        documentId: doc._id,
        originalName: doc.originalName,
        characterCount: doc.characterCount,
        totalChunks: 0,
        fullText: doc.fullText,
        chunks: [],
      },
    });
  } catch (error) {
    next(error);
  }
});

// 7. Delete document + source file + markdown file
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid document ID.' });
    }

    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, error: 'Document not found.' });
    }

    if (doc.filename) {
      const filePath = path.join(uploadDir, doc.filename);
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { force: true });
      }
    }

    const mdFilePath = path.join(uploadDir, `${id}.md`);
    if (fs.existsSync(mdFilePath)) {
      fs.rmSync(mdFilePath, { force: true });
    }

    await DocumentModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Document, source file, and markdown file successfully deleted.',
    });
  } catch (error) {
    next(error);
  }
});

// 8. Query vector store
router.post('/query', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { query, documentId, topK = 3 } = req.body;

    if (!query || typeof query !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'Query string is required.' });
    }

    const docs = documentId
      ? await DocumentModel.find({ _id: documentId })
      : await DocumentModel.find();

    if (!docs || docs.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: 'No uploaded documents found.' });
    }

    const queryEmbeddings = await generateEmbeddings([
      { chunkIndex: 0, text: query, characterCount: query.length },
    ]);
    const queryVector = queryEmbeddings[0].embedding;

    const scoredChunks: Array<Record<string, unknown>> = [];

    for (const doc of docs) {
      for (const chunk of doc.chunks) {
        const c = chunk as unknown as CustomChunkType;
        scoredChunks.push({
          filename: doc.originalName,
          documentId: doc._id,
          chunkIndex: c.chunkIndex,
          text: c.text,
          characterCount: c.characterCount,
          pageNumber: c.pageNumber,
          startOffset: c.startOffset,
          endOffset: c.endOffset,
          nodeId: c.nodeId,
          markdownBlockId: c.markdownBlockId || `block-${c.chunkIndex}`,
          bbox: c.bbox,
          score: cosineSimilarity(queryVector, c.embedding || []),
        });
      }
    }

    scoredChunks.sort((a, b) => Number(b.score) - Number(a.score));
    const topResults = scoredChunks.slice(0, Number(topK));

    return res.status(200).json({
      success: true,
      data: { query, matchedChunks: topResults },
    });
  } catch (error) {
    next(error);
  }
});

// 9. RAG Chat
router.post('/chat', async (req: AuthenticatedRequest, res, next) => {
  try {
    const studentId = req.user?.student_id;
    const { query, documentId, topK } = req.body;

    if (!query || typeof query !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'Query string is required.' });
    }

    if (!studentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing student token.',
      });
    }

    let targetDocs = documentId;
    if (Array.isArray(documentId) && documentId.length > 0) {
      targetDocs = documentId;
    } else if (typeof documentId === 'string' && documentId.trim() !== '') {
      targetDocs = documentId;
    } else {
      targetDocs = undefined;
    }

    await RagRepository.saveMessage(studentId, 'user', query.trim());

    const result = await generateRagResponse(query, targetDocs, topK || 3);
    const responseText =
      typeof result === 'string'
        ? result
        : (result as { answer?: string }).answer || JSON.stringify(result);

    await RagRepository.saveMessage(studentId, 'model', responseText);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 10. Compare two documents
router.post('/compare', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { documentIdA, documentIdB } = req.body;

    if (!documentIdA || !documentIdB) {
      return res.status(400).json({
        success: false,
        error: 'Both documentIdA and documentIdB are required.',
      });
    }

    const docA = await DocumentModel.findById(documentIdA);
    const docB = await DocumentModel.findById(documentIdB);

    if (!docA || !docB) {
      return res.status(404).json({
        success: false,
        error: 'One or both documents could not be found.',
      });
    }

    const comparisonQuery = `Compare the following two documents thoroughly:\n\nDocument 1 (${docA.originalName}):\n${docA.fullText}\n\nDocument 2 (${docB.originalName}):\n${docB.fullText}\n\nProvide key similarities, differences, and a structured breakdown.`;

    const result = await generateRagResponse(
      comparisonQuery,
      [documentIdA, documentIdB],
      5
    );
    const responseText =
      typeof result === 'string'
        ? result
        : (result as { answer?: string }).answer || JSON.stringify(result);

    return res.status(200).json({
      success: true,
      data: { comparison: responseText },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
