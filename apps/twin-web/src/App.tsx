import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppNav } from '@/components/layout/AppNav'
import { DeviceDetailPage } from '@/pages/detail/DeviceDetailPage'
import { EditorPage } from '@/pages/editor/EditorPage'
import { OverviewPage } from '@/pages/overview/OverviewPage'

function AppShell() {
  return (
    <div className="app-shell">
      <AppNav />
      <div className="app-shell-body">
        <Outlet />
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
