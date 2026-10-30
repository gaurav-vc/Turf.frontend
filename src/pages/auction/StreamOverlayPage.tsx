import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Flame, Shield, TrendingUp, Sparkles, AlertCircle, CheckCircle2, Award } from 'lucide-react'
import { apiClient } from '@/api/apiClient'
import { getTeamShortcut } from './components/teamThemeUtils'
import { parseStreamVideoUrl } from './components/streamVideoUtils'

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

  // Dynamic Configuration from searchParams and backend design JSON
  const overlayConfig = data?.design?.overlay_config || {}
  const videoEnabled = searchParams.get('video') === 'true' || (overlayConfig.video_enabled ?? false)
  const streamUrl =
    searchParams.get('stream_url') ||
    (videoEnabled ? overlayConfig.video_url : '') ||
    data?.design?.stream_url ||
    data?.config?.stream_url
  const videoOpacity = searchParams.get('video_opacity')
    ? parseFloat(searchParams.get('video_opacity')!)
    : (overlayConfig.video_opacity ?? 0.75)
  const customAccent = searchParams.get('accent') || overlayConfig.accent_color || '#f59e0b'
  const showPurse = searchParams.get('show_purse') !== 'false' && overlayConfig.show_purse !== false
  const showSpecs = searchParams.get('show_specs') !== 'false' && overlayConfig.show_specs !== false
  const showBasePrice = searchParams.get('show_base') !== 'false' && overlayConfig.show_base !== false
  const showTitle = searchParams.get('show_title') !== 'false' && overlayConfig.show_title !== false
  const showCelebration = searchParams.get('show_celebration') !== 'false' && overlayConfig.show_celebration !== false
  const scale = searchParams.get('scale') ? parseFloat(searchParams.get('scale')!) : (overlayConfig.scale || 1)
  const position = searchParams.get('pos') || overlayConfig.position || 'bottom' // bottom | center | top
  const borderRadius = overlayConfig.border_radius ?? 24

  // Drag and drop custom position and typography overrides from overlayConfig
  const hasCustomPos = overlayConfig.pos_x != null && overlayConfig.pos_y != null
  const posX = overlayConfig.pos_x ?? 8
  const posY = overlayConfig.pos_y ?? 60
  const posW = overlayConfig.pos_w ?? 84
  const customTournamentTitle =
    overlayConfig.custom_tournament_title || data?.auction_name || 'LIVE AUCTION'
  const fontFamily = overlayConfig.font_family || 'Inter'
  const fontSize = overlayConfig.font_size || 36
  const fontBold = overlayConfig.font_bold !== false
  const fontItalic = overlayConfig.font_italic || false
  const fontAlign = overlayConfig.font_align || 'left'

  const activePlayer = data?.active_player
  // Real tournament preview player from the database (zero hardcoded dummy data)
  const tournamentPreview = data?.preview_player || data?.recent_player || null

  // If no live player is on the block, allow operator to preview overlay graphics with actual tournament data
  const player = activePlayer || (demoMode ? tournamentPreview : null)

  const currentBid = activePlayer
    ? (data?.current_bid || activePlayer.base_price || 0)
    : (demoMode && tournamentPreview ? (tournamentPreview.sold_price || tournamentPreview.base_price || 0) : 0)

  const highestBid = activePlayer
    ? data?.highest_bid
    : (demoMode && tournamentPreview
        ? (tournamentPreview.sold_to_name
            ? { team_name: tournamentPreview.sold_to_name }
            : data?.teams?.[0]
            ? { team_name: data.teams[0].team_name, team_id: data.teams[0].team_id, short_name: data.teams[0].short_name }
            : null)
        : null)

  const leadingTeamName = highestBid?.team_name || ''
  const leadingTeamId = highestBid?.team_id

  // Match leading team's financial info dynamically from real tournament teams
  const leadingTeamFinancials = data?.teams?.find(
    (t: any) => (leadingTeamId && String(t.team_id) === String(leadingTeamId)) || (leadingTeamName && t.team_name === leadingTeamName)
  ) || (demoMode && data?.teams?.[0] ? data.teams[0] : null)

  const leadingTeamShortcut = leadingTeamName
    ? getTeamShortcut(leadingTeamName, leadingTeamFinancials?.short_name || highestBid?.short_name)
    : ''

  const isSold = player?.status === 'SOLD'
  const isUnsold = player?.status === 'UNSOLD'

  const customRole = player?.role || 'All-Rounder'
  const batting = player?.batting_style || ''
  const bowling = player?.bowling_style || ''

  const containerJustify =
    position === 'top' ? 'justify-start' : position === 'center' ? 'justify-center' : 'justify-end'

  return (
    <div
      className={`min-h-screen bg-transparent p-4 sm:p-8 flex flex-col ${containerJustify} items-center overflow-hidden font-sans select-none`}
    >
      {/* Optional Live Video Stream Background (YouTube, Twitch, or Direct Video) */}
      {(() => {
        if (!streamUrl) return null
        const resolved = parseStreamVideoUrl(streamUrl)
        if (resolved.type === 'none') return null

        return (
          <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden bg-black pointer-events-none">
            {resolved.type === 'iframe' ? (
              <iframe
                src={resolved.src}
                className="w-full h-full object-cover border-0 pointer-events-none scale-105"
                allow="autoplay; encrypted-media; picture-in-picture"
                title="Live Arena Stream"
              />
            ) : (
              <video
                src={resolved.src}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover pointer-events-none"
              />
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: `rgba(0, 0, 0, ${videoOpacity})` }}
            />
          </div>
        )
      })()}

      {/* Top Test Banner for OBS / Browser (Zero hardcoded data) */}
      {!activePlayer && (
        <div className="fixed top-4 right-4 z-50 pointer-events-auto flex items-center gap-2 bg-slate-950/85 border border-amber-500/40 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-lg text-xs">
          <span className="text-slate-300 font-medium">
            {demoMode ? 'Previewing tournament roster' : 'No live lot on block'}
          </span>
          <button
            onClick={() => setDemoMode(!demoMode)}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black tracking-wider uppercase text-[10px] shadow-sm transition-all cursor-pointer"
          >
            {demoMode ? 'Show Standby Ticker' : '👁️ Preview Player Card'}
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
              animate={{ y: 0, opacity: 1, scale: scale }}
              exit={{ y: 120, opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-2 border-amber-400/80 bg-gradient-to-r from-slate-950 via-zinc-950 to-slate-950 text-white relative backdrop-blur-xl"
              style={{
                ...(hasCustomPos
                  ? {
                      position: 'absolute',
                      left: `${posX}%`,
                      top: `${posY}%`,
                      width: `${posW}%`,
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                    }
                  : {
                      transform: `scale(${scale})`,
                    }),
                borderColor: customAccent,
                borderRadius: `${borderRadius}px`,
                boxShadow: `0 0 50px ${customAccent}40, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                fontFamily: fontFamily,
              }}
            >
              {/* Dynamic Animated Top Status Bar */}
              {showTitle && (
                <div className="bg-gradient-to-r from-slate-900 via-amber-950/70 to-slate-900 px-6 py-2 border-b border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isSold ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-400 text-xs font-black tracking-wider uppercase animate-bounce">
                        <Sparkles className="w-3.5 h-3.5" /> SOLD TO {leadingTeamName || 'FRANCHISE'}
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
                      • {customTournamentTitle}
                    </span>
                  </div>

                  {/* Right Tournament Lot & Category Pill */}
                  <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-amber-300">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>LOT #{player.serial_no || 1}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 uppercase tracking-wider text-[10px]">
                      {player.category || 'General Pool'}
                    </span>
                  </div>
                </div>
              )}

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
                  {showBasePrice && (
                    <div className="absolute bottom-3 left-4 right-4 bg-slate-950/90 border border-amber-500/40 rounded-xl py-1.5 px-3 flex items-center justify-between text-xs backdrop-blur-md">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Base Price</span>
                      <span className="font-mono font-extrabold text-amber-400">
                        ₹{Number(player.base_price || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Player Profile & Bio Badges */}
                <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                  <div>
                    {/* Role & Specs Pill */}
                    {showSpecs && (
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
                    )}

                    {/* Massive Bold Player Name */}
                    <h1
                      style={{
                        fontFamily: fontFamily,
                        fontSize: `${fontSize}px`,
                        fontWeight: fontBold ? 900 : 700,
                        fontStyle: fontItalic ? 'italic' : 'normal',
                        textAlign: fontAlign,
                      }}
                      className="tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-200 uppercase drop-shadow-md"
                    >
                      {player.player_name}
                    </h1>
                  </div>

                  {/* Real-time Bid & Leading Team Mega Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
                    {/* Golden accent bar on left */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1.5"
                      style={{ backgroundColor: customAccent }}
                    />

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
                        ₹{Number(currentBid).toLocaleString('en-IN')}
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

                    {/* Right: Bidder Team Name & Purse Details */}
                    <div className="sm:border-l sm:border-slate-800 sm:pl-4 flex flex-col justify-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                        BIDDER TEAM NAME
                      </span>
                      {leadingTeamName ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-400" />
                            <span className="text-lg md:text-xl font-black text-white uppercase tracking-wide">
                              {leadingTeamName}
                            </span>
                            {leadingTeamShortcut && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">
                                {leadingTeamShortcut}
                              </span>
                            )}
                          </div>

                          {/* Team Purse Ceiling Stats */}
                          {showPurse && leadingTeamFinancials && (
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-1">
                              <span>
                                Purse Left:{' '}
                                <b className="text-emerald-400">
                                  ₹{Number(leadingTeamFinancials.balance || 0).toLocaleString('en-IN')}
                                </b>
                              </span>
                              <span>
                                Max Bid:{' '}
                                <b className="text-amber-300">
                                  ₹{Number(leadingTeamFinancials.max_bid || 0).toLocaleString('en-IN')}
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
              {isSold && showCelebration && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 text-zinc-950 font-black text-center py-2.5 text-sm md:text-base tracking-widest uppercase flex items-center justify-center gap-3 shadow-inner"
                >
                  <Sparkles className="w-5 h-5 text-white" />
                  <span>
                    CONGRATULATIONS {leadingTeamName} • SOLD AT ₹{Number(currentBid).toLocaleString('en-IN')}
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* Dynamic Broadcast Standby & Roster Card (Zero hardcoded data) */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl bg-slate-950/95 border border-amber-500/40 rounded-3xl p-5 shadow-2xl backdrop-blur-xl text-white space-y-4"
              style={{
                boxShadow: `0 0 40px ${customAccent}30`,
                borderColor: `${customAccent}60`,
              }}
            >
              {/* Top Banner Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                  <span className="font-black uppercase tracking-wider text-base sm:text-lg">
                    {data?.auction_name || 'TOURNAMENT LIVE AUCTION'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                    | Live Spectator Arena
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full uppercase tracking-widest">
                    STANDBY FEED
                  </span>
                </div>
              </div>

              {/* Real Tournament Stats Strip */}
              {data?.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Lots</span>
                    <span className="text-sm font-black text-white font-mono">{data.stats.total_players || 0}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">Sold</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">{data.stats.sold_count || 0}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                    <span className="text-[10px] text-amber-400 uppercase font-bold block">Remaining</span>
                    <span className="text-sm font-black text-amber-400 font-mono">{data.stats.remaining_count || 0}</span>
                  </div>
                  <div className="bg-white/5 rounded-xl p-2 border border-white/10">
                    <span className="text-[10px] text-sky-400 uppercase font-bold block">Franchises</span>
                    <span className="text-sm font-black text-sky-400 font-mono">{data.teams?.length || 0}</span>
                  </div>
                </div>
              )}

              {/* Upcoming Lot Teaser from real database */}
              {tournamentPreview && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
                        {tournamentPreview.status === 'AVAILABLE' ? 'UPCOMING LOT' : 'RECENT LOT'}
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        LOT #{tournamentPreview.serial_no} • {tournamentPreview.player_name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[11px] font-bold">
                      {tournamentPreview.category || 'General Pool'}
                    </span>
                    <span className="block text-[11px] font-mono text-amber-300 font-bold mt-0.5">
                      Base: ₹{Number(tournamentPreview.base_price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              {/* Franchise Teams Roster Marquee */}
              {data?.teams && data.teams.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Registered Franchises & Available Purses
                  </span>
                  <div className="flex flex-wrap items-center gap-2 max-h-24 overflow-y-auto pr-1">
                    {data.teams.map((tm: any, idx: number) => {
                      const sc = getTeamShortcut(tm.team_name, tm.short_name)
                      return (
                        <div
                          key={tm.team_id || idx}
                          className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs"
                        >
                          <span className="font-mono font-black text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded text-[10px]">
                            {sc}
                          </span>
                          <span className="font-bold text-white truncate max-w-[120px]">{tm.team_name}</span>
                          <span className="font-mono text-emerald-400 font-bold text-[11px]">
                            ₹{Number(tm.balance || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
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
                  <p className="font-mono text-2xl font-black text-amber-400">₹{Number(currentBid).toLocaleString('en-IN')}</p>
                </div>
                {leadingTeamName && (
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">Bidder Team Name</span>
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
          <p className="font-mono text-3xl font-black text-white">₹{Number(currentBid).toLocaleString('en-IN')}</p>
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
          <div className="flex items-center gap-3 overflow-hidden font-mono text-[11px]">
            {data?.teams?.slice(0, 4).map((tm: any, i: number) => (
              <span key={i} className="text-slate-400">
                <b className="text-white">{tm.team_name}:</b> ₹{Number(tm.balance || 0).toLocaleString('en-IN')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
