import { ipcMain, app, BrowserWindow, dialog } from 'electron'
import { mkdirSync, copyFileSync, readFileSync } from 'fs'
import path from 'path'
import { IPC_CHANNELS } from '../shared/types/ipc-channels'
import { sshConnectionManager } from './ssh/connection-manager'
import { ptyManager } from './terminal/pty-manager'
import { monitorCollector } from './monitor/collector'
import { processManager } from './process/process-manager'
import { processGuardManager } from './guard/process-guard'
import { firewallManager } from './firewall/firewall-manager'
import { portForwardManager } from './forward/port-forward'
import { remoteDirectoryManager } from './ssh/remote-directory-manager'
import { credentialStore } from './credential/credential-store'
import { appConfig } from './config/app-config'

/** 根据文件头魔数判断图片真实 MIME 类型，避免扩展名欺骗导致浏览器无法解码 */
function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length < 4) return null
  const head = buffer.subarray(0, 16)
  // JPEG
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg'
  // PNG
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'image/png'
  // GIF
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x38) return 'image/gif'
  // BMP
  if (head[0] === 0x42 && head[1] === 0x4d) return 'image/bmp'
  // WebP: RIFF....WEBP
  if (head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
      head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50) {
    return 'image/webp'
  }
  return null
}

export function registerIpcHandlers(): void {
  // ===== 应用 =====
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return app.getVersion()
  })

  // ===== 窗口控制 =====
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  // ===== SSH 连接 =====
  ipcMain.handle(IPC_CHANNELS.SSH_CONNECT, async (_event, { config, credential }) => {
    return sshConnectionManager.connect({ config, credential })
  })

  ipcMain.handle(IPC_CHANNELS.SSH_DISCONNECT, async (_event, { connectionId }) => {
    return sshConnectionManager.disconnect(connectionId)
  })

  ipcMain.handle(IPC_CHANNELS.SSH_TEST_CONNECTION, async (_event, config) => {
    return sshConnectionManager.testConnection(config)
  })

  ipcMain.handle(IPC_CHANNELS.SSH_GET_STATUS, async (_event, { connectionId }) => {
    return sshConnectionManager.getStatus(connectionId)
  })

  // ===== 终端 =====
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, async (_event, { connectionId }) => {
    return ptyManager.createSSHTerminal(connectionId)
  })

  ipcMain.on(IPC_CHANNELS.TERMINAL_WRITE, (_event, { sessionId, data }) => {
    ptyManager.write(sessionId, data)
  })

  ipcMain.on(IPC_CHANNELS.TERMINAL_RESIZE, (_event, { sessionId, cols, rows }) => {
    ptyManager.resize(sessionId, cols, rows)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_KILL, async (_event, { sessionId }) => {
    ptyManager.kill(sessionId)
  })

  // ===== 系统监控 =====
  ipcMain.handle(IPC_CHANNELS.MONITOR_START, async (_event, { connectionId }) => {
    monitorCollector.start(connectionId)
  })

  ipcMain.handle(IPC_CHANNELS.MONITOR_STOP, async (_event, { connectionId }) => {
    monitorCollector.stop(connectionId)
  })

  // ===== 远程进程管理 =====
  ipcMain.handle(IPC_CHANNELS.PROCESS_LIST, async (_event, { connectionId, limit }) => {
    return processManager.list(connectionId, limit)
  })

  ipcMain.handle(IPC_CHANNELS.PROCESS_KILL, async (_event, { connectionId, pid, signal }) => {
    return processManager.kill(connectionId, pid, signal)
  })

  ipcMain.handle(IPC_CHANNELS.PROCESS_START, async (_event, { connectionId, command }) => {
    return processManager.start(connectionId, command)
  })

  // ===== 进程守卫 =====
  ipcMain.handle(IPC_CHANNELS.GUARD_LIST, async (_event, { connectionId }) => {
    return processGuardManager.list(connectionId)
  })

  ipcMain.handle(IPC_CHANNELS.GUARD_ADD, async (_event, { connectionId, rule }) => {
    return processGuardManager.add(connectionId, rule)
  })

  ipcMain.handle(IPC_CHANNELS.GUARD_UPDATE, async (_event, { id, patch }) => {
    return processGuardManager.update(id, patch)
  })

  ipcMain.handle(IPC_CHANNELS.GUARD_REMOVE, async (_event, { id }) => {
    return processGuardManager.remove(id)
  })

  ipcMain.handle(IPC_CHANNELS.GUARD_CHECK_NOW, async (_event, { connectionId }) => {
    return processGuardManager.checkNow(connectionId)
  })

  // ===== 防火墙 =====
  ipcMain.handle(IPC_CHANNELS.FIREWALL_STATUS, async (_event, { connectionId }) => {
    return firewallManager.status(connectionId)
  })

  ipcMain.handle(IPC_CHANNELS.FIREWALL_ENABLE, async (_event, { connectionId }) => {
    return firewallManager.enable(connectionId)
  })

  ipcMain.handle(IPC_CHANNELS.FIREWALL_DISABLE, async (_event, { connectionId }) => {
    return firewallManager.disable(connectionId)
  })

  ipcMain.handle(IPC_CHANNELS.FIREWALL_ALLOW, async (_event, { connectionId, port, proto }) => {
    return firewallManager.allow(connectionId, port, proto)
  })

  ipcMain.handle(IPC_CHANNELS.FIREWALL_DELETE, async (_event, { connectionId, ruleNumber }) => {
    return firewallManager.deleteRule(connectionId, ruleNumber)
  })

  // ===== 端口转发 =====
  ipcMain.handle(IPC_CHANNELS.FORWARD_LIST, async (_event, { connectionId }) => {
    return portForwardManager.list(connectionId)
  })

  ipcMain.handle(IPC_CHANNELS.FORWARD_START, async (_event, payload) => {
    return portForwardManager.start(payload)
  })

  ipcMain.handle(IPC_CHANNELS.FORWARD_STOP, async (_event, { id }) => {
    return portForwardManager.stop(id)
  })

  ipcMain.handle(IPC_CHANNELS.FORWARD_REMOVE, async (_event, { id }) => {
    return portForwardManager.remove(id)
  })

  // ===== 凭证管理 =====
  ipcMain.handle(IPC_CHANNELS.CREDENTIAL_SAVE, async (_event, { id, credential }) => {
    return credentialStore.saveCredential(id, credential)
  })

  ipcMain.handle(IPC_CHANNELS.CREDENTIAL_GET, async (_event, { id }) => {
    return credentialStore.getCredential(id)
  })

  ipcMain.handle(IPC_CHANNELS.CREDENTIAL_DELETE, async (_event, { id }) => {
    return credentialStore.deleteCredential(id)
  })

  ipcMain.handle(IPC_CHANNELS.CREDENTIAL_LIST_IDS, async () => {
    return credentialStore.listCredentialIds()
  })

  // ===== 连接配置 =====
  ipcMain.handle(IPC_CHANNELS.CONFIG_GET_CONNECTIONS, async () => {
    return appConfig.getConnections()
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_SAVE_CONNECTION, async (_event, { config }) => {
    return appConfig.saveConnection(config)
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_DELETE_CONNECTION, async (_event, { connectionId }) => {
    return appConfig.deleteConnection(connectionId)
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_UPDATE_CONNECTION, async (_event, { connectionId, config }) => {
    return appConfig.updateConnection(connectionId, config)
  })

  // ===== 主题 =====
  ipcMain.handle(IPC_CHANNELS.THEME_GET_ALL, async () => {
    return appConfig.getAllThemes()
  })

  ipcMain.handle(IPC_CHANNELS.THEME_GET_CURRENT, async () => {
    return appConfig.getCurrentThemeId()
  })

  ipcMain.handle(IPC_CHANNELS.THEME_SET_CURRENT, async (_event, { themeId }) => {
    return appConfig.setCurrentThemeId(themeId)
  })

  ipcMain.handle(IPC_CHANNELS.THEME_SAVE_CUSTOM, async (_event, { theme }) => {
    return appConfig.saveCustomTheme(theme)
  })

  ipcMain.handle(IPC_CHANNELS.THEME_DELETE_CUSTOM, async (_event, { themeId }) => {
    return appConfig.deleteCustomTheme(themeId)
  })

  ipcMain.handle(IPC_CHANNELS.THEME_EXPORT, async (_event, { themeId }) => {
    return appConfig.exportTheme(themeId)
  })

  ipcMain.handle(IPC_CHANNELS.THEME_IMPORT, async (_event, { json }) => {
    return appConfig.importTheme(json)
  })

  ipcMain.handle(IPC_CHANNELS.THEME_GET_APP_BACKGROUND, async () => {
    return appConfig.getAppBackground()
  })

  ipcMain.handle(IPC_CHANNELS.THEME_SET_APP_BACKGROUND, async (_event, { bg }) => {
    return appConfig.setAppBackground(bg)
  })

  ipcMain.handle(IPC_CHANNELS.THEME_UPLOAD_BACKGROUND_IMAGE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win || undefined, {
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, filePath: null, dataUrl: null }
    }

    const sourcePath = result.filePaths[0]
    const backgroundsDir = getBackgroundImageDir()
    mkdirSync(backgroundsDir, { recursive: true })

    const ext = path.extname(sourcePath) || '.png'
    const destName = `bg_${Date.now()}${ext}`
    const destPath = path.join(backgroundsDir, destName)
    copyFileSync(sourcePath, destPath)

    // 生成 base64 data URL，便于渲染进程直接用作 CSS 背景
    const buffer = readFileSync(destPath)
    const mime = detectImageMime(buffer) || 'image/png'
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`

    return { canceled: false, filePath: destPath, dataUrl }
  })

  ipcMain.handle(IPC_CHANNELS.THEME_GET_BACKGROUND_IMAGE_DIR, async () => {
    return appConfig.getBackgroundImageDir()
  })

  ipcMain.handle(IPC_CHANNELS.THEME_SET_BACKGROUND_IMAGE_DIR, async (event, { dir }) => {
    const resolved = dir || path.join(app.getPath('userData'), 'backgrounds')
    mkdirSync(resolved, { recursive: true })
    appConfig.setBackgroundImageDir(dir)
    return resolved
  })

  /** 获取背景图片保存目录，未设置则返回默认路径 */
  function getBackgroundImageDir(): string {
    const configured = appConfig.getBackgroundImageDir()
    if (configured) return configured
    return path.join(app.getPath('userData'), 'backgrounds')
  }

  // ===== 远程目录树 =====
  ipcMain.handle(IPC_CHANNELS.REMOTE_DIR_LIST, async (_event, { connectionId, path }) => {
    return remoteDirectoryManager.list(connectionId, path)
  })

  // ===== 远程文件传输 =====
  ipcMain.handle(IPC_CHANNELS.REMOTE_FILE_UPLOAD, async (_event, { connectionId, localPath, remotePath, options }) => {
    return remoteDirectoryManager.upload(connectionId, localPath, remotePath, options)
  })

  ipcMain.handle(IPC_CHANNELS.REMOTE_FILE_DOWNLOAD, async (_event, { connectionId, remotePath, localPath, options }) => {
    return remoteDirectoryManager.download(connectionId, remotePath, localPath, options)
  })

  // ===== 原生对话框 =====
  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_FILES, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win || undefined, {
      properties: ['openFile', 'multiSelections']
    })
    return { canceled: result.canceled, filePaths: result.filePaths }
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win || undefined, {
      properties: ['openDirectory']
    })
    return { canceled: result.canceled, filePath: result.filePaths[0] || null }
  })
}
