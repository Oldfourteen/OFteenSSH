import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types/ipc-channels'

export function exposeAPI(): void {
  contextBridge.exposeInMainWorld('ofteenAPI', {
    // ===== SSH 连接 =====
    ssh: {
      connect: (config: unknown, credential?: unknown) =>
        ipcRenderer.invoke(IPC_CHANNELS.SSH_CONNECT, { config, credential }),
      disconnect: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.SSH_DISCONNECT, { connectionId }),
      testConnection: (config: unknown) =>
        ipcRenderer.invoke(IPC_CHANNELS.SSH_TEST_CONNECTION, config),
      getStatus: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.SSH_GET_STATUS, { connectionId }),
      onStatusChanged: (callback: (data: unknown) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
        ipcRenderer.on(IPC_CHANNELS.SSH_STATUS_CHANGED, handler)
        return () => ipcRenderer.removeListener(IPC_CHANNELS.SSH_STATUS_CHANGED, handler)
      },
      onReconnecting: (callback: (data: unknown) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
        ipcRenderer.on(IPC_CHANNELS.SSH_RECONNECTING, handler)
        return () => ipcRenderer.removeListener(IPC_CHANNELS.SSH_RECONNECTING, handler)
      },
      onReconnected: (callback: (data: unknown) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
        ipcRenderer.on(IPC_CHANNELS.SSH_RECONNECTED, handler)
        return () => ipcRenderer.removeListener(IPC_CHANNELS.SSH_RECONNECTED, handler)
      }
    },

    // ===== 终端 =====
    terminal: {
      create: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, { connectionId }),
      write: (sessionId: string, data: string) =>
        ipcRenderer.send(IPC_CHANNELS.TERMINAL_WRITE, { sessionId, data }),
      resize: (sessionId: string, cols: number, rows: number) =>
        ipcRenderer.send(IPC_CHANNELS.TERMINAL_RESIZE, { sessionId, cols, rows }),
      kill: (sessionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_KILL, { sessionId }),
      onData: (callback: (data: unknown) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
        ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, handler)
        return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_DATA, handler)
      },
      onExit: (callback: (data: unknown) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
        ipcRenderer.on(IPC_CHANNELS.TERMINAL_EXIT, handler)
        return () => ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_EXIT, handler)
      }
    },

    // ===== 系统监控 =====
    monitor: {
      start: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.MONITOR_START, { connectionId }),
      stop: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.MONITOR_STOP, { connectionId }),
      onData: (callback: (data: unknown) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
        ipcRenderer.on(IPC_CHANNELS.MONITOR_DATA, handler)
        return () => ipcRenderer.removeListener(IPC_CHANNELS.MONITOR_DATA, handler)
      },
      onNetworkSpeed: (callback: (data: unknown) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
        ipcRenderer.on(IPC_CHANNELS.MONITOR_NETWORK_SPEED, handler)
        return () => ipcRenderer.removeListener(IPC_CHANNELS.MONITOR_NETWORK_SPEED, handler)
      }
    },

    // ===== 远程进程管理 =====
    // 注意：不要用 process 作为键名，会与 Electron/Node 全局冲突导致 undefined
    proc: {
      list: (connectionId: string, limit?: number) =>
        ipcRenderer.invoke(IPC_CHANNELS.PROCESS_LIST, { connectionId, limit }),
      kill: (connectionId: string, pid: number, signal?: 'TERM' | 'KILL') =>
        ipcRenderer.invoke(IPC_CHANNELS.PROCESS_KILL, { connectionId, pid, signal }),
      start: (connectionId: string, command: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.PROCESS_START, { connectionId, command })
    },

    guard: {
      list: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.GUARD_LIST, { connectionId }),
      add: (
        connectionId: string,
        rule: { name: string; match: string; startCommand: string; enabled?: boolean }
      ) => ipcRenderer.invoke(IPC_CHANNELS.GUARD_ADD, { connectionId, rule }),
      update: (
        id: string,
        patch: { name?: string; match?: string; startCommand?: string; enabled?: boolean }
      ) => ipcRenderer.invoke(IPC_CHANNELS.GUARD_UPDATE, { id, patch }),
      remove: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.GUARD_REMOVE, { id }),
      checkNow: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.GUARD_CHECK_NOW, { connectionId })
    },

    firewall: {
      status: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIREWALL_STATUS, { connectionId }),
      enable: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIREWALL_ENABLE, { connectionId }),
      disable: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIREWALL_DISABLE, { connectionId }),
      allow: (connectionId: string, port: string, proto?: 'tcp' | 'udp' | 'any') =>
        ipcRenderer.invoke(IPC_CHANNELS.FIREWALL_ALLOW, { connectionId, port, proto }),
      deleteRule: (connectionId: string, ruleNumber: number) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIREWALL_DELETE, { connectionId, ruleNumber })
    },

    forward: {
      list: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FORWARD_LIST, { connectionId }),
      start: (payload: {
        connectionId: string
        type: 'local' | 'remote'
        name?: string
        localHost?: string
        localPort: number
        remoteHost?: string
        remotePort: number
      }) => ipcRenderer.invoke(IPC_CHANNELS.FORWARD_START, payload),
      stop: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.FORWARD_STOP, { id }),
      remove: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.FORWARD_REMOVE, { id })
    },

    // ===== 远程目录树 =====
    remoteDir: {
      list: (connectionId: string, path: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.REMOTE_DIR_LIST, { connectionId, path })
    },

    // ===== 远程文件传输 =====
    remoteFile: {
      upload: (connectionId: string, localPath: string, remotePath: string, options?: unknown) =>
        ipcRenderer.invoke(IPC_CHANNELS.REMOTE_FILE_UPLOAD, { connectionId, localPath, remotePath, options }),
      download: (connectionId: string, remotePath: string, localPath: string, options?: unknown) =>
        ipcRenderer.invoke(IPC_CHANNELS.REMOTE_FILE_DOWNLOAD, { connectionId, remotePath, localPath, options })
    },

    // ===== 原生对话框 =====
    dialog: {
      selectFiles: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_FILES),
      selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY)
    },

    // ===== 凭证管理 =====
    credential: {
      save: (id: string, credential: unknown) =>
        ipcRenderer.invoke(IPC_CHANNELS.CREDENTIAL_SAVE, { id, credential }),
      get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CREDENTIAL_GET, { id }),
      delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CREDENTIAL_DELETE, { id }),
      listIds: () => ipcRenderer.invoke(IPC_CHANNELS.CREDENTIAL_LIST_IDS)
    },

    // ===== 连接配置 =====
    config: {
      getConnections: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET_CONNECTIONS),
      saveConnection: (config: unknown) =>
        ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SAVE_CONNECTION, { config }),
      deleteConnection: (connectionId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.CONFIG_DELETE_CONNECTION, { connectionId }),
      updateConnection: (connectionId: string, config: unknown) =>
        ipcRenderer.invoke(IPC_CHANNELS.CONFIG_UPDATE_CONNECTION, { connectionId, config })
    },

    // ===== 主题 =====
    theme: {
      getAll: () => ipcRenderer.invoke(IPC_CHANNELS.THEME_GET_ALL),
      getCurrent: () => ipcRenderer.invoke(IPC_CHANNELS.THEME_GET_CURRENT),
      setCurrent: (themeId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.THEME_SET_CURRENT, { themeId }),
      saveCustom: (theme: unknown) =>
        ipcRenderer.invoke(IPC_CHANNELS.THEME_SAVE_CUSTOM, { theme }),
      deleteCustom: (themeId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.THEME_DELETE_CUSTOM, { themeId }),
      exportTheme: (themeId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.THEME_EXPORT, { themeId }),
      importTheme: (json: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.THEME_IMPORT, { json }),
      uploadBackgroundImage: () =>
        ipcRenderer.invoke(IPC_CHANNELS.THEME_UPLOAD_BACKGROUND_IMAGE),
      getAppBackground: () =>
        ipcRenderer.invoke(IPC_CHANNELS.THEME_GET_APP_BACKGROUND),
      setAppBackground: (bg: unknown) =>
        ipcRenderer.invoke(IPC_CHANNELS.THEME_SET_APP_BACKGROUND, { bg }),
      getBackgroundImageDir: () =>
        ipcRenderer.invoke(IPC_CHANNELS.THEME_GET_BACKGROUND_IMAGE_DIR),
      setBackgroundImageDir: (dir: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.THEME_SET_BACKGROUND_IMAGE_DIR, { dir })
    },

    // ===== 窗口控制 =====
    window: {
      minimize: () => ipcRenderer.invoke('window:minimize'),
      maximize: () => ipcRenderer.invoke('window:maximize'),
      close: () => ipcRenderer.invoke('window:close')
    },

    // ===== 应用 =====
    app: {
      getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION)
    }
  })
}
