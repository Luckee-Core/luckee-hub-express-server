/**
 * Strip DATABASE_URL / credentials from psql error text before returning to clients.
 */
export const sanitizePsqlErrorMessage = (message: string): string => {
  const withoutUrls = message.replace(/postgresql:\/\/[^\s"']+/gi, 'postgresql://***');
  const errorMatch = withoutUrls.match(/ERROR:\s*[^\n]+(?:\nCONTEXT:[^\n]+)?/i);
  if (errorMatch) {
    return errorMatch[0].replace(/\s+/g, ' ').trim();
  }
  return withoutUrls.replace(/\s+/g, ' ').trim().slice(0, 400);
};
