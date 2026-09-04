<template>
  <div class="panel">
    <div class="panel-toolbar">
      <span class="status-pill" :class="{ on: status?.active }">
        {{ status?.backend || '-' }} · {{ status?.active ? '已启用' : '未启用' }}
      </span>
      <button class="btn-sm" :disabled="!connectionId || busy" @click="refresh">刷新</button>
      <button class="btn-sm primary" :disabled="!connectionId || busy || status?.backend !== 'ufw'" @click="enable">启用</button>
      <button class="btn-sm" :disabled="!connectionId || busy || status?.backend !== 'ufw'" @click="disable">停用</button>
      <input v-model="port" class="field" placeholder="端口 如 80" style="width:88px" />
      <select v-model="proto" class="field" style="width:72px">
        <option value="tcp">tcp</option>
        <option value="udp">udp</option>
        <option value="any">any</option>
      </select>
      <button class="btn-sm primary" :disabled="!connectionId || !port.trim() || busy || status?.backend !== 'ufw'" @click="allow">放行</button>
    </div>
    <div v-if="hint" class="hint" :class="hint.type">{{ hint.text }}</div>
    <div class="list" v-if="status?.rules?.length">
      <div v-for="rule in status.rules" :key="rule.id" class="row">
        <div class="main">
          <div class="title-line">
            <span class="meta" v-if="rule.number">#{{ rule.number }}</span>
            <strong>{{ rule.action || 'rule' }}</strong>
            <span class="meta" v-if="rule.port">{{ rule.port }}</span>
          </div>
          <div class="sub">{{ rule.raw }}</div>
        </div>
        <div class="ops" v-if="status.backend === 'ufw' && rule.number">
          <button class="btn-sm danger" @click="deleteRule(rule.number!)">删除</button>
        </div>
      </div>
    </div>
    <div v-else class="empty">
      {{ status?.message || '暂无规则。放行/启停目前主要支持 UFW。' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FirewallStatus } from '@shared/types'

const props = defineProps<{
  connectionId: string
  visible: boolean
}>()

const status = ref<FirewallStatus | null>(null)
const busy = ref(false)
const port = ref('')
const proto = ref<'tcp' | 'udp' | 'any'>('tcp')
const hint = ref<{ text: string; type: 'ok' | 'err' } | null>(null)

watch(
  [() => props.connectionId, () => props.visible],
  () => {
    if (props.visible) refresh()
  },
  { immediate: true }
)

async function refresh(): Promise<void> {
  if (!props.connectionId || !window.ofteenAPI?.firewall) return
  busy.value = true
  try {
    status.value = await window.ofteenAPI.firewall.status(props.connectionId)
    if (!status.value.success && status.value.message) {
      hint.value = { text: status.value.message, type: 'err' }
    }
  } catch (err) {
    hint.value = { text: (err as Error).message, type: 'err' }
  } finally {
    busy.value = false
  }
}

async function enable(): Promise<void> {
  busy.value = true
  try {
    const r = await window.ofteenAPI.firewall.enable(props.connectionId)
    hint.value = { text: r.message || (r.success ? '已启用' : '失败'), type: r.success ? 'ok' : 'err' }
    await refresh()
  } finally {
    busy.value = false
  }
}

async function disable(): Promise<void> {
  if (!window.confirm('停用防火墙可能导致端口暴露，确认？')) return
  busy.value = true
  try {
    const r = await window.ofteenAPI.firewall.disable(props.connectionId)
    hint.value = { text: r.message || (r.success ? '已停用' : '失败'), type: r.success ? 'ok' : 'err' }
    await refresh()
  } finally {
    busy.value = false
  }
}

async function allow(): Promise<void> {
  busy.value = true
  try {
    const r = await window.ofteenAPI.firewall.allow(props.connectionId, port.value.trim(), proto.value)
    hint.value = { text: r.message || (r.success ? '已放行' : '失败'), type: r.success ? 'ok' : 'err' }
    if (r.success) port.value = ''
    await refresh()
  } finally {
    busy.value = false
  }
}

async function deleteRule(ruleNumber: number): Promise<void> {
  if (!window.confirm(`删除防火墙规则 #${ruleNumber}？`)) return
  busy.value = true
  try {
    const r = await window.ofteenAPI.firewall.deleteRule(props.connectionId, ruleNumber)
    hint.value = { text: r.message || (r.success ? '已删除' : '失败'), type: r.success ? 'ok' : 'err' }
    await refresh()
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.status-pill {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--fg-muted);
  border: 1px solid var(--border-primary);
}

.status-pill.on {
  color: var(--accent-success);
  border-color: rgba(158, 206, 106, 0.35);
  background: rgba(158, 206, 106, 0.1);
}
</style>
