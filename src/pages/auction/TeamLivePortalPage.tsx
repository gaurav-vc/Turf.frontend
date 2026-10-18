import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Shield, RefreshCw } from 'lucide-react'
import { apiClient } from '@/api/apiClient'

export default function TeamLivePortalPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    const fetchState = async () => {
      try {
        const res = await apiClient.get(`/v1/auction/public/viewer/${token}/`)
        setData(res.data)
      } catch (err) {
        console.error('Failed to load team live portal', err)
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

  const player = data?.active_player
  const currentBid = data?.current_bid || 0
  const leadingTeam = data?.highest_bid?.team_name
  const teams = data?.teams || []

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">Franchise Live Team Console</h1>
              <p className="text-xs text-slate-400">Authorized Real-Time Balance & Squad Monitor</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
            ● Live Synchronized
          </span>
        </div>

        <div
          className="rounded-3xl border border-slate-800 p-6"
          style={{ backgroundColor: '#020617', backgroundImage: 'none', boxShadow: 'none' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Current Player on Block</span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-0.5">
                {player ? player.player_name : 'No Active Player'}
              </h2>
              {player && (
                <p className="text-xs text-slate-400 mt-1">
                  #{player.serial_no} • {player.category} • {player.role} • Base: ₹{player.base_price.toLocaleString()}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-right">
              <span className="text-[10px] uppercase text-amber-300">Live Bid</span>
              <p className="font-mono text-3xl font-black text-amber-400">₹{currentBid.toLocaleString()}</p>
              <span className="text-xs text-slate-300">Leading: {leadingTeam || 'None'}</span>
            </div>
          </div>
        </div>

        {/* Franchise Squad & Financial Monitors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t: any) => (
            <div
              key={t.team_id}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div>
                    <h3 className="font-bold text-base text-white">{t.team_name}</h3>
                    <span className="text-[10px] text-slate-400">Franchise Code: {t.short_name}</span>
                  </div>
                  <span className="font-mono text-xs font-black text-amber-400">
                    {t.bought} Bought
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center rounded-lg bg-white/5 p-2">
                    <span className="text-slate-400">Remaining Wallet:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      ₹{t.balance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center rounded-lg bg-white/5 p-2">
                    <span className="text-slate-400">Authoritative Max Bid:</span>
                    <span className="font-mono font-bold text-amber-300 text-sm">
                      ₹{t.max_bid.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center rounded-lg bg-white/5 p-2">
                    <span className="text-slate-400">Spent on Squad:</span>
                    <span className="font-mono text-slate-300">₹{t.spent.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-white/5 text-[11px] text-slate-500">
                Rule-aware Max Bid reserve calculated on server.
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
