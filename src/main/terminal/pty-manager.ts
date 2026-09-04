import { BrowserWindow } from 'electron'
import { ClientChannel } from 'ssh2'
import { IPC_CHANNELS } from '../../shared/types/ipc-channels'
import { TerminalSession } from './types'
import { sshConnectionManager } from '../ssh/connection-manager'

let sessionIdCounter = 0

class PTYManager {
  private sessions: Map<string, TerminalSession> = new Map()
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /** 创建 SSH 终端 */
  async createSSHTerminal(connectionId: string, cols = 80, rows = 24): Promise<string> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection || !connection.isConnected) {
      throw new Error('SSH 连接不可用，请先建立连接后再打开终端')
    }

    const stream = await connection.shell({ cols, rows })
    const sessionId = `term_${++sessionIdCounter}_${Date.now()}`

    const session: TerminalSession = {
      id: sessionId,
      connectionId,
      stream,
      cols,
      rows,
      active: true
    }

    // 监听终端输出，推送到渲染进程
    stream.on('data', (data: Buffer) => {
      this.sendToRenderer(IPC_CHANNELS.TERMINAL_DATA, {
        sessionId,
        data: data.toString('utf-8')
      })
    })

    stream.on('close', () => {
      this.sendToRenderer(IPC_CHANNELS.TERMINAL_EXIT, {
        sessionId,
        exitCode: 0
      })
      this.sessions.delete(sessionId)
    })

    stream.stderr?.on('data', (data: Buffer) => {
      this.sendToRenderer(IPC_CHANNELS.TERMINAL_DATA, {
        sessionId,
        data: data.toString('utf-8')
      })
    })

    this.sessions.set(sessionId, session)
    return sessionId
  }

  /** 写入数据到终端 */
  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    if (session?.stream && session.active) {
      session.stream.write(data)
    }
  }

  /** 调整终端尺寸 */
  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId)
    if (session?.stream) {
      try {
        const ch = session.stream as ClientChannel
        if (ch.setWindow) {
          ch.setWindow(rows, cols, rows * 16, cols * 8)
        }
        session.cols = cols
        session.rows = rows
      } catch {
        // 忽略 resize 错误
      }
    }
  }

  /** 关闭终端 */
  kill(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session?.stream) {
      try {
        session.stream.close()
      } catch {
        // 忽略关闭错误
      }
    }
    this.sessions.delete(sessionId)
  }

  /** 关闭指定连接的所有终端 */
  killByConnection(connectionId: string): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.connectionId === connectionId) {
        this.kill(sessionId)
      }
    }
  }

  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }
}

export const ptyManager = new PTYManager()
