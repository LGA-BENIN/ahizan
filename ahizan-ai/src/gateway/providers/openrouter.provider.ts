import { LLMProvider, ChatMessage, GenerateOptions, GenerateResponse, ToolCall } from '../types';

export class OpenRouterProvider implements LLMProvider {
  readonly name = 'openrouter';
  private apiKey: string | null;
  private defaultModel: string;
  private baseUrl: string;

  constructor(apiKey?: string, defaultModel = 'deepseek/deepseek-chat', baseUrl = 'https://openrouter.ai/api/v1') {
    this.apiKey = apiKey ? apiKey.trim() : null;
    this.defaultModel = defaultModel;
    this.baseUrl = baseUrl;
  }

  getApiKey(): string | null {
    const key = this.apiKey || process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY || null;
    return key ? key.trim() : null;
  }

  getModel(): string {
    return process.env.OPENROUTER_MODEL || this.defaultModel;
  }

  isAvailable(): boolean {
    const key = this.getApiKey();
    return !!key && key.length > 0;
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<GenerateResponse> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('OpenRouter/DeepSeek API key is not configured');
    }

    const model = options?.model || this.getModel();
    const startTime = Date.now();

    const formattedMessages: any[] = [];
    if (options?.systemPrompt) {
      formattedMessages.push({ role: 'system', content: options.systemPrompt });
    }

    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        formattedMessages.push({
          role: 'assistant',
          content: msg.content || '',
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }))
        });
      } else if (msg.role === 'tool') {
        formattedMessages.push({
          role: 'tool',
          tool_call_id: msg.toolCallId || 'call_default',
          content: msg.content
        });
      } else {
        formattedMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    const requestBody: any = {
      model,
      messages: formattedMessages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 2048,
    };

    if (options?.tools && options.tools.length > 0) {
      requestBody.tools = options.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));
    }

    if (options?.responseFormat === 'json') {
      requestBody.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://ahizan.com',
        'X-Title': 'Ahizan AI'
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error [${res.status}]: ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const latencyMs = Date.now() - startTime;

    const responseText = choice?.message?.content || '';
    const toolCalls: ToolCall[] = [];

    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        let args = {};
        try {
          args = JSON.parse(tc.function?.arguments || '{}');
        } catch {
          args = {};
        }
        toolCalls.push({
          id: tc.id,
          name: tc.function?.name,
          arguments: args
        });
      }
    }

    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;

    return {
      text: responseText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens
      },
      modelUsed: model,
      provider: this.name,
      latencyMs
    };
  }
}
