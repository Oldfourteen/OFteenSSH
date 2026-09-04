<template>
  <div class="disk-usage">
    <h4 class="panel-title">磁盘使用</h4>
    <div v-if="diskData && diskData.length > 0" class="disk-content">
      <div v-for="disk in diskData" :key="disk.mount" class="disk-item">
        <div class="disk-header">
          <span class="disk-mount">{{ disk.mount }}</span>
          <span class="disk-percent" :class="percentClass(disk.usagePercent)">
            {{ disk.usagePercent.toFixed(1) }}%
          </span>
        </div>
        <div class="disk-bar">
          <div
            class="disk-bar-fill"
            :class="percentClass(disk.usagePercent)"
            :style="{ width: `${Math.min(disk.usagePercent, 100)}%` }"
          ></div>
        </div>
        <div class="disk-detail">
          {{ formatSize(disk.used) }} / {{ formatSize(disk.total) }}
        </div>
      </div>

      <div class="chart-wrap" v-if="connectionId">
        <div class="chart-legend" v-if="seriesKeys.length">
          <span v-for="(key, i) in seriesKeys" :key="key" class="legend-item">
            <i class="legend-dot" :style="{ background: seriesColors[i % seriesColors.length] }"></i>
            {{ key }}
          </span>
        </div>
        <div v-if="seriesKeys.length" ref="chartRef" class="chart-container"></div>
        <div v-else class="chart-empty">等待磁盘监控数据…</div>
      </div>
    </div>
    <div v-else class="disk-empty">未连接</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useMonitorStore } from '@/stores/monitor'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  connectionId: string | null
}>()

const monitorStore = useMonitorStore()
const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let unsubMonitor: (() => void) | null = null

const seriesColors = ['#7aa2f7', '#9ece6a', '#e0af68', '#bb9af7']

const diskData = computed(() => {
  if (!props.connectionId) return null
  const data = monitorStore.getMonitorData(props.connectionId)
  return data?.disk || null
})

const seriesKeys = computed(() => {
  if (!props.connectionId) return [] as string[]
  const history = monitorStore.getDiskHistory(props.connectionId)
  if (history.length === 0) return []
  const keys = new Set<string>()
  for (const point of history) {
    Object.keys(point.mounts).forEach((k) => keys.add(k))
  }
  // 按挂载点字母顺序稳定排序，避免使用率变化导致折线颜色漂移
  return Array.from(keys).sort((a, b) => a.localeCompare(b)).slice(0, 4)
})

onMounted(() => {
  unsubMonitor = window.ofteenAPI.monitor.onData((data: any) => {
    monitorStore.updateMonitorData(data)
    if (data.connectionId === props.connectionId) updateChart()
  })
  initChart()
})

onUnmounted(() => {
  unsubMonitor?.()
  destroyChart()
})

watch(
  () => props.connectionId,
  () => {
    destroyChart()
    nextTick(() => initChart())
  }
)

watch(seriesKeys, () => {
  nextTick(() => {
    if (chartInstance) {
      chartInstance.setOption(getChartOption(), true)
      updateChart()
    } else {
      initChart()
    }
  })
})

function percentClass(p: number): string {
  if (p >= 90) return 'danger'
  if (p >= 80) return 'warn'
  return ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function initChart(): void {
  nextTick(() => {
    if (!chartRef.value || !props.connectionId) return
    const rect = chartRef.value.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      setTimeout(() => initChart(), 120)
      return
    }
    if (chartInstance) return
    chartInstance = echarts.init(chartRef.value)
    chartInstance.setOption(getChartOption())
    resizeObserver = new ResizeObserver(() => chartInstance?.resize())
    resizeObserver.observe(chartRef.value)
    updateChart()
  })
}

function getChartOption(): echarts.EChartsOption {
  const keys = seriesKeys.value
  return {
    backgroundColor: 'transparent',
    grid: { left: 28, right: 4, top: 8, bottom: 4, containLabel: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(22, 22, 30, 0.92)',
      borderColor: 'rgba(122, 162, 247, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#c0caf5', fontSize: 11 },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return ''
        return params
          .map((p: any) => `${p.marker}${p.seriesName}: ${Number(p.value).toFixed(1)}%`)
          .join('<br/>')
      }
    },
    xAxis: { type: 'category', show: false, boundaryGap: false },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitNumber: 2,
      axisLabel: { color: '#565f89', fontSize: 9, formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(41, 46, 66, 0.8)' } },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: keys.map((key, i) => ({
      name: key,
      type: 'line',
      smooth: 0.35,
      symbol: 'none',
      lineStyle: {
        color: seriesColors[i % seriesColors.length],
        width: 1.8
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: hexAlpha(seriesColors[i % seriesColors.length], 0.28) },
          { offset: 1, color: hexAlpha(seriesColors[i % seriesColors.length], 0.02) }
        ])
      },
      data: [] as number[]
    })),
    animationDuration: 280
  }
}

function hexAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

function updateChart(): void {
  if (!chartInstance || !props.connectionId) return
  const history = monitorStore.getDiskHistory(props.connectionId)
  const keys = seriesKeys.value
  if (keys.length === 0 || history.length === 0) return

  chartInstance.setOption({
    series: keys.map((key) => ({
      data: history.map((p) => p.mounts[key] ?? null)
    }))
  })
}

function destroyChart(): void {
  resizeObserver?.disconnect()
  resizeObserver = null
  chartInstance?.dispose()
  chartInstance = null
}
</script>

<style scoped>
.disk-usage {
  margin-bottom: var(--spacing-md);
}

.panel-title {
  font-size: var(--text-sm);
  color: var(--fg-muted);
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
}

.disk-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.disk-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.disk-header {
  display: flex;
  justify-content: space-between;
}

.disk-mount {
  font-size: var(--text-xs);
  color: var(--fg-secondary);
  font-weight: 500;
}

.disk-percent {
  font-size: var(--text-xs);
  color: var(--accent-primary);
  font-weight: 600;
}

.disk-percent.warn,
.disk-bar-fill.warn {
  color: var(--accent-warning);
}

.disk-percent.danger,
.disk-bar-fill.danger {
  color: var(--accent-danger);
}

.disk-bar {
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.disk-bar-fill {
  height: 100%;
  background: var(--accent-primary);
  border-radius: 3px;
  transition: width var(--transition-normal);
}

.disk-bar-fill.warn {
  background: var(--accent-warning);
}

.disk-bar-fill.danger {
  background: var(--accent-danger);
}

.disk-detail {
  font-size: var(--text-xs);
  color: var(--fg-muted);
}

.chart-wrap {
  margin-top: 2px;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--fg-muted);
}

.legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.chart-container {
  height: 110px;
  width: 100%;
}

.chart-empty {
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-muted);
  font-size: var(--text-xs);
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.disk-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  color: var(--fg-muted);
  font-size: var(--text-sm);
}
</style>
