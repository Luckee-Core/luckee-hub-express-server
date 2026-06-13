const DATABASE_NAME_PATTERN = /^[a-z_][a-z0-9_]*$/;

/**
 * Validate a Postgres database name before shell interpolation.
 */
export const validateDatabaseName = (databaseName: string): boolean => {
  return DATABASE_NAME_PATTERN.test(databaseName);
};
