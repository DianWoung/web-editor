import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `app-nav-link${isActive ? ' app-nav-link--active' : ''}`

export function AppNav() {
  return (
    <header className="app-nav">
      <div className="app-nav-brand">机房数字孪生</div>
      <nav className="app-nav-links">
        <NavLink to="/overview" className={linkClass} end>
          三维总览
        </NavLink>
        <NavLink to="/editor" className={linkClass}>
          场景编排
        </NavLink>
      </nav>
    </header>
  )
}
