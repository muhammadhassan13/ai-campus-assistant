import { LiveAIService } from './live-ai.service.js';
import { MockAIService } from './mock-ai.service.js';
import { type IAIService } from './ai.interface.js';

export class AIProxyService implements IAIService {
  private primaryService: LiveAIService;
  private fallbackService: MockAIService;

  constructor() {
    this.primaryService = new LiveAIService();
    this.fallbackService = new MockAIService();
  }

  async generateResponse(studentId: number, prompt: string): Promise<string> {
    // Keep mock mode available for intentional offline development.
    if (process.env.USE_MOCK_AI === 'true') {
      console.info('[AIProxy]: USE_MOCK_AI=true. Serving mock response.');
      return this.fallbackService.generateResponse(studentId, prompt);
    }

    return this.primaryService.generateResponse(studentId, prompt);
  }
}
