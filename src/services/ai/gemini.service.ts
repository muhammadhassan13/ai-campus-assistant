import { GoogleGenerativeAI } from '@google/generative-ai';
import { pool } from '../../config/db.js';
import { type IAIService } from './ai.interface.js';

export class GeminiService implements IAIService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async generateResponse(studentId: number, prompt: string): Promise<string> {
    // 1. Persist user message to PostgreSQL
    await pool.query(
      'INSERT INTO conversation (student_id, role, message) VALUES ($1, $2, $3)',
      [studentId, 'user', prompt]
    );

    // 2. Query Gemini API (using gemini-2.0-flash)
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 3. Persist model response to PostgreSQL
    await pool.query(
      'INSERT INTO conversation (student_id, role, message) VALUES ($1, $2, $3)',
      [studentId, 'model', responseText]
    );

    return responseText;
  }
}
