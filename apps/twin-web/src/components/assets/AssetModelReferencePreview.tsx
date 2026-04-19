import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei/core/OrbitControls'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'

import { DeviceInstance } from '@/components/scene/DeviceInstance'
import { RoomFloor } from '@/components/scene/RoomFloor'
import type { Device } from '@/schemas/device'
import type { RenderStyle } from '@/services/loadEquipmentCatalog'
import { sceneTheme } from '@/theme/sceneTheme'
import { configureTwinWebRenderer, twinWebShadowMapConfig } from '@/utils/webglCanvasSetup'

import { canRenderModelCanvas } from './assetModelPreview'

type Props = {
  boundsHalfExtents: [number, number, number]
  modelUrl: string | null
  renderStyle: RenderStyle
}

export function AssetModelReferencePreview({ boundsHalfExtents, modelUrl, renderStyle }: Props) {
  const canRenderCanvas = canRenderModelCanvas()

  if (!modelUrl || !canRenderCanvas) {
    return (
      <div className="assets-model-preview-placeholder">
        <strong>3D 参考预览</strong>
        <p className="muted small">
          {modelUrl
            ? '当前环境不支持 3D 画布，这里保留只读参考占位。'
            : '上传或绑定模型后，这里会显示只读参考视图，用来核对端点是否落在正确的面和高度。'}
        </p>
      </div>
    )
  }

  const device: Device = {
    id: 'asset-preview-device',
    type: 'asset-preview',
    name: 'Asset Preview',
    assetId: 'asset-preview',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    system: 'PREVIEW',
    boundsHalfExtents,
  }

  return (
    <div className="assets-model-preview-canvas">
      <Canvas
        shadows={twinWebShadowMapConfig}
        gl={{
          antialias: typeof window !== 'undefined' ? window.devicePixelRatio <= 2 : true,
          powerPreference: 'low-power',
          outputColorSpace: SRGBColorSpace,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        camera={{ position: [8, 6, 8], fov: 35, near: 0.1, far: 200 }}
        style={{ width: '100%', height: '100%', background: sceneTheme.background }}
        onCreated={({ gl }) => configureTwinWebRenderer(gl)}
      >
        <color attach="background" args={[sceneTheme.background]} />
        <ambientLight color={sceneTheme.ambientColor} intensity={sceneTheme.ambientIntensity} />
        <hemisphereLight
          args={[sceneTheme.hemisphereSky, sceneTheme.hemisphereGround, sceneTheme.hemisphereIntensity]}
          position={[0, 32, 0]}
        />
        <directionalLight
          color={sceneTheme.directionalColor}
          position={[10, 16, 8]}
          intensity={sceneTheme.directionalIntensity}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={48}
          shadow-camera-left={-16}
          shadow-camera-right={16}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-bias={-0.00025}
          shadow-normalBias={0.03}
          shadow-radius={6}
        />
        <OrbitControls makeDefault minDistance={3} maxDistance={24} maxPolarAngle={Math.PI * 0.48} />
        <RoomFloor showGrid={false} />
        <DeviceInstance device={device} ports={[]} modelUrl={modelUrl} renderStyle={renderStyle} mode="viewer" />
      </Canvas>
    </div>
  )
}
