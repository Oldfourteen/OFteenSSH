/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

interface Window {
  ofteenAPI: {
    ssh: {
      connect: (config: any, credential?: any) => Promise<any>
      disconnect: (connectionId: string) => Promise<any>
      testConnection: (config: any) => Promise<any>
      getStatus: (connectionId: string) => Promise<any>
      onStatusChanged: (callback: (data: any) => void) => () => void
      onReconnecting: (callback: (data: any) => void) => () => void
      onReconnected: (callback: (data: any) => void) => () => void
    }
    terminal: {
      create: (connectionId: string) => Promise<string>
      write: (sessionId: string, data: string) => void
      resize: (sessionId: string, cols: number, rows: number) => void
      kill: (sessionId: string) => Promise<void>
      onData: (callback: (data: any) => void) => () => void
      onExit: (callback: (data: any) => void) => () => void
    }
    monitor: {
      start: (connectionId: string) => Promise<void>
      stop: (connectionId: string) => Promise<void>
      onData: (callback: (data: any) => void) => () => void
      onNetworkSpeed: (callback: (data: any) => void) => () => void
    }
    proc: {
      list: (connectionId: string, limit?: number) => Promise<any>
      kill: (connectionId: string, pid: number, signal?: 'TERM' | 'KILL') => Promise<any>
      start: (connectionId: string, command: string) => Promise<any>
    }
    guard: {
      list: (connectionId: string) => Promise<any[]>
      add: (connectionId: string, rule: any) => Promise<any>
      update: (id: string, patch: any) => Promise<any>
      remove: (id: string) => Promise<any>
      checkNow: (connectionId: string) => Promise<any[]>
    }
    firewall: {
      status: (connectionId: string) => Promise<any>
      enable: (connectionId: string) => Promise<any>
      disable: (connectionId: string) => Promise<any>
      allow: (connectionId: string, port: string, proto?: 'tcp' | 'udp' | 'any') => Promise<any>
      deleteRule: (connectionId: string, ruleNumber: number) => Promise<any>
    }
    forward: {
      list: (connectionId: string) => Promise<any[]>
      start: (payload: any) => Promise<any>
      stop: (id: string) => Promise<any>
      remove: (id: string) => Promise<any>
    }
    remoteDir: {
      list: (connectionId: string, path: string) => Promise<any>
    }
    remoteFile: {
      upload: (connectionId: string, localPath: string, remotePath: string, options?: any) => Promise<any>
      download: (connectionId: string, remotePath: string, localPath: string, options?: any) => Promise<any>
    }
    dialog: {
      selectFiles: () => Promise<{ canceled: boolean; filePaths: string[] }>
      selectDirectory: () => Promise<{ canceled: boolean; filePath: string | null }>
    }
    credential: {
      save: (id: string, credential: any) => Promise<void>
      get: (id: string) => Promise<any>
      delete: (id: string) => Promise<void>
      listIds: () => Promise<string[]>
    }
    config: {
      getConnections: () => Promise<any[]>
      saveConnection: (config: any) => Promise<void>
      deleteConnection: (connectionId: string) => Promise<void>
      updateConnection: (connectionId: string, config: any) => Promise<void>
    }
    theme: {
      getAll: () => Promise<any[]>
      getCurrent: () => Promise<string>
      setCurrent: (themeId: string) => Promise<void>
      saveCustom: (theme: any) => Promise<void>
      deleteCustom: (themeId: string) => Promise<void>
      exportTheme: (themeId: string) => Promise<string>
      importTheme: (json: string) => Promise<any>
      uploadBackgroundImage: () => Promise<{ canceled: boolean; filePath: string | null; dataUrl: string | null }>
    }
    window: {
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
    }
    app: {
      getVersion: () => Promise<string>
    }
  }
}
