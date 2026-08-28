import { Student } from './student.js';

const student1 = new Student(
  260,
  'Muhammad Hassan',
  'hassan@example.com',
  'BS Artificial Intelligence',
  3.89
);

console.log(student1.getDetails());
student1.updateGpa(3.96);
console.log(`Updated GPA: ${student1.gpa}`);
