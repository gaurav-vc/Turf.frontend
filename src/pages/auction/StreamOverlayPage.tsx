import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Flame, Shield, TrendingUp, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react'
import { apiClient } from '@/api/apiClient'

export default function StreamOverlayPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const overlayType = searchParams.get('type') || 'ipl_card' // ipl_card | lower_third | scoreboard | sponsor_strip

  const [data, setData] = useState<any>(null)
  const prevBidRef = useRef<number>(0)
  const [bidFlashed, setBidFlashed] = useState(false)

  useEffect(() => {
    if (!token) return

    const fetchState = async () => {
      try {
        const res = await apiClient.get(`/v1/auction/public/viewer/${token}/`)
        setData(res.data)

        const newBid = res.data?.current_bid || 0
        if (prevBidRef.current > 0 && newBid > prevBidRef.current) {
          setBidFlashed(true)
          setTimeout(() => setBidFlashed(false), 1200)
        }
        prevBidRef.current = newBid
      } catch (err) {
        console.error('Failed to poll stream overlay', err)
      }
    }

    fetchState()
    const timer = setInterval(fetchState, 1000)
    return () => clearInterval(timer)
  }, [token])

  const isDemoParam = searchParams.get('demo') === 'true'
  const [demoMode, setDemoMode] = useState(isDemoParam)

  const activePlayer = data?.active_player
  // If no player is actively on the block, allow instant demo preview
  const player = activePlayer || (demoMode ? {
    id: 'demo_player_1',
    player_name: 'VIRAT KOHLI',
    serial_no: 18,
    category: 'MARQUEE SET',
    role: 'Top-Order Batsman',
    batting_style: 'Right Hand Bat',
    bowling_style: 'Right Arm Medium',
    location: 'Delhi',
    base_price: 20000000,
    photo_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
    status: 'BIDDING',
  } : null)

  const currentBid = activePlayer ? (data?.current_bid || 0) : (demoMode ? 175000000 : 0)
  const highestBid = activePlayer ? data?.highest_bid : (demoMode ? { team_name: 'ROYAL CHALLENGERS', team_id: 'rcb_1' } : null)
  const leadingTeamName = highestBid?.team_name || ''
  const leadingTeamId = highestBid?.team_id

  // Match leading team's financial info
  const leadingTeamFinancials = data?.teams?.find(
    (t: any) => String(t.team_id) === String(leadingTeamId) || t.team_name === leadingTeamName
  ) || (demoMode ? { balance: 425000000, max_bid: 280000000 } : null)

  const isSold = player?.status === 'SOLD'
  const isUnsold = player?.status === 'UNSOLD'

  const customRole = player?.role || 'All-Rounder'
  const batting = player?.batting_style || 'Right Hand Bat'
  const bowling = player?.bowling_style || 'Right Arm Medium'

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-8 flex flex-col justify-end items-center overflow-hidden font-sans select-none">
      
      {/* Optional Live Video Stream Background (e.g. YouTube, Twitch, HLS, or mp4) */}
      {(() => {
        const streamUrl = searchParams.get('stream_url') || data?.design?.stream_url || data?.config?.stream_url
        if (!streamUrl) return null

        let embedUrl = ''
        if (streamUrl.includes('youtube.com/watch') || streamUrl.includes('youtu.be/')) {
          const match = streamUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
          if (match && match[1]) {
            embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${match[1]}`
          }
        } else if (streamUrl.includes('twitch.tv/')) {
          const match = streamUrl.match(/twitch\.tv\/([a-zA-Z0-9_]+)/)
          if (match && match[1]) {
            const host = window.location.hostname
            embedUrl = `https://player.twitch.tv/?channel=${match[1]}&parent=${host}&muted=true`
          }
        }

        return (
          <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden bg-black pointer-events-none">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full h-full object-cover border-0 pointer-events-none"
                allow="autoplay; encrypted-media"
                title="Live Arena Stream"
              />
            ) : (
              <video
                src={streamUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover pointer-events-none"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
          </div>
        )
      })()}

      {/* Top Test Banner for OBS / Browser */}
      {!activePlayer && (
        <div className="fixed top-4 right-4 z-50 pointer-events-auto flex items-center gap-2 bg-slate-950/80 border border-amber-500/40 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-lg text-xs">
          <span className="text-slate-300 font-medium">No live player on block</span>
          <button
            onClick={() => setDemoMode(!demoMode)}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black tracking-wider uppercase text-[10px] shadow-sm transition-all"
          >
            {demoMode ? 'Show Standby Ticker' : '👁️ Preview IPL Card'}
          </button>
        </div>
      )}
      
      {/* =========================================================================
          1. IPL BROADCAST MEGA CARD (STAR SPORTS / JIOCINEMA STYLE) - DEFAULT
          ========================================================================= */}
      {(overlayType === 'ipl_card' || overlayType === 'ipl_broadcast') && (
        <AnimatePresence mode="wait">
          {player ? (
            <motion.div
              key={player.id}
              initial={{ y: 120, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 120, opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-2 border-amber-400/80 bg-gradient-to-r from-slate-950 via-zinc-950 to-slate-950 text-white relative backdrop-blur-xl"
              style={{
                boxShadow: '0 0 50px rgba(245, 158, 11, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              {/* Dynamic Animated Top Status Bar */}
              <div className="bg-gradient-to-r from-slate-900 via-amber-950/70 to-slate-900 px-6 py-2 border-b border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isSold ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-400 text-xs font-black tracking-wider uppercase animate-bounce">
                      <Sparkles className="w-3.5 h-3.5" /> SOLD TO {leadingTeamName}
                    </span>
                  ) : isUnsold ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/60 text-rose-400 text-xs font-black tracking-wider uppercase">
                      <AlertCircle className="w-3.5 h-3.5" /> UNSOLD IN THIS ROUND
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                      </span>
                      <span className="text-xs font-black uppercase tracking-widest text-rose-400 flex items-center gap-1">
                        LIVE ON THE BLOCK
                      </span>
                    </div>
                  )}

                  <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                    • {data?.auction_name || 'IPL MEGA AUCTION'}
                  </span>
                </div>

                {/* Right Tournament Crest Pill */}
                <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-amber-300">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>LOT #{player.serial_no || 1}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 uppercase tracking-wider text-[10px]">
                    {player.category || 'MARQUEE SET'}
                  </span>
                </div>
              </div>

              {/* Main Broadcast Body */}
              <div className="flex flex-col md:flex-row items-stretch">
                {/* 3D Cutout Player Photo Area */}
                <div className="relative md:w-80 bg-gradient-to-b from-slate-900 to-black flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-amber-500/30 overflow-hidden group">
                  {/* Glowing stadium ring background */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.22)_0%,transparent_70%)] pointer-events-none" />

                  {player.photo_url ? (
                    <div className="relative">
                      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 opacity-40 blur-md group-hover:opacity-60 transition duration-500"></div>
                      <img
                        src={player.photo_url}
                        alt={player.player_name}
                        className="relative w-44 h-48 md:w-52 md:h-56 object-cover rounded-2xl border-2 border-amber-400/80 shadow-2xl"
                      />
                    </div>
                  ) : (
                    <div className="w-44 h-48 md:w-52 md:h-56 rounded-2xl border-2 border-dashed border-amber-500/40 bg-slate-900 flex flex-col items-center justify-center gap-2 text-amber-400/80">
                      <Trophy className="w-14 h-14" />
                      <span className="text-xs font-mono font-bold uppercase">No Portrait</span>
                    </div>
                  )}

                  {/* Base Price Watermark Tag */}
                  <div className="absolute bottom-3 left-4 right-4 bg-slate-950/90 border border-amber-500/40 rounded-xl py-1.5 px-3 flex items-center justify-between text-xs backdrop-blur-md">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Base Price</span>
                    <span className="font-mono font-extrabold text-amber-400">
                      ₹{Number(player.base_price || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Player Profile & Bio Badges */}
                <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Role & Specs Pill */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-bold uppercase tracking-wider">
                        {customRole}
                      </span>
                      {batting && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                          🏏 {batting}
                        </span>
                      )}
                      {bowling && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                          ⚡ {bowling}
                        </span>
                      )}
                      {player.location && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                          📍 {player.location}
                        </span>
                      )}
                    </div>

                    {/* Massive Bold Player Name */}
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-200 uppercase drop-shadow-md">
                      {player.player_name}
                    </h1>
                  </div>

                  {/* Real-time Bid & Leading Team Mega Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
                    {/* Golden accent bar on left */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 via-yellow-300 to-amber-600"></div>

                    {/* Left: Animated Current Bid */}
                    <div className="pl-3">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          CURRENT HIGHEST BID
                        </span>
                      </div>
                      <motion.div
                        key={currentBid}
                        initial={bidFlashed ? { scale: 1.25, color: '#fef08a' } : false}
                        animate={{ scale: 1, color: '#fbbf24' }}
                        transition={{ duration: 0.35 }}
                        className="font-mono text-3xl md:text-4xl font-black text-amber-400 tracking-tight mt-1 flex items-baseline gap-1"
                      >
                        ₹{Number(currentBid).toLocaleString()}
                        {bidFlashed && (
                          <motion.span
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-xs font-sans font-extrabold text-emerald-400 tracking-normal ml-2"
                          >
                            ▲ NEW BID
                          </motion.span>
                        )}
                      </motion.div>
                    </div>

                    {/* Right: Leading Franchise & Purse Details */}
                    <div className="sm:border-l sm:border-slate-800 sm:pl-4 flex flex-col justify-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                        LEADING FRANCHISE
                      </span>
                      {leadingTeamName ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-400" />
                            <span className="text-lg md:text-xl font-black text-white uppercase tracking-wide">
                              {leadingTeamName}
                            </span>
                          </div>

                          {/* Team Purse Ceiling Stats */}
                          {leadingTeamFinancials && (
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-1">
                              <span>
                                Purse Left:{' '}
                                <b className="text-emerald-400">
                                  ₹{Number(leadingTeamFinancials.balance || 0).toLocaleString()}
                                </b>
                              </span>
                              <span>
                                Max Bid:{' '}
                                <b className="text-amber-300">
                                  ₹{Number(leadingTeamFinancials.max_bid || 0).toLocaleString()}
                                </b>
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-slate-500 italic">
                          Awaiting opening bid from franchises...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sold / Celebration Banner */}
              {isSold && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 text-zinc-950 font-black text-center py-2.5 text-sm md:text-base tracking-widest uppercase flex items-center justify-center gap-3 shadow-inner"
                >
                  <Sparkles className="w-5 h-5 text-white" />
                  <span>
                    CONGRATULATIONS {leadingTeamName} • SOLD AT ₹{Number(currentBid).toLocaleString()}
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* Idle Broadcast Standby Ticker */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-4xl bg-slate-950/90 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between shadow-2xl backdrop-blur-md text-white"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-black uppercase tracking-wider text-sm">
                  {data?.auction_name || 'TOURNAMENT MEGA AUCTION'}
                </span>
                <span className="text-xs text-slate-400 font-medium">| Awaiting next lot from auctioneer</span>
              </div>
              <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-widest">
                LIVE BROADCAST FEED
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* =========================================================================
          2. LOWER THIRD OVERLAY (LEGACY COMPACT PRESET)
          ========================================================================= */}
      {overlayType === 'lower_third' && player && (
        <AnimatePresence>
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="flex items-stretch rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-slate-950/95 shadow-2xl backdrop-blur-md max-w-2xl"
          >
            {/* Player Photo */}
            <div className="w-28 bg-slate-800 flex items-center justify-center overflow-hidden border-r border-amber-500/40">
              {player.photo_url ? (
                <img src={player.photo_url} alt={player.player_name} className="h-full w-full object-cover" />
              ) : (
                <Trophy className="h-10 w-10 text-amber-400" />
              )}
            </div>

            {/* Info details */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                    #{player.serial_no || 1}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                    {player.category || 'General Pool'} • {player.role || 'Player'}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight mt-1 truncate">
                  {player.player_name}
                </h2>
              </div>

              {/* Bid strip */}
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400">Current Bid</span>
                  <p className="font-mono text-2xl font-black text-amber-400">₹{currentBid.toLocaleString()}</p>
                </div>
                {leadingTeamName && (
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">Leading Franchise</span>
                    <p className="text-sm font-extrabold text-white">{leadingTeamName}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* =========================================================================
          3. LIVE SCOREBOARD OVERLAY
          ========================================================================= */}
      {overlayType === 'scoreboard' && (
        <div className="self-end rounded-2xl border-2 border-amber-500/60 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md min-w-[260px] text-right">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-1">
            🔴 LIVE AUCTION BLOCK
          </span>
          <p className="font-mono text-3xl font-black text-white">₹{currentBid.toLocaleString()}</p>
          <div className="mt-2 border-t border-white/10 pt-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Bidder:</span>
            <span className="font-bold text-amber-300 truncate max-w-[140px]">{leadingTeamName || 'No bid yet'}</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. SPONSOR STRIP OVERLAY
          ========================================================================= */}
      {overlayType === 'sponsor_strip' && (
        <div className="w-full rounded-xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-md flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="font-bold text-white">{data?.auction_name || 'Tournament Auction'}</span>
          </div>
          <span className="text-slate-400 font-mono">BROADCAST OVERLAY STREAM</span>
        </div>
      )}
    </div>
  )
}
