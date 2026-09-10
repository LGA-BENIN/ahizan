/**
 * Ahizan AI Client for Vendure Dashboard Extensions (V2 - Vercel AI SDK Core)
 * Connects directly to the Ahizan AI microservice (port 3005) or Vendure proxy
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  available: boolean;
}

export interface ChatResponse {
  text: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: any;
  }>;
  traces?: Array<{
    step: number;
    toolCall?: { name: string; args: any };
    toolResult?: any;
    latencyMs: number;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  modelUsed?: string;
  finishReason?: string;
}

export interface ProposedOfficialProduct {
  name: string;
  brand: string;
  model: string;
  shortDescription: string;
  description?: string;
  seoTitle: string;
  seoDescription: string;
  categoryName?: string;
  collectionId?: string;
}

export interface DuplicateMatchInfo {
  found: boolean;
  confidence: number;
  targetProductId?: string;
  targetProductName?: string;
  similarityScore?: number;
  reason?: string;
}

export interface QualityScoreAudit {
  score: number;
  ratingLabel: string;
  canPublish: boolean;
  missingElements: string[];
  strengths: string[];
}

export interface ProductApprovalAnalysis {
  productId: string;
  recommendation: 'APPROVE_OFFICIAL' | 'REGRAFT_EXISTING' | 'REQUEST_INFORMATION' | 'REJECT';
  confidence: number;
  decisionRationale: string;
  duplicateMatch: DuplicateMatchInfo;
  proposedOfficialProduct: ProposedOfficialProduct;
  qualityScore: QualityScoreAudit;
  usedDataSources: string[];
}

class AhizanAIClient {
  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      // Connect directly to port 3005 on same hostname for high-speed streaming
      return `${window.location.protocol}//${window.location.hostname}:3005/api`;
    }
    return 'http://127.0.0.1:3005/api';
  }

  private async post<T>(endpoint: string, body: any): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.getBaseUrl()}${cleanEndpoint}`;
    
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Fallback to proxy if direct connection fails
      res = await fetch(`/ahizan-ai-api${cleanEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    if (!res.ok) {
      let errMsg = `Erreur AI [${res.status}]`;
      try {
        const json = await res.json();
        if (json.error) errMsg = json.error;
      } catch {}
      throw new Error(errMsg);
    }

    return await res.json();
  }

  async checkHealth(): Promise<any> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/health`);
      if (res.ok) return await res.json();
      const fallback = await fetch('/ahizan-ai-api/health');
      return await fallback.json();
    } catch {
      return { status: 'offline' };
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/models`);
      if (res.ok) {
        const data = await res.json();
        return data.models || [];
      }
    } catch {}
    return [
      { id: 'gemini-2.5-flash', name: 'Google Gemini 2.5 Flash', provider: 'google', description: 'Recommandé', available: true }
    ];
  }

  async chat(messages: ChatMessage[], modelId?: string): Promise<ChatResponse> {
    return this.post<ChatResponse>('/chat', { messages, modelId, stream: false });
  }

  /**
   * Streaming en direct via Server-Sent Events (Vercel AI SDK DataStream)
   */
  async streamChat(
    messages: ChatMessage[],
    onToken: (textChunk: string) => void,
    modelId?: string
  ): Promise<string> {
    const url = `${this.getBaseUrl()}/chat/stream`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        messages,
        modelId,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      // Fallback to non-streaming
      const fallback = await this.chat(messages, modelId);
      onToken(fallback.text);
      return fallback.text;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      
      // Parse AI SDK data stream protocol: lines starting with '0:' are text deltas
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('0:')) {
          try {
            const textPart = JSON.parse(line.substring(2));
            fullText += textPart;
            onToken(textPart);
          } catch {
            // Raw text fallback
            const raw = line.substring(2).replace(/^"|"$/g, '');
            fullText += raw;
            onToken(raw);
          }
        }
      }
    }

    return fullText;
  }

  readonly products = {
    analyze: async (productId: string): Promise<ProductApprovalAnalysis> => {
      return this.post<ProductApprovalAnalysis>('/products/analyze', { productId });
    },
    suggestOfficial: async (productId: string): Promise<ProposedOfficialProduct> => {
      return this.post<ProposedOfficialProduct>('/products/suggest-official', { productId });
    },
    detectDuplicates: async (productId: string): Promise<DuplicateMatchInfo> => {
      return this.post<DuplicateMatchInfo>('/products/detect-duplicates', { productId });
    },
  };
}

export const ahizanAi = new AhizanAIClient();
