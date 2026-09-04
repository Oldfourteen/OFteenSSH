import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { RemoteFileEntry, RemoteFileType, RemoteDirectoryResult } from '../../../shared/types'

export interface RemoteDirectoryNode {
  name: string
  path: string
  type: RemoteFileType
  size: number
  mtime: number
  expanded: boolean
  loading: boolean
  error: string | null
  children: RemoteDirectoryNode[]
}

export interface RemoteDirectoryState {
  connectionId: string
  rootPath: string
  nodes: RemoteDirectoryNode[]
  loading: boolean
  error: string | null
}

function createNode(entry: RemoteFileEntry): RemoteDirectoryNode {
  return {
    name: entry.name,
    path: entry.path,
    type: entry.type,
    size: entry.size,
    mtime: entry.mtime,
    expanded: false,
    loading: false,
    error: null,
    children: []
  }
}

export const useRemoteDirectoryStore = defineStore('remote-directory', () => {
  const connectionTrees = ref<Map<string, RemoteDirectoryState>>(new Map())
  const activeConnectionId = ref<string | null>(null)

  const activeTree = computed(() =>
    activeConnectionId.value ? connectionTrees.value.get(activeConnectionId.value) || null : null
  )

  /** 设置当前要显示的连接目录 */
  function setActiveConnection(connectionId: string | null) {
    activeConnectionId.value = connectionId
  }

  /** 获取或创建某连接的目录状态 */
  function ensureState(connectionId: string): RemoteDirectoryState {
    let state = connectionTrees.value.get(connectionId)
    if (!state) {
      state = {
        connectionId,
        rootPath: '~',
        nodes: [],
        loading: false,
        error: null
      }
      connectionTrees.value.set(connectionId, state)
    }
    return state
  }

  /** 加载根目录 */
  async function loadRoot(connectionId: string) {
    const state = ensureState(connectionId)
    if (state.loading) return

    state.loading = true
    state.error = null
    try {
      const result: RemoteDirectoryResult = await window.ofteenAPI.remoteDir.list(connectionId, '~')
      if (result.success) {
        state.rootPath = result.path
        state.nodes = result.entries.map(createNode)
      } else {
        state.error = result.message || '加载目录失败'
        state.nodes = []
      }
    } catch (err) {
      state.error = `加载目录失败: ${(err as Error).message}`
      state.nodes = []
    } finally {
      state.loading = false
    }
  }

  /** 展开节点并懒加载子目录 */
  async function expandNode(connectionId: string, path: string) {
    const state = ensureState(connectionId)
    const node = findNode(state.nodes, path)
    if (!node) return

    if (node.type !== 'directory' && node.type !== 'symlink') return

    node.expanded = true

    if (node.children.length > 0) return

    node.loading = true
    node.error = null
    try {
      const result: RemoteDirectoryResult = await window.ofteenAPI.remoteDir.list(connectionId, path)
      if (result.success) {
        node.children = result.entries.map(createNode)
      } else {
        node.error = result.message || '加载子目录失败'
      }
    } catch (err) {
      node.error = `加载子目录失败: ${(err as Error).message}`
    } finally {
      node.loading = false
    }
  }

  /** 折叠节点 */
  function collapseNode(connectionId: string, path: string) {
    const state = connectionTrees.value.get(connectionId)
    if (!state) return
    const node = findNode(state.nodes, path)
    if (node) {
      node.expanded = false
    }
  }

  /** 切换展开/折叠 */
  async function toggleNode(connectionId: string, path: string) {
    const state = connectionTrees.value.get(connectionId)
    if (!state) return
    const node = findNode(state.nodes, path)
    if (!node) return
    if (node.type !== 'directory' && node.type !== 'symlink') return

    if (node.expanded) {
      collapseNode(connectionId, path)
    } else {
      await expandNode(connectionId, path)
    }
  }

  /** 清理某连接的目录缓存 */
  function clearConnection(connectionId: string) {
    connectionTrees.value.delete(connectionId)
    if (activeConnectionId.value === connectionId) {
      activeConnectionId.value = null
    }
  }

  /** 在树中递归查找节点 */
  function findNode(nodes: RemoteDirectoryNode[], path: string): RemoteDirectoryNode | null {
    for (const node of nodes) {
      if (node.path === path) return node
      if (node.children.length > 0) {
        const found = findNode(node.children, path)
        if (found) return found
      }
    }
    return null
  }

  return {
    connectionTrees,
    activeConnectionId,
    activeTree,
    setActiveConnection,
    loadRoot,
    expandNode,
    collapseNode,
    toggleNode,
    clearConnection
  }
})
