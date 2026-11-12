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
