<template>
  <div class="system-info">
    <div class="si-header">
      <h4 class="panel-title">系统信息</h4>
      <button
        v-if="systemData"
        class="copy-btn"
        :class="{ copied }"
        :title="copied ? '已复制' : '一键复制系统信息'"
        @click="copyAll"
      >
        <svg v-if="!copied" width="13" height="13" viewBox="0 0 14 14" fill="none">
          <rect x="4.5" y="4.5" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.3"/>
          <path d="M2.5 9.5V3.5a1 1 0 0 1 1-1h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <svg v-else width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M3 7.5L6 10.5L11 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ copied ? '已复制' : '复制' }}</span>
      </button>
    </div>

    <div v-if="systemData" class="info-content">
      <div class="info-row">
        <span class="info-label">主机名</span>
        <span class="info-value">{{ systemData.hostname }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">操作系统</span>
        <span class="info-value">{{ systemData.os }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">内核</span>
        <span class="info-value">{{ systemData.kernel }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">架构</span>
        <span class="info-value">{{ systemData.arch }}</span>
      </div>
      <div class="info-row" v-if="cpuInfo">
        <span class="info-label">CPU</span>
        <span class="info-value">{{ cpuInfo.modelName }} ({{ cpuInfo.cores }}核)</span>
      </div>
      <div class="info-row" v-if="cpuInfo">
        <span class="info-label">负载</span>
        <span class="info-value">{{ cpuInfo.load1.toFixed(2) }} / {{ cpuInfo.load5.toFixed(2) }} / {{ cpuInfo.load15.toFixed(2) }}</span>
      </div>
    </div>
    <div v-else class="info-empty">未连接</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { useMonitorStore } from '@/stores/monitor'

const props = defineProps<{
  connectionId: string | null
}>()

const monitorStore = useMonitorStore()
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const systemData = computed(() => {
  if (!props.connectionId) return null
  const data = monitorStore.getMonitorData(props.connectionId)
  return data?.system || null
})

const cpuInfo = computed(() => {
  if (!props.connectionId) return null
  const data = monitorStore.getMonitorData(props.connectionId)
  return data?.cpu || null
})

const copyText = computed(() => {
  const sys = systemData.value
  if (!sys) return ''
  const lines = [
    `主机名: ${sys.hostname || '-'}`,
    `操作系统: ${sys.os || '-'}`,
    `内核: ${sys.kernel || '-'}`,
    `架构: ${sys.arch || '-'}`
  ]
  if (cpuInfo.value) {
    lines.push(`CPU: ${cpuInfo.value.modelName} (${cpuInfo.value.cores}核)`)
    lines.push(
      `负载: ${cpuInfo.value.load1.toFixed(2)} / ${cpuInfo.value.load5.toFixed(2)} / ${cpuInfo.value.load15.toFixed(2)}`
    )
  }
  return lines.join('\n')
})

onUnmounted(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})

async function copyAll(): Promise<void> {
  const text = copyText.value
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 1800)
  } catch (err) {
    console.error('复制失败:', err)
  }
}
</script>

<style scoped>
.system-info {
  margin-bottom: var(--spacing-md);
}

.si-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.panel-title {
  font-size: var(--text-sm);
  color: var(--fg-muted);
  font-weight: 600;
  margin: 0;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 10px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--fg-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  user-select: none;
}

.copy-btn:hover {
  color: var(--fg-primary);
  background: var(--bg-hover);
  border-color: var(--border-secondary);
}

.copy-btn.copied {
  color: var(--accent-success);
  border-color: rgba(158, 206, 106, 0.4);
  background: rgba(158, 206, 106, 0.1);
}

.info-content {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.info-label {
  font-size: var(--text-xs);
  color: var(--fg-muted);
  min-width: 60px;
  flex-shrink: 0;
}

.info-value {
  font-size: var(--text-xs);
  color: var(--fg-secondary);
  text-align: right;
  word-break: break-all;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.info-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  color: var(--fg-muted);
  font-size: var(--text-sm);
}
</style>
