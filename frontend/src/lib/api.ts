import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

export interface WindDataPoint {
  time: string
  actual: number | null
  forecast: number | null
  publish_time: string | null
}

export interface WindDataResponse {
  horizon_hours: number
  range_start: string
  range_end: string
  data: WindDataPoint[]
}

export interface MetricsResponse {
  horizon_hours: number
  range_start: string
  range_end: string
  mae: number
  mape: number
  rmse: number
  data_points: number
}

export interface HealthResponse {
  status: string
  version: string
}

export async function fetchWindData(
  start: string,
  end: string,
  horizon: number
): Promise<WindDataResponse> {
  const res = await api.get('/wind-data', { params: { start, end, horizon } })
  return res.data
}

export async function fetchMetrics(
  start: string,
  end: string,
  horizon: number
): Promise<MetricsResponse> {
  const res = await api.get('/metrics', { params: { start, end, horizon } })
  return res.data
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await api.get('/health')
  return res.data
}
