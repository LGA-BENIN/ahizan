import * as fs from 'fs';
import * as path from 'path';
import { AhizanAIServer } from './api/server';

// Load .env automatically if present
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...vals] = trimmed.split('=');
        const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
        if (key.trim() && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  } catch (e) {
    console.warn('[AhizanAI] Could not load .env:', e);
  }
}

const port = Number(process.env.AHIZAN_AI_PORT || process.env.PORT || 3005);
const host = process.env.AHIZAN_AI_HOST || '0.0.0.0';

const server = new AhizanAIServer({ port, host });

server.start().catch(err => {
  console.error('[AhizanAI] Fatal bootstrap error:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('[AhizanAI] Shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[AhizanAI] Shutting down gracefully...');
  await server.stop();
  process.exit(0);
});
