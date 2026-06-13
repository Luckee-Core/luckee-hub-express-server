import { exec } from 'child_process';

/**
 * Open a URL in Google Chrome (macOS).
 */
export const openInChrome = (url: string): void => {
  exec(`open -a "Google Chrome" "${url}"`, () => undefined);
};
