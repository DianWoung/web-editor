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

const ScenesPage = lazy(async () => {
  const mod = await import('@/pages/scenes/ScenesPage')
  return { default: mod.ScenesPage }
})

const AssetsPage = lazy(async () => {
  const mod = await import('@/pages/assets/AssetsPage')
  return { default: mod.AssetsPage }
})

const ScenePreviewPage = lazy(async () => {
  const mod = await import('@/pages/scenes/ScenePreviewPage')
  return { default: mod.ScenePreviewPage }
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
          <Route path="/" element={<Navigate to="/scenes" replace />} />
          <Route path="/overview" element={<Navigate to="/scenes" replace />} />
          <Route path="/scenes" element={<ScenesPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/scenes/:sceneId/overview" element={<OverviewPage />} />
          <Route path="/scenes/:sceneId/preview" element={<ScenePreviewPage />} />
          <Route path="/detail/:deviceId" element={<DeviceDetailPage />} />
          <Route path="/editor" element={<EditorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
