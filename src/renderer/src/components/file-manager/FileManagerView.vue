<template>
  <div class="file-manager-view">
    <FileManagerToolbar
      :current-path="currentPath"
      :selected-count="selectedCount"
      :loading="loading"
      :can-transfer="canUse"
      @upload="handleUpload"
      @download="handleDownload"
      @refresh="refresh"
      @navigate-up="navigateUp"
      @home="navigateHome"
    />

    <FileManagerBreadcrumb
      :path="currentPath"
      @navigate="navigateTo"
    />

    <div v-if="!canUse" class="file-manager-content">
      <FileManagerEmptyState
        :type="emptyStateType"
        :message="error || undefined"
      />
    </div>

    <template v-else>
      <div v-if="loading && entries.length === 0" class="file-manager-loading">
        <span class="spinner"></span>
        <span>正在加载目录...</span>
      </div>

      <div v-else-if="error" class="file-manager-content">
        <FileManagerEmptyState type="error" :message="error" />
      </div>

      <div v-else-if="entries.length === 0" class="file-manager-content">
        <FileManagerEmptyState type="empty-dir" />
      </div>

      <FileManagerFileList
        v-else
        :entries="entries"
        :selected-paths="selectedPaths"
        :loading="loading"
        @toggle-select="toggleSelect"
        @navigate="navigateTo"
        @download="downloadSingle"
      />
    </template>

    <FileManagerJobs
      :jobs="jobs"
      @clear-completed="removeCompletedJobs"
    />

    <!-- 覆盖确认弹窗 -->
    <div v-if="confirmState.visible" class="dialog-overlay" @click.self="cancelConfirm">
      <div class="confirm-dialog">
        <div class="confirm-header">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="var(--accent-warning)" stroke-width="1.5" fill="none"/>
            <line x1="10" y1="5.5" x2="10" y2="11" stroke="var(--accent-warning)" stroke-width="2" stroke-linecap="round"/>
            <circle cx="10" cy="13.5" r="0.8" fill="var(--accent-warning)"/>
          </svg>
          <h3>确认覆盖</h3>
        </div>
        <p class="confirm-text">
          {{ confirmState.message }}
        </p>
        <div class="confirm-footer">
          <button class="btn" @click="cancelConfirm">取消</button>
          <button class="btn btn-danger" @click="confirmAction">覆盖</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useFileManagerStore } from '@/stores/file-manager'
import { useConnectionStore } from '@/stores/connection'
import { FileTransferResult, FileTransferJob } from '../../../shared/types'
import FileManagerToolbar from './FileManagerToolbar.vue'
import FileManagerBreadcrumb from './FileManagerBreadcrumb.vue'
import FileManagerFileList from './FileManagerFileList.vue'
import FileManagerJobs from './FileManagerJobs.vue'
import FileManagerEmptyState from './FileManagerEmptyState.vue'

const fileManagerStore = useFileManagerStore()
const connectionStore = useConnectionStore()

const {
  currentPath,
  entries,
  loading,
  error,
  selectedPaths,
  jobs
} = storeToRefs(fileManagerStore)

const canUse = computed(() => {
  return !!connectionStore.activeConnectionId &&
    connectionStore.activeConnectionStatus === 'connected'
})

const selectedCount = computed(() => selectedPaths.value.size)

const emptyStateType = computed(() => {
  if (!connectionStore.activeConnectionId) return 'no-connection'
  if (connectionStore.activeConnectionStatus !== 'connected') return 'disconnected'
  return 'error'
})

interface ConfirmState {
  visible: boolean
  message: string
  onConfirm: (() => void) | null
  onCancel: (() => void) | null
}

const confirmState = reactive<ConfirmState>({
  visible: false,
  message: '',
  onConfirm: null,
  onCancel: null
})

onMounted(() => {
  if (canUse.value) {
    fileManagerStore.activate(connectionStore.activeConnectionId!)
  }
})

watch(() => connectionStore.activeConnectionId, (id) => {
  if (!fileManagerStore.isActive) return
  if (id && connectionStore.activeConnectionStatus === 'connected') {
    fileManagerStore.activate(id)
  } else {
    fileManagerStore.activate(null)
  }
})

watch(() => connectionStore.activeConnectionStatus, (status) => {
  if (!fileManagerStore.isActive) return
  const id = connectionStore.activeConnectionId
  if (id && status === 'connected') {
    fileManagerStore.activate(id)
  } else if (id && status !== 'connected') {
    fileManagerStore.activate(null)
  }
})

function navigateTo(path: string): void {
  fileManagerStore.navigateTo(path)
}

function navigateUp(): void {
  fileManagerStore.navigateUp()
}

function navigateHome(): void {
  fileManagerStore.navigateHome()
}

function refresh(): void {
  fileManagerStore.refresh()
}

function toggleSelect(path: string, append: boolean): void {
  fileManagerStore.toggleSelect(path, append)
}

function removeCompletedJobs(): void {
  fileManagerStore.removeCompletedJobs()
}

