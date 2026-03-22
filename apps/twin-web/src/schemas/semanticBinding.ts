/** 阶段 2 使用；阶段 1 仅占位类型 */
export type SemanticBinding = {
  deviceId: string
  pointIds: string[]
  alarmIds: string[]
  strategy: {
    mode: string
    strategyVersion: string
  }
}
