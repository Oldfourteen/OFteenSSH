<template>
  <div class="terminal-tab-bar">
    <div
      v-for="session in sessions"
      :key="session.id"
      class="tab"
      :class="{ active: session.id === activeSessionId }"
      @click="$emit('select', session.id)"
    >
      <span class="tab-name">{{ session.name }}</span>
      <button class="tab-close" @click.stop="$emit('close', session.id)">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TerminalSessionState } from '@/stores/terminal'

defineProps<{
  sessions: TerminalSessionState[]
  activeSessionId: string
}>()

defineEmits<{
  select: [sessionId: string]
  close: [sessionId: string]
}>()
</script>

<style scoped>
.terminal-tab-bar {
  display: flex;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  height: 36px;
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-md);
  height: 36px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
  cursor: pointer;
  transition: background var(--transition-fast);
  white-space: nowrap;
}

.tab:hover {
  background: var(--bg-hover);
}

.tab.active {
  background: var(--bg-primary);
  border-bottom: 2px solid var(--accent-primary);
}

.tab-name {
  font-size: var(--text-sm);
  color: var(--fg-secondary);
}

.tab.active .tab-name {
  color: var(--fg-primary);
}

.tab-close {
  padding: 2px;
  background: transparent;
  border: none;
  color: var(--fg-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-close:hover {
  background: var(--accent-danger);
  color: white;
}
</style>
