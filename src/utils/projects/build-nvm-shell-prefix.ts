/**
 * Escape a value for single-quoted shell arguments.
 */
export const shellEscape = (value: string): string => value.replace(/'/g, "'\\''");

/**
 * nvm init prefix used before project dev/install commands.
 */
export const buildNvmShellPrefix = (nvmSh: string): string =>
  `export NVM_DIR="$HOME/.nvm" && [ -s '${shellEscape(nvmSh)}' ] && . '${shellEscape(nvmSh)}'`;
