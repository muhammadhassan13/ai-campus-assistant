import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { transcribeAudio } from '../services/voice.service.js';
import { generateRagResponse } from '../services/rag.service.js';

const router = Router();

const audioUploadDir = path.join(process.cwd(), 'uploads/audio');
if (!fs.existsSync(audioUploadDir)) {
  fs.mkdirSync(audioUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, audioUploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, `voice-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

/**
 * REQUEST 1: Independent Audio Upload & STT Transcription
 * POST /api/voice/transcribe
 */
router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided. Use form field "audio".',
      });
    }

    // Transcribe audio using Groq Whisper API
    const transcript = await transcribeAudio(req.file.path);

    return res.status(200).json({
      success: true,
      message: 'Audio uploaded and transcribed successfully.',
      data: {
        fileInfo: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          sizeBytes: req.file.size,
          savedPath: req.file.path,
        },
        transcript,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * REQUEST 2: Spoken Document Question -> STT -> RAG Answer
 * POST /api/voice/rag-chat
 */
router.post('/rag-chat', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided. Use form field "audio".',
      });
    }

    // 1. Transcribe spoken question
    const transcript = await transcribeAudio(req.file.path);

    // 2. Route transcript through RAG pipeline
    const documentId = req.body.documentId;
    const topK = req.body.topK ? parseInt(req.body.topK, 10) : 3;

    const ragResult = await generateRagResponse(transcript, documentId, topK);

    return res.status(200).json({
      success: true,
      message: 'Spoken question processed via RAG pipeline successfully.',
      data: {
        fileInfo: {
          filename: req.file.filename,
          savedPath: req.file.path,
        },
        transcript,
        answer: ragResult.answer,
        sources: ragResult.sources,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
