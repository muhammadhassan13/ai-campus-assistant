import express from 'express';
import cors from 'cors';
import path from 'path';
import studentRoutes from './routes/student.routes.js';
import aiRoutes from './routes/ai.routes.js';
import documentRoutes from './routes/document.routes.js';
import voiceRoutes from './routes/voice.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Enable CORS for Vite frontend client
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

// Serve static uploads for generated voice MP3 files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Timeout Guard: Extended to 120,000ms (2 minutes) for document & voice endpoints
app.use((req, res, next) => {
  const isVoiceRoute = req.originalUrl.startsWith('/api/voice');
  const isDocumentRoute = req.originalUrl.startsWith('/api/documents');

  const timeoutMs = isVoiceRoute || isDocumentRoute ? 120000 : 30000;

  res.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        error:
          'Gateway Timeout: The service took too long to process your request.',
      });
    }
  });
  next();
});

// API Routes
app.use('/api', studentRoutes);
app.use('/api', aiRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/voice', voiceRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
