import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StudentRepository } from '../repositories/student.repository.js';
import type {
  CreateStudentDTO,
  UpdateStudentDTO,
  StudentResponseDTO,
  AuthResponseDTO,
  UpdateStudentRepoPayload,
} from '../student.zod.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export class StudentService {
  static async updateStudent(
    id: number,
    data: UpdateStudentDTO
  ): Promise<StudentResponseDTO | null> {
    const updatePayload: UpdateStudentRepoPayload = {
      name: data.name,
      email: data.email,
      degree: data.degree,
      gpa: data.gpa,
      status: data.status,
    };

    if (data.password) {
      updatePayload.password_hash = await bcrypt.hash(
        data.password,
        SALT_ROUNDS
      );
    }

    return await StudentRepository.update(id, updatePayload);
  }

  static async authenticateUser(
    email: string,
    password: string
  ): Promise<AuthResponseDTO> {
    const student = await StudentRepository.findByEmail(email);
    if (!student) throw new Error('INVALID_CREDENTIALS');

    const isValid = await bcrypt.compare(password, student.password_hash);
    if (!isValid) throw new Error('INVALID_CREDENTIALS');

    const token = jwt.sign(
      { student_id: student.student_id, email: student.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const safeStudent: StudentResponseDTO = {
      student_id: student.student_id,
      name: student.name,
      email: student.email,
      degree: student.degree,
      gpa: Number(student.gpa),
      status: student.status,
    };

    return { token, student: safeStudent };
  }

  static async registerStudent(
    data: CreateStudentDTO
  ): Promise<StudentResponseDTO> {
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    return await StudentRepository.create({
      name: data.name,
      email: data.email,
      password_hash: hashedPassword,
      degree: data.degree,
      gpa: data.gpa,
      status: data.status,
    });
  }

  static async getStudentById(id: number): Promise<StudentResponseDTO | null> {
    return await StudentRepository.findById(id);
  }

  static async getAllStudents(): Promise<StudentResponseDTO[]> {
    return await StudentRepository.findAll();
  }

  static async removeStudent(id: number): Promise<boolean> {
    return await StudentRepository.deleteById(id);
  }

  static async clearAllStudents(): Promise<void> {
    return await StudentRepository.deleteAll();
  }
}
