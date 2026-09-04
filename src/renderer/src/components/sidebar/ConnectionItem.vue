<template>
  <div
    class="connection-item"
    :class="{ active: connection.id === connectionStore.activeConnectionId }"
    @click="$emit('connect', connection.id)"
  >
    <div class="item-color" :style="{ backgroundColor: connection.color || 'var(--accent-primary)' }"></div>

    <div class="item-info">
      <div class="item-name">{{ connection.name }}</div>
      <div class="item-detail">{{ connection.username }}@{{ connection.host }}:{{ connection.port }}</div>
    </div>

    <div class="item-status">
      <span :class="['badge', statusBadgeClass]">{{ statusText }}</span>
    </div>

    <div class="item-actions" @click.stop>
      <button
        v-if="status === 'connected'"
        class="btn-icon btn-action-danger"
        @click="$emit('disconnect', connection.id)"
        title="断开连接"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="3" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/>
          <line x1="4" y1="5.5" x2="8" y2="5.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="btn-icon" @click="$emit('edit', connection.id)" title="编辑">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8.5,1.5 L10.5,3.5 L3.5,10.5 L1.5,10.5 L1.5,8.5 Z" stroke="currentColor" stroke-width="1" fill="none"/>
        </svg>
      </button>
      <button
        class="btn-icon btn-action-danger"
        @click="$emit('delete', connection.id)"
        title="删除连接"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5,3 L3,10 L9,10 L9.5,3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <line x1="1.5" y1="3" x2="10.5" y2="3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M4.5,3 L4.5,1.5 L7.5,1.5 L7.5,3" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SSHConnectionConfig, ConnectionStatus } from '../../../shared/types'
import { useConnectionStore } from '@/stores/connection'

const props = defineProps<{
  connection: SSHConnectionConfig
  status: ConnectionStatus
}>()

defineEmits<{
  connect: [connectionId: string]
  disconnect: [connectionId: string]
  edit: [connectionId: string]
  delete: [connectionId: string]
}>()

const connectionStore = useConnectionStore()

const statusText = computed(() => {
  const texts: Record<ConnectionStatus, string> = {
    idle: '',
    connecting: '连接中',
    connected: '已连接',
    disconnected: '',
    reconnecting: '重连中',
    failed: '失败'
  }
  return texts[props.status]
})

const statusBadgeClass = computed(() => {
  const classes: Record<ConnectionStatus, string> = {
    idle: '',
    connecting: 'badge-info',
    connected: 'badge-success',
    disconnected: '',
    reconnecting: 'badge-warning',
    failed: 'badge-danger'
  }
  return classes[props.status]
})
</script>

<style scoped>
.connection-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.connection-item:hover {
  background: var(--bg-hover);
}

.connection-item.active {
  background: var(--bg-active);
}

.item-color {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: var(--text-md);
  color: var(--fg-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-detail {
  font-size: var(--text-xs);
  color: var(--fg-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-status {
  flex-shrink: 0;
}

.item-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity var(--transition-fast);
}

.connection-item:hover .item-actions {
  opacity: 1;
}

.btn-action-danger:hover {
  color: var(--accent-danger) !important;
  background: rgba(247, 118, 142, 0.1);
}
</style>
