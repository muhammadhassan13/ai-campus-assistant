import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { transcribeAudio, textToSpeech } from '../services/voice.service.js';
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
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `voice-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

/**
 * POST /api/voice/transcribe
 * Accepts real-time mic recording blob, transcribes it via Whisper, and returns text.
 */
router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided. Use form field "audio".',
      });
    }

    const transcript = await transcribeAudio(req.file.path);

    // Clean up temporary recorded file after transcription
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(200).json({
      success: true,
      message: 'Audio transcribed successfully.',
      data: {
        transcript,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/rag-chat', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided.',
      });
    }

    const transcript = await transcribeAudio(req.file.path);
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const documentId = req.body.documentId;
    const topK = req.body.topK ? parseInt(req.body.topK, 10) : 3;
    const ragResult = await generateRagResponse(transcript, documentId, topK);

    const speechText = ragResult.answer
      .replace(/[*_#`~]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .trim();

    const replyFileName = `reply-${Date.now()}.mp3`;
    const replyFilePath = path.join(audioUploadDir, replyFileName);
    await textToSpeech(speechText, replyFilePath);

    return res.status(200).json({
      success: true,
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
