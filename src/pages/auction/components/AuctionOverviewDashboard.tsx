import { useState, useEffect } from 'react'
import {
  RotateCcw,
  ExternalLink,
  Flame,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'

interface AuctionOverviewDashboardProps {
  auctionId: string
  auctionName?: string
  onNavigateTab: (tabId: string) => void
}

export default function AuctionOverviewDashboard({
  auctionId,
  auctionName: _auctionName,
  onNavigateTab,
}: AuctionOverviewDashboardProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Real-time dynamic category selection & player source
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [playerSource, setPlayerSource] = useState<'pending' | 'reauction'>('pending')
  const [startingAuction, setStartingAuction] = useState(false)
  const [exportingPdf, setExportingPdf] = useState<string | null>(null)

  useEffect(() => {
    loadOverview()
    loadCategories()
  }, [auctionId])

  const loadOverview = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/overview/`)
      setData(res.data)
      if (res.data?.categories && Array.isArray(res.data.categories)) {
        const catNames = res.data.categories.map((c: any) => c.name).filter(Boolean)
        if (catNames.length > 0) {
          setCategories((prev) => {
            const combined = Array.from(new Set([...prev, ...catNames]))
            if (!prev.includes(selectedCategory) && combined.length > 0) {
              setSelectedCategory(combined[0])
            }
            return combined
          })
        }
      }
    } catch (err) {
      console.error('Failed to load overview data', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/categories/?auction=${auctionId}`)
      const items = res.data.results || res.data || []
      const names = items.map((c: any) => c.name).filter(Boolean)
      if (names.length > 0) {
        setCategories((prev) => {
          const combined = Array.from(new Set([...prev, ...names]))
          return combined
        })
        setSelectedCategory((curr) => (curr === 'ALL' && names.length > 0 ? names[0] : curr))
      }
    } catch (err) {
      console.warn('Could not load categories list', err)
    }
  }

  const handleDownloadPdf = async (format: 'auction' | 'category') => {
    setExportingPdf(format)
    try {
      const res = await apiClient.get(
        `/v1/auction/console/${auctionId}/export_cards_pdf/?format=${format}`,
        { responseType: 'blob' }
      )
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Player_Cards_${format.toUpperCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to export PDF', err)
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      window.open(
        `${apiBase}/v1/auction/console/${auctionId}/export_cards_pdf/?format=${format}`,
        '_blank'
      )
    } finally {
      setExportingPdf(null)
    }
  }

  const handleOpenPublicLink = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/public_link/`)
      if (res.data?.public_token) {
        window.open(`${window.location.origin}/auction/live/${res.data.public_token}`, '_blank')
      } else {
        onNavigateTab('spectator')
      }
    } catch (err) {
      onNavigateTab('spectator')
    }
  }

  const handleStartAuction = async () => {
    if (playerSource === 'reauction') {
      setStartingAuction(true)
      try {
        const cat = selectedCategory || 'ALL'
        const res = await apiClient.post(`/v1/auction/console/${auctionId}/reauction/`, {
          category: cat,
        })
        alert(res.data?.message || `Re-auction round initiated for category: ${cat}`)
        window.history.pushState({}, '', `?tab=live&fullscreen=1`)
        onNavigateTab('live')
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to start re-auction')
      } finally {
        setStartingAuction(false)
      }
    } else {
      // Normal pending auction queue: launch directly into full screen arena
      window.history.pushState({}, '', `?tab=live&fullscreen=1`)
      onNavigateTab('live')
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

  return (
    <div className="space-y-6">
      {/* Top Header: Title, Description & Reset Button */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#091b33] tracking-tight">
            Auction Setup
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
            One control centre for starting the auction, monitoring requirements and moving between pending and re-auction players.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            variant="outline"
            onClick={() => setShowResetConfirm(true)}
            className="border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-xs font-extrabold flex items-center gap-1.5 px-4 py-2 rounded-2xl shadow-2xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            Reset Auction
          </Button>
        </div>
      </div>

      {/* Quick Action Badges Bar: EXPORTS, DESIGN, SHARE */}
      <div className="flex flex-wrap items-center gap-3">
        {/* EXPORTS GROUP */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 select-none">
            EXPORTS
          </span>
          <button
            onClick={() => handleDownloadPdf('auction')}
            disabled={exportingPdf !== null}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-800 hover:text-zinc-950 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1"
          >
            {exportingPdf === 'auction' ? 'Generating...' : 'PDF - Auction Format'}
          </button>
          <button
            onClick={() => handleDownloadPdf('category')}
            disabled={exportingPdf !== null}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-800 hover:text-zinc-950 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1"
          >
            {exportingPdf === 'category' ? 'Generating...' : 'PDF - Category Wise'}
          </button>
        </div>

        {/* DESIGN GROUP */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 select-none">
            DESIGN
          </span>
          <button
            onClick={() => onNavigateTab('designer')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-800 hover:text-zinc-950 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition shadow-2xs"
          >
            Auction Page Design
          </button>
          <button
            onClick={() => onNavigateTab('pdf_studio')}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-800 hover:text-zinc-950 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition shadow-2xs"
          >
            PDF Design Studio
          </button>
        </div>

        {/* SHARE GROUP */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 select-none">
            SHARE
          </span>
          <button
            onClick={handleOpenPublicLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-800 hover:text-zinc-950 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition shadow-2xs"
          >
            <span>Public Auction Link</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Dark Navy Hero Card: Launch / Continue Auction */}
      <div
        className="rounded-3xl border border-slate-800 p-6 shadow-2xl text-white space-y-5"
        style={{ backgroundColor: '#07162c' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Title and Subtitle */}
          <div className="space-y-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              LIVE
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Launch / Continue Auction
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Centralized · Category Wise. Choose exactly one player source.
            </p>
          </div>

          {/* Right Controls Row: Category Dropdown, Player Source Radio Cards, and CTA Button */}
          <div className="flex flex-wrap items-end gap-3.5">
            {/* Category Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                CATEGORY
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white text-zinc-900 font-extrabold text-xs rounded-xl px-3.5 py-2.5 border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer min-w-[130px]"
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
            </div>

            {/* Radio Card 1: Pending Players */}
            <div
              onClick={() => setPlayerSource('pending')}
              className={`cursor-pointer rounded-2xl border px-4 py-2.5 transition flex items-center gap-3 select-none ${
                playerSource === 'pending'
                  ? 'border-blue-400 bg-blue-950/70 shadow-md ring-1 ring-blue-400/50'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  playerSource === 'pending'
                    ? 'border-blue-400 bg-blue-500'
                    : 'border-slate-600 bg-transparent'
                }`}
              >
                {playerSource === 'pending' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <div>
                <span className="font-extrabold text-white text-xs block leading-tight">
                  Pending Players
                </span>
                <span className="text-[10px] text-slate-300 block mt-0.5">
                  Continue the normal auction queue
                </span>
              </div>
            </div>

            {/* Radio Card 2: Re-auction Unsold Players */}
            <div
              onClick={() => setPlayerSource('reauction')}
              className={`cursor-pointer rounded-2xl border px-4 py-2.5 transition flex items-center gap-3 select-none ${
                playerSource === 'reauction'
                  ? 'border-blue-400 bg-blue-950/70 shadow-md ring-1 ring-blue-400/50'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  playerSource === 'reauction'
                    ? 'border-blue-400 bg-blue-500'
                    : 'border-slate-600 bg-transparent'
                }`}
              >
                {playerSource === 'reauction' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <div>
                <span className="font-extrabold text-white text-xs block leading-tight">
                  Re-auction Unsold Players
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Offer unsold players again for this category
                </span>
              </div>
            </div>

            {/* Big Action Button */}
            <button
              onClick={handleStartAuction}
              disabled={startingAuction}
              className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs px-5 py-3 rounded-xl shadow-lg transition-all uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer hover:shadow-amber-400/20"
            >
              <span>{startingAuction ? 'STARTING...' : 'START / CONTINUE'}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Key Metrics & KPI Cards */}
      {loading && !data ? (
        <div className="p-12 text-center text-slate-500 font-medium animate-pulse">
          Loading live auction metrics...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                SOLD PLAYERS
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-emerald-600 font-mono">
                  {data?.sold_count ?? 0}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  of {data?.total_players ?? 0} total
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                UNSOLD / SHORTLIST
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
                PENDING ON BLOCK
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-blue-600 font-mono">
                  {data?.pending_count ?? 0}
                </span>
                <span className="text-xs text-slate-400 font-semibold">remaining</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
                TOTAL MONEY SPENT
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-600 font-mono">
                  ₹{Number(data?.total_spent || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  across {data?.team_count ?? 0} teams
                </span>
              </div>
            </div>
          </div>

          {/* Category Requirements Progress Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900">
                  Category Requirements & Team Quotas
                </h3>
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
                        <span className="font-bold text-zinc-900 font-mono">
                          {c.target || 2} players
                        </span>
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                Tournament Top Sold Players
              </h4>
              <div className="divide-y divide-slate-100">
                {data.top_sales.map((p: any, idx: number) => (
                  <div key={p.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center font-bold font-mono text-slate-400">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-zinc-900">{p.name}</span>
                        <span className="text-slate-500 ml-2 text-[11px]">
                          sold to <span className="font-semibold text-zinc-800">{p.team_name}</span>
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-600">
                      ₹{Number(p.sold_price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Resetting Auction */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900">Reset Tournament Auction?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will reset all player statuses back to AVAILABLE, clear all team purse expenditures, and refund wallet balances. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleResetAuction}
                disabled={resetting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
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
