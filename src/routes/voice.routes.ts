import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Ensure uploads/audio directory exists
const audioUploadDir = path.join(process.cwd(), 'uploads/audio');
if (!fs.existsSync(audioUploadDir)) {
  fs.mkdirSync(audioUploadDir, { recursive: true });
}

// Multer disk storage configuration for audio
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, audioUploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, `voice-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });

// POST /api/voice/process - Task 7.5 Item 1 Upload Verification
router.post('/process', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error:
          'No audio file provided. Please send an audio file under key "audio".',
      });
    }

    // Item 1 Output: Confirm receipt of file on disk
    return res.status(200).json({
      success: true,
      message: 'Audio file successfully received on server.',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        sizeBytes: req.file.size,
        savedPath: req.file.path,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
