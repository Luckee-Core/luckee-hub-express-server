import { execSync } from 'child_process';

const PROBE_CURL_MAX_SECONDS = 0.5;

/**
 * True when something is listening on the TCP port.
 */
export const portListening = (port: number): boolean => {
  try {
    execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const curlProbe = (args: string): string | null => {
  try {
    return execSync(`curl -fsS --max-time ${PROBE_CURL_MAX_SECONDS} ${args} 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 1000,
    });
  } catch {
    return null;
  }
};

/**
 * True when Express health responds on the configured API port.
 */
export const isExpressHealthOk = (apiPort: number, healthPath: string): boolean => {
  if (!portListening(apiPort)) {
    return false;
  }
  const url = `http://127.0.0.1:${apiPort}${healthPath}`;
  const out = curlProbe(`"${url}"`);
  if (out && out.includes('"status"') && out.includes('"ok"')) {
    return true;
  }
  return curlProbe(`-o /dev/null "${url}"`) !== null;
};

/**
 * True when Next.js dev server responds on the port.
 */
export const isNextDevServerOnPort = (port: number): boolean => {
  if (!portListening(port)) {
    return false;
  }
  const out = curlProbe(`-I "http://127.0.0.1:${port}"`);
  return !!out && out.toLowerCase().includes('x-powered-by: next.js');
};

/**
 * Find Next.js URL — defaults to a single configured port for fast list probes.
 */
export const findWebUrlOnPorts = (
  webPortStart: number,
  scanMax = 1,
): string | undefined => {
  for (let port = webPortStart; port < webPortStart + scanMax; port += 1) {
    if (isNextDevServerOnPort(port)) {
      return `http://localhost:${port}`;
    }
  }
  return undefined;
};
