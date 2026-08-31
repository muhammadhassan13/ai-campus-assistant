import { Student, Degree, StudentStatus } from './student.js';

const student1 = new Student(
  260,
  'Muhammad Hassan',
  'hassan@example.com',
  Degree.ArtificialIntelligence,
  3.89,
  StudentStatus.Active
);

console.log(student1.getDetails());

student1.updateStatus(StudentStatus.Graduated);
console.log('Updated GPA: ' + student1.gpa);
