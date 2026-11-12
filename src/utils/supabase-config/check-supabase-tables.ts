export type SupabaseTablesCheck =
  | { ok: true; missingTables: string[] }
  | { ok: false; error: string };

const TABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Check which expected tables exist through the Supabase REST API (PostgREST) using the
 * service role key — no database password or DATABASE_URL needed. A table counts as present
 * when `GET /rest/v1/{table}?limit=0` returns 2xx.
 */
export const checkSupabaseTables = async (
  supabaseUrl: string,
  serviceKey: string,
  expectedTables: string[],
): Promise<SupabaseTablesCheck> => {
  const base = supabaseUrl.trim().replace(/\/+$/, '');
  const missingTables: string[] = [];

  for (const table of expectedTables) {
    if (!TABLE_NAME.test(table)) {
      return { ok: false, error: `Invalid table name in registry: ${table}` };
    }

    let res: Response;
    try {
      res = await fetch(`${base}/rest/v1/${table}?select=*&limit=0`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        signal: AbortSignal.timeout(8000),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'request failed';
      return { ok: false, error: `Could not reach Supabase (${message})` };
    }

    if (res.ok) {
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Supabase rejected the service key — check SUPABASE_SERVICE_ROLE_KEY' };
    }
    // PostgREST answers 404 (PGRST205 / 42P01) when the table is not in the exposed schema.
    if (res.status === 404 || res.status === 400) {
      missingTables.push(table);
      continue;
    }
    return { ok: false, error: `Supabase returned ${res.status} while checking ${table}` };
  }

  return { ok: true, missingTables };
};
