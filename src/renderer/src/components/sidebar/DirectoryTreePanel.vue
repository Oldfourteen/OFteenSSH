<template>
  <div class="directory-tree-panel">
    <div class="tree-header">
      <div class="tree-title">
        <span class="connection-name">{{ connectionName || '未连接' }}</span>
      </div>
      <button
        v-if="canRefresh"
        class="btn-icon"
        title="刷新根目录"
        @click="refresh"
        :disabled="tree?.loading"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1.5V4.5M7 4.5L5 2.5M7 4.5L9 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 12.5V9.5M7 9.5L5 11.5M7 9.5L9 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M1.5 7H12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="tree-body">
      <div v-if="!connectionId" class="tree-empty-state">
        <svg width="32" height="32" viewBox="0 0 14 14" fill="none">
          <path d="M1.5 2.5C1.5 1.94772 1.94772 1.5 2.5 1.5H5.5L7 3H11.5C12.0523 3 12.5 3.44772 12.5 4V10.5C12.5 11.0523 12.0523 11.5 11.5 11.5H2.5C1.94772 11.5 1.5 11.0523 1.5 10.5V2.5Z" fill="rgba(150,160,180,0.1)" stroke="var(--fg-muted)" stroke-width="1"/>
        </svg>
        <p>请先在终端中连接服务器</p>
      </div>

      <div v-else-if="tree?.loading && tree.nodes.length === 0" class="tree-loading">
        <span class="tree-spinner"></span>
        <span>正在加载目录...</span>
      </div>

      <div v-else-if="tree?.error && tree.nodes.length === 0" class="tree-error-state">
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="var(--accent-danger)" stroke-width="1.5" fill="none"/>
          <line x1="7" y1="4" x2="7" y2="7.5" stroke="var(--accent-danger)" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="7" cy="9.5" r="0.5" fill="var(--accent-danger)"/>
        </svg>
        <span>{{ tree.error }}</span>
      </div>

      <div v-else class="tree-nodes">
        <DirectoryTreeNode
          v-for="node in tree?.nodes"
          :key="node.path"
          :node="node"
          :depth="0"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRemoteDirectoryStore } from '@/stores/remote-directory'
import { useConnectionStore } from '@/stores/connection'
import DirectoryTreeNode from './DirectoryTreeNode.vue'

const props = defineProps<{
  connectionId: string | null
}>()

const remoteDirStore = useRemoteDirectoryStore()
const connectionStore = useConnectionStore()

const tree = computed(() =>
  props.connectionId ? remoteDirStore.connectionTrees.get(props.connectionId) || null : null
)

const connectionName = computed(() => {
  if (!props.connectionId) return ''
  const conn = connectionStore.connections.find((c) => c.id === props.connectionId)
  return conn?.name || ''
})

const canRefresh = computed(() => !!props.connectionId)

function refresh() {
  if (!props.connectionId) return
  remoteDirStore.loadRoot(props.connectionId)
}
</script>

<style scoped>
.directory-tree-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tree-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-secondary);
}

.tree-title {
  min-width: 0;
}

.connection-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--fg-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--fg-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.btn-icon:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--fg-primary);
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tree-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.tree-empty-state,
.tree-loading,
.tree-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--fg-muted);
}

.tree-error-state {
  color: var(--accent-danger);
  align-items: flex-start;
  text-align: left;
}

.tree-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--border-primary);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.tree-nodes {
  padding: var(--spacing-xs) 0;
}
</style>
