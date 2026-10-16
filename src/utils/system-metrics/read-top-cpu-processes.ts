import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { SystemMetricsTopProcess } from '../../services/system-metrics/types';

const execFileAsync = promisify(execFile);

const clampCpuPercent = (value: number): number => Math.min(100, Math.max(0, value));

/**
 * Read top CPU-consuming processes via macOS ps (no shell).
 */
export const readTopCpuProcesses = async (limit = 3): Promise<SystemMetricsTopProcess[]> => {
  try {
    const { stdout } = await execFileAsync('ps', ['-Ao', 'pid,comm,%cpu', '-r', '-c'], {
      maxBuffer: 64 * 1024,
    });

    const lines = stdout.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    const processes: SystemMetricsTopProcess[] = [];

    for (let i = 1; i < lines.length && processes.length < limit; i += 1) {
      const line = lines[i]?.trim();
      if (!line) {
        continue;
      }

      const match = line.match(/^(\d+)\s+(\S+)\s+([\d.]+)/);
      if (!match) {
        continue;
      }

      const pid = Number.parseInt(match[1], 10);
      const name = match[2];
      const cpuPercent = Number.parseFloat(match[3]);

      if (!Number.isFinite(pid) || !Number.isFinite(cpuPercent) || !name) {
        continue;
      }

      processes.push({
        pid,
        name,
        cpuPercent: clampCpuPercent(cpuPercent),
      });
    }

    return processes;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ [system-metrics.readTopCpuProcesses] ps failed', { message });
    return [];
  }
};
