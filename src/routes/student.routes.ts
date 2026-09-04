import { Router } from 'express';
import { StudentController } from '../controllers/student.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkOwnership } from '../middleware/ownership.js';

const router = Router();

// Auth route
router.post('/students/login', StudentController.login);

// Public routes
router.get('/students', StudentController.getAll);
router.get('/students/:id', StudentController.getById);
router.post('/students', StudentController.create);

// Protected routes (with Ownership Check)
router.put(
  '/students/:id',
  authenticateToken,
  checkOwnership,
  StudentController.update
);
router.patch(
  '/students/:id',
  authenticateToken,
  checkOwnership,
  StudentController.patchStudent
);
router.delete(
  '/students/:id',
  authenticateToken,
  checkOwnership,
  StudentController.deleteOne
);

// Bulk delete (Admin/Authenticated)
router.delete('/students', authenticateToken, StudentController.deleteAll);

export default router;
