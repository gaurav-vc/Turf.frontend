import { useState, useId, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  Gavel, RotateCcw, Search, Shield, Trophy, Flame,
  Clock, CheckCircle, XCircle, ChevronRight, AlertCircle, RefreshCw, Sparkles,
  Volume2, VolumeX, Play, Pause, Maximize2, Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient, resolveMediaUrl } from '@/api/apiClient'
import { useLiveAuctionState } from '../hooks/useLiveAuctionState'
import { type ActionButtonConfig, DEFAULT_ACTION_BUTTONS, DEFAULT_PAGE_DESIGN } from './AuctionPageDesigner'
import { getTeamTheme, getTeamShortcut } from './teamThemeUtils'

interface LiveBroadcastConsoleProps {
  auctionId: string
  auctionName?: string
  auctionBackground?: string
}

export default function LiveBroadcastConsole({ auctionId, auctionName, auctionBackground }: LiveBroadcastConsoleProps) {
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
    selectNextPlayer,
    startReauction,
  } = useLiveAuctionState(auctionId, 1200)

  const [pageDesign, setPageDesign] = useState<any>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
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
  const [categoriesData, setCategoriesData] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [allowMultipleBids, setAllowMultipleBids] = useState(false)
  const [autoAdvanceQueue, setAutoAdvanceQueue] = useState(true)
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null)
  const [upcomingQueue, setUpcomingQueue] = useState<any[]>([])
  const [showQueueDrawer, setShowQueueDrawer] = useState(false)
  const [teamKeyBuffer, setTeamKeyBuffer] = useState('')
  const keyBufferTimerRef = useRef<any>(null)
  const customBidInputId = useId()

  const customMessages = {
    msg_post_sold: state?.config?.custom_messages?.msg_post_sold || 'Getting Next player ready...',
    msg_unsold_pool: state?.config?.custom_messages?.msg_unsold_pool || 'Unsold players available for re-auction round',
    msg_category_complete: state?.config?.custom_messages?.msg_category_complete || 'All players in this category are sold, move on to next category',
    msg_team_cat_quota: state?.config?.custom_messages?.msg_team_cat_quota || 'Team has completed required players for this category',
    msg_team_all_complete: state?.config?.custom_messages?.msg_team_all_complete || 'Team has completed all required squad quotas across all categories',
    msg_all_teams_complete: state?.config?.custom_messages?.msg_all_teams_complete || 'Auction Completed - All teams have completed their squad targets',
  }

  const handleUpdateColumns = async (cols: number) => {
    const updated = {
      ...(pageDesign || DEFAULT_PAGE_DESIGN),
      zones: {
        ...(pageDesign?.zones || DEFAULT_PAGE_DESIGN.zones),
        team_columns: cols,
      },
    }
    setPageDesign(updated)
    try {
      await apiClient.post(`/v1/auction/console/${auctionId}/page_design/`, {
        design_json: updated,
      })
    } catch (e) {
      console.warn('Auto-save columns failed, state maintained in session', e)
    }
  }

  const handleTeamSelectAndBid = (teamId: string) => {
    setSelectedTeamId(teamId)
    setCustomBidTeamId(teamId)
    const isLeading = highestBid?.team_id === teamId
    const teamObj = state?.teams?.find((t) => t.team_id === teamId)
    const playerCat = player?.category || selectedCategory
    const catTarget = categoriesData.find((c) => c.name?.toLowerCase() === playerCat?.toLowerCase())?.target_count || 0
    const teamBoughtInCat = teamObj?.category_counts?.[playerCat] || 0
    const isQuotaFull = (catTarget > 0 && teamBoughtInCat >= catTarget) || (teamObj?.pending === 0)
    const isBudgetExceeded = (teamObj ? currentBid >= teamObj.max_bid : false) || (teamObj ? teamObj.max_bid <= 0 : false)

    if (isQuotaFull) {
      setFeedbackMessage({
        text: `${teamObj?.short_name || teamObj?.team_name || 'Team'} has completed category quota for ${playerCat}!`,
        type: 'error',
      })
      return
    }

    if (isBudgetExceeded) {
      setFeedbackMessage({
        text: `${teamObj?.short_name || teamObj?.team_name || 'Team'} cannot bid due to purse limit constraint (Max Bid: ₹${Number(teamObj?.max_bid || 0).toLocaleString('en-IN')}).`,
        type: 'error',
      })
      return
    }

    // Allow re-bidding if allowMultipleBids is enabled or if not currently leading
    if (!actionLoading && player && (!isLeading || allowMultipleBids) && !isBudgetExceeded) {
      handleQuickBid(teamId)
    } else if (isLeading && !allowMultipleBids) {
      setFeedbackMessage({
        text: `${teamObj?.short_name || teamObj?.team_name || 'Team'} is currently leading! Toggle 'Multiple Bid: YES' to permit re-bidding.`,
        type: 'success',
      })
    }
  }

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
    if (state?.config?.allow_multiple_bids !== undefined) {
      setAllowMultipleBids(Boolean(state.config.allow_multiple_bids))
    }
  }, [state?.config?.allow_multiple_bids])

  useEffect(() => {
    apiClient
      .get(`/v1/auction/categories/?auction=${auctionId}`)
      .then((res) => {
        const items = res.data.results || res.data || []
        setCategoriesData(items)
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

  // Load queue and config
  const fetchQueue = () => {
    apiClient
      .get(`/v1/auction/console/${auctionId}/player_queue/?category=${encodeURIComponent(selectedCategory)}`)
      .then((res) => {
        if (res.data?.queue) setUpcomingQueue(res.data.queue)
        if (res.data?.auto_advance_queue !== undefined) setAutoAdvanceQueue(Boolean(res.data.auto_advance_queue))
        if (res.data?.allow_multiple_bids !== undefined) setAllowMultipleBids(Boolean(res.data.allow_multiple_bids))
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchQueue()
  }, [auctionId, state?.active_player?.id, selectedCategory])

  const handleBringNextQueuedPlayer = async () => {
    setAutoAdvanceCountdown(null)
    setFeedbackMessage(null)
    const res = await selectNextPlayer(selectedCategory)
    if (res?.success) {
      setFeedbackMessage({ text: 'Next queued player brought to auction block.', type: 'success' })
      fetchQueue()
    } else {
      setFeedbackMessage({ text: res?.error || 'No more players in queue', type: 'error' })
    }
  }

  // Auto-advance countdown timer effect
  useEffect(() => {
    let t: any = null
    if (autoAdvanceCountdown !== null && autoAdvanceCountdown > 0) {
      t = setInterval(() => {
        setAutoAdvanceCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(t)
            handleBringNextQueuedPlayer()
            return null
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (t) clearInterval(t)
    }
  }, [autoAdvanceCountdown, selectedCategory])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCustomBidModalOpen) {
          e.preventDefault()
          setIsCustomBidModalOpen(false)
          return
        }
        if (isFullScreen) {
          setIsFullScreen(false)
          return
        }
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

      // 1. Sequential Numeric Shortcut Keys: 1..9, 0 (Key 1 -> Team 1, Key 2 -> Team 2, etc.)
      const numKeyMatch = e.code?.match(/^(?:Digit|Numpad)([0-9])$/) || e.key.match(/^([0-9])$/)
      if (numKeyMatch && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const rawNum = parseInt(numKeyMatch[1], 10)
        // '1'..'9' maps to index 0..8, '0' maps to index 9 (10th team)
        const teamIndex = rawNum === 0 ? 9 : rawNum - 1
        const teams = state?.teams || []
        if (teamIndex >= 0 && teamIndex < teams.length) {
          e.preventDefault()
          const targetTeam = teams[teamIndex]
          handleTeamSelectAndBid(targetTeam.team_id)
          return
        }
      }

      // 2. Hammer Sold Action (Spacebar OR Shift+S)
      if ((e.code === 'Space' || (e.shiftKey && (e.key === 's' || e.key === 'S'))) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!actionLoading && player && highestBid) {
          e.preventDefault()
          handleHammerSold()
          return
        }
      }

      // 3. Hammer Unsold Action (Shift+U)
      if (e.shiftKey && (e.key === 'u' || e.key === 'U') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!actionLoading && player) {
          e.preventDefault()
          handleHammerUnsold()
          return
        }
      }

      // 4. Custom Bid Modal (Shift+C)
      if (e.shiftKey && (e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!actionLoading && player) {
          e.preventDefault()
          openCustomBidModal()
          return
        }
      }

      // 5. Undo Sale (Shift+Z)
      if (e.shiftKey && (e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!actionLoading) {
          e.preventDefault()
          handleUndoSale()
          return
        }
      }

      // 6. Multi-character Team Shortname Typing Buffer (Letters A-Z)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
        const char = e.key.toUpperCase()
        const newBuf = (teamKeyBuffer + char).slice(-4)
        setTeamKeyBuffer(newBuf)

        if (keyBufferTimerRef.current) clearTimeout(keyBufferTimerRef.current)
        keyBufferTimerRef.current = setTimeout(() => {
          setTeamKeyBuffer('')
        }, 800)

        const teams = state?.teams || []
        // Check exact match on buffer first (e.g. "MI", "CSK", "SRH")
        const exactMatch = teams.find((t) => {
          const sc = getTeamShortcut(t.team_name, t.short_name).toUpperCase()
          const sName = (t.short_name || '').toUpperCase()
          return sc === newBuf || sName === newBuf
        })

        if (exactMatch) {
          e.preventDefault()
          setTeamKeyBuffer('')
          handleTeamSelectAndBid(exactMatch.team_id)
          return
        }

        // If buffer is length 1, check if only one team matches this prefix
        if (newBuf.length === 1) {
          const matches = teams.filter((t) => {
            const sc = getTeamShortcut(t.team_name, t.short_name).toUpperCase()
            return sc.startsWith(char)
          })
          if (matches.length === 1) {
            e.preventDefault()
            handleTeamSelectAndBid(matches[0].team_id)
            return
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullScreen, isCustomBidModalOpen, actionLoading, state?.active_player, state?.highest_bid, state?.teams, allowMultipleBids, teamKeyBuffer])

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
    setFeedbackMessage(null)
    const res = await selectNextPlayer(cat)
    if (res?.success) {
      setFeedbackMessage({ text: `Brought in next player from category "${cat}".`, type: 'success' })
    } else {
      setFeedbackMessage({
        text: res?.error || `No available players found in category "${cat}".`,
        type: 'error',
      })
    }
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
    const res = await placeBid(teamId, undefined, false, allowMultipleBids)
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
      if (autoAdvanceQueue) {
        setAutoAdvanceCountdown(3)
      }
      fetchQueue()
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
      if (autoAdvanceQueue) {
        setAutoAdvanceCountdown(2)
      }
      fetchQueue()
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
    if (selectedTeamId) {
      setCustomBidTeamId(selectedTeamId)
    } else if (state?.teams && state.teams.length > 0) {
      setCustomBidTeamId(state.teams[0].team_id)
    }
    setIsCustomBidModalOpen(true)
  }

  const submitCustomBid = async () => {
    if (!customBidTeamId || !customBidAmount) return
    const res = await placeBid(customBidTeamId, customBidAmount, true, allowMultipleBids)
    if (res?.success) {
      setIsCustomBidModalOpen(false)
      setFeedbackMessage({ text: 'Custom bid placed successfully!', type: 'success' })
    } else {
      setFeedbackMessage({ text: res?.error || 'Invalid custom bid', type: 'error' })
    }
  }

  const rawBg =
    pageDesign?.custom_background_url ||
    auctionBackground ||
    (state as any)?.tournament?.background_image ||
    state?.config?.background_image ||
    ''

  const resolvedBgUrl =
    rawBg === 'stadium'
      ? 'https://images.unsplash.com/photo-1529900245534-47fbf822495d?w=1600&auto=format&fit=crop&q=80'
      : rawBg === 'dark_neon'
      ? 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&auto=format&fit=crop&q=80'
      : rawBg === 'classic_turf'
      ? 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1600&auto=format&fit=crop&q=80'
      : rawBg && rawBg !== 'default'
      ? resolveMediaUrl(rawBg)
      : ''

  const getBidDisplayShort = (bid: { team_id?: string; team_name?: string; short_name?: string }) => {
    const teamObj = state?.teams?.find(
      (t) => (bid.team_id && String(t.team_id) === String(bid.team_id)) || (bid.team_name && t.team_name === bid.team_name)
    )
    return teamObj
      ? getTeamShortcut(teamObj.team_name, teamObj.short_name)
      : getTeamShortcut(bid.team_name, bid.short_name)
  }

  if (loading && !state) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div
      className="space-y-6 rounded-3xl p-2 sm:p-4 transition-all"
      style={
        resolvedBgUrl
          ? {
              backgroundImage: `linear-gradient(rgba(3, 10, 24, 0.75), rgba(3, 10, 24, 0.88)), url(${resolvedBgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
            }
          : undefined
      }
    >
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Multiple Bid Toggle (Yes / No) */}
          <button
            type="button"
            onClick={async () => {
              const nextVal = !allowMultipleBids
              setAllowMultipleBids(nextVal)
              try {
                await apiClient.post(`/v1/auction/console/${auctionId}/setup_rules/`, {
                  allow_multiple_bids: nextVal,
                })
              } catch (_) {}
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-xs cursor-pointer ${
              allowMultipleBids
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-white/10 text-slate-400 border-white/15 hover:text-white'
            }`}
            title="Enable to permit a team to place consecutive bids (re-bidding / raising own bid)"
          >
            <span className="text-[10px] text-slate-400 uppercase">Multiple Bid:</span>
            <span className={`font-black font-mono ${allowMultipleBids ? 'text-emerald-400' : 'text-slate-300'}`}>
              {allowMultipleBids ? 'YES' : 'NO'}
            </span>
          </button>

          {/* Auto Advance Queue Toggle (On / Off) */}
          <button
            type="button"
            onClick={async () => {
              const nextVal = !autoAdvanceQueue
              setAutoAdvanceQueue(nextVal)
              try {
                await apiClient.post(`/v1/auction/console/${auctionId}/setup_rules/`, {
                  auto_advance_queue: nextVal,
                })
              } catch (_) {}
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-xs cursor-pointer ${
              autoAdvanceQueue
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                : 'bg-white/10 text-slate-400 border-white/15 hover:text-white'
            }`}
            title="Automatically load the next player from the queue after SOLD or UNSOLD"
          >
            <span className="text-[10px] text-slate-400 uppercase">Auto Queue:</span>
            <span className={`font-black font-mono ${autoAdvanceQueue ? 'text-indigo-400' : 'text-slate-300'}`}>
              {autoAdvanceQueue ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Up Next Queue Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowQueueDrawer(!showQueueDrawer)}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl border border-white/15 transition cursor-pointer"
            title="View upcoming players in queue"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Up Next ({upcomingQueue.length})</span>
          </button>

          {/* Category Selector */}
          <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-2.5 py-1.5 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Cat:</span>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="bg-transparent text-white font-extrabold text-xs cursor-pointer focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            onClick={() => handleBringNextQueuedPlayer()}
            disabled={actionLoading}
            className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-xs px-3 py-1.5 rounded-xl border border-emerald-500/40 transition"
            title="Bring next available player in queue"
          >
            <ChevronRight className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            Next In Queue →
          </Button>

          <Button
            onClick={() => {
              setIsFullScreen(true)
              toggleBrowserFullscreen()
            }}
            className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Full Screen</span>
          </Button>
        </div>
      </div>

      {/* Auto-Advance Countdown Banner */}
      {autoAdvanceCountdown !== null && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 font-bold text-xs shadow-xl animate-pulse border-2 border-amber-300">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-950 animate-spin" />
            <span>
              🎉 Auto-loading next player from queue in <strong>{autoAdvanceCountdown}s</strong>...
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBringNextQueuedPlayer}
              className="bg-slate-950 text-white hover:bg-slate-800 px-3 py-1 rounded-xl text-xs font-black shadow-xs cursor-pointer transition"
            >
              Bring Next Now →
            </button>
            <button
              type="button"
              onClick={() => setAutoAdvanceCountdown(null)}
              className="bg-amber-600/40 text-slate-950 hover:bg-amber-600/60 px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Cancel Auto-Advance
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Queue Drawer Strip */}
      {showQueueDrawer && (
        <div className="bg-[#040e1d] border border-amber-500/40 p-4 rounded-2xl shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">
                Upcoming Queue ({upcomingQueue.length} Players Waiting)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowQueueDrawer(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close ✕
            </button>
          </div>
          {upcomingQueue.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400 italic">
              No players currently queued in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {upcomingQueue.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-amber-400/50 transition group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      #{p.serial_no || idx + 1}
                    </span>
                    <div className="truncate">
                      <span className="font-bold text-white block truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-400">{p.role} • ₹{Number(p.base_price || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (p.serial_no) {
                        await selectPlayerNo(p.serial_no)
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-1 rounded transition shrink-0 ml-1 cursor-pointer"
                    title="Bring this player immediately"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            className="relative overflow-hidden rounded-2xl border border-slate-800 p-6 shadow-2xl backdrop-blur-md"
            style={{ backgroundColor: resolvedBgUrl ? 'rgba(3, 13, 28, 0.82)' : '#020617' }}
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

                {/* Category Selector & Next Player trigger in Standard Console */}
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Cat:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="bg-slate-900 border border-white/20 text-white font-bold text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                  >
                    {categories.length > 0 ? (
                      categories.map((c) => (
                        <option key={c} value={c} className="bg-slate-900 text-white">
                          {c}
                        </option>
                      ))
                    ) : (
                      <option value="ALL" className="bg-slate-900 text-white">All Categories</option>
                    )}
                  </select>
                  <Button
                    size="sm"
                    onClick={() => handleCategoryChange(selectedCategory)}
                    disabled={actionLoading}
                    className="h-7 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-2.5 rounded-lg shadow-xs"
                    title="Bring next player from selected category to the auction block"
                  >
                    Next Player →
                  </Button>
                </div>

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
                              {pageDesign?.elements?.bidder_name?.show_label ? 'Bidder Team Name' : 'Bidder'}
                            </span>
                            <div className="flex items-center gap-2 justify-end">
                              {highestBid.team_logo && pageDesign?.elements?.bidder_name?.show_team_logo !== false && (
                                <img
                                  src={resolveMediaUrl(highestBid.team_logo)}
                                  alt={highestBid.team_name}
                                  className="w-6 h-6 rounded-full object-contain border border-amber-400/40"
                                />
                              )}
                              <p
                                style={{
                                  color: pageDesign?.elements?.bidder_name?.colour || '#FFFFFF',
                                }}
                                className="text-lg font-bold text-white"
                              >
                                {highestBid.team_name}
                              </p>
                            </div>
                            <span className="text-xs text-emerald-400">({highestBid.bid_type})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : upcomingQueue.length > 0 ? (
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-950 shadow-2xl space-y-4 my-2">
                <div className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-bold text-xs animate-pulse">
                  <span className="flex items-center gap-2 font-black">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {customMessages.msg_post_sold} {autoAdvanceCountdown !== null ? `(${autoAdvanceCountdown}s)` : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBringNextQueuedPlayer}
                      className="px-2.5 py-1 rounded bg-amber-400 text-zinc-950 font-black text-xs hover:bg-amber-300 transition cursor-pointer"
                    >
                      Bring Now →
                    </button>
                    {autoAdvanceCountdown !== null && (
                      <button
                        onClick={() => setAutoAdvanceCountdown(null)}
                        className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    NEXT IN QUEUE • LOT #{upcomingQueue[0].serial_no || upcomingQueue[0].player_number || 1}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {upcomingQueue[0].category || 'General Pool'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  {upcomingQueue[0].photo ? (
                    <img
                      src={resolveMediaUrl(upcomingQueue[0].photo)}
                      alt={upcomingQueue[0].name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400/60 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-2xl shadow-lg">
                      🏏
                    </div>
                  )}

                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-white">{upcomingQueue[0].name}</h3>
                    <p className="text-xs text-slate-400 font-semibold">
                      Role: <strong className="text-slate-200">{upcomingQueue[0].role || 'Player'}</strong> • Base Price:{' '}
                      <strong className="text-amber-400 font-mono">
                        ₹{Number(upcomingQueue[0].base_price || 0).toLocaleString('en-IN')}
                      </strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {upcomingQueue.length} player{upcomingQueue.length > 1 ? 's' : ''} waiting in current queue
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleBringNextQueuedPlayer}
                    disabled={actionLoading}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-6 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>Bring to Auction Block</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowQueueDrawer(true)}
                    className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
                  >
                    View Queue ({upcomingQueue.length})
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-slate-900 to-slate-950 shadow-2xl text-center space-y-4 my-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white">
                    {customMessages.msg_category_complete}
                  </h3>
                  <p className="text-xs text-slate-300 font-semibold max-w-md mx-auto">
                    Category <span className="text-amber-400 uppercase font-bold">"{selectedCategory}"</span> lots have been completed.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {(() => {
                    const currentIdx = categories.indexOf(selectedCategory)
                    const nextCat = currentIdx >= 0 && currentIdx < categories.length - 1 ? categories[currentIdx + 1] : null
                    if (nextCat) {
                      return (
                        <Button
                          onClick={() => handleCategoryChange(nextCat)}
                          disabled={actionLoading}
                          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs px-6 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                        >
                          <span>Move on to {nextCat} →</span>
                        </Button>
                      )
                    }
                    return null
                  })()}
                  <Button
                    onClick={() => startReauction()}
                    disabled={actionLoading}
                    variant="outline"
                    className="border-purple-500/50 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 text-xs font-bold rounded-xl"
                  >
                    <span>{customMessages.msg_unsold_pool}</span>
                  </Button>
                </div>
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

          {/* Franchise Quick Bid Grid with Dynamic Team Columns & Real-time Dropdown */}
          <div
            className="rounded-2xl border border-slate-800 p-5 shadow-xl backdrop-blur-md"
            style={{ backgroundColor: resolvedBgUrl ? 'rgba(3, 13, 28, 0.82)' : '#020617', backgroundImage: 'none', boxShadow: 'none' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                  Franchise Bidding Stations ({pageDesign?.zones?.team_columns || 4} Columns)
                </h3>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  {state?.teams?.length || 0} Teams
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Real-time Franchise Columns Dropdown Selector */}
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-2.5 py-1 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Columns:</span>
                  <select
                    value={pageDesign?.zones?.team_columns || 4}
                    onChange={(e) => handleUpdateColumns(Number(e.target.value))}
                    className="bg-transparent text-amber-400 font-black text-xs cursor-pointer focus:outline-none"
                  >
                    <option value={2} className="bg-slate-900 text-white">2 Columns</option>
                    <option value={3} className="bg-slate-900 text-white">3 Columns</option>
                    <option value={4} className="bg-slate-900 text-white">4 Columns (Standard)</option>
                    <option value={5} className="bg-slate-900 text-white">5 Columns</option>
                    <option value={6} className="bg-slate-900 text-white">6 Columns</option>
                    <option value={7} className="bg-slate-900 text-white">7 Columns</option>
                    <option value={8} className="bg-slate-900 text-white">8 Columns</option>
                    <option value={10} className="bg-slate-900 text-white">10 Columns</option>
                    <option value={12} className="bg-slate-900 text-white">12 Columns</option>
                    <option value={14} className="bg-slate-900 text-white">14 Columns</option>
                  </select>
                </div>
                <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                  Tap shortcut/card or press Key 1-9 to bid
                </span>
              </div>
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
              {state?.teams?.map((team, idx) => {
                const isLeading = highestBid?.team_id === team.team_id
                const playerCat = player?.category || selectedCategory
                const catTarget = categoriesData.find((c) => c.name?.toLowerCase() === playerCat?.toLowerCase())?.target_count || 0
                const isQuotaFull = (catTarget > 0 && (team.category_counts?.[playerCat] || 0) >= catTarget) || team.pending === 0
                const isBudgetExceeded = currentBid >= team.max_bid || team.max_bid <= 0
                const isSelected = selectedTeamId === team.team_id
                const theme = getTeamTheme(idx, state.teams.length)
                const shortcut = getTeamShortcut(team.team_name, team.short_name)
                const isTeamDisabled = actionLoading || !player || (isLeading && !allowMultipleBids) || isBudgetExceeded || isQuotaFull

                return (
                  <button
                    key={team.team_id}
                    onClick={() => handleTeamSelectAndBid(team.team_id)}
                    disabled={isTeamDisabled}
                    style={{
                      background: isLeading
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35) 0%, rgba(30, 20, 5, 0.95) 100%)'
                        : isQuotaFull || isBudgetExceeded
                        ? 'rgba(15, 23, 42, 0.85)'
                        : 'rgba(2, 19, 46, 0.95)',
                      borderColor: isLeading
                        ? '#F59E0B'
                        : isQuotaFull
                        ? '#EF4444'
                        : isBudgetExceeded
                        ? '#F59E0B'
                        : isSelected
                        ? theme.accentHover
                        : theme.border,
                      boxShadow: isLeading
                        ? '0 0 18px rgba(245, 158, 11, 0.5)'
                        : isSelected
                        ? `0 0 14px ${theme.glow}`
                        : `0 0 8px ${theme.glow}`,
                      writingMode: 'horizontal-tb',
                    }}
                    className={`group relative flex flex-col items-center justify-between rounded-xl border-2 p-2.5 transition-all select-none min-h-[88px] ${
                      isLeading
                        ? 'ring-2 ring-amber-400'
                        : isQuotaFull
                        ? 'opacity-40 cursor-not-allowed border-rose-800'
                        : isBudgetExceeded
                        ? 'opacity-40 cursor-not-allowed grayscale border-amber-800'
                        : 'hover:scale-105 active:scale-95 hover:brightness-125 cursor-pointer'
                    }`}
                    title={`Team #${theme.sequenceNo} (Key [${theme.keyShortcut}]) • Purse: ₹${Number(team.balance || 0).toLocaleString('en-IN')}${isQuotaFull ? ' • Quota Full' : isBudgetExceeded ? ' • Purse Limit' : ''}`}
                  >
                    {/* Top Row: Sequence Badge & Key */}
                    <div className="flex items-center justify-between w-full mb-1" style={{ writingMode: 'horizontal-tb' }}>
                      <span
                        style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                        className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black shadow-xs shrink-0"
                      >
                        #{theme.sequenceNo}
                      </span>
                      {isLeading ? (
                        <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black font-black text-[8px] animate-pulse">
                          LEADING
                        </span>
                      ) : isQuotaFull ? (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 font-bold text-[8px] border border-rose-500/40">
                          QUOTA FULL
                        </span>
                      ) : isBudgetExceeded ? (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 font-bold text-[8px] border border-amber-500/40">
                          PURSE LIMIT
                        </span>
                      ) : theme.keyShortcut ? (
                        <span className="text-[9px] font-mono text-slate-300 font-bold bg-black/40 px-1 py-0.2 rounded border border-white/10 shrink-0">
                          [{theme.keyShortcut}]
                        </span>
                      ) : null}
                    </div>

                    {/* Centered Shortcut Text (Strictly Horizontal) */}
                    <span
                      style={{
                        color: isLeading ? '#FDE047' : isQuotaFull ? '#FDA4AF' : theme.pillText,
                        writingMode: 'horizontal-tb',
                        whiteSpace: 'nowrap',
                        textOrientation: 'mixed',
                      }}
                      className="text-lg font-black font-mono tracking-wider drop-shadow-md py-1"
                    >
                      {shortcut}
                    </span>

                    {/* Balance Subtitle */}
                    <span
                      className="text-[9px] font-mono text-slate-400 tracking-tight"
                      style={{ writingMode: 'horizontal-tb', whiteSpace: 'nowrap' }}
                    >
                      ₹{Number(team.balance || 0).toLocaleString('en-IN')}
                    </span>
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
            className="rounded-2xl border border-slate-800 p-5 backdrop-blur-md"
            style={{ backgroundColor: resolvedBgUrl ? 'rgba(3, 13, 28, 0.82)' : '#020617', backgroundImage: 'none', boxShadow: 'none' }}
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
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] text-slate-500">#{state.bid_history.length - idx}</span>
                      {pageDesign?.elements?.bid_history?.show_short_name !== false && (
                        <span className="font-mono font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded text-[10px] shrink-0">
                          {getBidDisplayShort(bid)}
                        </span>
                      )}
                      {pageDesign?.elements?.bid_history?.show_team_name !== false && (
                        <span className="font-bold text-white truncate">{bid.team_name}</span>
                      )}
                    </div>
                    {pageDesign?.elements?.bid_history?.show_bid_amount !== false && (
                      <span className="font-mono font-bold text-amber-400 shrink-0 ml-1">₹{bid.amount.toLocaleString()}</span>
                    )}
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
            className="rounded-2xl border border-slate-800 p-5 backdrop-blur-md"
            style={{ backgroundColor: resolvedBgUrl ? 'rgba(3, 13, 28, 0.82)' : '#020617', backgroundImage: 'none', boxShadow: 'none' }}
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

      {/* FULL SCREEN ARENA OVERLAY (Matching Image 2) */}
      {isFullScreen && (() => {
        const leadingTeam = state?.teams?.find((t) => t.team_id === highestBid?.team_id)

        return (
          <div
            className="fixed inset-0 z-[100] text-white flex flex-col h-screen w-screen overflow-hidden select-none"
            style={{
              backgroundColor: '#020b18',
              backgroundImage: resolvedBgUrl
                ? `linear-gradient(rgba(2, 11, 24, 0.78), rgba(2, 11, 24, 0.90)), url(${resolvedBgUrl})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
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

                  <button
                    onClick={() => handleCategoryChange(selectedCategory)}
                    disabled={actionLoading}
                    className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Bring next player from selected category"
                  >
                    <span>Next Player →</span>
                  </button>
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
                {!pageDesign?.elements?.top_bar?.selected && (
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
                )}

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
                {resolvedBgUrl ? (
                  <img
                    src={resolvedBgUrl}
                    alt="Stage Background"
                    className="absolute inset-0 h-full w-full object-cover pointer-events-none opacity-60"
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
                              <div
                                className="w-full flex items-center gap-2"
                                style={{
                                  justifyContent:
                                    el.align === 'center'
                                      ? 'center'
                                      : el.align === 'left'
                                      ? 'flex-start'
                                      : 'flex-end',
                                  textAlign: el.align || 'right',
                                }}
                              >
                                {highestBid?.team_logo && el.show_team_logo !== false && (
                                  <img
                                    src={resolveMediaUrl(highestBid.team_logo)}
                                    alt={highestBid.team_name}
                                    className="w-8 h-8 rounded-full object-contain border border-amber-400/50 shrink-0 shadow-xs"
                                  />
                                )}
                                <div className="min-w-0">
                                  {el.show_label && (
                                    <span
                                      style={{ fontSize: `${Math.max(9, Math.round((el.font_size || 22) * 0.45))}px` }}
                                      className="text-slate-400 block font-bold"
                                    >
                                      {el.custom_label || 'BIDDER TEAM'}
                                    </span>
                                  )}
                                  <span
                                    style={{
                                      fontSize: `${el.font_size || 22}px`,
                                      color: el.colour || '#FFFFFF',
                                      fontFamily: el.font_family || 'inherit',
                                      fontWeight: el.bold === false ? 500 : 900,
                                      fontStyle: el.italic ? 'italic' : 'normal',
                                      textDecoration: el.underline ? 'underline' : 'none',
                                      whiteSpace: el.fit_to_size ? 'nowrap' : 'normal',
                                    }}
                                    className="font-black uppercase tracking-wide truncate block"
                                  >
                                    {highestBid ? highestBid.team_name : 'Awaiting first bid'}
                                  </span>
                                </div>
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
                                  {!isFullScreen && (
                                    <button
                                      onClick={toggleBrowserFullscreen}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 transition cursor-pointer"
                                    >
                                      <Maximize2 className="w-3 h-3 text-sky-400" />
                                      <span>Full Screen</span>
                                    </button>
                                  )}
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
                                          <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                                            {el.show_short_name !== false && (
                                              <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0">
                                                #{state.bid_history.length - idx}
                                              </span>
                                            )}
                                            {el.show_team_name !== false && (
                                              <span className="font-bold text-white truncate">
                                                {getBidDisplayShort(bid)}
                                              </span>
                                            )}
                                          </div>
                                          {el.show_bid_amount !== false && (
                                            <span className="font-mono font-black text-amber-400 shrink-0 ml-1">
                                              ₹{Number(bid.amount || 0).toLocaleString('en-IN')}
                                            </span>
                                          )}
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
                                  {actionButtons
                                    .filter((btn: ActionButtonConfig) => btn.visible !== false)
                                    .map((btn: ActionButtonConfig) => {
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

                            {/* Franchise Bidding Stations Element (Option 4 Geometry) */}
                            {key === 'franchise_stations' && (
                              <div
                                className="w-full h-full p-1.5 rounded-xl bg-[#030f1e]/90 border border-blue-900/60 backdrop-blur-xs select-none overflow-hidden flex flex-col justify-center shadow-lg"
                                style={{ borderRadius: `${el.border_radius ?? 12}px` }}
                              >
                                <div
                                  className="w-full h-full grid"
                                  style={{
                                    gridTemplateColumns: `repeat(${el.grid_cols || 7}, minmax(0, 1fr))`,
                                    gridTemplateRows: `repeat(${el.grid_rows || 2}, minmax(0, 1fr))`,
                                    columnGap: `${el.gap_x || 6}px`,
                                    rowGap: `${el.gap_y || 6}px`,
                                  }}
                                >
                                  {state?.teams?.slice(0, Math.min(state.teams.length, (el.grid_cols || 7) * (el.grid_rows || 2))).map((team, idx) => {
                                    const isLeading = highestBid?.team_id === team.team_id
                                    const playerCat = player?.category || selectedCategory
                                    const catTarget = categoriesData.find((c) => c.name?.toLowerCase() === playerCat?.toLowerCase())?.target_count || 0
                                    const isQuotaFull = (catTarget > 0 && (team.category_counts?.[playerCat] || 0) >= catTarget) || team.pending === 0
                                    const isBudgetExceeded = currentBid >= team.max_bid || team.max_bid <= 0
                                    const isSolid = (el.box_style || 'solid') === 'solid'
                                    const shortcut = getTeamShortcut(team.team_name, team.short_name)
                                    const theme = getTeamTheme(idx, state.teams.length)
                                    const teamColor = (team as any).team_color || theme.accent || '#3B82F6'

                                    return (
                                      <button
                                        key={team.team_id}
                                        onClick={() => handleTeamSelectAndBid(team.team_id)}
                                        disabled={actionLoading || !player || (isLeading && !allowMultipleBids) || isBudgetExceeded || isQuotaFull}
                                        className={`flex flex-col justify-between p-1 rounded-md overflow-hidden transition select-none min-w-0 ${
                                          isLeading
                                            ? 'ring-2 ring-amber-400'
                                            : isQuotaFull || isBudgetExceeded
                                            ? 'opacity-40 cursor-not-allowed'
                                            : 'cursor-pointer hover:scale-105 active:scale-95'
                                        }`}
                                        style={{
                                          backgroundColor: isSolid ? (isLeading ? 'rgba(245, 158, 11, 0.4)' : `${teamColor}25`) : 'transparent',
                                          borderColor: isLeading ? '#F59E0B' : teamColor,
                                          borderWidth: isSolid ? '1px' : '2px',
                                          borderStyle: 'solid',
                                          boxShadow: isSolid ? `0 0 8px ${teamColor}20` : 'none',
                                          writingMode: 'horizontal-tb',
                                        }}
                                      >
                                        <div
                                          className="flex items-center justify-between text-[8px] font-bold text-slate-400 shrink-0 w-full"
                                          style={{ writingMode: 'horizontal-tb' }}
                                        >
                                          {el.show_number !== false && (
                                            <span className="px-1 py-0.2 rounded bg-black/50 font-mono text-[8px] text-white">
                                              #{idx + 1}
                                            </span>
                                          )}
                                          {isLeading ? (
                                            <span className="px-1 py-0.2 rounded bg-amber-400 text-black font-black text-[7px] animate-pulse">
                                              LEADING
                                            </span>
                                          ) : isQuotaFull ? (
                                            <span className="px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 font-bold text-[7px]">
                                              FULL
                                            </span>
                                          ) : isBudgetExceeded ? (
                                            <span className="px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 font-bold text-[7px]">
                                              LIMIT
                                            </span>
                                          ) : (
                                            <span className="font-mono text-[8px] text-slate-400 opacity-75">
                                              [{idx + 1}]
                                            </span>
                                          )}
                                        </div>
                                        <div
                                          className="w-full text-center font-black truncate my-auto px-0.5"
                                          style={{
                                            fontSize: `${el.font_size || 13}px`,
                                            color: isLeading ? '#FDE047' : (el.colour || teamColor),
                                            fontFamily: el.font_family || 'inherit',
                                            fontWeight: el.bold !== false ? 900 : 700,
                                            fontStyle: el.italic ? 'italic' : 'normal',
                                            writingMode: 'horizontal-tb',
                                            whiteSpace: 'nowrap',
                                            textOrientation: 'mixed',
                                          }}
                                        >
                                          {shortcut}
                                        </div>
                                        {el.show_balance !== false && (
                                          <div
                                            className="w-full text-center font-mono text-[8px] text-slate-300/80 truncate shrink-0"
                                            style={{ writingMode: 'horizontal-tb', whiteSpace: 'nowrap' }}
                                          >
                                            ₹{Number(team.balance || 0).toLocaleString('en-IN')}
                                          </div>
                                        )}
                                      </button>
                                    )
                                  })}
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
                ) : upcomingQueue.length > 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-bold text-xs animate-pulse">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{customMessages.msg_post_sold} {autoAdvanceCountdown !== null ? `(${autoAdvanceCountdown}s)` : ''}</span>
                      <button
                        onClick={handleBringNextQueuedPlayer}
                        className="px-2.5 py-1 rounded bg-amber-400 text-zinc-950 font-black text-xs hover:bg-amber-300 transition cursor-pointer"
                      >
                        Bring Now →
                      </button>
                      {autoAdvanceCountdown !== null && (
                        <button
                          onClick={() => setAutoAdvanceCountdown(null)}
                          className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        UP NEXT IN QUEUE • LOT #{upcomingQueue[0].serial_no || upcomingQueue[0].player_number || 1}
                      </span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {upcomingQueue[0].category || 'General Pool'}
                      </span>
                    </div>

                    <div className="flex items-center gap-5 bg-black/40 border border-white/10 p-4 rounded-2xl max-w-md w-full">
                      {upcomingQueue[0].photo ? (
                        <img
                          src={resolveMediaUrl(upcomingQueue[0].photo)}
                          alt={upcomingQueue[0].name}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400/60 shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl shadow-lg">
                          🏏
                        </div>
                      )}
                      <div className="text-left space-y-1">
                        <h3 className="text-xl font-black text-white">{upcomingQueue[0].name}</h3>
                        <p className="text-xs text-slate-300 font-semibold">
                          Role: <strong className="text-white">{upcomingQueue[0].role || 'Player'}</strong>
                        </p>
                        <p className="text-xs text-amber-400 font-mono font-bold">
                          Base Price: ₹{Number(upcomingQueue[0].base_price || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleBringNextQueuedPlayer}
                        disabled={actionLoading}
                        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-6 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                      >
                        <span>Bring Next Player to Floor</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowQueueDrawer(true)}
                        className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
                      >
                        Queue ({upcomingQueue.length})
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-white">
                        {customMessages.msg_category_complete}
                      </h2>
                      <p className="text-sm text-slate-300 font-semibold max-w-md mx-auto">
                        Category <span className="text-amber-400 uppercase font-bold">"{selectedCategory}"</span> lots have been completed.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      {(() => {
                        const currentIdx = categories.indexOf(selectedCategory)
                        const nextCat = currentIdx >= 0 && currentIdx < categories.length - 1 ? categories[currentIdx + 1] : null
                        if (nextCat) {
                          return (
                            <Button
                              onClick={() => handleCategoryChange(nextCat)}
                              disabled={actionLoading}
                              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs px-6 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                            >
                              <span>Move on to {nextCat} →</span>
                            </Button>
                          )
                        }
                        return null
                      })()}
                      <Button
                        onClick={() => startReauction()}
                        disabled={actionLoading}
                        variant="outline"
                        className="border-purple-500/50 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 text-xs font-bold rounded-xl"
                      >
                        <span>{customMessages.msg_unsold_pool}</span>
                      </Button>
                    </div>
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
                          <span className="font-bold text-white">{getBidDisplayShort(bid)}</span>
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
                  TEAMS (TAP OR PRESS 1-{Math.min(9, state?.teams?.length || 9)}):
                </span>
                {state?.teams?.map((team, idx) => {
                  const isLeading = highestBid?.team_id === team.team_id
                  const playerCat = player?.category || selectedCategory
                  const catTarget = categoriesData.find((c) => c.name?.toLowerCase() === playerCat?.toLowerCase())?.target_count || 0
                  const isQuotaFull = (catTarget > 0 && (team.category_counts?.[playerCat] || 0) >= catTarget) || team.pending === 0
                  const isBudgetExceeded = currentBid >= team.max_bid || team.max_bid <= 0
                  const isSelected = selectedTeamId === team.team_id
                  const theme = getTeamTheme(idx, state.teams.length)
                  const shortcut = getTeamShortcut(team.team_name, team.short_name)
                  const isTeamDisabled = actionLoading || !player || (isLeading && !allowMultipleBids) || isBudgetExceeded || isQuotaFull

                  return (
                    <button
                      key={team.team_id}
                      onClick={() => handleTeamSelectAndBid(team.team_id)}
                      disabled={isTeamDisabled}
                      style={{
                        background: isLeading
                          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(30, 20, 5, 0.95) 100%)'
                          : isQuotaFull || isBudgetExceeded
                          ? 'rgba(15, 23, 42, 0.85)'
                          : 'rgba(2, 19, 46, 0.95)',
                        borderColor: isLeading
                          ? '#F59E0B'
                          : isQuotaFull
                          ? '#EF4444'
                          : isBudgetExceeded
                          ? '#F59E0B'
                          : isSelected
                          ? theme.accentHover
                          : theme.border,
                        boxShadow: isLeading
                          ? '0 0 16px rgba(245, 158, 11, 0.5)'
                          : isSelected
                          ? `0 0 14px ${theme.glow}`
                          : `0 0 8px ${theme.glow}`,
                        writingMode: 'horizontal-tb',
                      }}
                      className={`group relative flex flex-col items-center justify-between rounded-xl border-2 px-3 py-1.5 transition-all select-none shrink-0 min-w-[80px] min-h-[68px] ${
                        isLeading
                          ? 'ring-2 ring-amber-400'
                          : isQuotaFull
                          ? 'opacity-40 cursor-not-allowed border-rose-800'
                          : isBudgetExceeded
                          ? 'opacity-40 cursor-not-allowed grayscale border-amber-800'
                          : 'hover:scale-105 active:scale-95 hover:brightness-125 cursor-pointer'
                      }`}
                      title={`Team #${theme.sequenceNo} (Key [${theme.keyShortcut}]) • Purse: ₹${Number(team.balance || 0).toLocaleString('en-IN')}${isQuotaFull ? ' • Quota Full' : isBudgetExceeded ? ' • Purse Limit' : ''}`}
                    >
                      {/* Top Row: Sequence Badge & Key */}
                      <div className="flex items-center justify-between w-full mb-0.5 gap-2" style={{ writingMode: 'horizontal-tb' }}>
                        <span
                          style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                          className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black shadow-xs shrink-0"
                        >
                          #{theme.sequenceNo}
                        </span>
                        {isLeading ? (
                          <span className="px-1 py-0.2 rounded bg-amber-400 text-black font-black text-[7px] animate-pulse">
                            LEADING
                          </span>
                        ) : isQuotaFull ? (
                          <span className="px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 font-bold text-[7px] border border-rose-500/40">
                            FULL
                          </span>
                        ) : isBudgetExceeded ? (
                          <span className="px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 font-bold text-[7px] border border-amber-500/40">
                            LIMIT
                          </span>
                        ) : theme.keyShortcut ? (
                          <span className="text-[9px] font-mono text-slate-300 font-bold bg-black/40 px-1 py-0.2 rounded border border-white/10 shrink-0">
                            [{theme.keyShortcut}]
                          </span>
                        ) : null}
                      </div>

                      {/* Centered Shortcut Text (Strictly Horizontal) */}
                      <span
                        style={{
                          color: isLeading ? '#FDE047' : isQuotaFull ? '#FDA4AF' : theme.pillText,
                          writingMode: 'horizontal-tb',
                          whiteSpace: 'nowrap',
                          textOrientation: 'mixed',
                        }}
                        className="text-base font-black font-mono tracking-wider drop-shadow-md py-0.5"
                      >
                        {shortcut}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Actions Row (SOLD, UNSOLD, CUSTOM BID, PLAYER NO. + SHOW) */}
              {!pageDesign?.elements?.action_bar?.selected && (
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
              )}
            </div>
          </div>
        )
      })()}

      {/* 2-Step Custom Bid Modal (Mounted at root with z-[99999] so it is visible in both fullscreen and normal modes) */}
      <AnimatePresence>
        {isCustomBidModalOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#071326] p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Two-Step Custom Bid</h3>
                <button
                  type="button"
                  onClick={() => setIsCustomBidModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Step {customBidStep} of 2: {customBidStep === 1 ? 'Enter Valid Amount' : 'Select Bidding Team'}
              </p>

              {customBidStep === 1 ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor={customBidInputId} className="text-xs text-slate-300 mb-1 block">
                      Custom Amount (₹)
                    </label>
                    <Input
                      id={customBidInputId}
                      type="number"
                      autoFocus
                      value={customBidAmount || ''}
                      onChange={(e) => setCustomBidAmount(parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customBidAmount > currentBid) {
                          e.preventDefault()
                          setCustomBidStep(2)
                        }
                      }}
                      className="border-white/20 bg-white/5 font-mono text-lg text-amber-400"
                    />
                    <div className="flex items-center justify-between text-[11px] mt-1.5 text-slate-400">
                      <span>Current Leading Bid: <strong className="text-white">₹{currentBid.toLocaleString('en-IN')}</strong></span>
                      {customBidAmount <= currentBid && (
                        <span className="text-rose-400 font-semibold">Must exceed ₹{currentBid.toLocaleString('en-IN')}</span>
                      )}
                    </div>
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
                      className="w-full rounded-lg border border-white/20 bg-slate-800 p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      autoFocus
                    >
                      {state?.teams?.map((t) => (
                        <option key={t.team_id} value={t.team_id}>
                          {t.team_name} (Purse: ₹{Number(t.balance || 0).toLocaleString('en-IN')})
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
                      disabled={actionLoading || !customBidTeamId || customBidAmount <= currentBid}
                      className="bg-emerald-600 text-white font-bold hover:bg-emerald-500"
                    >
                      Confirm Bid of ₹{customBidAmount.toLocaleString('en-IN')}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
