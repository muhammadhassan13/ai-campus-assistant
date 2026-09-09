import express from 'express';
import path from 'path';
import studentRoutes from './routes/student.routes.js';
import aiRoutes from './routes/ai.routes.js';
import documentRoutes from './routes/document.routes.js';
import voiceRoutes from './routes/voice.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(express.json());

// Serve uploads folder statically so reply-xxx.mp3 files are accessible
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Timeout Guard: Extended to 120,000ms (2 minutes) for voice endpoints
app.use((req, res, next) => {
  const isVoiceRoute = req.originalUrl.startsWith('/api/voice');
  const timeoutMs = isVoiceRoute ? 120000 : 30000;

  res.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        error: 'Gateway Timeout: The AI service took too long to respond.',
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

// Global Error Middleware
app.use(errorHandler);

export default app;
