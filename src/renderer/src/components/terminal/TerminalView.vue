<template>
  <div
    class="terminal-wrapper"
    :class="{ active, 'has-bg-image': hasBgImage }"
    @click.capture="handleWrapperClick"
  >
    <div class="terminal-header">
      <div class="terminal-title">
        <span class="status-dot"></span>
        <span class="session-name">{{ session.name }}</span>
      </div>
    </div>
    <div class="terminal-container" ref="containerRef"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { TerminalSessionState } from '@/stores/terminal'
import { useThemeStore } from '@/stores/theme'
import { TerminalTheme } from '@shared/types'

const props = defineProps<{
  session: TerminalSessionState
  active: boolean
}>()

const emit = defineEmits<{
  focusInput: []
}>()

const containerRef = ref<HTMLElement>()
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null
let domObserver: MutationObserver | null = null
let unsubscribeData: (() => void) | null = null
let unsubscribeExit: (() => void) | null = null
let onDataScrollHandler: (() => void) | null = null

const themeStore = useThemeStore()
/** 是否启用了全局背景图 */
const hasBgImage = computed(() => {
  const bg = themeStore.appBackground
  return bg?.enabled && (bg.imageDataUrl || bg.imagePath)
})
/** 用户是否主动向上翻看了历史（非贴底状态） */
let userScrolledUp = false

onMounted(async () => {
  await nextTick()

  const imeEvents = ['compositionstart', 'compositionupdate', 'compositionend',
                     'beforeinput', 'textInput', 'input']
  const blockIME = (e: Event) => {
    const target = e.target as HTMLElement
    if (target && target.classList && target.classList.contains('command-input')) {
      return
    }
    e.stopImmediatePropagation()
    e.preventDefault()
    return false
  }

  for (const evt of imeEvents) {
    document.addEventListener(evt, blockIME, true)
  }

  setTimeout(() => initTerminal(), 300)
})

onUnmounted(() => {
  destroyTerminal()
})

watch(() => props.active, async (newActive) => {
  if (newActive) {
    await nextTick()
    setTimeout(() => doFit(), 100)
  }
})

watch(() => themeStore.currentTheme, (theme) => {
  if (theme && terminal) {
    terminal.options.theme = getXtermTheme(theme)
    terminal.options.fontFamily = theme.ui.fontFamily
    terminal.options.fontSize = theme.ui.fontSize
    terminal.options.lineHeight = theme.ui.lineHeight
    terminal.options.cursorBlink = theme.ui.cursorBlink
    terminal.options.cursorStyle = theme.ui.cursorStyle
    // 强制刷新，让背景色变更立即生效
    terminal.refresh(0, terminal.rows - 1)
    // 确保终端 DOM 容器透明，使底层壁纸能透过来
    nextTick(() => {
      const el = terminal?.element
      if (el) {
        el.style.backgroundColor = 'transparent'
        const screen = el.querySelector('.xterm-screen') as HTMLElement
        if (screen) screen.style.backgroundColor = 'transparent'
      }
    })
  }
}, { deep: true })

/** 获取 xterm 主题：启用自定义背景图时让终端背景透明，使壁纸透过来 */
function getXtermTheme(theme: TerminalTheme) {
  const bgEnabled = theme.appBackground?.enabled &&
    (theme.appBackground.imageDataUrl || theme.appBackground.imagePath)
  if (bgEnabled) {
    // rgba(0,0,0,0) 比 transparent 在 xterm 里更稳定
    return { ...theme.colors, background: 'rgba(0, 0, 0, 0)' }
  }
  return theme.colors
}

function handleWrapperClick() {
  // 点击终端任何区域都把焦点交回底部命令输入框
  emit('focusInput')
}

function isAtBottom(threshold = 2): boolean {
  if (!terminal) return true
  const buffer = terminal.buffer.active
  return buffer.viewportY >= buffer.baseY - threshold
}

function syncScrollState() {
  if (!terminal) return
  userScrolledUp = !isAtBottom(1)
}

