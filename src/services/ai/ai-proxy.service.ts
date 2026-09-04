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
    // Explicit manual toggle override via .env
    if (process.env.USE_MOCK_AI === 'true') {
      console.info('[AIProxy]: USE_MOCK_AI=true. Serving mock response.');
      return this.fallbackService.generateResponse(studentId, prompt);
    }

    try {
      // Priority 1: Attempts live LLM generation
      return await this.primaryService.generateResponse(studentId, prompt);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Priority 2: Intercepts failures and routes to local fallback
      console.warn('======================================================');
      console.warn('[AIProxy Guard/Fallback Triggered]:');
      console.warn(errorMsg);
      console.warn('-> Gracefully defaulting response to MockAIService.');
      console.warn('======================================================');

      return await this.fallbackService.generateResponse(studentId, prompt);
    }
  }
}
