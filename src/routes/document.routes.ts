import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pdfToText } from 'pdf-ts';
import { chunkText } from '../utils/chunking.util.js';
import { generateEmbeddings } from '../utils/embedding.utils.js';

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

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: 'No file uploaded.' });
    }

    // 1. Read PDF file buffer from disk
    const fileBuffer = fs.readFileSync(req.file.path);

    // 2. Extract text from PDF
    const extractedText = await pdfToText(fileBuffer);

    // 3. Generate line-aware text chunks
    const chunks = chunkText(extractedText, 500, 50);

    // 4. Generate 384-dimensional vector embeddings
    const embeddedChunks = await generateEmbeddings(chunks);

    // 5. Return JSON payload for verification
    return res.status(200).json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        characterCount: extractedText.length,
        totalChunks: embeddedChunks.length,
        vectorDimensions: embeddedChunks[0]?.embedding.length || 0,
        sampleChunkWithEmbedding: {
          chunkIndex: embeddedChunks[0]?.chunkIndex,
          text: embeddedChunks[0]?.text,
          embeddingPreview: embeddedChunks[0]?.embedding.slice(0, 5),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
