import Groq from 'groq-sdk';
import { AIRepository } from '../../repositories/ai.repository.js';
import { type IAIService } from './ai.interface.js';

export class LiveAIService implements IAIService {
  async generateResponse(studentId: number, prompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY?.trim();

    if (!apiKey || apiKey === 'your_groq_api_key' || apiKey === 'placeholder') {
      throw new Error('GROQ_API_KEY is missing or still set to a placeholder.');
    }

    // 1. Fetch previous conversation history for this student
    const history = await AIRepository.getHistory(studentId, 10);

    // 2. Map existing DB history to Groq's expected format
    const formattedHistory = history.map((msg) => ({
      role: msg.role === 'model' ? ('assistant' as const) : ('user' as const),
      content: msg.message,
    }));

    // 3. Save current incoming user prompt to DB
    try {
      await AIRepository.saveMessage(studentId, 'user', prompt);
    } catch (dbErr) {
      console.error('[Database Warning]: Failed to log user prompt:', dbErr);
    }

    // 4. Combine system prompt + history + current prompt
    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a helpful, concise AI Campus Assistant for university students.',
      },
      ...formattedHistory,
      { role: 'user' as const, content: prompt },
    ];

    // 5. Call Groq with full context and a 25-second client timeout guard
    const groq = new Groq({
      apiKey,
      timeout: 25000,
    });

    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages,
      temperature: 1,
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
