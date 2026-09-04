import { SSHConnection } from './connection'

export class ReconnectStrategy {
  private attempt = 0
  private maxAttempts = 6
  private baseDelay = 1500 // ms
  private maxDelay = 30000 // ms
  private timer: ReturnType<typeof setTimeout> | null = null
  private connection: SSHConnection
  private onReconnect: () => Promise<void>
  private aborted = false

  constructor(connection: SSHConnection, onReconnect: () => Promise<void>) {
    this.connection = connection
    this.onReconnect = onReconnect
  }

  /** 开始重连流程 */
  start(): void {
    this.attempt = 0
    this.aborted = false
    this.tryReconnect()
  }

  /** 取消重连 */
  abort(): void {
    this.aborted = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private tryReconnect(): void {
    if (this.aborted || this.attempt >= this.maxAttempts) {
      return
    }

    this.attempt++
    const delay = Math.min(this.baseDelay * Math.pow(2, this.attempt - 1), this.maxDelay)

    this.timer = setTimeout(async () => {
      if (this.aborted) return

      try {
        await this.onReconnect()
        // 重连成功
        this.connection.emit('reconnected', { attempt: this.attempt })
      } catch {
        // 重连失败，继续尝试
        this.connection.emit('reconnecting', {
          attempt: this.attempt,
          maxAttempts: this.maxAttempts,
          nextDelay: Math.min(this.baseDelay * Math.pow(2, this.attempt), this.maxDelay)
        })
        this.tryReconnect()
      }
    }, delay)
  }
}
