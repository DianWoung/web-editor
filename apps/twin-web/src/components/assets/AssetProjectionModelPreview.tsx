import { useLayoutEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'

import { DeviceInstance } from '@/components/scene/DeviceInstance'
import type { Device } from '@/schemas/device'
import type { RenderStyle } from '@/services/loadEquipmentCatalog'
import { sceneTheme } from '@/theme/sceneTheme'
import { configureTwinWebRenderer, twinWebShadowMapConfig } from '@/utils/webglCanvasSetup'

import { canRenderModelCanvas } from './assetModelPreview'
import type { ProjectionView } from './assetConnectorWorkbenchState'

type Props = {
  boundsHalfExtents: [number, number, number]
  modelUrl: string | null
  renderStyle: RenderStyle
  view: ProjectionView
}

function ProjectionCameraRig({
  boundsHalfExtents,
  view,
}: {
  boundsHalfExtents: [number, number, number]
  view: ProjectionView
}) {
  const { camera } = useThree()
  const [hx, hy, hz] = boundsHalfExtents

  useLayoutEffect(() => {
    const widthSpan = view === 'right' ? hz * 2 : hx * 2
    const heightSpan = view === 'top' ? hz * 2 : hy * 2
    const maxSpan = Math.max(widthSpan, heightSpan, 1)
    const distance = Math.max(hx, hy, hz) * 5 + 4
    const orthographicCamera = camera

    if ('zoom' in orthographicCamera) {
      orthographicCamera.zoom = 120 / maxSpan
    }

    if (view === 'front') {
      orthographicCamera.position.set(0, 0, distance)
      orthographicCamera.up.set(0, 1, 0)
    } else if (view === 'right') {
      orthographicCamera.position.set(distance, 0, 0)
      orthographicCamera.up.set(0, 1, 0)
    } else {
      orthographicCamera.position.set(0, distance, 0)
      orthographicCamera.up.set(0, 0, -1)
    }

    orthographicCamera.lookAt(0, 0, 0)
    orthographicCamera.updateProjectionMatrix()
  }, [boundsHalfExtents, camera, hx, hy, hz, view])

  return null
}

export function AssetProjectionModelPreview({ boundsHalfExtents, modelUrl, renderStyle, view }: Props) {
  if (!modelUrl || !canRenderModelCanvas()) {
    return null
  }

  const device: Device = {
    id: `asset-projection-${view}`,
    type: 'asset-preview',
    name: '',
    assetId: `asset-projection-${view}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    system: 'PREVIEW',
    boundsHalfExtents,
  }

  return (
    <div className="assets-projection-view__canvas">
      <Canvas
        orthographic
        shadows={twinWebShadowMapConfig}
        gl={{
          antialias: typeof window !== 'undefined' ? window.devicePixelRatio <= 2 : true,
          powerPreference: 'low-power',
          outputColorSpace: SRGBColorSpace,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        style={{ width: '100%', height: '100%', background: 'transparent', pointerEvents: 'none' }}
        onCreated={({ gl }) => configureTwinWebRenderer(gl)}
      >
        <color attach="background" args={['#0d1520']} />
        <ambientLight color={sceneTheme.ambientColor} intensity={sceneTheme.ambientIntensity} />
        <hemisphereLight
          args={[sceneTheme.hemisphereSky, sceneTheme.hemisphereGround, sceneTheme.hemisphereIntensity]}
          position={[0, 24, 0]}
        />
        <directionalLight color={sceneTheme.directionalColor} position={[8, 12, 10]} intensity={sceneTheme.directionalIntensity} />
        <ProjectionCameraRig boundsHalfExtents={boundsHalfExtents} view={view} />
        <DeviceInstance device={device} ports={[]} modelUrl={modelUrl} renderStyle={renderStyle} mode="viewer" />
      </Canvas>
    </div>
  )
}
