import { NavLink } from 'react-router-dom'
import { enableClientView } from '@/utils/clientViewAccess'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `app-nav-link${isActive ? ' app-nav-link--active' : ''}`

export function AppNav() {
  return (
    <header className="app-nav">
      <div className="app-nav-brand">
        <span className="app-nav-brand__mark">SO</span>
        <div>
          <strong>Scene Ops</strong>
          <span>场景运营中台</span>
        </div>
      </div>
      <nav className="app-nav-links" aria-label="主导航">
        <NavLink to="/scenes" className={linkClass} end>
          场景
        </NavLink>
        <NavLink to="/assets/topology-templates" className={linkClass} end>
          拓扑模板
        </NavLink>
      </nav>
      <div className="app-nav-utility">
        <NavLink to="/assets" className="app-nav-utility__link">
          配置入口
        </NavLink>
        <NavLink
          to="/c/overview"
          className="app-nav-utility__link"
          onClick={() => {
            enableClientView()
          }}
        >
          客户端视图
        </NavLink>
      </div>
    </header>
  )
}
