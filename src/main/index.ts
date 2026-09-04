import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { sshConnectionManager } from './ssh/connection-manager'
import { ptyManager } from './terminal/pty-manager'
import { monitorCollector } from './monitor/collector'

// 禁止多实例
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

app.whenReady().then(() => {
  // 设置应用用户模型 ID（Windows）
  electronApp.setAppUserModelId('com.ofteen.ssh')

  // 默认菜单快捷键处理
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 创建主窗口
  mainWindow = createMainWindow()

  // 将主窗口引用传递给各模块
  sshConnectionManager.setMainWindow(mainWindow)
  ptyManager.setMainWindow(mainWindow)
  monitorCollector.setMainWindow(mainWindow)

  // 注册 IPC 处理器
  registerIpcHandlers()
})

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow()
    if (mainWindow) {
      sshConnectionManager.setMainWindow(mainWindow)
      ptyManager.setMainWindow(mainWindow)
      monitorCollector.setMainWindow(mainWindow)
    }
  }
})
