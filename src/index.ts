import { Student, Degree, StudentStatus } from './student.js';
import { Course } from './course.js';
import { Repository } from './repository.js';

const studentRepo = new Repository<Student>();

const student1 = new Student(
  260,
  'Muhammad Hassan',
  'hassan@example.com',
  Degree.ArtificialIntelligence,
  3.89,
  StudentStatus.Active
);

const student2 = new Student(
  286,
  'Syed Shabih',
  'shabih@example.com',
  Degree.ComputerScience,
  3.08,
  StudentStatus.Active
);

studentRepo.add(student1);
studentRepo.add(student2);

console.log('--- All Students ---');
console.log(studentRepo.getAll());

const courseRepo = new Repository<Course>();

const course1 = new Course(101, 'Data Structures', 'CC201');

const course2 = new Course(102, 'Object Oriented Programming', 'CC203');

courseRepo.add(course1);
courseRepo.add(course2);

console.log('--- All Courses ---');
console.log(courseRepo.getAll());
