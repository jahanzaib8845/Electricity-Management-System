import React from 'react'

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

export function ErrorMessage({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <svg className="w-8 h-8 text-rose-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.859-3.077l-3.096-9.6a2 2 0 00-.622-1.384L13.458 2h-4.916l-3.977 6.394A2 2 0 004.672 10H3m0 10h.01M3 12a1 1 0 112 0 1 1 0 01-2 0zM3 7a1 1 0 102-0 1 1 0 00-2 0z" />
        </svg>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.707l-1.414 1.414a1 1 0 01-.707.707L15.172 17H13a1 1 0 01-.707-.293l-1.414-1.414a1 1 0 00-.707-.707L11.586 13H9a1 1 0 00-.707.707L7.414 15.414a1 1 0 01-.707.707L6.414 17H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2z" />
      </svg>
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}
