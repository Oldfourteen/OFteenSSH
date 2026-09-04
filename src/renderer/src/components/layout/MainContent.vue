<template>
  <div class="main-content" ref="mainContentRef">
    <!-- 视图切换 -->
    <div class="main-view-switcher">
      <button
        class="view-tab"
        :class="{ active: !fileManagerStore.isActive }"
        @click="switchToTerminal"
      >
        终端
      </button>
      <button
        class="view-tab"
        :class="{ active: fileManagerStore.isActive }"
        @click="switchToFileManager"
      >
        文件管理
      </button>
    </div>

    <div v-show="!fileManagerStore.isActive" class="terminal-section">
      <TerminalTabBar
        v-if="terminalStore.orderedSessions.length > 0"
        :sessions="terminalStore.orderedSessions"
        :activeSessionId="terminalStore.activeSessionId || ''"
        @select="handleSelect"
        @close="terminalStore.closeTerminal"
      />

      <div class="terminal-area" ref="terminalArea">
        <TerminalView
          v-for="session in terminalStore.orderedSessions"
          :key="session.id"
          :ref="(el) => setTerminalRef(session.id, el as InstanceType<typeof TerminalView>)"
          :session="session"
          :active="session.id === terminalStore.activeSessionId"
          @focus-input="dockRef?.focusInput()"
        />

        <TerminalWelcome
          v-if="terminalStore.orderedSessions.length === 0"
          @connect="handleConnectFromWelcome"
        />
      </div>

      <div
        v-if="terminalStore.activeSession"
        class="dock-resize-handle"
        :class="{ dragging: isResizing }"
        @mousedown="startResize"
        title="拖动调整底部区域高度"
      >
        <div class="resize-grip"></div>
      </div>

      <TerminalBottomDock
        v-if="terminalStore.activeSession"
        ref="dockRef"
        class="resizable-dock"
        :style="dockStyle"
        :connection-id="terminalStore.activeSession.connectionId"
        :session-id="terminalStore.activeSession.id"
        :active="true"
        @send="handleSend"
        @tab="handleTab"
      />
    </div>

    <FileManagerView v-show="fileManagerStore.isActive" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useTerminalStore } from '@/stores/terminal'
import { useConnectionStore } from '@/stores/connection'
import { useFileManagerStore } from '@/stores/file-manager'
import TerminalTabBar from '@/components/terminal/TerminalTabBar.vue'
import TerminalView from '@/components/terminal/TerminalView.vue'
import TerminalWelcome from '@/components/terminal/TerminalWelcome.vue'
import TerminalBottomDock from '@/components/terminal/TerminalBottomDock.vue'
import FileManagerView from '@/components/file-manager/FileManagerView.vue'

const terminalStore = useTerminalStore()
const connectionStore = useConnectionStore()
const fileManagerStore = useFileManagerStore()
const terminalArea = ref<HTMLElement>()
const mainContentRef = ref<HTMLElement>()
const dockRef = ref<InstanceType<typeof TerminalBottomDock> | null>(null)
const terminalRefs = ref<Map<string, InstanceType<typeof TerminalView>>>(new Map())

const DOCK_MIN_HEIGHT = 80
const DOCK_MAX_RATIO = 0.55

const dockHeight = ref(165)
const isResizing = ref(false)

const dockStyle = computed(() => ({
  height: `${dockHeight.value}px`,
  flexShrink: 0,
  maxHeight: 'none'
}))

watch(
  () => terminalStore.activeSessionId,
  (sessionId) => {
    if (sessionId) {
      const session = terminalStore.sessions.get(sessionId)
      if (session) {
        connectionStore.setActiveConnection(session.connectionId)
      }
    }
    nextTick(() => {
      dockRef.value?.focusInput()
    })
  }
)

function setTerminalRef(
  sessionId: string,
  el: InstanceType<typeof TerminalView> | null
) {
  if (el) {
    terminalRefs.value.set(sessionId, el)
  } else {
    terminalRefs.value.delete(sessionId)
  }
}

function handleSelect(sessionId: string) {
  terminalStore.setActiveSession(sessionId)
}

function activeTerminal() {
  const sessionId = terminalStore.activeSessionId
  if (!sessionId) return null
  return terminalRefs.value.get(sessionId) || null
}

function startResize(e: MouseEvent) {
  e.preventDefault()
  isResizing.value = true
  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!mainContentRef.value) return
    const rect = mainContentRef.value.getBoundingClientRect()
    const maxHeight = Math.max(DOCK_MIN_HEIGHT, rect.height * DOCK_MAX_RATIO)
    const newHeight = rect.bottom - moveEvent.clientY
    dockHeight.value = Math.min(Math.max(newHeight, DOCK_MIN_HEIGHT), maxHeight)
  }

  const onMouseUp = () => {
    isResizing.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function handleSend(command: string) {
  const sessionId = terminalStore.activeSessionId
  if (!sessionId) return
  window.ofteenAPI.terminal.write(sessionId, command + '\n')
  // 发送命令后强制当前终端滚到最底部
  nextTick(() => {
    activeTerminal()?.scrollToBottom()
  })
}

function handleTab() {
  const sessionId = terminalStore.activeSessionId
  if (!sessionId) return
  window.ofteenAPI.terminal.write(sessionId, '\t')
  nextTick(() => {
    activeTerminal()?.scrollToBottom()
  })
}

async function handleConnectFromWelcome() {
  // 触发侧边栏的连接操作
}

function switchToTerminal() {
  fileManagerStore.isActive = false
}

function switchToFileManager() {
  fileManagerStore.isActive = true
  const id = connectionStore.activeConnectionId
  if (id && connectionStore.activeConnectionStatus === 'connected') {
    fileManagerStore.activate(id)
  }
}
</script>

<style scoped>
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  min-width: 0;
  overflow: hidden;
}

.terminal-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.terminal-area {
  flex: 1 1 auto;
  position: relative;
  overflow: hidden;
  min-height: 0; /* flex 子项可收缩，避免日志区被撑破后裁切 */
}

.dock-resize-handle {
  flex-shrink: 0;
  height: 7px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
  border-bottom: 1px solid var(--border-primary);
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast);
}

.dock-resize-handle:hover,
.dock-resize-handle.dragging {
  background: var(--bg-hover);
}

.resize-grip {
  width: 28px;
  height: 3px;
  border-radius: 2px;
  background: var(--fg-muted);
  opacity: 0.4;
  transition: opacity var(--transition-fast), background var(--transition-fast);
}

.dock-resize-handle:hover .resize-grip,
.dock-resize-handle.dragging .resize-grip {
  opacity: 0.8;
  background: var(--accent-primary);
}

.resizable-dock {
  flex-shrink: 0;
}

.main-view-switcher {
  flex-shrink: 0;
  display: flex;
  padding: var(--spacing-sm) var(--spacing-lg);
  gap: 2px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.view-tab {
  padding: 4px 12px;
  font-size: var(--text-xs);
  color: var(--fg-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.view-tab:hover {
  color: var(--fg-secondary);
  background: var(--bg-hover);
}

.view-tab.active {
  color: var(--fg-primary);
  background: var(--bg-tertiary);
  border-color: var(--border-secondary);
}
</style>
