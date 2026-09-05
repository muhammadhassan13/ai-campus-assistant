import { Router } from 'express';
import { AIController } from '../controllers/ai.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const aiController = new AIController();

// Existing chat completion route
router.post('/chat', authenticateToken, (req, res, next) => {
  aiController.chat(req, res).catch(next);
});

// New history retrieval route
router.get('/chat/history', authenticateToken, (req, res, next) => {
  aiController.getHistory(req, res).catch(next);
});

export default router;
