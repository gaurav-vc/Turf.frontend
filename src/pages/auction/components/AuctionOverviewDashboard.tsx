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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            Auction Command Center & Live Analytics
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time quota monitoring, category requirements, franchise financial spending, and re-auction controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => onNavigateTab('live')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Launch Live Auction
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowResetConfirm(true)}
            className="border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            Reset Auction
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading live auction metrics...</div>
      ) : (
        <div className="space-y-6">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                Sold Players
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-emerald-600 font-mono">
                  {data?.sold_count ?? 0}
                </span>
                <span className="text-xs text-slate-400 font-semibold">of {data?.total_players ?? 8} total</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                Unsold / Shortlist
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-rose-600 font-mono">
                  {data?.unsold_count ?? 0}
                </span>
                <span className="text-xs text-slate-400 font-semibold">Round 2 ready</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                Pending on Block
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-blue-600 font-mono">
                  {data?.pending_count ?? 8}
                </span>
                <span className="text-xs text-slate-400 font-semibold">remaining</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                Total Money Spent
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-600 font-mono">
                  ₹{Number(data?.total_spent || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">across {data?.team_count ?? 4} teams</span>
              </div>
            </div>
          </div>

          {/* Re-Auction Alert Callout if Unsold exist */}
          {data?.unsold_count > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
                  Re-Auction Round Available
                </span>
                <h4 className="text-sm font-bold text-zinc-900 mt-0.5">
                  {data.unsold_count} Unsold player{data.unsold_count !== 1 ? 's' : ''} available for second chance bidding
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  If any franchise has incomplete squad quotas, bring back unsold players for this round.
                </p>
              </div>

              <Button
                onClick={handleStartReauction}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold px-4 py-2 shrink-0 shadow-sm"
              >
                Launch Re-Auction Round →
              </Button>
            </div>
          )}

          {/* Category Requirements Progress Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900">Category Requirements & Team Quotas</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Every active franchise must reach the target player quota for each category.
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigateTab('rules')}
                className="text-xs font-bold text-amber-600 hover:text-amber-700"
              >
                Edit Rules & Quotas →
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.categories && data.categories.length > 0 ? (
                data.categories.map((c: any, idx: number) => {
                  const pct = c.team_total ? Math.round((c.team_complete / c.team_total) * 100) : 0
                  return (
                    <div
                      key={c.id || idx}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-zinc-900">{c.name}</h4>
                        <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ₹{Number(c.base_price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-500 font-medium">Target per team:</span>
                        <span className="font-bold text-zinc-900 font-mono">{c.target || 2} players</span>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-500">Teams Complete:</span>
                          <span className="font-bold text-zinc-900">
                            {c.team_complete || 0} / {c.team_total || 4} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className={`h-full transition-all duration-500 ${
                              pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                        <span className="text-emerald-600 font-bold">{c.sold || 0} sold</span>
                        <span>•</span>
                        <span className="text-rose-600 font-bold">{c.unsold || 0} unsold</span>
                        <span>•</span>
                        <span className="text-blue-600 font-bold">{c.pending || 0} pending</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full p-8 border border-dashed border-slate-200 rounded-2xl bg-white text-center text-slate-500 text-xs">
                  No category rules configured yet. Go to Squad Rules & Slabs to add categories.
                </div>
              )}
            </div>
          </div>

          {/* Top 5 Sales Leaderboard */}
          {data?.top_sales && data.top_sales.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Tournament Top Bids Leaderboard
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                    <tr className="border-b border-slate-200">
                      <th className="py-2.5 px-3 w-12">#</th>
                      <th className="py-2.5 px-3">Player Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Winning Franchise</th>
                      <th className="py-2.5 px-3 text-right">Sold Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {data.top_sales.map((s: any, idx: number) => (
                      <tr key={s.id || idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-600">#{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-zinc-900">{s.name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{s.category || 'General'}</td>
                        <td className="py-2.5 px-3 font-bold text-blue-600">{s.team_name}</td>
                        <td className="py-2.5 px-3 text-right font-black font-mono text-emerald-600">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-zinc-900">Reset Entire Auction?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will clear all bids, sales, and purse deductions for this auction. All players will return to <b>AVAILABLE</b> status and all team wallets will be restored to full base budget.
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              ⚠️ This cannot be undone. Make sure you intend to start a completely fresh live bidding session.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(false)}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                disabled={resetting}
                onClick={handleResetAuction}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md"
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
