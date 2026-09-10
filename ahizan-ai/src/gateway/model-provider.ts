import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';

export interface ModelProviderInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  available: boolean;
}

export class ModelGateway {
  private googleClient: ReturnType<typeof createGoogleGenerativeAI> | null = null;
  private openRouterClient: ReturnType<typeof createOpenAI> | null = null;

  constructor() {
    this.initClients();
  }

  private initClients() {
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (geminiKey) {
      this.googleClient = createGoogleGenerativeAI({
        apiKey: geminiKey,
      });
    }

    const openRouterKey = (process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY || '').trim();
    if (openRouterKey) {
      this.openRouterClient = createOpenAI({
        baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        apiKey: openRouterKey,
        headers: {
          'HTTP-Referer': 'https://ahizan.com',
          'X-Title': 'Ahizan AI Core',
        },
      });
    }
  }

  isGeminiAvailable(): boolean {
    const key = (process.env.GEMINI_API_KEY || '').trim();
    return !!key && key.length > 5;
  }

  isOpenRouterAvailable(): boolean {
    const key = (process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY || '').trim();
    return !!key && key.length > 5;
  }

  getModel(modelId?: string): LanguageModel {
    this.initClients();

    const requested = (modelId || process.env.AHIZAN_AI_MODEL || '').trim().toLowerCase();

    // 1. If OpenRouter model requested or forced
    if (
      requested.includes('deepseek') ||
      requested.includes('claude') ||
      requested.includes('openrouter') ||
      requested.includes('gpt-4') ||
      requested.includes('llama')
    ) {
      if (this.openRouterClient) {
        const actualModel = modelId || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
        return this.openRouterClient(actualModel);
      }
    }

    // 2. Default: Google Gemini
    if (this.googleClient) {
      let targetGemini = requested || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      // Normalize aliases
      if (targetGemini === 'gemini' || targetGemini === 'gemini-flash' || targetGemini.includes('gemini-2.0') || targetGemini.includes('gemini-1.5')) {
        targetGemini = 'gemini-2.5-flash';
      }
      return this.googleClient(targetGemini);
    }

    // 3. Fallback to OpenRouter if Gemini is not configured
    if (this.openRouterClient) {
      const fallbackModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
      return this.openRouterClient(fallbackModel);
    }

    // 4. Default fallback
    if (process.env.GEMINI_API_KEY) {
      return google(process.env.GEMINI_MODEL || 'gemini-2.5-flash');
    }

    throw new Error('Aucun fournisseur LLM configuré. Veuillez renseigner GEMINI_API_KEY ou OPENROUTER_API_KEY dans le fichier .env.');
  }

  getAvailableModels(): ModelProviderInfo[] {
    const geminiOk = this.isGeminiAvailable();
    const openrouterOk = this.isOpenRouterAvailable();

    return [
      {
        id: 'gemini-2.5-flash',
        name: 'Google Gemini 2.5 Flash',
        provider: 'google',
        description: 'Modèle ultra-rapide et économique recommandé pour la modération et le dialogue réactif',
        available: geminiOk,
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek V3 (OpenRouter)',
        provider: 'openrouter',
        description: 'Excellente capacité de raisonnement et de génération structurée',
        available: openrouterOk,
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet (OpenRouter)',
        provider: 'openrouter',
        description: 'Modèle de référence pour les tâches de précision et la rédaction de fiches produits',
        available: openrouterOk,
      },
    ];
  }
}

export const modelGateway = new ModelGateway();
