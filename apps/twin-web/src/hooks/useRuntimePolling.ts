import { useEffect } from 'react'

export function useRuntimePolling(run: () => void | Promise<void>, intervalMs: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    void run()
    const timer = window.setInterval(() => {
      void run()
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [enabled, intervalMs, run])
}
