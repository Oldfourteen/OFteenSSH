<template>
  <div class="network-speed-chart">
    <h4 class="panel-title">网络速度</h4>
    <div class="speed-summary" v-if="connectionId && latestSpeed">
      <div class="speed-item">
        <span class="speed-dot speed-download"></span>
        <span class="speed-label">下行</span>
        <span class="speed-value">{{ formatSpeed(latestSpeed.downloadSpeed) }}</span>
      </div>
      <div class="speed-item">
        <span class="speed-dot speed-upload"></span>
        <span class="speed-label">上行</span>
        <span class="speed-value">{{ formatSpeed(latestSpeed.uploadSpeed) }}</span>
      </div>
    </div>
    <div ref="chartRef" class="chart-container" v-if="connectionId"></div>
    <div class="chart-empty" v-else>未连接</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
let unsubscribe: (() => void) | null = null
let resizeObserver: ResizeObserver | null = null
let retryTimer: ReturnType<typeof setInterval> | null = null

const latestSpeed = computed(() => {
  if (!props.connectionId) return null
  const history = monitorStore.getNetworkHistory(props.connectionId)
  if (history.length === 0) return null
  return history[history.length - 1]
})

onMounted(() => {
  initChart()
})

onUnmounted(() => {
  destroyChart()
})

watch(() => props.connectionId, () => {
  destroyChart()
  initChart()
})

function initChart() {
  // 等待 DOM 更新（v-if 可能刚渲染）
  nextTick(() => {
    tryCreateChart()
  })
}

function tryCreateChart() {
  if (!chartRef.value) {
    // 容器还不存在，重试
    scheduleRetry()
    return
  }

  const rect = chartRef.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    // 容器尺寸为 0，重试
    scheduleRetry()
    return
  }

  doCreateChart()
}

function scheduleRetry() {
  if (retryTimer) return // 已在重试中
  let attempts = 0
  retryTimer = setInterval(() => {
    attempts++
    if (!chartRef.value || chartRef.value.getBoundingClientRect().width === 0) {
      if (attempts >= 20) {
        // 20 次后放弃，改用 ResizeObserver 等待
        clearInterval(retryTimer!)
        retryTimer = null
        waitForResize()
      }
      return
    }
    clearInterval(retryTimer!)
    retryTimer = null
    doCreateChart()
  }, 100)
}

function waitForResize() {
  if (!chartRef.value) return
  resizeObserver = new ResizeObserver(() => {
    const rect = chartRef.value?.getBoundingClientRect()
    if (rect && rect.width > 0 && rect.height > 0 && !chartInstance) {
      resizeObserver?.disconnect()
      resizeObserver = null
      doCreateChart()
    }
  })
  resizeObserver.observe(chartRef.value)
}

function doCreateChart() {
  if (!chartRef.value) return
  if (chartInstance) return

  chartInstance = echarts.init(chartRef.value, undefined, {
    renderer: 'canvas'
  })

  chartInstance.setOption(getChartOption())

  // 监听网速数据
  unsubscribe = window.ofteenAPI.monitor.onNetworkSpeed((data: any) => {
    monitorStore.updateNetworkSpeed(data)
    updateChart()
  })

  // 窗口 resize
  resizeObserver = new ResizeObserver(() => {
    chartInstance?.resize()
  })
  resizeObserver.observe(chartRef.value)

  // 立即更新数据
  updateChart()
  setTimeout(() => chartInstance?.resize(), 200)
}

function getChartOption(): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    grid: {
      left: 0,
      right: 0,
      top: 5,
      bottom: 0,
      containLabel: false
    },
    xAxis: {
      type: 'category',
      show: false,
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      show: false
    },
    tooltip: {
      show: true,
      trigger: 'axis',
      backgroundColor: 'rgba(22, 22, 30, 0.9)',
      borderColor: 'rgba(122, 162, 247, 0.3)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#c0caf5', fontSize: 12, fontFamily: 'inherit' },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return ''
        let result = ''
        for (const p of params) {
          const dot = p.seriesIndex === 0
            ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#7aa2f7;margin-right:6px;"></span>'
            : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#9ece6a;margin-right:6px;"></span>'
          result += `${dot}${p.seriesName}: ${formatSpeed(p.value)}<br/>`
        }
        return result
      }
    },
    series: [
      {
        name: '下行',
        type: 'line',
        smooth: 0.4,
        symbol: 'none',
        lineStyle: {
          color: '#7aa2f7',
          width: 2,
          shadowColor: 'rgba(122, 162, 247, 0.3)',
          shadowBlur: 6,
          shadowOffsetY: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(122, 162, 247, 0.35)' },
            { offset: 0.5, color: 'rgba(122, 162, 247, 0.12)' },
            { offset: 1, color: 'rgba(122, 162, 247, 0.02)' }
          ])
        },
        data: []
      },
      {
        name: '上行',
        type: 'line',
        smooth: 0.4,
        symbol: 'none',
        lineStyle: {
          color: '#9ece6a',
          width: 2,
          shadowColor: 'rgba(158, 206, 106, 0.3)',
          shadowBlur: 6,
          shadowOffsetY: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(158, 206, 106, 0.3)' },
            { offset: 0.5, color: 'rgba(158, 206, 106, 0.1)' },
            { offset: 1, color: 'rgba(158, 206, 106, 0.02)' }
          ])
        },
        data: []
      }
    ],
    animation: true,
    animationDuration: 300,
    animationEasing: 'cubicOut'
  }
}

function updateChart() {
  if (!chartInstance || !props.connectionId) return

  const history = monitorStore.getNetworkHistory(props.connectionId)
  if (history.length === 0) return

  const downloadData = history.map((p) => p.downloadSpeed)
  const uploadData = history.map((p) => p.uploadSpeed)

  chartInstance.setOption({
    series: [
      { data: downloadData },
      { data: uploadData }
    ]
  })
}

function destroyChart() {
  if (retryTimer) {
    clearInterval(retryTimer)
    retryTimer = null
  }
  unsubscribe?.()
  resizeObserver?.disconnect()
  chartInstance?.dispose()
  chartInstance = null
  resizeObserver = null
  unsubscribe = null
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`
}
</script>

<style scoped>
.network-speed-chart {
  margin-bottom: var(--spacing-md);
}

.panel-title {
  font-size: var(--text-sm);
  color: var(--fg-muted);
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
}

.speed-summary {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-sm);
}

.speed-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.speed-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.speed-download {
  background: #7aa2f7;
  box-shadow: 0 0 6px rgba(122, 162, 247, 0.4);
}

.speed-upload {
  background: #9ece6a;
  box-shadow: 0 0 6px rgba(158, 206, 106, 0.4);
}

.speed-label {
  font-size: var(--text-xs);
  color: var(--fg-muted);
}

.speed-value {
  font-size: var(--text-xs);
  color: var(--fg-primary);
  font-weight: 500;
  font-family: var(--font-mono);
}

.chart-container {
  height: 100px;
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.chart-empty {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-muted);
  font-size: var(--text-sm);
}
</style>
