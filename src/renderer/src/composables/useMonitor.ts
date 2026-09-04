import { MonitorPayload, NetworkSpeedPayload } from '../../../shared/types'

export const useMonitor = {
  /** 启动监控 */
  async start(connectionId: string) {
    await window.ofteenAPI.monitor.start(connectionId)
  },

  /** 停止监控 */
  async stop(connectionId: string) {
    await window.ofteenAPI.monitor.stop(connectionId)
  }
}
