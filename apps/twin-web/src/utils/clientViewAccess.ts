const CLIENT_VIEW_STORAGE_KEY = 'scene-ops-client-view'
const CLIENT_VIEW_STORAGE_VALUE = 'enabled'

const isClientViewEnabledByEnv = () => {
  const envValue = ((import.meta as ImportMeta & { env?: { VITE_ENABLE_CLIENT_VIEW?: string } }).env?.VITE_ENABLE_CLIENT_VIEW ?? '').trim()
  return ['1', 'true', 'yes', 'on'].includes(envValue.toLowerCase())
}

export const isClientViewEnabled = () => {
  if (isClientViewEnabledByEnv()) {
    return true
  }

  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(CLIENT_VIEW_STORAGE_KEY) === CLIENT_VIEW_STORAGE_VALUE
}

export const enableClientView = () => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(CLIENT_VIEW_STORAGE_KEY, CLIENT_VIEW_STORAGE_VALUE)
  } catch {
    // ignore storage failures (private mode, disabled storage, etc.)
  }
}
