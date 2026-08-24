export type ExpressEnvGroupId = 'ai' | 'google-maps' | 'email';

export type ExpressEnvGroupConfig = {
  label: string;
  keys: string[];
};

export type ExpressEnvConfig = {
  groups: Record<string, ExpressEnvGroupConfig>;
};

export type ExpressEnvGroupProbe = {
  supported: boolean;
  groupId: string;
  label?: string;
  expressEnvPath?: string;
  /** env key → present in .env (never secret values) */
  keysPresent: Record<string, boolean>;
  configured: boolean;
  message?: string;
};

export type ExpressEnvGroupSaveResult = {
  success: boolean;
  message: string;
  expressEnvPath: string;
};
