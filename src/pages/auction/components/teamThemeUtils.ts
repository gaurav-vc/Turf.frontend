/**
 * Dynamic Franchise Team Theme & Keyboard Shortcut Utilities
 * 100% Dynamic - Zero hardcoded or dummy team data.
 * Pure algorithmic sequence colors, number keys, and real-time acronym generator.
 */

export interface TeamTheme {
  index: number
  sequenceNo: number
  keyShortcut: string
  accent: string
  accentHover: string
  border: string
  glow: string
  bgGradient: string
  badgeBg: string
  badgeText: string
  pillBg: string
  pillText: string
  textColor: string
}

// Curated harmonious base palettes for sequential sports franchise cards
const BASE_PALETTES = [
  {
    accent: '#0052CC',
    accentHover: '#0065FF',
    border: '#2684FF',
    glow: 'rgba(0, 82, 204, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(0, 40, 110, 0.75) 0%, rgba(2, 12, 35, 0.95) 100%)',
    badgeBg: '#0052CC',
    badgeText: '#FFFFFF',
    pillBg: 'rgba(0, 100, 255, 0.25)',
    pillText: '#38BDF8',
    textColor: '#93C5FD',
  },
  {
    accent: '#F59E0B',
    accentHover: '#FBBF24',
    border: '#FBBF24',
    glow: 'rgba(245, 158, 11, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(120, 53, 15, 0.75) 0%, rgba(30, 15, 4, 0.95) 100%)',
    badgeBg: '#F59E0B',
    badgeText: '#18181B',
    pillBg: 'rgba(245, 158, 11, 0.25)',
    pillText: '#FDE047',
    textColor: '#FCD34D',
  },
  {
    accent: '#DC2626',
    accentHover: '#EF4444',
    border: '#F87171',
    glow: 'rgba(220, 38, 38, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(127, 29, 29, 0.75) 0%, rgba(35, 8, 8, 0.95) 100%)',
    badgeBg: '#DC2626',
    badgeText: '#FFFFFF',
    pillBg: 'rgba(220, 38, 38, 0.25)',
    pillText: '#FCA5A5',
    textColor: '#F87171',
  },
  {
    accent: '#7C3AED',
    accentHover: '#8B5CF6',
    border: '#A78BFA',
    glow: 'rgba(124, 58, 237, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(76, 29, 149, 0.75) 0%, rgba(20, 8, 45, 0.95) 100%)',
    badgeBg: '#7C3AED',
    badgeText: '#FFFFFF',
    pillBg: 'rgba(124, 58, 237, 0.25)',
    pillText: '#C4B5FD',
    textColor: '#A78BFA',
  },
  {
    accent: '#059669',
    accentHover: '#10B981',
    border: '#34D399',
    glow: 'rgba(5, 150, 105, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(6, 78, 59, 0.75) 0%, rgba(2, 28, 20, 0.95) 100%)',
    badgeBg: '#059669',
    badgeText: '#FFFFFF',
    pillBg: 'rgba(5, 150, 105, 0.25)',
    pillText: '#6EE7B7',
    textColor: '#34D399',
  },
  {
    accent: '#EA580C',
    accentHover: '#F97316',
    border: '#FB923C',
    glow: 'rgba(234, 88, 12, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(124, 45, 18, 0.75) 0%, rgba(35, 12, 5, 0.95) 100%)',
    badgeBg: '#EA580C',
    badgeText: '#FFFFFF',
    pillBg: 'rgba(234, 88, 12, 0.25)',
    pillText: '#FDBA74',
    textColor: '#FB923C',
  },
  {
    accent: '#DB2777',
    accentHover: '#EC4899',
    border: '#F472B6',
    glow: 'rgba(219, 39, 119, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(131, 24, 67, 0.75) 0%, rgba(38, 8, 22, 0.95) 100%)',
    badgeBg: '#DB2777',
    badgeText: '#FFFFFF',
    pillBg: 'rgba(219, 39, 119, 0.25)',
    pillText: '#F9A8D4',
    textColor: '#F472B6',
  },
  {
    accent: '#0891B2',
    accentHover: '#06B6D4',
    border: '#22D3EE',
    glow: 'rgba(8, 145, 178, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(22, 78, 99, 0.75) 0%, rgba(6, 25, 35, 0.95) 100%)',
    badgeBg: '#0891B2',
    badgeText: '#FFFFFF',
    pillBg: 'rgba(8, 145, 178, 0.25)',
    pillText: '#67E8F9',
    textColor: '#22D3EE',
  },
  {
    accent: '#4F46E5',
    accentHover: '#6366F1',
    border: '#818CF8',
    glow: 'rgba(79, 70, 229, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(49, 46, 129, 0.75) 0%, rgba(14, 12, 45, 0.95) 100%)',
    badgeBg: '#4F46E5',
    badgeText: '#FFFFFF',
    pillBg: 'rgba(79, 70, 229, 0.25)',
    pillText: '#A5B4FC',
    textColor: '#818CF8',
  },
  {
    accent: '#65A30D',
    accentHover: '#84CC16',
    border: '#A3E635',
    glow: 'rgba(101, 163, 13, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(54, 83, 20, 0.75) 0%, rgba(18, 28, 6, 0.95) 100%)',
    badgeBg: '#65A30D',
    badgeText: '#18181B',
    pillBg: 'rgba(101, 163, 13, 0.25)',
    pillText: '#BEF264',
    textColor: '#A3E635',
  },
  {
    accent: '#0D9488',
    accentHover: '#14B8A6',
    border: '#2DD4BF',
    glow: 'rgba(13, 148, 136, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(19, 78, 74, 0.75) 0%, rgba(5, 25, 24, 0.95) 100%)',
    badgeBg: '#0D9488',
    badgeText: '#FFFFFF',
    pillBg: 'rgba(13, 148, 136, 0.25)',
    pillText: '#5EEAD4',
    textColor: '#2DD4BF',
  },
  {
    accent: '#BE185D',
    accentHover: '#DB2777',
    border: '#F472B6',
    glow: 'rgba(190, 24, 93, 0.45)',
    bgGradient: 'linear-gradient(135deg, rgba(131, 24, 67, 0.75) 0%, rgba(35, 6, 18, 0.95) 100%)',
    badgeBg: '#BE185D',
    badgeText: '#FFFFFF',
    pillBg: 'rgba(190, 24, 93, 0.25)',
    pillText: '#F9A8D4',
    textColor: '#F472B6',
  },
]

