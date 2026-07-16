import { execSync } from 'child_process';

/**
 * Open macOS Finder folder picker and return the selected absolute path.
 * Returns null when the user cancels.
 */
export const pickFolderMacos = (prompt: string): string | null => {
  if (process.platform !== 'darwin') {
    throw new Error('Folder picker is only available on macOS');
  }

  const escapedPrompt = prompt.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  try {
    const out = execSync(
      `osascript -e "POSIX path of (choose folder with prompt \\"${escapedPrompt}\\")"`,
      { encoding: 'utf8' },
    );
    const selected = out.trim().replace(/\/$/, '');
    return selected || null;
  } catch {
    return null;
  }
};
