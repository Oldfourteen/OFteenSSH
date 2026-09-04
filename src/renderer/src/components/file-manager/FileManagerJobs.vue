<template>
  <div v-if="jobs.length > 0" class="file-manager-jobs">
    <div class="jobs-header" @click="expanded = !expanded">
      <span class="jobs-title">传输任务 ({{ runningCount }}/{{ jobs.length }})</span>
      <div class="jobs-actions">
        <button class="btn-text" @click.stop="$emit('clear-completed')" v-if="hasCompleted">清除已完成</button>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" :class="{ rotated: !expanded }">
          <path d="M3 5L7 9L11 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <div v-if="expanded" class="jobs-list">
      <div
        v-for="job in jobs"
        :key="job.id"
        class="job-item"
        :class="job.status"
      >
        <span class="job-type">
          <svg v-if="job.type === 'upload'" width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V9M7 1L4 4M7 1L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M7 13V5M7 13L4 10M7 13L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="job-path" :title="job.sourcePath">{{ jobName(job) }}</span>
        <span class="job-status">{{ statusText(job.status) }}</span>
        <span v-if="job.message" class="job-message" :title="job.message">{{ job.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FileTransferJob } from '../../../shared/types'

const props = defineProps<{
  jobs: FileTransferJob[]
}>()

const emit = defineEmits<{
  clearCompleted: []
}>()

const expanded = ref(true)

const runningCount = computed(() => props.jobs.filter((j) => j.status === 'running' || j.status === 'pending').length)
const hasCompleted = computed(() => props.jobs.some((j) => j.status === 'success' || j.status === 'error'))

function jobName(job: FileTransferJob): string {
  const path = job.type === 'upload' ? job.sourcePath : job.sourcePath
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || path
}

function statusText(status: FileTransferJob['status']): string {
  switch (status) {
    case 'pending':
      return '等待中'
    case 'running':
      return '进行中'
    case 'success':
      return '完成'
    case 'error':
      return '失败'
    default:
      return status
  }
}
</script>

<style scoped>
.file-manager-jobs {
  flex-shrink: 0;
  max-height: 160px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
}

.jobs-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-lg);
  cursor: pointer;
  user-select: none;
}

.jobs-header:hover {
  background: var(--bg-hover);
}

.jobs-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--fg-primary);
}

.jobs-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.btn-text {
  background: transparent;
  border: none;
  color: var(--accent-primary);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: 2px 4px;
}

.btn-text:hover {
  text-decoration: underline;
}

.jobs-actions svg {
  transition: transform var(--transition-fast);
  color: var(--fg-muted);
}

.jobs-actions svg.rotated {
  transform: rotate(-90deg);
}

.jobs-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--spacing-lg) var(--spacing-sm);
}

.job-item {
  display: grid;
  grid-template-columns: 20px 1fr 60px 1fr;
  gap: var(--spacing-sm);
  align-items: center;
  padding: 4px 0;
  font-size: var(--text-xs);
  color: var(--fg-secondary);
  border-bottom: 1px solid rgba(41, 46, 66, 0.3);
}

.job-item:last-child {
  border-bottom: none;
}

.job-type {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-muted);
}

.job-path {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job-status {
  text-align: right;
}

.job-item.success .job-status {
  color: var(--accent-success);
}

.job-item.error .job-status {
  color: var(--accent-danger);
}

.job-item.running .job-status {
  color: var(--accent-info);
}

.job-message {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--accent-danger);
}
</style>
