import { sshConnectionManager } from '../ssh/connection-manager'
import {
  ProcessInfo,
  ProcessListResult,
  ProcessActionResult,
  ProcessKillSignal
} from '../../shared/types'
import { parseTopProcessesOutput } from '../monitor/parser'

/** 禁止直接操作的系统关键进程 */
const PROTECTED_PIDS = new Set([0, 1])

class ProcessManager {
  /** 列出远程进程 */
  async list(connectionId: string, limit = 80): Promise<ProcessListResult> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection || !connection.isConnected) {
      return { success: false, processes: [], message: 'SSH 未连接' }
    }

    const safeLimit = Math.min(Math.max(Math.floor(limit) || 80, 10), 300)

    try {
      // 优先用带状态字段的格式；失败则回退到 ps aux
      let output = ''
      try {
        output = await connection.exec(
          `ps -eo user,pid,ppid,pcpu,pmem,stat,args --sort=-pcpu 2>/dev/null | head -n ${safeLimit + 1}`,
          12000
        )
      } catch {
        output = ''
      }

      let processes = parseProcessListOutput(output)
      if (processes.length === 0) {
        output = await connection.exec(
          `ps aux --sort=-%cpu 2>/dev/null | head -n ${safeLimit + 1}`,
          12000
        )
        processes = parseTopProcessesOutput(output)
      }

      return { success: true, processes }
    } catch (err) {
      return {
        success: false,
        processes: [],
        message: `获取进程列表失败: ${(err as Error).message}`
      }
    }
  }

  /** 结束远程进程 */
  async kill(
    connectionId: string,
    pid: number,
    signal: ProcessKillSignal = 'TERM'
  ): Promise<ProcessActionResult> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection || !connection.isConnected) {
      return { success: false, message: 'SSH 未连接' }
    }

    if (!Number.isInteger(pid) || pid <= 0) {
      return { success: false, message: '无效的 PID' }
    }
    if (PROTECTED_PIDS.has(pid)) {
      return { success: false, message: `不允许结束系统关键进程 (PID ${pid})` }
    }

    const sig = signal === 'KILL' ? 'KILL' : 'TERM'

    try {
      const output = await connection.exec(
        `kill -${sig} ${pid} 2>&1; echo __EXIT__:$?`,
        8000
      )
      const code = parseExitMarker(output)
      if (code === 0) {
        return {
          success: true,
          message: signal === 'KILL' ? `已强制结束 PID ${pid}` : `已发送终止信号到 PID ${pid}`
        }
      }

      const detail = output.replace(/__EXIT__:\d+\s*$/, '').trim()
      return {
        success: false,
        message: detail || `结束进程失败 (exit ${code ?? '?'})`
      }
    } catch (err) {
      return { success: false, message: `结束进程失败: ${(err as Error).message}` }
    }
  }

  /** 后台启动远程命令 */
  async start(connectionId: string, command: string): Promise<ProcessActionResult> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection || !connection.isConnected) {
      return { success: false, message: 'SSH 未连接' }
    }

    const cmd = command.trim()
    if (!cmd) {
      return { success: false, message: '命令不能为空' }
    }
    if (cmd.length > 2000) {
      return { success: false, message: '命令过长' }
    }

    // 用 base64 传递命令，避免引号/特殊字符破坏 shell
    const b64 = Buffer.from(cmd, 'utf-8').toString('base64')

    try {
      const output = await connection.exec(
        [
          `CMD_B64='${b64}'`,
          `CMD=$(printf '%s' "$CMD_B64" | base64 -d 2>/dev/null || printf '%s' "$CMD_B64" | base64 -D 2>/dev/null)`,
          `nohup bash -c "$CMD" >/tmp/ofteen-ssh-proc.log 2>&1 &`,
          `echo __PID__:$!`,
          `echo __EXIT__:$?`
        ].join('; '),
        10000
      )

      const pidMatch = output.match(/__PID__:(\d+)/)
      const code = parseExitMarker(output)
      const pid = pidMatch ? parseInt(pidMatch[1], 10) : undefined

      if (pid && pid > 0 && (code === 0 || code === null)) {
        return {
          success: true,
          pid,
          message: `已后台启动，PID ${pid}`
        }
      }

      return {
        success: false,
        message: output.replace(/__PID__:\d+|__EXIT__:\d+/g, '').trim() || '启动失败'
      }
    } catch (err) {
      return { success: false, message: `启动失败: ${(err as Error).message}` }
    }
  }
}

function parseExitMarker(output: string): number | null {
  const match = output.match(/__EXIT__:(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

/** 解析 `ps -eo user,pid,ppid,pcpu,pmem,stat,args` */
function parseProcessListOutput(output: string): ProcessInfo[] {
  const lines = output.trim().split('\n')
  if (lines.length < 2) return []

  const processes: ProcessInfo[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // user 可能含空格较少；按空白切分，前 6 列为固定字段，其余为 args
    const parts = line.trim().split(/\s+/)
    if (parts.length < 7) continue

    const pid = parseInt(parts[1], 10)
    if (!Number.isFinite(pid) || pid <= 0) continue

    processes.push({
      user: parts[0],
      pid,
      ppid: parseInt(parts[2], 10) || 0,
      cpuPercent: parseFloat(parts[3]) || 0,
      memPercent: parseFloat(parts[4]) || 0,
      state: parts[5],
      command: parts.slice(6).join(' ')
    })
  }

  return processes
}

export const processManager = new ProcessManager()
