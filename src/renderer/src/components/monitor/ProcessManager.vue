<template>
  <div class="process-manager">
    <div class="pm-header">
      <h4 class="panel-title">进程管理</h4>
      <div class="pm-actions">
        <button
          class="icon-btn"
          title="刷新"
          :disabled="!isConnected || loading"
          @click="refresh()"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M12 7A5 5 0 1 1 7 2"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            />
            <path d="M7 0.5V3.5L9.5 2" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button
          class="icon-btn accent"
          title="启动进程"
          :disabled="!isConnected"
          @click="showStart = !showStart"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7h8M7 3v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="!connectionId" class="pm-empty">未连接</div>
    <div v-else-if="isConnecting" class="pm-empty subtle">连接中...</div>
    <div v-else-if="!isConnected" class="pm-empty">未连接</div>

    <template v-else>
      <div v-if="showStart" class="start-box">
        <input
          v-model="startCommand"
          class="start-input"
          type="text"
          placeholder="输入要后台启动的命令，如: nginx"
          @keydown.enter="doStart"
        />
        <div class="start-row">
          <button class="btn-sm primary" :disabled="!startCommand.trim() || acting" @click="doStart">
            启动
          </button>
          <button class="btn-sm" @click="showStart = false">取消</button>
        </div>
      </div>

      <input
        v-model="keyword"
        class="search-input"
        type="text"
        placeholder="搜索 PID / 用户 / 命令..."
      />

      <div class="sort-row">
        <button
          class="sort-btn"
          :class="{ active: sortBy === 'cpu' }"
          @click="sortBy = 'cpu'"
        >
          CPU
        </button>
        <button
          class="sort-btn"
          :class="{ active: sortBy === 'mem' }"
          @click="sortBy = 'mem'"
        >
          内存
        </button>
        <button
          class="sort-btn"
          :class="{ active: sortBy === 'pid' }"
          @click="sortBy = 'pid'"
        >
          PID
        </button>
        <span class="proc-count">{{ filtered.length }} 个</span>
      </div>

      <div v-if="error" class="pm-error">{{ error }}</div>
      <div v-if="toast" class="pm-toast" :class="toast.type">{{ toast.text }}</div>

      <div class="proc-list" v-if="filtered.length > 0">
        <div
          v-for="proc in filtered"
          :key="proc.pid"
          class="proc-row"
          :title="proc.command"
        >
          <div class="proc-main">
            <div class="proc-top">
              <span class="proc-pid">{{ proc.pid }}</span>
              <span class="proc-user">{{ proc.user }}</span>
              <span v-if="proc.state" class="proc-state">{{ proc.state }}</span>
            </div>
            <div class="proc-cmd">{{ shortCmd(proc.command) }}</div>
            <div class="proc-metrics">
              <span>CPU {{ proc.cpuPercent.toFixed(1) }}%</span>
              <span>MEM {{ proc.memPercent.toFixed(1) }}%</span>
            </div>
          </div>
          <div class="proc-ops">
            <button
              class="btn-sm danger"
              title="优雅结束 (SIGTERM)"
              :disabled="actingPid === proc.pid || isProtected(proc.pid)"
              @click="doKill(proc.pid, 'TERM')"
            >
              结束
            </button>
            <button
              class="btn-sm danger-outline"
              title="强制结束 (SIGKILL)"
              :disabled="actingPid === proc.pid || isProtected(proc.pid)"
              @click="doKill(proc.pid, 'KILL')"
            >
              强杀
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="pm-empty subtle">
        {{ keyword ? '无匹配进程' : '暂无进程数据' }}
      </div>

      <div v-if="loading" class="pm-loading">加载中...</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { ProcessInfo, ProcessKillSignal } from '@shared/types'
import { useConnectionStore } from '@/stores/connection'

const props = defineProps<{
  connectionId: string | null
}>()

const connectionStore = useConnectionStore()

const processes = ref<ProcessInfo[]>([])
const loading = ref(false)
const acting = ref(false)
const actingPid = ref<number | null>(null)
const error = ref('')
const keyword = ref('')
const sortBy = ref<'cpu' | 'mem' | 'pid'>('cpu')
const showStart = ref(false)
const startCommand = ref('')
const toast = ref<{ text: string; type: 'ok' | 'err' } | null>(null)

