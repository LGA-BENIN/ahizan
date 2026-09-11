import * as fs from 'fs';
import * as path from 'path';
import { AhizanAIServer } from './api/server';
import { createLogger } from './utils/logger';

const log = createLogger('bootstrap');

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
    log.warn('Could not load .env', { error: String(e) });
  }
}

// P3-1 : diagnostic unique au démarrage (après chargement de .env) — les getters
// paresseux de server.ts liront la valeur à chaque appel, mais ce warning aide à
// détecter une configuration manquante dès le boot.
if (!process.env.AHIZAN_AI_TOOL_APPROVAL_SECRET) {
  log.warn('AHIZAN_AI_TOOL_APPROVAL_SECRET absent — outils d\'écriture désactivés');
} else {
  log.info('Secret d\'approbation des outils d\'écriture : présent');
}

const port = Number(process.env.AHIZAN_AI_PORT || process.env.PORT || 3005);
const host = process.env.AHIZAN_AI_HOST || '0.0.0.0';

const server = new AhizanAIServer({ port, host });

server.start().catch(err => {
  log.error('Fatal bootstrap error', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('SIGINT', async () => {
  log.info('Shutting down gracefully (SIGINT)');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.info('Shutting down gracefully (SIGTERM)');
  await server.stop();
  process.exit(0);
});
