import { pool } from '../../config/db.js';
import { type IAIService } from './ai.interface.js';

export class LiveAIService implements IAIService {
  /**
   * Validates whether the provided API key is valid (Groq gsk_ or Gemini AIzaSy keys).
   */
  private isValidKey(key: string | undefined): boolean {
    if (!key) return false;
    const cleanKey = key.trim();

    if (
      cleanKey === '' ||
      cleanKey === 'your_gemini_api_key' ||
      cleanKey === 'your_groq_api_key' ||
      cleanKey === 'placeholder' ||
      cleanKey.startsWith('your_') ||
      cleanKey.startsWith('AQ.') // Rejects temporary GCP OAuth tokens
    ) {
      return false;
    }

    return cleanKey.startsWith('gsk_') || cleanKey.startsWith('AIzaSy');
  }

  async generateResponse(studentId: number, prompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;

    // 1. Fail fast if key is missing, placeholder, or invalid format
    if (!this.isValidKey(apiKey)) {
      throw new Error(
        `[Guard Triggered]: API key is missing or invalid placeholder. Routing to MockAIService.`
      );
    }

    // 2. Log user prompt to PostgreSQL
    try {
      await pool.query(
        'INSERT INTO conversation (student_id, role, message) VALUES ($1, $2, $3)',
        [studentId, 'user', prompt]
      );
    } catch (dbErr) {
      console.error('[Database Warning]: Failed to log user prompt:', dbErr);
    }

    // 3. Direct REST Call to Groq (llama3-8b-8192)
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // <-- UPDATED MODEL SLUG
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful, concise AI Campus Assistant for university students.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Groq Live REST API Error (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
      }>;
    };

    const reply =
      data.choices?.[0]?.message?.content?.trim() ||
      'No text returned from AI Model.';

    // 4. Log model response to PostgreSQL
    try {
      await pool.query(
        'INSERT INTO conversation (student_id, role, message) VALUES ($1, $2, $3)',
        [studentId, 'model', reply]
      );
    } catch (dbErr) {
      console.error('[Database Warning]: Failed to log model response:', dbErr);
    }

    return reply;
  }
}
