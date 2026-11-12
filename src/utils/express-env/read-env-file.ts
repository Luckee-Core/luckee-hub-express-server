import fs from 'fs';
import path from 'path';

/**
 * Read all KEY=value pairs from a `.env` file (unquoted values).
 */
export const readEnvFile = (dir: string): Record<string, string> => {
  const envPath = path.join(dir, '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const out: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    if (value) {
      out[match[1]] = value;
    }
  }
  return out;
};
