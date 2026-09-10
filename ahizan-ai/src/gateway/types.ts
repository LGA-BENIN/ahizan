export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ChatMessage {
  role: Role;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd?: number;
}

export interface GenerateResponse {
  text: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
  modelUsed: string;
  provider: string;
  latencyMs: number;
}

export interface LLMProvider {
  readonly name: string;
  isAvailable(): boolean;
  generate(messages: ChatMessage[], options?: GenerateOptions): Promise<GenerateResponse>;
}
