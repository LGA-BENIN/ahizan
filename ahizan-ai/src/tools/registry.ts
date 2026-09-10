import { AhizanClient } from './ahizan-client';
import { RequestContext } from './types';
import { createProductTools } from './products/product-tools';
import { createAnalyticsTools } from './analytics/analytics-tools';

export class ToolRegistry {
  private client: AhizanClient;

  constructor(client?: AhizanClient) {
    this.client = client || new AhizanClient();
  }

  getTools(context?: RequestContext) {
    let currentContext = context;
    const getCtx = () => currentContext;

    const productTools = createProductTools(this.client, getCtx);
    const analyticsTools = createAnalyticsTools(this.client, getCtx);

    return {
      ...productTools,
      ...analyticsTools,
    };
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

export const defaultToolRegistry = new ToolRegistry();
