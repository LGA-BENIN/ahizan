import { ToolDefinition } from '../gateway/types';

export interface RequestContext {
  userId?: string;
  role?: string;
  authToken?: string;
  productId?: string;
}

export interface ArizanTool {
  readonly definition: ToolDefinition;
  readonly isActionTool: boolean;
  readonly requiredPermission?: string;
  execute(args: any, context?: RequestContext): Promise<any>;
}
