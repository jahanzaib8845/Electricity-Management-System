import React from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  Home,
  BarChart3,
  Clock,
} from 'lucide-react'

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'Forecast Analysis', path: '/forecast-analysis', icon: BarChart3 },
  { name: 'Accuracy Reports', path: '/accuracy-reports', icon: Clock },
]

export function Layout() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      
      <aside className="flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Windinsight</h1>
            <p className="text-xs text-slate-500 font-medium">Smarter Energy Decisions</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Navigation</span>
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="px-6 py-6 border-t border-slate-800">
          <div className="text-xs text-slate-500 text-center">
            v1.0.0
          </div>
        </div>
      </aside>

      
      <main className="flex-1 flex flex-col overflow-y-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
