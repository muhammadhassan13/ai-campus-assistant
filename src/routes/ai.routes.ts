import { Router } from 'express';
import { AIController } from '../controllers/ai.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rate-limiter.middleware.js';

const router = Router();
const aiController = new AIController();

// Applied rate limiter middleware
router.post('/chat', authenticateToken, aiRateLimiter, (req, res, next) => {
  aiController.chat(req, res).catch(next);
});

router.get('/chat/history', authenticateToken, (req, res, next) => {
  aiController.getHistory(req, res).catch(next);
});

export default router;
