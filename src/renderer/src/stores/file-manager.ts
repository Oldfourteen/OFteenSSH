import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { RemoteFileEntry, FileTransferJob, FileTransferResult } from '../../../shared/types'

function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || path
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function formatRemotePath(dir: string, name: string): string {
  if (dir.endsWith('/')) return `${dir}${name}`
  return `${dir}/${name}`
}

function formatLocalPath(dir: string, name: string): string {
  const sep = dir.includes('\\') ? '\\' : '/'
  if (dir.endsWith(sep)) return `${dir}${name}`
  return `${dir}${sep}${name}`
}

export const useFileManagerStore = defineStore('file-manager', () => {
  const isActive = ref(false)
  const connectionId = ref<string | null>(null)
  const currentPath = ref('~')
  const entries = ref<RemoteFileEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedPaths = ref<Set<string>>(new Set())
  const jobs = ref<FileTransferJob[]>([])

  const hasSelection = computed(() => selectedPaths.value.size > 0)

  const selectedFiles = computed(() =>
    entries.value.filter((entry) => selectedPaths.value.has(entry.path) && entry.type === 'file')
  )

  function activate(targetConnectionId: string | null): void {
    connectionId.value = targetConnectionId
    if (targetConnectionId) {
      currentPath.value = '~'
      entries.value = []
      selectedPaths.value.clear()
      error.value = null
      navigateTo('~')
    } else {
      entries.value = []
      selectedPaths.value.clear()
      error.value = null
    }
  }

  function deactivate(): void {
    isActive.value = false
    connectionId.value = null
    currentPath.value = '~'
    entries.value = []
    selectedPaths.value.clear()
    error.value = null
  }

  async function navigateTo(path: string): Promise<void> {
    if (!connectionId.value) return
    loading.value = true
    error.value = null
    try {
      const result = await window.ofteenAPI.remoteDir.list(connectionId.value, path)
      if (result.success) {
        currentPath.value = result.path
        entries.value = result.entries
        selectedPaths.value.clear()
      } else {
        error.value = result.message || '加载目录失败'
      }
    } catch (err) {
      error.value = `加载目录失败: ${(err as Error).message}`
    } finally {
      loading.value = false
    }
  }

  function navigateUp(): void {
    const path = currentPath.value
    if (path === '~' || path === '/') return
    const normalized = path.replace(/\\/g, '/')
    const parent = normalized.substring(0, normalized.lastIndexOf('/')) || '/'
    navigateTo(parent)
  }

  function navigateHome(): void {
    navigateTo('~')
  }

  async function refresh(): Promise<void> {
    await navigateTo(currentPath.value)
  }

  function select(path: string, append = false): void {
    if (!append) {
      selectedPaths.value.clear()
    }
    selectedPaths.value.add(path)
  }

  function toggleSelect(path: string, append = false): void {
    if (!append) {
      if (selectedPaths.value.size === 1 && selectedPaths.value.has(path)) {
        selectedPaths.value.clear()
        return
      }
      selectedPaths.value.clear()
      selectedPaths.value.add(path)
      return
    }

    if (selectedPaths.value.has(path)) {
      selectedPaths.value.delete(path)
    } else {
      selectedPaths.value.add(path)
    }
  }

  function clearSelection(): void {
    selectedPaths.value.clear()
  }

  function removeCompletedJobs(): void {
    jobs.value = jobs.value.filter((job) => job.status === 'running' || job.status === 'pending')
  }

  async function uploadFiles(localPaths: string[]): Promise<void> {
    if (!connectionId.value) return
    const targetDir = currentPath.value

    for (const localPath of localPaths) {
      const fileName = basename(localPath)
      const remotePath = formatRemotePath(targetDir, fileName)
      const job: FileTransferJob = {
        id: generateId(),
        type: 'upload',
        sourcePath: localPath,
        targetPath: remotePath,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      jobs.value.push(job)
    }

    for (const job of jobs.value.filter((j) => j.type === 'upload' && j.status === 'pending')) {
      job.status = 'running'
      job.updatedAt = Date.now()
      try {
        const result: FileTransferResult = await window.ofteenAPI.remoteFile.upload(
          connectionId.value,
          job.sourcePath,
          job.targetPath
        )
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
    }

    await refresh()
  }

  async function downloadSelected(localDir: string): Promise<void> {
    if (!connectionId.value || selectedFiles.value.length === 0) return

    for (const file of selectedFiles.value) {
      const fileName = basename(file.path)
      const localPath = formatLocalPath(localDir, fileName)
      const job: FileTransferJob = {
        id: generateId(),
        type: 'download',
        sourcePath: file.path,
        targetPath: localPath,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      jobs.value.push(job)
    }

    for (const job of jobs.value.filter((j) => j.type === 'download' && j.status === 'pending')) {
      job.status = 'running'
      job.updatedAt = Date.now()
      try {
        const result: FileTransferResult = await window.ofteenAPI.remoteFile.download(
          connectionId.value,
          job.sourcePath,
          job.targetPath
        )
        if (result.success) {
          job.status = 'success'
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
  }

  return {
    isActive,
    connectionId,
    currentPath,
    entries,
    loading,
    error,
    selectedPaths,
    jobs,
    hasSelection,
    selectedFiles,
    activate,
    deactivate,
    navigateTo,
    navigateUp,
    navigateHome,
    refresh,
    select,
    toggleSelect,
    clearSelection,
    uploadFiles,
    downloadSelected,
    removeCompletedJobs
  }
})
