import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { format } from 'date-fns'
import {
  fetchWindData,
  fetchMetrics,
  WindDataPoint,
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
  BarElement
)

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

export default function AccuracyReports() {
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
      setError(e.message || 'Failed to load accuracy data')
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

  const errorData = windData
    .filter((d) => d.actual !== null && d.forecast !== null)
    .map((d) => ({
      time: d.time,
      error: Math.abs((d.actual || 0) - (d.forecast || 0)),
      mape: d.actual ? (Math.abs((d.actual || 0) - (d.forecast || 0)) / d.actual) * 100 : 0,
    }))

  return (
    <div>
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Accuracy Reports</h1>
            <p className="text-slate-600 mt-1">
              Forecast accuracy metrics and error analysis
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white shadow-sm">
            <span className="text-sm font-medium text-slate-700">{startDate} → {endDate}</span>
          </div>
        </div>
      </header>

      {loading ? (
        <LoadingSpinner message="Loading accuracy reports..." />
      ) : error ? (
        <ErrorMessage title="Error loading accuracy data" message={error} onRetry={fetchData} />
      ) : (
        <>
          
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

          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">MAE</span>
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{metrics.mae.toLocaleString()} MW</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">MAPE</span>
                  <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{metrics.mape.toFixed(2)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">RMSE</span>
                  <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{metrics.rmse.toLocaleString()} MW</p>
              </div>
            </div>
          )}

          {windData.length > 0 ? (
            <>
              
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Forecast Error Over Time</h3>
                <div className="relative h-[400px]">
                  <Bar
                    data={{
                      labels: errorData.map((d) => d.time),
                      datasets: [
                        {
                          label: 'Forecast Error (MW)',
                          data: errorData.map((d) => d.error),
                          backgroundColor: '#ef4444',
                          borderRadius: 6,
                        },
                      ],
                    }}
                    options={barOptions}
                  />
                </div>
              </div>

              
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Latest Forecast Updates</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                        <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actual (MW)</th>
                        <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Forecast (MW)</th>
                        <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Error (MW)</th>
                        <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">MAPE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorData.slice(0, 20).map((row) => (
                        <tr key={row.time} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 text-sm text-slate-600 font-mono">{row.time}</td>
                          <td className="py-3 text-sm text-slate-600 font-mono text-right">{windData.find((d) => d.time === row.time)?.actual?.toLocaleString() ?? '—'}</td>
                          <td className="py-3 text-sm text-slate-600 font-mono text-right">{windData.find((d) => d.time === row.time)?.forecast?.toLocaleString() ?? '—'}</td>
                          <td className="py-3 text-sm text-slate-600 font-mono text-right">{row.error.toLocaleString()}</td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              row.mape < 2 ? 'text-emerald-600 bg-emerald-50' :
                              row.mape < 5 ? 'text-amber-600 bg-amber-50' :
                              'text-rose-600 bg-rose-50'
                            }`}>
                              {row.mape.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <EmptyState message="No accuracy data available for selected range" />
          )}
        </>
      )}
    </div>
  )
}
