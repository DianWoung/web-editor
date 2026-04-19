import type { ReactNode } from 'react'

type Props = {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
  children?: ReactNode
}

export function SceneWorkspaceHeader({ eyebrow, title, description, actions, children }: Props) {
  return (
    <header className="scene-workspace-header" data-testid="scene-workspace-header">
      <div className="scene-workspace-header__main">
        <p className="scene-workspace-header__eyebrow">{eyebrow}</p>
        <div className="scene-workspace-header__hero">
          <div>
            <h1>{title}</h1>
            <p className="scene-workspace-header__description">{description}</p>
          </div>
          {actions ? <div className="scene-workspace-header__actions">{actions}</div> : null}
        </div>
      </div>
      {children ? <div className="scene-workspace-header__content">{children}</div> : null}
    </header>
  )
}
