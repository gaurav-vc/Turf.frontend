import { useState, useEffect, useRef } from 'react'
import {
  Tv,
  Save,
  RotateCcw,
  Copy,
  ExternalLink,
  Check,
  Video,
  Layers,
  Sparkles,
  Shield,
  Flame,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Trophy,
  Move,
  Type,
  Settings2,
  Sliders,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'
import { getTeamShortcut } from './teamThemeUtils'
import { parseStreamVideoUrl } from './streamVideoUtils'

export interface OverlayConfig {
  theme: 'default' | 'gold' | 'neon' | 'dark' | 'glass'
  accent_color: string
  position: 'bottom' | 'center' | 'top'
  scale: number
  border_radius: number

  // Drag and drop coordinates on 16:9 canvas
  pos_x: number // percentage 0 to 100
  pos_y: number // percentage 0 to 100
  pos_w: number // percentage 20 to 100
  pos_h: number // percentage 10 to 100

  // Typography & Custom overrides
  font_family: string
  font_size: number
  font_bold: boolean
  font_italic: boolean
  font_align: 'left' | 'center' | 'right'
  custom_tournament_title: string

  // Background & Video options
  video_enabled: boolean
  video_preset: string
  video_url: string
  video_opacity: number
  background_mode: 'transparent' | 'video' | 'dark_gradient'

  // Component Toggles
  show_base: boolean
  show_specs: boolean
  show_purse: boolean
  show_title: boolean
  show_celebration: boolean
  show_bid_flash: boolean

  // Active Preset being previewed
  active_preset: 'ipl_card' | 'lower_third' | 'scoreboard' | 'sponsor_strip'
}

export const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  theme: 'default',
  accent_color: '#f59e0b',
  position: 'bottom',
  scale: 1,
  border_radius: 24,

  pos_x: 8,
  pos_y: 60,
  pos_w: 84,
  pos_h: 36,

  font_family: 'Inter',
  font_size: 26,
  font_bold: true,
  font_italic: false,
  font_align: 'left',
  custom_tournament_title: '',

  video_enabled: false,
  video_preset: 'none',
  video_url: '',
  video_opacity: 0.75,
  background_mode: 'transparent',

  show_base: true,
  show_specs: true,
  show_purse: true,
  show_title: true,
  show_celebration: true,
  show_bid_flash: true,

  active_preset: 'ipl_card',
}

export const VIDEO_PRESETS = [
  {
    id: 'none',
    label: '🚫 None (Transparent Alpha for OBS)',
    url: '',
  },
  {
    id: 'stadium',
    label: '🏟️ Stadium Floodlights Night',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-stadium-lights-at-night-4284-large.mp4',
  },
  {
    id: 'particles',
    label: '✨ Golden Arena Particle Glow',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-golden-particles-floating-in-the-air-42523-large.mp4',
  },
  {
    id: 'cyber',
    label: '⚡ Dark Neon Cyber Sparks',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-blue-screens-and-data-28775-large.mp4',
  },
  {
    id: 'crowd',
    label: '👥 Arena Stadium Crowd Silhouette',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-silhouette-of-a-stadium-crowd-raising-hands-4286-large.mp4',
  },
  {
    id: 'custom',
    label: '🔗 Custom Video / Stream URL (MP4, YouTube, Twitch)',
    url: '',
  },
]

export const ACCENT_PRESETS = [
  { label: 'Gold Premier', color: '#f59e0b' },
  { label: 'Emerald Mint', color: '#10b981' },
  { label: 'Cyan Cyber', color: '#06b6d4' },
  { label: 'Electric Blue', color: '#3b82f6' },
  { label: 'Ruby Crimson', color: '#ef4444' },
  { label: 'Purple Majesty', color: '#a855f7' },
]

interface OverlayDesignerStudioProps {
  auctionId: string
  publicToken: string
  onBack?: () => void
}

