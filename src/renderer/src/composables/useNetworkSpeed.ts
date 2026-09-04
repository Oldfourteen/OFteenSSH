import { ref, onMounted, onUnmounted } from 'vue'

export function useNetworkSpeed(connectionId: string | null) {
  const downloadSpeed = ref(0)
  const uploadSpeed = ref(0)
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = window.ofteenAPI.monitor.onNetworkSpeed((data: any) => {
      if (data.connectionId === connectionId && data.interfaces.length > 0) {
        downloadSpeed.value = data.interfaces.reduce((sum: number, i: any) => sum + i.downloadSpeed, 0)
        uploadSpeed.value = data.interfaces.reduce((sum: number, i: any) => sum + i.uploadSpeed, 0)
      }
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  function formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
    return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
  }

  return {
    downloadSpeed,
    uploadSpeed,
    downloadFormatted: formatSpeed(downloadSpeed.value),
    uploadFormatted: formatSpeed(uploadSpeed.value),
    formatSpeed
  }
}
