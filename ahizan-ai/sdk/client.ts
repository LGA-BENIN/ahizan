import { 
  ChatMessage, 
  ClientContext, 
  ChatResponse, 
  ModelInfo,
  ProductApprovalAnalysis, 
  ProposedOfficialProduct, 
  DuplicateMatchInfo 
} from './types';

export interface AhizanAIClientConfig {
  baseUrl?: string;
  getAuthToken?: () => string | null | undefined;
}

export interface ChatRequestOptions {
  modelId?: string;
  temperature?: number;
  stream?: boolean;
}

export class AhizanAIClient {
  private baseUrl: string;
  private getAuthToken?: () => string | null | undefined;

  constructor(config?: AhizanAIClientConfig) {
    this.baseUrl = config?.baseUrl || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3005` : 'http://127.0.0.1:3005');
    this.getAuthToken = config?.getAuthToken;
  }

  private getHeaders(context?: ClientContext): Record<string, string> {
    const token = context?.authToken || this.getAuthToken?.();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      if (token.includes('=')) {
        headers['Cookie'] = token;
      } else {
        headers['Authorization'] = `Bearer ${token}`;
        headers['vendure-auth-token'] = token;
      }
    }
    return headers;
  }

  private async post<T>(endpoint: string, body: any, context?: ClientContext): Promise<T> {
    const token = context?.authToken || this.getAuthToken?.();
    const headers = this.getHeaders(context);

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...body,
        context: {
          ...context,
          authToken: token || context?.authToken,
        },
      }),
    });

    if (!res.ok) {
      let errMsg = `Erreur Ahizan AI [${res.status}]`;
      try {
        const json = await res.json();
        if (json.error) errMsg = json.error;
      } catch {}
      throw new Error(errMsg);
    }

    return await res.json();
  }

  /**
   * Récupère la liste des modèles LLM disponibles et leur statut
   */
  async getModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/models`);
    if (!res.ok) throw new Error(`Erreur récupération modèles [${res.status}]`);
    const data = await res.json();
    return data.models || [];
  }

  /**
   * Conversationnel synchrone : Poser une question à l'assistant IA
   */
  async chat(messages: ChatMessage[], options?: ChatRequestOptions, context?: ClientContext): Promise<ChatResponse> {
    return this.post<ChatResponse>('/api/chat', { 
      messages, 
      modelId: options?.modelId,
      temperature: options?.temperature,
      stream: false 
    }, context);
  }

  /**
   * Conversationnel streaming (Server-Sent Events) : Rendu mot par mot
   */
  async streamChat(
    messages: ChatMessage[], 
    onChunk: (chunk: string) => void,
    options?: ChatRequestOptions,
    context?: ClientContext
  ): Promise<string> {
    const token = context?.authToken || this.getAuthToken?.();
    const headers = this.getHeaders(context);
    headers['Accept'] = 'text/event-stream';

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages,
        modelId: options?.modelId,
        temperature: options?.temperature,
        stream: true,
        context: {
          ...context,
          authToken: token || context?.authToken,
        },
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Erreur streaming Ahizan AI [${res.status}]`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      fullText += text;
      onChunk(text);
    }

    return fullText;
  }

  /**
   * Raccourci pour envoyer un simple message
   */
  async ask(question: string, options?: ChatRequestOptions, context?: ClientContext): Promise<string> {
    const res = await this.chat([{ role: 'user', content: question }], options, context);
    return res.text;
  }

  /**
   * Intelligence produit et modération catalogue
   */
  readonly products = {
    analyze: async (productId: string, context?: ClientContext): Promise<ProductApprovalAnalysis> => {
      return this.post<ProductApprovalAnalysis>('/api/products/analyze', { productId }, context);
    },

    suggestOfficial: async (productId: string, context?: ClientContext): Promise<ProposedOfficialProduct> => {
      return this.post<ProposedOfficialProduct>('/api/products/suggest-official', { productId }, context);
    },

    findDuplicates: async (productId: string, context?: ClientContext): Promise<DuplicateMatchInfo> => {
      return this.post<DuplicateMatchInfo>('/api/products/detect-duplicates', { productId }, context);
    },
  };
}

export const ahizanAi = new AhizanAIClient();