export default function OverlayDesignerStudio({
  auctionId,
  publicToken,
  onBack,
}: OverlayDesignerStudioProps) {
  const [config, setConfig] = useState<OverlayConfig>(DEFAULT_OVERLAY_CONFIG)
  const [liveData, setLiveData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  // Drag and Drop State
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isCardSelected, setIsCardSelected] = useState(true)
  const dragRef = useRef<{
    isDragging: boolean
    isResizing: boolean
    resizeDir: string | null
    startX: number
    startY: number
    origX: number
    origY: number
    origW: number
    origH: number
  } | null>(null)

  // Canvas Interactive Preview Controls
  const [previewStatus, setPreviewStatus] = useState<'BIDDING' | 'SOLD' | 'UNSOLD'>('BIDDING')

  const baseUrl = window.location.origin
  const liveOverlayUrl = publicToken
    ? `${baseUrl}/auction/overlay/${publicToken}?type=${config.active_preset}`
    : ''

  useEffect(() => {
    loadExistingSettings()
  }, [auctionId, publicToken])

  const loadExistingSettings = async () => {
    setLoading(true)
    try {
      if (publicToken) {
        const liveRes = await apiClient.get(`/v1/auction/public/viewer/${publicToken}/`)
        setLiveData(liveRes.data)
      }

      const designRes = await apiClient.get(`/v1/auction/console/${auctionId}/page_design/`)
      const stored =
        designRes.data?.design_json?.overlay_config ||
        designRes.data?.overlay_config ||
        null

      if (stored) {
        setConfig((prev) => ({ ...prev, ...stored }))
      }
    } catch (err) {
      console.error('Failed to load overlay designer settings', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.post(`/v1/auction/console/${auctionId}/page_design/`, {
        overlay_config: config,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err) {
      console.error('Failed to save overlay design', err)
      alert('Failed to save overlay configuration. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('Reset overlay designer settings to factory broadcast defaults?')) {
      setConfig(DEFAULT_OVERLAY_CONFIG)
    }
  }

  const handleCopyUrl = () => {
    if (!liveOverlayUrl) return
    navigator.clipboard.writeText(liveOverlayUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePresetChange = (presetId: string) => {
    const found = VIDEO_PRESETS.find((p) => p.id === presetId)
    if (found) {
      if (presetId === 'none') {
        setConfig((prev) => ({
          ...prev,
          video_preset: presetId,
          video_enabled: false,
          background_mode: 'transparent',
        }))
      } else if (presetId === 'custom') {
        setConfig((prev) => ({
          ...prev,
          video_preset: presetId,
          video_enabled: true,
          background_mode: 'video',
        }))
      } else {
        setConfig((prev) => ({
          ...prev,
          video_preset: presetId,
          video_url: found.url,
          video_enabled: true,
          background_mode: 'video',
        }))
      }
    }
  }

  // =========================================================================
  // DRAG & DROP & RESIZE HANDLERS ON 16:9 CANVAS
  // =========================================================================
  const handleMouseDown = (e: React.MouseEvent, resizeDir: string | null = null) => {
    e.stopPropagation()
    e.preventDefault()
    setIsCardSelected(true)

    dragRef.current = {
      isDragging: !resizeDir,
      isResizing: Boolean(resizeDir),
      resizeDir,
      startX: e.clientX,
      startY: e.clientY,
      origX: config.pos_x,
      origY: config.pos_y,
      origW: config.pos_w,
      origH: config.pos_h,
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragRef.current || !canvasRef.current) return
    const { isDragging, isResizing, resizeDir, startX, startY, origX, origY, origW, origH } = dragRef.current
    const rect = canvasRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const deltaX = ((e.clientX - startX) / rect.width) * 100
    const deltaY = ((e.clientY - startY) / rect.height) * 100

    if (isDragging) {
      let newX = Math.round(origX + deltaX)
      let newY = Math.round(origY + deltaY)

      newX = Math.max(0, Math.min(100 - config.pos_w, newX))
      newY = Math.max(0, Math.min(100 - config.pos_h, newY))

      setConfig((prev) => ({ ...prev, pos_x: newX, pos_y: newY }))
    } else if (isResizing && resizeDir) {
      let newW = origW
      let newH = origH
      let newX = origX
      let newY = origY

      if (resizeDir.includes('e')) {
        newW = Math.max(25, Math.min(100 - origX, Math.round(origW + deltaX)))
      }
      if (resizeDir.includes('s')) {
        newH = Math.max(15, Math.min(100 - origY, Math.round(origH + deltaY)))
      }
      if (resizeDir.includes('w')) {
        const diff = Math.round(deltaX)
        const possibleW = origW - diff
        if (possibleW >= 25 && origX + diff >= 0) {
          newW = possibleW
          newX = origX + diff
        }
      }
      if (resizeDir.includes('n')) {
        const diff = Math.round(deltaY)
        const possibleH = origH - diff
        if (possibleH >= 15 && origY + diff >= 0) {
          newH = possibleH
          newY = origY + diff
        }
      }

      setConfig((prev) => ({
        ...prev,
        pos_x: newX,
        pos_y: newY,
        pos_w: newW,
        pos_h: newH,
      }))
    }
  }

  const handleMouseUp = () => {
    dragRef.current = null
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }

  const nudgePosition = (dx: number, dy: number) => {
    setConfig((prev) => {
      const newX = Math.max(0, Math.min(100 - prev.pos_w, prev.pos_x + dx))
      const newY = Math.max(0, Math.min(100 - prev.pos_h, prev.pos_y + dy))
      return { ...prev, pos_x: newX, pos_y: newY }
    })
  }

  // Active Real Tournament Player for Preview
  const player =
    liveData?.active_player ||
    liveData?.preview_player ||
    liveData?.recent_player || {
      player_name: 'Tournament Player #1',
      serial_no: 1,
      category: 'General Pool',
      role: 'All-Rounder',
      batting_style: 'Right Hand Bat',
      bowling_style: 'Right Arm Medium',
      location: 'Main Arena',
      base_price: 50000,
    }

  const leadingTeam = liveData?.teams?.[0] || {
    team_name: 'Franchise Team #1',
    short_name: 'TM1',
    balance: 500000,
    max_bid: 350000,
  }

  const leadingShortcut = getTeamShortcut(leadingTeam.team_name, leadingTeam.short_name)
  const currentBid = player.base_price ? player.base_price * 1.5 : 75000
  const displayTournamentTitle =
    config.custom_tournament_title || liveData?.auction_name || 'TURF PREMIER LEAGUE (LIVE AUCTION)'

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
              <Tv className="w-5 h-5 text-rose-600" />
              OBS Overlay Designer & Studio
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 font-bold text-[11px] uppercase tracking-wider">
              16:9 LIVE BROADCAST
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Click & drag card anywhere on the 16:9 canvas to position or resize. Wired to backend in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} className="text-xs font-bold rounded-xl cursor-pointer">
              ← Presets List
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleCopyUrl}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied URL
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy OBS Link
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(liveOverlayUrl, '_blank')}
            className="text-xs font-bold rounded-xl border-slate-300 flex items-center gap-1 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Test Fullscreen
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            {saving ? (
              'Saving...'
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" /> Saved!
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-500 font-medium animate-pulse">
          Loading overlay designer workspace...
        </div>
      ) : (
        <div className="space-y-4">
          {/* =========================================================================
              1. 16:9 BROADCAST CANVAS WITH DRAG & DROP
              ========================================================================= */}
          <div className="space-y-2">
            {/* Canvas Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-t-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  1920 × 1080 CANVAS (DRAG & DROP ENABLED)
                </span>
                <span className="text-slate-500">|</span>
                <span className="font-semibold text-slate-300">
                  {displayTournamentTitle}
                </span>
              </div>

              {/* Status Simulation Pills */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-[11px]">
                <button
                  onClick={() => setPreviewStatus('BIDDING')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    previewStatus === 'BIDDING'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Live Bidding
                </button>
                <button
                  onClick={() => setPreviewStatus('SOLD')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    previewStatus === 'SOLD'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sold Status
                </button>
                <button
                  onClick={() => setPreviewStatus('UNSOLD')}
                  className={`px-2.5 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                    previewStatus === 'UNSOLD'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Unsold Status
                </button>
              </div>
            </div>

            {/* Main 16:9 Stage Canvas Frame */}
            <div
              ref={canvasRef}
              onClick={() => setIsCardSelected(true)}
              className="relative w-full aspect-video rounded-b-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl select-none"
            >
              {/* Checkerboard Pattern for Transparent OBS Alpha Detection */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage:
                    'radial-gradient(#475569 0.75px, transparent 0.75px), radial-gradient(#475569 0.75px, #020617 0.75px)',
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px',
                }}
              />

              {/* Live Video Background Layer (Direct loop, YouTube embed, or Twitch) */}
              {config.video_enabled && config.video_url && (() => {
                const resolved = parseStreamVideoUrl(config.video_url)
                if (resolved.type === 'none') return null
                return (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {resolved.type === 'iframe' ? (
                      <iframe
                        src={resolved.src}
                        className="w-full h-full object-cover border-0 pointer-events-none scale-105"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        title="Live Arena Stream Preview"
                      />
                    ) : (
                      <video
                        src={resolved.src}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    )}
                    {/* Dynamic Opacity Tint Layer */}
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: `rgba(0, 0, 0, ${config.video_opacity})` }}
                    />
                  </div>
                )
              })()}

              {/* DRAGGABLE & RESIZABLE OVERLAY CARD */}
              <div
                onMouseDown={(e) => handleMouseDown(e, null)}
                style={{
                  position: 'absolute',
                  left: `${config.pos_x}%`,
                  top: `${config.pos_y}%`,
                  width: `${config.pos_w}%`,
                  borderColor: config.accent_color,
                  borderRadius: `${config.border_radius}px`,
                  boxShadow: `0 0 45px ${config.accent_color}45, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                  fontFamily: config.font_family,
                  cursor: 'move',
                }}
                className={`border-2 bg-gradient-to-r from-slate-950 via-zinc-950 to-slate-950 text-white overflow-hidden shadow-2xl backdrop-blur-xl transition-[border-color,box-shadow] group ${
                  isCardSelected ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                {/* Drag Handle Banner */}
                <div className="absolute top-1 right-2 z-30 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded text-[10px] text-amber-400 pointer-events-none font-bold">
                  <Move className="w-3 h-3" /> Drag to move
                </div>

                {/* 8 Resize Handles (Corner & Edge) */}
                {isCardSelected && (
                  <>
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'nw')}
                      className="absolute top-0 left-0 w-3.5 h-3.5 bg-amber-400 border border-black cursor-nwse-resize z-40"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'ne')}
                      className="absolute top-0 right-0 w-3.5 h-3.5 bg-amber-400 border border-black cursor-nesw-resize z-40"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'se')}
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-amber-400 border border-black cursor-nwse-resize z-40"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'sw')}
                      className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-amber-400 border border-black cursor-nesw-resize z-40"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'n')}
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-2 bg-amber-400/80 cursor-ns-resize z-40 rounded"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 's')}
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-2 bg-amber-400/80 cursor-ns-resize z-40 rounded"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'w')}
                      className="absolute top-1/2 left-0 -translate-y-1/2 h-6 w-2 bg-amber-400/80 cursor-ew-resize z-40 rounded"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'e')}
                      className="absolute top-1/2 right-0 -translate-y-1/2 h-6 w-2 bg-amber-400/80 cursor-ew-resize z-40 rounded"
                    />
                  </>
                )}

                {/* Top Status Header Bar */}
                {config.show_title && (
                  <div className="bg-gradient-to-r from-slate-900 via-amber-950/70 to-slate-900 px-4 py-1.5 border-b border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {previewStatus === 'SOLD' ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-400 font-black text-[10px] uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" /> SOLD TO {leadingTeam.team_name}
                        </span>
                      ) : previewStatus === 'UNSOLD' ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/60 text-rose-400 font-black text-[10px] uppercase tracking-wider">
                          <AlertCircle className="w-3 h-3" /> UNSOLD LOT
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                            LIVE ON THE BLOCK
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest hidden sm:inline">
                        • {displayTournamentTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-amber-300">
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>LOT #{player.serial_no || 1}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase text-[9px]">
                        {player.category}
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Content Row */}
                <div className="flex flex-col sm:flex-row items-stretch">
                  {/* Photo / Cutout */}
                  <div className="relative w-36 sm:w-44 bg-slate-900/90 flex items-center justify-center p-2.5 border-b sm:border-b-0 sm:border-r border-white/10 shrink-0">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={player.player_name}
                        className="w-28 h-32 sm:w-32 sm:h-36 object-cover rounded-xl border border-white/20 shadow-md"
                      />
                    ) : (
                      <div className="w-28 h-32 sm:w-32 sm:h-36 rounded-xl border border-dashed border-amber-500/40 bg-slate-950 flex flex-col items-center justify-center gap-1 text-amber-400">
                        <Trophy className="w-8 h-8" />
                        <span className="text-[9px] font-bold font-mono">No Photo</span>
                      </div>
                    )}

                    {config.show_base && (
                      <div className="absolute bottom-2 left-2 right-2 bg-slate-950/90 border border-white/20 rounded-lg py-0.5 px-2 flex items-center justify-between text-[10px]">
                        <span className="text-[8px] text-slate-400 uppercase font-bold">Base</span>
                        <span className="font-mono font-black text-amber-400">
                          ₹{Number(player.base_price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info & Bidding Stats */}
                  <div className="flex-1 p-3 flex flex-col justify-between space-y-2">
                    <div>
                      {config.show_specs && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-bold uppercase">
                            {player.role || 'All-Rounder'}
                          </span>
                          {player.batting_style && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px]">
                              🏏 {player.batting_style}
                            </span>
                          )}
                          {player.bowling_style && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px]">
                              ⚡ {player.bowling_style}
                            </span>
                          )}
                        </div>
                      )}

                      <h1
                        style={{
                          fontSize: `${config.font_size}px`,
                          fontWeight: config.font_bold ? 900 : 600,
                          fontStyle: config.font_italic ? 'italic' : 'normal',
                          textAlign: config.font_align,
                        }}
                        className="uppercase tracking-tight text-white drop-shadow-sm truncate"
                      >
                        {player.player_name}
                      </h1>
                    </div>

                    {/* Bid & High Bidder Banner */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-900/90 border border-white/10 rounded-xl p-2.5 relative">
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                        style={{ backgroundColor: config.accent_color }}
                      />
                      <div className="pl-2">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-amber-400" />
                          CURRENT BID
                        </span>
                        <div className="font-mono text-xl sm:text-2xl font-black text-amber-400 mt-0.5">
                          ₹{Number(currentBid).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="border-l border-white/10 pl-2.5">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">
                          HIGH BIDDER
                        </span>
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="font-black text-xs text-white uppercase truncate">
                            {leadingTeam.team_name}
                          </span>
                          {leadingShortcut && (
                            <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold">
                              {leadingShortcut}
                            </span>
                          )}
                        </div>
                        {config.show_purse && (
                          <div className="text-[9px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>
                              Purse: <b className="text-emerald-400">₹{Number(leadingTeam.balance || 0).toLocaleString('en-IN')}</b>
                            </span>
                            <span>
                              Max: <b className="text-amber-300">₹{Number(leadingTeam.max_bid || 0).toLocaleString('en-IN')}</b>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Celebration Banner when Sold */}
                {previewStatus === 'SOLD' && config.show_celebration && (
                  <div className="bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 text-zinc-950 font-black text-center py-1 text-[11px] tracking-wider uppercase flex items-center justify-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    <span>CONGRATULATIONS {leadingTeam.team_name} • SOLD</span>
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
              2. EXACT INSPECTOR PODS (MATCHING USER'S IMAGE 2)
              ========================================================================= */}
          <div className="bg-[#071324] border-2 border-amber-500/70 rounded-2xl p-4 shadow-2xl space-y-3">
            {/* Header matching Image 2 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                    EDITING: OVERLAY BROADCAST CARD ({config.pos_x}%, {config.pos_y}%)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Drag on canvas to position or resize • Use controls below to customize width, height, font, colour & labels
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Done
                </button>
              </div>
            </div>

            {/* 3 Pods Row matching Image 2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* POD 1: DIMENSIONS & POSITION */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Move className="w-3 h-3" /> DIMENSIONS & POSITION
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 font-bold">
                    X: {config.pos_x}% • Y: {config.pos_y}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      WIDTH (W: %)
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((p) => ({ ...p, pos_w: Math.max(25, p.pos_w - 2) }))
                        }
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-l text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={config.pos_w}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            pos_w: Math.max(25, Math.min(100, parseInt(e.target.value) || 25)),
                          }))
                        }
                        className="w-12 h-7 text-center bg-slate-900 border-y border-slate-700 text-amber-300 font-mono font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((p) => ({
                            ...p,
                            pos_w: Math.min(100 - p.pos_x, p.pos_w + 2),
                          }))
                        }
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-r text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      HEIGHT (H: %)
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((p) => ({ ...p, pos_h: Math.max(15, p.pos_h - 2) }))
                        }
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-l text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={config.pos_h}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            pos_h: Math.max(15, Math.min(100, parseInt(e.target.value) || 15)),
                          }))
                        }
                        className="w-12 h-7 text-center bg-slate-900 border-y border-slate-700 text-amber-300 font-mono font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((p) => ({
                            ...p,
                            pos_h: Math.min(100 - p.pos_y, p.pos_h + 2),
                          }))
                        }
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-r text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Nudge D-Pad */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    NUDGE POSITION
                  </label>
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 w-fit">
                    <button
                      type="button"
                      onClick={() => nudgePosition(-2, 0)}
                      className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-white flex items-center justify-center active:bg-amber-500 cursor-pointer"
                      title="Nudge Left"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgePosition(2, 0)}
                      className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-white flex items-center justify-center active:bg-amber-500 cursor-pointer"
                      title="Nudge Right"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgePosition(0, -2)}
                      className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-white flex items-center justify-center active:bg-amber-500 cursor-pointer"
                      title="Nudge Up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgePosition(0, 2)}
                      className="w-6 h-6 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-white flex items-center justify-center active:bg-amber-500 cursor-pointer"
                      title="Nudge Down"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>

              {/* POD 2: TYPOGRAPHY & STYLE */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Type className="w-3 h-3" /> TYPOGRAPHY & STYLE
                  </span>
                  <span className="text-[10px] text-slate-400">Font & Controls</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      FONT FAMILY
                    </label>
                    <select
                      value={config.font_family}
                      onChange={(e) => setConfig((p) => ({ ...p, font_family: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1 text-xs focus:outline-none"
                    >
                      <option value="Inter">Inter</option>
                      <option value="Impact">Impact</option>
                      <option value="Outfit">Outfit</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Bebas Neue">Bebas Neue</option>
                      <option value="Roboto Mono">Roboto Mono</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      SIZE (PX)
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((p) => ({ ...p, font_size: Math.max(16, p.font_size - 2) }))
                        }
                        className="w-6 h-7 bg-slate-800 hover:bg-slate-700 rounded-l text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={config.font_size}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            font_size: parseInt(e.target.value) || 26,
                          }))
                        }
                        className="w-10 h-7 text-center bg-slate-900 border-y border-slate-700 text-amber-300 font-mono font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((p) => ({ ...p, font_size: Math.min(50, p.font_size + 2) }))
                        }
                        className="w-6 h-7 bg-slate-800 hover:bg-slate-700 rounded-r text-white font-bold flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Style & Swatches */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      STYLE
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setConfig((p) => ({ ...p, font_bold: !p.font_bold }))}
                        className={`w-6 h-6 rounded font-black text-xs cursor-pointer ${
                          config.font_bold ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfig((p) => ({ ...p, font_italic: !p.font_italic }))}
                        className={`w-6 h-6 rounded italic font-serif text-xs cursor-pointer ${
                          config.font_italic ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        I
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      COLOUR
                    </label>
                    <div className="flex items-center gap-1">
                      {['#f59e0b', '#ffffff', '#ffd54a', '#10b981', '#06b6d4', '#ef4444'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setConfig((p) => ({ ...p, accent_color: c }))}
                          className={`w-5 h-5 rounded-full border cursor-pointer ${
                            config.accent_color === c ? 'ring-2 ring-white scale-110' : 'border-black/30'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* POD 3: LABELS & CONTENT OVERRIDE */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Settings2 className="w-3 h-3" /> LABELS & CONTENT OVERRIDE
                  </span>
                  <span className="text-[10px] text-slate-400">Customization</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">SHOW TITLE & CREST</span>
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setConfig((p) => ({ ...p, show_title: true }))}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        config.show_title ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig((p) => ({ ...p, show_title: false }))}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        !config.show_title ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    CUSTOM TOURNAMENT OVERRIDE
                  </label>
                  <input
                    type="text"
                    placeholder={liveData?.auction_name || 'Override default tournament title...'}
                    value={config.custom_tournament_title}
                    onChange={(e) => setConfig((p) => ({ ...p, custom_tournament_title: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              3. VIDEO, PRESETS & FEATURE TOGGLES ROW
              ========================================================================= */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Background Video Settings */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-zinc-900 tracking-wider flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-rose-600" /> Background Video Loop
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">Video ON</span>
                    <input
                      type="checkbox"
                      checked={config.video_enabled}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          video_enabled: e.target.checked,
                          background_mode: e.target.checked ? 'video' : 'transparent',
                        }))
                      }
                      className="w-4 h-4 rounded text-rose-600"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Video Preset
                    </label>
                    <select
                      value={config.video_preset}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2 bg-white text-zinc-900 focus:outline-none"
                    >
                      {VIDEO_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Dark Tint Opacity ({Math.round(config.video_opacity * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.95"
                      step="0.05"
                      value={config.video_opacity}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          video_opacity: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-rose-600 mt-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Direct Video / Stream URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/stadium_loop.mp4"
                    value={config.video_url}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        video_url: e.target.value,
                        video_enabled: Boolean(e.target.value),
                        background_mode: Boolean(e.target.value) ? 'video' : 'transparent',
                      }))
                    }
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 p-2 bg-white text-zinc-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Component Toggles */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <h4 className="text-xs font-black uppercase text-zinc-900 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" /> Visible Overlay Badges
                </h4>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.show_base}
                      onChange={(e) => setConfig((p) => ({ ...p, show_base: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-rose-600"
                    />
                    <span className="font-bold text-slate-800">Base Price Badge</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.show_specs}
                      onChange={(e) => setConfig((p) => ({ ...p, show_specs: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-rose-600"
                    />
                    <span className="font-bold text-slate-800">Player Specs</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.show_purse}
                      onChange={(e) => setConfig((p) => ({ ...p, show_purse: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-rose-600"
                    />
                    <span className="font-bold text-slate-800">Franchise Purse</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.show_celebration}
                      onChange={(e) => setConfig((p) => ({ ...p, show_celebration: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded text-rose-600"
                    />
                    <span className="font-bold text-slate-800">Sold Ribbon</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
