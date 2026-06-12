import fs from 'fs';
import path from 'path';

/**
 * node-pty ships spawn-helper without execute bit on some installs; posix_spawnp fails until chmod +x.
 */
export const ensureSpawnHelperExecutable = (): void => {
  const helperPath = path.join(
    __dirname,
    '../../../node_modules/node-pty/prebuilds',
    `${process.platform}-${process.arch}`,
    'spawn-helper',
  );

  if (!fs.existsSync(helperPath)) {
    console.warn(`⚠️ node-pty spawn-helper not found at ${helperPath}`);
    return;
  }

  try {
    fs.chmodSync(helperPath, 0o755);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ Could not chmod spawn-helper: ${message}`);
  }
};
