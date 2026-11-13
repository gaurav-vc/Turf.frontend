import { useState, useId, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  Gavel, RotateCcw, Shield, Trophy, Flame,
  Clock, CheckCircle, XCircle, ChevronRight, AlertCircle, RefreshCw, Sparkles,
  Volume2, VolumeX, Play, Pause, Maximize2, Users, Palette
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient, resolveMediaUrl } from '@/api/apiClient'
import { useLiveAuctionState } from '../hooks/useLiveAuctionState'
import { type ActionButtonConfig, DEFAULT_ACTION_BUTTONS, DEFAULT_PAGE_DESIGN, getPhotoShapeStyle } from './AuctionPageDesigner'
import { getTeamTheme, getTeamShortcut } from './teamThemeUtils'
import { useUserUIPreferences } from './useUserUIPreferences'

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
  const { prefs: userPrefs, updatePref: updateUserPref, resetPrefs: resetUserPrefs, userIdentifier } = useUserUIPreferences(auctionId)
  const [showMyUiMenu, setShowMyUiMenu] = useState(false)
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
  const [totalRemainingInCategory, setTotalRemainingInCategory] = useState<number>(0)
  const [totalRemainingInAuction, setTotalRemainingInAuction] = useState<number>(0)
  const [queueLoading, setQueueLoading] = useState(false)
  const [showQueueDrawer, setShowQueueDrawer] = useState(false)
  const [teamKeyBuffer, setTeamKeyBuffer] = useState('')
  const keyBufferTimerRef = useRef<any>(null)
  const [numKeyBuffer, setNumKeyBuffer] = useState('')
  const numKeyBufferRef = useRef('')
  const numKeyTimerRef = useRef<any>(null)
  const customBidInputId = useId()

  const categoryDisplayName = selectedCategory === 'ALL' ? 'All Categories' : selectedCategory
  const rawCatCompleteMsg = state?.config?.custom_messages?.msg_category_complete || 'All players in {category} are sold! Moving on to next category.'
  const formattedCategoryCompleteMsg = rawCatCompleteMsg.replace(/\{category\}/gi, categoryDisplayName)

  const customMessages = {
    msg_post_sold: state?.config?.custom_messages?.msg_post_sold || 'Getting Next player ready...',
    msg_unsold_pool: state?.config?.custom_messages?.msg_unsold_pool || 'Unsold players available in pool. Ready for Re-Auction round.',
    msg_category_complete: formattedCategoryCompleteMsg,
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
      elements: {
        ...(pageDesign?.elements || DEFAULT_PAGE_DESIGN.elements),
        franchise_stations: {
          ...((pageDesign?.elements || DEFAULT_PAGE_DESIGN.elements).franchise_stations || {}),
          grid_cols: cols,
        },
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

  const executeNumKeyBid = useCallback((numStr: string) => {
    numKeyBufferRef.current = ''
    setNumKeyBuffer('')
    if (numKeyTimerRef.current) {
      clearTimeout(numKeyTimerRef.current)
      numKeyTimerRef.current = null
    }
    const teamNum = parseInt(numStr, 10)
    if (isNaN(teamNum) || teamNum <= 0) return
    const teams = state?.teams || []
    const teamIndex = teamNum - 1
    if (teamIndex >= 0 && teamIndex < teams.length) {
      const targetTeam = teams[teamIndex]
      handleTeamSelectAndBid(targetTeam.team_id)
    } else {
      setFeedbackMessage({
        text: `Team #${teamNum} does not exist (${teams.length} teams available).`,
        type: 'error',
      })
    }
  }, [state?.teams, handleTeamSelectAndBid])

  const actionButtons: ActionButtonConfig[] =
    pageDesign?.zones?.action_buttons && Array.isArray(pageDesign.zones.action_buttons)
      ? pageDesign.zones.action_buttons
      : DEFAULT_ACTION_BUTTONS

  useEffect(() => {
    // 1. Instant optimistic load from localStorage
    try {
      const cached = localStorage.getItem(`turf_auction_page_design_${auctionId}`)
      if (cached) {
        setPageDesign(JSON.parse(cached))
      }
    } catch (e) {}

    // 2. Fetch authoritative design from backend
    apiClient
      .get(`/v1/auction/console/${auctionId}/page_design/`)
      .then((res) => {
        if (res.data) setPageDesign(res.data.design_json || res.data)
      })
      .catch((err) => {
        console.warn('Page design load fallback', err)
      })

    // 3. Real-time sync listener from AuctionPageDesigner in any tab or component
    const handleDesignUpdate = (e: any) => {
      if (e.detail?.auctionId === auctionId && e.detail?.design) {
        setPageDesign(e.detail.design)
      } else if (e.detail && !e.detail.auctionId) {
        setPageDesign(e.detail)
      }
    }
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `turf_auction_page_design_${auctionId}` && e.newValue) {
        try {
          setPageDesign(JSON.parse(e.newValue))
        } catch (err) {}
      }
    }
    window.addEventListener('auction_page_design_updated', handleDesignUpdate)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('auction_page_design_updated', handleDesignUpdate)
      window.removeEventListener('storage', handleStorage)
    }
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
    setQueueLoading(true)
    apiClient
      .get(`/v1/auction/console/${auctionId}/player_queue/?category=${encodeURIComponent(selectedCategory)}`)
      .then((res) => {
        if (res.data?.queue) setUpcomingQueue(res.data.queue)
        if (res.data?.total_remaining_in_category !== undefined) setTotalRemainingInCategory(res.data.total_remaining_in_category)
        else if (res.data?.total_pending !== undefined) setTotalRemainingInCategory(res.data.total_pending)
        if (res.data?.total_remaining_in_auction !== undefined) setTotalRemainingInAuction(res.data.total_remaining_in_auction)
        if (res.data?.auto_advance_queue !== undefined) setAutoAdvanceQueue(Boolean(res.data.auto_advance_queue))
        if (res.data?.allow_multiple_bids !== undefined) setAllowMultipleBids(Boolean(res.data.allow_multiple_bids))
      })
      .catch(() => {})
      .finally(() => setQueueLoading(false))
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
      fetchQueue()
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
        if (numKeyBufferRef.current) {
          e.preventDefault()
          if (numKeyTimerRef.current) {
            clearTimeout(numKeyTimerRef.current)
            numKeyTimerRef.current = null
          }
          numKeyBufferRef.current = ''
          setNumKeyBuffer('')
          return
        }
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

      // Enter key: immediately submit buffered team number
      if (e.key === 'Enter' && numKeyBufferRef.current) {
        e.preventDefault()
        executeNumKeyBid(numKeyBufferRef.current)
        return
      }

      // Backspace: remove last digit from buffer
      if (e.key === 'Backspace' && numKeyBufferRef.current) {
        e.preventDefault()
        const newBuf = numKeyBufferRef.current.slice(0, -1)
        numKeyBufferRef.current = newBuf
        setNumKeyBuffer(newBuf)
        if (numKeyTimerRef.current) {
          clearTimeout(numKeyTimerRef.current)
          numKeyTimerRef.current = null
        }
        if (newBuf) {
          numKeyTimerRef.current = setTimeout(() => {
            executeNumKeyBid(numKeyBufferRef.current)
          }, 2000)
        }
        return
      }

      // 1. Multi-digit Sequential Numeric Shortcut Keys (e.g. 1..N with fraction-of-second smart buffer or Enter)
      const numKeyMatch = e.code?.match(/^(?:Digit|Numpad)([0-9])$/) || e.key.match(/^([0-9])$/)
      if (numKeyMatch && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        const digit = numKeyMatch[1]
        const newBuf = numKeyBufferRef.current + digit
        numKeyBufferRef.current = newBuf
        setNumKeyBuffer(newBuf)

        if (numKeyTimerRef.current) {
          clearTimeout(numKeyTimerRef.current)
          numKeyTimerRef.current = null
        }

        const teams = state?.teams || []
        const currentVal = parseInt(newBuf, 10)
        // Instant 0ms bid execution on number key press - zero lag!
        if (currentVal > 0 && currentVal <= teams.length) {
          executeNumKeyBid(newBuf)
          return
        }
        return
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

      // 6. Multi-character Team Shortname Typing Buffer (Letters A-Z) or Single Shortcut Key
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
        const char = e.key.toUpperCase()
        const teams = state?.teams || []

        // Check if a team has explicitly been assigned this shortcut key (instant bid, zero delay!)
        const explicitKeyMatch = teams.find((t) => {
          const sk = (t.shortcut_key || t.custom_data?.shortcut_key || '').toUpperCase()
          return sk && sk === char
        })
        if (explicitKeyMatch) {
          e.preventDefault()
          setTeamKeyBuffer('')
          handleTeamSelectAndBid(explicitKeyMatch.team_id)
          return
        }

        const newBuf = (teamKeyBuffer + char).slice(-4)
        setTeamKeyBuffer(newBuf)

        if (keyBufferTimerRef.current) clearTimeout(keyBufferTimerRef.current)
        keyBufferTimerRef.current = setTimeout(() => {
          setTeamKeyBuffer('')
        }, 800)

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
  }, [isFullScreen, isCustomBidModalOpen, actionLoading, state?.active_player, state?.highest_bid, state?.teams, allowMultipleBids, teamKeyBuffer, executeNumKeyBid])

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
    setAutoAdvanceCountdown(null)
    setSelectedCategory(cat)
    setFeedbackMessage(null)
    const res = await selectNextPlayer(cat)
    if (res?.success) {
      setFeedbackMessage({ text: `Brought in next player from category "${cat}".`, type: 'success' })
      fetchQueue()
    } else {
      setFeedbackMessage({
        text: res?.error || `No available players found in category "${cat}".`,
        type: 'error',
      })
      fetchQueue()
    }
  }

  const player = state?.active_player
  const currentBid = state?.current_bid || 0
  const highestBid = state?.highest_bid

  const audioCtxRef = useRef<any>(null)
  const playSoundEffect = (type: 'bid' | 'sold' | 'unsold' | 'timer') => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }

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
    state?.config?.auction_background ||
    state?.config?.overall_background ||
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

  // Unified 16:9 Canvas Stage (Exact Replica of Auction Page Designer in both Standard & Fullscreen views)
  const renderArenaStage = (isFull: boolean) => {
    const leadingTeam = state?.teams?.find((t) => t.team_id === highestBid?.team_id)

        return (
          <div
            className={isFull ? "fixed inset-0 z-[100] text-white flex flex-col h-screen w-screen overflow-hidden select-none" : "w-full rounded-3xl border-2 border-slate-800 shadow-2xl bg-[#020b18] overflow-hidden relative text-white flex flex-col min-h-[640px] select-none my-4"}
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
              {/* Left: Exit or Full Screen Button */}
              {isFull ? (
                <button
                  onClick={exitFullScreen}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs border border-white/15 transition shadow-2xs cursor-pointer"
                >
                  ← Exit Full Screen
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsFullScreen(true)
                    toggleBrowserFullscreen()
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs border border-amber-300 transition shadow-md cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Screen Arena</span>
                </button>
              )}

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

              {/* Columns & My UI & Timer & Audio controls */}
              <div className="flex items-center gap-2">
                {/* Real-time Franchise Columns Dropdown Selector */}
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 px-2.5 py-1 rounded-xl">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Columns:</span>
                  <select
                    value={pageDesign?.elements?.franchise_stations?.grid_cols || pageDesign?.zones?.team_columns || 7}
                    onChange={(e) => handleUpdateColumns(Number(e.target.value))}
                    className="bg-transparent text-amber-400 font-black text-xs cursor-pointer focus:outline-none"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 10, 12, 14].map((col) => (
                      <option key={col} value={col} className="bg-slate-900 text-white">
                        {col} Columns
                      </option>
                    ))}
                  </select>
                </div>

                {/* My UI Preferences Popover (User-Account Only Customization) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMyUiMenu(!showMyUiMenu)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-xl shadow-xs transition cursor-pointer"
                    title="Customize font size, color and contrast for your account UI only"
                  >
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    <span>My UI</span>
                    {userPrefs.useCustomColor && (
                      <span className="w-2 h-2 rounded-full ring-1 ring-white/40" style={{ backgroundColor: userPrefs.fontColor }} />
                    )}
                  </button>

                  {/* Popover */}
                  {showMyUiMenu && (
                    <div className="absolute right-0 top-full mt-2 w-80 p-4 rounded-2xl bg-slate-950/98 border border-amber-500/50 shadow-2xl z-50 text-slate-200 backdrop-blur-xl space-y-3.5">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Palette className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-black uppercase tracking-wider text-white">My Account UI Settings</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowMyUiMenu(false)}
                          className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 flex items-center justify-between">
                        <span className="truncate max-w-[170px]">User: {userIdentifier}</span>
                        <span className="text-emerald-400 font-bold shrink-0">Isolated to you</span>
                      </div>

                      {/* Font Size */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-300">Shortcut Font Size:</span>
                          <span className="font-mono text-amber-400">{userPrefs.fontSize || 20}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateUserPref('fontSize', Math.max(10, userPrefs.fontSize - 1))}
                            className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                          >-</button>
                          <input
                            type="range"
                            min={10}
                            max={28}
                            value={userPrefs.fontSize || 20}
                            onChange={(e) => updateUserPref('fontSize', Number(e.target.value))}
                            className="flex-1 accent-amber-500 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => updateUserPref('fontSize', Math.min(28, userPrefs.fontSize + 1))}
                            className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
                          >+</button>
                        </div>
                        <div className="flex items-center gap-1 pt-0.5">
                          {[14, 16, 18, 20, 24].map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => updateUserPref('fontSize', sz)}
                              className={`flex-1 py-0.5 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                                userPrefs.fontSize === sz
                                  ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                              }`}
                            >
                              {sz}px
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text Color */}
                      <div className="space-y-1.5 border-t border-white/10 pt-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-300">Text Color:</span>
                          <span className="font-mono text-[11px]" style={{ color: userPrefs.useCustomColor ? userPrefs.fontColor : '#FBBF24' }}>
                            {userPrefs.useCustomColor ? userPrefs.fontColor : 'Dynamic Palette'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateUserPref('useCustomColor', false)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                              !userPrefs.useCustomColor
                                ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            Team Palette
                          </button>
                          <button
                            type="button"
                            onClick={() => updateUserPref('useCustomColor', true)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                              userPrefs.useCustomColor
                                ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            Custom
                          </button>
                          {userPrefs.useCustomColor && (
                            <input
                              type="color"
                              value={userPrefs.fontColor || '#FFFFFF'}
                              onChange={(e) => updateUserPref('fontColor', e.target.value)}
                              className="w-6 h-6 rounded cursor-pointer border border-slate-700 bg-transparent p-0"
                            />
                          )}
                        </div>
                        {userPrefs.useCustomColor && (
                          <div className="flex items-center gap-1 pt-1">
                            {[
                              { hex: '#FFFFFF', name: 'White' },
                              { hex: '#00F0FF', name: 'Cyan' },
                              { hex: '#FBBF24', name: 'Gold' },
                              { hex: '#10B981', name: 'Emerald' },
                              { hex: '#F43F5E', name: 'Pink' },
                              { hex: '#A855F7', name: 'Violet' },
                            ].map((c) => (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => updateUserPref('fontColor', c.hex)}
                                className="w-5 h-5 rounded-full border border-white/20 transition hover:scale-110 cursor-pointer"
                                style={{ backgroundColor: c.hex }}
                                title={c.name}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Background Atmosphere */}
                      <div className="space-y-1.5 border-t border-white/10 pt-2">
                        <span className="text-xs font-bold text-slate-300 block">Card Atmosphere:</span>
                        <div className="flex items-center gap-1">
                          {[
                            { id: 'default', label: 'Default' },
                            { id: 'oled', label: 'OLED Black' },
                            { id: 'navy', label: 'Deep Navy' },
                            { id: 'carbon', label: 'Carbon' },
                          ].map((atm) => (
                            <button
                              key={atm.id}
                              type="button"
                              onClick={() => updateUserPref('cardBg', atm.id as any)}
                              className={`flex-1 py-1 rounded text-[10px] font-bold border transition cursor-pointer ${
                                userPrefs.cardBg === atm.id
                                  ? 'bg-amber-500 text-zinc-950 border-amber-400'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                              }`}
                            >
                              {atm.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-bold text-slate-300">Neon Border Glow:</span>
                          <button
                            type="button"
                            onClick={() => updateUserPref('borderGlow', !userPrefs.borderGlow)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                              userPrefs.borderGlow
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}
                          >
                            {userPrefs.borderGlow ? 'Glow ON' : 'Glow OFF'}
                          </button>
                        </div>
                      </div>

                      {/* Reset Button */}
                      <div className="border-t border-white/10 pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={resetUserPrefs}
                          className="text-[10px] text-slate-400 hover:text-white font-medium hover:underline cursor-pointer"
                        >
                          Reset My UI Defaults
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timer and Audio controls */}
              <div className="flex items-center gap-3">
                {!pageDesign?.elements?.top_bar?.selected && Boolean(state?.config?.online_timer_enabled) && (
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
                                  className="font-black uppercase tracking-wider font-mono drop-shadow-md whitespace-nowrap"
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
                              <div
                                className="relative w-full h-full border-2 border-slate-700 bg-slate-900/90 shadow-2xl flex items-center justify-center overflow-hidden"
                                style={getPhotoShapeStyle(el?.shape || el?.photo_shape, el?.border_radius)}
                              >
                                {player.photo_url ? (
                                  <img
                                    src={player.photo_url}
                                    alt={player.player_name}
                                    className="h-full w-full pointer-events-none"
                                    style={{
                                      ...getPhotoShapeStyle(el?.shape || el?.photo_shape, el?.border_radius),
                                      objectFit: el?.object_fit || 'contain',
                                    }}
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
                                  className="font-black uppercase tracking-tight drop-shadow-md whitespace-nowrap block leading-tight"
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
                                    className="font-black uppercase tracking-wide whitespace-nowrap block"
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
                                  {Boolean(state?.config?.online_timer_enabled) && (
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
                                  )}
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
                                        case 'next_player':
                                          return (
                                            <button
                                              key={btn.id}
                                              onClick={handleBringNextQueuedPlayer}
                                              disabled={actionLoading}
                                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[10px] shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                                              title="Bring Next Queued Player"
                                            >
                                              <ChevronRight className="w-3 h-3" />
                                              <span>{btn.label || 'Next Player'}</span>
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
                                className="w-full h-full p-1.5 rounded-xl border border-blue-900/60 backdrop-blur-xs select-none overflow-visible flex flex-col justify-center shadow-lg relative"
                                style={{
                                  borderRadius: `${el.border_radius ?? 12}px`,
                                  backgroundColor: userPrefs.cardBg === 'oled' ? '#000000' : userPrefs.cardBg === 'navy' ? '#020617' : userPrefs.cardBg === 'carbon' ? '#18181b' : 'rgba(3, 15, 30, 0.92)',
                                }}
                              >
                                {(!state?.teams || state.teams.length === 0) ? (
                                  <div className="flex flex-col items-center justify-center p-3 text-center text-slate-400">
                                    <Shield className="w-5 h-5 text-amber-500/70 mb-1" />
                                    <span className="text-[10px] font-bold text-slate-300">No Franchise Teams Registered</span>
                                  </div>
                                ) : (
                                  <div
                                    className="w-full h-full grid overflow-visible"
                                    style={{
                                      gridTemplateColumns: `repeat(${el.grid_cols || 7}, minmax(0, 1fr))`,
                                      gridTemplateRows: `repeat(${el.grid_rows || 2}, minmax(0, 1fr))`,
                                      columnGap: `${el.gap_x || 6}px`,
                                      rowGap: `${el.gap_y || 6}px`,
                                    }}
                                  >
                                    {state.teams.slice(0, Math.min(state.teams.length, (el.grid_cols || 7) * (el.grid_rows || 2))).map((team, idx) => {
                                      const isLeading = highestBid?.team_id === team.team_id
                                      const playerCat = player?.category || selectedCategory
                                      const catTarget = categoriesData.find((c) => c.name?.toLowerCase() === playerCat?.toLowerCase())?.target_count || 0
                                      const isQuotaFull = (catTarget > 0 && (team.category_counts?.[playerCat] || 0) >= catTarget) || team.pending === 0
                                      const isBudgetExceeded = currentBid >= team.max_bid || team.max_bid <= 0
                                      const isSolid = (el.box_style || 'solid') === 'solid'
                                      const shortcut = getTeamShortcut(team.team_name, team.short_name)
                                      const theme = getTeamTheme(idx, state.teams.length)
                                      const teamColor = (team as any).team_color || theme.accent || '#3B82F6'
                                      const assignedShortcut = ((team as any).shortcut_key || (team as any).custom_data?.shortcut_key || '').toUpperCase()

                                      // Account-level UI styling
                                      const dynamicTeamBg = (team as any).card_bg || (team as any).logo_bg || (team as any).background_color || (team as any).custom_data?.card_bg || (team as any).custom_data?.logo_bg
                                      const isLightBg = dynamicTeamBg && (dynamicTeamBg.toLowerCase() === '#ffffff' || dynamicTeamBg.toLowerCase() === 'white' || dynamicTeamBg.startsWith('rgb(255'))
                                      const effectiveCardBg = dynamicTeamBg
                                        ? dynamicTeamBg
                                        : userPrefs.cardBg === 'oled'
                                        ? '#000000'
                                        : userPrefs.cardBg === 'navy'
                                        ? '#020617'
                                        : userPrefs.cardBg === 'carbon'
                                        ? '#18181b'
                                        : isSolid ? (isLeading ? 'rgba(245, 158, 11, 0.4)' : `${teamColor}25`) : 'transparent'
                                      const effectiveFontSize = userPrefs.fontSize || el.font_size || 13
                                      const effectiveColor = isLightBg ? '#020617' : (isLeading ? '#FDE047' : userPrefs.useCustomColor && userPrefs.fontColor ? userPrefs.fontColor : (el.colour || teamColor))
                                      const effectiveGlow = isLeading
                                        ? '0 0 14px rgba(245, 158, 11, 0.5)'
                                        : userPrefs.borderGlow
                                        ? `0 0 12px ${teamColor}40`
                                        : isSolid ? `0 0 8px ${teamColor}20` : 'none'

                                      return (
                                        <button
                                          key={team.team_id}
                                          onClick={() => handleTeamSelectAndBid(team.team_id)}
                                          disabled={actionLoading || !player || (isLeading && !allowMultipleBids) || isBudgetExceeded || isQuotaFull}
                                          title={`Team #${idx + 1}: ${team.team_name}\nShort Name: ${shortcut}\nPurse Balance: ₹${Number(team.balance || 0).toLocaleString('en-IN')}\nMax Bid: ₹${Number(team.max_bid || 0).toLocaleString('en-IN')}${assignedShortcut ? `\nShortcut Key: [${assignedShortcut}]` : ''}`}
                                          className={`group relative flex flex-col justify-between p-1 rounded-md transition select-none min-w-0 ${
                                            isLeading
                                              ? 'ring-2 ring-amber-400'
                                              : isQuotaFull || isBudgetExceeded
                                              ? 'opacity-40 cursor-not-allowed'
                                              : 'cursor-pointer hover:scale-105 active:scale-95'
                                          }`}
                                          style={{
                                            backgroundColor: effectiveCardBg,
                                            borderColor: isLeading ? '#F59E0B' : teamColor,
                                            borderWidth: isSolid ? '1px' : '2px',
                                            borderStyle: 'solid',
                                            boxShadow: effectiveGlow,
                                            writingMode: 'horizontal-tb',
                                          }}
                                        >
                                          {/* Rich Hover Card: Team number, Full Name, Short Name, Purse Balance, Max Bid */}
                                          <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col gap-0.5 p-2 rounded-xl bg-slate-950/95 border border-amber-500/60 shadow-2xl text-white z-50 pointer-events-none min-w-[155px] backdrop-blur-md text-left">
                                            <div className="flex items-center justify-between border-b border-white/10 pb-0.5 text-[9px]">
                                              <span className="font-extrabold text-amber-400">Team #{idx + 1}</span>
                                              {assignedShortcut && <span className="font-mono text-slate-300 font-bold">[{assignedShortcut}]</span>}
                                            </div>
                                            <div className="font-bold text-[11px] text-white truncate">{team.team_name}</div>
                                            <div className="flex items-center justify-between text-[10px] pt-0.5">
                                              <span className="text-slate-400">Purse Balance:</span>
                                              <span className="font-mono font-bold text-emerald-400">₹{Number(team.balance || 0).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px]">
                                              <span className="text-slate-400">Max Bid:</span>
                                              <span className="font-mono font-black text-amber-300">₹{Number(team.max_bid || 0).toLocaleString('en-IN')}</span>
                                            </div>
                                          </div>
                                          <div
                                            className="flex items-center justify-between text-[8px] font-bold text-slate-400 shrink-0 w-full"
                                            style={{ writingMode: 'horizontal-tb' }}
                                          >
                                            <span
                                              style={{ backgroundColor: teamColor }}
                                              className="w-1.5 h-1.5 rounded-full shadow-xs"
                                            />
                                            {isLeading && (
                                              <span className="px-1 py-0.2 rounded bg-amber-400 text-black font-black text-[7px] animate-pulse">
                                                LEADING
                                              </span>
                                            )}
                                          </div>
                                          {/* Center: Number and Key Only (No Logo thumbnail as requested) */}
                                          <div
                                            className="w-full flex items-center justify-center font-black my-auto px-0.5"
                                            style={{
                                              fontSize: `${effectiveFontSize}px`,
                                              color: isLightBg ? '#020617' : effectiveColor,
                                              fontFamily: el.font_family || 'inherit',
                                              fontWeight: el.bold !== false ? 900 : 700,
                                              fontStyle: el.italic ? 'italic' : 'normal',
                                              writingMode: 'horizontal-tb',
                                              whiteSpace: 'nowrap',
                                            }}
                                          >
                                            <span className="font-mono tracking-wider font-black">
                                              {idx + 1} - {assignedShortcut || shortcut}
                                            </span>
                                          </div>
                                          {el.show_balance === true && (
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
                                )}
                              </div>
                            )}
                            {/* Custom Photo Box Element */}
                            {(el.type === 'photo' || key.startsWith('custom_photo')) && (
                              <div
                                className="w-full h-full relative rounded-xl overflow-hidden shadow-md flex items-center justify-center select-none"
                                style={getPhotoShapeStyle(el?.shape || el?.photo_shape, el?.border_radius ?? 12)}
                              >
                                {el.media_url ? (
                                  <img
                                    src={el.media_url}
                                    alt={el.label || 'Custom Photo'}
                                    style={{
                                      ...getPhotoShapeStyle(el?.shape || el?.photo_shape, el?.border_radius ?? 12),
                                      objectFit: el.object_fit || 'contain',
                                    }}
                                    className="w-full h-full pointer-events-none"
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
                                  className="uppercase tracking-wider block drop-shadow whitespace-nowrap"
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
                ) : autoAdvanceCountdown !== null || queueLoading || actionLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-xl animate-pulse">
                      <Sparkles className="w-10 h-10 text-amber-400" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-white">
                        {actionLoading ? 'Loading next player...' : customMessages.msg_post_sold} {autoAdvanceCountdown !== null ? `(${autoAdvanceCountdown}s)` : ''}
                      </h2>
                      <p className="text-sm text-slate-300 font-semibold max-w-md mx-auto">
                        Preparing next player for the auction floor...
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <Button
                        onClick={handleBringNextQueuedPlayer}
                        disabled={actionLoading}
                        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-6 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                      >
                        <span>Bring Next Player Now →</span>
                      </Button>
                    </div>
                  </div>
                ) : totalRemainingInCategory > 0 || totalRemainingInAuction > 0 || upcomingQueue.length > 0 || ((state?.stats?.remaining_count ?? 0) > 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-xl">
                      <Sparkles className="w-10 h-10 text-amber-400" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-white">
                        Ready for Next Player
                      </h2>
                      <p className="text-sm text-slate-300 font-semibold max-w-md mx-auto">
                        {totalRemainingInCategory > 0
                          ? `${totalRemainingInCategory} player${totalRemainingInCategory > 1 ? 's' : ''} available in "${categoryDisplayName}".`
                          : `${totalRemainingInAuction || state?.stats?.remaining_count || upcomingQueue.length} player(s) available in tournament pool.`}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <Button
                        onClick={handleBringNextQueuedPlayer}
                        disabled={actionLoading}
                        className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-6 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                      >
                        <span>Bring Next Player to Floor →</span>
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
                        Category <span className="text-amber-400 uppercase font-bold">"{categoryDisplayName}"</span> lots have been completed.
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
            {(!pageDesign?.elements?.franchise_stations?.selected || !pageDesign?.elements?.action_bar?.selected) && (
              <div className="border-t border-blue-900/40 bg-[#030d1a] p-3 space-y-2 shrink-0">
                {/* Franchise Bidding Stations Row (Only if hidden from stage canvas) */}
                {!pageDesign?.elements?.franchise_stations?.selected && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 px-1">
                  TEAMS (TAP OR PRESS 1–{state?.teams?.length || 9} • 2s timeout / Enter):
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
                  const teamColor = (team as any).team_color || theme.accent || '#3B82F6'
                  const isNumBuffered = Boolean(numKeyBuffer && parseInt(numKeyBuffer, 10) === theme.sequenceNo)
                  const isTeamDisabled = actionLoading || !player || (isLeading && !allowMultipleBids) || isBudgetExceeded || isQuotaFull

                  return (
                    <button
                      key={team.team_id}
                      onClick={() => handleTeamSelectAndBid(team.team_id)}
                      disabled={isTeamDisabled}
                      style={{
                        background: isLeading
                          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(30, 20, 5, 0.95) 100%)'
                          : isNumBuffered
                          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.4) 100%)'
                          : isQuotaFull || isBudgetExceeded
                          ? 'rgba(15, 23, 42, 0.85)'
                          : 'rgba(2, 19, 46, 0.95)',
                        borderColor: isLeading
                          ? '#F59E0B'
                          : isNumBuffered
                          ? '#FBBF24'
                          : isQuotaFull
                          ? '#EF4444'
                          : isBudgetExceeded
                          ? '#F59E0B'
                          : isSelected
                          ? theme.accentHover
                          : (teamColor || theme.border),
                        boxShadow: isLeading
                          ? '0 0 16px rgba(245, 158, 11, 0.5)'
                          : isNumBuffered
                          ? '0 0 20px rgba(251, 191, 36, 0.6)'
                          : isSelected
                          ? `0 0 14px ${theme.glow}`
                          : `0 0 8px ${theme.glow}`,
                        writingMode: 'horizontal-tb',
                      }}
                      className={`group relative flex flex-col items-center justify-between rounded-xl border-2 px-3 py-1.5 transition-all select-none shrink-0 min-w-[76px] min-h-[60px] ${
                        isLeading
                          ? 'ring-2 ring-amber-400'
                          : isNumBuffered
                          ? 'ring-4 ring-amber-400 scale-105 animate-pulse'
                          : isQuotaFull
                          ? 'opacity-40 cursor-not-allowed border-rose-800'
                          : isBudgetExceeded
                          ? 'opacity-40 cursor-not-allowed grayscale border-amber-800'
                          : 'hover:scale-105 active:scale-95 hover:brightness-125 cursor-pointer'
                      }`}
                      title={`Team #${theme.sequenceNo} (${team.team_name || team.short_name})${isQuotaFull ? ' • Quota Full' : isBudgetExceeded ? ' • Purse Limit' : ''}`}
                    >
                      {/* Top Row: Sequence Badge & Leading Indicator */}
                      <div className="flex items-center justify-between w-full mb-0.5 gap-2" style={{ writingMode: 'horizontal-tb' }}>
                        <span
                          style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                          className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black shadow-xs shrink-0"
                        >
                          #{theme.sequenceNo}
                        </span>
                        {isLeading && (
                          <span className="px-1 py-0.2 rounded bg-amber-400 text-black font-black text-[7px] animate-pulse">
                            LEADING
                          </span>
                        )}
                      </div>

                      {/* Centered Shortcut Text (Strictly Horizontal) */}
                      <span
                        style={{
                          color: isLeading ? '#FDE047' : theme.pillText,
                          writingMode: 'horizontal-tb',
                          whiteSpace: 'nowrap',
                          textOrientation: 'mixed',
                        }}
                        className="text-base font-black font-mono tracking-wider drop-shadow-md my-auto py-0.5"
                      >
                        {shortcut}
                      </span>
                    </button>
                  )
                })}
                  </div>
                )}

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
                        case 'next_player':
                          return (
                            <button
                              key={btn.id}
                              onClick={handleBringNextQueuedPlayer}
                              disabled={actionLoading}
                              className="bg-sky-600 hover:bg-sky-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Bring Next Queued Player"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                              <span>{btn.label || 'Next Player'}</span>
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
          )}
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

      {/* Live Broadcast Arena Stage (Exact Replica of Auction Page Designer) */}
      {!isFullScreen && renderArenaStage(false)}
      {/* Fullscreen Overlay Replica */}
      {isFullScreen && renderArenaStage(true)}

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

      {/* Floating Multi-Digit Key Buffer Toast */}
      <AnimatePresence>
        {numKeyBuffer && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 rounded-full bg-slate-900/95 border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.55)] text-white backdrop-blur-md"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-mono text-sm font-bold flex items-center gap-1.5">
              <span>Selecting Team</span>
              <strong className="text-amber-400 text-base font-black px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40">
                #{numKeyBuffer}
              </strong>
              {state?.teams && parseInt(numKeyBuffer, 10) > 0 && parseInt(numKeyBuffer, 10) <= state.teams.length && (
                <span className="text-slate-300 font-semibold">
                  ({getTeamShortcut(state.teams[parseInt(numKeyBuffer, 10) - 1].team_name, state.teams[parseInt(numKeyBuffer, 10) - 1].short_name)})
                </span>
              )}
            </span>
            <span className="text-[11px] text-amber-200/90 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-medium">
              Auto-bidding in 2s • Enter to bid • Esc to clear
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
