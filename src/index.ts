import { Student, Degree, StudentStatus } from './student.js';
import { Repository } from './repository.js';

const studentRepo = new Repository<Student>();
function createStudentSafely(
  id: number,
  name: string,
  email: string,
  degree: Degree,
  gpa: number
) {
  try {
    const student = new Student(
      id,
      name,
      email,
      degree,
      gpa,
      StudentStatus.Active
    );
    console.log('Successfully created: ', student.name);
    studentRepo.add(student);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Validation Failed: ', error.message);
    }
  }
}

console.log('--- Testing Input Validation ---');

// valid case
createStudentSafely(
  260,
  'Muhammad Hassan',
  'hassan@example.com',
  Degree.ArtificialIntelligence,
  3.89
);

// invalid email
createStudentSafely(
  286,
  'Syed Shabih',
  'shabih-example.com',
  Degree.ComputerScience,
  3.08
);

// invalid GPA
createStudentSafely(
  789,
  'Test Student',
  'teststudent@outlook.com',
  Degree.SoftwareEngineering,
  4.56
);

// valid case
createStudentSafely(
  277,
  'Madikh Younas',
  'madikh@gmail.com',
  Degree.ArtificialIntelligence,
  3.42
);

console.log('\n--- All Successfully Created Students ---');
const allStudents = studentRepo.getAll();
if (allStudents.length === 0) {
  console.log('No valid students found');
} else {
  allStudents.forEach((student) => {
    console.log(student.getDetails());
  });
}
