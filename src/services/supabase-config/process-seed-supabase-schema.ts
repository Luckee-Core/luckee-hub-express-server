import fs from 'fs';
import path from 'path';

import {
  getHubRoot,
  readEnvKey,
  resolveProjectForSupabase,
  runSupabaseBootstrapSql,
  sanitizePsqlErrorMessage,
  supabaseExpectedTablesExist,
} from '../../utils/supabase-config';
import type { SupabaseSchemaSeedResult } from './types';

type SeedResult = SupabaseSchemaSeedResult | { error: string; status: 400 | 500 };

/**
 * Apply registry bootstrapSql to the project's Supabase DB via DATABASE_URL + psql.
 *
 * Always runs the file (CREATE IF NOT EXISTS + seed INSERTs with ON CONFLICT).
 * Skipping when tables exist left seed data (e.g. lead_categories) unapplied after a wipe.
 */
export const processSeedSupabaseSchema = (projectId: string): SeedResult => {
  console.log('🚀 [supabase-config.processSeedSupabaseSchema] Starting schema seed', {
    projectId,
  });

  const resolved = resolveProjectForSupabase(projectId, getHubRoot());
  if (!resolved) {
    return { error: 'Supabase is not configured for this project', status: 400 };
  }

  const expressDir = resolved.merged.expressDir!;
  const databaseUrl = readEnvKey(expressDir, 'DATABASE_URL');
  if (!databaseUrl) {
    return {
      error: 'DATABASE_URL is missing — save Supabase config first',
      status: 400,
    };
  }

  const bootstrapRelative = resolved.supabase.bootstrapSql;
  const bootstrapSqlPath = path.join(expressDir, bootstrapRelative);
  const expectedTables = resolved.supabase.expectedTables;
  const relativeBootstrap = `${path.basename(expressDir)}/${bootstrapRelative}`;

  if (!fs.existsSync(bootstrapSqlPath)) {
    return {
      error: `Bootstrap SQL not found: ${relativeBootstrap}`,
      status: 400,
    };
  }

  const tablesAlreadyPresent = supabaseExpectedTablesExist(databaseUrl, expectedTables);
  console.log('🚀 [supabase-config.processSeedSupabaseSchema] Applying bootstrap', {
    projectId,
    expectedTables,
    tablesAlreadyPresent,
  });

  try {
    runSupabaseBootstrapSql(databaseUrl, bootstrapSqlPath, expressDir);
  } catch (error: unknown) {
    const raw = error instanceof Error ? error.message : 'psql bootstrap failed';
    const message = sanitizePsqlErrorMessage(raw);
    console.error('❌ [supabase-config.processSeedSupabaseSchema] psql failed', {
      projectId,
      message,
    });
    // Do NOT treat partial apply as success — remaining tables may still be missing.
    return { error: message, status: 500 };
  }

  const schemaReady = supabaseExpectedTablesExist(databaseUrl, expectedTables);

  console.log('✅ [supabase-config.processSeedSupabaseSchema] Schema seed complete', {
    projectId,
    schemaReady,
    expectedTables,
  });

  return {
    success: true,
    schemaReady,
    bootstrapSql: relativeBootstrap,
    expectedTables,
    message: schemaReady
      ? `Applied ${bootstrapRelative} — expected tables are present`
      : `Applied ${bootstrapRelative} — still missing some expected tables (${expectedTables.join(', ')})`,
  };
};
