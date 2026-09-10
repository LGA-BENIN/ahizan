import { LLMProvider, ChatMessage, GenerateOptions, GenerateResponse } from './types';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { MockProvider } from './providers/mock.provider';

export interface GatewayConfig {
  defaultProvider?: string;
  geminiApiKey?: string;
  openrouterApiKey?: string;
}

export class AIGateway {
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProviderName: string;
  private totalRequests = 0;
  private totalTokensUsed = 0;

  constructor(config?: GatewayConfig) {
    // Register available providers
    const gemini = new GeminiProvider(config?.geminiApiKey);
    const openrouter = new OpenRouterProvider(config?.openrouterApiKey);
    const mock = new MockProvider();

    this.providers.set(gemini.name, gemini);
    this.providers.set(openrouter.name, openrouter);
    this.providers.set(mock.name, mock);

    // Pick best default provider based on available keys
    if (config?.defaultProvider && this.providers.has(config.defaultProvider)) {
      this.defaultProviderName = config.defaultProvider;
    } else if (gemini.isAvailable()) {
      this.defaultProviderName = gemini.name;
    } else if (openrouter.isAvailable()) {
      this.defaultProviderName = openrouter.name;
    } else {
      this.defaultProviderName = mock.name;
    }
  }

  getProvider(name?: string): LLMProvider {
    const forced = name || (process.env.AHIZAN_AI_PROVIDER && process.env.AHIZAN_AI_PROVIDER !== 'auto' ? process.env.AHIZAN_AI_PROVIDER : undefined);
    if (forced && this.providers.has(forced)) {
      const provider = this.providers.get(forced)!;
      if (provider.isAvailable()) return provider;
    }

    const gemini = this.providers.get('gemini');
    if (gemini && gemini.isAvailable()) return gemini;

    const openrouter = this.providers.get('openrouter');
    if (openrouter && openrouter.isAvailable()) return openrouter;

    return this.providers.get('mock-local')!;
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<GenerateResponse> {
    const provider = this.getProvider();
    this.totalRequests++;

    try {
      const result = await provider.generate(messages, options);
      if (result.usage?.totalTokens) {
        this.totalTokensUsed += result.usage.totalTokens;
      }
      return result;
    } catch (err: any) {
      console.warn(`[AIGateway] Provider ${provider.name} failed: ${err.message}. Triggering fallback to mock...`);
      const fallbackProvider = this.providers.get('mock-local')!;
      return await fallbackProvider.generate(messages, options);
    }
  }

  getMetrics() {
    const active = this.getProvider();
    return {
      activeProvider: active.name,
      availableProviders: Array.from(this.providers.entries()).map(([k, v]) => ({ name: k, available: v.isAvailable() })),
      totalRequests: this.totalRequests,
      totalTokensUsed: this.totalTokensUsed
    };
  }
}
