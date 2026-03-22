/**
 * 系统管线/端口色 — 与孪生运维台（冰青主色）同系，饱和度控制在中低，避免彩虹屏。
 */
export const SYSTEM_COLORS: Record<string, string> = {
  CHW: '#45c4e8',
  CHWP: '#7dd3fc',
  CW: '#2dd4bf',
  CDW: '#6ee7b7',
  default: '#64748b',
}

export function systemColor(system: string): string {
  return SYSTEM_COLORS[system] ?? SYSTEM_COLORS.default
}
