import type { WebGLRenderer } from 'three'

/** 限制 DPR，避免 Retina 上 2×3× 像素与 MSAA 叠加把 GPU 顶满 */
const MAX_PIXEL_RATIO = 1.5

export function configureTwinWebRenderer(gl: WebGLRenderer) {
  gl.domElement.style.touchAction = 'none'
  gl.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, MAX_PIXEL_RATIO))
}
