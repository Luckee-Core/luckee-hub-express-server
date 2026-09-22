import fs from 'fs';
import path from 'path';

/**
 * Read a single KEY=value from express .env (unquoted value).
 */
export const readEnvKey = (expressDir: string, key: string): string | null => {
  const envPath = path.join(expressDir, '.env');
  if (!fs.existsSync(envPath)) {
    return null;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`^${escaped}=(.*)$`, 'm'));
  if (!match) {
    return null;
  }
  return match[1].trim().replace(/^["']|["']$/g, '') || null;
};

/**
 * Whether express .env has a non-empty value for the key.
 */
export const envKeyPresent = (expressDir: string, key: string): boolean => {
  const value = readEnvKey(expressDir, key);
  return !!value;
};

/**
 * Upsert multiple KEY=value lines in express .env without removing other keys.
 */
export const upsertEnvKeys = (
  expressDir: string,
  keys: Record<string, string>,
): string => {
  const envPath = path.join(expressDir, '.env');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  for (const [key, value] of Object.entries(keys)) {
    const line = `${key}=${value}`;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escaped}=.*$`, 'm');
    if (pattern.test(content)) {
      content = content.replace(pattern, line);
    } else {
      content = content.trimEnd() ? `${content.trimEnd()}\n${line}\n` : `${line}\n`;
    }
  }

  if (!content.endsWith('\n')) {
    content = `${content}\n`;
  }
  fs.writeFileSync(envPath, content);
  return envPath;
};
