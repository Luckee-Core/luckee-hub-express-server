import { assertAppleSiliconSupported } from '../../utils/system-metrics/assert-apple-silicon-supported';
import { mapAppleSiliconSample } from '../../utils/system-metrics/map-apple-silicon-sample';
import { readTopCpuProcesses } from '../../utils/system-metrics/read-top-cpu-processes';
import type { SystemMetricsSnapshot } from './types';

const SAMPLE_INTERVAL_MS = 800;

/**
 * Sample Apple Silicon CPU/GPU and read top CPU processes.
 */
export const processSampleSystemMetrics = async (): Promise<SystemMetricsSnapshot> => {
  console.log('🚀 [system-metrics.processSampleSystemMetrics] Starting sample');
  assertAppleSiliconSupported();

  const { sampleOnce } = await import('apple-silicon-metrics');

  const [sample, topProcesses] = await Promise.all([
    sampleOnce({ intervalMs: SAMPLE_INTERVAL_MS }),
    readTopCpuProcesses(3),
  ]);

  const mapped = mapAppleSiliconSample(sample);
  const snapshot: SystemMetricsSnapshot = {
    ...mapped,
    topProcesses,
    sampledAt: sample.timestamp || new Date().toISOString(),
  };

  console.log('✅ [system-metrics.processSampleSystemMetrics] Sample complete', {
    cpu: snapshot.cpu.usagePercent,
    gpu: snapshot.gpu.usagePercent,
    topCount: topProcesses.length,
  });

  return snapshot;
};
