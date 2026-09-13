import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pdfToText } from 'pdf-ts';
import { chunkText } from '../utils/chunking.util.js';
import { generateEmbeddings } from '../utils/embedding.utils.js';
import { DocumentModel } from '../models/document.model.js';
import { cosineSimilarity } from '../utils/vector.util.js';
import { generateRagResponse } from '../services/rag.service.js';
import { RagRepository } from '../repositories/rag.repository.js';
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

function parseAndStructureDocument(rawText: string): string {
  const lines = rawText.split('\n');
  const processedLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const columns = line.split(/\s{3,}|\t/).filter(Boolean);

    if (columns.length >= 2) {
      inTable = true;
      tableRows.push(columns);
    } else {
      if (inTable && tableRows.length > 0) {
        processedLines.push(formatTableToMarkdown(tableRows));
        tableRows = [];
        inTable = false;
      }
      processedLines.push(line);
    }
  }
  if (tableRows.length > 0) {
    processedLines.push(formatTableToMarkdown(tableRows));
  }

  let formattedText = processedLines.join('\n');

  const sectionKeywords = [
    'EDUCATION',
    'SKILLS',
    'EXPERIENCE',
    'PROJECTS',
    'CERTIFICATIONS',
    'SUMMARY',
    'PROFILE',
    'WORK HISTORY',
    'TECHNICAL SKILLS',
  ];

  sectionKeywords.forEach((keyword) => {
    const regex = new RegExp(`^(${keyword})[:]?$`, 'gim');
    formattedText = formattedText.replace(regex, `\n\n## $1\n`);
  });

  const paragraphBlocks = formattedText.split('\n\n');
  if (paragraphBlocks.length > 0 && !paragraphBlocks[0].startsWith('#')) {
    paragraphBlocks[0] = `# ${paragraphBlocks[0]}`;
  }

  return paragraphBlocks.join('\n\n');
}

function formatTableToMarkdown(rows: string[][]): string {
  if (rows.length === 0) return '';
  let md = '\n';
  const header = rows[0];
  md += `| ${header.join(' | ')} |\n`;
  md += `| ${header.map(() => '---').join(' | ')} |\n`;
  for (let i = 1; i < rows.length; i++) {
    md += `| ${rows[i].join(' | ')} |\n`;
  }
  return md + '\n';
}

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
      chunks: doc.chunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        text: c.text,
        characterCount: c.characterCount,
        vectorDimensions: c.embedding?.length || 0,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return res.status(200).json({ success: true, data: formattedDocs });
  } catch (error) {
    next(error);
  }
});

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
      const rawText = await pdfToText(fileBuffer);
      const structuredText = parseAndStructureDocument(rawText);

      const savedDoc = await DocumentModel.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        characterCount: structuredText.length,
        totalChunks: 0,
        fullText: structuredText,
        chunks: [],
      });

      return res.status(201).json({
        success: true,
        data: {
          documentId: savedDoc._id,
          filename: savedDoc.filename,
          originalName: savedDoc.originalName,
          fileSize: savedDoc.fileSize,
          characterCount: savedDoc.characterCount,
          totalChunks: 0,
          fullText: savedDoc.fullText,
          chunks: [],
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

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

    const fileBuffer = fs.readFileSync(filePath);
    const rawText = await pdfToText(fileBuffer);
    const extractedText = doc.fullText || parseAndStructureDocument(rawText);
    const chunks = chunkText(extractedText, 500, 50);
    const embeddedChunks = await generateEmbeddings(chunks);

    doc.characterCount = extractedText.length;
    doc.totalChunks = embeddedChunks.length;
    doc.fullText = extractedText;
    doc.chunks = embeddedChunks;
    await doc.save();

    return res.status(200).json({
      success: true,
      data: {
        documentId: doc._id,
        originalName: doc.originalName,
        characterCount: doc.characterCount,
        totalChunks: doc.totalChunks,
        fullText: doc.fullText,
        chunks: doc.chunks.map((c) => ({
          chunkIndex: c.chunkIndex,
          text: c.text,
          characterCount: c.characterCount,
          vectorDimensions: c.embedding?.length || 0,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

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

router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, error: 'Document not found.' });
    }

    if (doc.filename) {
      const filePath = path.join(uploadDir, doc.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await DocumentModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Document successfully deleted from storage and database.',
    });
  } catch (error) {
    next(error);
  }
});

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

    const scoredChunks: Array<{
      filename: string;
      chunkIndex: number;
      text: string;
      characterCount: number;
      score: number;
    }> = [];

    for (const doc of docs) {
      for (const chunk of doc.chunks) {
        scoredChunks.push({
          filename: doc.originalName,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          characterCount: chunk.characterCount,
          score: cosineSimilarity(queryVector, chunk.embedding || []),
        });
      }
    }

    scoredChunks.sort((a, b) => b.score - a.score);
    const topResults = scoredChunks.slice(0, topK);

    return res.status(200).json({
      success: true,
      data: { query, matchedChunks: topResults },
    });
  } catch (error) {
    next(error);
  }
});

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
        : result.answer || JSON.stringify(result);

    await RagRepository.saveMessage(studentId, 'model', responseText);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Added /compare route for multi-document comparisons
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
        : result.answer || JSON.stringify(result);

    return res.status(200).json({
      success: true,
      data: { comparison: responseText },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
