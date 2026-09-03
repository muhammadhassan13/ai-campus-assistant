import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  StudentRepository,
  type CreateStudentDTO,
  type UpdateStudentDTO,
} from '../repositories/student.repository.js';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export class StudentService {
  static async registerStudent(
    data: Omit<CreateStudentDTO, 'password_hash'> & { password: string }
  ) {
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    return await StudentRepository.create({
      ...data,
      password_hash: hashedPassword,
    });
  }

  static async authenticateUser(email: string, password: string) {
    const student = await StudentRepository.findByEmail(email);
    if (!student) throw new Error('INVALID_CREDENTIALS');

    const isValid = await bcrypt.compare(password, student.password_hash);
    if (!isValid) throw new Error('INVALID_CREDENTIALS');

    const token = jwt.sign(
      { student_id: student.student_id, email: student.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Safely remove password_hash without declaring unused variable
    const safeStudent = { ...student };
    delete (safeStudent as { password_hash?: string }).password_hash;

    return { token, student: safeStudent };
  }

  static async getStudentById(id: number) {
    return await StudentRepository.findById(id);
  }

  static async getAllStudents() {
    return await StudentRepository.findAll();
  }

  static async updateStudent(id: number, data: UpdateStudentDTO) {
    return await StudentRepository.update(id, data);
  }

  static async removeStudent(id: number) {
    return await StudentRepository.deleteById(id);
  }
}
