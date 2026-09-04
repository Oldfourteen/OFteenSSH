import { createServer, Server, Socket, connect as netConnect } from 'net'
import { randomUUID } from 'crypto'
import { Client } from 'ssh2'
import { sshConnectionManager } from '../ssh/connection-manager'
import { PortForwardRule, PortForwardType } from '../../shared/types'

interface ActiveForward {
  rule: PortForwardRule
  server?: Server
  /** remote forward 已注册的远端端口 */
  remoteBound?: { host: string; port: number }
}

class PortForwardManager {
  private forwards: Map<string, ActiveForward> = new Map()

  list(connectionId: string): PortForwardRule[] {
    return Array.from(this.forwards.values())
      .map((f) => f.rule)
      .filter((r) => r.connectionId === connectionId)
  }

  async start(input: {
    connectionId: string
    type: PortForwardType
    name?: string
    localHost?: string
    localPort: number
    remoteHost?: string
    remotePort: number
  }): Promise<{ success: boolean; rule?: PortForwardRule; message?: string }> {
    const connection = sshConnectionManager.getConnection(input.connectionId)
    if (!connection || !connection.isConnected || !connection.sshClient) {
      return { success: false, message: 'SSH 未连接' }
    }

    const localPort = Number(input.localPort)
    const remotePort = Number(input.remotePort)
    if (!validPort(localPort) || !validPort(remotePort)) {
      return { success: false, message: '端口必须在 1-65535' }
    }

    const rule: PortForwardRule = {
      id: randomUUID(),
      connectionId: input.connectionId,
      type: input.type,
      name: input.name?.trim() || `${input.type} ${localPort}->${remotePort}`,
      localHost: input.localHost?.trim() || '127.0.0.1',
      localPort,
      remoteHost: input.remoteHost?.trim() || '127.0.0.1',
      remotePort,
      active: false
    }

    try {
      if (input.type === 'local') {
        await this.startLocal(connection.sshClient, rule)
      } else {
        await this.startRemote(connection.sshClient, rule)
      }
      rule.active = true
      rule.message = '转发中'
      return { success: true, rule }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  }

  async stop(id: string): Promise<{ success: boolean; message?: string }> {
    const item = this.forwards.get(id)
    if (!item) return { success: false, message: '转发不存在' }

    try {
      await this.teardown(item)
      item.rule.active = false
      item.rule.message = '已停止'
      return { success: true, message: '已停止' }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  }

  async remove(id: string): Promise<{ success: boolean; message?: string }> {
    const stop = await this.stop(id)
    this.forwards.delete(id)
    return stop.success || !this.forwards.has(id)
      ? { success: true, message: '已移除' }
      : stop
  }

  clearByConnection(connectionId: string): void {
    for (const [id, item] of this.forwards) {
      if (item.rule.connectionId === connectionId) {
        void this.teardown(item)
        this.forwards.delete(id)
      }
    }
  }

  private startLocal(client: Client, rule: PortForwardRule): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = createServer((socket: Socket) => {
        client.forwardOut(
          rule.localHost,
          rule.localPort,
          rule.remoteHost,
          rule.remotePort,
          (err, stream) => {
            if (err) {
              socket.destroy()
              return
            }
            socket.pipe(stream)
            stream.pipe(socket)
            socket.on('error', () => stream.close())
            stream.on('close', () => socket.destroy())
          }
        )
      })

      server.once('error', reject)
      server.listen(rule.localPort, rule.localHost, () => {
        this.forwards.set(rule.id, { rule, server })
        resolve()
      })
    })
  }

  private startRemote(client: Client, rule: PortForwardRule): Promise<void> {
    return new Promise((resolve, reject) => {
      client.forwardIn(rule.remoteHost === '127.0.0.1' ? '127.0.0.1' : '0.0.0.0', rule.remotePort, (err) => {
        if (err) {
          reject(err)
          return
        }

        const onTcp = (
          details: { destPort: number },
          accept: () => import('ssh2').ClientChannel,
          rejectConn: () => void
        ) => {
          if (details.destPort !== rule.remotePort) return
          let stream: import('ssh2').ClientChannel
          try {
            stream = accept()
          } catch {
            rejectConn()
            return
          }
          const socket = netConnect(rule.localPort, rule.localHost)
          socket.on('error', () => stream.close())
          stream.on('close', () => socket.destroy())
          socket.pipe(stream)
          stream.pipe(socket)
        }

        client.on('tcp connection', onTcp as any)
        this.forwards.set(rule.id, {
          rule,
          remoteBound: { host: rule.remoteHost, port: rule.remotePort }
        })
        // 保存清理钩子
        ;(this.forwards.get(rule.id) as any)._onTcp = onTcp
        ;(this.forwards.get(rule.id) as any)._client = client
        resolve()
      })
    })
  }

  private teardown(item: ActiveForward): Promise<void> {
    return new Promise((resolve) => {
      if (item.server) {
        item.server.close(() => resolve())
        return
      }
      const anyItem = item as any
      if (anyItem._client && item.remoteBound) {
        try {
          anyItem._client.removeListener('tcp connection', anyItem._onTcp)
          anyItem._client.unforwardIn(item.remoteBound.host === '127.0.0.1' ? '127.0.0.1' : '0.0.0.0', item.remoteBound.port, () =>
            resolve()
          )
          return
        } catch {
          resolve()
          return
        }
      }
      resolve()
    })
  }
}

function validPort(p: number): boolean {
  return Number.isInteger(p) && p >= 1 && p <= 65535
}

export const portForwardManager = new PortForwardManager()
