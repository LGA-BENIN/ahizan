/**
 * Ahizan AI Client for Vendure Dashboard Extensions (V3 - UI Message Stream).
 * Utilise le proxy same-origin /ahizan-ai-api (AhizanAIProxyController) qui forward
 * le token Vendure et supporte le streaming SSE. Plus de problème CORS ni de
 * connexion à 127.0.0.1:3005 depuis le navigateur.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{ name: string; input?: any; output?: any; state: string; error?: string }>;
  reasoning?: string;
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
  toolCalls?: Array<{ id: string; name: string; arguments: any }>;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  modelUsed?: string;
  finishReason?: string;
}

export interface ProductApprovalAnalysis {
  productId: string;
  recommendation: 'APPROVE_OFFICIAL' | 'REGRAFT_EXISTING' | 'REQUEST_INFORMATION' | 'REJECT';
  confidence: number;
  decisionRationale: string;
  duplicateMatch: any;
  proposedOfficialProduct: any;
  qualityScore: any;
  usedDataSources: string[];
}

/** Token Vendure stocké par le dashboard v3 (localStorage: 'vendure-session-token'). */
function getVendureToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    localStorage.getItem('vendure-session-token') ||
    localStorage.getItem('vendure-auth-token') ||
    sessionStorage.getItem('vendure-session-token') ||
    sessionStorage.getItem('vendure-auth-token') ||
    undefined
  );
}

function authHeaders(): Record<string, string> {
  const token = getVendureToken();
  // Vendure v3 envoie le token via Authorization: Bearer, on fait de même.
  return token ? { Authorization: `Bearer ${token}`, 'vendure-auth-token': token } : {};
}

class AhizanAIClient {
  private baseUrl = '/ahizan-ai-api';

  private async post<T>(endpoint: string, body: any): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fetch(`${this.baseUrl}${cleanEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let errMsg = `Erreur AI [${res.status}]`;
      try { const json = await res.json(); if (json.error) errMsg = json.error; } catch {}
      throw new Error(errMsg);
    }
    return await res.json();
  }

  private async get<T>(endpoint: string): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fetch(`${this.baseUrl}${cleanEndpoint}`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error(`Erreur AI [${res.status}]`);
    return await res.json();
  }

  async checkHealth(): Promise<any> {
    try { return await this.get<any>('/health'); } catch { return { status: 'offline' }; }
  }

  async getModels(): Promise<ModelInfo[]> {
    try {
      const data = await this.get<{ models?: ModelInfo[] }>('/models');
      return data.models || [];
    } catch {
      return [{ id: 'gemini-2.5-flash', name: 'Google Gemini 2.5 Flash', provider: 'google', description: 'Recommandé', available: true }];
    }
  }

  async chat(messages: ChatMessage[], modelId?: string): Promise<ChatResponse> {
    return this.post<ChatResponse>('/chat', { messages, modelId, stream: false });
  }

  /**
   * Streaming via UI Message Stream protocol (AI SDK v6).
   * Appelle onEvent avec chaque événement structuré (text-delta, tool-*, etc.).
   * Retourne le texte complet accumulé.
   */
  async streamChat(
    messages: ChatMessage[],
    onEvent: (event: StreamEvent) => void,
    modelId?: string
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...authHeaders() },
      body: JSON.stringify({ messages, modelId, stream: true }),
    });

    if (!res.ok || !res.body) {
      const fallback = await this.chat(messages, modelId);
      const text = fallback.text || '';
      onEvent({ type: 'text-delta', delta: text, textDelta: text });
      onEvent({ type: 'finish' });
      return text;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    const handleEvent = (dataStr: string) => {
      if (!dataStr || dataStr === '[DONE]') return;
      try {
        const evt = JSON.parse(dataStr);
        onEvent(evt);
        if (evt.type === 'text-delta') {
          const delta = evt.delta ?? evt.textDelta ?? '';
          if (delta) fullText += delta;
        }
      } catch { /* ligne partielle ou non-JSON */ }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Les événements SSE sont séparés par \n\n
      let idx;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of block.split('\n')) {
          if (line.startsWith('data:')) handleEvent(line.slice(5).trim());
        }
      }
    }
    // Traiter le reste du buffer
    if (buffer.trim()) {
      for (const line of buffer.split('\n')) {
        if (line.startsWith('data:')) handleEvent(line.slice(5).trim());
      }
    }
    onEvent({ type: 'finish' });
    return fullText;
  }

  async getDashboardModelConfig(): Promise<{ primaryModel?: string; secondaryModel?: string }> {
    try { return await this.get<any>('/config/dashboard-model'); } catch { return {}; }
  }

  async setDashboardModelConfig(config: { primaryModel?: string; secondaryModel?: string }): Promise<any> {
    return this.post<any>('/config/dashboard-model', config);
  }

  async getConversations(): Promise<ConversationItem[]> {
    try {
      const data = await this.get<{ conversations?: ConversationItem[] }>('/conversations');
      return data.conversations || [];
    } catch {
      return [];
    }
  }

  async getConversation(id: string): Promise<{ conversation: any; messages: any[] }> {
    return this.get<{ conversation: any; messages: any[] }>(`/conversations/${id}`);
  }

  async syncConversation(id: string, title: string, messages: any[]): Promise<any> {
    return this.post<any>(`/conversations/${id}/sync`, { title, messages });
  }

  async deleteConversation(id: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/conversations/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error(`Erreur suppression [${res.status}]`);
    return await res.json();
  }

  readonly products = {
    analyze: async (productId: string): Promise<ProductApprovalAnalysis> =>
      this.post<ProductApprovalAnalysis>('/products/analyze', { productId }),
    suggestOfficial: async (productId: string): Promise<any> =>
      this.post<any>('/products/suggest-official', { productId }),
    detectDuplicates: async (productId: string): Promise<any> =>
      this.post<any>('/products/detect-duplicates', { productId }),
  };
}

export interface ConversationItem {
  id: string;
  title: string;
  createdAt?: number;
  updatedAt?: number;
}

export type StreamEvent =
  | { type: 'start' }
  | { type: 'start-step' }
  | { type: 'finish-step' }
  | { type: 'finish'; finishReason?: string }
  | { type: 'text-start'; id?: string }
  | { type: 'text-delta'; delta?: string; textDelta?: string; id?: string }
  | { type: 'text-end'; id?: string }
  | { type: 'reasoning-start'; id?: string }
  | { type: 'reasoning-delta'; delta?: string; id?: string }
  | { type: 'reasoning-end'; id?: string }
  | { type: 'reasoning'; textDelta?: string; reasoning?: string; delta?: string }
  | { type: 'tool-input-start'; toolCallId: string; toolName: string }
  | { type: 'tool-input-delta'; toolCallId: string; inputTextDelta?: string; delta?: string }
  | { type: 'tool-input-available'; toolCallId: string; toolName: string; input: any }
  | { type: 'tool-input-error'; toolCallId: string; toolName: string; input?: any; errorText?: string }
  | { type: 'tool-output-available'; toolCallId: string; output: any }
  | { type: 'tool-output-error'; toolCallId: string; errorText?: string }
  | { type: 'tool-approval-request'; approvalId: string; toolCallId: string; toolName?: string; input?: any }
  | { type: 'error'; error?: string; errorText?: string }
  | { type: string; [key: string]: any };

export const ahizanAi = new AhizanAIClient();
