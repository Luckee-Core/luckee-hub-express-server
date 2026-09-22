/**
 * Appends a project-specific path (e.g. `/dashboard`) onto a detected origin URL.
 */
export const applyWebOpenPath = (url: string, webOpenPath?: string): string => {
  const raw = webOpenPath?.trim();
  if (!raw) {
    return url;
  }
  const pathname = raw.startsWith('/') ? raw : `/${raw}`;
  const parsed = new URL(url);
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    return url;
  }
  parsed.pathname = pathname;
  return parsed.toString();
};
