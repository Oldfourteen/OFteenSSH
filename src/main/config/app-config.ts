import Store from 'electron-store'
import { SSHConnectionConfig, TerminalTheme, TerminalThemeAppBackground } from '../../shared/types'
import { BUILT_IN_THEMES } from './themes'

interface AppConfigSchema {
  connections: SSHConnectionConfig[]
  currentThemeId: string
  customThemes: TerminalTheme[]
  appBackground: TerminalThemeAppBackground | null
  backgroundImageDir: string
}

const appStore = new Store<AppConfigSchema>({
  name: 'ofteen-ssh-config',
  defaults: {
    connections: [],
    currentThemeId: 'dracula',
    customThemes: [],
    appBackground: null,
    backgroundImageDir: ''
  }
})

class AppConfig {
  // ===== 连接配置 =====

  getConnections(): SSHConnectionConfig[] {
    return appStore.get('connections', [])
  }

  saveConnection(config: SSHConnectionConfig): void {
    const connections = this.getConnections()
    const existingIndex = connections.findIndex((c) => c.id === config.id)
    if (existingIndex >= 0) {
      connections[existingIndex] = config
    } else {
      connections.push(config)
    }
    appStore.set('connections', connections)
  }

  deleteConnection(connectionId: string): void {
    const connections = this.getConnections().filter((c) => c.id !== connectionId)
    appStore.set('connections', connections)
  }

  updateConnection(connectionId: string, config: Partial<SSHConnectionConfig>): void {
    const connections = this.getConnections()
    const index = connections.findIndex((c) => c.id === connectionId)
    if (index >= 0) {
      connections[index] = { ...connections[index], ...config }
      appStore.set('connections', connections)
    }
  }

  // ===== 主题配置 =====

  getAllThemes(): TerminalTheme[] {
    return [...BUILT_IN_THEMES, ...this.getCustomThemes()]
  }

  getCurrentThemeId(): string {
    return appStore.get('currentThemeId', 'dracula')
  }

  setCurrentThemeId(themeId: string): void {
    appStore.set('currentThemeId', themeId)
  }

  getCustomThemes(): TerminalTheme[] {
    return appStore.get('customThemes', [])
  }

  saveCustomTheme(theme: TerminalTheme): void {
    const customThemes = this.getCustomThemes()
    const existingIndex = customThemes.findIndex((t) => t.id === theme.id)
    if (existingIndex >= 0) {
      customThemes[existingIndex] = theme
    } else {
      customThemes.push(theme)
    }
    appStore.set('customThemes', customThemes)
  }

  deleteCustomTheme(themeId: string): void {
    const customThemes = this.getCustomThemes().filter((t) => t.id !== themeId)
    appStore.set('customThemes', customThemes)
    // 如果删除的是当前主题，切换回默认
    if (this.getCurrentThemeId() === themeId) {
      this.setCurrentThemeId('dracula')
    }
  }

  exportTheme(themeId: string): string {
    const allThemes = this.getAllThemes()
    const theme = allThemes.find((t) => t.id === themeId)
    if (!theme) throw new Error('主题不存在')
    return JSON.stringify(theme, null, 2)
  }

  importTheme(json: string): TerminalTheme {
    const theme = JSON.parse(json) as TerminalTheme
    if (!theme.id || !theme.name || !theme.colors || !theme.ui) {
      throw new Error('无效的主题格式')
    }
    // 为导入的主题生成新 ID 避免冲突
    theme.id = `custom_import_${Date.now()}`
    theme.isBuiltIn = false
    this.saveCustomTheme(theme)
    return theme
  }

  // ===== 应用背景图（独立于主题） =====

  getAppBackground(): TerminalThemeAppBackground | null {
    return appStore.get('appBackground', null)
  }

  setAppBackground(bg: TerminalThemeAppBackground | null): void {
    appStore.set('appBackground', bg)
  }

  // ===== 背景图片保存目录 =====

  getBackgroundImageDir(): string {
    return appStore.get('backgroundImageDir', '')
  }

  setBackgroundImageDir(dir: string): void {
    appStore.set('backgroundImageDir', dir)
  }
}

export const appConfig = new AppConfig()
