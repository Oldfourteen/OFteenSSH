<template>
  <AppLayout />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import AppLayout from './components/layout/AppLayout.vue'
import { useThemeStore } from './stores/theme'
import { useMonitorStore } from './stores/monitor'
import { useConnectionStore } from './stores/connection'
import { useRemoteDirectoryStore } from './stores/remote-directory'

const themeStore = useThemeStore()
const monitorStore = useMonitorStore()
const connectionStore = useConnectionStore()
const remoteDirStore = useRemoteDirectoryStore()

let unsubMonitor: (() => void) | null = null
let unsubNetwork: (() => void) | null = null
let unsubStatus: (() => void) | null = null

onMounted(async () => {
  // 初始化主题
  await themeStore.loadThemes()

  // 从本地存储加载连接列表
  await connectionStore.loadConnections()

  // 监听主进程推送的监控数据
  unsubMonitor = window.ofteenAPI.monitor.onData((data: any) => {
    monitorStore.updateMonitorData(data)
  })

  unsubNetwork = window.ofteenAPI.monitor.onNetworkSpeed((data: any) => {
    monitorStore.updateNetworkSpeed(data)
  })

  // 监听 SSH 状态变更
  unsubStatus = window.ofteenAPI.ssh.onStatusChanged((data: any) => {
    connectionStore.updateStatus(data.connectionId, data.status)
    if (data.status === 'disconnected' || data.status === 'failed') {
      remoteDirStore.clearConnection(data.connectionId)
    }
  })
})

onUnmounted(() => {
  unsubMonitor?.()
  unsubNetwork?.()
  unsubStatus?.()
})
</script>
