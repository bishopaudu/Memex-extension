import { useState, useEffect, useCallback } from 'react'
import { createContext, useContext } from 'react'

interface ToastItem {
  id:      string
  message: string
  type:    'success' | 'error' | 'info'
  emoji?:  string
}

interface ToastContextType {
  toast: (message: string, type?: ToastItem['type'], emoji?: string) => void
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((
    message: string,
    type: ToastItem['type'] = 'success',
    emoji?: string
  ) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type, emoji }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — bottom center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]
                      flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                        shadow-2xl border text-sm font-medium
                        animate-in slide-in-from-bottom-2 duration-200
                        ${t.type === 'success'
                          ? 'bg-surface-2 border-green-500/30 text-ink-1'
                          : t.type === 'error'
                            ? 'bg-surface-2 border-red-500/30 text-ink-1'
                            : 'bg-surface-2 border-brand/30 text-ink-1'}`}
            style={{
              boxShadow: t.type === 'success'
                ? '0 8px 32px rgba(16,185,129,0.15)'
                : t.type === 'error'
                  ? '0 8px 32px rgba(239,68,68,0.15)'
                  : '0 8px 32px rgba(79,110,247,0.15)',
            }}
          >
            {/* Icon */}
            {t.emoji ? (
              <span className="text-base">{t.emoji}</span>
            ) : t.type === 'success' ? (
              <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center
                              justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-green-400" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            ) : t.type === 'error' ? (
              <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center
                              justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-red-400" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
            ) : (
              <div className="w-4 h-4 rounded-full bg-brand/20 flex items-center
                              justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-brand-bright" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
            )}
            <span className="text-xs">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
