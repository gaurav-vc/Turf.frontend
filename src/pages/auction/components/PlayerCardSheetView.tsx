import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Users, Printer, ArrowLeft,
  ChevronLeft, ChevronRight,
  List, Sliders, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient, resolveMediaUrl } from '@/api/apiClient'

interface PlayerCardSheetViewProps {
  auctionId: string
  auctionName?: string
  onNavigateTab?: (tab: string, extraParams?: Record<string, string>) => void
}

export default function PlayerCardSheetView({
  auctionId,
  auctionName,
  onNavigateTab
}: PlayerCardSheetViewProps) {
  const [searchParams] = useSearchParams()

  const [players, setPlayers] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Filtering state
  const initialFilter = searchParams.get('filter') || searchParams.get('status') || 'PENDING'
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter.toUpperCase())
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Layout & Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const cardsPerPage = 9 // 3x3 layout matching the exact design specification

  // Tournament branding
  const [tournamentLogo, setTournamentLogo] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [auctionId])

  useEffect(() => {
    const f = searchParams.get('filter') || searchParams.get('status')
    if (f) {
      setStatusFilter(f.toUpperCase())
    }
  }, [searchParams])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Players
      const pRes = await apiClient.get(`/v1/auction/console/${auctionId}/players/`)
      const rawPlayers = pRes.data.results || pRes.data || []
      setPlayers(rawPlayers)

      // 2. Fetch Categories & Branding from setup rules
      try {
        const rulesRes = await apiClient.get(`/v1/auction/console/${auctionId}/setup_rules/`)
        const cfg = rulesRes.data?.config || {}
        if (cfg.tournament_logo) {
          setTournamentLogo(cfg.tournament_logo)
        }
        if (rulesRes.data?.categories && Array.isArray(rulesRes.data.categories)) {
          const catNames = rulesRes.data.categories.map((c: any) => c.name).filter(Boolean)
          setCategories(catNames)
        }
      } catch (e) {
        console.warn('Failed to load rules metadata', e)
      }

      // Merge category names from players if any missing
      const playerCats = rawPlayers.map((p: any) => p.category).filter(Boolean) as string[]
      setCategories(prev => Array.from(new Set([...prev, ...playerCats])))
    } catch (err) {
      console.error('Failed to load card sheet data', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtered Players Pool
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const pStatus = String(p.status || '').toUpperCase()
      // Status Match
      let matchesStatus = true
      if (statusFilter === 'PENDING' || statusFilter === 'AVAILABLE') {
        matchesStatus = pStatus === 'AVAILABLE' || pStatus === 'PENDING' || !pStatus
      } else if (statusFilter !== 'ALL') {
        matchesStatus = pStatus === statusFilter
      }

      // Category Match
      const matchesCategory =
        selectedCategory === 'ALL' ||
        (p.category || '').toLowerCase() === selectedCategory.toLowerCase()

      // Search Match
      const q = searchQuery.toLowerCase().trim()
      const pName = String(p.player_name || p.name || '').toLowerCase()
      const pRole = String(p.role || p.player_skills || '').toLowerCase()
      const pLoc = String(p.location || '').toLowerCase()
      const pNo = String(p.serial_no || '')
      const matchesSearch = !q || pName.includes(q) || pRole.includes(q) || pLoc.includes(q) || pNo.includes(q)

      return matchesStatus && matchesCategory && matchesSearch
    })
  }, [players, statusFilter, selectedCategory, searchQuery])

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, selectedCategory, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / cardsPerPage))
  const displayedPlayers = useMemo(() => {
    const start = (currentPage - 1) * cardsPerPage
    return filteredPlayers.slice(start, start + cardsPerPage)
  }, [filteredPlayers, currentPage, cardsPerPage])

  const handlePrint = () => {
    window.print()
  }

  // Category Title for Sheet Header
  const activeCategoryTitle = useMemo(() => {
    if (selectedCategory !== 'ALL') {
      return selectedCategory.toUpperCase()
    }
    if (statusFilter === 'PENDING') {
      return 'PENDING PLAYERS ON BLOCK'
    }
    return 'ALL PLAYERS ROSTER'
  }, [selectedCategory, statusFilter])

  return (
    <div className="space-y-6">
      {/* Top Interactive Toolbar (Hidden in Print) */}
      <div className="print:hidden bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Info & Breadcrumbs */}
        <div className="flex items-center gap-3">
          {onNavigateTab && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('overview')}
              className="rounded-xl text-xs font-bold border-border text-foreground hover:bg-muted h-9 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Button>
          )}
          <div>
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              Player Cards Sheet View
              <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {filteredPlayers.length} Players ({totalPages} {totalPages === 1 ? 'Sheet' : 'Sheets'})
              </span>
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              3x3 visual cards sheet matching the official PDF Designer layout.
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateTab && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('roster', { filter: statusFilter, view: 'list' })}
              className="rounded-xl text-xs font-bold border-border text-foreground hover:bg-muted h-9 flex items-center gap-1.5 shadow-2xs"
              title="Switch to Tabular Master List View"
            >
              <List className="w-3.5 h-3.5 text-blue-600" /> List View
            </Button>
          )}

          {onNavigateTab && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('pdf_studio')}
              className="rounded-xl text-xs font-bold border-indigo-200 dark:border-indigo-900/40 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 h-9 flex items-center gap-1.5 shadow-2xs"
              title="Open full PDF Studio Designer"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" /> PDF Studio Designer
            </Button>
          )}

          <Button
            size="sm"
            onClick={handlePrint}
            className="rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white h-9 shadow-xs flex items-center gap-1.5"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Export PDF
          </Button>
        </div>
      </div>

      {/* Filter Strip & Pagination Controls (Hidden in Print) */}
      <div className="print:hidden bg-card/60 backdrop-blur-md rounded-2xl border border-border/80 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-background border border-border text-xs rounded-xl px-2.5 py-1.5 font-bold outline-none cursor-pointer"
            >
              <option value="PENDING">Pending on Block</option>
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD">Sold</option>
              <option value="UNSOLD">Unsold</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-background border border-border text-xs rounded-xl px-2.5 py-1.5 font-bold outline-none cursor-pointer min-w-[130px]"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search player or lot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background border border-border text-xs rounded-xl px-3 py-1.5 w-44 font-medium outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Page Switcher */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="h-8 w-8 p-0 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-bold text-foreground">
              Sheet {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="h-8 w-8 p-0 rounded-xl"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ================= THE PRINTABLE 9-CARD SHEET CANVAS ================= */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-card rounded-3xl border border-border">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-xs font-bold text-muted-foreground">Loading Player Cards Sheet...</p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="p-16 border-2 border-dashed border-border rounded-3xl text-center space-y-4 bg-card">
          <Users className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
          <div>
            <h3 className="text-base font-bold text-foreground">No Players Matching Filter</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              There are currently no {statusFilter.toLowerCase()} players in category {selectedCategory}.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL')
                setSelectedCategory('ALL')
                setSearchQuery('')
              }}
              className="rounded-xl text-xs font-bold"
            >
              Reset Filters
            </Button>
            {onNavigateTab && (
              <Button
                size="sm"
                onClick={() => onNavigateTab('roster')}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
              >
                Go to Player Setup
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-center w-full overflow-x-auto pb-8">
          {/* Printable Sheet Frame (A4 Landscape aspect, matching image design) */}
          <div
            className="w-full max-w-[1120px] rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden transition-all print:shadow-none print:p-0 print:border-none print:max-w-none"
            style={{
              backgroundColor: '#f8fafc',
              border: '2px solid #cbd5e1',
              minHeight: '760px',
            }}
          >
            {/* Watermark Pattern Background (Silhouettes & Tech Grid matching user's image) */}
            <div
              className="absolute inset-0 pointer-events-none opacity-15"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 30%, #94a3b8 1px, transparent 1px), radial-gradient(circle at 80% 70%, #94a3b8 1px, transparent 1px)`,
                backgroundSize: '36px 36px',
              }}
            />
            {/* Soft Ambient Vector Silhouette Tint */}
            <div
              className="absolute inset-0 pointer-events-none opacity-10 bg-gradient-to-tr from-slate-400 via-transparent to-blue-300"
            />

            {/* 1. Sheet Header Banner (Pill border layout matching screenshot) */}
            <div className="relative z-10 mb-4 px-4 py-2.5 rounded-2xl bg-white/95 border-2 border-blue-400/80 shadow-xs flex items-center justify-between gap-4">
              {/* Left: Category Label */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-wider truncate">
                  CATEGORY: {activeCategoryTitle}
                </span>
              </div>

              {/* Center: Brand Pill (SWEAT style / Tournament Logo) */}
              <div className="flex items-center justify-center shrink-0">
                <div className="px-4 py-1 rounded-xl bg-white border-2 border-blue-500 shadow-2xs flex items-center gap-2">
                  {tournamentLogo ? (
                    <img
                      src={resolveMediaUrl(tournamentLogo)}
                      alt="Brand"
                      className="h-6 object-contain max-w-[100px]"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : null}
                  <span className="font-black text-xs md:text-sm tracking-widest text-slate-950 uppercase">
                    {auctionName ? auctionName.split(' ')[0] : 'SWEAT'}
                  </span>
                </div>
              </div>

              {/* Right: Sub-Header Note */}
              <div className="text-right shrink-0">
                <span className="text-[11px] font-bold text-slate-500">
                  Every category on new page
                </span>
              </div>
            </div>

            {/* 2. 3x3 Card Grid (9 card slots) */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {Array.from({ length: cardsPerPage }).map((_, slotIdx) => {
                const player = displayedPlayers[slotIdx]
                const slotNumber = (currentPage - 1) * cardsPerPage + slotIdx + 1

                // IF NO PLAYER AT THIS SLOT: Render "Card Slot #N Available Slot"
                if (!player) {
                  return (
                    <div
                      key={`empty-${slotIdx}`}
                      className="rounded-2xl border-2 border-dashed border-blue-300/60 bg-white/40 p-5 flex flex-col items-center justify-center text-center min-h-[195px] select-none transition hover:bg-white/60"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200/80 text-slate-500 font-black text-xs flex items-center justify-center mb-1.5 shadow-2xs">
                        #{slotNumber}
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        Card Slot #{slotNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Available Slot
                      </span>
                    </div>
                  )
                }

                // Dynamic Player Data
                const pName = player.player_name || player.name || `Player #${player.serial_no || slotNumber}`
                const pPhotoRaw = player.photo_url || player.photo
                const pPhoto = pPhotoRaw ? resolveMediaUrl(pPhotoRaw) : ''
                const pRole = player.role || player.player_skills || 'All-Rounder (Batting)'
                const pPrice = player.base_price ? `₹${Number(player.base_price).toLocaleString('en-IN')}` : '₹1,00,000'
                const pLoc = player.location || 'Mumbai'
                const pBat = player.batting_style || 'Right Hand Bat'
                const pBowl = player.bowling_style || 'Right Arm ...'
                const pMob = player.mobile || '—'
                const pAge = player.age ? String(player.age) : '—'
                const pExp = player.experience || '—'
                const pAppId = player.application_id || (player.id ? String(player.id).slice(0, 6) : `5...`)

                return (
                  <div
                    key={player.id || slotIdx}
                    className="rounded-2xl border-2 border-blue-500 bg-white shadow-sm overflow-hidden p-3 min-h-[195px] flex flex-col justify-between relative transition hover:shadow-md hover:border-blue-600"
                  >
                    {/* Top Right Badges: Lot # + Template Pill */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-black text-blue-600 font-mono">
                        #{player.serial_no != null ? player.serial_no : slotNumber}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="bg-indigo-600 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-2xs">
                          TEMPLATE
                        </span>
                        <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wide">
                          {player.category || 'cyclone'}
                        </span>
                      </div>
                    </div>

                    {/* Middle Card Body: Photo on Left + Details on Right */}
                    <div className="grid grid-cols-12 gap-3 flex-1 items-start">
                      {/* Photo Container (38% width) */}
                      <div className="col-span-4 h-full min-h-[110px] rounded-xl border border-slate-200 bg-slate-100/90 overflow-hidden flex flex-col items-center justify-center relative shadow-2xs">
                        {pPhoto ? (
                          <img
                            src={pPhoto}
                            alt={pName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fb = e.currentTarget.nextElementSibling
                              if (fb) (fb as HTMLElement).style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div
                          className="w-full h-full flex flex-col items-center justify-center text-slate-400 font-black text-xs uppercase"
                          style={{ display: pPhoto ? 'none' : 'flex' }}
                        >
                          PHOTO
                        </div>
                      </div>

                      {/* Right Detail Block (62% width) */}
                      <div className="col-span-8 space-y-1">
                        <h4 className="font-black text-xs md:text-sm text-slate-900 line-clamp-1 leading-tight">
                          {pName}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-500 line-clamp-1">
                          {pRole}
                        </p>
                        <p className="text-[11px] font-black text-emerald-600 font-mono pt-0.5">
                          Base Price: {pPrice}
                        </p>

                        {/* Two-Column Micro Details */}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] font-semibold text-slate-600 pt-1 border-t border-slate-100">
                          <span className="truncate">Loc: {pLoc}</span>
                          <span className="truncate">Bat: {pBat}</span>
                          <span className="truncate">Bowl: {pBowl}</span>
                          <span className="truncate">Mob: {pMob}</span>
                          <span className="truncate">Age: {pAge}</span>
                          <span className="truncate">Exp: {pExp}</span>
                        </div>
                        <div className="text-[8px] font-mono text-slate-400 pt-0.5">
                          App ID: {pAppId}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
