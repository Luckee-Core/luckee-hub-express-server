import type { LocalDatabasePostgresConfig } from '../../services/local-database/types';
import { runShellCommandQuiet } from './run-shell-command';

const BREW_INSTALL_FORMULA_PATTERN = /brew\s+install\s+(\S+)/;

/**
 * Resolve the Homebrew formula name from registry postgres config.
 */
export const getPostgresFormula = (postgres?: LocalDatabasePostgresConfig): string | null => {
  if (postgres?.formula) {
    return postgres.formula;
  }
  if (!postgres?.installCommand) {
    return null;
  }
  const match = postgres.installCommand.match(BREW_INSTALL_FORMULA_PATTERN);
  return match?.[1] ?? null;
};

/**
 * Check whether a Homebrew formula is already installed.
 */
export const isPostgresFormulaInstalled = (formula: string): boolean => {
  const listed = runShellCommandQuiet(`brew list --formula ${formula}`);
  return listed !== null;
};

/**
 * Whether the registry-configured Postgres formula is already installed.
 */
export const isConfiguredPostgresInstalled = (postgres?: LocalDatabasePostgresConfig): boolean => {
  const formula = getPostgresFormula(postgres);
  if (!formula) {
    return false;
  }
  return isPostgresFormulaInstalled(formula);
};
