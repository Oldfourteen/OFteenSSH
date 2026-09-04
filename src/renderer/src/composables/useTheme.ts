import { ref, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '@/stores/theme'

export function useTheme() {
  const themeStore = useThemeStore()
  const isLoaded = ref(false)

  onMounted(async () => {
    await themeStore.loadThemes()
    isLoaded.value = true
  })

  return {
    themeStore,
    isLoaded,
    applyTheme: themeStore.applyTheme,
    currentTheme: themeStore.currentTheme,
    allThemes: themeStore.allThemes
  }
}
