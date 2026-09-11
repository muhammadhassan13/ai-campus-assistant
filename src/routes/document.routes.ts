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

// Protect all document routes
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

// GET /api/documents - Retrieve all stored documents with comprehensive chunk/metadata info
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
      chunks: doc.chunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        text: c.text,
        characterCount: c.characterCount,
        vectorDimensions: c.embedding?.length || 0,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: formattedDocs,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/documents/upload - Upload file to disk and save unchunked record
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

      const savedDoc = await DocumentModel.create({
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        characterCount: 0,
        totalChunks: 0,
        chunks: [],
      });

      return res.status(201).json({
        success: true,
        data: {
          documentId: savedDoc._id,
          filename: savedDoc.filename,
          originalName: savedDoc.originalName,
          fileSize: savedDoc.fileSize,
          characterCount: 0,
          totalChunks: 0,
          chunks: [],
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/documents/:id/chunk - Explicitly chunk and vectorize a staged document
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
    const extractedText = await pdfToText(fileBuffer);
    const chunks = chunkText(extractedText, 500, 50);
    const embeddedChunks = await generateEmbeddings(chunks);

    doc.characterCount = extractedText.length;
    doc.totalChunks = embeddedChunks.length;
    doc.chunks = embeddedChunks;
    await doc.save();

    return res.status(200).json({
      success: true,
      data: {
        documentId: doc._id,
        originalName: doc.originalName,
        characterCount: doc.characterCount,
        totalChunks: doc.totalChunks,
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

// POST /api/documents/:id/unchunk - Remove chunks and embeddings from a document
router.post('/:id/unchunk', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const doc = await DocumentModel.findById(id);

    if (!doc) {
      return res
        .status(404)
        .json({ success: false, error: 'Document not found.' });
    }

    if (!doc.chunks || doc.chunks.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Document is already unchunked.' });
    }

    doc.characterCount = 0;
    doc.totalChunks = 0;
    doc.chunks = [];
    await doc.save();

    return res.status(200).json({
      success: true,
      data: {
        documentId: doc._id,
        originalName: doc.originalName,
        characterCount: 0,
        totalChunks: 0,
        chunks: [],
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/documents/:id - Delete document from disk and MongoDB
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

// POST /api/documents/query - Multi-document vector similarity search
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
      data: {
        query,
        matchedChunks: topResults,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/documents/chat - RAG endpoint using Groq with multi-doc citations and PostgreSQL history logging
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

    // 1. Save user prompt to PostgreSQL document conversation history table
    await RagRepository.saveMessage(studentId, 'user', query.trim());

    // 2. Generate RAG response via service
    const result = await generateRagResponse(query, targetDocs, topK || 3);
    const responseText =
      typeof result === 'string'
        ? result
        : result.answer || JSON.stringify(result);

    // 3. Save model reply to PostgreSQL document conversation history table
    await RagRepository.saveMessage(studentId, 'model', responseText);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
