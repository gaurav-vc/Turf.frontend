import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Trophy, Clock, Shield, RefreshCw } from 'lucide-react'
import { apiClient } from '@/api/apiClient'

export default function PublicViewerPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const fetchState = async () => {
      try {
        const res = await apiClient.get(`/v1/auction/public/viewer/${token}/`)
        setData(res.data)
        setError(null)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Unable to load live auction viewer')
      } finally {
        setLoading(false)
      }
    }

    fetchState()
    const timer = setInterval(fetchState, 1500)
    return () => clearInterval(timer)
  }, [token])

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-white">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-950/20 p-8">
          <p className="text-red-400 font-bold mb-2">Live Viewer Notice</p>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </div>
    )
  }

  const player = data?.active_player
  const currentBid = data?.current_bid || 0
  const leadingTeam = data?.highest_bid?.team_name

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-400" />
            <div>
              <h1 className="text-xl md:text-2xl font-black">{data?.auction_name || 'Live Cricket Auction'}</h1>
              <p className="text-xs text-slate-400">Public Spectator Portal • Real-Time Stream</p>
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-950/30 px-3 py-1 text-xs font-bold text-red-400 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-red-500" /> LIVE
          </span>
        </div>

        <div
          className="rounded-3xl border border-slate-800 p-6 md:p-8"
          style={{ backgroundColor: '#020617', backgroundImage: 'none', boxShadow: 'none' }}
        >
          {player ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 flex justify-center">
                <div className="h-56 w-48 rounded-2xl border-2 border-amber-500/40 bg-slate-800 overflow-hidden shadow-xl flex items-center justify-center">
                  {player.photo_url ? (
                    <img src={player.photo_url} alt={player.player_name} className="h-full w-full object-cover" />
                  ) : (
                    <Trophy className="h-16 w-16 text-slate-600" />
                  )}
                </div>
              </div>

              <div className="md:col-span-8 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-amber-500/20 font-mono text-sm font-bold text-amber-300 px-2.5 py-1">
                    #{player.serial_no || 1}
                  </span>
                  <span className="rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1">
                    {player.category || 'General Pool'}
                  </span>
                  <span className="text-xs text-slate-400">{player.role || 'All-Rounder'}</span>
                </div>

                <h2 className="text-3xl md:text-5xl font-black">{player.player_name}</h2>

                <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                  <span>Batting: <strong className="text-white">{player.batting_style || 'Right Hand'}</strong></span>
                  <span>Bowling: <strong className="text-white">{player.bowling_style || 'Right Arm'}</strong></span>
                  <span>Base: <strong className="text-amber-400 font-mono">₹{player.base_price.toLocaleString()}</strong></span>
                </div>

                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase text-amber-300/80">Current Leading Bid</span>
                    <p className="font-mono text-4xl md:text-5xl font-black text-amber-400">
                      ₹{currentBid.toLocaleString()}
                    </p>
                  </div>
                  {leadingTeam && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-slate-400">Highest Bidder</span>
                      <p className="text-xl font-bold text-white">{leadingTeam}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <Clock className="h-12 w-12 mx-auto mb-2 text-slate-600" />
              <h3 className="text-lg font-bold text-slate-300">Lot In Transition</h3>
              <p className="text-xs text-slate-500 mt-1">Auctioneer is queuing the next player to the block.</p>
            </div>
          )}
        </div>

        {/* Franchise Table */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4 flex-wrap whitespace-normal break-words">
            <Shield className="h-4 w-4 text-emerald-400 shrink-0" /> Franchise Purse & Squad Leaderboard
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {data?.teams?.map((t: any) => {
              const teamColor = t.team_color || t.color || '#3b82f6'
              const maxSquad = t.max_squad || data?.config?.max_squad || data?.max_squad || 12
              return (
                <div
                  key={t.team_id}
                  style={{ borderTop: `4px solid ${teamColor}` }}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm hover:border-white/20 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start gap-2.5 mb-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 shadow-xs border border-white/30"
                      style={{ backgroundColor: teamColor }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-black text-white text-sm block break-words whitespace-normal leading-snug">
                        {t.team_name}
                      </span>
                      {t.short_name && (
                        <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-white/10 text-slate-300 mt-0.5 inline-block">
                          {t.short_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs border-t border-white/10 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Balance:</span>
                      <span className="font-mono font-bold text-emerald-400">₹{Number(t.balance || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Max Bid:</span>
                      <span className="font-mono font-bold text-amber-300">₹{Number(t.max_bid || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Players Bought:</span>
                      <span className="font-bold text-white font-mono bg-white/10 px-1.5 py-0.5 rounded text-[11px]">
                        {t.bought || 0} / {maxSquad}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
