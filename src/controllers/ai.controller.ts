import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { AIProxyService } from '../services/ai/ai-proxy.service.js';

const aiProxy = new AIProxyService();

export class AIController {
  async chat(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentId = req.user?.student_id;
      const { message } = req.body;

      if (!studentId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Missing student token',
        });
        return;
      }

      if (!message || typeof message !== 'string' || message.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'Message payload must be a non-empty string',
        });
        return;
      }

      // Safe invocation: proxy guarantees string output via fallback
      const reply = await aiProxy.generateResponse(studentId, message.trim());

      res.status(200).json({
        success: true,
        data: {
          response: reply,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: unknown) {
      console.error(
        '[AIControllerFatal]: Unhandled error in chat pipeline:',
        error
      );
      res.status(500).json({
        success: false,
        error: 'An internal server error occurred while processing your query.',
      });
    }
  }
}
