import { Router } from 'express';
import { AIController } from '../controllers/ai.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const aiController = new AIController();

router.post('/chat', authenticateToken, (req, res, next) => {
  aiController.chat(req, res).catch(next);
});

export default router;
