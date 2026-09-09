import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { transcribeAudio } from '../services/voice.service.js';

const router = Router();

// Ensure uploads/audio directory exists (Item 1)
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
 * POST /api/voice/process
 * Combines Item 1 (Upload & Save) and Item 2 (Groq Whisper STT Transcription)
 */
router.post('/process', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error:
          'No audio file provided. Please send a file using the "audio" key.',
      });
    }

    // Item 2: Perform STT transcription on saved file
    const transcript = await transcribeAudio(req.file.path);

    // Return both upload metadata (Item 1) and speech transcript (Item 2)
    return res.status(200).json({
      success: true,
      message: 'Audio received and transcribed successfully.',
      data: {
        fileInfo: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
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

export default router;
