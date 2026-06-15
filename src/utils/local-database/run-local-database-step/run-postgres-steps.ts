import type { LocalDatabaseConfig } from '../../../services/local-database/types';
import { getPostgresConnection } from '../get-postgres-connection';
import { isConfiguredPostgresInstalled, getPostgresFormula } from '../postgres-brew';
import { clearPostgresStartedByHub } from '../postgres-hub-session';
import { isPostgresRunning, waitForPostgres } from '../postgres-probes';
import { runShellCommand } from '../run-shell-command';

const BREW_ENV = {
  HOMEBREW_NO_AUTO_UPDATE: '1',
  HOMEBREW_NO_INSTALL_CLEANUP: '1',
} as const;

const INSTALL_TIMEOUT_MS = 10 * 60 * 1000;
const START_TIMEOUT_MS = 60 * 1000;
const STOP_TIMEOUT_MS = 60 * 1000;

/**
 * Run the registry-configured Postgres install command.
 */
export const runPostgresInstallStep = (localDatabase: LocalDatabaseConfig): string => {
  const installCommand = localDatabase.postgres?.installCommand;
  if (!installCommand) {
    throw new Error('Postgres install command is not configured');
  }

  const formula = getPostgresFormula(localDatabase.postgres);
  if (formula && isConfiguredPostgresInstalled(localDatabase.postgres)) {
    return `Postgres formula "${formula}" is already installed — use Start Postgres next`;
  }

  console.log('💾 [runPostgresInstallStep] Running install command', { installCommand });
  runShellCommand(installCommand, {
    env: BREW_ENV,
    timeoutMs: INSTALL_TIMEOUT_MS,
    inheritOutput: true,
  });
  console.log('✅ [runPostgresInstallStep] Install command finished');
  return 'Postgres install command completed';
};

/**
 * Run the registry-configured Postgres start command and wait for readiness.
 */
export const runPostgresStartStep = (localDatabase: LocalDatabaseConfig): string => {
  const startCommand = localDatabase.postgres?.startCommand;
  if (!startCommand) {
    throw new Error('Postgres start command is not configured');
  }

  const connection = getPostgresConnection(localDatabase);
  console.log('💾 [runPostgresStartStep] Running start command', { startCommand });
  runShellCommand(startCommand, {
    env: BREW_ENV,
    timeoutMs: START_TIMEOUT_MS,
  });
  console.log('🔍 [runPostgresStartStep] Waiting for Postgres to accept connections');
  const ready = waitForPostgres(connection);
  if (!ready) {
    throw new Error(`Postgres did not become ready on ${connection.host}:${connection.port}`);
  }
  console.log('✅ [runPostgresStartStep] Postgres is ready');
  return `Postgres is running on ${connection.host}:${connection.port}`;
};

/**
 * Run the registry-configured Postgres stop command.
 */
export const runPostgresStopStep = (
  projectId: string,
  localDatabase: LocalDatabaseConfig,
): string => {
  const stopCommand = localDatabase.postgres?.stopCommand;
  if (!stopCommand) {
    throw new Error('Postgres stop command is not configured');
  }

  const connection = getPostgresConnection(localDatabase);
  console.log('💾 [runPostgresStopStep] Running stop command', { stopCommand, projectId });
  runShellCommand(stopCommand, {
    env: BREW_ENV,
    timeoutMs: STOP_TIMEOUT_MS,
  });

  if (isPostgresRunning(connection)) {
    throw new Error(`Postgres is still running on ${connection.host}:${connection.port}`);
  }

  clearPostgresStartedByHub(projectId);
  console.log('✅ [runPostgresStopStep] Postgres stopped');
  return `Postgres stopped on ${connection.host}:${connection.port}`;
};
