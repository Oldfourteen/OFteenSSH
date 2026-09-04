import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc-channels'
import { NetworkSpeedPayload, NetworkInterfaceSpeed } from '../../shared/types'
import { parseNetworkOutput } from './parser'
import { sshConnectionManager } from '../ssh/connection-manager'

interface NetworkSnapshot {
  rxBytes: number
  txBytes: number
  timestamp: number
}

class NetworkSpeedCalculator {
  private lastSnapshots: Map<string, Map<string, NetworkSnapshot>> = new Map()
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /** 采集并计算网速 */
  async calculate(connectionId: string): Promise<void> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection || !connection.isConnected) return

    try {
      const output = await connection.exec('cat /proc/net/dev', 5000)
      const interfaces = parseNetworkOutput(output)

      let lastSnapshots = this.lastSnapshots.get(connectionId)
      if (!lastSnapshots) {
        lastSnapshots = new Map()
        this.lastSnapshots.set(connectionId, lastSnapshots)
      }

      const now = Date.now()
      const speeds: NetworkInterfaceSpeed[] = []

      for (const iface of interfaces) {
        const last = lastSnapshots.get(iface.name)
        if (last) {
          const timeDiff = (now - last.timestamp) / 1000 // 秒
          if (timeDiff > 0) {
            speeds.push({
              name: iface.name,
              downloadSpeed: Math.max(0, (iface.rxBytes - last.rxBytes) / timeDiff),
              uploadSpeed: Math.max(0, (iface.txBytes - last.txBytes) / timeDiff)
            })
          }
        }

        lastSnapshots.set(iface.name, {
          rxBytes: iface.rxBytes,
          txBytes: iface.txBytes,
          timestamp: now
        })
      }

      const payload: NetworkSpeedPayload = {
        connectionId,
        timestamp: now,
        interfaces: speeds
      }

      this.sendToRenderer(IPC_CHANNELS.MONITOR_NETWORK_SPEED, payload)
    } catch {
      // 采集失败时静默忽略
    }
  }

  /** 清除指定连接的网速数据 */
  clear(connectionId: string): void {
    this.lastSnapshots.delete(connectionId)
  }

  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }
}

export const networkSpeedCalculator = new NetworkSpeedCalculator()