async function handleUpload(): Promise<void> {
  if (!canUse.value) return
  const result = await window.ofteenAPI.dialog.selectFiles()
  if (result.canceled || result.filePaths.length === 0) return

  // 检查同名覆盖
  const localPaths: string[] = []
  for (const localPath of result.filePaths) {
    const name = basename(localPath)
    const existing = entries.value.find((e) => e.name === name && e.type === 'file')
    if (existing) {
      const confirmed = await showConfirm(`远程已存在文件「${name}」，是否覆盖？`)
      if (!confirmed) continue
      await uploadSingle(localPath, true)
    } else {
      localPaths.push(localPath)
    }
  }

  if (localPaths.length > 0) {
    await fileManagerStore.uploadFiles(localPaths)
  }
}

async function uploadSingle(localPath: string, overwrite: boolean): Promise<void> {
  const id = connectionStore.activeConnectionId
  if (!id) return
  const name = basename(localPath)
  const remotePath = `${currentPath.value.endsWith('/') ? currentPath.value : currentPath.value + '/'}${name}`

  const job: FileTransferJob = {
    id: generateId(),
    type: 'upload',
    sourcePath: localPath,
    targetPath: remotePath,
    status: 'running',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  jobs.value.push(job)

  try {
    const result: FileTransferResult = await window.ofteenAPI.remoteFile.upload(id, localPath, remotePath, { overwrite })
    if (result.success) {
      job.status = 'success'
    } else {
      job.status = 'error'
      job.message = result.message || '上传失败'
    }
  } catch (err) {
    job.status = 'error'
    job.message = `上传失败: ${(err as Error).message}`
  } finally {
    job.updatedAt = Date.now()
  }

  await refresh()
}

async function handleDownload(): Promise<void> {
  if (!canUse.value || fileManagerStore.selectedFiles.length === 0) return
  const dirResult = await window.ofteenAPI.dialog.selectDirectory()
  if (dirResult.canceled || !dirResult.filePath) return

  await fileManagerStore.downloadSelected(dirResult.filePath)
}

async function downloadSingle(path: string): Promise<void> {
  if (!canUse.value) return
  const dirResult = await window.ofteenAPI.dialog.selectDirectory()
  if (dirResult.canceled || !dirResult.filePath) return

  const name = basename(path)
  const sep = dirResult.filePath.includes('\\') ? '\\' : '/'
  const localPath = dirResult.filePath.endsWith(sep) ? `${dirResult.filePath}${name}` : `${dirResult.filePath}${sep}${name}`

  const job: FileTransferJob = {
    id: generateId(),
    type: 'download',
    sourcePath: path,
    targetPath: localPath,
    status: 'running',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  jobs.value.push(job)

  const id = connectionStore.activeConnectionId!
  try {
    const result: FileTransferResult = await window.ofteenAPI.remoteFile.download(id, path, localPath)
    if (result.success) {
      job.status = 'success'
    } else if (result.code === 'EEXIST') {
      const confirmed = await showConfirm(`本地已存在文件「${name}」，是否覆盖？`)
      if (confirmed) {
        const retry: FileTransferResult = await window.ofteenAPI.remoteFile.download(id, path, localPath, { overwrite: true })
        if (retry.success) {
          job.status = 'success'
        } else {
          job.status = 'error'
          job.message = retry.message || '下载失败'
        }
      } else {
        job.status = 'error'
        job.message = '已取消覆盖'
      }
    } else {
      job.status = 'error'
      job.message = result.message || '下载失败'
    }
  } catch (err) {
    job.status = 'error'
    job.message = `下载失败: ${(err as Error).message}`
  } finally {
    job.updatedAt = Date.now()
  }
}

function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState.message = message
    confirmState.visible = true
    confirmState.onConfirm = () => {
      confirmState.visible = false
      confirmState.onConfirm = null
      confirmState.onCancel = null
      resolve(true)
    }
    confirmState.onCancel = () => {
      confirmState.visible = false
      confirmState.onConfirm = null
      confirmState.onCancel = null
      resolve(false)
    }
  })
}

function cancelConfirm(): void {
  if (confirmState.onCancel) {
    confirmState.onCancel()
  } else {
    confirmState.visible = false
    confirmState.onConfirm = null
  }
}

function confirmAction(): void {
  if (confirmState.onConfirm) {
    confirmState.onConfirm()
  }
}

function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || path
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
</script>

<style scoped>
.file-manager-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
}

.file-manager-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.file-manager-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  color: var(--fg-muted);
  font-size: var(--text-md);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-primary);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.confirm-dialog {
  width: 380px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.confirm-header h3 {
  font-size: var(--text-lg);
  color: var(--fg-primary);
}

.confirm-text {
  font-size: var(--text-md);
  color: var(--fg-secondary);
  line-height: 1.6;
  margin-bottom: var(--spacing-lg);
}

.confirm-footer {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn:hover {
  background: var(--bg-hover);
  color: var(--fg-primary);
}

.btn-danger {
  background: var(--accent-danger);
  border-color: var(--accent-danger);
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
}
</style>
