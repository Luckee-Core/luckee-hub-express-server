const MAX_LAUNCH_PATH_LENGTH = 2000;

/**
 * Validate the `path` of a launch link (ADR 035): a relative app path such as
 * `/ticket-build-start-page?opsTicketId=…`. Returns an error message, or null when valid.
 * Rejects protocol-relative (`//host`), absolute URLs, backslashes and control characters,
 * so the launch page can only redirect within the project's own origin.
 */
export const validateLaunchPath = (path: unknown): string | null => {
  if (typeof path !== 'string' || path.length === 0) {
    return 'path is required (e.g. /dashboard)';
  }
  if (path.length > MAX_LAUNCH_PATH_LENGTH) {
    return `path must be at most ${MAX_LAUNCH_PATH_LENGTH} characters`;
  }
  if (!path.startsWith('/') || path.startsWith('//')) {
    return 'path must start with a single "/"';
  }
  if (path.includes('\\')) {
    return 'path must not contain backslashes';
  }
  if (/[\u0000-\u001f\u007f]/.test(path)) {
    return 'path must not contain control characters';
  }
  return null;
};
