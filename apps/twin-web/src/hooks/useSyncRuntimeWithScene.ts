import { useEffect } from 'react'

import { useSceneStore } from '@/store/sceneStore'
import { useRuntimeStore } from '@/store/runtimeStore'

export function useSyncRuntimeWithScene() {
  const devices = useSceneStore((s) => s.devices)
  const refreshRuntimes = useRuntimeStore((s) => s.refreshRuntimes)
  const clearRuntimes = useRuntimeStore((s) => s.clear)

  useEffect(() => {
    if (devices.length === 0) {
      clearRuntimes()
      return
    }
    refreshRuntimes(devices)
  }, [clearRuntimes, devices, refreshRuntimes])
}
