import type { Object3D } from 'three'
import { Mesh } from 'three'

/**
 * GLTF/GLB 常为高面数 + PBR（MeshStandard 等），若参与投射/接收阴影，
 * 阴影 pass 与片元开销会急剧上升（尤其 Mac 集显上易直接打满 GPU）。
 * 编排器优先保证可交互帧率：导入模型默认不参与阴影，仍受场景光照照亮。
 */
export function applyGltfScenePerformanceDefaults(root: Object3D) {
  root.traverse((obj) => {
    if (obj instanceof Mesh) {
      obj.castShadow = false
      obj.receiveShadow = false
      obj.frustumCulled = true
    }
  })
}
