import type { Metrics } from 'apple-silicon-metrics';

import type { SystemMetricsSnapshot } from '../../services/system-metrics/types';

const ratioToPercent = (ratio: number | null | undefined): number => {
  if (ratio == null || !Number.isFinite(ratio)) {
    return 0;
  }
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
};

/**
 * Map apple-silicon-metrics sample to hub snapshot CPU/GPU fields.
 */
export const mapAppleSiliconSample = (
  sample: Metrics,
): Pick<SystemMetricsSnapshot, 'cpu' | 'gpu' | 'chipName'> => ({
  cpu: {
    usagePercent: ratioToPercent(sample.cpu.usageRatio),
  },
  gpu: {
    usagePercent: ratioToPercent(sample.gpu.usageRatio),
  },
  chipName: sample.soc?.chipName,
});
