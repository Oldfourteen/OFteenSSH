import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import { SSHConnectionConfig, ConnectionStatus } from '../../../shared/types'
import { translateSSHError } from '@/utils/errorTranslator'

/**
 * 将 Vue 响应式对象转为纯 JS 对象，确保可以跨 IPC 传输
 * Electron 的结构化克隆算法无法序列化 Proxy 对象
 */
function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(toRaw(obj)))
}

export const useConnectionStore = defineStore('connection', () => {
  const connections = ref<SSHConnectionConfig[]>([])
  const activeConnectionId = ref<string | null>(null)
  const connectionStatuses = ref<Map<string, ConnectionStatus>>(new Map())
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  // 内网连接
  const internalConnections = computed(() =>
    connections.value
      .filter((c) => c.group === 'internal')
      .sort((a, b) => a.order - b.order)
  )

  // 外网连接
  const externalConnections = computed(() =>
    connections.value
      .filter((c) => c.group === 'external')
      .sort((a, b) => a.order - b.order)
  )

  // 当前活跃连接
  const activeConnection = computed(() =>
    connections.value.find((c) => c.id === activeConnectionId.value)
  )

  // 当前活跃连接状态
  const activeConnectionStatus = computed(() =>
    activeConnectionId.value
      ? connectionStatuses.value.get(activeConnectionId.value) || 'idle'
      : 'idle'
  )

  /** 加载连接列表 */
  async function loadConnections() {
    try {
      const list = await window.ofteenAPI.config.getConnections()
      connections.value = list
    } catch (err) {
      console.error('加载连接列表失败:', err)
    }
  }

  /** 新增连接 */
  async function addConnection(config: SSHConnectionConfig, credential?: { password?: string; passphrase?: string }) {
    loading.value = true
    errorMessage.value = null
    try {
      await window.ofteenAPI.config.saveConnection(toPlain(config))
      if (credential && (credential.password || credential.passphrase)) {
        await window.ofteenAPI.credential.save(config.id, toPlain(credential))
      }
      await loadConnections()
    } catch (err) {
      errorMessage.value = translateSSHError(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /** 更新连接 */
  async function updateConnection(connectionId: string, config: Partial<SSHConnectionConfig>) {
    await window.ofteenAPI.config.updateConnection(connectionId, toPlain(config))
    await loadConnections()
  }

  /** 删除连接 */
  async function deleteConnection(connectionId: string) {
    await window.ofteenAPI.config.deleteConnection(connectionId)
    await window.ofteenAPI.credential.delete(connectionId)
    if (activeConnectionId.value === connectionId) {
      activeConnectionId.value = null
    }
    connectionStatuses.value.delete(connectionId)
    await loadConnections()
  }

  /** 建立 SSH 连接 */
  async function connect(connectionId: string) {
    const rawConfig = connections.value.find((c) => c.id === connectionId)
    if (!rawConfig) return

    // 必须转为纯对象！Vue 的 Proxy 无法通过 Electron IPC 传输
    const config = toPlain(rawConfig)

    connectionStatuses.value.set(connectionId, 'connecting')
    activeConnectionId.value = connectionId
    errorMessage.value = null

    try {
      // 先尝试从安全存储获取凭证
      let credential = null
      try {
        credential = await window.ofteenAPI.credential.get(connectionId)
      } catch {
        // 获取凭证失败，尝试无凭证连接（可能用密钥）
      }

      const result = await window.ofteenAPI.ssh.connect(config, credential || undefined)
      if (result.success) {
        connectionStatuses.value.set(connectionId, 'connected')
      } else {
        connectionStatuses.value.set(connectionId, 'failed')
        const translatedMsg = translateSSHError(result.message || '连接失败')
        errorMessage.value = translatedMsg
        throw new Error(translatedMsg)
      }
    } catch (err) {
      connectionStatuses.value.set(connectionId, 'failed')
      const translatedMsg = translateSSHError(err)
      errorMessage.value = translatedMsg
      throw new Error(translatedMsg)
    }
  }

  /** 断开连接 */
  async function disconnect(connectionId: string) {
    await window.ofteenAPI.ssh.disconnect(connectionId)
    connectionStatuses.value.set(connectionId, 'disconnected')
    if (activeConnectionId.value === connectionId) {
      activeConnectionId.value = null
    }
  }

  /** 设置活跃连接 */
  function setActiveConnection(connectionId: string | null) {
    activeConnectionId.value = connectionId
  }

  /** 更新连接状态 */
  function updateStatus(connectionId: string, status: ConnectionStatus) {
    connectionStatuses.value.set(connectionId, status)
  }

  return {
    connections,
    activeConnectionId,
    connectionStatuses,
    loading,
    errorMessage,
    internalConnections,
    externalConnections,
    activeConnection,
    activeConnectionStatus,
    loadConnections,
    addConnection,
    updateConnection,
    deleteConnection,
    connect,
    disconnect,
    setActiveConnection,
    updateStatus
  }
})
