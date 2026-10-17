import { useState, useEffect } from 'react'
import { BarChart3, Flame, RotateCcw, Play, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'

interface AuctionOverviewDashboardProps {
  auctionId: string
  onNavigateTab: (tabId: string) => void
}

export default function AuctionOverviewDashboard({ auctionId, onNavigateTab }: AuctionOverviewDashboardProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    loadOverview()
  }, [auctionId])

  const loadOverview = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/overview/`)
      setData(res.data)
    } catch (err) {
      console.error('Failed to load overview data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetAuction = async () => {
    setResetting(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/reset_auction/`)
      alert(res.data?.message || 'Auction reset successfully!')
      setShowResetConfirm(false)
      loadOverview()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset auction')
    } finally {
      setResetting(false)
    }
  }

  const handleStartReauction = async () => {
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/reauction/`, {
        category: 'ALL',
      })
      alert(res.data?.message || 'Re-auction round initiated!')
      onNavigateTab('live')
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start re-auction')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            Auction Command Center & Live Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time quota monitoring, category requirements, franchise financial spending, and re-auction controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => onNavigateTab('live')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Launch Live Auction
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowResetConfirm(true)}
            className="border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            Reset Auction
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading auction metrics...</div>
      ) : !data ? (
        <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
          Auction statistics unavailable.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Sold Players
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-emerald-400 font-mono">
                  {data.sold_count}
                </span>
                <span className="text-xs text-slate-400">of {data.total_players} total</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Unsold / Shortlist
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-rose-400 font-mono">
                  {data.unsold_count}
                </span>
                <span className="text-xs text-slate-400">Round 2 ready</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Pending on Block
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-sky-400 font-mono">
                  {data.pending_count}
                </span>
                <span className="text-xs text-slate-400">remaining</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                Total Money Spent
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  ₹{Number(data.total_spent || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-400">across {data.team_count} teams</span>
              </div>
            </div>
          </div>

          {/* Re-Auction Alert Callout if Unsold exist */}
          {data.unsold_count > 0 && (
            <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-600/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  Re-Auction Round Available
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {data.unsold_count} Unsold player{data.unsold_count !== 1 ? 's' : ''} available for second chance bidding
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  If any franchise has incomplete squad quotas, bring back unsold players for this round.
                </p>
              </div>

              <Button
                onClick={handleStartReauction}
                className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold px-4 py-2 shrink-0"
              >
                Launch Re-Auction Round →
              </Button>
            </div>
          )}

          {/* Category Requirements Progress Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Category Requirements & Team Quotas</h3>
                <p className="text-[11px] text-slate-400">
                  Every active franchise must reach the target player quota for each category.
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigateTab('rules')}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                Edit Rules & Quotas →
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.categories && data.categories.length > 0 ? (
                data.categories.map((c: any) => {
                  const pct = c.team_total ? Math.round((c.team_complete / c.team_total) * 100) : 0
                  return (
                    <div
                      key={c.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="text-sm font-bold text-white">{c.name}</h4>
                        <span className="text-xs font-mono font-semibold text-emerald-400">
                          ₹{Number(c.base_price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-400">Target per team:</span>
                        <span className="font-bold text-white font-mono">{c.target} players</span>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Teams Complete:</span>
                          <span className="font-bold text-white">
                            {c.team_complete} / {c.team_total} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-500 ${
                              pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                        <span>{c.sold} sold</span>
                        <span>•</span>
                        <span>{c.unsold} unsold</span>
                        <span>•</span>
                        <span>{c.pending} pending</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full p-6 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                  No category rules configured yet. Go to Squad Rules & Slabs to add categories.
                </div>
              )}
            </div>
          </div>

          {/* Top 5 Sales Leaderboard */}
          {data.top_sales && data.top_sales.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Tournament Top Bids Leaderboard
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                    <tr className="border-b border-slate-800">
                      <th className="py-2 px-3 w-12">#</th>
                      <th className="py-2 px-3">Player Name</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Winning Franchise</th>
                      <th className="py-2 px-3 text-right">Sold Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-200">
                    {data.top_sales.map((s: any, idx: number) => (
                      <tr key={s.id || idx} className="hover:bg-slate-800/20">
                        <td className="py-2 px-3 font-mono font-bold text-amber-400">#{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-white">{s.name}</td>
                        <td className="py-2 px-3 text-slate-300">{s.category || 'General'}</td>
                        <td className="py-2 px-3 font-bold text-sky-400">{s.team_name}</td>
                        <td className="py-2 px-3 text-right font-black font-mono text-emerald-400">
                          ₹{Number(s.sold_price || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Reset Entire Auction?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This action will clear all bids, sales, and purse deductions for this auction. All players will return to <b>AVAILABLE</b> status and all team wallets will be restored to full base budget.
            </p>

            <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg text-[11px] text-rose-300">
              ⚠️ This cannot be undone. Make sure you intend to start a completely fresh live bidding session.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowResetConfirm(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                disabled={resetting}
                onClick={handleResetAuction}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                {resetting ? 'Resetting...' : 'Yes, Reset Auction'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
