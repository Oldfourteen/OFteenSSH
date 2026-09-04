import { BrowserWindow, shell, Menu } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    title: 'OFteenSSH',
    frame: false,
    backgroundColor: '#1a1b26',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 右键菜单：复制 / 剪切 / 粘贴 / 全选
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const hasSelection = Boolean(params.selectionText && params.selectionText.trim())
    const { isEditable, editFlags } = params

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: '复制',
        role: 'copy',
        accelerator: 'CmdOrCtrl+C',
        enabled: hasSelection || (isEditable && editFlags.canCopy)
      },
      {
        label: '剪切',
        role: 'cut',
        accelerator: 'CmdOrCtrl+X',
        visible: isEditable,
        enabled: hasSelection && editFlags.canCut
      },
      {
        label: '粘贴',
        role: 'paste',
        accelerator: 'CmdOrCtrl+V',
        visible: isEditable,
        enabled: editFlags.canPaste
      },
      { type: 'separator' },
      {
        label: '全选',
        role: 'selectAll',
        accelerator: 'CmdOrCtrl+A',
        enabled: isEditable || editFlags.canSelectAll !== false
      }
    ]

    Menu.buildFromTemplate(template).popup({ window: mainWindow })
  })

  // 外部链接用系统浏览器打开
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发模式加载 dev server，生产模式加载打包文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
