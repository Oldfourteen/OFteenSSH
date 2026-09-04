<template>
  <div class="memory-usage">
    <h4 class="panel-title">内存使用</h4>
    <div v-if="memoryData" class="memory-content">
      <div class="memory-gauge">
        <div class="gauge-circle" :style="{ '--percent': memoryData.usagePercent }">
          <span class="gauge-value">{{ memoryData.usagePercent.toFixed(1) }}%</span>
        </div>
      </div>
      <div class="memory-detail">
        <div class="detail-row">
          <span class="detail-label">总计</span>
          <span class="detail-value">{{ formatSize(memoryData.total) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">已用</span>
          <span class="detail-value">{{ formatSize(memoryData.used) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">可用</span>
          <span class="detail-value">{{ formatSize(memoryData.available) }}</span>
        </div>
      </div>
    </div>
    <div v-else class="memory-empty">未连接</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useMonitorStore } from '@/stores/monitor'

const props = defineProps<{
  connectionId: string | null
}>()

const monitorStore = useMonitorStore()
let unsubscribe: (() => void) | null = null

const memoryData = computed(() => {
  if (!props.connectionId) return null
  const data = monitorStore.getMonitorData(props.connectionId)
  return data?.memory || null
})

onMounted(() => {
  unsubscribe = window.ofteenAPI.monitor.onData((data: any) => {
    monitorStore.updateMonitorData(data)
  })
})

onUnmounted(() => {
  unsubscribe?.()
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}
</script>

<style scoped>
.memory-usage {
  margin-bottom: var(--spacing-md);
}

.panel-title {
  font-size: var(--text-sm);
  color: var(--fg-muted);
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
}

.memory-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.memory-gauge {
  flex-shrink: 0;
}

.gauge-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: conic-gradient(
    var(--accent-primary) calc(var(--percent) * 1%),
    var(--bg-tertiary) calc(var(--percent) * 1%)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.gauge-circle::before {
  content: '';
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--bg-secondary);
}

.gauge-value {
  position: relative;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--fg-primary);
}

.memory-detail {
  flex: 1;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
}

.detail-label {
  font-size: var(--text-xs);
  color: var(--fg-muted);
}

.detail-value {
  font-size: var(--text-xs);
  color: var(--fg-secondary);
}

.memory-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  color: var(--fg-muted);
  font-size: var(--text-sm);
}
</style>
