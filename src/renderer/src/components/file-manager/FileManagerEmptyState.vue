<template>
  <div class="file-manager-empty">
    <svg width="48" height="48" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 2.5C1.5 1.94772 1.94772 1.5 2.5 1.5H5.5L7 3H11.5C12.0523 3 12.5 3.44772 12.5 4V10.5C12.5 11.0523 12.0523 11.5 11.5 11.5H2.5C1.94772 11.5 1.5 11.0523 1.5 10.5V2.5Z" fill="rgba(150,160,180,0.1)" stroke="var(--fg-muted)" stroke-width="1"/>
    </svg>
    <p>{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'no-connection' | 'disconnected' | 'empty-dir' | 'error'
  message?: string
}>()

const message = computed(() => {
  if (props.message) return props.message
  switch (props.type) {
    case 'no-connection':
      return '请先在左侧连接服务器'
    case 'disconnected':
      return '连接已断开，请重新连接'
    case 'empty-dir':
      return '当前目录为空'
    case 'error':
      return '加载失败'
    default:
      return '暂无内容'
  }
})
</script>

<style scoped>
.file-manager-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  color: var(--fg-muted);
  font-size: var(--text-md);
  text-align: center;
  padding: var(--spacing-xl);
}
</style>
