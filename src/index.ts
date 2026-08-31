import * as readline from 'readline';
import { Student, Degree, StudentStatus } from './student.js';
import { Repository } from './repository.js';

const studentRepo = new Repository<Student>();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function showMenu() {
  console.log('\n---------- Student Management System CLI ----------');
  console.log('1. Add New Student (CREATE)');
  console.log('2. List All Students (READ)');
  console.log('3. Update Student Status (UPDATE)');
  console.log('4. Delete Student by ID (DELETE)');
  console.log('5. Exit');

  const choice = await askQuestion('Select an option (1-5): ');
  switch (choice.trim()) {
    case '1':
      await handleAddStudent();
      break;
    case '2':
      await handleListStudents();
      break;
    case '3':
      await handleUpdateStatus();
      break;
    case '4':
      await handleDeleteStudent();
      break;
    case '5':
      console.log('Exiting system...');
      console.log('Thank you for using Student Management System CRUD');
      rl.close();
      return;
    default:
      console.log('Invalid option. Please enter a number between 1 and 5');
  }

  showMenu();
}

async function handleAddStudent() {
  console.log('\n--- Add New Student ---');
  try {
    const idStr = await askQuestion('Enter Student ID (Number): ');
    const id = parseInt(idStr, 10);

    const name = await askQuestion('Enter Student Name: ');
    const email = await askQuestion('Enter Student Email: ');

    console.log('Degrees:');
    console.log('1. Computer Science');
    console.log('2. Software Engineering');
    console.log('3. Data Science');
    console.log('4. Artificial Intelligence');
    const degChoice = await askQuestion('Select Department (1-4): ');

    let degree = Degree.ComputerScience;
    if (degChoice === '2') degree = Degree.SoftwareEngineering;
    if (degChoice === '3') degree = Degree.DataScience;
    if (degChoice === '4') degree = Degree.ArtificialIntelligence;

    const gpaStr = await askQuestion('Enter GPA (0.0 - 4.0): ');
    const gpa = parseFloat(gpaStr);

    const student = new Student(
      id,
      name,
      email,
      degree,
      gpa,
      StudentStatus.Active
    );
    studentRepo.add(student);
    console.log('Successfully added ', student.name);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error adding student: ', error.message);
    }
  }
}

function handleListStudents() {
  console.log('\n--- All Student Records ---');
  const students = studentRepo.getAll();
  if (students.length === 0) {
    console.log('No student records found');
  } else {
    students.forEach((student) => console.log(student.getDetails()));
  }
}

async function handleUpdateStatus() {
  console.log('\n--- Update Student Status ---');
  const idStr = await askQuestion('Enter Student ID to update: ');
  const id = parseInt(idStr, 10);

  const student = studentRepo.getAll().find((student) => student.id === id);
  if (!student) {
    console.log('Student with ID ', id, 'not found');
    return;
  }

  console.log('Status Options: ');
  console.log('1. Active');
  console.log('2. Graduated');
  console.log('3. Suspended');

  const statusChoice = await askQuestion('Select New Status (1-3): ');

  if (statusChoice === '1') student.updateStatus(StudentStatus.Active);
  else if (statusChoice === '2') student.updateStatus(StudentStatus.Graduated);
  else if (statusChoice === '3') student.updateStatus(StudentStatus.Suspended);
  else {
    console.log('Invalid status choice');
    return;
  }

  console.log('Updated status for ', student.name, 'to ', student.status);
}

async function handleDeleteStudent() {
  console.log('\n--- Delete Student ---');
  const idStr = await askQuestion('Enter Student ID to delete: ');
  const id = parseInt(idStr, 10);

  const success = studentRepo.deleteById(id);
  if (success) {
    console.log('Student with ID ', id, ' deleted successfully');
  } else {
    console.log('Student with ID ', id, ' not found');
  }
}

showMenu();
