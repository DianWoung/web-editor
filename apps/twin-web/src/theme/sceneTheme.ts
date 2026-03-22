/**
 * 孪生运维台 · 场景与 3D 统一色板
 * 偏「亮棚 / 工作台」：高中灰、强填充光，避免阴影死黑成洞。
 */
export const sceneTheme = {
  /** 画布清屏：中灰蓝，与地面有阶调区分，不再近黑 */
  background: '#2a3d52',

  ambientColor: '#e8f2fa',
  /** 主环境光拉高，压暗部死黑 */
  ambientIntensity: 1.05,

  hemisphereSky: '#f0f6fc',
  /** 地面反射侧提亮，阴影里仍有形 */
  hemisphereGround: '#4a5f78',
  hemisphereIntensity: 0.75,

  directionalColor: '#ffffff',
  /** 主光略弱于填充，避免阴影对比过强 */
  directionalIntensity: 0.62,

  /** 侧向补光（EditorCanvas 内使用） */
  fillColor: '#d4e4f2',
  fillIntensity: 0.45,

  floorColor: '#556e88',
  floorEmissive: '#3d5066',
  floorEmissiveIntensity: 0.38,

  gridCell: '#7a8fa3',
  gridSection: '#9eb0c2',

  /** 占位设备：浅钢灰，默认即有体积感 */
  deviceIdle: '#8fa3b6',
  deviceIdleEmissive: '#5a6d80',
  deviceIdleEmissiveIntensity: 0.16,

  deviceSelected: '#7a9aad',
  deviceSelectedEmissive: '#45c4e8',
  deviceSelectedEmissiveIntensity: 0.32,

  pipeConflict: '#f87171',
  pipeConflictEmissive: '#3f2024',
} as const
