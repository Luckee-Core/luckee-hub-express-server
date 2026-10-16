import type { Request, Response } from 'express';

import {
  isUnsupportedPlatformError,
} from '../../../utils/system-metrics/assert-apple-silicon-supported';
import { processSampleSystemMetrics } from '../process-sample-system-metrics';

/**
 * GET /api/system-metrics — live CPU/GPU snapshot (Apple Silicon).
 */
export const getSystemMetricsHandler = async (_req: Request, res: Response) => {
  console.log('📥 [system-metrics.getSystemMetricsHandler] Request received');
  try {
    const data = await processSampleSystemMetrics();
    console.log('📤 [system-metrics.getSystemMetricsHandler] Sending response', { statusCode: 200 });
    return res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to sample system metrics';
    if (isUnsupportedPlatformError(message)) {
      console.error('❌ [system-metrics.getSystemMetricsHandler] Unsupported platform', { message });
      return res.status(400).json({ success: false, error: message });
    }
    console.error('❌ [system-metrics.getSystemMetricsHandler] Sample failed', { message });
    return res.status(500).json({ success: false, error: message });
  }
};
