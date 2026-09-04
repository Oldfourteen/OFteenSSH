<template>
  <div class="command-panel">
    <span class="input-prompt">$</span>
    <div class="input-wrapper">
      <pre class="highlight-layer" aria-hidden="true"><code v-html="highlightedHtml"></code></pre>
      <textarea
        ref="inputRef"
        v-model="commandInput"
        class="command-input"
        rows="1"
        placeholder="输入命令后按 Enter 发送..."
        @keydown.enter.prevent="sendCommand"
        @keydown.up.prevent="historyPrev"
        @keydown.down.prevent="historyNext"
        @keydown.tab.prevent="emit('tab')"
        @scroll="syncScroll"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </div>
    <button
      class="send-btn"
      @click="sendCommand"
      :disabled="!commandInput.trim()"
      title="发送命令 (Enter)"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M2 7L12 7M12 7L7 2M12 7L7 12"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useTerminalStore } from '@/stores/terminal'
import { highlightShell } from '@/utils/shell-highlight'

const props = defineProps<{
  sessionId: string
}>()

const emit = defineEmits<{
  send: [command: string]
  tab: []
}>()

const terminalStore = useTerminalStore()
const inputRef = ref<HTMLTextAreaElement>()
const commandInput = ref('')
const commandHistory = computed(() => terminalStore.getCommandHistory(props.sessionId))
const historyIndex = ref(commandHistory.value.length)

const highlightedHtml = computed(() => highlightShell(commandInput.value))

watch(
  () => props.sessionId,
  () => {
    commandInput.value = ''
    historyIndex.value = commandHistory.value.length
  }
)

function sendCommand(): void {
  const cmd = commandInput.value.trim()
  if (!cmd) return
  terminalStore.addCommandToHistory(props.sessionId, cmd)
  historyIndex.value = terminalStore.getCommandHistory(props.sessionId).length
  emit('send', cmd)
  commandInput.value = ''
}

function historyPrev(): void {
  const history = commandHistory.value
  if (history.length === 0) return
  if (historyIndex.value > 0) {
    historyIndex.value--
    commandInput.value = history[historyIndex.value]
  }
}

function historyNext(): void {
  const history = commandHistory.value
  if (historyIndex.value < history.length - 1) {
    historyIndex.value++
    commandInput.value = history[historyIndex.value]
  } else {
    historyIndex.value = history.length
    commandInput.value = ''
  }
}

function syncScroll() {
  const textarea = inputRef.value
  const layer = textarea?.parentElement?.querySelector('.highlight-layer') as HTMLElement | null
  if (textarea && layer) {
    layer.scrollLeft = textarea.scrollLeft
  }
}

defineExpose({
  focus: () => {
    nextTick(() => inputRef.value?.focus())
  }
})
</script>

<style scoped>
.command-panel {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
}

.input-prompt {
  color: var(--accent-success);
  font-weight: bold;
  font-size: 14px;
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.input-wrapper {
  flex: 1;
  position: relative;
  min-width: 0;
  overflow: hidden;
}

.command-input,
.highlight-layer {
  width: 100%;
  min-height: 24px;
  max-height: 24px;
  padding: var(--spacing-xs) 0;
  margin: 0;
  border: none;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.2;
  letter-spacing: normal;
  word-spacing: normal;
  white-space: pre;
  overflow: hidden;
  overflow-x: auto;
  resize: none;
  outline: none;
  box-sizing: border-box;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.command-input::-webkit-scrollbar,
.highlight-layer::-webkit-scrollbar {
  display: none;
}

.command-input {
  position: relative;
  z-index: 1;
  color: transparent;
  caret-color: var(--fg-primary);
}

.command-input::placeholder {
  color: var(--fg-muted);
}

.highlight-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  pointer-events: none;
  color: var(--fg-primary);
}

.highlight-layer code {
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xs);
  background: var(--accent-primary);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--bg-primary);
  cursor: pointer;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Shell 语法高亮色，跟随主题动态变化 */
:deep(.sh-command) {
  color: var(--syntax-command);
}
:deep(.sh-flag) {
  color: var(--syntax-flag);
}
:deep(.sh-string) {
  color: var(--syntax-string);
}
:deep(.sh-variable) {
  color: var(--syntax-variable);
}
:deep(.sh-operator) {
  color: var(--syntax-operator);
}
:deep(.sh-subcommand) {
  color: var(--syntax-subcommand);
}
:deep(.sh-comment) {
  color: var(--syntax-comment);
}
</style>
