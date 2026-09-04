<template>
  <div class="file-manager-list">
    <div class="list-header">
      <div class="col-name">名称</div>
      <div class="col-size">大小</div>
      <div class="col-type">类型</div>
      <div class="col-time">修改时间</div>
    </div>

    <div class="list-body">
      <div
        v-for="entry in entries"
        :key="entry.path"
        class="list-row"
        :class="{ selected: selectedPaths.has(entry.path) }"
        @click="handleClick(entry, $event)"
        @dblclick="handleDoubleClick(entry)"
      >
        <div class="col-name">
          <span class="file-icon">
            <svg v-if="entry.type === 'directory'" width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M1.5 2.5C1.5 1.94772 1.94772 1.5 2.5 1.5H5.5L7 3H11.5C12.0523 3 12.5 3.44772 12.5 4V10.5C12.5 11.0523 12.0523 11.5 11.5 11.5H2.5C1.94772 11.5 1.5 11.0523 1.5 10.5V2.5Z" fill="rgba(224, 175, 104, 0.25)" stroke="rgba(224, 175, 104, 0.8)" stroke-width="1"/>
            </svg>
            <svg v-else-if="entry.type === 'symlink'" width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M5 9L9 5M9 5H6M9 5V8" stroke="var(--accent-info)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else width="14" height="16" viewBox="0 0 12 14" fill="none">
              <path d="M1.5 1.5H7.5L10.5 4.5V12.5C10.5 12.7761 10.2761 13 10 13H2C1.72386 13 1.5 12.7761 1.5 12.5V1.5Z" fill="rgba(150, 160, 180, 0.15)" stroke="rgba(150, 160, 180, 0.5)" stroke-width="1"/>
              <path d="M7.5 1.5V4.5H10.5" stroke="rgba(150, 160, 180, 0.5)" stroke-width="1"/>
            </svg>
          </span>
          <span class="file-name" :title="entry.path">{{ entry.name }}</span>
        </div>
        <div class="col-size">{{ formatSize(entry.size) }}</div>
        <div class="col-type">{{ formatType(entry.type) }}</div>
        <div class="col-time">{{ formatTime(entry.mtime) }}</div>
      </div>

      <div v-if="entries.length === 0 && !loading" class="list-empty">
        当前目录为空
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RemoteFileEntry } from '../../../shared/types'

const props = defineProps<{
  entries: RemoteFileEntry[]
  selectedPaths: Set<string>
  loading: boolean
}>()

const emit = defineEmits<{
  select: [path: string, append: boolean]
  toggleSelect: [path: string, append: boolean]
  navigate: [path: string]
  download: [path: string]
}>()

function handleClick(entry: RemoteFileEntry, event: MouseEvent): void {
  const append = event.ctrlKey || event.metaKey
  if (event.shiftKey) {
    // Shift 多选暂用简单 toggle
    emit('toggleSelect', entry.path, true)
    return
  }
  emit('toggleSelect', entry.path, append)
}

function handleDoubleClick(entry: RemoteFileEntry): void {
  if (entry.type === 'directory' || entry.type === 'symlink') {
    emit('navigate', entry.path)
  } else {
    emit('download', entry.path)
  }
}

function formatSize(size: number): string {
  if (size === 0) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatType(type: string): string {
  switch (type) {
    case 'directory':
      return '文件夹'
    case 'symlink':
      return '软链'
    case 'file':
      return '文件'
    default:
      return '未知'
  }
}

function formatTime(mtime: number): string {
  if (!mtime) return '-'
  return new Date(mtime * 1000).toLocaleString()
}
</script>

<style scoped>
.file-manager-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-header,
.list-row {
  display: grid;
  grid-template-columns: 1fr 100px 80px 160px;
  gap: var(--spacing-md);
  align-items: center;
  padding: 0 var(--spacing-lg);
  font-size: var(--text-sm);
}

.list-header {
  flex-shrink: 0;
  height: 34px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  color: var(--fg-muted);
  font-weight: 500;
}

.list-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.list-row {
  height: 36px;
  color: var(--fg-secondary);
  border-bottom: 1px solid rgba(41, 46, 66, 0.5);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.list-row:hover {
  background: var(--bg-hover);
  color: var(--fg-primary);
}

.list-row.selected {
  background: rgba(122, 162, 247, 0.12);
  color: var(--fg-primary);
}

.col-name {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
}

.file-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-size,
.col-type,
.col-time {
  color: var(--fg-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--fg-muted);
  font-size: var(--text-sm);
}
</style>
