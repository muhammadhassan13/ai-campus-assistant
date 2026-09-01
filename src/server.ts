import express from 'express';
import { Student, Degree, StudentStatus } from './student.js';
import { Repository } from './repository.js';

const app = express();
const PORT = 3000;

app.use(express.json());

const studentRepo = new Repository<Student>();

// POST /api/students -> creates students and returns 201
app.post('/api/students', (req, res) => {
  try {
    const { id, name, email, degree, gpa } = req.body;

    // validation checks
    if (!id || !name || !email || !degree || gpa === undefined) {
      return res.status(400).json({
        error: 'All fields (id, name, email, degree, gpa) are required',
      });
    }

    if (isNaN(Number(id)) || isNaN(Number(gpa))) {
      return res
        .status(400)
        .json({ error: 'ID and GPA must be valid numbers' });
    }

    // degree mapping logic
    let mappedDegree = Degree.Null;
    if (degree === 'Computer Science') mappedDegree = Degree.ComputerScience;
    else if (degree === 'Software Engineering')
      mappedDegree = Degree.SoftwareEngineering;
    else if (degree === 'Data Science') mappedDegree = Degree.DataScience;
    else if (degree === 'Artificial Intelligence')
      mappedDegree = Degree.ArtificialIntelligence;

    const newStudent = new Student(
      Number(id),
      name,
      email,
      mappedDegree,
      Number(gpa),
      StudentStatus.Active
    );

    studentRepo.add(newStudent);

    return res.status(201).json({
      message: 'Student created successfully',
      student: newStudent,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students -> get all students
app.get('/api/students', (_req, res) => {
  const students = studentRepo.getAll();
  return res.status(200).json({
    count: students.length,
    students: students,
  });
});

// GET /api/students/:id -> get single student or 404
app.get('/api/students/:id', (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid Student ID parameter' });
  }

  const student = studentRepo.getAll().find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({ error: 'Student with this ID not found' });
  }

  return res.status(200).json(student);
});

// PUT /api/students/:id -> full update of a student record
app.put('/api/students/:id', (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid Student ID parameter' });
  }

  const existingStudent = studentRepo.getById(id);
  if (!existingStudent) {
    return res.status(404).json({ error: 'Student with this ID not found' });
  }

  const { name, email, degree, gpa, status } = req.body;

  if (!name || !email || !degree || gpa === undefined) {
    return res.status(400).json({
      error:
        'All fields (name, email, degree, gpa) are required for full update',
    });
  }

  let mappedDegree = Degree.Null;
  if (degree === 'Computer Science') mappedDegree = Degree.ComputerScience;
  else if (degree === 'Software Engineering')
    mappedDegree = Degree.SoftwareEngineering;
  else if (degree === 'Data Science') mappedDegree = Degree.DataScience;
  else if (degree === 'Artificial Intelligence')
    mappedDegree = Degree.ArtificialIntelligence;

  const updatedStudent = studentRepo.update(id, {
    name,
    email,
    degree: mappedDegree,
    gpa: Number(gpa),
    status: status !== undefined ? status : existingStudent.status,
  });

  return res.status(200).json({
    message: 'Student updated successfully',
    student: updatedStudent,
  });
});

// PATCH /api/students/:id -> partial update of a student record
app.patch('/api/students/:id', (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid Student ID parameter' });
  }

  const existingStudent = studentRepo.getById(id);
  if (!existingStudent) {
    return res.status(404).json({ error: 'Student with this ID not found' });
  }

  const updates = req.body;
  if (!updates || Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json({ error: 'Request body must contain fields to update' });
  }

  if (updates.degree) {
    if (updates.degree === 'Computer Science')
      updates.degree = Degree.ComputerScience;
    else if (updates.degree === 'Software Engineering')
      updates.degree = Degree.SoftwareEngineering;
    else if (updates.degree === 'Data Science')
      updates.degree = Degree.DataScience;
    else if (updates.degree === 'Artificial Intelligence')
      updates.degree = Degree.ArtificialIntelligence;
  }

  if (updates.gpa !== undefined) updates.gpa = Number(updates.gpa);

  const updatedStudent = studentRepo.update(id, updates);

  return res.status(200).json({
    message: 'Student partially updated successfully',
    student: updatedStudent,
  });
});

// DELETE /api/students/:id -> removes a student record
app.delete('/api/students/:id', (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid Student ID parameter' });
  }

  const deleted = studentRepo.deleteById(id);

  if (!deleted) {
    return res.status(404).json({ error: 'Student with this ID not found' });
  }

  // HTTP 204 No Content returns no response body
  return res.status(200).json({ message: 'Student deleted successfully' });
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:', PORT);
});
