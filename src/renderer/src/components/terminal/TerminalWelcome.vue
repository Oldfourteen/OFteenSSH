<template>
  <div class="terminal-welcome">
    <div class="welcome-content">
      <div class="welcome-logo">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="4" y="8" width="56" height="48" rx="4" stroke="var(--accent-primary)" stroke-width="2" fill="none"/>
          <polyline points="14,24 24,32 14,40" stroke="var(--accent-primary)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
          <line x1="30" y1="40" x2="44" y2="40" stroke="var(--accent-primary)" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>

      <h1 class="welcome-title">OFteenSSH</h1>
      <p class="welcome-subtitle">安全可靠的 SSH 管理工具</p>

      <div class="welcome-tips">
        <div class="tip">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="var(--accent-info)" stroke-width="1.5" fill="none"/>
            <text x="8" y="11" text-anchor="middle" fill="var(--accent-info)" font-size="10" font-weight="bold">1</text>
          </svg>
          <span>在左侧选择一个连接，点击建立 SSH 连接</span>
        </div>
        <div class="tip">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="var(--accent-info)" stroke-width="1.5" fill="none"/>
            <text x="8" y="11" text-anchor="middle" fill="var(--accent-info)" font-size="10" font-weight="bold">2</text>
          </svg>
          <span>或点击左上角的 + 按钮新建连接</span>
        </div>
        <div class="tip">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="var(--accent-info)" stroke-width="1.5" fill="none"/>
            <text x="8" y="11" text-anchor="middle" fill="var(--accent-info)" font-size="10" font-weight="bold">3</text>
          </svg>
          <span>连接成功后右侧面板将显示系统监控信息</span>
        </div>
      </div>

      <div class="welcome-features">
        <div class="feature">
          <svg class="feature-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="10" rx="2" stroke="var(--accent-primary)" stroke-width="1.5" fill="none"/>
            <path d="M5 6.5L7 8.5L5 10.5" stroke="var(--accent-primary)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="8.5" y1="10.5" x2="11" y2="10.5" stroke="var(--accent-primary)" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>安全连接</span>
        </div>
        <div class="feature">
          <svg class="feature-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="1" stroke="var(--accent-success)" stroke-width="1.5" fill="none"/>
            <polyline points="3,11 6,7 8,9 11,5 13,7" stroke="var(--accent-success)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
          <span>实时监控</span>
        </div>
        <div class="feature">
          <svg class="feature-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="var(--accent-secondary)" stroke-width="1.5" fill="none"/>
            <circle cx="8" cy="8" r="3" stroke="var(--accent-secondary)" stroke-width="1" fill="none"/>
            <circle cx="8" cy="8" r="1" fill="var(--accent-secondary)"/>
          </svg>
          <span>主题定制</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  connect: []
}>()
</script>

<style scoped>
.terminal-welcome {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.welcome-content {
  text-align: center;
  max-width: 400px;
}

.welcome-logo {
  margin-bottom: var(--spacing-xl);
}

.welcome-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--fg-primary);
  margin-bottom: var(--spacing-sm);
}

.welcome-subtitle {
  font-size: var(--text-lg);
  color: var(--fg-muted);
  margin-bottom: var(--spacing-xl);
}

.welcome-tips {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.tip {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-md);
  color: var(--fg-secondary);
}

.welcome-features {
  display: flex;
  gap: var(--spacing-xl);
  justify-content: center;
}

.feature {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--fg-muted);
}

.feature-icon {
  flex-shrink: 0;
}
</style>
