<template>
  <div class="file-manager-breadcrumb">
    <span
      v-for="(segment, index) in segments"
      :key="index"
      class="breadcrumb-segment"
      :class="{ clickable: segment.clickable, active: !segment.clickable }"
      @click="segment.clickable && $emit('navigate', segment.path)"
    >
      {{ segment.name }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  path: string
}>()

const emit = defineEmits<{
  navigate: [path: string]
}>()

interface Segment {
  name: string
  path: string
  clickable: boolean
}

const segments = computed<Segment[]>(() => {
  const list: Segment[] = []
  if (props.path === '~') {
    list.push({ name: '~', path: '~', clickable: false })
    return list
  }

  if (props.path === '/') {
    list.push({ name: '/', path: '/', clickable: false })
    return list
  }

  list.push({ name: '~', path: '~', clickable: true })

  const normalized = props.path.replace(/\\/g, '/')
  const homePrefix = '/home/'
  let remaining = normalized

  // 如果路径以 /home/xxx 开头，隐藏前两级，从用户目录开始显示
  if (normalized.startsWith(homePrefix)) {
    const withoutHome = normalized.substring(homePrefix.length)
    const slashIndex = withoutHome.indexOf('/')
    if (slashIndex === -1) {
      return [{ name: '~', path: normalized, clickable: false }]
    }
    remaining = withoutHome.substring(slashIndex + 1)
  } else {
    remaining = normalized.substring(1)
  }

  const parts = remaining.split('/').filter(Boolean)
  let currentPath = normalized.startsWith(homePrefix)
    ? normalized.substring(0, normalized.indexOf('/', homePrefix.length))
    : ''

  parts.forEach((part, index) => {
    currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`
    list.push({
      name: part,
      path: currentPath,
      clickable: index < parts.length - 1
    })
  })

  return list
})
</script>

<style scoped>
.file-manager-breadcrumb {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  font-size: var(--text-sm);
  color: var(--fg-secondary);
  overflow-x: auto;
  white-space: nowrap;
}

.breadcrumb-segment {
  display: inline-flex;
  align-items: center;
}

.breadcrumb-segment:not(:last-child)::after {
  content: '/';
  margin-left: 4px;
  color: var(--fg-muted);
}

.breadcrumb-segment.clickable {
  cursor: pointer;
  color: var(--accent-primary);
}

.breadcrumb-segment.clickable:hover {
  text-decoration: underline;
}

.breadcrumb-segment.active {
  color: var(--fg-primary);
  font-weight: 500;
}
</style>
