import axios from 'axios'

// Live Production API URL & Local Development API URL
export const LIVE_API_URL = 'https://xrena.99.vibesandbox.live/api'
export const LOCAL_API_URL = 'http://localhost:8000/api'

// Dynamically resolve API URL so the website runs smoothly both locally and on the live URL
export const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  if (typeof window !== 'undefined') {
    // Check for user runtime toggle in localStorage (e.g. localStorage.setItem('api_url', 'https://xrena.99.vibesandbox.live/api'))
    const manualUrl = localStorage.getItem('api_url')
    if (manualUrl) return manualUrl

    const hostname = window.location.hostname.toLowerCase()
    // When loaded on the live sandbox or custom domain
    if (hostname.includes('vibesandbox.live') || hostname.includes('xrena')) {
      return LIVE_API_URL
    }

    // When running locally on localhost or 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return LOCAL_API_URL
    }
  }

  return LIVE_API_URL
}

export const BASE_URL = getBaseUrl()

export const resolveMediaUrl = (url: string | null | undefined): string => {
  if (!url) return ''
  let trimmed = String(url).trim()
  if (!trimmed) return ''

  // Data URLs or Blob URLs can be rendered immediately
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }

  // Google Drive direct image URL converter
  if (trimmed.includes('drive.google.com')) {
    const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`
    }
  }

  // Dropbox direct image URL converter
  if (trimmed.includes('dropbox.com')) {
    return trimmed.replace('dl=0', 'raw=1')
  }

  // Base API url (e.g. "https://xrena.99.vibesandbox.live/api" or "http://localhost:8000/api")
  const baseWithApi = BASE_URL.replace(/\/+$/, '')
  const baseWithoutApi = BASE_URL.replace(/\/api\/?$/, '')

  // If the stored URL contains obsolete or test hosts, normalize to active base
  if (
    trimmed.includes('testserver/') ||
    trimmed.includes('localhost:8000/') ||
    trimmed.includes('127.0.0.1:8000/') ||
    trimmed.includes('localhost:5173/')
  ) {
    trimmed = trimmed.replace(/^https?:\/\/[^/]+/, '')
  }

  // Pure external URLs that don't belong to our own backend host
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const isOurBackend = trimmed.startsWith(baseWithoutApi) || trimmed.startsWith(baseWithApi)
    if (!isOurBackend) {
      return trimmed
    }
  }

  // Full URL containing /media/ but on our backend or relative
  if (trimmed.includes('/media/')) {
    const idx = trimmed.indexOf('/media/')
    const relPart = trimmed.slice(idx) // e.g. "/media/team_logos/..."
    // Route via /api/media/ so it safely traverses API reverse proxies on live/sandbox
    return `${baseWithoutApi}/api${relPart}`
  }

  if (trimmed.startsWith('/api/media/')) {
    return `${baseWithoutApi}${trimmed}`
  }

  if (trimmed.startsWith('api/media/')) {
    return `${baseWithoutApi}/${trimmed}`
  }

  if (trimmed.startsWith('/')) {
    return `${baseWithoutApi}/api/media${trimmed}`
  }

  // Bare filename/path (e.g. "team_logos/logo.png")
  return `${baseWithApi}/media/${trimmed}`
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const ENDPOINTS = {
  // Auth
  LOGIN: '/token/',
  REGISTER: '/v1/accounts/register/',
  USERS: '/v1/accounts/users/',
  
  // Turfs App
  TURFS: '/v1/turfs-app/turfs/',
  COURTS: '/v1/turfs-app/courts/',
  MAINTENANCE_BLOCKS: '/v1/turfs-app/blocked-periods/',
  PRICING_RULES: '/v1/turfs-app/price-rules/',
  
  // Bookings
  BOOKINGS: '/v1/bookings/',

  // Sports App
  TEAMS: '/v1/sports/teams/',
  SPORTS: '/v1/sports/sports/',
  TOURNAMENTS: '/v1/sports/tournaments/',
  TOURNAMENT_TEAMS: '/v1/sports/tournament-teams/',
  // Auction App
  AUCTIONS: '/v1/auction/auctions/',
  AUCTION_TEAMS: '/v1/auction/teams/',
  AUCTION_PLAYERS: '/v1/auction/players/',
  AUCTION_BIDS: '/v1/auction/bids/',

  // Clubs App
  CLUBS: '/v1/clubs/clubs/',
  CLUB_TOURNAMENTS: '/v1/clubs/tournaments/',
  CLUB_MATCHES: '/v1/clubs/matches/',

  // Core
  SEARCH: '/v1/core/search/',
}

