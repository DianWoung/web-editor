import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `app-nav-link${isActive ? ' app-nav-link--active' : ''}`

export function AppNav() {
  return (
    <header className="app-nav">
      <div className="app-nav-brand">机房数字孪生</div>
      <nav className="app-nav-links">
        <NavLink to="/scenes" className={linkClass} end>
          场景管理
        </NavLink>
        <NavLink to="/assets" className={linkClass} end>
          资产管理
        </NavLink>
        <NavLink to="/assets/topology-templates" className={linkClass} end>
          拓扑模板
        </NavLink>
      </nav>
    </header>
  )
}
