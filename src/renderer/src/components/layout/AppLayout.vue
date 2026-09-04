<template>
  <div class="app-layout">
    <!-- 自定义主题背景层 -->
    <div class="app-bg-layer"></div>

    <!-- 应用内容层：提升 z-index 确保位于背景层之上 -->
    <div class="app-content-layer">
      <!-- 自定义标题栏 -->
      <div class="titlebar">
      <div class="titlebar-drag">
        <span class="titlebar-title">OFteenSSH</span>
      </div>
      <div class="titlebar-controls">
        <button class="titlebar-btn titlebar-minimize" @click="minimize" title="最小化">
          <svg width="12" height="12"><rect y="5" width="12" height="2" fill="currentColor"/></svg>
        </button>
        <button class="titlebar-btn titlebar-maximize" @click="maximize" title="最大化">
          <svg width="12" height="12"><rect x="1" y="1" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
        </button>
        <button class="titlebar-btn titlebar-close" @click="close" title="关闭">
          <svg width="12" height="12"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.5"/><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </div>
    </div>

      <!-- 三栏布局 -->
      <div class="app-content">
        <Sidebar />
        <MainContent />
        <SidePanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue'
import MainContent from './MainContent.vue'
import SidePanel from './SidePanel.vue'

function minimize() {
  window.ofteenAPI.window.minimize()
}

function maximize() {
  window.ofteenAPI.window.maximize()
}

function close() {
  window.ofteenAPI.window.close()
}
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: transparent;
}

.app-bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  background-image: var(--app-bg-image, none);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: var(--app-bg-opacity, 1);
  pointer-events: none;
}

.app-content-layer {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--titlebar-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  -webkit-app-region: drag;
}

.titlebar-drag {
  flex: 1;
  padding-left: var(--spacing-lg);
}

.titlebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--fg-muted);
}

.titlebar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.titlebar-btn {
  width: 46px;
  height: var(--titlebar-height);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--fg-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.titlebar-btn:hover {
  background: var(--bg-hover);
  color: var(--fg-primary);
}

.titlebar-close:hover {
  background: var(--accent-danger);
  color: white;
}

.app-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
</style>
