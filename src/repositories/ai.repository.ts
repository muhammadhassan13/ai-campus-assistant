import { pool } from '../config/db.js';

export interface ChatMessage {
  conversation_id?: number;
  student_id: number;
  role: 'user' | 'model';
  message: string;
  created_at?: Date;
}

export class AIRepository {
  static async saveMessage(
    student_id: number,
    role: 'user' | 'model',
    message: string
  ): Promise<ChatMessage> {
    const result = await pool.query<ChatMessage>(
      'INSERT INTO conversation (student_id, role, message) VALUES ($1, $2, $3) RETURNING *',
      [student_id, role, message]
    );
    return result.rows[0];
  }

  static async getHistory(
    student_id: number,
    limit = 10
  ): Promise<ChatMessage[]> {
    const result = await pool.query<ChatMessage>(
      'SELECT * FROM (SELECT * FROM conversation WHERE student_id = $1 ORDER BY conversation_id DESC LIMIT $2) sub ORDER BY conversation_id ASC',
      [student_id, limit]
    );
    return result.rows;
  }
}