/**
 * Returns a unique color theme for any team sequence index (1, 2, 3...).
 * Dynamically factors in totalTeams for uniform, distinct color distribution.
 */
export function getTeamTheme(index: number, totalTeams: number = 8): TeamTheme {
  const sequenceNo = index + 1
  const keyShortcut = sequenceNo <= 9 ? sequenceNo.toString() : sequenceNo === 10 ? '0' : ''

  if (index < BASE_PALETTES.length) {
    return {
      index,
      sequenceNo,
      keyShortcut,
      ...BASE_PALETTES[index],
    }
  }

  // Pure algorithmic generation for arbitrary number of teams beyond palette size
  const totalSafe = Math.max(1, totalTeams)
  const hue = Math.round((index * (360 / totalSafe)) % 360)
  const accent = `hsl(${hue}, 80%, 50%)`
  const accentHover = `hsl(${hue}, 85%, 60%)`
  const border = `hsl(${hue}, 75%, 65%)`
  const glow = `hsla(${hue}, 80%, 50%, 0.45)`
  const bgGradient = `linear-gradient(135deg, hsla(${hue}, 65%, 20%, 0.75) 0%, rgba(10, 15, 25, 0.95) 100%)`

  return {
    index,
    sequenceNo,
    keyShortcut,
    accent,
    accentHover,
    border,
    glow,
    bgGradient,
    badgeBg: accent,
    badgeText: '#FFFFFF',
    pillBg: `hsla(${hue}, 70%, 50%, 0.25)`,
    pillText: `hsl(${hue}, 85%, 75%)`,
    textColor: border,
  }
}

/**
 * Pure dynamic algorithm to derive a team shortcut code from the live team record.
 * ZERO hardcoded team names or dummy strings.
 *
 * 1. If existingShort is a valid 2-4 uppercase acronym (e.g. from DB), returns it.
 * 2. If multi-word (e.g. "Mumbai Indians", "Super Kings"):
 *    Takes the first letter of each word uppercase -> "MI", "SK".
 * 3. If single word (e.g. "Titans"): takes first 3 letters uppercase -> "TIT".
 */
export function getTeamShortcut(teamName?: string, existingShort?: string): string {
  const rawShort = (existingShort || '').trim().toUpperCase()
  const rawName = (teamName || '').trim()
  const words = rawName.split(/[\s\-_]+/).filter(Boolean)

  // 1. If multi-word team name (e.g. "Mumbai Indians", "Chennai Super Kings", "Cyclone Riders"):
  if (words.length >= 2) {
    const wordAcronym = words.map((w) => w[0]).join('').toUpperCase()
    // If rawShort is merely a naive 3-letter prefix of only the first word (e.g. "MUM" for "Mumbai Indians"):
    if (rawShort && rawShort.length === 3 && words[0].toUpperCase().startsWith(rawShort)) {
      return wordAcronym.slice(0, 4)
    }
    // If rawShort is a 2-4 letter acronym that doesn't just slice word 1:
    if (rawShort && rawShort.length >= 2 && rawShort.length <= 4 && !words[0].toUpperCase().startsWith(rawShort)) {
      return rawShort
    }
    return wordAcronym.slice(0, 4)
  }

  // 2. Single word team name (e.g. "Titans", "Warriors"):
  if (rawShort && rawShort.length >= 2 && rawShort.length <= 4) {
    return rawShort
  }
  if (rawName.length > 0) {
    return rawName.slice(0, 3).toUpperCase()
  }

  return rawShort || 'TM'
}
