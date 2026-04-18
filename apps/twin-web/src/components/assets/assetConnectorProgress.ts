import type { AssetConnector } from '@/schemas/assets'

function isConnectorPlaced(connector: Pick<AssetConnector, 'geometry'>) {
  return connector.geometry.anchor.some((value) => Math.abs(value) > 1e-6)
}

export function summarizeConnectorProgress(connectors: Array<Pick<AssetConnector, 'required' | 'geometry'>>) {
  const total = connectors.length
  const completed = connectors.filter(isConnectorPlaced).length
  const requiredRemaining = connectors.filter((connector) => connector.required && !isConnectorPlaced(connector)).length
  const publishReady = total > 0 && requiredRemaining === 0
  const riskText =
    requiredRemaining > 0 ? `仍有 ${requiredRemaining} 个必需端点未定位` : '所有必需端点已定位，可以继续发布'

  return {
    total,
    completed,
    requiredRemaining,
    publishReady,
    riskText,
  }
}
