import fs from 'fs';
import path from 'path';

/**
 * Read DATABASE_URL from express .env if present.
 */
export const readEnvDatabaseUrl = (expressDir: string): string | null => {
  const envPath = path.join(expressDir, '.env');
  if (!fs.existsSync(envPath)) {
    return null;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^DATABASE_URL=(.+)$/m);
  return match?.[1]?.trim() ?? null;
};

/**
 * Check whether express .env DATABASE_URL points at the expected database.
 */
export const envConfigured = (expressDir: string, databaseName: string): boolean => {
  const url = readEnvDatabaseUrl(expressDir);
  if (!url) {
    return false;
  }
  return url.includes(`/${databaseName}`);
};

/**
 * Upsert DATABASE_URL in express .env without removing other keys.
 */
export const upsertDatabaseUrlInEnv = (expressDir: string, databaseUrl: string): void => {
  const envPath = path.join(expressDir, '.env');
  const line = `DATABASE_URL=${databaseUrl}`;
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, `${line}\n`);
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  if (/^DATABASE_URL=/m.test(content)) {
    const updated = content.replace(/^DATABASE_URL=.*$/m, line);
    fs.writeFileSync(envPath, updated.endsWith('\n') ? updated : `${updated}\n`);
    return;
  }
  fs.writeFileSync(envPath, `${content.trimEnd()}\n${line}\n`);
};
