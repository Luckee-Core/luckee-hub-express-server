export type SupabaseConfig = {
  /** Path relative to expressDir for one-shot schema bootstrap. */
  bootstrapSql: string;
  expectedTables: string[];
  envKeys: string[];
};

export type SupabaseProbe = {
  supported: boolean;
  expressEnvPath?: string;
  bootstrapSql?: string;
  expectedTables?: string[];
  hasSupabaseUrl: boolean;
  hasServiceKey: boolean;
  hasDatabaseUrl: boolean;
  configured: boolean;
  /** True when expectedTables exist on DATABASE_URL (remote check). */
  schemaReady: boolean;
  message?: string;
};

export type SupabaseConfigSaveInput = {
  supabaseUrl: string;
  serviceKey: string;
  databasePassword: string;
};

export type SupabaseConfigSaveResult = {
  success: boolean;
  message: string;
  expressEnvPath: string;
};

export type SupabaseSchemaSeedResult = {
  success: boolean;
  schemaReady: boolean;
  bootstrapSql: string;
  expectedTables: string[];
  message: string;
};
