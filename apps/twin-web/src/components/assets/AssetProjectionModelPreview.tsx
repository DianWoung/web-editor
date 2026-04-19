import { Canvas } from '@react-three/fiber'
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

function projectionCameraConfig(boundsHalfExtents: [number, number, number], view: ProjectionView) {
  const [hx, hy, hz] = boundsHalfExtents
  const widthSpan = view === 'right' ? hz * 2 : hx * 2
  const heightSpan = view === 'top' ? hz * 2 : hy * 2
  const maxSpan = Math.max(widthSpan, heightSpan, 1)
  const distance = Math.max(hx, hy, hz) * 5 + 4

  if (view === 'front') {
    return {
      position: [0, 0, distance] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      zoom: 120 / maxSpan,
    }
  }

  if (view === 'right') {
    return {
      position: [distance, 0, 0] as [number, number, number],
      rotation: [0, Math.PI / 2, 0] as [number, number, number],
      zoom: 120 / maxSpan,
    }
  }

  return {
    position: [0, distance, 0] as [number, number, number],
    rotation: [-Math.PI / 2, 0, Math.PI] as [number, number, number],
    zoom: 120 / maxSpan,
  }
}

export function AssetProjectionModelPreview({ boundsHalfExtents, modelUrl, renderStyle, view }: Props) {
  if (!modelUrl || !canRenderModelCanvas()) {
    return null
  }

  const camera = projectionCameraConfig(boundsHalfExtents, view)

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
        camera={camera}
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
        <DeviceInstance device={device} ports={[]} modelUrl={modelUrl} renderStyle={renderStyle} mode="viewer" />
      </Canvas>
    </div>
  )
}
