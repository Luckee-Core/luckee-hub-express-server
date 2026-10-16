export type SystemMetricsTopProcess = {
  pid: number;
  name: string;
  cpuPercent: number;
};

export type SystemMetricsCpu = {
  usagePercent: number;
};

export type SystemMetricsGpu = {
  usagePercent: number;
};

export type SystemMetricsSnapshot = {
  cpu: SystemMetricsCpu;
  gpu: SystemMetricsGpu;
  topProcesses: SystemMetricsTopProcess[];
  sampledAt: string;
  chipName?: string;
};
