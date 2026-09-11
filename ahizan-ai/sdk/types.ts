export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: any[];
  toolCallId?: string;
}

export interface ClientContext {
  authToken?: string;
  role?: string;
  userId?: string;
  productId?: string;
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
