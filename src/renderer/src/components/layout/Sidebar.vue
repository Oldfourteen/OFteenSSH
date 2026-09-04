<template>
  <div class="sidebar">
    <!-- 视图切换 -->
    <div class="sidebar-view-tabs">
      <button
        class="view-tab"
        :class="{ active: activeView === 'connections' }"
        @click="activeView = 'connections'"
      >
        连接管理
      </button>
      <button
        class="view-tab"
        :class="{ active: activeView === 'directory' }"
        @click="activeView = 'directory'"
      >
        连接目录
      </button>
    </div>

    <!-- 顶部搜索和操作栏 -->
    <div v-if="activeView === 'connections'" class="sidebar-header">
      <h2 class="sidebar-title">连接管理</h2>
      <button class="btn-icon" @click="showAddDialog = true" title="新建连接">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div v-if="activeView === 'connections'" class="sidebar-search">
      <input type="text" class="input" placeholder="搜索连接..." v-model="searchQuery" />
    </div>

    <!-- 错误提示 -->
    <div v-if="connectionStore.errorMessage" class="sidebar-error">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="var(--accent-danger)" stroke-width="1.5" fill="none"/>
        <line x1="7" y1="4" x2="7" y2="7.5" stroke="var(--accent-danger)" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="7" cy="9.5" r="0.5" fill="var(--accent-danger)"/>
      </svg>
      <span>{{ connectionStore.errorMessage }}</span>
      <button class="btn-icon error-close" @click="connectionStore.errorMessage = null">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- 连接列表 -->
    <template v-if="activeView === 'connections'">
      <ConnectionGroup
        title="内网连接"
        :icon="'lan'"
        :connections="filteredInternal"
        @connect="handleConnect"
        @disconnect="handleDisconnect"
        @edit="handleEdit"
        @delete="handleDelete"
      />

      <ConnectionGroup
        title="外网连接"
        :icon="'wan'"
        :connections="filteredExternal"
        @connect="handleConnect"
        @disconnect="handleDisconnect"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </template>

    <!-- 连接目录树 -->
    <DirectoryTreePanel
      v-else
      :connection-id="browsingConnectionId"
    />

    <!-- 新建/编辑连接弹窗 -->
    <AddConnectionDialog
      v-if="showAddDialog"
      :editConnection="editingConnection"
      @close="handleDialogClose"
      @save="handleSave"
    />

    <!-- 删除确认弹窗 -->
    <div v-if="deleteTarget" class="dialog-overlay" @click.self="deleteTarget = null">
      <div class="confirm-dialog">
        <div class="confirm-header">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="var(--accent-warning)" stroke-width="1.5" fill="none"/>
            <line x1="10" y1="5.5" x2="10" y2="11" stroke="var(--accent-warning)" stroke-width="2" stroke-linecap="round"/>
            <circle cx="10" cy="13.5" r="0.8" fill="var(--accent-warning)"/>
          </svg>
          <h3>确认删除</h3>
        </div>
        <p class="confirm-text">确定要删除连接「{{ deleteTargetName }}」吗？此操作将同时删除本地保存的连接记录和凭证，不可恢复。</p>
        <div class="confirm-footer">
          <button class="btn" @click="deleteTarget = null">取消</button>
          <button class="btn btn-danger" @click="confirmDelete">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import { useTerminalStore } from '@/stores/terminal'
import { useMonitorStore } from '@/stores/monitor'
import { useRemoteDirectoryStore } from '@/stores/remote-directory'
import { SSHConnectionConfig } from '../../../shared/types'
import ConnectionGroup from '@/components/sidebar/ConnectionGroup.vue'
import AddConnectionDialog from '@/components/sidebar/AddConnectionDialog.vue'
import DirectoryTreePanel from '@/components/sidebar/DirectoryTreePanel.vue'

const connectionStore = useConnectionStore()
const terminalStore = useTerminalStore()
const monitorStore = useMonitorStore()
const remoteDirStore = useRemoteDirectoryStore()

const searchQuery = ref('')
const showAddDialog = ref(false)
const deleteTarget = ref<string | null>(null)
const editingConnection = ref<SSHConnectionConfig | null>(null)
const activeView = ref<'connections' | 'directory'>('connections')

const browsingConnectionId = computed(() => terminalStore.activeSession?.connectionId ?? null)

watch(browsingConnectionId, (id) => {
  remoteDirStore.setActiveConnection(id)
  if (id && connectionStore.connectionStatuses.get(id) === 'connected') {
    remoteDirStore.loadRoot(id)
  }
})

const deleteTargetName = computed(() => {
  if (!deleteTarget.value) return ''
  const conn = connectionStore.connections.find(c => c.id === deleteTarget.value)
  return conn?.name || ''
})

