import Groq from 'groq-sdk';
import {
  AIRepository,
  type ChatMessage,
} from '../../repositories/ai.repository.js';
import { type IAIService } from './ai.interface.js';
import {
  SYSTEM_PROMPT,
  FEW_SHOT_EXAMPLES,
} from '../../config/prompt.config.js';

// Configuration thresholds for context window and safety
const MAX_HISTORY_MESSAGES = 10; // Adjust as needed (e.g., set to 5 for quick local testing, 10 for production)
const MAX_MESSAGE_CHAR_LENGTH = 1000; // Character limit guard per message

export class LiveAIService implements IAIService {
  /**
   * Helper method to enforce token/context length constraints by truncating
   * oversized individual messages and capping history to MAX_HISTORY_MESSAGES.
   */
  private truncateHistory(
    history: ChatMessage[]
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    return history.slice(-MAX_HISTORY_MESSAGES).map((msg) => {
      let content = msg.message;
      if (content.length > MAX_MESSAGE_CHAR_LENGTH) {
        content =
          content.substring(0, MAX_MESSAGE_CHAR_LENGTH) + '... [truncated]';
      }
      return {
        role: msg.role === 'model' ? ('assistant' as const) : ('user' as const),
        content,
      };
    });
  }

  async generateResponse(studentId: number, prompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY?.trim();

    if (!apiKey || apiKey === 'your_groq_api_key' || apiKey === 'placeholder') {
      throw new Error('GROQ_API_KEY is missing or still set to a placeholder.');
    }

    // 1. Fetch previous conversation history for this student
    const rawHistory = await AIRepository.getHistory(
      studentId,
      MAX_HISTORY_MESSAGES
    );

    // 2. Truncate history to stay safely under context token limits
    const formattedHistory = this.truncateHistory(rawHistory);

    // 3. Save current incoming user prompt to DB
    try {
      await AIRepository.saveMessage(studentId, 'user', prompt);
    } catch (dbErr) {
      console.error('[Database Warning]: Failed to log user prompt:', dbErr);
    }

    // 4. Combine system prompt + few-shot examples + history + current prompt
    const messages = [
      {
        role: 'system' as const,
        content: SYSTEM_PROMPT,
      },
      ...FEW_SHOT_EXAMPLES.map((ex) => ({
        role: ex.role as 'user' | 'assistant',
        content: ex.content,
      })),
      ...formattedHistory,
      { role: 'user' as const, content: prompt },
    ];

    // 5. Call Groq API with full context payload and 25-second client timeout guard
    const groq = new Groq({
      apiKey,
      timeout: 25000,
    });

    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages,
      temperature: 0.7,
      max_completion_tokens: 2048,
      top_p: 1,
      stream: true,
    });

    let reply = '';
    for await (const chunk of response) {
      reply += chunk.choices[0]?.delta?.content || '';
    }

    reply = reply.trim();
    if (!reply) throw new Error('Groq returned an empty response.');

    // 6. Save model response to DB
    try {
      await AIRepository.saveMessage(studentId, 'model', reply);
    } catch (dbErr) {
      console.error('[Database Warning]: Failed to log model response:', dbErr);
    }

    return reply;
  }
}
