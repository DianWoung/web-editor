import type { ReactNode } from 'react'

type Props = {
  header: ReactNode
  stage: ReactNode
  sidebar?: ReactNode
  className?: string
  bodyClassName?: string
  stageClassName?: string
  sidebarClassName?: string
}

export function SceneSubspaceShell({
  header,
  stage,
  sidebar,
  className,
  bodyClassName,
  stageClassName,
  sidebarClassName,
}: Props) {
  return (
    <div className={['scene-subspace', className].filter(Boolean).join(' ')}>
      {header}
      <div className={['scene-subspace__body', bodyClassName].filter(Boolean).join(' ')}>
        {sidebar ? <aside className={['scene-subspace__sidebar', sidebarClassName].filter(Boolean).join(' ')}>{sidebar}</aside> : null}
        <main className={['scene-subspace__stage', stageClassName].filter(Boolean).join(' ')}>{stage}</main>
      </div>
    </div>
  )
}
