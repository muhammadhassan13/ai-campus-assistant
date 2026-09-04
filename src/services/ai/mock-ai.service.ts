import { pool } from '../../config/db.js';
import { type IAIService } from './ai.interface.js';

export class MockAIService implements IAIService {
  private getSmartMockResponse(prompt: string): string {
    const lower = prompt.toLowerCase();

    if (lower.includes('transaction')) {
      return '[Mock AI]: A database transaction is a single, indivisible unit of work that executes multiple operations as an "all-or-nothing" sequence, ensuring data integrity through ACID properties.';
    }

    if (lower.includes('sql') || lower.includes('database')) {
      return '[Mock AI]: A database is an organized collection of structured data managed by a DBMS (like PostgreSQL) for quick retrieval, insertion, and manipulation.';
    }

    if (lower.includes('assignment') || lower.includes('course')) {
      return '[Mock AI]: You can view your enrolled courses and upcoming assignments through the student dashboard menu.';
    }

    return `[Mock AI]: Received prompt: "${prompt}". (Running in local offline mode).`;
  }

  async generateResponse(studentId: number, prompt: string): Promise<string> {
    // 1. Persist user message
    await pool.query(
      'INSERT INTO conversation (student_id, role, message) VALUES ($1, $2, $3)',
      [studentId, 'user', prompt]
    );

    // 2. Generate response matching the prompt context
    const responseText = this.getSmartMockResponse(prompt);

    // 3. Persist model response
    await pool.query(
      'INSERT INTO conversation (student_id, role, message) VALUES ($1, $2, $3)',
      [studentId, 'model', responseText]
    );

    return responseText;
  }
}
