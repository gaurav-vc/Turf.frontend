import { useState, useId, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  Gavel, RotateCcw, Search, Shield, Trophy, Flame,
  Clock, CheckCircle, XCircle, ChevronRight, AlertCircle, RefreshCw, Sparkles,
  Volume2, VolumeX, Play, Pause
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLiveAuctionState } from '../hooks/useLiveAuctionState'

interface LiveBroadcastConsoleProps {
  auctionId: string
}

export default function LiveBroadcastConsole({ auctionId }: LiveBroadcastConsoleProps) {
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

  const [customBidAmount, setCustomBidAmount] = useState<number>(0)
  const [customBidTeamId, setCustomBidTeamId] = useState<string>('')
  const [isCustomBidModalOpen, setIsCustomBidModalOpen] = useState(false)
  const [customBidStep, setCustomBidStep] = useState<1 | 2>(1)
  const [jumpPlayerNo, setJumpPlayerNo] = useState<string>('')
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [timerSeconds, setTimerSeconds] = useState(30)
  const [timerActive, setTimerActive] = useState(false)
  const customBidInputId = useId()

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
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/20 p-6 shadow-2xl backdrop-blur-xl">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 font-mono text-sm font-bold text-amber-400">
                  #{player?.serial_no || '—'}
                </span>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                  {player?.category || 'General Pool'}
                </span>
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                  {player?.role || 'All-Rounder'}
                </span>
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
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">Base Price</span>
                      <p className="font-mono text-sm font-bold text-amber-400">
                        ₹{player.base_price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Player Stats & Live Bid display */}
                <div className="md:col-span-8 flex flex-col justify-between">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">
                      {player.player_name}
                    </h2>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg bg-white/5 p-2">
                        <span className="text-slate-400">Batting Style:</span>
                        <p className="font-semibold text-slate-200">{player.batting_style || 'Right Hand'}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2">
                        <span className="text-slate-400">Bowling Style:</span>
                        <p className="font-semibold text-slate-200">{player.bowling_style || 'Right Arm'}</p>
                      </div>
                      {player.location && (
                        <div className="rounded-lg bg-white/5 p-2">
                          <span className="text-slate-400">Location:</span>
                          <p className="font-semibold text-slate-200">{player.location}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current Bid Display */}
                  <div className="mt-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-amber-300/80">Current Bid</span>
                        <p className="font-mono text-4xl font-extrabold text-amber-400">
                          ₹{currentBid.toLocaleString()}
                        </p>
                      </div>
                      {highestBid && (
                        <div className="text-right">
                          <span className="text-xs uppercase tracking-wider text-slate-400">Leading Franchise</span>
                          <p className="text-lg font-bold text-white">{highestBid.team_name}</p>
                          <span className="text-xs text-emerald-400">({highestBid.bid_type})</span>
                        </div>
                      )}
                    </div>
                  </div>
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

            {/* Auction Action Pane (Hammer Controls) */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleHammerSold}
                  disabled={actionLoading || !player || !highestBid}
                  className="bg-emerald-600 font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-950/40"
                >
                  <Gavel className="h-4 w-4 mr-2" /> SOLD (Hammer Down)
                </Button>
                <Button
                  onClick={handleHammerUnsold}
                  disabled={actionLoading || !player}
                  variant="outline"
                  className="border-red-500/40 text-red-300 hover:bg-red-500/20"
                >
                  <XCircle className="h-4 w-4 mr-2" /> UNSOLD
                </Button>
                <Button
                  onClick={openCustomBidModal}
                  disabled={actionLoading || !player}
                  variant="outline"
                  className="border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                >
                  <Flame className="h-4 w-4 mr-2" /> Custom Bid
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleUndoSale}
                  disabled={actionLoading}
                  variant="ghost"
                  className="text-xs text-slate-400 hover:text-white"
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Undo Sale
                </Button>
                <Button
                  onClick={undoBid}
                  disabled={actionLoading || !highestBid}
                  variant="ghost"
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Undo Bid
                </Button>
                <Button
                  onClick={resetBid}
                  disabled={actionLoading || !highestBid}
                  variant="ghost"
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Reset Bid
                </Button>
              </div>
            </div>
          </div>

          {/* Franchise Quick Bid Grid */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                Franchise Bidding Stations
              </h3>
              <span className="text-xs text-slate-400">Click to place next slab increment</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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
                        : 'border-white/10 bg-white/5 hover:border-amber-500/50 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm truncate">{team.short_name}</span>
                      {isLeading && (
                        <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate mt-0.5">{team.team_name}</span>

                    <div className="mt-3 border-t border-white/5 pt-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500">Purse:</span>
                        <p className="font-mono text-emerald-400 font-semibold">₹{team.balance.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500">Max Bid:</span>
                        <p className="font-mono text-amber-300 font-semibold">₹{team.max_bid.toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Feed & Lot History (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Bid History Feed */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
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
                <p className="text-xs text-slate-500 text-center py-8">No bids placed for this player yet.</p>
              )}
            </div>
          </div>

          {/* Quick Re-auction Trigger */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Re-Auction Pool
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Bring back unsold players to the bidding pool for a secondary round.
            </p>
            <Button
              onClick={() => startReauction()}
              disabled={actionLoading}
              variant="outline"
              className="w-full border-purple-500/40 text-purple-300 hover:bg-purple-500/20"
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
    </div>
  )
}