const filteredInternal = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return connectionStore.internalConnections
  return connectionStore.internalConnections.filter(
    (c) => c.name.toLowerCase().includes(q) || c.host.toLowerCase().includes(q)
  )
})

const filteredExternal = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return connectionStore.externalConnections
  return connectionStore.externalConnections.filter(
    (c) => c.name.toLowerCase().includes(q) || c.host.toLowerCase().includes(q)
  )
})

async function handleConnect(connectionId: string) {
  try {
    await connectionStore.connect(connectionId)
    await terminalStore.openTerminal(connectionId, connectionStore.activeConnection?.name || '')
    await window.ofteenAPI.monitor.start(connectionId)
  } catch (err) {
    console.error('连接失败:', err)
  }
}

async function handleDisconnect(connectionId: string) {
  try {
    await window.ofteenAPI.monitor.stop(connectionId)
    await connectionStore.disconnect(connectionId)
    monitorStore.clearMonitorData(connectionId)
  } catch (err) {
    console.error('断开失败:', err)
  }
}

function handleEdit(connectionId: string) {
  const conn = connectionStore.connections.find(c => c.id === connectionId)
  if (conn) {
    editingConnection.value = conn
  }
  showAddDialog.value = true
}

function handleDialogClose() {
  showAddDialog.value = false
  editingConnection.value = null
}

function handleDelete(connectionId: string) {
  deleteTarget.value = connectionId
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  const id = deleteTarget.value
  deleteTarget.value = null

  try {
    // 关闭关联的终端会话
    const sessions = terminalStore.orderedSessions.filter(s => s.connectionId === id)
    for (const session of sessions) {
      await terminalStore.closeTerminal(session.id)
    }

    // 如果已连接，先断开
    const status = connectionStore.connectionStatuses.get(id)
    if (status === 'connected' || status === 'connecting' || status === 'reconnecting') {
      try {
        await window.ofteenAPI.monitor.stop(id)
      } catch {
        // 忽略停止监控失败
      }
      try {
        await connectionStore.disconnect(id)
      } catch {
        // 忽略断开失败
      }
      monitorStore.clearMonitorData(id)
    }
    // 删除连接（同时删除本地存储和凭证）
    await connectionStore.deleteConnection(id)
  } catch (err) {
    console.error('删除失败:', err)
  }
}

async function handleSave(config: any, credential?: any, isEditing?: boolean) {
  try {
    if (isEditing) {
      // 编辑模式：更新连接配置和凭证
      await connectionStore.updateConnection(config.id, config)
      if (credential && (credential.password || credential.passphrase)) {
        await window.ofteenAPI.credential.save(config.id, credential)
      }
      await connectionStore.loadConnections()
    } else {
      // 新建模式
      await connectionStore.addConnection(config, credential)
    }
    showAddDialog.value = false
    editingConnection.value = null
  } catch (err) {
    console.error('保存失败:', err)
  }
}

// 监听 SSH 状态变更已在 App.vue 中统一处理

onMounted(async () => {
  // 连接列表已在 App.vue 中加载，这里不再重复加载
})
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-view-tabs {
  display: flex;
  padding: var(--spacing-md) var(--spacing-lg) 0;
  gap: 2px;
  border-bottom: 1px solid var(--border-primary);
}

.view-tab {
  flex: 1;
  padding: 6px 4px;
  font-size: var(--text-xs);
  color: var(--fg-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-tab:hover {
  color: var(--fg-secondary);
  background: var(--bg-hover);
}

.view-tab.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
  background: rgba(122, 162, 247, 0.08);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
}

.sidebar-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--fg-primary);
}

.sidebar-search {
  padding: 0 var(--spacing-lg) var(--spacing-md);
}

.sidebar-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin: 0 var(--spacing-md) var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(247, 118, 142, 0.1);
  border: 1px solid rgba(247, 118, 142, 0.3);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--accent-danger);
}

.error-close {
  margin-left: auto;
  color: var(--accent-danger);
  flex-shrink: 0;
}

/* 删除确认弹窗 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.confirm-dialog {
  width: 380px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.confirm-header h3 {
  font-size: var(--text-lg);
  color: var(--fg-primary);
}

.confirm-text {
  font-size: var(--text-md);
  color: var(--fg-secondary);
  line-height: 1.6;
  margin-bottom: var(--spacing-lg);
}

.confirm-footer {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn:hover {
  background: var(--bg-hover);
  color: var(--fg-primary);
}

.btn-danger {
  background: var(--accent-danger);
  border-color: var(--accent-danger);
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
  color: white;
}
</style>
