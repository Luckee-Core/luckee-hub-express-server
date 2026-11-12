import type { DataPlaneConfig } from '../../services/projects/types';
import type { ParsedEnvExampleSection } from './parse-env-example';
import { readEnvKey } from '../supabase-config/upsert-env-keys';

const keysForInactiveOptions = (
  dataPlane: DataPlaneConfig,
  activeOptionId: string | null,
): Set<string> => {
  const inactive = dataPlane.options.filter((o) => o.id !== activeOptionId);
  const keys = new Set<string>();
  for (const option of inactive) {
    for (const key of option.keys) {
      keys.add(key);
    }
  }
  keys.add(dataPlane.modeKey);
  return keys;
};

/**
 * Hide sections whose keys are entirely owned by inactive data-plane options.
 */
export const filterSectionsByDataPlane = (
  sections: ParsedEnvExampleSection[],
  dataPlane: DataPlaneConfig | undefined,
  expressDir: string | undefined,
): ParsedEnvExampleSection[] => {
  if (!dataPlane || !expressDir) {
    return sections;
  }

  const modeValue = readEnvKey(expressDir, dataPlane.modeKey)?.toLowerCase() ?? null;
  const active =
    dataPlane.options.find((o) => o.value.toLowerCase() === modeValue)?.id ?? null;
  const inactiveKeys = keysForInactiveOptions(dataPlane, active);

  return sections.filter((section) => {
    if (section.keys.length === 0) {
      return true;
    }
    return section.keys.some((k) => !inactiveKeys.has(k.key));
  });
};
