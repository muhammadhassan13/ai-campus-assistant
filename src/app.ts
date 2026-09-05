import express from 'express';
import studentRoutes from './routes/student.routes.js';
import aiRoutes from './routes/ai.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(express.json());

// Timeout Guard: Prevents client sockets from freezing indefinitely
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(504).json({
        success: false,
        error: 'Gateway Timeout: The AI service took too long to respond.',
      });
    }
  });
  next();
});

// Mount API routes
app.use('/api', studentRoutes);
app.use('/api', aiRoutes);

// Global Error Middleware
app.use(errorHandler);

export default app;
