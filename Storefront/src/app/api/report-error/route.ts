import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const logLine = `[STOREFRONT_CLIENT_ERROR] [${new Date().toISOString()}] ${JSON.stringify(body, null, 2)}\n`;
        console.error(logLine);
        try {
            fs.appendFileSync('/srv/ahizan/Storefront/.last_error.log', logLine);
        } catch {}
    } catch (e: any) {
        console.error('[report-error API Error]:', e);
    }
    return NextResponse.json({ ok: true });
}
