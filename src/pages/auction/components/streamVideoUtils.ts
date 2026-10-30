/**
 * Universal Stream & Background Video Embed Resolver
 * Supports:
 * - YouTube Live: https://www.youtube.com/live/<ID>?si=...
 * - YouTube Standard: https://www.youtube.com/watch?v=<ID>
 * - YouTube Short URL: https://youtu.be/<ID>
 * - YouTube Embed: https://www.youtube.com/embed/<ID>
 * - YouTube Shorts: https://www.youtube.com/shorts/<ID>
 * - Twitch: https://www.twitch.tv/<channel>
 * - Direct Video: MP4, WebM, HLS, CDN streaming loops
 */

export interface ResolvedStreamVideo {
  type: 'iframe' | 'video' | 'none'
  src: string
  originalUrl: string
}

export function parseStreamVideoUrl(url?: string): ResolvedStreamVideo {
  if (!url) return { type: 'none', src: '', originalUrl: '' }
  const clean = url.trim()
  if (!clean) return { type: 'none', src: '', originalUrl: '' }

  // 1. YouTube All Formats (including /live/, /watch?v=, youtu.be/, /shorts/, /embed/)
  const ytMatch = clean.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/
  )
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1]
    return {
      type: 'iframe',
      src: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0`,
      originalUrl: clean,
    }
  }

  // 2. Twitch Channels
  const twitchMatch = clean.match(/twitch\.tv\/([a-zA-Z0-9_]+)/)
  if (twitchMatch && twitchMatch[1]) {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost'
    return {
      type: 'iframe',
      src: `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${host}&muted=true`,
      originalUrl: clean,
    }
  }

  // 3. Direct Video Loop (MP4, WebM, etc.)
  return {
    type: 'video',
    src: clean,
    originalUrl: clean,
  }
}

