<template>
  <div class="connection-group">
    <div class="group-header" @click="isExpanded = !isExpanded">
      <svg class="group-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <template v-if="icon === 'lan'">
          <rect x="1" y="4" width="6" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <rect x="9" y="4" width="6" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <line x1="7" y1="8" x2="9" y2="8" stroke="currentColor" stroke-width="1.5"/>
        </template>
        <template v-else>
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <line x1="8" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
        </template>
      </svg>
      <span class="group-title">{{ title }}</span>
      <span class="group-count">{{ connections.length }}</span>
      <svg class="expand-icon" :class="{ rotated: isExpanded }" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <polyline points="3,5 6,8 9,5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>

    <div class="group-content" v-show="isExpanded">
      <ConnectionItem
        v-for="conn in connections"
        :key="conn.id"
        :connection="conn"
        :status="connectionStore.connectionStatuses.get(conn.id) || 'idle'"
        @connect="$emit('connect', conn.id)"
        @disconnect="$emit('disconnect', conn.id)"
        @edit="$emit('edit', conn.id)"
        @delete="$emit('delete', conn.id)"
      />
      <div v-if="connections.length === 0" class="group-empty">
        暂无{{ title }}连接
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SSHConnectionConfig, ConnectionStatus } from '../../../shared/types'
import { useConnectionStore } from '@/stores/connection'
import ConnectionItem from './ConnectionItem.vue'

const props = defineProps<{
  title: string
  icon: string
  connections: SSHConnectionConfig[]
}>()

defineEmits<{
  connect: [connectionId: string]
  disconnect: [connectionId: string]
  edit: [connectionId: string]
  delete: [connectionId: string]
}>()

const connectionStore = useConnectionStore()
const isExpanded = ref(true)
</script>

<style scoped>
.connection-group {
  margin-bottom: var(--spacing-md);
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  cursor: pointer;
  user-select: none;
}

.group-header:hover {
  background: var(--bg-hover);
}

.group-icon {
  color: var(--fg-muted);
}

.group-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--fg-secondary);
  flex: 1;
}

.group-count {
  font-size: var(--text-xs);
  color: var(--fg-muted);
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: 8px;
}

.expand-icon {
  color: var(--fg-muted);
  transition: transform var(--transition-fast);
}

.expand-icon.rotated {
  transform: rotate(0deg);
}

.expand-icon:not(.rotated) {
  transform: rotate(-90deg);
}

.group-content {
  padding: var(--spacing-xs) var(--spacing-md);
}

.group-empty {
  padding: var(--spacing-lg) var(--spacing-md);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--fg-muted);
}
</style>
