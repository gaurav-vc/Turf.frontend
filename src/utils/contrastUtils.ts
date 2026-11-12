/**
 * Dynamic High-Contrast Font & Styling Utilities
 * Automatically inverts font color to opposite readable color (#000000 or #ffffff)
 * based on background color or image tint luminance using ITU-R BT.709 formula.
 */

export function parseColorToRgb(color: string): { r: number; g: number; b: number } | null {
  if (!color || typeof color !== 'string') return null

  const trimmed = color.trim().toLowerCase()

  // Hex format: #rgb, #rgba, #rrggbb, #rrggbbaa
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('')
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return { r, g, b }
      }
    }
  }

  // rgb / rgba format: rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10)
    const g = parseInt(rgbMatch[2], 10)
    const b = parseInt(rgbMatch[3], 10)
    return { r, g, b }
  }

  // Named color shortcuts
  const named: Record<string, { r: number; g: number; b: number }> = {
    black: { r: 0, g: 0, b: 0 },
    white: { r: 255, g: 255, b: 255 },
    amber: { r: 245, g: 158, b: 11 },
    yellow: { r: 234, g: 179, b: 8 },
    red: { r: 239, g: 68, b: 68 },
    emerald: { r: 16, g: 185, b: 129 },
    blue: { r: 59, g: 130, b: 246 },
    navy: { r: 2, g: 6, b: 23 },
    slate: { r: 15, g: 23, b: 42 },
  }

  return named[trimmed] || null
}

/**
 * Returns ITU-R BT.709 perceived luminance (0 to 1).
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const rs = r / 255
  const gs = g / 255
  const bs = b / 255

  const rLin = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4)
  const gLin = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4)
  const bLin = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4)

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}

/**
 * Returns high-contrast opposite text color: '#000000' or '#ffffff'
 */
export function getContrastingTextColor(
  bgColor: string | null | undefined,
  fallback = '#ffffff'
): string {
  if (!bgColor) return fallback
  const rgb = parseColorToRgb(bgColor)
  if (!rgb) return fallback

  const lum = getRelativeLuminance(rgb.r, rgb.g, rgb.b)
  // If luminance > 0.45, dark text is significantly more readable
  return lum > 0.45 ? '#000000' : '#ffffff'
}

/**
 * Returns contrasting badge styling (text, border, subtle bg)
 */
export function getContrastingBadgeStyle(bgColor: string | null | undefined) {
  const textColor = getContrastingTextColor(bgColor)
  const isLight = textColor === '#000000'

  return {
    color: textColor,
    borderColor: isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)',
    fontWeight: '700' as const,
  }
}

