<template>
  <div class="panel">
    <div class="panel-toolbar">
      <input v-model="form.name" class="field" placeholder="名称" />
      <input v-model="form.match" class="field grow" placeholder="匹配 (pgrep -f)" />
      <input v-model="form.startCommand" class="field grow" placeholder="启动命令" />
      <button class="btn-sm primary" :disabled="!canAdd || busy" @click="addRule">添加</button>
      <button class="btn-sm" :disabled="!connectionId || busy" @click="refresh">刷新</button>
    </div>
    <div v-if="hint" class="hint" :class="hint.type">{{ hint.text }}</div>
    <div class="list" v-if="rules.length">
      <div v-for="rule in rules" :key="rule.id" class="row">
        <div class="main">
          <div class="title-line">
            <strong>{{ rule.name }}</strong>
            <span class="badge" :class="rule.status">{{ statusLabel(rule.status) }}</span>
            <span class="meta" v-if="rule.lastPid">PID {{ rule.lastPid }}</span>
            <span class="meta">重启 {{ rule.restartCount }}</span>
          </div>
          <div class="sub">匹配: {{ rule.match }}</div>
          <div class="sub">启动: {{ rule.startCommand }}</div>
          <div class="sub muted" v-if="rule.lastMessage">{{ rule.lastMessage }}</div>
        </div>
        <div class="ops">
          <button class="btn-sm" @click="toggle(rule)">{{ rule.enabled ? '暂停' : '启用' }}</button>
          <button class="btn-sm danger" @click="remove(rule.id)">删除</button>
        </div>
      </div>
    </div>
    <div v-else class="empty">暂无守卫规则。进程退出后会按匹配自动拉起。</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { ProcessGuardRule } from '@shared/types'

const props = defineProps<{
  connectionId: string
  visible: boolean
}>()

const rules = ref<ProcessGuardRule[]>([])
const busy = ref(false)
const hint = ref<{ text: string; type: 'ok' | 'err' } | null>(null)
const form = reactive({ name: '', match: '', startCommand: '' })

const canAdd = computed(
  () => Boolean(props.connectionId && form.match.trim() && form.startCommand.trim())
)

watch(
  [() => props.connectionId, () => props.visible],
  () => {
    if (props.visible) refresh()
  },
  { immediate: true }
)

function statusLabel(s: ProcessGuardRule['status']): string {
  const map = { running: '运行中', stopped: '已停止', restarting: '拉起中', unknown: '未知' }
  return map[s] || s
}

async function refresh(): Promise<void> {
  if (!props.connectionId || !window.ofteenAPI?.guard) return
  busy.value = true
  try {
    rules.value = await window.ofteenAPI.guard.checkNow(props.connectionId)
  } catch (err) {
    hint.value = { text: (err as Error).message, type: 'err' }
  } finally {
    busy.value = false
  }
}

async function addRule(): Promise<void> {
  if (!canAdd.value) return
  busy.value = true
  try {
    await window.ofteenAPI.guard.add(props.connectionId, {
      name: form.name.trim() || form.match.trim(),
      match: form.match.trim(),
      startCommand: form.startCommand.trim(),
      enabled: true
    })
    form.name = ''
    form.match = ''
    form.startCommand = ''
    hint.value = { text: '已添加守卫', type: 'ok' }
    await refresh()
  } catch (err) {
    hint.value = { text: (err as Error).message, type: 'err' }
  } finally {
    busy.value = false
  }
}

async function toggle(rule: ProcessGuardRule): Promise<void> {
  await window.ofteenAPI.guard.update(rule.id, { enabled: !rule.enabled })
  await refresh()
}

async function remove(id: string): Promise<void> {
  if (!window.confirm('删除该守卫规则？')) return
  await window.ofteenAPI.guard.remove(id)
  await refresh()
}
</script>

