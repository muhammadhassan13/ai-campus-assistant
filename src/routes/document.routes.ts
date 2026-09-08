import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pdfToText } from 'pdf-ts';
import { chunkText } from '../utils/chunking.util.js';
import { generateEmbeddings } from '../utils/embedding.utils.js';
import { DocumentModel } from '../models/document.model.js';
import { cosineSimilarity } from '../utils/vectorSearch.util.js';
import type { ScoredChunk } from '../utils/vectorSearch.util.js';

const router = Router();

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

// POST /api/documents/upload - Upload, process, embed, and store document
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: 'No file uploaded.' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const extractedText = await pdfToText(fileBuffer);
    const chunks = chunkText(extractedText, 500, 50);
    const embeddedChunks = await generateEmbeddings(chunks);

    // Save document and embeddings to MongoDB
    const savedDoc = await DocumentModel.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      characterCount: extractedText.length,
      totalChunks: embeddedChunks.length,
      chunks: embeddedChunks,
    });

    return res.status(201).json({
      success: true,
      data: {
        documentId: savedDoc._id,
        filename: savedDoc.filename,
        originalName: savedDoc.originalName,
        totalChunks: savedDoc.totalChunks,
        vectorDimensions: savedDoc.chunks[0]?.embedding.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/documents/query - Vector similarity search endpoint
router.post('/query', async (req, res, next) => {
  try {
    const { query, documentId, topK = 3 } = req.body;

    if (!query || typeof query !== 'string') {
      return res
        .status(400)
        .json({ success: false, error: 'Query string is required.' });
    }

    // Retrieve document from MongoDB
    const document = documentId
      ? await DocumentModel.findById(documentId)
      : await DocumentModel.findOne().sort({ createdAt: -1 });

    if (!document) {
      return res
        .status(404)
        .json({ success: false, error: 'No uploaded document found.' });
    }

    // Embed the query text
    const queryEmbeddings = await generateEmbeddings([
      { chunkIndex: 0, text: query, characterCount: query.length },
    ]);
    const queryVector = queryEmbeddings[0].embedding;

    // Calculate similarity score against document chunks
    const scoredChunks: ScoredChunk[] = document.chunks.map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      characterCount: chunk.characterCount,
      score: cosineSimilarity(queryVector, chunk.embedding),
    }));

    // Rank chunks by similarity score
    scoredChunks.sort((a, b) => b.score - a.score);
    const topResults = scoredChunks.slice(0, topK);

    return res.status(200).json({
      success: true,
      data: {
        query,
        documentId: document._id,
        matchedChunks: topResults,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
