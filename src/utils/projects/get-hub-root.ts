import path from 'path';

/**
 * Resolve luckee-hub-express-server package root (where hub.local.json lives).
 */
export const getHubRoot = (): string => path.resolve(__dirname, '../../..');
