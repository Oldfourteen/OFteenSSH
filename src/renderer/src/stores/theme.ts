import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { TerminalTheme, TerminalThemeAppBackground } from '../../../shared/types'

export const useThemeStore = defineStore('theme', () => {
  const currentThemeId = ref<string>('dracula')
  const builtInThemes = ref<TerminalTheme[]>([])
  const customThemes = ref<TerminalTheme[]>([])
  const appBackground = ref<TerminalThemeAppBackground | null>(null)
  const allThemes = computed(() => [...builtInThemes.value, ...customThemes.value])

  const currentTheme = computed(() =>
    allThemes.value.find((t) => t.id === currentThemeId.value)
  )

  /** 加载主题 */
  async function loadThemes() {
    try {
      const [themes, bg] = await Promise.all([
        window.ofteenAPI.theme.getAll(),
        window.ofteenAPI.theme.getAppBackground()
      ])
      builtInThemes.value = themes.filter((t: TerminalTheme) => t.isBuiltIn)
      // 只保留默认主题，自定义主题不再使用
      customThemes.value = []
      appBackground.value = bg || null

      let currentId = await window.ofteenAPI.theme.getCurrent()
      const isBuiltIn = builtInThemes.value.some((t) => t.id === currentId)
      // 如果当前主题是自定义主题，切回默认 dracula
      if (!isBuiltIn) {
        currentId = 'dracula'
        await window.ofteenAPI.theme.setCurrent(currentId)
      }
      currentThemeId.value = currentId
      // 加载后立即应用主题
      const theme = allThemes.value.find((t) => t.id === currentId)
      if (theme) applyThemeToCSS(theme)
    } catch (err) {
      console.error('加载主题失败:', err)
    }
  }

  /** 应用主题 */
  async function applyTheme(themeId: string) {
    console.log('[theme] applying theme:', themeId)
    await window.ofteenAPI.theme.setCurrent(themeId)
    // 强制重新加载主题列表，确保 allThemes 包含刚保存的自定义主题
    await loadThemes()
    const theme = allThemes.value.find((t) => t.id === themeId)
    if (theme) {
      currentThemeId.value = themeId
      applyThemeToCSS(theme)
    } else {
      console.warn('[theme] applyTheme: theme still not found after reload:', themeId)
    }
  }

  /** 保存自定义主题 */
  async function saveCustomTheme(theme: TerminalTheme) {
    // 先把可能带有 Vue 响应式代理的对象深克隆为纯对象，避免 IPC 序列化失败
    const plainTheme = JSON.parse(JSON.stringify(theme)) as TerminalTheme
    await window.ofteenAPI.theme.saveCustom(plainTheme)
    await loadThemes()
  }

  /** 重命名自定义主题 */
  async function renameCustomTheme(themeId: string, newName: string) {
    const theme = allThemes.value.find((t) => t.id === themeId)
    if (!theme || theme.isBuiltIn) return
    const updated = { ...theme, name: newName.trim() || theme.name }
    await saveCustomTheme(updated)
  }

  /** 删除自定义主题 */
  async function deleteCustomTheme(themeId: string) {
    await window.ofteenAPI.theme.deleteCustom(themeId)
    if (currentThemeId.value === themeId) {
      currentThemeId.value = 'dracula'
      applyThemeToCSS('dracula')
    }
    await loadThemes()
  }

  /** 导出主题 */
  async function exportTheme(themeId: string): Promise<string> {
    return window.ofteenAPI.theme.exportTheme(themeId)
  }

  /** 导入主题 */
  async function importTheme(json: string): Promise<TerminalTheme> {
    const theme = await window.ofteenAPI.theme.importTheme(json)
    await loadThemes()
    return theme
  }

  /** 保存全局应用背景配置（独立于主题） */
  async function saveAppBackground(bg: TerminalThemeAppBackground | null) {
    const plainBg = bg ? (JSON.parse(JSON.stringify(bg)) as TerminalThemeAppBackground) : null
    await window.ofteenAPI.theme.setAppBackground(plainBg)
    appBackground.value = plainBg
  }

  /** 将主题颜色全面应用到 CSS 变量（同步到侧边栏、面板、标题栏） */
  function applyThemeToCSS(themeOrId: TerminalTheme | string) {
    const theme = typeof themeOrId === 'string'
      ? allThemes.value.find((t) => t.id === themeOrId)
      : themeOrId
    if (!theme) {
      console.warn('[theme] applyThemeToCSS: theme not found', themeOrId)
      return
    }
    console.log('[theme] applyThemeToCSS:', theme.id, theme.name, 'globalBg:', !!appBackground.value, 'themeBg:', !!theme.appBackground?.enabled)

    const root = document.documentElement
    const c = theme.colors
    // 背景图配置已独立保存，优先使用全局配置；兼容旧版主题对象中的 appBackground
    const appBg = appBackground.value || theme.appBackground

    // 判断是否是亮色主题
    const isLight = isLightColor(c.background)

    // === 背景色系（默认不透明） ===
    const primaryBg = c.background
    const secondaryBg = adjustColor(c.background, isLight ? -8 : 5)
    const tertiaryBg = adjustColor(c.background, isLight ? -15 : 12)
    const hoverBg = adjustColor(c.background, isLight ? -20 : 18)
    const activeBg = adjustColor(c.background, isLight ? -28 : 25)

    // === 前景色系 ===
    const primaryFg = appBg?.fontColor || c.foreground

    // 如果启用了背景图片，把面板背景改为半透明，让壁纸透出来
    if (appBg?.enabled && (appBg.imagePath || appBg.imageDataUrl)) {
      root.style.setProperty('--bg-primary', `rgba(${hexToRgb(primaryBg)}, 0.72)`)
      root.style.setProperty('--bg-secondary', `rgba(${hexToRgb(secondaryBg)}, 0.68)`)
      root.style.setProperty('--bg-tertiary', `rgba(${hexToRgb(tertiaryBg)}, 0.75)`)
      root.style.setProperty('--bg-hover', `rgba(${hexToRgb(hoverBg)}, 0.78)`)
      root.style.setProperty('--bg-active', `rgba(${hexToRgb(activeBg)}, 0.82)`)
      root.style.setProperty('--body-bg', 'transparent')
    } else {
      root.style.setProperty('--bg-primary', primaryBg)
      root.style.setProperty('--bg-secondary', secondaryBg)
      root.style.setProperty('--bg-tertiary', tertiaryBg)
      root.style.setProperty('--bg-hover', hoverBg)
      root.style.setProperty('--bg-active', activeBg)
      root.style.setProperty('--body-bg', primaryBg)
    }

    // === 前景色系 ===
    root.style.setProperty('--fg-primary', primaryFg)
    root.style.setProperty('--fg-secondary', adjustAlpha(primaryFg, 0.85))
    root.style.setProperty('--fg-muted', adjustAlpha(primaryFg, 0.5))
    root.style.setProperty('--fg-subtle', adjustAlpha(primaryFg, 0.3))

    // === 强调色 ===
    root.style.setProperty('--accent-primary', c.blue)
    root.style.setProperty('--accent-secondary', c.magenta)
    root.style.setProperty('--accent-success', c.green)
    root.style.setProperty('--accent-warning', c.yellow)
    root.style.setProperty('--accent-danger', c.red)
    root.style.setProperty('--accent-info', c.cyan)

    // === 边框 ===
    root.style.setProperty('--border-primary', adjustAlpha(primaryFg, isLight ? 0.12 : 0.1))
    root.style.setProperty('--border-secondary', adjustAlpha(primaryFg, isLight ? 0.2 : 0.18))

    // === 滚动条 ===
    root.style.setProperty('--scrollbar-thumb', adjustAlpha(primaryFg, isLight ? 0.2 : 0.15))
    root.style.setProperty('--scrollbar-thumb-hover', adjustAlpha(primaryFg, isLight ? 0.35 : 0.3))

    // === 终端字体设置 ===
    root.style.setProperty('--font-mono', theme.ui.fontFamily)
    // 如果启用了自定义背景图，让终端背景透明，使壁纸能透过来
    if (appBg?.enabled && (appBg.imageDataUrl || appBg.imagePath)) {
      root.style.setProperty('--terminal-bg', 'transparent')
    } else {
      root.style.setProperty('--terminal-bg', c.background)
    }

    // === 命令输入语法高亮 ===
    root.style.setProperty('--syntax-command', c.blue)
    root.style.setProperty('--syntax-flag', c.yellow)
    root.style.setProperty('--syntax-string', c.green)
    root.style.setProperty('--syntax-variable', c.cyan)
    root.style.setProperty('--syntax-operator', c.magenta)
    root.style.setProperty('--syntax-subcommand', c.brightYellow || c.yellow)
    root.style.setProperty('--syntax-comment', adjustAlpha(primaryFg, isLight ? 0.45 : 0.5))

    // === 应用背景图片与字体效果 ===
    console.log('[theme] appBackground:', JSON.stringify({
      enabled: appBg?.enabled,
      hasImageDataUrl: !!appBg?.imageDataUrl,
      imageDataUrlPrefix: appBg?.imageDataUrl ? appBg.imageDataUrl.slice(0, 80) + '...' : '',
      imagePath: appBg?.imagePath,
      opacity: appBg?.opacity
    }))
    if (appBg?.enabled && (appBg.imageDataUrl || appBg.imagePath)) {
      // 优先使用本地文件路径，避免 data URL 被 CSP 拦截或过长导致样式失效
      const bgUrl = appBg.imagePath
        ? `file://${appBg.imagePath.replace(/\\/g, '/')}`
        : appBg.imageDataUrl
      console.log('[theme] setting --app-bg-image with url prefix:', bgUrl.slice(0, 80) + '...')
      root.style.setProperty('--app-bg-image', `url("${bgUrl}")`)
      root.style.setProperty('--app-bg-opacity', String(appBg.opacity ?? 0.5))
      // 让 html 也透明，确保背景图不会被根元素的默认白色画布盖住
      document.documentElement.style.backgroundColor = 'transparent'
    } else {
      console.log('[theme] clearing --app-bg-image')
      root.style.setProperty('--app-bg-image', 'none')
      root.style.setProperty('--app-bg-opacity', '1')
      document.documentElement.style.backgroundColor = primaryBg
    }

    const effect = appBg?.fontEffect || 'normal'
    const useBold = effect.includes('bold')
    const useShadow = effect.includes('shadow')
    root.style.setProperty('--app-font-weight', useBold ? '600' : '400')
    root.style.setProperty('--app-text-shadow', useShadow ? '0 1px 2px rgba(0, 0, 0, 0.6)' : 'none')
  }

  return {
    currentThemeId,
    builtInThemes,
    customThemes,
    allThemes,
    appBackground,
    currentTheme,
    loadThemes,
    applyTheme,
    saveCustomTheme,
    renameCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
    saveAppBackground,
    applyThemeToCSS
  }
})

/** 判断是否是亮色 */
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

/** 调整颜色亮度 */
function adjustColor(hex: string, amount: number): string {
  if (!hex || !hex.startsWith('#')) return hex
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount))
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount))
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/** 调整前景色透明度（用于 muted 等） */
function adjustAlpha(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 将 #rrggbb 转换为 r, g, b 数字字符串 */
function hexToRgb(hex: string): string {
  if (!hex || !hex.startsWith('#')) return '0, 0, 0'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
