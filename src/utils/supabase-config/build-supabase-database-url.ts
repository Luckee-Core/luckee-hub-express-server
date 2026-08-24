/**
 * Extract Supabase project ref from project URL (https://{ref}.supabase.co).
 */
export const extractSupabaseProjectRef = (supabaseUrl: string): string | null => {
  try {
    const host = new URL(supabaseUrl.trim()).hostname;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

/**
 * Build Postgres DATABASE_URL for a Supabase project (direct connection).
 */
export const buildSupabaseDatabaseUrl = (
  supabaseUrl: string,
  databasePassword: string,
): string | null => {
  const ref = extractSupabaseProjectRef(supabaseUrl);
  if (!ref || !databasePassword.trim()) {
    return null;
  }
  const encoded = encodeURIComponent(databasePassword.trim());
  return `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres?sslmode=require`;
};
