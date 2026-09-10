import { generateText } from 'ai';
import { ToolRegistry } from '../tools/registry';
import { RequestContext } from '../tools/types';
import { modelGateway } from '../gateway/model-provider';

export interface ExecutionTrace {
  step: number;
  toolCall?: { name: string; args: any };
  toolResult?: any;
  latencyMs: number;
}

export interface EngineResult {
  text: string;
  traces: ExecutionTrace[];
  modelUsed: string;
  provider: string;
  totalTokens?: number;
}

/**
 * ReActEngine V2 propulsé par Vercel AI SDK generateText(maxSteps: 5)
 */
export class ReActEngine {
  constructor(private toolRegistry: ToolRegistry) {}

  async execute(
    messages: any[],
    options?: { systemPrompt?: string; modelId?: string; temperature?: number },
    context?: RequestContext,
    maxSteps = 5
  ): Promise<EngineResult> {
    const startTime = Date.now();
    const model = modelGateway.getModel(options?.modelId);
    const tools = this.toolRegistry.getTools(context);

    const cleanMessages = messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
    }));

    const result = await generateText({
      model,
      system: options?.systemPrompt,
      temperature: options?.temperature,
      messages: cleanMessages,
      tools,
      maxSteps,
    });

    const traces: ExecutionTrace[] = (result.steps || []).map((step, idx) => ({
      step: idx + 1,
      toolCall: step.toolCalls?.[0] ? { name: step.toolCalls[0].toolName, args: (step.toolCalls[0] as any).args } : undefined,
      toolResult: step.toolResults?.[0]?.result,
      latencyMs: Date.now() - startTime,
    }));

    return {
      text: result.text,
      traces,
      modelUsed: options?.modelId || 'gemini-2.5-flash',
      provider: 'vercel-ai-sdk',
      totalTokens: result.usage?.totalTokens,
    };
  }
}
