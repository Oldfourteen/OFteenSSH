import { BrowserWindow } from 'electron'
import { SSHConnection } from './connection'
import { ReconnectStrategy } from './reconnect'
import { SSHConnectionConfig, ConnectionResult, ConnectionStatus, SSHCredential } from '../../shared/types'
import { IPC_CHANNELS } from '../../shared/types/ipc-channels'
import { credentialStore } from '../credential/credential-store'
import { translateSSHError } from '../utils/translateError'
import { processGuardManager } from '../guard/process-guard'
import { portForwardManager } from '../forward/port-forward'

interface ConnectOptions {
  config: SSHConnectionConfig
  credential?: SSHCredential
}

class SSHConnectionManager {
  private connections: Map<string, SSHConnection> = new Map()
  private reconnectStrategies: Map<string, ReconnectStrategy> = new Map()
  private mainWindow: BrowserWindow | null = null

  /** 设置主窗口引用（用于推送事件） */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /** 建立 SSH 连接 */
  async connect(options: ConnectOptions): Promise<ConnectionResult> {
    const { config, credential: inlineCredential } = options

    try {
      // 如果已存在连接，先断开
      if (this.connections.has(config.id)) {
        this.disconnect(config.id)
      }

      const connection = new SSHConnection(config)

      // 优先使用内联凭证（前端直接传递），否则从安全存储获取
      if (inlineCredential) {
        connection.setCredential(inlineCredential)
      } else {
        const storedCredential = await credentialStore.getCredential(config.id)
        if (storedCredential) {
          connection.setCredential(storedCredential)
        }
      }

      // 监听状态变更，推送到渲染进程
      connection.on('status-changed', (status: ConnectionStatus) => {
        this.sendToRenderer(IPC_CHANNELS.SSH_STATUS_CHANGED, {
          connectionId: config.id,
          status,
          message: this.getStatusMessage(status)
        })
      })

      // 监听意外断开，启动重连
      connection.on('unexpected-close', () => {
        this.startReconnect(config.id)
      })

      connection.on('reconnecting', (data) => {
        this.sendToRenderer(IPC_CHANNELS.SSH_RECONNECTING, {
          connectionId: config.id,
          ...data
        })
      })

      connection.on('reconnected', () => {
        this.sendToRenderer(IPC_CHANNELS.SSH_RECONNECTED, {
          connectionId: config.id
        })
      })

      await connection.connect()
      this.connections.set(config.id, connection)

      return { success: true, connectionId: config.id }
    } catch (err) {
      return {
        success: false,
        message: translateSSHError(err)
      }
    }
  }

  /** 断开连接 */
  disconnect(connectionId: string): ConnectionResult {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      return { success: false, message: '连接不存在' }
    }

    // 取消重连
    const strategy = this.reconnectStrategies.get(connectionId)
    if (strategy) {
      strategy.abort()
      this.reconnectStrategies.delete(connectionId)
    }

    connection.destroy()
    this.connections.delete(connectionId)
    processGuardManager.clearByConnection(connectionId)
    portForwardManager.clearByConnection(connectionId)

    return { success: true }
  }

  /** 测试连接 */
  async testConnection(config: SSHConnectionConfig): Promise<ConnectionResult> {
    const testConnection = new SSHConnection(config)

    try {
      const credential = await credentialStore.getCredential(config.id)
      if (credential) {
        testConnection.setCredential(credential)
      }

      await testConnection.connect()
      testConnection.destroy()
      return { success: true, message: '连接测试成功' }
    } catch (err) {
      testConnection.destroy()
      return {
        success: false,
        message: `连接测试失败: ${translateSSHError(err)}`
      }
    }
  }

  /** 获取连接状态 */
  getStatus(connectionId: string): ConnectionStatus {
    const connection = this.connections.get(connectionId)
    return connection ? connection.status : 'idle'
  }

  /** 获取指定连接 */
  getConnection(connectionId: string): SSHConnection | undefined {
    return this.connections.get(connectionId)
  }

  /** 启动断线重连 */
  private startReconnect(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    // 取消已有重连策略
    const existingStrategy = this.reconnectStrategies.get(connectionId)
    if (existingStrategy) {
      existingStrategy.abort()
    }

    const strategy = new ReconnectStrategy(connection, async () => {
      connection.disconnect()
      await connection.connect()
    })

    this.reconnectStrategies.set(connectionId, strategy)
    strategy.start()
  }

  /** 向渲染进程发送消息 */
  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  private getStatusMessage(status: ConnectionStatus): string {
    const messages: Record<ConnectionStatus, string> = {
      idle: '空闲',
      connecting: '连接中...',
      connected: '已连接',
      disconnected: '已断开',
      reconnecting: '重连中...',
      failed: '连接失败'
    }
    return messages[status]
  }
}

export const sshConnectionManager = new SSHConnectionManager()
