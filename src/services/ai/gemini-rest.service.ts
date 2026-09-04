import { pool } from '../../config/db.js';
import { type IAIService } from './ai.interface.js';

export class GeminiRestService implements IAIService {
  private getApiUrl(): string {
    const apiKey = process.env.GEMINI_API_KEY || '';
    // Direct v1beta REST endpoint for gemini-2.0-flash
    return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  }

  async generateResponse(studentId: number, prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in .env');
    }

    // 1. Log user prompt to PostgreSQL
    await pool.query(
      'INSERT INTO conversation (student_id, role, message) VALUES ($1, $2, $3)',
      [studentId, 'user', prompt]
    );

    // 2. Build REST Request Payload
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    };

    // 3. Optional Header Setup (Supports GCP Bearer Tokens if applicable)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // If your GCP token requires Bearer authentication
    if (apiKey.startsWith('AQ') || process.env.GCP_BEARER_TOKEN) {
      const token = process.env.GCP_BEARER_TOKEN || apiKey;
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 4. Send HTTP Request directly via native fetch
    const response = await fetch(this.getApiUrl(), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini REST API Error (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      'No text returned from Gemini REST API.';

    // 5. Log model response to PostgreSQL
    await pool.query(
      'INSERT INTO conversation (student_id, role, message) VALUES ($1, $2, $3)',
      [studentId, 'model', reply]
    );

    return reply;
  }
}
