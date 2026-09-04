import express from 'express';
import studentRoutes from './routes/student.routes.js';
import aiRoutes from './routes/ai.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

// 1. Declare 'app' FIRST
const app = express();

// 2. Add middleware and routes AFTER declaration
app.use(express.json());

// 3. Mount API routes
app.use('/api', studentRoutes);
app.use('/api', aiRoutes);

// 4. Global Error Middleware
app.use(errorHandler);

export default app;
