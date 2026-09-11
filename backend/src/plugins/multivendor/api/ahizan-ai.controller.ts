import { Controller, Get, Post, Put, Delete, Param, Body, Req, Res, HttpStatus, All } from '@nestjs/common';
import type { Request, Response } from 'express';

const AI_SERVICE_HOSTS = [
    process.env.AHIZAN_AI_SERVICE_URL,
    'http://ahizan_ai:3005',
    'http://172.17.0.1:3005',
    'http://127.0.0.1:3005',
    'http://localhost:3005'
].filter(Boolean) as string[];

/**
 * Récupère le token d'authentification Vendure depuis la requête entrante
 * (header vendure-auth-token, Authorization Bearer, ou cookie session) pour
 * le transmettre au microservice AI qui valide l'identité côté Vendure.
 */
function extractAuthToken(req: Request): string | undefined {
    const headerToken = req.headers['vendure-auth-token'] as string | undefined;
    const authHeader = req.headers['authorization'] as string | undefined;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const cookie = req.headers['cookie'] || '';
    const sessionMatch = cookie.match(/session=([^;]+)/);
    return headerToken || bearer || (sessionMatch ? sessionMatch[1] : undefined);
}

async function forwardToAIService(
    endpoint: string,
    method: string,
    body: any,
    authToken?: string
): Promise<{ status: number; json: any }> {
    let lastError: any = null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['vendure-auth-token'] = authToken;

    for (const base of AI_SERVICE_HOSTS) {
        try {
            const url = `${base}${endpoint}`;
            const res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined
            });
            const json = await res.json();
            return { status: res.status, json };
        } catch (e: any) {
            lastError = e;
        }
    }
    throw lastError || new Error('Ahizan AI service unavailable');
}

/**
 * Pipe une réponse streaming (SSE) du microservice AI vers le client dashboard.
 * Utilisé pour /chat/stream afin de préserver le streaming mot-à-mot.
 */
async function pipeStream(
    endpoint: string,
    method: string,
    req: Request,
    res: Response,
    body: any
): Promise<void> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
    };
    const authToken = extractAuthToken(req);
    if (authToken) headers['vendure-auth-token'] = authToken;

    for (const base of AI_SERVICE_HOSTS) {
        try {
            const url = `${base}${endpoint}`;
            const upstream = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!upstream.ok || !upstream.body) {
                continue;
            }
            // SSE : désactiver le buffering et propager les bons en-têtes
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            res.status(HttpStatus.OK);
            // Pipe le flux chunk par chunk
            const reader = (upstream.body as any).getReader();
            const decoder = new TextDecoder();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(Buffer.from(value));
                }
            } finally {
                reader.releaseLock?.();
            }
            res.end();
            return;
        } catch {
            // essayer l'hôte suivant
        }
    }
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ error: 'Ahizan AI streaming unavailable' });
}

@Controller('ahizan-ai-api')
export class AhizanAIProxyController {
    @Get('health')
    async getHealth(@Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService('/api/health', 'GET', undefined, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
                status: 'error',
                message: err.message || 'AI service unavailable'
            });
        }
    }

    @Get('models')
    async getModels(@Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService('/api/models', 'GET', undefined, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
                error: err.message || 'Models unavailable'
            });
        }
    }

    @Post('chat')
    async chat(@Body() payload: any, @Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService('/api/chat', 'POST', payload, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Chat query failed'
            });
        }
    }

    @Post('chat/stream')
    async chatStream(@Body() payload: any, @Req() req: Request, @Res() res: Response) {
        return pipeStream('/api/chat/stream', 'POST', req, res, payload);
    }

    @Get('settings/models')
    async getSettingsModels(@Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService('/api/settings/models', 'GET', undefined, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Settings unavailable'
            });
        }
    }

    @Get('config/dashboard-model')
    async getDashboardModelConfig(@Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService('/api/config/dashboard-model', 'GET', undefined, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Config unavailable'
            });
        }
    }

    @Post('config/dashboard-model')
    async setDashboardModelConfig(@Body() payload: any, @Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService('/api/config/dashboard-model', 'POST', payload, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Config update failed'
            });
        }
    }

    @Post('products/analyze')
    async analyzeProduct(@Body() payload: any, @Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService('/api/products/analyze', 'POST', payload, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Product analysis failed'
            });
        }
    }

    @Post('products/suggest-official')
    async suggestOfficial(@Body() payload: any, @Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService('/api/products/suggest-official', 'POST', payload, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Suggest official failed'
            });
        }
    }

    @Post('products/detect-duplicates')
    async detectDuplicates(@Body() payload: any, @Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService('/api/products/detect-duplicates', 'POST', payload, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Duplicate detection failed'
            });
        }
    }

    @Get('conversations')
    async getConversations(@Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService('/api/conversations', 'GET', undefined, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Conversations unavailable'
            });
        }
    }

    @Get('conversations/:id')
    async getConversationById(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService(`/api/conversations/${id}`, 'GET', undefined, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Conversation unavailable'
            });
        }
    }

    @Post('conversations/:id/sync')
    async syncConversation(@Param('id') id: string, @Body() payload: any, @Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService(`/api/conversations/${id}/sync`, 'POST', payload, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Sync failed'
            });
        }
    }

    @Delete('conversations/:id')
    async deleteConversation(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService(`/api/conversations/${id}`, 'DELETE', undefined, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Delete failed'
            });
        }
    }

    @Put('conversations/:id')
    async updateConversationTitle(@Param('id') id: string, @Body() payload: any, @Req() req: Request, @Res() res: Response) {
        try {
            const authToken = extractAuthToken(req);
            const { status, json } = await forwardToAIService(`/api/conversations/${id}`, 'PUT', payload, authToken);
            return res.status(status).json(json);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Update failed'
            });
        }
    }
}
