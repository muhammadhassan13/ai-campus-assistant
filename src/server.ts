import express from 'express';
import { Student, Degree, StudentStatus } from './student.js';
import { Repository } from './repository.js';

const app = express();
const PORT = 3000;

app.use(express.json());

const studentRepo = new Repository<Student>();

// POST/api/students -> creates students and returns 201
app.post('/api/students', (req, res) => {
  try {
    const { id, name, email, degree, gpa } = req.body;

    // validation checks
    if (!id || !name || !email || !degree || gpa === undefined) {
      return res.status(400).json({
        error: 'All fields (id, name, email, degree, gpa) are required ',
      });
    }

    if (isNaN(Number(id)) || isNaN(Number(gpa))) {
      return res
        .status(400)
        .json({ error: 'ID and GPA must be valid numbers' });
    }

    // default degree matching
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

    // return 201 created with the created student object
    return res.status(201).json({
      message: 'Student created successfully',
      student: newStudent,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error ' });
  }
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:', PORT);
});
