import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppNav } from '@/components/layout/AppNav'
import { ClientNav } from '@/components/layout/ClientNav'
import { enableClientView, isClientViewEnabled } from '@/utils/clientViewAccess'

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

const AssetConnectorPlacementPage = lazy(async () => {
  const mod = await import('@/pages/assets/AssetConnectorPlacementPage')
  return { default: mod.AssetConnectorPlacementPage }
})

const TopologyTemplatesPage = lazy(async () => {
  const mod = await import('@/pages/assets/TopologyTemplatesPage')
  return { default: mod.TopologyTemplatesPage }
})

const ScenePreviewPage = lazy(async () => {
  const mod = await import('@/pages/scenes/ScenePreviewPage')
  return { default: mod.ScenePreviewPage }
})

const ClientOverviewPage = lazy(async () => {
  const mod = await import('@/pages/client/ClientOverviewPage')
  return { default: mod.ClientOverviewPage }
})

const ClientScenePage = lazy(async () => {
  const mod = await import('@/pages/client/ClientScenePage')
  return { default: mod.ClientScenePage }
})

const ClientStrategyPage = lazy(async () => {
  const mod = await import('@/pages/client/ClientStrategyPage')
  return { default: mod.ClientStrategyPage }
})

const ClientDeviceDetailPage = lazy(async () => {
  const mod = await import('@/pages/client/ClientDeviceDetailPage')
  return { default: mod.ClientDeviceDetailPage }
})

const ClientReportsPage = lazy(async () => {
  const mod = await import('@/pages/client/ClientReportsPage')
  return { default: mod.ClientReportsPage }
})

function AppShell({ mode = 'editor' }: { mode?: 'editor' | 'client' }) {
  return (
    <div className="app-shell">
      {mode === 'client' ? <ClientNav /> : <AppNav />}
      <div className="app-shell-body">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}

function ClientShellRoute() {
  const location = useLocation()
  const isClientPath = location.pathname === '/c' || location.pathname.startsWith('/c/')

  if (!isClientViewEnabled() && (isClientPath || new URLSearchParams(location.search).get('mode') === 'viewer')) {
    enableClientView()
  }

  if (!isClientViewEnabled()) {
    return <Navigate to="/scenes" replace />
  }

  return <AppShell mode="client" />
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
          <Route path="/assets/:assetId/connectors" element={<AssetConnectorPlacementPage />} />
          <Route path="/assets/topology-templates" element={<TopologyTemplatesPage />} />
          <Route path="/scenes/:sceneId/overview" element={<OverviewPage />} />
          <Route path="/scenes/:sceneId/preview" element={<ScenePreviewPage />} />
          <Route path="/detail/:deviceId" element={<DeviceDetailPage />} />
          <Route path="/editor" element={<EditorPage />} />
        </Route>
        <Route element={<ClientShellRoute />}>
          <Route path="/c" element={<Navigate to="/c/overview" replace />} />
          <Route path="/c/overview" element={<ClientOverviewPage />} />
          <Route path="/c/scene/:sceneId?" element={<ClientScenePage />} />
          <Route path="/c/strategy" element={<ClientStrategyPage />} />
          <Route path="/c/device/:deviceId" element={<ClientDeviceDetailPage />} />
          <Route path="/c/reports" element={<ClientReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
