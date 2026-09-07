import { pool } from '../config/db.js';

export interface ChatMessage {
  conversation_id?: number;
  student_id: number;
  role: 'user' | 'model';
  message: string;
  created_at?: Date;
}

export interface UserPreferences {
  student_id: number;
  preferred_language?: string;
  preferred_tech_stack?: string;
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

  static async getUserPreferences(
    student_id: number
  ): Promise<UserPreferences | null> {
    const result = await pool.query<UserPreferences>(
      'SELECT * FROM user_preferences WHERE student_id = $1',
      [student_id]
    );
    return result.rows[0] || null;
  }

  static async saveUserPreferences(
    student_id: number,
    preferred_language: string,
    preferred_tech_stack: string
  ): Promise<UserPreferences> {
    const result = await pool.query<UserPreferences>(
      `INSERT INTO user_preferences (student_id, preferred_language, preferred_tech_stack)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id) 
       DO UPDATE SET preferred_language = EXCLUDED.preferred_language, preferred_tech_stack = EXCLUDED.preferred_tech_stack
       RETURNING *`,
      [student_id, preferred_language, preferred_tech_stack]
    );
    return result.rows[0];
  }
}
