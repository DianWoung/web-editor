import { useEffect, useRef } from 'react'

export function useRuntimePolling(run: () => void | Promise<unknown>, intervalMs: number, enabled = true) {
  const latestRunRef = useRef(run)

  useEffect(() => {
    latestRunRef.current = run
  }, [run])

  useEffect(() => {
    if (!enabled) return

    void latestRunRef.current()
    const timer = window.setInterval(() => {
      void latestRunRef.current()
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [enabled, intervalMs])
}
