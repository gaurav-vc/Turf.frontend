import { useState, useId, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  Gavel, RotateCcw, Search, Shield, Trophy, Flame,
  Clock, CheckCircle, XCircle, ChevronRight, AlertCircle, RefreshCw, Sparkles,
  Volume2, VolumeX, Play, Pause, Maximize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/api/apiClient'
import { useLiveAuctionState } from '../hooks/useLiveAuctionState'
import { type ActionButtonConfig, DEFAULT_ACTION_BUTTONS, DEFAULT_PAGE_DESIGN } from './AuctionPageDesigner'

interface LiveBroadcastConsoleProps {
  auctionId: string
  auctionName?: string
}

export default function LiveBroadcastConsole({ auctionId, auctionName }: LiveBroadcastConsoleProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    state,
    loading,
    actionLoading,
    placeBid,
    hammerSold,
    hammerUnsold,
    undoSale,
    undoBid,
    resetBid,
    selectPlayerNo,
    startReauction,
  } = useLiveAuctionState(auctionId, 1200)

  const [pageDesign, setPageDesign] = useState<any>(null)
  const [customBidAmount, setCustomBidAmount] = useState<number>(0)
  const [customBidTeamId, setCustomBidTeamId] = useState<string>('')
  const [isCustomBidModalOpen, setIsCustomBidModalOpen] = useState(false)
  const [customBidStep, setCustomBidStep] = useState<1 | 2>(1)
  const [jumpPlayerNo, setJumpPlayerNo] = useState<string>('')
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [timerSeconds, setTimerSeconds] = useState(30)
  const [timerActive, setTimerActive] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(
    searchParams.get('fullscreen') === 'true' || searchParams.get('fullscreen') === '1'
  )
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const customBidInputId = useId()

  const actionButtons: ActionButtonConfig[] =
    pageDesign?.zones?.action_buttons && Array.isArray(pageDesign.zones.action_buttons)
      ? pageDesign.zones.action_buttons
      : DEFAULT_ACTION_BUTTONS

  useEffect(() => {
    apiClient
      .get(`/v1/auction/console/${auctionId}/page_design/`)
      .then((res) => {
        if (res.data) setPageDesign(res.data.design_json || res.data)
      })
      .catch((err) => {
        console.warn('Page design load fallback', err)
      })
  }, [auctionId])

  useEffect(() => {
    apiClient
      .get(`/v1/auction/categories/?auction=${auctionId}`)
      .then((res) => {
        const items = res.data.results || res.data || []
        const names = items.map((c: any) => c.name).filter(Boolean)
        if (names.length > 0) {
          setCategories(names)
          setSelectedCategory(names[0])
        }
      })
      .catch((err) => {
        console.warn('Categories load fallback', err)
      })
  }, [auctionId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false)
        return
      }

      // Do not trigger shortcuts when typing in inputs/textareas/selects
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (isInput) return

      if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!actionLoading && player && highestBid) {
          e.preventDefault()
          handleHammerSold()
        }
      } else if ((e.key === 'u' || e.key === 'U') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!actionLoading && player) {
          e.preventDefault()
          handleHammerUnsold()
        }
      } else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!actionLoading && player) {
          e.preventDefault()
          openCustomBidModal()
        }
      } else if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!actionLoading) {
          e.preventDefault()
          handleUndoSale()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullScreen, actionLoading, state?.active_player, state?.highest_bid])

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  const exitFullScreen = () => {
    setIsFullScreen(false)
    if (searchParams.get('fullscreen')) {
      const next = new URLSearchParams(searchParams)
      next.delete('fullscreen')
      setSearchParams(next)
    }
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  const handleCategoryChange = async (cat: string) => {
    setSelectedCategory(cat)
    try {
      const res = await apiClient.get(`/v1/auction/players/?auction=${auctionId}&category=${cat}`)
      const players = res.data.results || res.data || []
      const available = players.find((p: any) => p.status === 'AVAILABLE')
      if (available) {
        await selectPlayerNo(available.serial_no)
      }
    } catch (_) {}
  }

  const player = state?.active_player
  const currentBid = state?.current_bid || 0
  const highestBid = state?.highest_bid

  const playSoundEffect = (type: 'bid' | 'sold' | 'unsold' | 'timer') => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()

      if (type === 'bid') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(587.33, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.25)
      } else if (type === 'sold') {
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(220, ctx.currentTime)
        osc1.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2)
        gain1.gain.setValueAtTime(0.4, ctx.currentTime)
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc1.connect(gain1)
        gain1.connect(ctx.destination)
        osc1.start()
        osc1.stop(ctx.currentTime + 0.3)

        setTimeout(() => {
          try {
            const osc2 = ctx.createOscillator()
            const gain2 = ctx.createGain()
            osc2.type = 'triangle'
            osc2.frequency.setValueAtTime(440, ctx.currentTime)
            osc2.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3)
            gain2.gain.setValueAtTime(0.3, ctx.currentTime)
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
            osc2.connect(gain2)
            gain2.connect(ctx.destination)
            osc2.start()
            osc2.stop(ctx.currentTime + 0.4)
          } catch (_) {}
        }, 150)
      } else if (type === 'unsold') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(349.23, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(196, ctx.currentTime + 0.35)
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.35)
      } else if (type === 'timer') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.08)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.08)
      }
    } catch (_) {}
  }

  // Timer tick effect
  useEffect(() => {
    let interval: any = null
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          if (prev <= 6) {
            playSoundEffect('timer')
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerActive, timerSeconds, soundEnabled])

  // Reset timer on new active player
  useEffect(() => {
    if (player) {
      setTimerSeconds(30)
      setTimerActive(true)
    } else {
      setTimerActive(false)
    }
  }, [player?.id])

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#ffd700', '#ff4500', '#00ffcc', '#ffffff'],
    })
  }

  const handleQuickBid = async (teamId: string) => {
    setFeedbackMessage(null)
    const res = await placeBid(teamId)
    if (res?.success) {
      playSoundEffect('bid')
      setTimerSeconds(30)
      setTimerActive(true)
    } else {
      setFeedbackMessage({ text: res?.error || 'Bid could not be placed', type: 'error' })
    }
  }

  const handleHammerSold = async () => {
    setFeedbackMessage(null)
    const res = await hammerSold()
    if (res?.success) {
      playSoundEffect('sold')
      setTimerActive(false)
      triggerConfetti()
      setFeedbackMessage({ text: 'PLAYER SOLD! Balance updated in team purse.', type: 'success' })
    } else {
      setFeedbackMessage({ text: res?.error || 'Failed to mark sold', type: 'error' })
    }
  }

  const handleHammerUnsold = async () => {
    setFeedbackMessage(null)
    const res = await hammerUnsold()
    if (res?.success) {
      playSoundEffect('unsold')
      setTimerActive(false)
      setFeedbackMessage({ text: 'Player marked UNSOLD. Lot cleared.', type: 'success' })
    } else {
      setFeedbackMessage({ text: res?.error || 'Failed to mark unsold', type: 'error' })
    }
  }

  const handleUndoSale = async () => {
    setFeedbackMessage(null)
    const res = await undoSale()
    if (res?.success) {
      setFeedbackMessage({ text: 'Sale successfully undone and purse refunded.', type: 'success' })
    } else {
      setFeedbackMessage({ text: res?.error || 'Failed to undo sale', type: 'error' })
    }
  }

  const handleJumpPlayer = async () => {
    if (!jumpPlayerNo) return
    setFeedbackMessage(null)
    const res = await selectPlayerNo(parseInt(jumpPlayerNo))
    if (res?.success) {
      setJumpPlayerNo('')
    } else {
      setFeedbackMessage({ text: res?.error || 'Player not found', type: 'error' })
    }
  }

  const openCustomBidModal = () => {
    setCustomBidStep(1)
    setCustomBidAmount(currentBid > 0 ? currentBid + 50000 : (player?.base_price || 10000))
    if (state?.teams && state.teams.length > 0) {
      setCustomBidTeamId(state.teams[0].team_id)
    }
    setIsCustomBidModalOpen(true)
  }

  const submitCustomBid = async () => {
    if (!customBidTeamId || !customBidAmount) return
    const res = await placeBid(customBidTeamId, customBidAmount, true)
    if (res?.success) {
      setIsCustomBidModalOpen(false)
      setFeedbackMessage({ text: 'Custom bid placed successfully!', type: 'success' })
    } else {
      setFeedbackMessage({ text: res?.error || 'Invalid custom bid', type: 'error' })
    }
  }

  if (loading && !state) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Toolbar: Title & Full Screen Arena Mode Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800 bg-[#07162b] p-4 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Gavel className="w-5 h-5 text-amber-400" />
            Live Broadcast Auction Arena
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Real-time franchise bidding floor with live audio feedback, countdown timers, and instant lot settlement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setIsFullScreen(true)
              toggleBrowserFullscreen()
            }}
            className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Open Full Screen Arena</span>
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center justify-between rounded-xl border p-4 text-sm font-medium ${
              feedbackMessage.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                : 'border-red-500/30 bg-red-950/40 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="rounded p-1 hover:bg-white/10"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Broadcast Stage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Player on the Block (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div
            className="relative overflow-hidden rounded-2xl border border-slate-800 p-6 shadow-2xl"
            style={{ backgroundColor: '#020617' }}
          >
            {/* Background Image / Preset Overlay from Page Designer */}
            {pageDesign?.custom_background_url ? (
              <img
                src={pageDesign.custom_background_url}
                alt="Stage Background"
                className="absolute inset-0 h-full w-full object-cover opacity-35 pointer-events-none"
              />
            ) : pageDesign?.background_mode === 'classic_turf' ? (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-950 pointer-events-none opacity-50" />
            ) : pageDesign?.background_mode === 'dark_neon' ? (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950 pointer-events-none opacity-50" />
            ) : pageDesign?.background_mode === 'stadium' ? (
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 pointer-events-none opacity-60" />
            ) : null}

            {/* Broadcast Tournament Branding Banner */}
            {pageDesign?.zones?.branding?.title_text && pageDesign?.elements?.tournament_title?.selected !== false && (
              <div
                className={`flex items-center gap-2 mb-4 pb-3 border-b border-white/10 ${
                  pageDesign.zones.branding.logo_position === 'center'
                    ? 'justify-center'
                    : pageDesign.zones.branding.logo_position === 'right'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                {pageDesign.zones.branding.title_image_url ? (
                  <img
                    src={pageDesign.zones.branding.title_image_url}
                    alt="Logo"
                    style={{ height: `${pageDesign.zones.branding.logo_size || 34}px` }}
                    className={`object-contain ${pageDesign.zones.branding.remove_title_bg ? 'bg-transparent' : ''}`}
                  />
                ) : (
                  <Shield
                    style={{
                      width: `${pageDesign.zones.branding.logo_size || 28}px`,
                      height: `${pageDesign.zones.branding.logo_size || 28}px`,
                    }}
                    className="text-amber-400"
                  />
                )}
                <span
                  style={{
                    color: pageDesign.zones.branding.title_colour || '#FFD54A',
                    fontSize: `${Math.min(pageDesign.zones.branding.title_size || 24, 30)}px`,
                  }}
                  className="font-black tracking-wider uppercase font-mono drop-shadow-md"
                >
                  {pageDesign.zones.branding.title_text}
                </span>
              </div>
            )}

            {/* Header info */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                {pageDesign?.elements?.player_number?.selected !== false && (
                  <span
                    style={{
                      color: pageDesign?.elements?.player_number?.colour || '#FFD54A',
                    }}
                    className="flex h-8 items-center justify-center rounded-lg bg-amber-500/20 font-mono text-sm font-bold px-2.5"
                  >
                    {pageDesign?.elements?.player_number?.show_label ? 'No. ' : '#'}
                    {player?.serial_no || '—'}
                  </span>
                )}
                {pageDesign?.elements?.player_category?.selected !== false && (
                  <span
                    style={{
                      color: pageDesign?.elements?.player_category?.colour || '#FCD34D',
                    }}
                    className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                  >
                    {pageDesign?.elements?.player_category?.show_label ? 'Category: ' : ''}
                    {player?.category || 'General Pool'}
                  </span>
                )}
                {pageDesign?.elements?.role?.selected !== false && (
                  <span
                    style={{
                      color: pageDesign?.elements?.role?.colour || '#93C5FD',
                    }}
                    className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold"
                  >
                    {pageDesign?.elements?.role?.show_label ? 'Role: ' : ''}
                    {player?.role || 'All-Rounder'}
                  </span>
                )}
              </div>

              {/* Timer, Audio Toggle & Player Jump */}
              <div className="flex items-center gap-2">
                {/* 30s Countdown Timer Badge */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-bold transition ${
                    timerSeconds <= 5
                      ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                      : timerSeconds <= 10
                      ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{timerSeconds}s</span>
                  <button
                    type="button"
                    onClick={() => setTimerActive(!timerActive)}
                    className="hover:text-white p-0.5 ml-0.5"
                    title={timerActive ? 'Pause Timer' : 'Resume Timer'}
                  >
                    {timerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimerSeconds(30)}
                    className="hover:text-white p-0.5"
                    title="Reset to 30s"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Sound Effects Toggle */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-lg border text-xs transition ${
                    soundEnabled
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                  title={soundEnabled ? 'Mute Stadium Audio' : 'Enable Stadium Audio'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <Input
                  type="number"
                  placeholder="Player #"
                  value={jumpPlayerNo}
                  onChange={(e) => setJumpPlayerNo(e.target.value)}
                  className="h-8 w-20 border-white/20 bg-white/5 text-xs text-white"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleJumpPlayer}
                  disabled={actionLoading}
                  className="h-8 border-amber-500/40 text-xs text-amber-400 hover:bg-amber-500/20"
                >
                  <Search className="h-3 w-3 mr-1" /> Jump
                </Button>
              </div>
            </div>

            {/* Active Player Card Details */}
            {player ? (
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
                {/* Photo & Base price */}
                {pageDesign?.elements?.player_photo?.selected !== false && (
                  <div className="md:col-span-4 flex flex-col items-center">
                    <div className="relative h-48 w-44 overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-slate-800 shadow-xl">
                      {player.photo_url ? (
                        <img
                          src={player.photo_url}
                          alt={player.player_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center text-slate-500">
                          <Trophy className="h-12 w-12 text-slate-600" />
                          <span className="mt-2 text-xs font-semibold">NO PHOTO</span>
                        </div>
                      )}
                      {pageDesign?.elements?.base_price?.selected !== false && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-center">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400">
                            {pageDesign?.elements?.base_price?.show_label ? 'Base Price' : 'Base'}
                          </span>
                          <p
                            style={{
                              color: pageDesign?.elements?.base_price?.colour || '#FFD54A',
                            }}
                            className="font-mono text-sm font-bold"
                          >
                            ₹{player.base_price.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Player Stats & Live Bid display */}
                <div
                  className={`${
                    pageDesign?.elements?.player_photo?.selected !== false ? 'md:col-span-8' : 'md:col-span-12'
                  } flex flex-col justify-between`}
                >
                  <div>
                    {pageDesign?.elements?.player_name?.selected !== false && (
                      <h2
                        style={{
                          color: pageDesign?.elements?.player_name?.colour || '#FFFFFF',
                          fontSize: `${
                            pageDesign?.elements?.player_name?.font_size
                              ? Math.min(pageDesign.elements.player_name.font_size, 46)
                              : 32
                          }px`,
                        }}
                        className="font-extrabold tracking-tight"
                      >
                        {pageDesign?.elements?.player_name?.show_label ? 'Player: ' : ''}
                        {player.player_name}
                      </h2>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      {pageDesign?.elements?.batting_style?.selected !== false && (
                        <div className="rounded-lg bg-white/5 p-2">
                          <span className="text-slate-400">
                            {pageDesign?.elements?.batting_style?.show_label ? 'Batting Style: ' : 'Bat: '}
                          </span>
                          <p
                            style={{
                              color: pageDesign?.elements?.batting_style?.colour || '#E2E8F0',
                            }}
                            className="font-semibold"
                          >
                            {player.batting_style || 'Right Hand'}
                          </p>
                        </div>
                      )}
                      {pageDesign?.elements?.bowling_style?.selected !== false && (
                        <div className="rounded-lg bg-white/5 p-2">
                          <span className="text-slate-400">
                            {pageDesign?.elements?.bowling_style?.show_label ? 'Bowling Style: ' : 'Bowl: '}
                          </span>
                          <p
                            style={{
                              color: pageDesign?.elements?.bowling_style?.colour || '#E2E8F0',
                            }}
                            className="font-semibold"
                          >
                            {player.bowling_style || 'Right Arm'}
                          </p>
                        </div>
                      )}
                      {player.location && pageDesign?.elements?.location?.selected !== false && (
                        <div className="rounded-lg bg-white/5 p-2 col-span-2">
                          <span className="text-slate-400">
                            {pageDesign?.elements?.location?.show_label ? 'Location: ' : 'Loc: '}
                          </span>
                          <p
                            style={{
                              color: pageDesign?.elements?.location?.colour || '#E2E8F0',
                            }}
                            className="font-semibold"
                          >
                            {player.location}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current Bid Display */}
                  {pageDesign?.elements?.current_bid?.selected !== false && (
                    <div
                      className="mt-4 rounded-xl border border-amber-500/40 p-4"
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.08)',
                        backgroundImage: 'none',
                        boxShadow: 'none',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-amber-300/80">
                            {pageDesign?.elements?.current_bid?.show_label ? 'Current Bid' : 'Bid'}
                          </span>
                          <p
                            style={{
                              color: pageDesign?.elements?.current_bid?.colour || '#FFD54A',
                              fontSize: `${
                                pageDesign?.elements?.current_bid?.font_size
                                  ? Math.min(pageDesign.elements.current_bid.font_size, 48)
                                  : 36
                              }px`,
                            }}
                            className="font-mono font-extrabold text-amber-400"
                          >
                            ₹{currentBid.toLocaleString()}
                          </p>
                        </div>
                        {highestBid && pageDesign?.elements?.bidder_name?.selected !== false && (
                          <div className="text-right">
                            <span className="text-xs uppercase tracking-wider text-slate-400">
                              {pageDesign?.elements?.bidder_name?.show_label ? 'Leading Franchise' : 'Franchise'}
                            </span>
                            <p
                              style={{
                                color: pageDesign?.elements?.bidder_name?.colour || '#FFFFFF',
                              }}
                              className="text-lg font-bold text-white"
                            >
                              {highestBid.team_name}
                            </p>
                            <span className="text-xs text-emerald-400">({highestBid.bid_type})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center text-center">
                <Gavel className="h-12 w-12 text-slate-600 mb-2" />
                <h3 className="text-lg font-bold text-slate-300">No Player on the Block</h3>
                <p className="text-xs text-slate-500 mt-1">Select a player from the roster or jump to a Player Number.</p>
              </div>
            )}

            {/* Countdown Expiry Warning Banner */}
            {timerSeconds === 0 && player && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border border-rose-500/60 p-2 text-xs font-bold text-rose-200 animate-pulse">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>GOING ONCE... GOING TWICE... TIMER EXPIRED — READY FOR HAMMER!</span>
              </div>
            )}

            {/* Auction Action Pane (Hammer Controls) with Action Zone Width */}
            <div
              className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"
              style={{
                maxWidth: pageDesign?.zones?.action_zone_width
                  ? `${pageDesign.zones.action_zone_width}px`
                  : undefined,
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                {actionButtons
                  .filter((btn) => btn.visible !== false)
                  .map((btn) => {
                    switch (btn.id) {
                      case 'sold':
                        return (
                          <Button
                            key={btn.id}
                            onClick={handleHammerSold}
                            disabled={actionLoading || !player || !highestBid}
                            className="bg-emerald-600 font-extrabold text-white hover:bg-emerald-500 text-xs px-4 py-2"
                          >
                            <Gavel className="h-4 w-4 mr-2" /> {btn.label}
                          </Button>
                        )
                      case 'unsold':
                        return (
                          <Button
                            key={btn.id}
                            onClick={handleHammerUnsold}
                            disabled={actionLoading || !player}
                            className="bg-rose-600 font-extrabold text-white hover:bg-rose-500 text-xs px-4 py-2"
                          >
                            <XCircle className="h-4 w-4 mr-2" /> {btn.label}
                          </Button>
                        )
                      case 'custom_bid':
                        return (
                          <Button
                            key={btn.id}
                            onClick={openCustomBidModal}
                            disabled={actionLoading || !player}
                            className="bg-amber-500 font-black text-zinc-950 hover:bg-amber-400 text-xs px-4 py-2"
                          >
                            <Flame className="h-4 w-4 mr-2 text-zinc-950" /> {btn.label}
                          </Button>
                        )
                      case 'undo_sale':
                        return (
                          <Button
                            key={btn.id}
                            onClick={handleUndoSale}
                            disabled={actionLoading}
                            variant="ghost"
                            className="text-xs text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-lg font-semibold"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> {btn.label}
                          </Button>
                        )
                      case 'undo_bid':
                        return (
                          <Button
                            key={btn.id}
                            onClick={undoBid}
                            disabled={actionLoading || !highestBid}
                            variant="ghost"
                            className="text-xs text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-lg font-semibold"
                          >
                            {btn.label}
                          </Button>
                        )
                      case 'reset_bid':
                        return (
                          <Button
                            key={btn.id}
                            onClick={resetBid}
                            disabled={actionLoading || !highestBid}
                            variant="ghost"
                            className="text-xs text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-lg font-semibold"
                          >
                            {btn.label}
                          </Button>
                        )
                      default:
                        return null
                    }
                  })}
              </div>
            </div>
          </div>

          {/* Franchise Quick Bid Grid with Dynamic Team Columns */}
          <div
            className="rounded-2xl border border-slate-800 p-5 shadow-xl"
            style={{ backgroundColor: '#020617', backgroundImage: 'none', boxShadow: 'none' }}
          >
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                Franchise Bidding Stations ({pageDesign?.zones?.team_columns || 4} Columns)
              </h3>
              <span className="text-xs text-slate-300 font-medium">Click station to place next slab bid</span>
            </div>

            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.max(
                  2,
                  Math.min(14, pageDesign?.zones?.team_columns || 4)
                )}, minmax(0, 1fr))`,
              }}
            >
              {state?.teams?.map((team) => {
                const isLeading = highestBid?.team_id === team.team_id
                const isExceeded = currentBid > team.max_bid

                return (
                  <button
                    key={team.team_id}
                    onClick={() => handleQuickBid(team.team_id)}
                    disabled={actionLoading || !player || isLeading || isExceeded}
                    className={`relative flex flex-col rounded-xl border p-3 text-left transition-all ${
                      isLeading
                        ? 'border-amber-500 bg-amber-500/20 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500'
                        : isExceeded
                        ? 'border-red-900/30 bg-red-950/10 opacity-50 cursor-not-allowed'
                        : 'border-white/15 bg-white/10 hover:border-amber-500/60 hover:bg-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm truncate">{team.short_name}</span>
                      {isLeading && (
                        <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-300 truncate mt-0.5">{team.team_name}</span>

                    <div className="mt-3 border-t border-white/10 pt-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400">Purse:</span>
                        <p className="font-mono text-emerald-400 font-bold">₹{team.balance.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400">Max Bid:</span>
                        <p className="font-mono text-amber-300 font-bold">₹{team.max_bid.toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Feed & Lot History with Bid History Width */}
        <div
          className="lg:col-span-4 space-y-4"
          style={{
            maxWidth: pageDesign?.zones?.bid_history_width
              ? `${Math.max(260, pageDesign.zones.bid_history_width)}px`
              : undefined,
          }}
        >
          {/* Bid History Feed */}
          <div
            className="rounded-2xl border border-slate-800 p-5"
            style={{ backgroundColor: '#020617', backgroundImage: 'none', boxShadow: 'none' }}
          >
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
              <Clock className="h-4 w-4 text-blue-400" />
              Live Bid Stream
            </h3>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {state?.bid_history && state.bid_history.length > 0 ? (
                state.bid_history.map((bid, idx) => (
                  <div
                    key={bid.id || idx}
                    className={`flex items-center justify-between rounded-lg p-2.5 text-xs transition-all ${
                      idx === 0
                        ? 'border border-amber-500/40 bg-amber-500/10 text-white font-semibold'
                        : 'bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">#{state.bid_history.length - idx}</span>
                      <span className="font-bold text-white">{bid.short_name}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400">₹{bid.amount.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/40 py-8 px-4 text-center">
                  <p className="text-xs text-slate-300 font-medium">No bids placed for this player yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Tap a franchise station or enter custom bid to begin.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Re-auction Trigger */}
          <div
            className="rounded-2xl border border-slate-800 p-5"
            style={{ backgroundColor: '#020617', backgroundImage: 'none', boxShadow: 'none' }}
          >
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Re-Auction Pool
            </h3>
            <p className="text-xs text-slate-300 font-medium mb-4">
              Bring back unsold players to the bidding pool for a secondary round.
            </p>
            <Button
              onClick={() => startReauction()}
              disabled={actionLoading}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-950/40 rounded-xl"
            >
              Start Re-Auction Round
            </Button>
          </div>
        </div>
      </div>

      {/* 2-Step Custom Bid Modal */}
      <AnimatePresence>
        {isCustomBidModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2">Two-Step Custom Bid</h3>
              <p className="text-xs text-slate-400 mb-4">
                Step {customBidStep} of 2: {customBidStep === 1 ? 'Enter Valid Amount' : 'Select Bidding Team'}
              </p>

              {customBidStep === 1 ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor={customBidInputId} className="text-xs text-slate-300 mb-1 block">Custom Amount (₹)</label>
                    <Input
                      id={customBidInputId}
                      type="number"
                      value={customBidAmount}
                      onChange={(e) => setCustomBidAmount(parseFloat(e.target.value) || 0)}
                      className="border-white/20 bg-white/5 font-mono text-lg text-amber-400"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setIsCustomBidModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setCustomBidStep(2)}
                      disabled={customBidAmount <= currentBid}
                      className="bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                    >
                      Next: Choose Team <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-300 mb-1 block">Select Franchise</label>
                    <select
                      value={customBidTeamId}
                      onChange={(e) => setCustomBidTeamId(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-slate-800 p-2 text-sm text-white"
                    >
                      {state?.teams?.map((t) => (
                        <option key={t.team_id} value={t.team_id}>
                          {t.team_name} (Max: ₹{t.max_bid.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <Button variant="ghost" onClick={() => setCustomBidStep(1)}>
                      Back
                    </Button>
                    <Button
                      onClick={submitCustomBid}
                      disabled={actionLoading}
                      className="bg-emerald-600 text-white font-bold hover:bg-emerald-500"
                    >
                      Confirm Bid of ₹{customBidAmount.toLocaleString()}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN ARENA OVERLAY (Matching Image 2) */}
      {isFullScreen && (() => {
        const leadingTeam = state?.teams?.find((t) => t.team_id === highestBid?.team_id)

        return (
          <div className="fixed inset-0 z-[100] bg-[#020b18] text-white flex flex-col h-screen w-screen overflow-hidden select-none">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-blue-900/40 bg-[#031124] shrink-0">
              {/* Left: Exit Button */}
              <button
                onClick={exitFullScreen}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs border border-white/15 transition shadow-2xs cursor-pointer"
              >
                ← Exit
              </button>

              {/* Center: Tournament Name & Pulsing Live Indicator */}
              <div className="text-center">
                <h1 className="text-lg md:text-2xl font-black text-white tracking-wide uppercase">
                  {auctionName || 'Test Tournament'}
                </h1>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-400 tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE AUCTION
                </span>
              </div>

              {/* Right: Category Selector & Fullscreen Toggle */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    CATEGORY
                  </span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="bg-white text-zinc-900 font-extrabold text-xs rounded-lg px-3 py-1.5 border border-slate-300 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {categories.length > 0 ? (
                      categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))
                    ) : (
                      <option value="ALL">All Categories</option>
                    )}
                  </select>
                </div>

                <button
                  onClick={toggleBrowserFullscreen}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Screen</span>
                </button>
              </div>
            </div>

            {/* Sub-header ticker bar */}
            <div className="flex items-center justify-between px-6 py-2 bg-[#020813] border-b border-blue-900/30 text-xs shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-amber-400 font-black tracking-wider uppercase text-[11px]">
                  NOW AUCTIONING: {selectedCategory || player?.category || 'GENERAL POOL'}
                </span>
                {player && (
                  <span className="text-slate-400 text-[11px] font-mono">
                    • PLAYER #{player.serial_no}
                  </span>
                )}
              </div>

              {/* Timer and Audio controls */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-mono font-bold ${
                    timerSeconds <= 5
                      ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{timerSeconds}s</span>
                  <button
                    onClick={() => setTimerActive(!timerActive)}
                    className="hover:text-white p-0.5"
                  >
                    {timerActive ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                  </button>
                  <button
                    onClick={() => setTimerSeconds(30)}
                    className="hover:text-white p-0.5 ml-0.5"
                    title="Reset 30s"
                  >
                    <RotateCcw className="w-2 h-2" />
                  </button>
                </div>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 rounded-md text-slate-400 hover:text-white"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Center Arena Body */}
            <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
              {/* Left Stage: Dynamically Configured Live Broadcast Arena Stage */}
              <div className="flex-1 flex flex-col justify-center rounded-2xl border border-blue-900/40 bg-gradient-to-b from-[#07162b] via-[#051122] to-[#030c18] p-4 shadow-2xl relative overflow-hidden">
                {/* Background Image / Preset if configured */}
                {pageDesign?.custom_background_url ? (
                  <img
                    src={pageDesign.custom_background_url}
                    alt="Stage Background"
                    className="absolute inset-0 h-full w-full object-cover pointer-events-none opacity-40"
                  />
                ) : pageDesign?.background_mode === 'classic_turf' ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-950 pointer-events-none opacity-60" />
                ) : pageDesign?.background_mode === 'dark_neon' ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950 pointer-events-none opacity-60" />
                ) : null}

                {player ? (
                  /* 16:9 Canvas Stage Layout matching Page Designer element positions */
                  <div className="relative aspect-video w-full select-none overflow-hidden mx-auto my-auto">
                    {Object.entries((pageDesign?.elements || DEFAULT_PAGE_DESIGN.elements) as Record<string, any>).map(([key, el]) => {
                      if (!el || el.selected === false) return null

                      return (
                        <div
                          key={key}
                          style={{
                            left: `${el.x}%`,
                            top: `${el.y}%`,
                            width: `${el.w}%`,
                            height: `${el.h}%`,
                            color: el.colour || '#FFFFFF',
                          }}
                          className="absolute flex items-center justify-center overflow-hidden"
                        >
                          <div className="w-full h-full flex items-center overflow-hidden px-1">
                            {key === 'tournament_title' && (
                              <div className="w-full h-full flex items-center justify-center gap-2 overflow-hidden px-1">
                                {pageDesign?.zones?.branding?.title_image_url ? (
                                  <img
                                    src={pageDesign.zones.branding.title_image_url}
                                    alt="Logo"
                                    style={{ height: `${Math.max(16, Math.min(el.font_size || 26, 60))}px` }}
                                    className="object-contain"
                                  />
                                ) : (
                                  <Shield
                                    style={{
                                      width: `${Math.max(16, Math.min(el.font_size || 26, 48))}px`,
                                      height: `${Math.max(16, Math.min(el.font_size || 26, 48))}px`,
                                    }}
                                    className="text-amber-400 shrink-0"
                                  />
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 26}px`,
                                    color: el.colour || '#FFD54A',
                                  }}
                                  className="font-black uppercase tracking-wider font-mono drop-shadow-md truncate"
                                >
                                  {pageDesign?.zones?.branding?.title_text || auctionName || 'TURF PREMIER LEAGUE'}
                                </span>
                              </div>
                            )}

                            {key === 'player_category' && (
                              <div className="w-full" style={{ textAlign: el.align || 'center' }}>
                                {el.show_label && (
                                  <span
                                    style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 22) * 0.5))}px` }}
                                    className="text-slate-400 block font-bold uppercase tracking-wider"
                                  >
                                    CATEGORY
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 22}px`,
                                    color: el.colour || '#FFD54A',
                                  }}
                                  className="font-black uppercase tracking-wider font-mono px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 inline-block"
                                >
                                  {player.category || selectedCategory || 'GENERAL'}
                                </span>
                              </div>
                            )}

                            {key === 'player_number' && (
                              <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                                {el.show_label && (
                                  <span
                                    style={{ fontSize: `${Math.max(8, Math.round((el.font_size || 16) * 0.7))}px` }}
                                    className="text-slate-400 mr-1 font-bold"
                                  >
                                    NO.{' '}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 16}px`,
                                    color: el.colour || '#B8C7DA',
                                  }}
                                  className="font-mono font-bold"
                                >
                                  #{player.serial_no || '1'}
                                </span>
                              </div>
                            )}

                            {key === 'player_photo' && (
                              <div className="relative w-full h-full rounded-2xl border-2 border-slate-700 bg-slate-900/90 shadow-2xl flex items-center justify-center overflow-hidden">
                                {player.photo_url ? (
                                  <img
                                    src={player.photo_url}
                                    alt={player.player_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-slate-500">
                                    <Trophy className="h-12 w-12 text-slate-600 mb-1" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      PLAYER PHOTO
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {key === 'player_name' && (
                              <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 42}px`,
                                    color: el.colour || '#FFFFFF',
                                  }}
                                  className="font-black uppercase tracking-tight drop-shadow-md truncate block leading-tight"
                                >
                                  {player.player_name}
                                </span>
                              </div>
                            )}

                            {key === 'role' && (
                              <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                                {el.show_label && (
                                  <span
                                    style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 18) * 0.6))}px` }}
                                    className="text-slate-400 block font-bold"
                                  >
                                    ROLE
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 18}px`,
                                    color: el.colour || '#D8E2EF',
                                  }}
                                  className="font-bold uppercase tracking-wider block"
                                >
                                  {player.role || 'Batsman'}
                                </span>
                              </div>
                            )}

                            {key === 'batting_style' && (
                              <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                                {el.show_label && (
                                  <span
                                    style={{ fontSize: `${Math.max(8, Math.round((el.font_size || 14) * 0.7))}px` }}
                                    className="text-slate-400 mr-1 font-bold"
                                  >
                                    BAT ·{' '}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 14}px`,
                                    color: el.colour || '#FFFFFF',
                                  }}
                                  className="font-semibold"
                                >
                                  {player.batting_style || '—'}
                                </span>
                              </div>
                            )}

                            {key === 'bowling_style' && (
                              <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                                {el.show_label && (
                                  <span
                                    style={{ fontSize: `${Math.max(8, Math.round((el.font_size || 14) * 0.7))}px` }}
                                    className="text-slate-400 mr-1 font-bold"
                                  >
                                    BOWL ·{' '}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 14}px`,
                                    color: el.colour || '#FFFFFF',
                                  }}
                                  className="font-semibold"
                                >
                                  {player.bowling_style || '—'}
                                </span>
                              </div>
                            )}

                            {key === 'location' && (
                              <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                                {el.show_label && (
                                  <span
                                    style={{ fontSize: `${Math.max(8, Math.round((el.font_size || 14) * 0.7))}px` }}
                                    className="text-slate-400 mr-1 font-bold"
                                  >
                                    LOCATION ·{' '}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 14}px`,
                                    color: el.colour || '#FFFFFF',
                                  }}
                                  className="font-semibold"
                                >
                                  {player.location || 'Mumbai, Maharashtra'}
                                </span>
                              </div>
                            )}

                            {key === 'current_bid' && (
                              <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                                {el.show_label && (
                                  <span
                                    style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 46) * 0.28))}px` }}
                                    className="uppercase font-bold text-amber-400/90 block"
                                  >
                                    CURRENT BID
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 46}px`,
                                    color: el.colour || '#FFD54A',
                                  }}
                                  className="font-black font-mono tracking-tight drop-shadow-lg"
                                >
                                  ₹{currentBid.toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}

                            {key === 'bidder_name' && (
                              <div className="w-full" style={{ textAlign: el.align || 'right' }}>
                                {el.show_label && (
                                  <span
                                    style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 22) * 0.45))}px` }}
                                    className="text-slate-400 block font-bold"
                                  >
                                    FRANCHISE
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 22}px`,
                                    color: el.colour || '#FFFFFF',
                                  }}
                                  className="font-black uppercase tracking-wide truncate block"
                                >
                                  {highestBid ? highestBid.team_name : 'Awaiting first bid'}
                                </span>
                              </div>
                            )}

                            {key === 'base_price' && (
                              <div className="w-full" style={{ textAlign: el.align || 'left' }}>
                                {el.show_label && (
                                  <span
                                    style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 20) * 0.55))}px` }}
                                    className="text-slate-400 mr-1.5 uppercase font-bold"
                                  >
                                    BASE PRICE
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 20}px`,
                                    color: el.colour || '#FFFFFF',
                                  }}
                                  className="font-extrabold font-mono"
                                >
                                  ₹{Number(player.base_price || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}

                            {key === 'balance' && (
                              <div className="w-full" style={{ textAlign: el.align || 'right' }}>
                                {el.show_label && (
                                  <span
                                    style={{ fontSize: `${Math.max(8, Math.round((el.font_size || 14) * 0.7))}px` }}
                                    className="text-slate-400 mr-1 font-bold"
                                  >
                                    Bal.{' '}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 14}px`,
                                    color: el.colour || '#B9C7D7',
                                  }}
                                  className="font-mono font-bold"
                                >
                                  {leadingTeam ? `₹${Number(leadingTeam.balance || 0).toLocaleString('en-IN')}` : '—'}
                                </span>
                              </div>
                            )}

                            {key === 'max_bid' && (
                              <div className="w-full" style={{ textAlign: el.align || 'right' }}>
                                {el.show_label && (
                                  <span
                                    style={{ fontSize: `${Math.max(8, Math.round((el.font_size || 14) * 0.7))}px` }}
                                    className="text-amber-300 mr-1 font-bold"
                                  >
                                    Max Bid{' '}
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 14}px`,
                                    color: el.colour || '#FFD54A',
                                  }}
                                  className="font-mono font-bold"
                                >
                                  {leadingTeam ? `₹${Number(leadingTeam.max_bid || 0).toLocaleString('en-IN')}` : '—'}
                                </span>
                              </div>
                            )}

                            {/* Top Arena Status Bar Element (Live Synchronized) */}
                            {key === 'top_bar' && (
                              <div className="w-full h-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-blue-900/60 bg-[#031124]/90 backdrop-blur-xs select-none shadow-md overflow-hidden">
                                <div className="flex items-center gap-2 truncate">
                                  <span
                                    style={{
                                      fontSize: `${el.font_size || 13}px`,
                                      color: el.colour || '#FFD54A',
                                    }}
                                    className="font-black uppercase tracking-wider truncate"
                                  >
                                    CATEGORY: {player.category || selectedCategory || 'GENERAL'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-mono font-bold ${
                                      timerSeconds <= 5
                                        ? 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
                                        : 'bg-slate-900 border-slate-700 text-slate-200'
                                    }`}
                                  >
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    <span>{timerSeconds}s</span>
                                    <button
                                      onClick={() => setTimerActive(!timerActive)}
                                      className="hover:text-white p-0.5 cursor-pointer"
                                    >
                                      {timerActive ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                                    </button>
                                    <button
                                      onClick={() => setTimerSeconds(30)}
                                      className="hover:text-white p-0.5 ml-0.5 cursor-pointer"
                                      title="Reset 30s"
                                    >
                                      <RotateCcw className="w-2 h-2" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={toggleBrowserFullscreen}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition cursor-pointer"
                                  >
                                    <Maximize2 className="w-3 h-3 text-sky-400" />
                                    <span>Full Screen</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Bid History Stream Panel Element (Live Real-Time Stream) */}
                            {key === 'bid_history' && (
                              <div
                                className={`w-full h-full flex flex-col justify-between rounded-2xl p-3 shadow-2xl select-none overflow-hidden ${
                                  el.panel_theme === 'glass'
                                    ? 'bg-slate-900/60 backdrop-blur-md border border-white/20'
                                    : el.panel_theme === 'solid'
                                    ? 'bg-black/95 border border-amber-500/30'
                                    : 'bg-[#030f1e]/95 border border-blue-900/60 backdrop-blur-xs'
                                }`}
                                style={{ borderRadius: `${el.border_radius ?? 16}px` }}
                              >
                                <div className="space-y-2 overflow-hidden flex-1 flex flex-col">
                                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 shrink-0">
                                    <span
                                      style={{
                                        fontSize: `${el.font_size || 12}px`,
                                        color: el.colour || '#E2E8F0',
                                      }}
                                      className="font-black uppercase tracking-wider"
                                    >
                                      {el.title || el.label || 'BID HISTORY'}
                                    </span>
                                    <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE
                                    </span>
                                  </div>
                                  <span className="font-extrabold text-white text-xs block truncate shrink-0">
                                    {player?.player_name || 'Waiting for player...'}
                                  </span>
                                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                                    {state?.bid_history && state.bid_history.length > 0 ? (
                                      state.bid_history.slice(0, el.max_bids || 20).map((bid, idx) => (
                                        <div
                                          key={bid.id || idx}
                                          className={`flex items-center justify-between rounded-xl p-2 text-xs transition-all ${
                                            idx === 0
                                              ? 'border border-amber-500/50 bg-amber-500/15 text-white font-bold shadow-xs'
                                              : 'bg-white/5 text-slate-300'
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 truncate max-w-[110px]">
                                            <span className="font-mono text-[10px] text-slate-400 font-bold">
                                              #{state.bid_history.length - idx}
                                            </span>
                                            <span className="font-bold text-white truncate">{bid.short_name || bid.team_name}</span>
                                          </div>
                                          <span className="font-mono font-black text-amber-400 shrink-0 ml-1">
                                            ₹{Number(bid.amount || 0).toLocaleString('en-IN')}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="h-full flex items-center justify-center text-center p-2">
                                        <span className="text-[11px] text-slate-500">No bids yet</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="pt-1.5 border-t border-white/10 text-[9px] text-slate-400 text-center tracking-wider uppercase font-semibold shrink-0">
                                  Arena Live History
                                </div>
                              </div>
                            )}

                            {/* Bottom Action & Player Bar Element (Live Functional Controls) */}
                            {key === 'action_bar' && (
                              <div className="w-full h-full flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#031326]/90 border border-blue-900/60 backdrop-blur-xs select-none overflow-hidden shadow-lg">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                                    Action:
                                  </span>
                                  {(pageDesign?.zones?.action_buttons || actionButtons)
                                    .filter((btn) => btn.visible !== false)
                                    .map((btn) => {
                                      switch (btn.id) {
                                        case 'sold':
                                          return (
                                            <button
                                              key={btn.id}
                                              onClick={handleHammerSold}
                                              disabled={actionLoading || !player || !highestBid}
                                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-extrabold text-white text-[11px] shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                                            >
                                              <Gavel className="w-3 h-3" />
                                              <span>{btn.label}</span>
                                            </button>
                                          )
                                        case 'unsold':
                                          return (
                                            <button
                                              key={btn.id}
                                              onClick={handleHammerUnsold}
                                              disabled={actionLoading || !player}
                                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 font-extrabold text-white text-[11px] shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                                            >
                                              <XCircle className="w-3 h-3" />
                                              <span>{btn.label}</span>
                                            </button>
                                          )
                                        case 'custom_bid':
                                          return (
                                            <button
                                              key={btn.id}
                                              onClick={openCustomBidModal}
                                              disabled={actionLoading || !player}
                                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 font-black text-zinc-950 text-[11px] shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                                            >
                                              <Flame className="w-3 h-3 text-zinc-950" />
                                              <span>{btn.label}</span>
                                            </button>
                                          )
                                        case 'undo_sale':
                                          return (
                                            <button
                                              key={btn.id}
                                              onClick={handleUndoSale}
                                              disabled={actionLoading}
                                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 text-[10px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                                            >
                                              <RotateCcw className="w-2.5 h-2.5" />
                                              <span>{btn.label}</span>
                                            </button>
                                          )
                                        case 'undo_bid':
                                          return (
                                            <button
                                              key={btn.id}
                                              onClick={undoBid}
                                              disabled={actionLoading || !highestBid}
                                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 text-[10px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            >
                                              <span>{btn.label}</span>
                                            </button>
                                          )
                                        case 'reset_bid':
                                          return (
                                            <button
                                              key={btn.id}
                                              onClick={resetBid}
                                              disabled={actionLoading || !highestBid}
                                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 text-[10px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            >
                                              <span>{btn.label}</span>
                                            </button>
                                          )
                                        default:
                                          return null
                                      }
                                    })}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-mono text-[11px]">PLAYER NO:</span>
                                  <input
                                    type="number"
                                    value={jumpPlayerNo}
                                    onChange={(e) => setJumpPlayerNo(e.target.value)}
                                    placeholder="1"
                                    className="w-12 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs text-center"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleJumpPlayer()
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={handleJumpPlayer}
                                    className="px-2.5 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 font-black text-zinc-950 text-xs shadow-xs cursor-pointer transition"
                                  >
                                    SHOW
                                  </button>
                                </div>
                              </div>
                            )}
                            {/* Custom Photo Box Element */}
                            {(el.type === 'photo' || key.startsWith('custom_photo')) && (
                              <div
                                className="w-full h-full relative rounded-xl overflow-hidden shadow-md flex items-center justify-center select-none"
                                style={{ borderRadius: `${el.border_radius ?? 12}px` }}
                              >
                                {el.media_url ? (
                                  <img
                                    src={el.media_url}
                                    alt={el.label || 'Custom Photo'}
                                    style={{ objectFit: el.object_fit || 'cover' }}
                                    className="w-full h-full"
                                  />
                                ) : null}
                              </div>
                            )}

                            {/* Custom Video Box Element */}
                            {(el.type === 'video' || key.startsWith('custom_video')) && (
                              <div
                                className="w-full h-full relative rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-black select-none"
                                style={{ borderRadius: `${el.border_radius ?? 12}px` }}
                              >
                                {el.video_url || el.media_url ? (
                                  <video
                                    src={el.video_url || el.media_url}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    style={{ objectFit: el.object_fit || 'cover' }}
                                    className="w-full h-full"
                                  />
                                ) : null}
                              </div>
                            )}

                            {/* Custom Text Box Element */}
                            {(el.type === 'text' || key.startsWith('custom_text')) && (
                              <div
                                className="w-full h-full flex items-center overflow-hidden px-2 rounded-lg select-none"
                                style={{
                                  textAlign: el.align || 'center',
                                  justifyContent:
                                    el.align === 'left'
                                      ? 'flex-start'
                                      : el.align === 'right'
                                      ? 'flex-end'
                                      : 'center',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: `${el.font_size || 18}px`,
                                    color: el.colour || '#FFFFFF',
                                    fontWeight: el.bold !== false ? 'bold' : 'normal',
                                  }}
                                  className="uppercase tracking-wider block drop-shadow truncate"
                                >
                                  {el.custom_text || el.label || ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <Gavel className="h-16 w-16 text-slate-600 mb-3" />
                    <h2 className="text-2xl font-black text-white">No Player on the Block</h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Enter a Player Number below and tap SHOW, or select a player to bring them to the bidding floor.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Bid History Stream (Only show if not already placed inside stage canvas) */}
              {pageDesign?.elements?.bid_history?.selected !== true && (
                <div className="w-80 flex flex-col rounded-2xl border border-blue-900/40 bg-[#030f1e] p-4 shrink-0 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    BID HISTORY
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE
                  </span>
                </div>

                {/* Active Player Name header */}
                <div className="mb-2">
                  <span className="font-extrabold text-white text-xs truncate block">
                    {player?.player_name || 'Waiting for player...'}
                  </span>
                </div>

                {/* Feed Items */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {state?.bid_history && state.bid_history.length > 0 ? (
                    state.bid_history.map((bid, idx) => (
                      <div
                        key={bid.id || idx}
                        className={`flex items-center justify-between rounded-xl p-2.5 text-xs transition-all ${
                          idx === 0
                            ? 'border border-amber-500/50 bg-amber-500/15 text-white font-bold shadow-xs'
                            : 'bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400 font-bold">
                            #{state.bid_history.length - idx}
                          </span>
                          <span className="font-bold text-white">{bid.short_name || bid.team_name}</span>
                        </div>
                        <span className="font-mono font-black text-amber-400">
                          ₹{Number(bid.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <p className="text-xs text-slate-400 font-semibold">No bids yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

            {/* Bottom Stadium Bar: Franchise Stations & Action Buttons */}
            <div className="border-t border-blue-900/40 bg-[#030d1a] p-3 space-y-2 shrink-0">
              {/* Franchise Bidding Stations Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 px-1">
                  CLICK A TEAM TO PLACE THE NEXT BID:
                </span>
                {state?.teams?.map((team) => {
                  const isLeading = highestBid?.team_id === team.team_id
                  const isExceeded = currentBid > team.max_bid

                  return (
                    <button
                      key={team.team_id}
                      onClick={() => handleQuickBid(team.team_id)}
                      disabled={actionLoading || !player || isLeading || isExceeded}
                      className={`shrink-0 flex items-center gap-2.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition shadow-2xs ${
                        isLeading
                          ? 'border-amber-400 bg-amber-500 text-zinc-950 font-black ring-2 ring-amber-400/50 shadow-md'
                          : isExceeded
                          ? 'border-slate-800 bg-slate-900/50 text-slate-600 opacity-50 cursor-not-allowed'
                          : 'border-blue-500/40 bg-blue-600 hover:bg-blue-500 text-white hover:border-blue-400'
                      }`}
                    >
                      <span className="font-mono text-[11px] opacity-80">{team.short_name}</span>
                      <span className="truncate max-w-[100px]">{team.team_name}</span>
                      <span className="font-mono text-[11px] bg-black/20 px-1.5 py-0.5 rounded">
                        ₹{Number(team.balance || 0).toLocaleString('en-IN')}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Actions Row (SOLD, UNSOLD, CUSTOM BID, PLAYER NO. + SHOW) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
                <div className="flex items-center gap-2 flex-wrap">
                  {actionButtons
                    .filter((btn) => btn.visible !== false)
                    .map((btn) => {
                      switch (btn.id) {
                        case 'sold':
                          return (
                            <button
                              key={btn.id}
                              onClick={handleHammerSold}
                              disabled={actionLoading || !player || !highestBid}
                              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span>{btn.label}</span>
                              <span>✓</span>
                            </button>
                          )
                        case 'unsold':
                          return (
                            <button
                              key={btn.id}
                              onClick={handleHammerUnsold}
                              disabled={actionLoading || !player}
                              className="bg-rose-500 hover:bg-rose-400 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span>{btn.label}</span>
                            </button>
                          )
                        case 'custom_bid':
                          return (
                            <button
                              key={btn.id}
                              onClick={openCustomBidModal}
                              disabled={actionLoading || !player}
                              className="bg-slate-200 hover:bg-white text-zinc-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {btn.label}
                            </button>
                          )
                        case 'undo_sale':
                          return (
                            <button
                              key={btn.id}
                              onClick={handleUndoSale}
                              disabled={actionLoading}
                              className="bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-white/10 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {btn.label}
                            </button>
                          )
                        case 'undo_bid':
                          return (
                            <button
                              key={btn.id}
                              onClick={undoBid}
                              disabled={actionLoading || !highestBid}
                              className="bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-white/10 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {btn.label}
                            </button>
                          )
                        case 'reset_bid':
                          return (
                            <button
                              key={btn.id}
                              onClick={resetBid}
                              disabled={actionLoading || !highestBid}
                              className="bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-white/10 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {btn.label}
                            </button>
                          )
                        default:
                          return null
                      }
                    })}
                </div>

                {/* Right Side: Player Jump Input + SHOW Button */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">PLAYER NO.</span>
                  <input
                    type="number"
                    placeholder="e.g. 14"
                    value={jumpPlayerNo}
                    onChange={(e) => setJumpPlayerNo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleJumpPlayer()
                    }}
                    className="w-24 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    onClick={handleJumpPlayer}
                    disabled={actionLoading || !jumpPlayerNo}
                    className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    SHOW
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
