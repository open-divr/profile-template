/**
 * Tiny structured logger for the profile. Profiles run in every viewer's browser, so only problems are
 * logged by default; nothing logged here ever describes the viewer (the profile knows nothing about them).
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold: Level = import.meta.env.DEV ? 'info' : 'warn';

export function errorFields(err: unknown): { error: string; stack?: string } {
  if (err instanceof Error) return err.stack === undefined ? { error: err.message } : { error: err.message, stack: err.stack };
  return { error: String(err) };
}

export function log(level: Level, context: string, message: string, fields: Record<string, unknown> = {}): void {
  if (RANK[level] < RANK[threshold]) return;
  const entry = { timestamp: new Date().toISOString(), level, context, message, ...fields };
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  sink(JSON.stringify(entry));
}
