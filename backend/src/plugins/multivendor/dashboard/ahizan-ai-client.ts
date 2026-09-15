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

export interface SuggestedOfficialImage {
  id: string;
  url: string;
  previewUrl: string;
  label: string;
  isPrimary: boolean;
  source: string;
  variantOptionValue?: string;
  imageType?: 'MAIN_WHITE_BG' | 'BACK' | 'PERSPECTIVE' | 'PACKAGING' | 'LIFESTYLE' | 'VARIANT_COLOR' | 'OTHER';
}

export interface TechnicalSpec {
  key: string;
  value: string;
  facetKey?: string;
}

export interface OptionGroupSuggestion {
  name: string;
  values: string[];
}

export interface VariantSuggestion {
  name: string;
  optionValues: Record<string, string>;
  isCurrentSellerVariant: boolean;
  suggestedSku?: string;
  suggestedPriceFcfa?: number;
  colorHex?: string;
}

export interface VisualOcrInsights {
  detectedBrand?: string;
  detectedModel?: string;
  readOcrText?: string;
  detectedColor?: string;
  detectedCondition?: string;
  imageQualityRating?: 'EXCELLENT' | 'GOOD' | 'BLURRY_OR_POOR' | 'NO_IMAGE';
}

export interface ProposedOfficialProduct {
  isValidSubmission: boolean;
  rejectionCategory?: 'NONE' | 'NONSENSE_SPAM' | 'POOR_IMAGE' | 'PROHIBITED' | 'INSUFFICIENT_DATA';
  rejectionSuggestedMessage?: string;
  name: string;
  brand: string;
  model: string;
  shortDescription: string;
  description?: string;
  seoTitle: string;
  seoDescription: string;
  categoryName?: string;
  collectionId?: string;
  visualOcrInsights?: VisualOcrInsights;
  truthScore: number;
  truthLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'SUSPICIOUS';
  truthRationale: string;
  optionGroups?: OptionGroupSuggestion[];
  variantsMatrix?: VariantSuggestion[];
  technicalSpecs?: TechnicalSpec[];
  suggestedOfficialImages: SuggestedOfficialImage[];
}

export interface DetectedContradiction {
  field: string;
  sellerValue: string;
  visualValue: string;
  explanation: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface HypothesisProposal {
  id: 'VISUAL_TRUTH' | 'SELLER_CLAIM' | 'RAW' | 'CUSTOM';
  label: string;
  description: string;
  confidence: number;
  product: ProposedOfficialProduct;
}

export interface ProductApprovalAnalysis {
  productId: string;
  recommendation: 'APPROVE_OFFICIAL' | 'REGRAFT_EXISTING' | 'REQUEST_INFORMATION' | 'REJECT';
  confidence: number;
  decisionRationale: string;
  detectedContradictions?: DetectedContradiction[];
  hypotheses?: HypothesisProposal[];
  proposals?: Record<string, ProposedOfficialProduct>;
  duplicateMatch: {
    found: boolean;
    confidence: number;
    targetProductId?: string;
    targetProductName?: string;
    similarityScore?: number;
    reason?: string;
  };
  proposedOfficialProduct: ProposedOfficialProduct;
  qualityScore: {
    score: number;
    ratingLabel: string;
    canPublish: boolean;
    missingElements: string[];
    strengths: string[];
  };
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
  return token ? { Authorization: `Bearer ${token}`, 'vendure-auth-token': token } : {};
}

class AhizanAIClient {
  private baseUrl = '/ahizan-ai-api';

  private async post<T>(endpoint: string, body: any): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fetch(`${this.baseUrl}${cleanEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
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
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Erreur AI [${res.status}]`);
    return await res.json();
  }

  async checkHealth(): Promise<any> {
    try { return await this.get<any>('/health'); } catch { return { status: 'offline' }; }
  }

  async getModels(): Promise<ModelInfo[]> {
    try {
      const res = await this.get<{ models: ModelInfo[] }>('/models');
      return res.models || [];
    } catch {
      return [];
    }
  }

  async getDashboardModelConfig(): Promise<{ primaryModel?: string; secondaryModel?: string }> {
    try {
      return await this.get<{ primaryModel?: string; secondaryModel?: string }>('/config/dashboard-model');
    } catch {
      return {};
    }
  }

