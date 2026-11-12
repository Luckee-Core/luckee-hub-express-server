const SECRET_NAME_PATTERN = /_(SECRET|KEY|TOKEN|PASSWORD|PAT)$/i;

const URL_WITH_CREDENTIALS = /^[a-z][a-z0-9+.-]*:\/\/[^/\s]+:[^@\s]+@/i;

/**
 * Whether an env key or value should never be returned to the browser.
 */
export const isSecretEnvEntry = (key: string, value: string | null | undefined): boolean => {
  if (SECRET_NAME_PATTERN.test(key)) {
    return true;
  }
  if (value && URL_WITH_CREDENTIALS.test(value.trim())) {
    return true;
  }
  return false;
};
