const apiBaseUrl =
  ((import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? '/api').replace(
    /\/$/,
    '',
  )

async function parseApiError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { error?: string }
    return json.error || `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body && !isFormData ? { 'content-type': 'application/json' } : undefined),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response))
  }

  return (await response.json()) as T
}
