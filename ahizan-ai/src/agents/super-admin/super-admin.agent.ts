import { ReActEngine, EngineResult } from '../../engine/react-engine';
import { SUPER_ADMIN_SYSTEM_PROMPT } from './system-prompt';
import { ChatMessage } from '../../gateway/types';
import { RequestContext } from '../../tools/types';

export class SuperAdminAgent {
  constructor(private engine: ReActEngine) {}

  async chat(
    messages: ChatMessage[],
    context?: RequestContext
  ): Promise<EngineResult> {
    return this.engine.execute(
      messages,
      {
        systemPrompt: SUPER_ADMIN_SYSTEM_PROMPT,
        temperature: 0.2
      },
      context
    );
  }
}
