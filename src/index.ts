import { Student, Degree, StudentStatus } from './student.js';
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

async function runDemo() {
  console.log('Fetching student data from simulated API...');
  // successful search
  try {
    const student = await studentRepo.fetchById(260);
    console.log('\nSuccessfully fetched student: ', student.getDetails());
  } catch (error) {
    if (error instanceof Error) {
      console.log('\nAPI Error caught: ', error.message);
    }
  }

  // intentional unsuccessful search
  try {
    const student = await studentRepo.fetchById(999);
    console.log('\nSuccessfully fetched student: ', student.getDetails());
  } catch (error) {
    if (error instanceof Error) {
      console.log('\nAPI Error caught: ', error.message);
    }
  }
}

runDemo();
