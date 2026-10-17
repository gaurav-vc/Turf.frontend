import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Eye, Radio, User, Plus, X, ExternalLink, 
  Check, Sparkles, Play, StopCircle, RotateCcw, 
  Share2, Tv, Link2, Search 
} from 'lucide-react'
import { apiClient } from '@/api/apiClient'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LiveStream {
  id: string
  title: string
  description: string
  stream_url: string
  organizer: number | string
  organizer_name?: string
  organizer_email?: string
  organizer_id?: number | string
  is_live: boolean
  viewer_count: number
  created_at: string
}

interface PlatformInfo {
  platform: 'youtube' | 'twitch' | 'vimeo' | 'direct' | 'other'
  embedUrl: string
  label: string
  color: string
}

export default function LiveStreamsHub() {
  const { user } = useAuthStore()
  const [streams, setStreams] = useState<LiveStream[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Start Stream Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [endingStreamId, setEndingStreamId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    stream_url: '',
    description: '',
  })

  // Quick Testing Presets so hosts can test immediately
  const DEMO_PRESETS = [
    {
      title: 'Turf Premier League: Tigers vs Falcons - Live Match',
      url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Lofi/live sports style stream
      desc: 'Pitch #1 • T20 Invitational Final • Umpire in Charge: Rahul S.',
      badge: 'Cricket Live'
    },
    {
      title: 'Midnight 7v7 Football Cup: Madrid Strikers vs Barca Turf',
      url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
      desc: 'Center Pitch • Under Floodlights • Live Commentary active.',
      badge: 'Football 7v7'
    },
    {
      title: 'TurfArena Esports & Turf Highlights Broadcast',
      url: 'https://www.twitch.tv/eslcs',
      desc: 'Main Stadium Screen Broadcast feed.',
      badge: 'Twitch Feed'
    }
  ]

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    return { Authorization: `Bearer ${token}` }
  }

  // Cross-tab real-time broadcast helper
  const broadcastStreamEvent = (type: string, data?: any) => {
    try {
      const channel = new BroadcastChannel('turf_streams_channel')
      channel.postMessage({ type, data, timestamp: Date.now() })
      channel.close()
    } catch {}
    window.dispatchEvent(new CustomEvent('turf_streams_updated', { detail: { type, data, timestamp: Date.now() } }))
  }

  // 1. Fetch Streams from Backend
  const fetchStreams = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      const res = await apiClient.get('/v1/streams/live/')
      const data = res.data.results || res.data || []
      setStreams(data)
    } catch (err) {
      console.error('Failed to fetch streams', err)
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchStreams()

    // Real-Time Listeners: BroadcastChannel + Custom Event + Focus + Polling
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('turf_streams_channel')
      channel.onmessage = () => {
        fetchStreams(true)
      }
    } catch {}

    const handleRealTimeSync = () => {
      fetchStreams(true)
    }

    window.addEventListener('turf_streams_updated', handleRealTimeSync)
    window.addEventListener('focus', handleRealTimeSync)

    // 5-second live polling interval
    const interval = setInterval(() => {
      fetchStreams(true)
    }, 5000)

    return () => {
      if (channel) channel.close()
      window.removeEventListener('turf_streams_updated', handleRealTimeSync)
      window.removeEventListener('focus', handleRealTimeSync)
      clearInterval(interval)
    }
  }, [])

  // Helper to parse any stream URL into embed format & detect platform
  const parseStreamUrl = (url: string): PlatformInfo => {
    if (!url || !url.trim()) {
      return { platform: 'other', embedUrl: '', label: 'Enter a valid URL', color: 'bg-muted text-muted-foreground' }
    }
    const clean = url.trim()

    // 1. YouTube detection (live, watch, embed, youtu.be, shorts)
    let youtubeId = ''
    if (clean.includes('youtu.be/')) {
      youtubeId = clean.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || ''
    } else if (clean.includes('youtube.com/watch')) {
      try {
        const parsed = new URL(clean)
        youtubeId = parsed.searchParams.get('v') || ''
      } catch {
        const match = clean.match(/[?&]v=([^&]+)/)
        if (match) youtubeId = match[1]
      }
    } else if (clean.includes('youtube.com/live/')) {
      youtubeId = clean.split('youtube.com/live/')[1]?.split('?')[0]?.split('&')[0] || ''
    } else if (clean.includes('youtube.com/embed/')) {
      youtubeId = clean.split('youtube.com/embed/')[1]?.split('?')[0]?.split('&')[0] || ''
    } else if (clean.includes('youtube.com/shorts/')) {
      youtubeId = clean.split('youtube.com/shorts/')[1]?.split('?')[0]?.split('&')[0] || ''
    }

    if (youtubeId) {
      return {
        platform: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0`,
        label: 'YouTube Live / Video',
        color: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
      }
    }

    // 2. Twitch detection
    if (clean.includes('twitch.tv/')) {
      const parts = clean.split('twitch.tv/')[1]?.split('?')[0]?.split('/') || []
      const channel = parts[0]
      if (channel) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost'
        return {
          platform: 'twitch',
          embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${hostname}&autoplay=true&muted=true`,
          label: 'Twitch Channel Live',
          color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
        }
      }
    }

    // 3. Vimeo detection
    if (clean.includes('vimeo.com/')) {
      const vimeoId = clean.split('vimeo.com/')[1]?.split('?')[0]?.split('/')[0] || ''
      if (vimeoId) {
        return {
          platform: 'vimeo',
          embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1`,
          label: 'Vimeo Live Stream',
          color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
        }
      }
    }

    // 4. Direct video link (.mp4, .webm, .m3u8)
    if (clean.match(/\.(mp4|webm|ogg|m3u8)($|\?)/i)) {
      return {
        platform: 'direct',
        embedUrl: clean,
        label: 'Direct HTML5 Stream',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
      }
    }

    // 5. Fallback generic embed
    return {
      platform: 'other',
      embedUrl: clean,
      label: 'Web Video URL',
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
    }
  }

  // Handle Form Submission: Create Live Stream
  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      return alert('Please enter a stream title.')
    }
    if (!formData.stream_url.trim()) {
      return alert('Please provide a valid stream URL (YouTube Live, Twitch, Vimeo, or Web link).')
    }

    try {
      setIsSubmitting(true)
      const res = await apiClient.post('/v1/streams/live/', {
        title: formData.title.trim(),
        stream_url: formData.stream_url.trim(),
        description: formData.description.trim(),
        is_live: true,
      }, {
        headers: getAuthHeaders()
      })

      broadcastStreamEvent('STREAM_STARTED', res.data)
      setShowCreateModal(false)
      setFormData({ title: '', stream_url: '', description: '' })
      fetchStreams(true)
      alert('🎉 You are now LIVE! Your broadcast is broadcasting to all TurfArena players.')
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.detail || 'Failed to start live stream. Please verify your stream URL.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Ending a Stream
  const handleEndStream = async (streamId: string) => {
    if (!confirm('Are you sure you want to end this live broadcast?')) return
    try {
      setEndingStreamId(streamId)
      // Try dedicated end_stream action first
      try {
        await apiClient.post(`/v1/streams/live/${streamId}/end_stream/`, {}, {
          headers: getAuthHeaders()
        })
      } catch {
        // Fallback to PATCH is_live: false
        await apiClient.patch(`/v1/streams/live/${streamId}/`, { is_live: false }, {
          headers: getAuthHeaders()
        })
      }

      broadcastStreamEvent('STREAM_ENDED', { streamId })
      fetchStreams(true)
      alert('The live stream has ended.')
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to end stream.')
    } finally {
      setEndingStreamId(null)
    }
  }

  // Copy Stream Link
  const handleCopyLink = (stream: LiveStream) => {
    const link = stream.stream_url || `${window.location.origin}/streams`
    navigator.clipboard.writeText(link)
    setCopiedId(stream.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Filtered Streams
  const filteredStreams = streams.filter(s => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      s.title?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.organizer_name?.toLowerCase().includes(q)
    )
  })

  // Check if current user is organizer or manager/admin
  const canManageStream = (stream: LiveStream) => {
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'MANAGER') return true
    if (stream.organizer_id && String(stream.organizer_id) === String(user.id)) return true
    if (stream.organizer && String(stream.organizer) === String(user.id)) return true
    if (stream.organizer_email && stream.organizer_email === user.email) return true
    return false
  }

  const previewInfo = parseStreamUrl(formData.stream_url)

  return (
    <div className="pb-24 bg-background min-h-screen text-foreground">
      {/* Header Banner */}
      <div className="bg-card border-b border-border py-8 md:py-12 px-4 sm:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span>TurfArena Broadcast Center</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-3">
              <Radio className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 animate-pulse shrink-0" />
              <span>Live Streaming Hub</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base font-medium mt-1">
              Watch real-time turf matches, tournament finals, and umpire broadcasts from around the world.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStreams()}
              className="rounded-xl border-border hover:bg-muted font-bold text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs sm:text-sm px-4 py-2 shadow-lg shadow-red-600/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Go Live / Add Stream URL</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Search & Summary Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border/80 p-4 rounded-2xl shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search active match streams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9.5 pr-8 h-9.5 text-xs rounded-xl bg-background border-border/80"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {streams.length} Matches Live Now
            </span>
          </div>
        </div>

        {/* Content Area */}
        {loading && streams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-card border border-border rounded-2xl">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-muted-foreground">Checking live broadcasts...</p>
          </div>
        ) : filteredStreams.length === 0 ? (
          <div className="text-center py-20 px-6 bg-card border border-border rounded-2xl shadow-sm max-w-2xl mx-auto space-y-5">
            <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
              <Tv className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground">No matches are currently live</h2>
              <p className="text-muted-foreground text-sm mt-1.5 max-w-md mx-auto">
                Have a live YouTube match, Twitch broadcast, or pitch video stream? Add your stream URL now to broadcast to the community!
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs px-5 py-2.5 shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Start a Live Stream Now</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchStreams()}
                className="rounded-xl border-border font-bold text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Check Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {filteredStreams.map((stream) => {
              const streamPlatform = parseStreamUrl(stream.stream_url)
              const isOwner = canManageStream(stream)

              return (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all hover:border-brand/40"
                >
                  {/* Video Player Container */}
                  <div className="relative pt-[56.25%] bg-black">
                    {streamPlatform.platform === 'direct' ? (
                      <video
                        src={stream.stream_url}
                        controls
                        autoPlay
                        muted
                        playsInline
                        className="absolute top-0 left-0 w-full h-full object-contain"
                      />
                    ) : (
                      <iframe
                        src={streamPlatform.embedUrl}
                        title={stream.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full border-0"
                      />
                    )}

                    {/* LIVE Overlay Badges */}
                    <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                      <div className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full flex items-center shadow-lg">
                        <Radio className="w-3 h-3 mr-1.5 animate-pulse" /> LIVE
                      </div>
                      <div className={`text-[11px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-md bg-black/60 text-white border border-white/10`}>
                        {streamPlatform.label}
                      </div>
                    </div>

                    <div className="absolute top-3.5 right-3.5 flex items-center gap-2">
                      <div className="bg-black/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center border border-white/10 shadow-sm">
                        <Eye className="w-3 h-3 mr-1.5 text-red-400" /> {stream.viewer_count + 138} watching
                      </div>
                    </div>
                  </div>

                  {/* Stream Info & Actions */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl sm:text-2xl font-black text-foreground leading-snug">
                          {stream.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-2 leading-relaxed">
                        {stream.description || 'Live turf match stream on TurfArena.'}
                      </p>
                    </div>

                    {/* Bottom Metadata & Host Controls */}
                    <div className="pt-4 border-t border-border/70 flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center text-xs font-bold text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-xl border border-border/50">
                        <User className="w-3.5 h-3.5 mr-1.5 text-brand" />
                        <span>Host: {stream.organizer_name || 'Match Umpire'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Copy Stream Link */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(stream)}
                          className="h-8 px-2.5 rounded-xl text-xs font-bold border-border hover:bg-muted"
                          title="Share stream"
                        >
                          {copiedId === stream.id ? (
                            <><Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Copied</>
                          ) : (
                            <><Share2 className="w-3.5 h-3.5 mr-1" /> Share</>
                          )}
                        </Button>

                        {/* Open external */}
                        <a
                          href={stream.stream_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 px-2.5 rounded-xl text-xs font-bold border border-border hover:bg-muted text-foreground transition-colors"
                          title="Open stream source"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open
                        </a>

                        {/* End Stream Button for Host / Admin */}
                        {isOwner && (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={endingStreamId === stream.id}
                            onClick={() => handleEndStream(stream.id)}
                            className="h-8 px-3 rounded-xl text-xs font-bold shadow-sm"
                          >
                            <StopCircle className="w-3.5 h-3.5 mr-1" />
                            {endingStreamId === stream.id ? 'Ending...' : 'End Stream'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL: START / BROADCAST A LIVE STREAM */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden z-10 my-8"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-border bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">Start a Live Match Stream</h2>
                    <p className="text-xs text-muted-foreground font-semibold">
                      Broadcast via YouTube Live, Twitch, Vimeo, or Web stream URL
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleStartStream} className="p-6 space-y-5">
                {/* 1-Click Quick Demo Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand" /> Quick Test Presets (1-Click Test):
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DEMO_PRESETS.map((demo, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => {
                          setFormData({
                            title: demo.title,
                            stream_url: demo.url,
                            description: demo.desc,
                          })
                        }}
                        className="text-left p-2.5 bg-muted/50 hover:bg-muted border border-border/70 rounded-xl transition-all group hover:border-brand/50"
                      >
                        <div className="text-[11px] font-black text-brand uppercase tracking-wider">{demo.badge}</div>
                        <div className="text-xs font-bold text-foreground line-clamp-1 mt-0.5 group-hover:text-brand">{demo.title}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stream Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Stream Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g., Sunday Turf League: Red Warriors vs Blue Titans - Match #4"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="h-10 text-xs rounded-xl bg-background border-border"
                  />
                </div>

                {/* Stream URL Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase tracking-wider text-foreground">
                      Live Stream URL <span className="text-red-500">*</span>
                    </Label>
                    {formData.stream_url && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${previewInfo.color}`}>
                        {previewInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Link2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Paste YouTube Live URL, Twitch channel, Vimeo, or video stream..."
                      value={formData.stream_url}
                      onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                      required
                      className="pl-9.5 h-10 text-xs rounded-xl bg-background border-border font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Supports: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">youtube.com/live/...</code>, <code className="text-[10px] bg-muted px-1 py-0.5 rounded">youtu.be/...</code>, <code className="text-[10px] bg-muted px-1 py-0.5 rounded">twitch.tv/channel</code>, or direct MP4/m3u8.
                  </p>
                </div>

                {/* Live Preview Box */}
                {formData.stream_url && previewInfo.embedUrl && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-emerald-500" /> Interactive Video Stream Preview:
                    </Label>
                    <div className="relative pt-[42%] bg-black rounded-2xl overflow-hidden border border-border shadow-md">
                      {previewInfo.platform === 'direct' ? (
                        <video
                          src={formData.stream_url}
                          controls
                          muted
                          autoPlay
                          className="absolute top-0 left-0 w-full h-full object-contain"
                        />
                      ) : (
                        <iframe
                          src={previewInfo.embedUrl}
                          title="Stream Preview"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          className="absolute top-0 left-0 w-full h-full border-0"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Match Details & Notes (Optional)
                  </Label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Pitch #2, TurfArena South Wing. Umpires: Amit and Krunal. Scoreboard linked."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full text-xs rounded-xl bg-background border border-border p-3 outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none placeholder:text-muted-foreground/70"
                  />
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border-border text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black px-5 shadow-lg shadow-red-600/25 flex items-center gap-2"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>{isSubmitting ? 'Starting Broadcast...' : 'Start Live Stream'}</span>
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