let toastTimer: ReturnType<typeof setTimeout> | null = null
let autoTimer: ReturnType<typeof setInterval> | null = null

const isConnected = computed(() => {
  if (!props.connectionId) return false
  return connectionStore.connectionStatuses.get(props.connectionId) === 'connected'
})

const isConnecting = computed(() => {
  if (!props.connectionId) return false
  const s = connectionStore.connectionStatuses.get(props.connectionId)
  return s === 'connecting' || s === 'reconnecting'
})

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  let list = processes.value
  if (q) {
    list = list.filter(
      (p) =>
        String(p.pid).includes(q) ||
        p.user.toLowerCase().includes(q) ||
        p.command.toLowerCase().includes(q)
    )
  }
  const sorted = [...list]
  if (sortBy.value === 'cpu') {
    sorted.sort((a, b) => b.cpuPercent - a.cpuPercent)
  } else if (sortBy.value === 'mem') {
    sorted.sort((a, b) => b.memPercent - a.memPercent)
  } else {
    sorted.sort((a, b) => a.pid - b.pid)
  }
  return sorted
})

watch(
  [() => props.connectionId, isConnected],
  ([id, connected]) => {
    stopAuto()
    error.value = ''
    keyword.value = ''
    showStart.value = false

    if (!id) {
      processes.value = []
      return
    }

    if (!connected) {
      // 连接中/断开时不清空已有列表（避免闪烁），也不去请求
      if (!isConnecting.value) {
        processes.value = []
      }
      return
    }

    refresh()
    startAuto()
  },
  { immediate: true }
)

onUnmounted(() => {
  stopAuto()
  if (toastTimer) clearTimeout(toastTimer)
})

function startAuto(): void {
  stopAuto()
  autoTimer = setInterval(() => {
    if (!loading.value && !acting.value && isConnected.value) refresh(true)
  }, 8000)
}

function stopAuto(): void {
  if (autoTimer) {
    clearInterval(autoTimer)
    autoTimer = null
  }
}

function isProtected(pid: number): boolean {
  return pid <= 1
}

function shortCmd(cmd: string): string {
  if (cmd.length <= 42) return cmd
  return cmd.slice(0, 40) + '…'
}

function showToast(text: string, type: 'ok' | 'err'): void {
  toast.value = { text, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 2800)
}

async function refresh(silent = false): Promise<void> {
  if (!props.connectionId) return
  // 未真正连上时不请求，避免误报「SSH 未连接」
  if (!isConnected.value) {
    if (!silent && isConnecting.value) {
      // 连接过程中保持安静
      return
    }
    if (!silent) error.value = ''
    return
  }

  const api = window.ofteenAPI?.proc
  if (!api?.list) {
    error.value = '进程 API 未就绪，请完全重启应用后再试'
    return
  }
  if (!silent) loading.value = true
  try {
    const result = await api.list(props.connectionId, 100)
    if (result.success) {
      processes.value = result.processes
      error.value = ''
    } else if (!silent) {
      // 真正连着时若偶发失败，显示具体错误，不再用「未连接」误导
      error.value = result.message || '获取进程失败'
    }
  } catch (err) {
    if (!silent) error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

async function doKill(pid: number, signal: ProcessKillSignal): Promise<void> {
  if (!props.connectionId || !isConnected.value || isProtected(pid)) return
  const api = window.ofteenAPI?.proc
  if (!api?.kill) {
    showToast('进程 API 未就绪，请完全重启应用', 'err')
    return
  }

  const label = signal === 'KILL' ? '强制结束' : '结束'
  const ok = window.confirm(`${label}进程 PID ${pid}？`)
  if (!ok) return

  acting.value = true
  actingPid.value = pid
  try {
    const result = await api.kill(props.connectionId, pid, signal)
    if (result.success) {
      showToast(result.message || '操作成功', 'ok')
      processes.value = processes.value.filter((p) => p.pid !== pid)
      setTimeout(() => refresh(true), 600)
    } else {
      showToast(result.message || '操作失败', 'err')
    }
  } catch (err) {
    showToast((err as Error).message, 'err')
  } finally {
    acting.value = false
    actingPid.value = null
  }
}

async function doStart(): Promise<void> {
  if (!props.connectionId || !isConnected.value) return
  const cmd = startCommand.value.trim()
  if (!cmd) return
  const api = window.ofteenAPI?.proc
  if (!api?.start) {
    showToast('进程 API 未就绪，请完全重启应用', 'err')
    return
  }

  acting.value = true
  try {
    const result = await api.start(props.connectionId, cmd)
    if (result.success) {
      showToast(result.message || '已启动', 'ok')
      startCommand.value = ''
      showStart.value = false
      setTimeout(() => refresh(true), 800)
    } else {
      showToast(result.message || '启动失败', 'err')
    }
  } catch (err) {
    showToast((err as Error).message, 'err')
  } finally {
    acting.value = false
  }
}
</script>

<style scoped>
.process-manager {
  margin-bottom: var(--spacing-md);
}

.pm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.panel-title {
  font-size: var(--text-sm);
  color: var(--fg-muted);
  font-weight: 600;
  margin: 0;
}

.pm-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--fg-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.icon-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--fg-primary);
}

