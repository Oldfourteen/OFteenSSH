import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/types/ipc-channels'
import { MonitorPayload } from '../../shared/types'
import { MONITOR_COMMANDS } from './commands'
import {
  parseMemoryOutput,
  parseDiskOutput,
  parseCpuLoadOutput,
  parseCpuModelOutput,
  parseCpuCoresOutput,
  parseSystemOutput,
  parseTopProcessesOutput
} from './parser'
import { networkSpeedCalculator } from './network-speed'
import { sshConnectionManager } from '../ssh/connection-manager'
import { MonitorState } from './types'

class MonitorCollector {
  private states: Map<string, MonitorState> = new Map()
  private cpuModelCache: Map<string, string> = new Map()
  private cpuCoresCache: Map<string, number> = new Map()
  private systemInfoCache: Map<string, MonitorPayload['system']> = new Map()
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
    networkSpeedCalculator.setMainWindow(window)
  }

  /** 启动指定连接的监控 */
  start(connectionId: string): void {
    if (this.states.has(connectionId)) return

    const state: MonitorState = {
      connectionId,
      intervalId: null,
      networkIntervalId: null,
      lastNetworkStats: new Map(),
      systemInfoCollected: false
    }

    // 基础监控：每 5 秒采集一次
    state.intervalId = setInterval(() => {
      this.collectBasic(connectionId)
    }, 5000)

    // 网速监控：每 2 秒采集一次
    state.networkIntervalId = setInterval(() => {
      networkSpeedCalculator.calculate(connectionId)
    }, 2000)

    // 立即采集一次
    this.collectBasic(connectionId)
    this.collectSystemInfo(connectionId)
    networkSpeedCalculator.calculate(connectionId)

    this.states.set(connectionId, state)
  }

  /** 停止指定连接的监控 */
  stop(connectionId: string): void {
    const state = this.states.get(connectionId)
    if (state) {
      if (state.intervalId) clearInterval(state.intervalId)
      if (state.networkIntervalId) clearInterval(state.networkIntervalId)
      this.states.delete(connectionId)
    }
    networkSpeedCalculator.clear(connectionId)
  }

  /** 采集基础指标（内存/磁盘/CPU负载/Top进程） */
  private async collectBasic(connectionId: string): Promise<void> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection || !connection.isConnected) return

    try {
      // 并发执行多个命令
      const [memOutput, diskOutput, cpuLoadOutput, topOutput] = await Promise.all([
        connection.exec(MONITOR_COMMANDS.MEMORY, 5000),
        connection.exec(MONITOR_COMMANDS.DISK, 5000),
        connection.exec(MONITOR_COMMANDS.CPU_LOAD, 5000),
        connection.exec(MONITOR_COMMANDS.TOP_PROCESSES, 5000)
      ])

      const memory = parseMemoryOutput(memOutput)
      const disk = parseDiskOutput(diskOutput)
      const cpuLoad = parseCpuLoadOutput(cpuLoadOutput)
      const topProcesses = parseTopProcessesOutput(topOutput)

      const payload: MonitorPayload = {
        connectionId,
        timestamp: Date.now(),
        memory,
        disk,
        cpu: {
          ...cpuLoad,
          cores: this.cpuCoresCache.get(connectionId) || 0,
          modelName: this.cpuModelCache.get(connectionId) || ''
        },
        system: this.systemInfoCache.get(connectionId) || {
          hostname: '',
          os: '',
          kernel: '',
          arch: '',
          uptime: 0
        },
        topProcesses
      }

      this.sendToRenderer(IPC_CHANNELS.MONITOR_DATA, payload)
    } catch {
      // 采集失败静默忽略，下次重试
    }
  }

  /** 采集一次性系统信息 */
  private async collectSystemInfo(connectionId: string): Promise<void> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection || !connection.isConnected) return

    try {
      const [systemOutput, cpuModelOutput, cpuCoresOutput] = await Promise.all([
        connection.exec(MONITOR_COMMANDS.SYSTEM, 5000),
        connection.exec(MONITOR_COMMANDS.CPU_MODEL, 5000),
        connection.exec(MONITOR_COMMANDS.CPU_CORES, 5000)
      ])

      this.systemInfoCache.set(connectionId, parseSystemOutput(systemOutput))
      this.cpuModelCache.set(connectionId, parseCpuModelOutput(cpuModelOutput))
      this.cpuCoresCache.set(connectionId, parseCpuCoresOutput(cpuCoresOutput))
    } catch {
      // 静默忽略
    }
  }

  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }
}

export const monitorCollector = new MonitorCollector()