  async listConversations(): Promise<ConversationItem[]> {
    try {
      const res = await this.get<{ conversations: ConversationItem[] }>('/conversations');
      return res.conversations || [];
    } catch {
      return [];
    }
  }

  async getConversations(): Promise<ConversationItem[]> {
    return this.listConversations();
  }

  async getConversation(id: string): Promise<{ conversation: ConversationItem; messages: any[] }> {
    return this.get<{ conversation: ConversationItem; messages: any[] }>(`/conversations/${id}`);
  }

  async syncConversation(id: string, title?: string, messages?: any[]): Promise<any> {
    return this.post<any>(`/conversations/${id}/sync`, { title, messages });
  }

  async deleteConversation(id: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/conversations/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Erreur suppression [${res.status}]`);
    return await res.json();
  }

  async chat(messages: ChatMessage[], modelId?: string): Promise<ChatResponse> {
    return this.post<ChatResponse>('/chat', { messages, modelId });
  }

  async streamChat(
    messages: ChatMessage[],
    onEvent: (event: StreamEvent) => void,
    modelId?: string
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...authHeaders(),
      },
      credentials: 'include',
      body: JSON.stringify({ messages, modelId, stream: true }),
    });

    if (!res.ok) {
      let errMsg = `Erreur AI [${res.status}]`;
      try {
        const json = await res.json();
        if (json.error) errMsg = json.error;
      } catch {}
      throw new Error(errMsg);
    }

    if (!res.body) {
      throw new Error('Flux de réponse non disponible.');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          let dataStr = trimmed;
          if (trimmed.startsWith('data:')) {
            dataStr = trimmed.replace(/^data:\s*/, '');
          }

          if (dataStr === '[DONE]') {
            onEvent({ type: 'finish' });
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type) {
              if (parsed.type === 'text-delta' || parsed.type === '0') {
                const delta = parsed.delta ?? parsed.textDelta ?? (typeof parsed === 'string' ? parsed : '');
                accumulatedText += delta;
              }
              onEvent(parsed);
            } else if (typeof parsed === 'string') {
              accumulatedText += parsed;
              onEvent({ type: 'text-delta', delta: parsed });
            } else if (parsed.text) {
              accumulatedText += parsed.text;
              onEvent({ type: 'text-delta', delta: parsed.text });
            }
          } catch {
            // Raw text delta fallback
            if (dataStr) {
              accumulatedText += dataStr;
              onEvent({ type: 'text-delta', delta: dataStr });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return accumulatedText;
  }

  readonly products = {
    analyze: async (
      productId: string,
      options?: { forcedMode?: 'VISUAL_TRUTH' | 'SELLER_CLAIM' | 'RAW' | 'CUSTOM'; customQuery?: string }
    ): Promise<ProductApprovalAnalysis> =>
      this.post<ProductApprovalAnalysis>('/products/analyze', { productId, ...options }),
    suggestOfficial: async (
      productId: string,
      options?: { forcedMode?: string; customQuery?: string }
    ): Promise<any> =>
      this.post<any>('/products/suggest-official', { productId, ...options }),
    detectDuplicates: async (productId: string): Promise<any> =>
      this.post<any>('/products/detect-duplicates', { productId }),
    regenerateField: async (
      productId: string, 
      field: 'title' | 'description' | 'seo' | 'images' | 'specs' | 'variants', 
      currentProposal: any
    ): Promise<Partial<ProposedOfficialProduct>> =>
      this.post<Partial<ProposedOfficialProduct>>('/products/regenerate-field', { productId, field, currentProposal }),
  };

  async analyzeProductApproval(
    productId: string,
    options?: { forcedMode?: 'VISUAL_TRUTH' | 'SELLER_CLAIM' | 'RAW' | 'CUSTOM'; customQuery?: string }
  ): Promise<ProductApprovalAnalysis> {
    return this.products.analyze(productId, options);
  }

  async reanalyzeHypothesis(
    productId: string,
    hypId: 'VISUAL_TRUTH' | 'SELLER_CLAIM' | 'RAW' | 'CUSTOM'
  ): Promise<ProductApprovalAnalysis> {
    return this.products.analyze(productId, { forcedMode: hypId });
  }

  async regenerateField(
    productId: string,
    field: 'title' | 'description' | 'seo' | 'images' | 'specs' | 'variants',
    currentProposal: any
  ): Promise<Partial<ProposedOfficialProduct>> {
    return this.products.regenerateField(productId, field, currentProposal);
  }
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
