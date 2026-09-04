import { MemoryInfo, DiskInfo, CpuInfo, SystemInfo, ProcessInfo } from '../../shared/types'

/** 解析 free -b 输出 */
export function parseMemoryOutput(output: string): MemoryInfo {
  const lines = output.trim().split('\n')
  if (lines.length < 2) {
    return { total: 0, used: 0, available: 0, usagePercent: 0 }
  }

  // Mem: 行
  const memLine = lines[1].trim().split(/\s+/)
  const total = parseInt(memLine[1]) || 0
  const used = parseInt(memLine[2]) || 0
  const available = parseInt(memLine[6]) || 0

  return {
    total,
    used,
    available,
    usagePercent: total > 0 ? Math.round((used / total) * 100 * 100) / 100 : 0
  }
}

/** 解析 df -B1 输出 */
export function parseDiskOutput(output: string): DiskInfo[] {
  const lines = output.trim().split('\n')
  const disks: DiskInfo[] = []

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/)
    if (parts.length >= 5) {
      const size = parseInt(parts[1]) || 0
      const used = parseInt(parts[2]) || 0
      const avail = parseInt(parts[3]) || 0
      const mount = parts[4] || ''

      disks.push({
        filesystem: parts[0],
        mount,
        total: size,
        used,
        available: avail,
        usagePercent: size > 0 ? Math.round((used / size) * 100 * 100) / 100 : 0
      })
    }
  }

  return disks
}

/** 解析 /proc/net/dev 输出 */
export function parseNetworkOutput(
  output: string
): Array<{ name: string; rxBytes: number; txBytes: number }> {
  const lines = output.trim().split('\n')
  const interfaces: Array<{ name: string; rxBytes: number; txBytes: number }> = []

  for (let i = 2; i < lines.length; i++) {
    const parts = lines[i].trim().split(/[:\s]+/)
    if (parts.length >= 11) {
      const name = parts[0]
      // 跳过 lo 接口
      if (name === 'lo') continue
      const rxBytes = parseInt(parts[1]) || 0
      const txBytes = parseInt(parts[9]) || 0
      interfaces.push({ name, rxBytes, txBytes })
    }
  }

  return interfaces
}

/** 解析 /proc/loadavg 输出 */
export function parseCpuLoadOutput(output: string): { load1: number; load5: number; load15: number } {
  const parts = output.trim().split(/\s+/)
  return {
    load1: parseFloat(parts[0]) || 0,
    load5: parseFloat(parts[1]) || 0,
    load15: parseFloat(parts[2]) || 0
  }
}

/** 解析 CPU 型号 */
export function parseCpuModelOutput(output: string): string {
  const match = output.match(/model name\s*:\s*(.+)/)
  return match ? match[1].trim() : 'Unknown'
}

/** 解析 nproc 输出 */
export function parseCpuCoresOutput(output: string): number {
  return parseInt(output.trim()) || 1
}

/** 解析系统信息 */
export function parseSystemOutput(output: string): SystemInfo {
  const result: SystemInfo = {
    hostname: '',
    os: '',
    kernel: '',
    arch: '',
    uptime: 0
  }

  const lines = output.trim().split('\n')
  for (const line of lines) {
    if (line.startsWith('HOSTNAME=')) {
      result.hostname = line.split('=')[1]
    } else if (line.startsWith('KERNEL=')) {
      result.kernel = line.split('=')[1]
    } else if (line.startsWith('ARCH=')) {
      result.arch = line.split('=')[1]
    } else if (line.startsWith('UPTIME=')) {
      result.uptime = parseFloat(line.split('=')[1]) || 0
    } else if (line.startsWith('NAME=')) {
      result.os = line.split('=')[1].replace(/"/g, '')
    } else if (line.startsWith('VERSION=')) {
      result.os += ' ' + line.split('=')[1].replace(/"/g, '')
    }
  }

  return result
}

/** 解析 ps aux 输出 */
export function parseTopProcessesOutput(output: string): ProcessInfo[] {
  const lines = output.trim().split('\n')
  const processes: ProcessInfo[] = []

  // 跳过表头（第一行）
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/)
    if (parts.length >= 11) {
      processes.push({
        user: parts[0],
        pid: parseInt(parts[1]) || 0,
        cpuPercent: parseFloat(parts[2]) || 0,
        memPercent: parseFloat(parts[3]) || 0,
        command: parts.slice(10).join(' ')
      })
    }
  }

  return processes
}
