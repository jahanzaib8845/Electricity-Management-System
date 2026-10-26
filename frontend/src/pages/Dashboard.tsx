import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement,
  BarElement,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import { format } from 'date-fns'
import {
  fetchWindData,
  fetchMetrics,
  WindDataPoint,
  WindDataResponse,
  MetricsResponse,
} from '../lib/api'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/Shared'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement,
  BarElement
)

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'nearest', intersect: false },
  scales: {
    x: {
      type: 'time',
      time: { unit: 'hour' },
      ticks: { color: '#94a3b8', font: { size: 10 } },
      grid: { color: 'rgba(226, 232, 240, 0.3)' },
    },
    y: {
      title: { display: true, text: 'Wind Generation (MW)', color: '#94a3b8', font: { size: 11 } },
      ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v: any) => `${v} MW` },
      suggestedMin: 0,
      grid: { color: 'rgba(226, 232, 240, 0.3)' },
    },
  },
  plugins: {
    legend: { position: 'top' },
    tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleColor: '#ffffff', bodyColor: '#cbd5e1' },
  },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } },
    tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleColor: '#ffffff', bodyColor: '#cbd5e1' },
  },
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      suggestedMin: 0,
      ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v: any) => `${v} MW` },
      grid: { color: 'rgba(226, 232, 240, 0.3)' },
    },
    x: {
      ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 45 },
      grid: { color: 'rgba(226, 232, 240, 0.3)' },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleColor: '#ffffff', bodyColor: '#cbd5e1' },
  },
}

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 3 days', days: 3 },
  { label: 'Last 24 hours', days: 1 },
]

export default function Dashboard() {
  const [startDate, setStartDate] = useState(
    format(Date.now() - 7 * 24 * 60 * 60 * 1000, 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState(format(Date.now(), 'yyyy-MM-dd'))
  const [horizon, setHorizon] = useState(4)

  const [windData, setWindData] = useState<WindDataPoint[]>([])
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [wd, m] = await Promise.all([
        fetchWindData(startDate, endDate, horizon),
        fetchMetrics(startDate, endDate, horizon),
      ])
      setWindData(wd.data)
      setMetrics(m)
    } catch (e: any) {
      setError(e.message || 'Failed to load data from backend')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [startDate, endDate, horizon])

  const handlePreset = (days: number) => {
    const end = new Date()
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
  }

  const chartLabels = windData.map((d) => d.time)
  const actualDataset = windData
    .filter((d) => d.actual !== null)
    .map((d) => ({ x: d.time, y: d.actual }))
  const forecastDataset = windData
    .filter((d) => d.forecast !== null)
    .map((d) => ({ x: d.time, y: d.forecast }))

  const avgActual =
    windData.filter((d) => d.actual !== null).length > 0
      ? windData
          .filter((d) => d.actual !== null)
          .reduce((a, b) => a + (b.actual || 0), 0) /
        windData.filter((d) => d.actual !== null).length
      : 0
  const avgForecast =
    windData.filter((d) => d.forecast !== null).length > 0
      ? windData
          .filter((d) => d.forecast !== null)
          .reduce((a, b) => a + (b.forecast || 0), 0) /
        windData.filter((d) => d.forecast !== null).length
      : 0

  const trend =
    avgForecast > avgActual
      ? 'up'
      : avgForecast < avgActual
        ? 'down'
        : 'neutral'

  return (
    <div>
      
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Wind Power Forecast Dashboard</h1>
            <p className="text-slate-600 mt-1">
              Compare actual generation against forecast data filtered by forecast horizon
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white shadow-sm">
            <span className="text-sm font-medium text-slate-700">{startDate} → {endDate}</span>
          </div>
        </div>
      </header>

      {loading ? (
        <LoadingSpinner message="Loading wind data from backend..." />
      ) : error ? (
        <ErrorMessage title="Error loading data" message={error} onRetry={fetchData} />
      ) : (
        <>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">Forecasted Wind</span>
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{Math.round(metrics?.mae || 0).toLocaleString()} MW</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">MAPE</span>
                <div className="w-2 h-2 rounded-full bg-purple-600"></div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{metrics?.mape?.toFixed(2) ?? '—'}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">RMSE</span>
                <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{metrics?.rmse?.toLocaleString() ?? '—'} MW</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">Data Points</span>
                <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{metrics?.data_points?.toLocaleString() ?? '—'}</p>
            </div>
          </div>

          
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-8">
            <div className="flex flex-col gap-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">Controls</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-slate-600">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-slate-600">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-slate-600">Horizon (hours)</label>
                  <input type="range" min={0} max={24} step={1} value={horizon} onChange={(e) => setHorizon(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  <span className="text-xs font-medium text-slate-900">{horizon}h</span>
                </div>
              </div>
              <div className="flex gap-2">
                {PRESETS.map((p) => (
                  <button key={p.label} onClick={() => handlePreset(p.days)} className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Wind Generation — Forecast vs Actual</h3>
            {windData.length > 0 ? (
              <div className="relative h-[400px]">
                <Line
                  data={{
                    datasets: [
                      {
                        label: 'Actual',
                        data: actualDataset,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        tension: 0.4,
                        fill: true,
                      },
                      {
                        label: 'Forecast',
                        data: forecastDataset,
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.05)',
                        borderWidth: 3,
                        borderDash: [6, 4],
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        tension: 0.4,
                        fill: false,
                      },
                    ],
                  }}
                  options={lineOptions}
                />
              </div>
            ) : (
              <EmptyState message="No wind data available for selected range" />
            )}
          </div>

          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Generation Breakdown</h3>
              {windData.length > 0 ? (
                <div>
                  <div className="relative h-[300px]">
                    <Doughnut
                      data={{
                        labels: ['Actual Avg', 'Forecast Avg'],
                        datasets: [
                          {
                            data: [Math.round(avgActual), Math.round(avgForecast)],
                            backgroundColor: ['#10b981', '#0ea5e9'],
                            borderWidth: 0,
                          },
                        ],
                      }}
                      options={doughnutOptions}
                    />
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Actual Avg</span>
                      <span className="text-sm font-medium text-slate-900">{Math.round(avgActual).toLocaleString()} MW</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Forecast Avg</span>
                      <span className="text-sm font-medium text-slate-900">{Math.round(avgForecast).toLocaleString()} MW</span>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState message="No breakdown data available" />
              )}
            </div>

            
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Additional Purchase Needed</h3>
              {windData.length > 0 ? (
                <div className="relative h-[300px]">
                  <Bar
                    data={{
                      labels: chartLabels,
                      datasets: [
                        {
                          label: 'Purchase Needed',
                          data: forecastDataset.map((d, i) => {
                            const f = d.y || 0
                            const a = actualDataset[i]?.y || 0
                            return Math.max(0, f - a)
                          }),
                          backgroundColor: '#f59e0b',
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={barOptions}
                  />
                </div>
              ) : (
                <EmptyState message="No purchase data available" />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
