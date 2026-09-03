import { Router } from 'express';
import { StudentController } from '../controllers/student.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkOwnership } from '../middleware/ownership.js';

const router = Router();

// Public routes
router.post('/auth/login', StudentController.login);
router.get('/students', StudentController.getAll);
router.get('/students/:id', StudentController.getById);
router.post('/students', StudentController.create);

// Protected & ownership-restricted routes
router.put(
  '/students/:id',
  authenticateToken,
  checkOwnership,
  StudentController.update
);
router.delete(
  '/students/:id',
  authenticateToken,
  checkOwnership,
  StudentController.deleteOne
);

export default router;
