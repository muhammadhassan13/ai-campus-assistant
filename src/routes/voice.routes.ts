import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { transcribeAudio, textToSpeech } from '../services/voice.service.js';
import { generateRagResponse } from '../services/rag.service.js';

const router = Router();

// Ensure uploads/audio directory exists
const audioUploadDir = path.join(process.cwd(), 'uploads/audio');
if (!fs.existsSync(audioUploadDir)) {
  fs.mkdirSync(audioUploadDir, { recursive: true });
}

// Multer storage configuration
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
 * REQUEST 1: Independent Audio Upload & STT Transcription (Items 1 & 2)
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
 * REQUEST 2: Spoken Document Question -> STT -> RAG -> Full TTS Audio Reply (Items 1, 2, 3 & 4)
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

    // 1. Transcribe spoken question (STT)
    const transcript = await transcribeAudio(req.file.path);

    // Clean up temporary uploaded question audio
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // 2. Route transcript through RAG pipeline
    const documentId = req.body.documentId;
    const topK = req.body.topK ? parseInt(req.body.topK, 10) : 3;

    const ragResult = await generateRagResponse(transcript, documentId, topK);

    // 3. Strip Markdown formatting so speech output reads cleanly
    const speechText = ragResult.answer
      .replace(/[*_#`~]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .trim();

    // 4. Synthesize the FULL response into an audio file (TTS)
    const replyFileName = `reply-${Date.now()}.mp3`;
    const replyFilePath = path.join(audioUploadDir, replyFileName);

    await textToSpeech(speechText, replyFilePath);

    return res.status(200).json({
      success: true,
      message:
        'Spoken question processed via RAG pipeline and full audio reply generated successfully.',
      data: {
        transcript,
        answer: ragResult.answer,
        sources: ragResult.sources,
        audioUrl: `/uploads/audio/${replyFileName}`,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
