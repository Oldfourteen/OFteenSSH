<template>
  <div class="connection-status">
    <h4 class="panel-title">连接状态</h4>
    <div class="status-content" v-if="connectionId">
      <div class="status-indicator">
        <span :class="['status-dot', statusClass]"></span>
        <span class="status-text">{{ statusLabel }}</span>
      </div>
      <div class="status-detail">
        <span>{{ statusDetail }}</span>
      </div>
    </div>
    <div class="status-empty" v-else>
      未建立连接
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ConnectionStatus } from '../../../shared/types'

const props = defineProps<{
  connectionId: string | null
  status: ConnectionStatus
}>()

const statusClass = computed(() => {
  const classes: Record<ConnectionStatus, string> = {
    idle: 'idle',
    connecting: 'connecting',
    connected: 'connected',
    disconnected: 'disconnected',
    reconnecting: 'reconnecting',
    failed: 'failed'
  }
  return classes[props.status]
})

const statusLabel = computed(() => {
  const labels: Record<ConnectionStatus, string> = {
    idle: '空闲',
    connecting: '连接中',
    connected: '已连接',
    disconnected: '已断开',
    reconnecting: '重连中',
    failed: '连接失败'
  }
  return labels[props.status]
})

const statusDetail = computed(() => {
  if (props.status === 'connected') return 'SSH 连接正常，监控数据实时更新'
  if (props.status === 'reconnecting') return '正在尝试重新连接...'
  if (props.status === 'failed') return '请检查网络或认证信息'
  return ''
})
</script>

<style scoped>
.connection-status {
  margin-bottom: var(--spacing-md);
}

.panel-title {
  font-size: var(--text-sm);
  color: var(--fg-muted);
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.connected {
  background: var(--accent-success);
  animation: pulse 2s infinite;
}

.status-dot.connecting {
  background: var(--accent-info);
  animation: pulse 1s infinite;
}

.status-dot.reconnecting {
  background: var(--accent-warning);
  animation: pulse 1.5s infinite;
}

.status-dot.disconnected {
  background: var(--fg-muted);
}

.status-dot.failed {
  background: var(--accent-danger);
}

.status-dot.idle {
  background: var(--fg-subtle);
}

.status-text {
  font-size: var(--text-md);
  color: var(--fg-primary);
  font-weight: 500;
}

.status-detail {
  font-size: var(--text-xs);
  color: var(--fg-muted);
}

.status-empty {
  font-size: var(--text-sm);
  color: var(--fg-muted);
  text-align: center;
  padding: var(--spacing-lg);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
