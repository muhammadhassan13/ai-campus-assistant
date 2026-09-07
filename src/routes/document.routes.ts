import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pdfToText } from 'pdf-ts';

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Configuration
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

    // 2. Extract full raw text from PDF
    const extractedText = await pdfToText(fileBuffer);

    // 3. Return full text along with file metadata
    return res.status(200).json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        fileSize: req.file.size,
        characterCount: extractedText.length,
        fullExtractedText: extractedText,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
