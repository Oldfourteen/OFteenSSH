import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface TerminalSessionState {
  id: string
  connectionId: string
  name: string
  active: boolean
  cols: number
  rows: number
}

export const useTerminalStore = defineStore('terminal', () => {
  const sessions = ref<Map<string, TerminalSessionState>>(new Map())
  const activeSessionId = ref<string | null>(null)
  const sessionOrder = ref<string[]>([])
  /** 按 sessionId 隔离的命令历史 */
  const commandHistories = ref<Map<string, string[]>>(new Map())

  const activeSession = computed(() =>
    activeSessionId.value ? sessions.value.get(activeSessionId.value) : null
  )

  const orderedSessions = computed(() =>
    sessionOrder.value
      .map((id) => sessions.value.get(id))
      .filter(Boolean) as TerminalSessionState[]
  )

  /** 打开终端 */
  async function openTerminal(connectionId: string, name: string) {
    try {
      const sessionId = await window.ofteenAPI.terminal.create(connectionId)
      const session: TerminalSessionState = {
        id: sessionId,
        connectionId,
        name,
        active: true,
        cols: 80,
        rows: 24
      }
      sessions.value.set(sessionId, session)
      sessionOrder.value.push(sessionId)
      activeSessionId.value = sessionId
      return sessionId
    } catch (err) {
      console.error('打开终端失败:', err)
      throw err
    }
  }

  /** 关闭终端 */
  async function closeTerminal(sessionId: string) {
    try {
      await window.ofteenAPI.terminal.kill(sessionId)
    } catch {
      // 忽略
    }
    sessions.value.delete(sessionId)
    sessionOrder.value = sessionOrder.value.filter((id) => id !== sessionId)

    if (activeSessionId.value === sessionId) {
      const remaining = sessionOrder.value
      activeSessionId.value = remaining.length > 0 ? remaining[remaining.length - 1] : null
    }

    commandHistories.value.delete(sessionId)
  }

  /** 获取指定会话的命令历史 */
  function getCommandHistory(sessionId: string): string[] {
    return commandHistories.value.get(sessionId) || []
  }

  /** 向指定会话的命令历史追加命令 */
  function addCommandToHistory(sessionId: string, command: string): void {
    const history = commandHistories.value.get(sessionId)
    if (!history) {
      commandHistories.value.set(sessionId, [command])
      return
    }
    if (history.length === 0 || history[history.length - 1] !== command) {
      history.push(command)
    }
  }

  /** 设置活跃终端 */
  function setActiveSession(sessionId: string) {
    activeSessionId.value = sessionId
  }

  /** 调整终端尺寸 */
  function resizeTerminal(sessionId: string, cols: number, rows: number) {
    const session = sessions.value.get(sessionId)
    if (session) {
      session.cols = cols
      session.rows = rows
      window.ofteenAPI.terminal.resize(sessionId, cols, rows)
    }
  }

  return {
    sessions,
    activeSessionId,
    sessionOrder,
    commandHistories,
    activeSession,
    orderedSessions,
    openTerminal,
    closeTerminal,
    setActiveSession,
    resizeTerminal,
    getCommandHistory,
    addCommandToHistory
  }
})
