<template>
  <div class="bottom-dock">
    <div class="dock-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="dock-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="dock-body">
      <CommandInputPanel
        v-show="activeTab === 'input'"
        ref="commandPanelRef"
        :session-id="sessionId"
        @send="(cmd) => emit('send', cmd)"
        @tab="emit('tab')"
      />
      <ProcessGuardPanel
        v-show="activeTab === 'guard'"
        :visible="activeTab === 'guard'"
        :connection-id="connectionId"
      />
      <FirewallPanel
        v-show="activeTab === 'firewall'"
        :visible="activeTab === 'firewall'"
        :connection-id="connectionId"
      />
      <PortForwardPanel
        v-show="activeTab === 'forward'"
        :visible="activeTab === 'forward'"
        :connection-id="connectionId"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import CommandInputPanel from './panels/CommandInputPanel.vue'
import ProcessGuardPanel from './panels/ProcessGuardPanel.vue'
import FirewallPanel from './panels/FirewallPanel.vue'
import PortForwardPanel from './panels/PortForwardPanel.vue'
import './panels/panel-shared.css'

const props = defineProps<{
  connectionId: string
  sessionId: string
  active: boolean
}>()

const emit = defineEmits<{
  send: [command: string]
  tab: []
}>()

const tabs = [
  { id: 'input' as const, label: '命令输入' },
  { id: 'guard' as const, label: '进程守卫' },
  { id: 'firewall' as const, label: '防火墙' },
  { id: 'forward' as const, label: '端口转发' }
]

type TabId = (typeof tabs)[number]['id']
const activeTab = ref<TabId>('input')
const commandPanelRef = ref<InstanceType<typeof CommandInputPanel> | null>(null)

watch(
  () => props.active,
  (isActive) => {
    if (isActive && activeTab.value === 'input') {
      commandPanelRef.value?.focus()
    }
  }
)

defineExpose({
  focusInput: () => {
    activeTab.value = 'input'
    nextTick(() => {
      commandPanelRef.value?.focus()
    })
  }
})
</script>

<style scoped>
.bottom-dock {
  flex-shrink: 0;
  background: var(--bg-secondary);
  border-top: none;
  display: flex;
  flex-direction: column;
  min-height: 80px;
}

.dock-tabs {
  display: flex;
  gap: 2px;
  padding: 4px 8px 0;
  border-bottom: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.dock-tab {
  padding: 5px 12px;
  font-size: 11px;
  color: var(--fg-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
  transition: all var(--transition-fast);
}

.dock-tab:hover {
  color: var(--fg-secondary);
  background: var(--bg-hover);
}

.dock-tab.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
  background: rgba(122, 162, 247, 0.08);
}

.dock-body {
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
