import http from 'http';
import fs from 'fs';
import path from 'path';
import { streamText, generateText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { ProductApprovalWorkflow } from '../workflows/product-approval/approval-workflow';
import { ToolRegistry } from '../tools/registry';
import { RequestContext } from '../tools/types';
import { modelGateway } from '../gateway/model-provider';
import { configStore } from '../gateway/config-store';
import { SUPER_ADMIN_SYSTEM_PROMPT } from '../agents/super-admin/system-prompt';
import { createLogger } from '../utils/logger';
import { conversationStore } from '../store/conversation-store';

const log = createLogger('server');

export interface ServerConfig {
  port?: number;
  host?: string;
}

// P1-4 : quotas simples par identifiant authentifié (voir docs/roadmap-produit.md).
// IMPORTANT : ces valeurs sont lues à CHAQUE appel (et non figées dans une constante de
// module) car `index.ts` charge `.env` après que ce module ait été importé — une
// constante évaluée au chargement du module verrouillerait la valeur par défaut avant
// que `.env` ne soit lu.
const RATE_LIMIT_WINDOW_MS = 60_000;
const getRateLimitMax = () => Number(process.env.AHIZAN_AI_RATE_LIMIT_PER_MIN || 20);
const getMaxOutputTokens = () => Number(process.env.AHIZAN_AI_MAX_OUTPUT_TOKENS || 4096);
const getRequestTimeoutMs = () => Number(process.env.AHIZAN_AI_REQUEST_TIMEOUT_MS || 120_000);
// P3-1 : secret HMAC signant les demandes d'approbation humaine des outils d'écriture.
const getToolApprovalSecret = () => process.env.AHIZAN_AI_TOOL_APPROVAL_SECRET;

export class AhizanAIServer {
  private server: http.Server;
  private port: number;
  private host: string;
  private toolRegistry: ToolRegistry;
  private approvalWorkflow: ProductApprovalWorkflow;
  private totalRequests = 0;
  private publicDir: string;
  private allowedOrigins: string[];
  private rateLimitHits = new Map<string, number[]>();

  constructor(config?: ServerConfig) {
    this.port = config?.port || Number(process.env.AHIZAN_AI_PORT) || 3005;
    this.host = config?.host || '0.0.0.0';
    // Pointer sur le bundle de l'application React Vercel AI Elements (web/dist) avec fallback sur public/
    const webDist = path.resolve(__dirname, '../../web/dist');
    this.publicDir = fs.existsSync(webDist) ? webDist : path.resolve(__dirname, '../../public');

    // P1-2 : CORS restreint aux domaines Ahizan (plus de "*").
    this.allowedOrigins = (process.env.AHIZAN_AI_ALLOWED_ORIGINS || 'https://ai.ahizan.com,https://administrator.ahizan.com')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);

    this.toolRegistry = new ToolRegistry();
    this.approvalWorkflow = new ProductApprovalWorkflow(this.toolRegistry);

    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  private setCorsHeaders(res: http.ServerResponse, req?: http.IncomingMessage) {
    const origin = req?.headers.origin;
    const allowOrigin = origin && this.allowedOrigins.includes(origin)
      ? origin
      : (process.env.NODE_ENV !== 'production' ? origin || this.allowedOrigins[0] : this.allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Origin', allowOrigin || this.allowedOrigins[0]);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, vendure-auth-token');
  }

  // NOTE : les en-têtes CORS sont posés une seule fois, au tout début de `handleRequest`,
  // avant tout dispatch. Les méthodes ci-dessous ne doivent pas les re-poser sans le
  // `req` d'origine sous peine d'écraser la valeur d'Origin déjà résolue (P1-2).
  private sendJson(res: http.ServerResponse, status: number, data: any) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  }

  private serveStaticFile(res: http.ServerResponse, filePath: string, contentType: string, isHead = false) {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        return this.sendJson(res, 404, { error: 'Fichier non trouvé' });
      }
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

  private extractToken(req: http.IncomingMessage, body: any): string | undefined {
    const authHeader = req.headers['authorization'];
    const vendureToken = req.headers['vendure-auth-token'] as string;
    const cookie = req.headers['cookie'];
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    return bearerToken || vendureToken || cookie || body.context?.authToken;
  }

  /**
   * P1-1 : authentifie la requête auprès de Vendure et dérive le rôle réel depuis le
   * backend. Le champ `role` envoyé par le client dans le corps de la requête n'a
   * PLUS aucun effet sur les privilèges accordés (voir extractContext ci-dessous).
   * Renvoie `null` (après avoir répondu 401) si le token est absent ou invalide.
   */
  private async authenticate(req: http.IncomingMessage, res: http.ServerResponse, body: any): Promise<RequestContext | null> {
    const token = this.extractToken(req, body);
    if (!token) {
      this.sendJson(res, 401, { error: 'Authentification requise. Connectez-vous avec vos identifiants Ahizan Admin.' });
      return null;
    }
    const identity = await this.toolRegistry.getClient().verifyAdminToken(token);
    if (!identity) {
      this.sendJson(res, 401, { error: 'Session invalide ou expirée. Merci de vous reconnecter.' });
      return null;
    }
    return {
      authToken: token,
      role: identity.isSuperAdmin ? 'SUPER_ADMIN' : 'STAFF',
      userId: identity.identifier,
      productId: body.context?.productId,
    };
  }

  /** P1-4 : quota simple de requêtes par utilisateur authentifié (fenêtre glissante 60s). */
  private isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const hits = (this.rateLimitHits.get(identifier) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    hits.push(now);
    this.rateLimitHits.set(identifier, hits);
    return hits.length > getRateLimitMax();
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    this.setCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const reqStart = Date.now();

    // P5-4 : journal de requête avec durée et statut de réponse
    res.on('finish', () => {
      if (pathname.startsWith('/api/')) {
        log.info('req', { method: req.method, path: pathname, status: res.statusCode, ms: Date.now() - reqStart });
      }
    });

    // P1-4 : borne le temps total d'une requête (évite qu'une génération ou un appel
    // d'outil bloqué ne conserve la connexion ouverte indéfiniment).
    req.setTimeout(getRequestTimeoutMs(), () => {
      if (!res.writableEnded) {
        try { res.destroy(); } catch { /* déjà fermée */ }
      }
    });

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
        const rawSettings = configStore.getRawSettings();
        const models = await modelGateway.getAvailableModels();
        const vendureOk = await this.toolRegistry.getClient().healthCheck();
        return this.sendJson(res, 200, {
          status: vendureOk ? 'ok' : 'degraded',
          service: 'ahizan-ai',
          version: '2.2.0 (Dynamic Model Catalog & Vercel AI Elements)',
          models,
          dependencies: {
            vendureAdminApi: vendureOk ? 'ok' : 'unreachable',
          },
          metrics: {
            totalRequests: this.totalRequests,
            activeModel: rawSettings.activeModel || 'gemini-3.8-flash',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 1b. Connexion (P1-1) : authentifie l'utilisateur directement auprès de Vendure
      // avec SES PROPRES identifiants Admin. Le token renvoyé doit être stocké côté
      // client et envoyé sur chaque appel suivant (en-tête `vendure-auth-token`).
      if (req.method === 'POST' && pathname === '/api/auth/login') {
        const body = await this.parseBody(req);
        const { username, password } = body || {};
        if (!username || !password) {
          return this.sendJson(res, 400, { error: 'Identifiant et mot de passe requis.' });
        }
        const result = await this.toolRegistry.getClient().authenticateUser(username, password);
        if (!result) {
          return this.sendJson(res, 401, { error: 'Identifiants incorrects.' });
        }
        const identity = await this.toolRegistry.getClient().verifyAdminToken(result.token);
        return this.sendJson(res, 200, {
          token: result.token,
          identifier: result.identifier,
          isSuperAdmin: identity?.isSuperAdmin ?? false,
        });
      }

      // 2. Modèles disponibles (catalogue public, sans clé ni secret)
      if (req.method === 'GET' && pathname === '/api/models') {
        return this.sendJson(res, 200, {
          models: await modelGateway.getAvailableModels(),
        });
      }

      // 2b. Récupérer les paramètres de configuration IA (clés masquées) — réservé Super Admin
      if (req.method === 'GET' && pathname === '/api/settings/models') {
        const body = await this.parseBody(req);
        const ctx = await this.authenticate(req, res, body);
        if (!ctx) return;
        if (ctx.role !== 'SUPER_ADMIN') {
          return this.sendJson(res, 403, { error: 'Accès réservé aux Super Administrateurs.' });
        }
        return this.sendJson(res, 200, {
          settings: configStore.getMaskedSettings(),
          models: await modelGateway.getAvailableModels(),
        });
      }

      // P3 : config du modèle utilisé par l'assistant Horizon AI flottant du dashboard
      // admin Vendure. Permet de définir un modèle prioritaire et un modèle secondaire.
      if (pathname === '/api/config/dashboard-model') {
        const body = await this.parseBody(req);
        const ctx = await this.authenticate(req, res, body);
        if (!ctx) return;
        if (ctx.role !== 'SUPER_ADMIN') {
          return this.sendJson(res, 403, { error: 'Accès réservé aux Super Administrateurs.' });
        }
        if (req.method === 'GET') {
          const raw = configStore.getRawSettings();
          return this.sendJson(res, 200, {
            primaryModel: raw.dashboardPrimaryModel || raw.activeModel || '',
            secondaryModel: raw.dashboardSecondaryModel || '',
          });
        }
        if (req.method === 'POST') {
          configStore.saveSettings({
            dashboardPrimaryModel: body.primaryModel,
            dashboardSecondaryModel: body.secondaryModel,
          } as any);
          return this.sendJson(res, 200, {
            success: true,
            primaryModel: body.primaryModel,
            secondaryModel: body.secondaryModel,
          });
        }
      }

      // 2c. Sauvegarder les paramètres de configuration IA — réservé Super Admin
      if (req.method === 'POST' && pathname === '/api/settings/models') {
        const body = await this.parseBody(req);
        const ctx = await this.authenticate(req, res, body);
        if (!ctx) return;
        if (ctx.role !== 'SUPER_ADMIN') {
          return this.sendJson(res, 403, { error: 'Accès réservé aux Super Administrateurs.' });
        }

        // P0-3 : un modèle personnalisé nouvellement ajouté doit être validé par un
        // véritable appel de connectivité avant d'être accepté. On ne valide que les
        // modèles réellement nouveaux (pas déjà connus) pour ne pas ralentir chaque
        // sauvegarde de préférences avec des appels réseau inutiles.
        const previousIds = new Set(configStore.getRawSettings().models.map(m => m.id));
        const newCustomModels = (body.models || []).filter((m: any) => m.isCustom && !previousIds.has(m.id));
        for (const m of newCustomModels) {
          const result = await modelGateway.validateModel(m.id);
          if (!result.valid) {
            return this.sendJson(res, 400, {
              success: false,
              error: `Le modèle "${m.id}" est inaccessible : ${result.error}`,
            });
          }
        }

        configStore.saveSettings(body);
        modelGateway.refreshClientsIfChanged();
        return this.sendJson(res, 200, {
          success: true,
          message: 'Paramètres IA mis à jour avec succès.',
          settings: configStore.getMaskedSettings(),
          models: await modelGateway.getAvailableModels(),
        });
      }

      // 2d. Tester la connectivité d'un modèle / clé API — réservé Super Admin
      if (req.method === 'POST' && pathname === '/api/settings/models/test') {
        const body = await this.parseBody(req);
        const ctx = await this.authenticate(req, res, body);
        if (!ctx) return;
        if (ctx.role !== 'SUPER_ADMIN') {
          return this.sendJson(res, 403, { error: 'Accès réservé aux Super Administrateurs.' });
        }
        const testModelId = body.modelId || 'gemini-3.8-flash';
        
        try {
          const model = modelGateway.getModel(testModelId);
          const testResult = await generateText({
            model,
            system: 'Tu es un testeur de connectivité technique pour Ahizan AI.',
            prompt: 'Réponds uniquement avec le mot EXACT: "OK"',
            maxOutputTokens: 10,
          });

          return this.sendJson(res, 200, {
            success: true,
            modelId: testModelId,
            response: testResult.text.trim(),
            message: `Connexion réussie avec le modèle ${testModelId} !`,
          });
        } catch (testErr: any) {
          return this.sendJson(res, 400, {
            success: false,
            error: testErr.message || 'Échec du test de connectivité avec le modèle.',
          });
        }
      }

      // P2-3 : Persistance server-side des conversations (sync multi-appareil)
      // Toutes ces routes nécessitent authentification. Les conversations sont liées
      // au compte utilisateur Vendure, pas au navigateur.

      // Lister les conversations de l'utilisateur
      if (req.method === 'GET' && pathname === '/api/conversations') {
        const body = await this.parseBody(req);
        const ctx = await this.authenticate(req, res, body);
        if (!ctx) return;
        const conversations = conversationStore.listConversations(ctx.userId!);
        return this.sendJson(res, 200, { conversations });
      }

      // Récupérer une conversation avec ses messages
      const convMatch = pathname.match(/^\/api\/conversations\/([^/]+)$/);
      if (convMatch) {
        const body = await this.parseBody(req);
        const ctx = await this.authenticate(req, res, body);
        if (!ctx) return;
        const convId = convMatch[1];

        if (req.method === 'GET') {
          const conv = conversationStore.getConversation(ctx.userId!, convId);
          if (!conv) return this.sendJson(res, 404, { error: 'Conversation introuvable.' });
          const messages = conversationStore.getMessages(ctx.userId!, convId);
          return this.sendJson(res, 200, {
            conversation: conv,
            messages: messages.map(m => {
              let parsedParts: any = undefined;
              if (m.parts) {
                try { parsedParts = JSON.parse(m.parts); } catch {}
              }
              if (!parsedParts || !Array.isArray(parsedParts) || parsedParts.length === 0) {
                parsedParts = [{ type: 'text', text: m.content || '' }];
              }
              return {
                id: m.id,
                role: m.role,
                content: m.content,
                parts: parsedParts,
                createdAt: m.createdAt,
              };
            }),
          });
        }

        if (req.method === 'POST') {
          // Créer ou mettre à jour une conversation
          const conv = conversationStore.createConversation(ctx.userId!, convId, body.title);
          if (Array.isArray(body.messages) && body.messages.length > 0) {
            conversationStore.syncMessages(ctx.userId!, convId, body.title, body.messages);
          }
          return this.sendJson(res, 200, { conversation: conv });
        }

        if (req.method === 'PUT') {
          // Renommer
          conversationStore.updateConversationTitle(ctx.userId!, convId, body.title || 'Sans titre');
          return this.sendJson(res, 200, { success: true });
        }

        if (req.method === 'DELETE') {
          conversationStore.deleteConversation(ctx.userId!, convId);
          return this.sendJson(res, 200, { success: true });
        }
      }

      // Synchroniser tous les messages d'une conversation (atomique, sans doublons)
      const syncMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/sync$/);
      if (syncMatch && req.method === 'POST') {
        const body = await this.parseBody(req);
        const ctx = await this.authenticate(req, res, body);
        if (!ctx) return;
        const convId = syncMatch[1];
        conversationStore.syncMessages(ctx.userId!, convId, body.title, body.messages);
        return this.sendJson(res, 200, { success: true });
      }

      // Ajouter un message à une conversation
      const msgMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
      if (msgMatch && req.method === 'POST') {
        const body = await this.parseBody(req);
        const ctx = await this.authenticate(req, res, body);
        if (!ctx) return;
        const convId = msgMatch[1];
        // S'assure que la conversation existe
        if (!conversationStore.getConversation(ctx.userId!, convId)) {
          conversationStore.createConversation(ctx.userId!, convId, body.title || 'Discussion');
        }
        conversationStore.addMessage(convId, body.role || 'user', body.content || '', body.parts);
        conversationStore.touchConversation(ctx.userId!, convId);
        return this.sendJson(res, 200, { success: true });
      }

      // Modèle sélectionné par l'utilisateur (persisté server-side, pas localStorage)
      if (pathname === '/api/user/model') {
        const body = await this.parseBody(req);
        const ctx = await this.authenticate(req, res, body);
        if (!ctx) return;
        if (req.method === 'GET') {
          return this.sendJson(res, 200, { model: conversationStore.getUserModel(ctx.userId!) });
        }
        if (req.method === 'POST') {
          conversationStore.setUserModel(ctx.userId!, body.model || '');
          return this.sendJson(res, 200, { success: true });
        }
      }

      // 3. Endpoint Chat (Streaming SSE ou JSON synchrone)
      if (req.method === 'POST' && (pathname === '/api/chat' || pathname === '/api/chat/stream')) {
        const body = await this.parseBody(req);
        const context = await this.authenticate(req, res, body);
        if (!context) return;
        if (this.isRateLimited(context.userId || 'anonymous')) {
          return this.sendJson(res, 429, { error: 'Trop de requêtes. Merci de patienter avant de continuer.' });
        }

        this.totalRequests++;
        const messages = body.messages || [];
        if (!Array.isArray(messages) || messages.length === 0) {
          return this.sendJson(res, 400, { error: 'Le champ "messages" (tableau non vide) est requis.' });
        }

        const tools = this.toolRegistry.getTools(context);
        // P3 : si aucun modèle n'est spécifié par le client, on utilise le modèle
        // primaire configuré pour le dashboard admin, puis le modèle actif global.
        let modelId = body.modelId || body.model;
        if (!modelId) {
          const rawSettings = configStore.getRawSettings();
          modelId = rawSettings.dashboardPrimaryModel || rawSettings.activeModel;
        }
        const model = modelGateway.getModel(modelId);
        const temperature = typeof body.temperature === 'number' ? body.temperature : 0.2;

        // P2-2 : on conserve l'historique structuré (tool-call / tool-result compris) au lieu
        // de l'aplatir en chaîne JSON. Le client (useChat/@ai-sdk/react) envoie des UIMessage[]
        // avec des `parts` ; on les convertit vers le format ModelMessage attendu par le modèle.
        // Repli sur un simple mapping role/content pour les appels API directs (non-UI).
        const looksLikeUIMessages = messages.every((m: any) => Array.isArray(m.parts));
        const modelMessages = looksLikeUIMessages
          ? await convertToModelMessages(messages as UIMessage[])
          : messages.map((m: any) => ({
              role: m.role,
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
            }));

        const isStreaming =
          pathname === '/api/chat/stream' ||
          body.stream === true ||
          (req.headers['accept'] && req.headers['accept'].includes('text/event-stream'));

        if (isStreaming) {
          // SSE Streaming via Vercel AI SDK v6 (UI Message Stream protocol)
          const result = streamText({
            model,
            system: SUPER_ADMIN_SYSTEM_PROMPT,
            messages: modelMessages,
            temperature,
            tools,
            maxOutputTokens: getMaxOutputTokens(),
            stopWhen: stepCountIs(5),
            experimental_toolApprovalSecret: getToolApprovalSecret(),
            onError: ({ error }: any) => {
              // P0-6 : une erreur ne doit jamais interrompre silencieusement le flux. Les
              // erreurs d'outils sont déjà renvoyées comme `tool-error` par l'AI SDK ; celles-ci
              // sont les erreurs "hors outil" (modèle, réseau) qui coupent le stream complet.
              log.error('Erreur de streaming', { pathname, error: String(error) });
            },
          });

          // P4-4 : en-têtes SSE anti-buffering pour que nginx-proxy (et tout proxy
          // intermédiaire) flush chaque chunk immédiatement au lieu d'accumuler →
          // streaming fluide mot-à-mot comme ChatGPT.
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');

          // Pipe le flux "UI Message Stream" (parts text/tool-call/tool-result/error)
          // directement vers la réponse Node.js http. Les erreurs sont transformées en
          // message lisible plutôt que de couper la connexion.
          return result.pipeUIMessageStreamToResponse(res, {
            onError: (error: unknown) => {
              const message = error instanceof Error ? error.message : 'Erreur inconnue du modèle IA.';
              return `Ahizan AI a rencontré une erreur : ${message}`;
            },
          });
        } else {
          // Synchronous non-streaming generation
          const result = await generateText({
            model,
            system: SUPER_ADMIN_SYSTEM_PROMPT,
            messages: modelMessages,
            temperature,
            tools,
            maxOutputTokens: getMaxOutputTokens(),
            stopWhen: stepCountIs(5),
            experimental_toolApprovalSecret: getToolApprovalSecret(),
          });

          return this.sendJson(res, 200, {
            text: result.text,
            toolCalls: result.toolCalls?.map(tc => ({
              id: (tc as any).toolCallId || tc.toolName,
              name: tc.toolName,
              arguments: (tc as any).input,
            })),
            usage: result.usage,
            totalUsage: result.totalUsage,
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

        const context = await this.authenticate(req, res, body);
        if (!context) return;
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

        const context = await this.authenticate(req, res, body);
        if (!context) return;
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

        const context = await this.authenticate(req, res, body);
        if (!context) return;
        const analysis = await this.approvalWorkflow.analyze(productId, context);

        return this.sendJson(res, 200, analysis.duplicateMatch);
      }

      // Route 404
      return this.sendJson(res, 404, { error: `Endpoint "${pathname}" non trouvé.` });
    } catch (err: any) {
      log.error('Erreur non gérée sur route', { pathname, error: err.message, stack: err.stack });
      return this.sendJson(res, 500, { error: err.message || 'Erreur interne du serveur Ahizan AI' });
    }
  }

  start(): Promise<void> {
    return new Promise(resolve => {
      this.server.listen(this.port, this.host, () => {
        log.info('Ahizan AI Service démarré', { host: this.host, port: this.port });
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
