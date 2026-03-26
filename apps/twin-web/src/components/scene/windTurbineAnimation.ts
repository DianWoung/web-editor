export const FLOW_DRIVEN_WIND_TURBINE_ASSET_ID = 'wind_turbine_iot_v1'

export function isFlowDrivenWindTurbine(assetId: string): boolean {
  return assetId === FLOW_DRIVEN_WIND_TURBINE_ASSET_ID
}

export function shouldUseEmbeddedWindTurbineAnimation(assetId: string, animationCount: number): boolean {
  return isFlowDrivenWindTurbine(assetId) && animationCount > 0
}

export function shouldUseWindTurbineManualFallback(assetId: string, animationCount: number): boolean {
  return isFlowDrivenWindTurbine(assetId) && animationCount === 0
}