function doFit() {
  if (!fitAddon || !terminal || !containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  // 记录自适应前的相对滚动位置，避免 fit 后跳回顶部
  const wasAtBottom = isAtBottom(1)
  const oldViewportY = terminal.buffer.active.viewportY

  try {
    fitAddon.fit()
    const cols = terminal.cols
    const rows = terminal.rows
    window.ofteenAPI.terminal.resize(props.session.id, cols, rows)
  } catch { /* ignore */ }

  // 恢复滚动位置：贴底则保持贴底，否则回到原位置
  if (wasAtBottom) {
    terminal.scrollToBottom()
  } else {
    const maxY = terminal.buffer.active.baseY
    terminal.scrollToLine(Math.min(oldViewportY, maxY))
  }
}

function initTerminal() {
  if (!containerRef.value) return

  const originalFocus = HTMLElement.prototype.focus
  HTMLElement.prototype.focus = function(options?: FocusOptions) {
    if (this.classList && (this.classList.contains('xterm-helper-textarea') ||
        this.tagName === 'TEXTAREA' && this.closest('.xterm'))) {
      return
    }
    originalFocus.call(this, options)
  }

  containerRef.value.setAttribute('inputmode', 'none')
  containerRef.value.setAttribute('autocomplete', 'off')
  containerRef.value.setAttribute('autocorrect', 'off')
  containerRef.value.setAttribute('spellcheck', 'false')
  containerRef.value.setAttribute('lang', 'en')
  containerRef.value.tabIndex = -1

  const allInputEvents = [
    'keydown', 'keyup', 'keypress',
    'compositionstart', 'compositionupdate', 'compositionend',
    'beforeinput', 'textInput', 'input'
  ]
  const blockAll = (e: Event) => {
    e.stopImmediatePropagation()
    e.preventDefault()
    return false
  }
  for (const evt of allInputEvents) {
    containerRef.value.addEventListener(evt, blockAll, true)
  }

  const currentTheme = themeStore.currentTheme

  terminal = new Terminal({
    theme: currentTheme ? getXtermTheme(currentTheme) : {},
    fontFamily: currentTheme?.ui.fontFamily || "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
    fontSize: currentTheme?.ui.fontSize || 14,
    lineHeight: currentTheme?.ui.lineHeight || 1.2,
    cursorBlink: currentTheme?.ui.cursorBlink ?? true,
    cursorStyle: currentTheme?.ui.cursorStyle || 'block',
    allowProposedApi: true,
    allowTransparency: true,
    scrollback: 10000,
    convertEol: true,
    disableStdin: true,
    windowsMode: true
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())

  terminal.open(containerRef.value)

  // 初始化后确保终端容器透明，便于自定义背景图透出
  if (terminal.element) {
    terminal.element.style.backgroundColor = 'transparent'
  }

  // 监听用户滚动行为，判断是否处于“主动翻看历史”状态
  terminal.onScroll(() => {
    syncScrollState()
  })

  const removeAllIMEElements = () => {
    const selectors = [
      '.xterm textarea',
      '.xterm-helper-textarea',
      '.composition-view',
      '[class*="composition"]',
      '[class*="Composition"]'
    ]
    selectors.forEach(selector => {
      const elements = containerRef.value?.querySelectorAll(selector)
      elements?.forEach(el => el.remove())
    })
  }

  removeAllIMEElements()
  setTimeout(removeAllIMEElements, 50)
  setTimeout(removeAllIMEElements, 100)

  const terminalEl = containerRef.value.querySelector('.xterm') as any
  if (terminalEl && terminalEl._core) {
    const methodsToDisable = [
      'input', 'keyPress', 'keyDown', 'keyUp', 'textInput',
      'handleComposition', 'compositionstart', 'compositionupdate', 'compositionend'
    ]
    for (const method of methodsToDisable) {
      if (terminalEl._core[method] && typeof terminalEl._core[method] === 'function') {
        try { terminalEl._core[method] = () => {} } catch (e) {}
      }
    }
    try {
      Object.defineProperty(terminalEl._core, '_compositionHelper', {
        get: () => null,
        set: () => {},
        configurable: false
      })
    } catch (e) {}
  }

  domObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          const className = node.className || ''
          if (className.includes('composition') || className.includes('Composition')) {
            node.remove()
            continue
          }
          node.querySelectorAll('[class*="composition"], [class*="Composition"]').forEach(el => el.remove())
          node.querySelectorAll('textarea').forEach(ta => {
            if (ta.closest('.xterm')) ta.remove()
          })
        }
      }
    }
  })

  domObserver.observe(containerRef.value, {
    childList: true,
    subtree: true
  })

  unsubscribeData = window.ofteenAPI.terminal.onData((data: any) => {
    if (data.sessionId === props.session.id && terminal) {
      // 写入完成后，若用户未主动上翻则自动跟到底
      terminal.write(data.data, () => {
        if (!userScrolledUp) {
          terminal?.scrollToBottom()
        }
      })
    }
  })

  unsubscribeExit = window.ofteenAPI.terminal.onExit((data: any) => {
    if (data.sessionId === props.session.id && terminal) {
      terminal.write('\r\n[进程已退出]\r\n', () => {
        terminal?.scrollToBottom()
      })
    }
  })

  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  resizeObserver = new ResizeObserver(() => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => doFit(), 150)
  })
  resizeObserver.observe(containerRef.value)

  setTimeout(() => doFit(), 100)
  setTimeout(() => doFit(), 400)
}

