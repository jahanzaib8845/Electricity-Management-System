import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import Dashboard from './pages/Dashboard'
import ForecastAnalysis from './pages/ForecastAnalysis'
import AccuracyReports from './pages/AccuracyReports'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/forecast-analysis" element={<ForecastAnalysis />} />
          <Route path="/accuracy-reports" element={<AccuracyReports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
