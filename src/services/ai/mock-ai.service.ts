import { AIRepository } from '../../repositories/ai.repository.js';
import { type IAIService } from './ai.interface.js';

export class MockAIService implements IAIService {
  async generateResponse(studentId: number, prompt: string): Promise<string> {
    // 1. Log user prompt via Repository
    await AIRepository.saveMessage(studentId, 'user', prompt);

    // 2. Return a generic stub response. This service is only reached
    //    when the primary (Groq) service is unavailable.
    const responseText = `[Mock AI]: The AI service is temporarily unavailable. Received your message: "${prompt}".`;

    // 3. Log model response via Repository
    await AIRepository.saveMessage(studentId, 'model', responseText);

    return responseText;
  }
}
