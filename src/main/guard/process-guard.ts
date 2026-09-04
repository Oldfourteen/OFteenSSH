import { BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { sshConnectionManager } from '../ssh/connection-manager'
import { ProcessGuardRule } from '../../shared/types'

class ProcessGuardManager {
  private rules: Map<string, ProcessGuardRule> = new Map()
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map()
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  list(connectionId: string): ProcessGuardRule[] {
    return Array.from(this.rules.values()).filter((r) => r.connectionId === connectionId)
  }

  add(
    connectionId: string,
    input: { name: string; match: string; startCommand: string; enabled?: boolean }
  ): ProcessGuardRule {
    const rule: ProcessGuardRule = {
      id: randomUUID(),
      connectionId,
      name: input.name.trim() || input.match.trim(),
      match: input.match.trim(),
      startCommand: input.startCommand.trim(),
      enabled: input.enabled ?? true,
      status: 'unknown',
      restartCount: 0
    }
    this.rules.set(rule.id, rule)
    this.ensureTimer(connectionId)
    void this.checkRule(rule)
    return rule
  }

  update(
    id: string,
    patch: Partial<Pick<ProcessGuardRule, 'name' | 'match' | 'startCommand' | 'enabled'>>
  ): ProcessGuardRule | null {
    const rule = this.rules.get(id)
    if (!rule) return null
    if (patch.name !== undefined) rule.name = patch.name.trim()
    if (patch.match !== undefined) rule.match = patch.match.trim()
    if (patch.startCommand !== undefined) rule.startCommand = patch.startCommand.trim()
    if (patch.enabled !== undefined) rule.enabled = patch.enabled
    void this.checkRule(rule)
    return rule
  }

  remove(id: string): boolean {
    const rule = this.rules.get(id)
    if (!rule) return false
    this.rules.delete(id)
    const remaining = this.list(rule.connectionId)
    if (remaining.length === 0) this.clearTimer(rule.connectionId)
    return true
  }

  async checkNow(connectionId: string): Promise<ProcessGuardRule[]> {
    const list = this.list(connectionId)
    await Promise.all(list.map((r) => this.checkRule(r)))
    return this.list(connectionId)
  }

  clearByConnection(connectionId: string): void {
    for (const [id, rule] of this.rules) {
      if (rule.connectionId === connectionId) this.rules.delete(id)
    }
    this.clearTimer(connectionId)
  }

  private ensureTimer(connectionId: string): void {
    if (this.timers.has(connectionId)) return
    const timer = setInterval(() => {
      void this.checkNow(connectionId)
    }, 10000)
    this.timers.set(connectionId, timer)
  }

  private clearTimer(connectionId: string): void {
    const t = this.timers.get(connectionId)
    if (t) clearInterval(t)
    this.timers.delete(connectionId)
  }

  private async checkRule(rule: ProcessGuardRule): Promise<void> {
    const connection = sshConnectionManager.getConnection(rule.connectionId)
    if (!connection || !connection.isConnected) {
      rule.status = 'unknown'
      rule.lastMessage = 'SSH 未连接'
      return
    }

    try {
      const escaped = rule.match.replace(/'/g, `'\\''`)
      const output = await connection.exec(
        `pgrep -af '${escaped}' 2>/dev/null | grep -v pgrep | head -5; echo __EXIT__:$?`,
        8000
      )
      const lines = output
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('__EXIT__:'))

      rule.lastChecked = Date.now()

      if (lines.length > 0) {
        const pid = parseInt(lines[0].split(/\s+/)[0], 10)
        rule.lastPid = Number.isFinite(pid) ? pid : undefined
        rule.status = 'running'
        rule.lastMessage = `运行中 PID ${rule.lastPid ?? '-'}`
        return
      }

      rule.status = 'stopped'
      rule.lastPid = undefined

      if (!rule.enabled) {
        rule.lastMessage = '已停止（守卫关闭）'
        return
      }

      rule.status = 'restarting'
      rule.lastMessage = '进程不存在，正在拉起...'
      const startOut = await connection.exec(
        `nohup bash -c ${shellQuote(rule.startCommand)} >/tmp/ofteen-guard-${rule.id}.log 2>&1 & echo $!`,
        10000
      )
      const newPid = parseInt(startOut.trim().split('\n').pop() || '', 10)
      rule.restartCount += 1
      if (Number.isFinite(newPid) && newPid > 0) {
        rule.lastPid = newPid
        rule.status = 'running'
        rule.lastMessage = `已自动拉起 PID ${newPid}`
      } else {
        rule.status = 'stopped'
        rule.lastMessage = `拉起失败: ${startOut.trim() || '未知错误'}`
      }
    } catch (err) {
      rule.status = 'unknown'
      rule.lastMessage = (err as Error).message
    }
  }
}

function shellQuote(cmd: string): string {
  return `'${cmd.replace(/'/g, `'\\''`)}'`
}

export const processGuardManager = new ProcessGuardManager()
