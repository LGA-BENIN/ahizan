import { AhizanClient } from './ahizan-client';
import { RequestContext } from './types';
import { createProductTools } from './products/product-tools';
import { createAnalyticsTools } from './analytics/analytics-tools';
import { createModerationTools } from './products/moderation-tools';

export class ToolRegistry {
  private client: AhizanClient;

  constructor(client?: AhizanClient) {
    this.client = client || new AhizanClient();
  }

  getTools(context?: RequestContext) {
    let currentContext = context;
    const getCtx = () => currentContext;

    const tools: Record<string, any> = {
      ...createProductTools(this.client, getCtx),
      ...createAnalyticsTools(this.client, getCtx),
    };

    // P3-1 : les outils d'écriture (approve/reject) ne sont exposés au modèle que
    // pour un Super Admin authentifié. Un STAFF ne peut même pas déclencher la
    // demande d'approbation.
    if (context?.role === 'SUPER_ADMIN') {
      Object.assign(tools, createModerationTools(this.client, getCtx));
    }

    return tools;
  }

  async execute(name: string, args: any, context?: RequestContext): Promise<any> {
    const tools = this.getTools(context) as Record<string, any>;
    const targetTool = tools[name];
    if (!targetTool) {
      throw new Error(`Outil inconnu : "${name}"`);
    }

    try {
      return await targetTool.execute(args);
    } catch (err: any) {
      return { error: `Erreur lors de l'exécution de l'outil ${name}: ${err.message}` };
    }
  }

  getClient(): AhizanClient {
    return this.client;
  }
}
