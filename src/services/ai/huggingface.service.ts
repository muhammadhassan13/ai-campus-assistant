import { HfInference } from '@huggingface/inference';
import { pool } from '../../config/db.js';
import { type IAIService } from './ai.interface.js';

export class HuggingFaceService implements IAIService {
  private hf: HfInference;

  constructor() {
    const apiKey = process.env.HUGGINGFACE_API_KEY || '';
    this.hf = new HfInference(apiKey);
  }

  async generateResponse(studentId: number, prompt: string): Promise<string> {
    // 1. Log user prompt to database
    await pool.query(
      'INSERT INTO conversation (student_id, role, message) VALUES ($1, $2, $3)',
      [studentId, 'user', prompt]
    );

    // 2. Call Hugging Face chat completion endpoint
    const response = await this.hf.chatCompletion({
      model: 'meta-llama/Llama-3.2-3B-Instruct',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply =
      response.choices[0]?.message?.content ||
      'No response generated from Hugging Face.';

    // 3. Log model response to database
    await pool.query(
      'INSERT INTO conversation (student_id, role, message) VALUES ($1, $2, $3)',
      [studentId, 'model', reply]
    );

    return reply;
  }
}
