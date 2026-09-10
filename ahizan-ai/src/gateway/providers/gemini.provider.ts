import { LLMProvider, ChatMessage, GenerateOptions, GenerateResponse, ToolCall } from '../types';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  private apiKey: string | null;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel = 'gemini-2.5-flash') {
    this.apiKey = apiKey ? apiKey.trim() : null;
    this.defaultModel = defaultModel;
  }

  getApiKey(): string | null {
    const key = this.apiKey || process.env.GEMINI_API_KEY || null;
    return key ? key.trim() : null;
  }

  getModel(): string {
    return process.env.GEMINI_MODEL || this.defaultModel;
  }

  isAvailable(): boolean {
    const key = this.getApiKey();
    return !!key && key.length > 0;
  }

  async generate(messages: ChatMessage[], options?: GenerateOptions): Promise<GenerateResponse> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('Gemini API key is not configured');
    }

    let model = options?.model || this.getModel();
    if (model === 'gemini-2.0-flash' || model === 'gemini-1.5-flash' || model === 'gemini-1.5-pro') {
      model = 'gemini-2.5-flash';
    }
    const startTime = Date.now();

    // Map tools to Gemini functionDeclarations format
    const tools = options?.tools && options.tools.length > 0 ? [
      {
        functionDeclarations: options.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }
    ] : undefined;

    // Convert chat messages to Gemini contents format
    const contents: any[] = [];
    let systemInstruction: any = undefined;

    if (options?.systemPrompt) {
      systemInstruction = {
        parts: [{ text: options.systemPrompt }]
      };
    }

    for (const msg of messages) {
      if (msg.role === 'system') {
        if (!systemInstruction) {
          systemInstruction = { parts: [{ text: msg.content }] };
        }
        continue;
      }

      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        const parts: any[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          for (const tc of msg.toolCalls) {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.arguments
              }
            });
          }
        }
        contents.push({ role: 'model', parts });
      } else if (msg.role === 'tool') {
        let parsed: any;
        try {
          parsed = JSON.parse(msg.content);
        } catch {
          parsed = { output: msg.content };
        }
        contents.push({
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: msg.toolCallId || 'toolResult',
                response: typeof parsed === 'object' && parsed !== null ? parsed : { output: parsed }
              }
            }
          ]
        });
      }
    }

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 2048,
        responseMimeType: options?.responseFormat === 'json' ? 'application/json' : 'text/plain'
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = systemInstruction;
    }
    if (tools) {
      requestBody.tools = tools;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error [${res.status}]: ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const latencyMs = Date.now() - startTime;

    let responseText = '';
    const toolCalls: ToolCall[] = [];

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          responseText += part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: part.functionCall.name,
            arguments: part.functionCall.args || {}
          });
        }
      }
    }

    const usageMeta = data.usageMetadata;
    const promptTokens = usageMeta?.promptTokenCount || 0;
    const completionTokens = usageMeta?.candidatesTokenCount || 0;

    return {
      text: responseText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCostUsd: (promptTokens * 0.000000075) + (completionTokens * 0.0000003)
      },
      modelUsed: model,
      provider: this.name,
      latencyMs
    };
  }
}
