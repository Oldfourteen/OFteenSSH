export interface MonitorState {
  connectionId: string
  intervalId: ReturnType<typeof setInterval> | null
  networkIntervalId: ReturnType<typeof setInterval> | null
  lastNetworkStats: Map<string, { rxBytes: number; txBytes: number; timestamp: number }>
  systemInfoCollected: boolean
}
