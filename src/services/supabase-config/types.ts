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
  configured: boolean;
  /** True when every expectedTable exists (checked via the Supabase REST API with the service key). */
  schemaReady: boolean;
  /** Expected tables not found — present when the table check ran. */
  missingTables?: string[];
  /** Why the table check could not run (bad key, unreachable, …). */
  schemaCheckError?: string;
  message?: string;
};

export type SupabaseConfigSaveInput = {
  supabaseUrl: string;
  serviceKey: string;
};

export type SupabaseConfigSaveResult = {
  success: boolean;
  message: string;
  expressEnvPath: string;
};
