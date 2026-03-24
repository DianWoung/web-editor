import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppNav } from '@/components/layout/AppNav'

const OverviewPage = lazy(async () => {
  const mod = await import('@/pages/overview/OverviewPage')
  return { default: mod.OverviewPage }
})

const DeviceDetailPage = lazy(async () => {
  const mod = await import('@/pages/detail/DeviceDetailPage')
  return { default: mod.DeviceDetailPage }
})

const EditorPage = lazy(async () => {
  const mod = await import('@/pages/editor/EditorPage')
  return { default: mod.EditorPage }
})

function AppShell() {
  return (
    <div className="app-shell">
      <AppNav />
      <div className="app-shell-body">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/detail/:deviceId" element={<DeviceDetailPage />} />
          <Route path="/editor" element={<EditorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
