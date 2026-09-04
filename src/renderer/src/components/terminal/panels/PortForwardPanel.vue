<template>
  <div class="panel">
    <div class="panel-toolbar">
      <select v-model="form.type" class="field" style="width:88px">
        <option value="local">本地转发</option>
        <option value="remote">远程转发</option>
      </select>
      <input v-model="form.name" class="field" placeholder="名称" style="width:90px" />
      <input v-model.number="form.localPort" class="field" placeholder="本地端口" style="width:84px" />
      <input v-model="form.remoteHost" class="field grow" placeholder="远端主机" />
      <input v-model.number="form.remotePort" class="field" placeholder="远端端口" style="width:84px" />
      <button class="btn-sm primary" :disabled="!canStart || busy" @click="start">启动</button>
      <button class="btn-sm" :disabled="!connectionId || busy" @click="refresh">刷新</button>
    </div>
    <div class="tip">
      本地转发：本机端口 → SSH → 远端主机:端口；远程转发：远端端口 → SSH → 本机端口
    </div>
    <div v-if="hint" class="hint" :class="hint.type">{{ hint.text }}</div>
    <div class="list" v-if="rules.length">
      <div v-for="rule in rules" :key="rule.id" class="row">
        <div class="main">
          <div class="title-line">
            <strong>{{ rule.name }}</strong>
            <span class="badge" :class="rule.active ? 'running' : 'stopped'">
              {{ rule.active ? '转发中' : '已停止' }}
            </span>
            <span class="meta">{{ rule.type === 'local' ? '本地' : '远程' }}</span>
          </div>
          <div class="sub">
            {{ rule.localHost }}:{{ rule.localPort }}
            ↔
            {{ rule.remoteHost }}:{{ rule.remotePort }}
          </div>
          <div class="sub muted" v-if="rule.message">{{ rule.message }}</div>
        </div>
        <div class="ops">
          <button v-if="rule.active" class="btn-sm" @click="stop(rule.id)">停止</button>
          <button class="btn-sm danger" @click="remove(rule.id)">移除</button>
        </div>
      </div>
    </div>
    <div v-else class="empty">暂无端口转发</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { PortForwardRule } from '@shared/types'

const props = defineProps<{
  connectionId: string
  visible: boolean
}>()

const rules = ref<PortForwardRule[]>([])
const busy = ref(false)
const hint = ref<{ text: string; type: 'ok' | 'err' } | null>(null)
const form = reactive({
  type: 'local' as 'local' | 'remote',
  name: '',
  localPort: 18080,
  remoteHost: '127.0.0.1',
  remotePort: 80
})

const canStart = computed(
  () =>
    Boolean(
      props.connectionId &&
        form.localPort > 0 &&
        form.remotePort > 0 &&
        form.remoteHost.trim()
    )
)

watch(
  [() => props.connectionId, () => props.visible],
  () => {
    if (props.visible) refresh()
  },
  { immediate: true }
)

async function refresh(): Promise<void> {
  if (!props.connectionId || !window.ofteenAPI?.forward) return
  try {
    rules.value = await window.ofteenAPI.forward.list(props.connectionId)
  } catch (err) {
    hint.value = { text: (err as Error).message, type: 'err' }
  }
}

async function start(): Promise<void> {
  if (!canStart.value) return
  busy.value = true
  try {
    const r = await window.ofteenAPI.forward.start({
      connectionId: props.connectionId,
      type: form.type,
      name: form.name.trim() || undefined,
      localPort: Number(form.localPort),
      remoteHost: form.remoteHost.trim(),
      remotePort: Number(form.remotePort)
    })
    hint.value = {
      text: r.message || (r.success ? '转发已启动' : '启动失败'),
      type: r.success ? 'ok' : 'err'
    }
    await refresh()
  } catch (err) {
    hint.value = { text: (err as Error).message, type: 'err' }
  } finally {
    busy.value = false
  }
}

async function stop(id: string): Promise<void> {
  const r = await window.ofteenAPI.forward.stop(id)
  hint.value = { text: r.message || (r.success ? '已停止' : '失败'), type: r.success ? 'ok' : 'err' }
  await refresh()
}

async function remove(id: string): Promise<void> {
  if (!window.confirm('移除该端口转发？')) return
  await window.ofteenAPI.forward.remove(id)
  await refresh()
}
</script>

<style scoped>
.tip {
  font-size: 10px;
  color: var(--fg-muted);
  line-height: 1.4;
}
</style>
