import express from 'express';
import {
  Student,
  Degree,
  StudentStatus,
  createStudentSchema,
  updateStudentSchema,
  patchStudentSchema,
} from './student.zod.js';
import { Repository } from './repository.js';

const app = express();
const PORT = 3001; // Runs on 3001 so it won't conflict with server.ts (3000)

app.use(express.json());

const studentRepo = new Repository<Student>();

function mapDegree(degreeStr: string): Degree {
  if (degreeStr === 'Computer Science') return Degree.ComputerScience;
  if (degreeStr === 'Software Engineering') return Degree.SoftwareEngineering;
  if (degreeStr === 'Data Science') return Degree.DataScience;
  if (degreeStr === 'Artificial Intelligence')
    return Degree.ArtificialIntelligence;
  return Degree.Null;
}

// POST with Zod validation
app.post('/api/students', (req, res) => {
  const result = createStudentSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const { id, name, email, degree, gpa } = result.data;
  const mappedDegree = mapDegree(degree);

  const newStudent = new Student(
    id,
    name,
    email,
    mappedDegree,
    gpa,
    StudentStatus.Active
  );

  studentRepo.add(newStudent);

  return res.status(201).json({
    message: 'Student created successfully',
    student: newStudent,
  });
});

// GET all
app.get('/api/students', (_req, res) => {
  const students = studentRepo.getAll();
  return res.status(200).json({
    count: students.length,
    students: students,
  });
});

// GET by ID
app.get('/api/students/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid Student ID parameter' });
  }

  const student = studentRepo.getById(id);
  if (!student) {
    return res.status(404).json({ error: 'Student with this ID not found' });
  }

  return res.status(200).json(student);
});

// PUT with Zod validation
app.put('/api/students/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid Student ID parameter' });
  }

  const existingStudent = studentRepo.getById(id);
  if (!existingStudent) {
    return res.status(404).json({ error: 'Student with this ID not found' });
  }

  const result = updateStudentSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const { name, email, degree, gpa } = result.data;
  const mappedDegree = mapDegree(degree);

  const updatedStudent = studentRepo.update(id, {
    name,
    email,
    degree: mappedDegree,
    gpa,
    status: existingStudent.status,
  });

  return res.status(200).json({
    message: 'Student updated successfully',
    student: updatedStudent,
  });
});

// PATCH /api/students/:id -> partial update with Zod validation
app.patch('/api/students/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid Student ID parameter' });
  }

  const existingStudent = studentRepo.getById(id);
  if (!existingStudent) {
    return res.status(404).json({ error: 'Student with this ID not found' });
  }

  const result = patchStudentSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  // Construct Partial<Student> explicitly without assigning raw string degree
  const updates: Partial<Student> = {};

  if (result.data.name !== undefined) updates.name = result.data.name;
  if (result.data.email !== undefined) updates.email = result.data.email;
  if (result.data.gpa !== undefined) updates.gpa = result.data.gpa;
  if (result.data.degree !== undefined) {
    updates.degree = mapDegree(result.data.degree);
  }

  const updatedStudent = studentRepo.update(id, updates);

  return res.status(200).json({
    message: 'Student partially updated successfully',
    student: updatedStudent,
  });
});

// DELETE
app.delete('/api/students/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid Student ID parameter' });
  }

  const deleted = studentRepo.deleteById(id);
  if (!deleted) {
    return res.status(404).json({ error: `Student with ID ${id} not found` });
  }

  return res.sendStatus(204);
});

app.listen(PORT, () => {
  console.log(`Zod Server running on http://localhost:${PORT}`);
});
