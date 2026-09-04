import { sshConnectionManager } from '../ssh/connection-manager'
import { FirewallBackend, FirewallRule, FirewallStatus } from '../../shared/types'

class FirewallManager {
  async status(connectionId: string): Promise<FirewallStatus> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection || !connection.isConnected) {
      return { success: false, backend: 'unknown', active: false, rules: [], message: 'SSH 未连接' }
    }

    try {
      const detect = await connection.exec(
        `if command -v ufw >/dev/null 2>&1; then echo ufw; elif command -v firewall-cmd >/dev/null 2>&1; then echo firewalld; elif command -v iptables >/dev/null 2>&1; then echo iptables; else echo unknown; fi`,
        8000
      )
      const backend = (detect.trim() as FirewallBackend) || 'unknown'

      if (backend === 'ufw') {
        const raw = await connection.exec('ufw status verbose 2>&1; echo ---; ufw status numbered 2>&1', 12000)
        return parseUfw(raw)
      }

      if (backend === 'firewalld') {
        const raw = await connection.exec(
          'firewall-cmd --state 2>&1; echo ---; firewall-cmd --list-all 2>&1',
          12000
        )
        return parseFirewalld(raw)
      }

      if (backend === 'iptables') {
        const raw = await connection.exec('iptables -L -n --line-numbers 2>&1 | head -80', 12000)
        return parseIptables(raw)
      }

      return {
        success: false,
        backend: 'unknown',
        active: false,
        rules: [],
        message: '未检测到 ufw / firewalld / iptables'
      }
    } catch (err) {
      return {
        success: false,
        backend: 'unknown',
        active: false,
        rules: [],
        message: (err as Error).message
      }
    }
  }

  async enable(connectionId: string): Promise<{ success: boolean; message?: string }> {
    return this.runUfw(connectionId, 'ufw --force enable 2>&1')
  }

  async disable(connectionId: string): Promise<{ success: boolean; message?: string }> {
    return this.runUfw(connectionId, 'ufw --force disable 2>&1')
  }

  async allow(
    connectionId: string,
    port: string,
    proto: 'tcp' | 'udp' | 'any' = 'tcp'
  ): Promise<{ success: boolean; message?: string }> {
    const p = sanitizePort(port)
    if (!p) return { success: false, message: '端口格式无效，例如 80 或 8000:8010' }
    const rule = proto === 'any' ? p : `${p}/${proto}`
    return this.runUfw(connectionId, `ufw allow ${rule} 2>&1`)
  }

  async deleteRule(
    connectionId: string,
    ruleNumber: number
  ): Promise<{ success: boolean; message?: string }> {
    if (!Number.isInteger(ruleNumber) || ruleNumber <= 0) {
      return { success: false, message: '无效的规则编号' }
    }
    return this.runUfw(connectionId, `ufw --force delete ${ruleNumber} 2>&1`)
  }

  private async runUfw(
    connectionId: string,
    command: string
  ): Promise<{ success: boolean; message?: string }> {
    const connection = sshConnectionManager.getConnection(connectionId)
    if (!connection || !connection.isConnected) {
      return { success: false, message: 'SSH 未连接' }
    }
    try {
      const out = await connection.exec(command, 15000)
      const lower = out.toLowerCase()
      if (lower.includes('error') || lower.includes('failed') || lower.includes('command not found')) {
        return { success: false, message: out.trim() || '操作失败' }
      }
      return { success: true, message: out.trim() || '完成' }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  }
}

function sanitizePort(port: string): string | null {
  const t = port.trim()
  if (/^\d{1,5}$/.test(t)) {
    const n = parseInt(t, 10)
    return n >= 1 && n <= 65535 ? t : null
  }
  if (/^\d{1,5}:\d{1,5}$/.test(t)) return t
  return null
}

function parseUfw(raw: string): FirewallStatus {
  const active = /Status:\s*active/i.test(raw)
  const rules: FirewallRule[] = []
  const numbered = raw.split('---')[1] || raw
  const lines = numbered.split('\n')
  for (const line of lines) {
    const m = line.match(/^\s*\[\s*(\d+)\]\s+(.+)$/)
    if (!m) continue
    const rest = m[2].replace(/\s{2,}/g, ' ').trim()
    const parts = rest.split(/\s+/)
    rules.push({
      id: `ufw-${m[1]}`,
      number: parseInt(m[1], 10),
      action: parts[1] || parts[0] || '',
      to: parts[0],
      from: parts.slice(-1)[0],
      raw: rest
    })
  }
  return { success: true, backend: 'ufw', active, rules, raw }
}

function parseFirewalld(raw: string): FirewallStatus {
  const active = /running/i.test(raw.split('---')[0] || '')
  const rules: FirewallRule[] = []
  const ports = raw.match(/ports:\s*(.+)/i)
  if (ports && ports[1].trim()) {
    ports[1]
      .trim()
      .split(/\s+/)
      .forEach((p, i) => {
        rules.push({ id: `fd-port-${i}`, action: 'allow', port: p, raw: p })
      })
  }
  const services = raw.match(/services:\s*(.+)/i)
  if (services && services[1].trim()) {
    services[1]
      .trim()
      .split(/\s+/)
      .forEach((s, i) => {
        rules.push({ id: `fd-svc-${i}`, action: 'allow', raw: `service:${s}` })
      })
  }
  return { success: true, backend: 'firewalld', active, rules, raw }
}

function parseIptables(raw: string): FirewallStatus {
  const rules: FirewallRule[] = []
  const lines = raw.split('\n')
  for (const line of lines) {
    const m = line.match(/^\s*(\d+)\s+(.+)$/)
    if (!m) continue
    if (/^Chain |^num |^target /i.test(m[2])) continue
    rules.push({
      id: `ipt-${m[1]}-${rules.length}`,
      number: parseInt(m[1], 10),
      action: m[2].split(/\s+/)[0] || '',
      raw: m[2].trim()
    })
  }
  return {
    success: true,
    backend: 'iptables',
    active: rules.length > 0,
    rules: rules.slice(0, 40),
    raw
  }
}

export const firewallManager = new FirewallManager()
