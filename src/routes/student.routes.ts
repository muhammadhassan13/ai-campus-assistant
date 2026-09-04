import { Router } from 'express';
import { StudentController } from '../controllers/student.controller.js';

const router = Router();

router.post('/auth/login', StudentController.login);
router.get('/students', StudentController.getAll);
router.get('/students/:id', StudentController.getById);
router.post('/students', StudentController.create);
router.put('/students/:id', StudentController.update);
router.patch('/students/:id', StudentController.patchStudent);
router.delete('/students/:id', StudentController.deleteOne);

export default router;
