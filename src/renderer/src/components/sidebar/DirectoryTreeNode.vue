<template>
  <div class="tree-node" :style="{ paddingLeft: depth * 14 + 'px' }">
    <div
      class="tree-row"
      :class="{ 'is-directory': isExpandable, expanded: node.expanded }"
      @click="handleClick"
    >
      <span class="tree-chevron">
        <svg v-if="isExpandable && !node.expanded" width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M3 2L7 5L3 8V2Z" fill="currentColor"/>
        </svg>
        <svg v-else-if="isExpandable && node.expanded" width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3L5 7L8 3H2Z" fill="currentColor"/>
        </svg>
      </span>
      <span class="tree-icon">
        <svg v-if="node.type === 'directory'" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1.5 2.5C1.5 1.94772 1.94772 1.5 2.5 1.5H5.5L7 3H11.5C12.0523 3 12.5 3.44772 12.5 4V10.5C12.5 11.0523 12.0523 11.5 11.5 11.5H2.5C1.94772 11.5 1.5 11.0523 1.5 10.5V2.5Z" fill="rgba(224, 175, 104, 0.25)" stroke="rgba(224, 175, 104, 0.8)" stroke-width="1"/>
        </svg>
        <svg v-else-if="node.type === 'symlink'" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 9L9 5M9 5H6M9 5V8" stroke="var(--accent-info)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else width="12" height="14" viewBox="0 0 12 14" fill="none">
          <path d="M1.5 1.5H7.5L10.5 4.5V12.5C10.5 12.7761 10.2761 13 10 13H2C1.72386 13 1.5 12.7761 1.5 12.5V1.5Z" fill="rgba(150, 160, 180, 0.15)" stroke="rgba(150, 160, 180, 0.5)" stroke-width="1"/>
          <path d="M7.5 1.5V4.5H10.5" stroke="rgba(150, 160, 180, 0.5)" stroke-width="1"/>
        </svg>
      </span>
      <span class="tree-label" :title="node.path">{{ node.name }}</span>
      <span v-if="node.loading" class="tree-spinner"></span>
    </div>

    <div v-if="node.expanded" class="tree-children">
      <DirectoryTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
      />
      <div v-if="node.error" class="tree-error">{{ node.error }}</div>
      <div v-else-if="node.children.length === 0 && !node.loading" class="tree-empty">空目录</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRemoteDirectoryStore, RemoteDirectoryNode } from '@/stores/remote-directory'

const props = defineProps<{
  node: RemoteDirectoryNode
  depth: number
}>()

const remoteDirStore = useRemoteDirectoryStore()

const isExpandable = computed(() => {
  return props.node.type === 'directory' || props.node.type === 'symlink'
})

function handleClick() {
  if (!isExpandable.value) return
  // 通过 store 根据当前活跃连接切换展开/折叠
  const connectionId = remoteDirStore.activeConnectionId
  if (!connectionId) return
  remoteDirStore.toggleNode(connectionId, props.node.path)
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px 4px 8px;
  font-size: var(--text-xs);
  color: var(--fg-secondary);
  cursor: default;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.tree-row.is-directory {
  cursor: pointer;
}

.tree-row:hover {
  background: var(--bg-hover);
  color: var(--fg-primary);
}

.tree-chevron {
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--fg-muted);
}

.tree-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tree-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-spinner {
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--border-primary);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.tree-error {
  padding: 4px 12px 4px 8px;
  font-size: var(--text-xs);
  color: var(--accent-danger);
  white-space: normal;
  line-height: 1.4;
}

.tree-empty {
  padding: 4px 12px 4px 8px;
  font-size: var(--text-xs);
  color: var(--fg-muted);
  font-style: italic;
}
</style>
