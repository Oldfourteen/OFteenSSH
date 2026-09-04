<template>
  <div class="theme-selector">
    <h4 class="panel-title">
      <span>终端主题</span>
      <button class="customize-btn" title="自定义主题背景" @click="showCustomizer = true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2.5V11.5M2.5 7H11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </h4>
    <div class="theme-list">
      <div
        v-for="theme in themeStore.builtInThemes"
        :key="theme.id"
        class="theme-item"
        :class="{ active: theme.id === themeStore.currentThemeId }"
        @click="themeStore.applyTheme(theme.id)"
      >
        <div class="theme-preview">
          <div class="preview-row" :style="{ backgroundColor: theme.colors.background }">
            <span class="preview-fg" :style="{ color: theme.colors.foreground }">$ </span>
            <span class="preview-cmd" :style="{ color: theme.colors.green }">ls</span>
            <span class="preview-fg" :style="{ color: theme.colors.foreground }"> -la</span>
          </div>
        </div>
        <span class="theme-name">{{ theme.name }}</span>
      </div>
    </div>

    <ThemeCustomizerDialog v-if="showCustomizer" @close="showCustomizer = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import ThemeCustomizerDialog from './ThemeCustomizerDialog.vue'

const showCustomizer = ref(false)
const themeStore = useThemeStore()

onMounted(async () => {
  await themeStore.loadThemes()
})
</script>

<style scoped>
.theme-selector {
  margin-bottom: var(--spacing-md);
}

.panel-title {
  font-size: var(--text-sm);
  color: var(--fg-muted);
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.customize-btn {
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--fg-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.customize-btn:hover {
  background: var(--bg-hover);
  color: var(--fg-primary);
}

.theme-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.theme-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  border: 1px solid transparent;
}

.theme-item:hover {
  background: var(--bg-hover);
}

.theme-item.active {
  background: var(--bg-active);
  border-color: var(--accent-primary);
}

.theme-preview {
  width: 80px;
  height: 20px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
}

.preview-row {
  padding: 2px 6px;
  font-family: monospace;
  font-size: 10px;
  white-space: nowrap;
}

.preview-fg,
.preview-cmd {
  font-size: 10px;
}

.theme-name {
  font-size: var(--text-sm);
  color: var(--fg-secondary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-item.active .theme-name {
  color: var(--fg-primary);
}
</style>
