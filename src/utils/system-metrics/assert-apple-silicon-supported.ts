import { isSupported } from 'apple-silicon-metrics';

const UNSUPPORTED_MESSAGE =
  'System metrics require macOS on Apple Silicon (darwin-arm64).';

/**
 * Throws when the host cannot run apple-silicon-metrics.
 */
export const assertAppleSiliconSupported = (): void => {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    throw new Error(UNSUPPORTED_MESSAGE);
  }
  if (!isSupported()) {
    throw new Error(UNSUPPORTED_MESSAGE);
  }
};

export const isUnsupportedPlatformError = (message: string): boolean =>
  message === UNSUPPORTED_MESSAGE;
