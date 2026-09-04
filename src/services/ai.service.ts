import { GoogleGenAI } from '@google/genai';
import { AIRepository } from '../repositories/ai.repository.js';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables.');
}

const ai = new GoogleGenAI({ apiKey });

export class AIService {
  static async processChat(
    studentId: number,
    userPrompt: string
  ): Promise<string> {
    // 1. Retrieve recent history for context window
    const history = await AIRepository.getHistory(studentId, 6);

    // 2. Format history for Google GenAI SDK
    const contents = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.message }],
    }));

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });

    // 3. Save user message to database
    await AIRepository.saveMessage(studentId, 'user', userPrompt);

    // 4. Call Gemini 2.5 Flash
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: contents,
    });

    const aiReply = response.text ?? 'No response generated.';

    // 5. Save AI response to database
    await AIRepository.saveMessage(studentId, 'model', aiReply);

    return aiReply;
  }
}
