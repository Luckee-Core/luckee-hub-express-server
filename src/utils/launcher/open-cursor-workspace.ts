import { spawnSync } from 'child_process';
import fs from 'fs';

const CURSOR_FALLBACKS = [
  '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
  '/usr/local/bin/cursor',
  `${process.env.HOME ?? ''}/.local/bin/cursor`,
];

const runCursor = (binary: string, flags: string[], workspaceFile: string): boolean => {
  const result = spawnSync(binary, [...flags, workspaceFile], { stdio: 'ignore' });
  return result.status === 0;
};

/**
 * Open a Cursor workspace file on macOS.
 */
export const openCursorWorkspace = (
  workspaceFile: string,
  cursorBin: string,
  cursorOpenFlags: string,
): boolean => {
  if (!workspaceFile || !fs.existsSync(workspaceFile)) {
    return false;
  }

  const flags = cursorOpenFlags.trim().split(/\s+/).filter(Boolean);
  const candidates = [cursorBin, ...CURSOR_FALLBACKS].filter(Boolean);

  for (const candidate of candidates) {
    if (!candidate || !fs.existsSync(candidate)) {
      continue;
    }
    if (runCursor(candidate, flags, workspaceFile)) {
      return true;
    }
  }

  const openResult = spawnSync('open', ['-a', 'Cursor', '--args', ...flags, workspaceFile], {
    stdio: 'ignore',
  });
  return openResult.status === 0;
};
