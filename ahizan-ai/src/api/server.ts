import http from 'http';
import fs from 'fs';
import path from 'path';
import { streamText, generateText } from 'ai';
import { ProductApprovalWorkflow } from '../workflows/product-approval/approval-workflow';
import { ToolRegistry } from '../tools/registry';
import { RequestContext } from '../tools/types';
import { modelGateway } from '../gateway/model-provider';
import { SUPER_ADMIN_SYSTEM_PROMPT } from '../agents/super-admin/system-prompt';

export interface ServerConfig {
  port?: number;
  host?: string;
}

export class AhizanAIServer {
  private server: http.Server;
  private port: number;
  private host: string;
  private toolRegistry: ToolRegistry;
  private approvalWorkflow: ProductApprovalWorkflow;
  private totalRequests = 0;
  private publicDir: string;

  constructor(config?: ServerConfig) {
    this.port = config?.port || Number(process.env.AHIZAN_AI_PORT) || 3005;
    this.host = config?.host || '0.0.0.0';
    // Pointer sur le bundle de l'application React Vercel AI Elements (web/dist) avec fallback sur public/
    const webDist = path.resolve(__dirname, '../../web/dist');
    this.publicDir = fs.existsSync(webDist) ? webDist : path.resolve(__dirname, '../../public');

    this.toolRegistry = new ToolRegistry();
    this.approvalWorkflow = new ProductApprovalWorkflow(this.toolRegistry);

    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  private setCorsHeaders(res: http.ServerResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, vendure-auth-token');
  }

  private sendJson(res: http.ServerResponse, status: number, data: any) {
    this.setCorsHeaders(res);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  }

  private serveStaticFile(res: http.ServerResponse, filePath: string, contentType: string, isHead = false) {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        return this.sendJson(res, 404, { error: 'Fichier non trouvé' });
      }
      this.setCorsHeaders(res);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': Buffer.byteLength(data),
      });
      if (isHead) {
        return res.end();
      }
      res.end(data);
    });
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.html': return 'text/html; charset=utf-8';
      case '.css': return 'text/css; charset=utf-8';
      case '.js': return 'application/javascript; charset=utf-8';
      case '.svg': return 'image/svg+xml';
      case '.json': return 'application/json; charset=utf-8';
      case '.png': return 'image/png';
      case '.ico': return 'image/x-icon';
      default: return 'application/octet-stream';
    }
  }

  private async parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        if (!body) return resolve({});
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Payload JSON invalide'));
        }
      });
      req.on('error', err => reject(err));
    });
  }

  private extractContext(req: http.IncomingMessage, body: any): RequestContext {
    const authHeader = req.headers['authorization'];
    const vendureToken = req.headers['vendure-auth-token'] as string;
    const cookie = req.headers['cookie'];

    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const token = bearerToken || vendureToken || cookie || body.context?.authToken;

    return {
      authToken: token,
      role: body.context?.role || 'SUPER_ADMIN',
      userId: body.context?.userId,
      productId: body.context?.productId,
    };
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    this.setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    try {
      // 0. Fichiers statiques pour la console React AI Elements
      if ((req.method === 'GET' || req.method === 'HEAD') && !pathname.startsWith('/api/')) {
        const isHead = req.method === 'HEAD';
        const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        const targetPath = safePath === '/' ? path.join(this.publicDir, 'index.html') : path.join(this.publicDir, safePath);

        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
          return this.serveStaticFile(res, targetPath, this.getContentType(targetPath), isHead);
        }

        // SPA Fallback pour index.html
        const indexPath = path.join(this.publicDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          return this.serveStaticFile(res, indexPath, 'text/html; charset=utf-8', isHead);
        }
      }


      // 1. Health check
      if (req.method === 'GET' && pathname === '/api/health') {

        const models = modelGateway.getAvailableModels();
        return this.sendJson(res, 200, {
          status: 'ok',
          service: 'ahizan-ai',
          version: '2.0.0 (Vercel AI SDK Core)',
          models,
          metrics: {
            totalRequests: this.totalRequests,
            activeModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Modèles disponibles
      if (req.method === 'GET' && pathname === '/api/models') {
        return this.sendJson(res, 200, {
          models: modelGateway.getAvailableModels(),
        });
      }

      // 3. Endpoint Chat (Streaming SSE ou JSON synchrone)
      if (req.method === 'POST' && (pathname === '/api/chat' || pathname === '/api/chat/stream')) {
        this.totalRequests++;
        const body = await this.parseBody(req);
        const messages = body.messages || [];
        if (!Array.isArray(messages) || messages.length === 0) {
          return this.sendJson(res, 400, { error: 'Le champ "messages" (tableau non vide) est requis.' });
        }

        const context = this.extractContext(req, body);
        const tools = this.toolRegistry.getTools(context);
        const modelId = body.modelId || body.model;
        const model = modelGateway.getModel(modelId);

        // Normalize messages to format expected by AI SDK
        const cleanMessages = messages.map((m: any) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
        }));

        const isStreaming =
          pathname === '/api/chat/stream' ||
          body.stream === true ||
          (req.headers['accept'] && req.headers['accept'].includes('text/event-stream'));

        if (isStreaming) {
          // SSE Streaming via Vercel AI SDK pipeUIMessageStreamToResponse
          this.setCorsHeaders(res);
          const result = streamText({
            model,
            system: SUPER_ADMIN_SYSTEM_PROMPT,
            messages: cleanMessages,
            tools,
            maxSteps: 5,
          });

          // Pipe directly to Node.js http.ServerResponse
          return result.pipeDataStreamToResponse(res);
        } else {
          // Synchronous non-streaming generation for backward-compatibility
          const result = await generateText({
            model,
            system: SUPER_ADMIN_SYSTEM_PROMPT,
            messages: cleanMessages,
            tools,
            maxSteps: 5,
          });

          return this.sendJson(res, 200, {
            text: result.text,
            toolCalls: result.toolCalls?.map(tc => ({
              id: (tc as any).toolCallId || tc.toolName,
              name: tc.toolName,
              arguments: (tc as any).args,
            })),
            usage: result.usage,
            finishReason: result.finishReason,
          });
        }
      }

      // 4. Analyse et normalisation de produit (Structured Outputs)
      if (req.method === 'POST' && pathname === '/api/products/analyze') {
        const body = await this.parseBody(req);
        const productId = String(body.productId || '');
        if (!productId) {
          return this.sendJson(res, 400, { error: 'Paramètre "productId" requis.' });
        }

        const context = this.extractContext(req, body);
        const analysis = await this.approvalWorkflow.analyze(productId, context);

        return this.sendJson(res, 200, analysis);
      }

      // 5. Proposition de fiche officielle
      if (req.method === 'POST' && pathname === '/api/products/suggest-official') {
        const body = await this.parseBody(req);
        const productId = String(body.productId || '');
        if (!productId) {
          return this.sendJson(res, 400, { error: 'Paramètre "productId" requis.' });
        }

        const context = this.extractContext(req, body);
        const analysis = await this.approvalWorkflow.analyze(productId, context);

        return this.sendJson(res, 200, analysis.proposedOfficialProduct);
      }

      // 6. Détection de doublons
      if (req.method === 'POST' && pathname === '/api/products/detect-duplicates') {
        const body = await this.parseBody(req);
        const productId = String(body.productId || '');
        if (!productId) {
          return this.sendJson(res, 400, { error: 'Paramètre "productId" requis.' });
        }

        const context = this.extractContext(req, body);
        const analysis = await this.approvalWorkflow.analyze(productId, context);

        return this.sendJson(res, 200, analysis.duplicateMatch);
      }

      // Route 404
      return this.sendJson(res, 404, { error: `Endpoint "${pathname}" non trouvé.` });
    } catch (err: any) {
      console.error(`[AhizanAIServer] Erreur sur ${pathname}:`, err);
      return this.sendJson(res, 500, { error: err.message || 'Erreur interne du serveur Ahizan AI' });
    }
  }

  start(): Promise<void> {
    return new Promise(resolve => {
      this.server.listen(this.port, this.host, () => {
        console.log(`🚀 Ahizan AI Service V2 listening on http://${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close(err => (err ? reject(err) : resolve()));
    });
  }
}
