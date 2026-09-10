import { Controller, Get, Post, Body, Req, Res, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

const AI_SERVICE_HOSTS = [
    process.env.AHIZAN_AI_SERVICE_URL,
    'http://172.17.0.1:3005',
    'http://127.0.0.1:3005',
    'http://localhost:3005'
].filter(Boolean) as string[];

async function forwardToAIService(endpoint: string, method: string, body?: any) {
    let lastError: any = null;
    for (const base of AI_SERVICE_HOSTS) {
        try {
            const url = `${base}${endpoint}`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined
            });
            if (res.ok) {
                return await res.json();
            }
            const errText = await res.text();
            throw new Error(`AI service [${res.status}]: ${errText}`);
        } catch (e: any) {
            lastError = e;
        }
    }
    throw lastError || new Error('Ahizan AI service unavailable');
}

@Controller('ahizan-ai-api')
export class AhizanAIProxyController {
    @Get('health')
    async getHealth(@Res() res: Response) {
        try {
            const data = await forwardToAIService('/api/health', 'GET');
            return res.status(HttpStatus.OK).json(data);
        } catch (err: any) {
            return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
                status: 'error',
                message: err.message || 'AI service unavailable'
            });
        }
    }

    @Post('chat')
    async chat(@Body() payload: any, @Res() res: Response) {
        try {
            const data = await forwardToAIService('/api/chat', 'POST', payload);
            return res.status(HttpStatus.OK).json(data);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Chat query failed'
            });
        }
    }

    @Post('products/analyze')
    async analyzeProduct(@Body() payload: any, @Res() res: Response) {
        try {
            const data = await forwardToAIService('/api/products/analyze', 'POST', payload);
            return res.status(HttpStatus.OK).json(data);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Product analysis failed'
            });
        }
    }

    @Post('products/suggest-official')
    async suggestOfficial(@Body() payload: any, @Res() res: Response) {
        try {
            const data = await forwardToAIService('/api/products/suggest-official', 'POST', payload);
            return res.status(HttpStatus.OK).json(data);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Suggest official failed'
            });
        }
    }

    @Post('products/detect-duplicates')
    async detectDuplicates(@Body() payload: any, @Res() res: Response) {
        try {
            const data = await forwardToAIService('/api/products/detect-duplicates', 'POST', payload);
            return res.status(HttpStatus.OK).json(data);
        } catch (err: any) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: err.message || 'Duplicate detection failed'
            });
        }
    }
}
