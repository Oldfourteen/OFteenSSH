<template>
  <div class="dialog-overlay" @click.self="close">
    <div class="customizer-dialog">
      <div class="dialog-header">
        <h3>自定义主题背景</h3>
        <button class="btn-icon close-btn" @click="close">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="dialog-body">
        <div class="preview-section">
          <div class="preview-meta">
            <span class="preview-label">基于主题</span>
            <span class="preview-base-name">{{ baseThemeName }}</span>
          </div>
          <div class="preview-area">
            <div
              v-if="imageDataUrl"
              class="preview-bg"
              :style="previewBgStyle"
            ></div>
            <div v-else class="preview-placeholder">未选择背景图片</div>
            <span class="preview-text" :style="textPreviewStyle">字体效果预览</span>
          </div>
          <p class="preview-tip">上方预览会实时反映背景图、透明度、字体颜色和字体效果</p>
        </div>

        <div class="controls-section">
          <div class="field">
            <label>字体颜色</label>
            <div class="color-row">
              <input type="color" v-model="fontColor" />
              <span class="color-value">{{ fontColor }}</span>
              <button class="btn-text" @click="resetFontColor">重置为默认</button>
            </div>
          </div>

          <div class="field">
            <label>字体效果</label>
            <select v-model="fontEffect" class="select">
              <option value="normal">正常</option>
              <option value="bold">加粗</option>
              <option value="shadow">阴影</option>
              <option value="bold-shadow">加粗 + 阴影</option>
            </select>
          </div>

          <div class="field">
            <label>背景图片</label>
            <div v-if="imageDataUrl" class="image-info">
              <span class="image-name" :title="imageName">{{ imageName }}</span>
              <button class="btn-text remove-btn" @click="removeImage">移除图片</button>
            </div>
            <button v-else class="btn upload-btn" @click="uploadImage">上传图片</button>
          </div>

          <div class="field">
            <label>图片保存位置</label>
            <div class="image-info">
              <span class="image-name" :title="backgroundImageDir">{{ backgroundImageDir }}</span>
              <button class="btn-text" @click="changeImageDir">更改位置</button>
            </div>
            <p class="path-tip">新上传的背景图将保存到该目录</p>
          </div>

          <div v-if="imageDataUrl" class="field">
            <div class="slider-header">
              <label>图片透明度</label>
              <span class="slider-value">{{ Math.round(opacity * 100) }}%</span>
            </div>
            <div class="range-wrap">
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.01"
                v-model.number="opacity"
                class="range-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn" @click="close">取消</button>
        <button class="btn btn-primary" @click="save" :disabled="saving">
          {{ saving ? '保存中...' : '保存并应用' }}
        </button>
      </div>

      <p v-if="message" class="message" :class="{ error: message.startsWith('保存失败') }">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { TerminalTheme, TerminalThemeFontEffect, TerminalThemeAppBackground } from '../../../shared/types'

const emit = defineEmits<{
  close: []
}>()

const themeStore = useThemeStore()

const fontColor = ref('')
const fontEffect = ref<TerminalThemeFontEffect>('normal')
const imagePath = ref('')
const imageDataUrl = ref('')
const opacity = ref(0.5)
const saving = ref(false)
const message = ref('')
const backgroundImageDir = ref('')

onMounted(async () => {
  syncFromTheme(themeStore.currentTheme)
  try {
    backgroundImageDir.value = await window.ofteenAPI.theme.getBackgroundImageDir()
  } catch (err) {
    console.error('[ThemeCustomizer] getBackgroundImageDir failed:', err)
  }
})

watch(() => themeStore.currentTheme, (theme) => {
  syncFromTheme(theme)
})

const textPreviewStyle = computed(() => {
  const effect = fontEffect.value
  const useBold = effect.includes('bold')
  const useShadow = effect.includes('shadow')
  return {
    color: fontColor.value,
    fontWeight: useBold ? '700' : '400',
    textShadow: useShadow ? '0 2px 5px rgba(0, 0, 0, 0.7)' : 'none'
  }
})

const previewBgStyle = computed(() => {
  return {
    backgroundImage: 'url("' + imageDataUrl.value + '")',
    opacity: opacity.value
  }
})

const imageName = computed(() => {
  if (!imagePath.value) return ''
  const normalized = imagePath.value.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || imagePath.value
})

const baseThemeName = computed(() => {
  return themeStore.currentTheme?.name || '未知主题'
})

function syncFromTheme(theme: TerminalTheme | undefined) {
  if (!theme) return
  // 背景图配置已独立，优先从全局 store 读取
  const appBg = themeStore.appBackground
  fontColor.value = appBg?.fontColor || theme.colors.foreground
  fontEffect.value = appBg?.fontEffect || 'normal'
  imagePath.value = appBg?.imagePath || ''
  imageDataUrl.value = appBg?.imageDataUrl || ''
  opacity.value = appBg?.opacity ?? 0.5
}

function resetFontColor() {
  fontColor.value = themeStore.currentTheme?.colors.foreground || '#c0caf5'
}

async function uploadImage() {
  try {
    const result = await window.ofteenAPI.theme.uploadBackgroundImage()
    if (!result.canceled && result.filePath && result.dataUrl) {
      imagePath.value = result.filePath
      imageDataUrl.value = result.dataUrl
      opacity.value = 0.5
      message.value = ''
    }
  } catch (err) {
    message.value = `上传失败: ${(err as Error).message}`
  }
}

function removeImage() {
  imagePath.value = ''
  imageDataUrl.value = ''
}

