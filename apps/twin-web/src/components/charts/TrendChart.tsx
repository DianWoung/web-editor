import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'
import type { TrendSample } from '@/schemas/deviceRuntime'

type Props = {
  data: TrendSample[]
  seriesName?: string
}

export function TrendChart({ data, seriesName = '数值' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || data.length === 0) return

    const chart = echarts.init(el, undefined, { renderer: 'canvas' })
    chart.setOption({
      backgroundColor: 'transparent',
      textStyle: { color: '#9eb0c4' },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(21, 34, 50, 0.92)',
        borderColor: '#2a3f56',
        textStyle: { color: '#e8f0f7' },
      },
      grid: { left: 52, right: 20, top: 20, bottom: 32 },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.t),
        axisLine: { lineStyle: { color: '#2a3f56' } },
        axisLabel: { color: '#8fa3b8', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#2a3f56', type: 'dashed' } },
        axisLabel: { color: '#8fa3b8', fontSize: 11 },
      },
      series: [
        {
          name: seriesName,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: data.map((d) => d.v),
          lineStyle: { color: '#45c4e8', width: 2 },
          itemStyle: { color: '#45c4e8' },
          areaStyle: { color: 'rgba(69, 196, 232, 0.14)' },
        },
      ],
    })

    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(el)
    return () => {
      ro.disconnect()
      chart.dispose()
    }
  }, [data, seriesName])

  return <div ref={ref} className="trend-chart" />
}
