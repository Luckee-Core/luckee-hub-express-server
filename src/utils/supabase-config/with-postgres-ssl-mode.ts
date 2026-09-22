/**
 * Ensure a Postgres URL asks for SSL (required for Supabase direct connections).
 */
export const withPostgresSslMode = (databaseUrl: string): string => {
  const trimmed = databaseUrl.trim();
  if (!trimmed || /[?&]sslmode=/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed.includes('?') ? `${trimmed}&sslmode=require` : `${trimmed}?sslmode=require`;
};
