export interface OfeenAPI {
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
    list: (connectionId: string, limit?: number) => Promise<{
      success: boolean
      processes: Array<{
        user: string
        pid: number
        cpuPercent: number
        memPercent: number
        command: string
        state?: string
        ppid?: number
      }>
      message?: string
    }>
    kill: (
      connectionId: string,
      pid: number,
      signal?: 'TERM' | 'KILL'
    ) => Promise<{ success: boolean; message?: string; pid?: number }>
    start: (
      connectionId: string,
      command: string
    ) => Promise<{ success: boolean; message?: string; pid?: number }>
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
    getAppBackground: () => Promise<any>
    setAppBackground: (bg: any) => Promise<void>
    getBackgroundImageDir: () => Promise<string>
    setBackgroundImageDir: (dir: string) => Promise<string>
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