.icon-btn.accent {
  color: var(--accent-success);
  border-color: rgba(158, 206, 106, 0.35);
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.start-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
}

.start-input,
.search-input {
  width: 100%;
  padding: 6px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  color: var(--fg-primary);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  outline: none;
}

.start-input:focus,
.search-input:focus {
  border-color: var(--accent-primary);
}

.start-row {
  display: flex;
  gap: 6px;
}

.search-input {
  margin-bottom: var(--spacing-sm);
}

.sort-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: var(--spacing-sm);
}

.sort-btn {
  padding: 2px 8px;
  font-size: 10px;
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  background: transparent;
  color: var(--fg-muted);
  cursor: pointer;
}

.sort-btn.active {
  color: var(--accent-primary);
  border-color: rgba(122, 162, 247, 0.45);
  background: rgba(122, 162, 247, 0.1);
}

.proc-count {
  margin-left: auto;
  font-size: 10px;
  color: var(--fg-muted);
}

.proc-list {
  max-height: 320px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 2px;
}

.proc-row {
  display: flex;
  gap: 6px;
  padding: 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
}

.proc-main {
  flex: 1;
  min-width: 0;
}

.proc-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.proc-pid {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--accent-info);
  font-weight: 600;
}

.proc-user {
  font-size: 10px;
  color: var(--fg-muted);
}

.proc-state {
  font-size: 10px;
  color: var(--accent-warning);
  font-family: var(--font-mono);
}

.proc-cmd {
  font-size: var(--text-xs);
  color: var(--fg-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-mono);
}

.proc-metrics {
  display: flex;
  gap: 10px;
  margin-top: 4px;
  font-size: 10px;
  color: var(--fg-muted);
}

.proc-ops {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.btn-sm {
  padding: 3px 8px;
  font-size: 10px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--fg-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.btn-sm:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--fg-primary);
}

.btn-sm.primary {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #1a1b26;
}

.btn-sm.danger {
  color: var(--accent-danger);
  border-color: rgba(247, 118, 142, 0.35);
}

.btn-sm.danger:hover:not(:disabled) {
  background: rgba(247, 118, 142, 0.12);
}

.btn-sm.danger-outline {
  color: var(--accent-danger);
  border-color: transparent;
  background: transparent;
  opacity: 0.75;
}

.btn-sm:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pm-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  color: var(--fg-muted);
  font-size: var(--text-sm);
}

.pm-empty.subtle {
  padding: var(--spacing-md);
  font-size: var(--text-xs);
}

.pm-error {
  font-size: var(--text-xs);
  color: var(--accent-danger);
  margin-bottom: var(--spacing-sm);
}

.pm-toast {
  font-size: var(--text-xs);
  margin-bottom: var(--spacing-sm);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.pm-toast.ok {
  color: var(--accent-success);
  background: rgba(158, 206, 106, 0.1);
}

.pm-toast.err {
  color: var(--accent-danger);
  background: rgba(247, 118, 142, 0.1);
}

.pm-loading {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--fg-muted);
  padding: var(--spacing-sm) 0;
}
</style>
