<template>
  <div class="side-panel" :class="{ collapsed: isCollapsed }">
    <div class="side-panel-scroll" v-if="!isCollapsed">
      <div class="side-panel-content">
        <ConnectionStatus
          :connectionId="connectionStore.activeConnectionId"
          :status="connectionStore.activeConnectionStatus"
        />

        <div class="divider"></div>

        <NetworkSpeedChart
          :connectionId="connectionStore.activeConnectionId"
        />

        <div class="divider"></div>

        <MemoryUsage
          :connectionId="connectionStore.activeConnectionId"
        />

        <div class="divider"></div>

        <DiskUsage
          :connectionId="connectionStore.activeConnectionId"
        />

        <div class="divider"></div>

        <SystemInfo
          :connectionId="connectionStore.activeConnectionId"
        />

        <div class="divider"></div>

        <ProcessManager
          :connectionId="connectionStore.activeConnectionId"
        />

        <div class="divider"></div>

        <ThemeSelector />
      </div>
    </div>

    <button class="side-panel-toggle" @click="isCollapsed = !isCollapsed" :title="isCollapsed ? '展开面板' : '收起面板'">
      <svg v-if="isCollapsed" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polyline points="6,3 11,8 6,13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
      <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polyline points="10,3 5,8 10,13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import ConnectionStatus from '@/components/monitor/ConnectionStatus.vue'
import NetworkSpeedChart from '@/components/monitor/NetworkSpeedChart.vue'
import MemoryUsage from '@/components/monitor/MemoryUsage.vue'
import DiskUsage from '@/components/monitor/DiskUsage.vue'
import SystemInfo from '@/components/monitor/SystemInfo.vue'
import ProcessManager from '@/components/monitor/ProcessManager.vue'
import ThemeSelector from '@/components/theme/ThemeSelector.vue'

const connectionStore = useConnectionStore()
const isCollapsed = ref(false)
</script>

<style scoped>
.side-panel {
  width: var(--side-panel-width);
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  overflow: hidden;
  position: relative;
}

.side-panel.collapsed {
  width: 40px;
}

.side-panel-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.side-panel-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-right: none;
  border-radius: 6px 0 0 6px;
  color: var(--fg-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
  height: 32px;
  width: 28px;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
}

.side-panel-toggle:hover {
  color: var(--fg-primary);
  background: var(--bg-hover);
}

.side-panel-content {
  padding: var(--spacing-md);
}
</style>
