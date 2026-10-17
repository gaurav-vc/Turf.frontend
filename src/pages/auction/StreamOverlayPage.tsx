import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { apiClient } from '@/api/apiClient'

export default function StreamOverlayPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const overlayType = searchParams.get('type') || 'lower_third' // lower_third | scoreboard | sponsor_strip

  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!token) return

    const fetchState = async () => {
      try {
        const res = await apiClient.get(`/v1/auction/public/viewer/${token}/`)
        setData(res.data)
      } catch (err) {
        console.error('Failed to poll stream overlay', err)
      }
    }

    fetchState()
    const timer = setInterval(fetchState, 1000)
    return () => clearInterval(timer)
  }, [token])

  const player = data?.active_player
  const currentBid = data?.current_bid || 0
  const leadingTeam = data?.highest_bid?.team_name

  return (
    <div className="min-h-screen bg-transparent p-6 flex flex-col justify-end overflow-hidden">
      {/* 1. LOWER THIRD OVERLAY */}
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
                {leadingTeam && (
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">Leading Franchise</span>
                    <p className="text-sm font-extrabold text-white">{leadingTeam}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* 2. LIVE SCOREBOARD OVERLAY */}
      {overlayType === 'scoreboard' && (
        <div className="self-end rounded-2xl border-2 border-amber-500/60 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md min-w-[260px] text-right">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 block mb-1">
            🔴 LIVE AUCTION BLOCK
          </span>
          <p className="font-mono text-3xl font-black text-white">₹{currentBid.toLocaleString()}</p>
          <div className="mt-2 border-t border-white/10 pt-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Bidder:</span>
            <span className="font-bold text-amber-300 truncate max-w-[140px]">{leadingTeam || 'No bid yet'}</span>
          </div>
        </div>
      )}

      {/* 3. SPONSOR STRIP OVERLAY */}
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