async function changeImageDir() {
  try {
    const result = await window.ofteenAPI.dialog.selectDirectory()
    if (!result.canceled && result.filePath) {
      const resolved = await window.ofteenAPI.theme.setBackgroundImageDir(result.filePath)
      backgroundImageDir.value = resolved
      message.value = '保存位置已更新'
      setTimeout(() => { message.value = '' }, 1500)
    }
  } catch (err) {
    message.value = `更改位置失败: ${(err as Error).message}`
  }
}

async function save() {
  const base = themeStore.currentTheme
  if (!base) return

  saving.value = true
  message.value = ''

  try {
    // 只保存全局背景图配置到当前主题，不再创建新的自定义主题
    const bg: TerminalThemeAppBackground = {
      enabled: !!imageDataUrl.value,
      imagePath: imagePath.value,
      imageDataUrl: imageDataUrl.value,
      opacity: opacity.value,
      fontColor: fontColor.value,
      fontEffect: fontEffect.value
    }
    console.log('[ThemeCustomizer] saving app background, enabled:', bg.enabled, 'hasImage:', !!bg.imageDataUrl)
    await themeStore.saveAppBackground(bg)

    // 重新应用当前主题（会带上新的全局背景配置）
    console.log('[ThemeCustomizer] applying theme:', base.id)
    await themeStore.applyTheme(base.id)
    console.log('[ThemeCustomizer] currentTheme after apply:', themeStore.currentTheme?.id, themeStore.currentTheme?.name)

    // 同步到弹窗
    syncFromTheme(themeStore.currentTheme)
    message.value = '保存并应用成功'
    setTimeout(() => {
      close()
    }, 600)
  } catch (err) {
    console.error('[ThemeCustomizer] save failed:', err)
    message.value = `保存失败: ${(err as Error).message}`
  } finally {
    saving.value = false
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 24px;
}

.customizer-dialog {
  width: 860px;
  max-width: 100%;
  max-height: calc(100vh - 48px);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 55px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--border-primary);
}

.dialog-header h3 {
  font-size: var(--text-xl);
  color: var(--fg-primary);
  font-weight: 600;
}

.close-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--fg-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--fg-primary);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  min-width: 0;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
}

.preview-label {
  color: var(--fg-muted);
}

.preview-base-name {
  color: var(--fg-primary);
  font-weight: 600;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
}

.preview-area {
  position: relative;
  min-height: 260px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-primary);
  background-color: var(--bg-primary);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  will-change: opacity;
}

.preview-placeholder {
  color: var(--fg-muted);
  font-size: var(--text-md);
}

.preview-text {
  position: relative;
  z-index: 1;
  font-size: var(--text-xl);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.35);
  white-space: nowrap;
}

.preview-tip {
  font-size: var(--text-sm);
  color: var(--fg-muted);
  margin: 0;
  line-height: 1.5;
}

.controls-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  min-width: 0;
  /* 覆盖 panel-shared.css 里对 .field 的全局固定高度与等宽字体 */
  height: auto;
  min-height: auto;
  font-family: var(--font-sans);
}

.field label {
  font-size: var(--text-md);
  color: var(--fg-primary);
  font-weight: 600;
}

.color-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 0;
}

input[type="color"] {
  width: 48px;
  height: 36px;
  padding: 2px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.color-value {
  font-size: var(--text-sm);
  color: var(--fg-muted);
  font-family: var(--font-mono);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-primary);
}

.select {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--fg-primary);
  font-size: var(--text-md);
  font-family: var(--font-sans);
  outline: none;
  cursor: pointer;
  line-height: 1.5;
}

.slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.slider-value {
  font-size: var(--text-sm);
  color: var(--fg-secondary);
  font-family: var(--font-mono);
  flex-shrink: 0;
  padding: 2px 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-primary);
}

.range-wrap {
  padding: 2px 0;
}

.range-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 22px;
  background: transparent;
  outline: none;
  cursor: pointer;
  margin: 0;
}

.range-input::-webkit-slider-runnable-track {
  width: 100%;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  border: 1px solid var(--border-primary);
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-primary);
  border: 2px solid var(--bg-secondary);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  margin-top: -6px;
}

.range-input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.5);
  background: var(--accent-secondary);
}

.range-input::-webkit-slider-thumb:active {
  transform: scale(1.1);
  background: var(--accent-secondary);
}

.range-input::-moz-range-track {
  width: 100%;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  border: 1px solid var(--border-primary);
}

.range-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-primary);
  border: 2px solid var(--bg-secondary);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.image-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  min-width: 0;
}

.image-name {
  font-size: var(--text-sm);
  color: var(--fg-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--fg-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--fg-primary);
  border-color: var(--border-secondary);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-primary);
  color: #1a1b26;
  border-color: var(--accent-primary);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.upload-btn {
  width: 100%;
  padding: var(--spacing-sm);
  font-size: var(--text-sm);
}

.btn-text {
  background: transparent;
  border: none;
  color: var(--accent-primary);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

.btn-text:hover {
  text-decoration: none;
  background: rgba(122, 162, 247, 0.12);
}

.path-tip {
  font-size: var(--text-xs);
  color: var(--fg-muted);
  margin: 0;
  line-height: 1.5;
}

.dialog-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--border-primary);
}

.message {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--accent-success);
  padding: 0 var(--spacing-lg) var(--spacing-md);
  margin: 0;
}

.message.error {
  color: var(--accent-danger);
}

@media (max-width: 780px) {
  .dialog-overlay {
    padding: 16px;
  }

  .customizer-dialog {
    max-height: calc(100vh - 32px);
  }

  .dialog-body {
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 20px;
  }

  .preview-area {
    min-height: 180px;
  }
}
</style>
