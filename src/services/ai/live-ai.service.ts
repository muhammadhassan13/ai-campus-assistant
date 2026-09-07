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

const MAX_HISTORY_MESSAGES = 5;
const MAX_MESSAGE_CHAR_LENGTH = 1000;

export class LiveAIService implements IAIService {
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

    // 1. Fetch user preferences and conversation history
    const prefs = await AIRepository.getUserPreferences(studentId);
    const rawHistory = await AIRepository.getHistory(
      studentId,
      MAX_HISTORY_MESSAGES
    );
    const formattedHistory = this.truncateHistory(rawHistory);

    // 2. Build tailored system prompt based on preferences
    let dynamicSystemPrompt = SYSTEM_PROMPT;
    if (prefs) {
      dynamicSystemPrompt += `\n\nUser Preferences:\n- Preferred Explanation Language: ${prefs.preferred_language || 'English'}\n- Primary Programming Stack: ${prefs.preferred_tech_stack || 'General'}`;
    }

    // 3. Save current user message
    try {
      await AIRepository.saveMessage(studentId, 'user', prompt);
    } catch (dbErr) {
      console.error('[Database Warning]: Failed to log user prompt:', dbErr);
    }

    // 4. Construct message payload
    const messages = [
      {
        role: 'system' as const,
        content: dynamicSystemPrompt,
      },
      ...FEW_SHOT_EXAMPLES.map((ex) => ({
        role: ex.role as 'user' | 'assistant',
        content: ex.content,
      })),
      ...formattedHistory,
      { role: 'user' as const, content: prompt },
    ];

    // 5. Call Groq API
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

    // 6. Save model response
    try {
      await AIRepository.saveMessage(studentId, 'model', reply);
    } catch (dbErr) {
      console.error('[Database Warning]: Failed to log model response:', dbErr);
    }

    return reply;
  }
}
