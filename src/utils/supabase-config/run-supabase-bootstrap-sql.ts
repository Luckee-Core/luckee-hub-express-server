import { runShellCommand } from '../local-database/run-shell-command';
import { withPostgresSslMode } from './with-postgres-ssl-mode';

/**
 * Whether all expected public tables exist on the DATABASE_URL target.
 * Single psql round-trip with a short timeout so probes stay snappy.
 */
export const supabaseExpectedTablesExist = (
  databaseUrl: string,
  expectedTables: string[],
): boolean => {
  if (expectedTables.length === 0) {
    return false;
  }
  for (const table of expectedTables) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      return false;
    }
  }

  const url = withPostgresSslMode(databaseUrl);
  const list = expectedTables.map((table) => `'${table}'`).join(',');
  try {
    const out = runShellCommand(
      `psql "${url}" -tAc "SELECT COUNT(*)::text FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (${list})"`,
      { timeoutMs: 8_000 },
    );
    return out === String(expectedTables.length);
  } catch {
    return false;
  }
};

/**
 * Apply a bootstrap SQL file against DATABASE_URL via psql.
 */
export const runSupabaseBootstrapSql = (
  databaseUrl: string,
  bootstrapSqlPath: string,
  cwd: string,
): void => {
  const url = withPostgresSslMode(databaseUrl);
  runShellCommand(`psql "${url}" -v ON_ERROR_STOP=1 -f "${bootstrapSqlPath}"`, {
    cwd,
    timeoutMs: 120_000,
  });
};
