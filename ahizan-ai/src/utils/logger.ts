/**
 * P5-4 : Logger structuré léger pour Ahizan AI Service.
 * Émet des lignes JSON parsables par un collecteur de logs (Docker, Loki, etc.)
 * avec horodatage ISO, niveau, module, et champs contextuels optionnels.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel: LogLevel = (process.env.AHIZAN_AI_LOG_LEVEL as LogLevel) || 'info';

function emit(level: LogLevel, module: string, message: string, fields?: Record<string, any>) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel]) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    module,
    message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export function createLogger(module: string) {
  return {
    debug: (msg: string, fields?: Record<string, any>) => emit('debug', module, msg, fields),
    info: (msg: string, fields?: Record<string, any>) => emit('info', module, msg, fields),
    warn: (msg: string, fields?: Record<string, any>) => emit('warn', module, msg, fields),
    error: (msg: string, fields?: Record<string, any>) => emit('error', module, msg, fields),
  };
}
