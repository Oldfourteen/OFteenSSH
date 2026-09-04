<template>
  <div class="file-manager-toolbar">
    <div class="toolbar-left">
      <button class="btn btn-icon" title="上一级" @click="$emit('navigate-up')" :disabled="!canGoUp">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 12V4M8 4L4 8M8 4L12 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="btn btn-icon" title="主页" @click="$emit('home')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 6.5L8 2L14 6.5V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V6.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="btn btn-icon" title="刷新" @click="$emit('refresh')" :disabled="loading">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C10.1643 2 12.0432 3.24874 13.0015 5.0625" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M13 2V5.5H9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div class="toolbar-right">
      <button class="btn btn-primary" @click="$emit('upload')" :disabled="!canTransfer">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1V9M7 1L4 4M7 1L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M1 10V12C1 12.5523 1.44772 13 2 13H12C12.5523 13 13 12.5523 13 12V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>上传</span>
      </button>
      <button class="btn btn-primary" @click="$emit('download')" :disabled="!canDownload">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 13V5M7 13L4 10M7 13L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M1 4V2C1 1.44772 1.44772 1 2 1H12C12.5523 1 13 1.44772 13 2V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>下载</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentPath: string
  selectedCount: number
  loading: boolean
  canTransfer: boolean
}>()

const emit = defineEmits<{
  upload: []
  download: []
  refresh: []
  navigateUp: []
  home: []
}>()

const canGoUp = computed(() => props.currentPath !== '~' && props.currentPath !== '/')
const canDownload = computed(() => props.canTransfer && props.selectedCount > 0)
</script>

<style scoped>
.file-manager-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--fg-primary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--border-secondary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  padding: var(--spacing-xs);
  width: 30px;
  height: 30px;
}

.btn-primary {
  background: var(--accent-primary);
  color: #1a1b26;
  border-color: var(--accent-primary);
}

.btn-primary:hover:not(:disabled) {
  background: #8bb3f8;
  border-color: #8bb3f8;
}
</style>
