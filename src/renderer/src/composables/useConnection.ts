import { ref, onMounted, onUnmounted } from 'vue'
import { SSHConnectionConfig, ConnectionStatus } from '../../../shared/types'

export function useConnection() {
  const loading = ref(false)

  async function connect(config: SSHConnectionConfig) {
    loading.value = true
    try {
      const result = await window.ofteenAPI.ssh.connect(config)
      return result
    } finally {
      loading.value = false
    }
  }

  async function disconnect(connectionId: string) {
    return window.ofteenAPI.ssh.disconnect(connectionId)
  }

  async function testConnection(config: SSHConnectionConfig) {
    return window.ofteenAPI.ssh.testConnection(config)
  }

  function onStatusChanged(callback: (data: { connectionId: string; status: ConnectionStatus; message: string }) => void) {
    return window.ofteenAPI.ssh.onStatusChanged(callback)
  }

  return {
    loading,
    connect,
    disconnect,
    testConnection,
    onStatusChanged
  }
}