function destroyTerminal() {
  domObserver?.disconnect()
  domObserver = null
  resizeObserver?.disconnect()
  resizeObserver = null
  unsubscribeData?.()
  unsubscribeExit?.()
  terminal?.dispose()
  terminal = null
  fitAddon = null
}

function forceScrollToBottom() {
  if (!terminal) return
  userScrolledUp = false
  terminal.scrollToBottom()
}

defineExpose({
  scrollToBottom: forceScrollToBottom
})
</script>

<style scoped>
.terminal-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: var(--terminal-bg, var(--bg-primary));
  overflow: hidden;
  visibility: hidden;
  z-index: 0;
}

.terminal-wrapper.active {
  visibility: visible;
  z-index: 1;
}

.terminal-wrapper.has-bg-image {
  background: transparent;
}

.terminal-header {
  flex-shrink: 0;
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-md);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.terminal-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-success);
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(158, 206, 106, 0.4);
}

.session-name {
  font-size: var(--text-xs);
  color: var(--fg-secondary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.terminal-container {
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
  background: transparent;
}
</style>

<style>
/* xterm 核心样式已由 @xterm/xterm/css/xterm.css 提供，下面只做覆盖与增强 */

/* 启用全局背景图时，让 xterm 内部画布/视口背景彻底透明 */
.terminal-wrapper.has-bg-image .xterm,
.terminal-wrapper.has-bg-image .xterm-viewport,
.terminal-wrapper.has-bg-image .xterm-screen,
.terminal-wrapper.has-bg-image .xterm-rows {
  background-color: transparent !important;
}

.terminal-wrapper.has-bg-image .xterm-viewport {
  scrollbar-color: rgba(255, 255, 255, 0.35) transparent !important;
}

.terminal-wrapper.has-bg-image .xterm-viewport::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.35) !important;
}

.terminal-wrapper.has-bg-image .xterm-viewport::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.55) !important;
}

.xterm {
  height: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* 彻底隐藏 xterm 内部用于输入/IME 的元素，防止抢占焦点 */
.xterm textarea,
.xterm-helper-textarea,
.xterm .xterm-helper-textarea {
  display: none !important;
  visibility: hidden !important;
  width: 0 !important;
  height: 0 !important;
  opacity: 0 !important;
  position: absolute !important;
  left: -99999px !important;
  top: -99999px !important;
  pointer-events: none !important;
}

.xterm [class*="composition"],
.xterm [class*="Composition"],
.xterm-composition-view,
.xterm-composition-helper {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* 确保视口可滚动、滚动条可见且可交互 */
.xterm-viewport {
  overflow-y: scroll !important;
  overflow-x: hidden !important;
  scrollbar-width: thin !important;
  scrollbar-color: rgba(128, 128, 128, 0.5) transparent !important;
  pointer-events: auto !important;
}

.xterm-viewport::-webkit-scrollbar {
  width: 6px !important;
  display: block !important;
}

.xterm-viewport::-webkit-scrollbar-track {
  background: transparent !important;
}

.xterm-viewport:hover::-webkit-scrollbar-track {
  background: rgba(128, 128, 128, 0.08) !important;
}

.xterm-viewport::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.45) !important;
  border-radius: 3px !important;
  min-height: 32px !important;
  transition: background 0.15s ease, box-shadow 0.15s ease !important;
}

.xterm-viewport::-webkit-scrollbar-thumb:hover {
  background: rgba(180, 180, 180, 0.75) !important;
  box-shadow: 0 0 6px rgba(180, 180, 180, 0.35) !important;
}

.xterm-viewport::-webkit-scrollbar-thumb:active {
  background: rgba(210, 210, 210, 0.9) !important;
  box-shadow: 0 0 8px rgba(210, 210, 210, 0.45) !important;
}

.xterm-screen {
  pointer-events: auto !important;
}

/* 确保辅助层不遮挡滚动条拖拽与点击 */
.xterm .xterm-accessibility:not(.debug),
.xterm .xterm-message {
  pointer-events: none !important;
  z-index: 0 !important;
}

/* overview ruler 可能覆盖滚动条区域，直接隐藏 */
.xterm-decoration-overview-ruler {
  display: none !important;
}
</style>
