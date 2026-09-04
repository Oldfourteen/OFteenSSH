import { DiskDataPoint } from '../../../shared/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { MonitorPayload, NetworkSpeedPayload, NetworkDataPoint } from '../../../shared/types'

export const useMonitorStore = defineStore('monitor', () => {
  const monitorData = ref<Map<string, MonitorPayload>>(new Map())
  const networkHistory = ref<Map<string, NetworkDataPoint[]>>(new Map())
  const diskHistory = ref<Map<string, DiskDataPoint[]>>(new Map())
  const MAX_NETWORK_POINTS = 60
  const MAX_DISK_POINTS = 60

  /** 更新监控数据 */
  function updateMonitorData(data: MonitorPayload) {
    monitorData.value.set(data.connectionId, data)
    appendDiskHistory(data)
  }

  /** 记录磁盘使用率历史（用于折线图） */
  function appendDiskHistory(data: MonitorPayload) {
    if (!data.disk || data.disk.length === 0) return

    const mounts: Record<string, number> = {}
    // 优先保留根分区与使用率最高的若干挂载点
    const sorted = [...data.disk].sort((a, b) => b.usagePercent - a.usagePercent)
    const preferred = sorted.filter((d) => d.mount === '/' || d.mount === '/home' || d.mount === '/var')
    const picks = [...preferred, ...sorted.filter((d) => !preferred.includes(d))].slice(0, 4)

    for (const d of picks) {
      mounts[d.mount] = d.usagePercent
    }

    let history = diskHistory.value.get(data.connectionId)
    if (!history) {
      history = []
      diskHistory.value.set(data.connectionId, history)
    }

    history.push({
      timestamp: data.timestamp,
      mounts
    })

    if (history.length > MAX_DISK_POINTS) {
      history.splice(0, history.length - MAX_DISK_POINTS)
    }
  }

  /** 更新网速数据 */
  function updateNetworkSpeed(data: NetworkSpeedPayload) {
    const { connectionId, interfaces, timestamp } = data
    if (interfaces.length === 0) return

    const totalDownload = interfaces.reduce((sum, i) => sum + i.downloadSpeed, 0)
    const totalUpload = interfaces.reduce((sum, i) => sum + i.uploadSpeed, 0)

    let history = networkHistory.value.get(connectionId)
    if (!history) {
      history = []
      networkHistory.value.set(connectionId, history)
    }

    history.push({
      timestamp,
      downloadSpeed: totalDownload,
      uploadSpeed: totalUpload
    })

    if (history.length > MAX_NETWORK_POINTS) {
      history.splice(0, history.length - MAX_NETWORK_POINTS)
    }
  }

  function clearMonitorData(connectionId: string) {
    monitorData.value.delete(connectionId)
    networkHistory.value.delete(connectionId)
    diskHistory.value.delete(connectionId)
  }

  function getMonitorData(connectionId: string): MonitorPayload | undefined {
    return monitorData.value.get(connectionId)
  }

  function getNetworkHistory(connectionId: string): NetworkDataPoint[] {
    return networkHistory.value.get(connectionId) || []
  }

  function getDiskHistory(connectionId: string): DiskDataPoint[] {
    return diskHistory.value.get(connectionId) || []
  }

  return {
    monitorData,
    networkHistory,
    diskHistory,
    updateMonitorData,
    updateNetworkSpeed,
    clearMonitorData,
    getMonitorData,
    getNetworkHistory,
    getDiskHistory
  }
})
