import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `app-nav-link${isActive ? ' app-nav-link--active' : ''}`

export function ClientNav() {
  return (
    <header className="app-nav">
      <div className="app-nav-brand">
        <span className="app-nav-brand__mark">SV</span>
        <div>
          <strong>Scene Ops</strong>
          <span>客户运营视图</span>
        </div>
      </div>
      <nav className="app-nav-links" aria-label="客户导航">
        <NavLink to="/c/overview" className={linkClass} end>
          驾驶舱总览
        </NavLink>
        <NavLink to="/c/scene" className={linkClass}>
          3D 机房交互
        </NavLink>
        <NavLink to="/c/strategy" className={linkClass} end>
          控制流程图
        </NavLink>
        <NavLink to="/c/reports" className={linkClass} end>
          报表分析
        </NavLink>
      </nav>
      <div className="app-nav-utility">
        <NavLink to="/scenes" className="app-nav-utility__link">
          返回编辑端
        </NavLink>
      </div>
    </header>
  )
}
