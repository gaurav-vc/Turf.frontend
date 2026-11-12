import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Trophy,
  Clock,
  Shield,
  RefreshCw,
  Users,
  Sparkles,
  Table as TableIcon,
  LayoutGrid,
  Search,
  X,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { apiClient, resolveMediaUrl } from '@/api/apiClient'

export default function PublicViewerPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Visitor Navigation Tabs
  const [activeTab, setActiveTab] = useState<'teams' | 'players' | 'highlights'>('teams')

  // Selected Team for Roster Drill-Down Modal
  const [selectedTeamRoster, setSelectedTeamRoster] = useState<any | null>(null)

  // Players Tab Controls
  const [playerViewType, setPlayerViewType] = useState<'tabular' | 'grid'>('tabular')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('AVAILABLE') // Default pending
  const [searchPlayer, setSearchPlayer] = useState<string>('')

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

  const player = data?.active_player
  const currentBid = data?.current_bid || 0
  const leadingTeam = data?.highest_bid?.team_name
  const allPlayers = useMemo(() => data?.players_summary || [], [data?.players_summary])
  const categories: string[] = useMemo(() => {
    if (data?.categories?.length) return data.categories
    const set = new Set<string>()
    allPlayers.forEach((p: any) => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [data?.categories, allPlayers])

  // Filtered Players for Players Tab
  const filteredPlayers = useMemo(() => {
    return allPlayers.filter((p: any) => {
      // Category filter
      if (filterCategory !== 'ALL' && (p.category || '').toLowerCase() !== filterCategory.toLowerCase()) {
        return false
      }
      // Status filter
      if (filterStatus !== 'ALL') {
        const pStatus = (p.status || 'AVAILABLE').toUpperCase()
        if (filterStatus === 'AVAILABLE' && pStatus !== 'AVAILABLE') return false
        if (filterStatus === 'SOLD' && pStatus !== 'SOLD') return false
        if (filterStatus === 'UNSOLD' && pStatus !== 'UNSOLD') return false
      }
      // Search query
      if (searchPlayer.trim()) {
        const q = searchPlayer.toLowerCase()
        const matchName = (p.player_name || '').toLowerCase().includes(q)
        const matchSerial = String(p.serial_no || '').includes(q)
        const matchRole = (p.role || '').toLowerCase().includes(q)
        if (!matchName && !matchSerial && !matchRole) return false
      }
      return true
    })
  }, [allPlayers, filterCategory, filterStatus, searchPlayer])

  // Highlight computations
  const topSoldPlayers = useMemo(() => {
    return allPlayers
      .filter((p: any) => p.status === 'SOLD' && (p.sold_price || 0) > 0)
      .sort((a: any, b: any) => (b.sold_price || 0) - (a.sold_price || 0))
      .slice(0, 10)
  }, [allPlayers])

  const teamsRankedByBalance = useMemo(() => {
    const list = [...(data?.teams || [])]
    return list.sort((a: any, b: any) => (b.balance || 0) - (a.balance || 0))
  }, [data?.teams])

  const teamsRankedByMaxBid = useMemo(() => {
    const list = [...(data?.teams || [])]
    return list.sort((a: any, b: any) => (b.max_bid || 0) - (a.max_bid || 0))
  }, [data?.teams])

  // Players bought by currently selected team in modal
  const teamRosterPlayers = useMemo(() => {
    if (!selectedTeamRoster) return []
    const targetId = String(selectedTeamRoster.team_id || selectedTeamRoster.id)
    return allPlayers.filter(
      (p: any) =>
        p.status === 'SOLD' &&
        (String(p.sold_to_id) === targetId ||
          (p.sold_to_name && p.sold_to_name.toLowerCase() === (selectedTeamRoster.team_name || selectedTeamRoster.name || '').toLowerCase()))
    )
  }, [selectedTeamRoster, allPlayers])

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

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-3 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">{data?.auction_name || 'Live Cricket Auction'}</h1>
              <p className="text-xs text-slate-400">Public Spectator Portal • Real-Time Stream</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-950/30 px-3 py-1 text-xs font-bold text-red-400 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-500" /> LIVE
            </span>
          </div>
        </div>

        {/* Live Active Player Block */}
        <div
          className="rounded-3xl border border-slate-800 p-5 md:p-7 shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: '#020b18', backgroundImage: 'none' }}
        >
          {player ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 flex justify-center">
                <div className="h-56 w-48 rounded-2xl border-2 border-amber-500/40 bg-slate-900 overflow-hidden shadow-xl flex items-center justify-center">
                  {player.photo_url ? (
                    <img
                      src={resolveMediaUrl(player.photo_url)}
                      alt={player.player_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Trophy className="h-16 w-16 text-slate-600" />
                  )}
                </div>
              </div>

              <div className="md:col-span-8 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-lg bg-amber-500/20 font-mono text-sm font-bold text-amber-300 px-2.5 py-1">
                    #{player.serial_no || 1}
                  </span>
                  <span className="rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 border border-blue-500/30">
                    {player.category || 'General Pool'}
                  </span>
                  <span className="text-xs text-slate-300 font-semibold bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                    {player.role || 'All-Rounder'}
                  </span>
                </div>

                <h2 className="text-3xl md:text-5xl font-black tracking-tight">{player.player_name}</h2>

                <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                  <span>
                    Batting: <strong className="text-white">{player.batting_style || 'Right Hand'}</strong>
                  </span>
                  <span>
                    Bowling: <strong className="text-white">{player.bowling_style || 'Right Arm'}</strong>
                  </span>
                  <span>
                    Base: <strong className="text-amber-400 font-mono">₹{Number(player.base_price || 0).toLocaleString('en-IN')}</strong>
                  </span>
                </div>

                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-300/80 tracking-wider">Current Leading Bid</span>
                    <p className="font-mono text-3xl sm:text-5xl font-black text-amber-400 mt-0.5">
                      ₹{Number(currentBid).toLocaleString('en-IN')}
                    </p>
                  </div>
                  {leadingTeam && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Highest Bidder</span>
                      <p className="text-lg sm:text-xl font-black text-white">{leadingTeam}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Clock className="h-10 w-10 mx-auto mb-2 text-slate-600 animate-pulse" />
              <h3 className="text-base font-bold text-slate-300">Lot In Transition</h3>
              <p className="text-xs text-slate-500 mt-1">Auctioneer is bringing the next player to the block.</p>
            </div>
          )}
        </div>

        {/* ================= 3 VISITOR TABS NAVIGATION ================= */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'teams'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Teams Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'players'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Players ({allPlayers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('highlights')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'highlights'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Highlights & Rankings</span>
          </button>
        </div>

        {/* ================= TAB 1: TEAMS LEADERBOARD ================= */}
        {activeTab === 'teams' && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Franchise Purse & Squad Leaderboard</span>
              </h3>
              <span className="text-[11px] text-slate-400">💡 Click any team to view acquired players</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {data?.teams?.map((t: any) => {
                const teamColor = t.team_color || t.color || '#3b82f6'
                const maxSquad = t.max_squad || data?.config?.max_squad || data?.max_squad || 12
                const shortcut = t.short_name || t.team_name?.slice(0, 3)?.toUpperCase()

                return (
                  <div
                    key={t.team_id}
                    onClick={() => setSelectedTeamRoster(t)}
                    style={{ borderTop: `4px solid ${teamColor}` }}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm hover:border-amber-400/60 hover:bg-white/10 transition-all flex flex-col justify-between cursor-pointer group"
                    title={`Click to view ${t.team_name} squad roster`}
                  >
                    <div className="flex items-start gap-2.5 mb-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 shadow-xs border border-white/30"
                        style={{ backgroundColor: teamColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-black text-white text-sm block break-words whitespace-normal leading-snug group-hover:text-amber-300 transition">
                          {t.team_name}
                        </span>
                        {shortcut && (
                          <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-white/10 text-slate-300 mt-0.5 inline-block">
                            {shortcut}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1.5 text-xs border-t border-white/10 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Purse Balance:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          ₹{Number(t.balance || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Max Bid:</span>
                        <span className="font-mono font-bold text-amber-300">
                          ₹{Number(t.max_bid || 0).toLocaleString('en-IN')}
                        </span>
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
        )}

        {/* ================= TAB 2: PLAYERS DIRECTORY ================= */}
        {activeTab === 'players' && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl space-y-4">
            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-xl border border-white/10">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Category Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs">
                  <span className="text-slate-400 font-bold">Category:</span>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-transparent text-amber-400 font-extrabold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-white">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auction Status Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs">
                  <span className="text-slate-400 font-bold">Status:</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-transparent text-amber-400 font-extrabold focus:outline-none cursor-pointer"
                  >
                    <option value="AVAILABLE" className="bg-slate-900 text-white">Pending (Available)</option>
                    <option value="SOLD" className="bg-slate-900 text-white">Sold</option>
                    <option value="UNSOLD" className="bg-slate-900 text-white">Unsold</option>
                    <option value="ALL" className="bg-slate-900 text-white">All Statuses</option>
                  </select>
                </div>

                {/* Search Input */}
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search player name or #..."
                    value={searchPlayer}
                    onChange={(e) => setSearchPlayer(e.target.value)}
                    className="bg-transparent text-white placeholder:text-slate-500 focus:outline-none w-36 sm:w-48"
                  />
                  {searchPlayer && (
                    <button onClick={() => setSearchPlayer('')} className="text-slate-400 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* View Type Toggle (Tabular vs Photo Grid) */}
              <div className="flex items-center rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPlayerViewType('tabular')}
                  className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    playerViewType === 'tabular'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Tabular</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerViewType('grid')}
                  className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    playerViewType === 'grid'
                      ? 'bg-amber-500 text-zinc-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Photo Grid</span>
                </button>
              </div>
            </div>

            {/* Results Status Header */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Showing {filteredPlayers.length} players</span>
              <span>Default: Pending category-wise</span>
            </div>

            {filteredPlayers.length === 0 ? (
              <div className="text-center py-16 text-slate-500 border border-dashed border-white/10 rounded-2xl">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="font-bold text-slate-300">No players found matching current filters</p>
                <p className="text-xs text-slate-500 mt-1">Try switching category or auction status filter above.</p>
              </div>
            ) : playerViewType === 'tabular' ? (
              /* TABULAR VIEW */
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] border-b border-white/10 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Player</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3 text-right">Base Price</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Sold Price / Team</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPlayers.map((p: any) => (
                      <tr key={p.id} className="hover:bg-white/5 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-400">#{p.serial_no || '-'}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-white/10 flex items-center justify-center">
                              {p.photo_url ? (
                                <img src={resolveMediaUrl(p.photo_url)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-4 h-4 text-slate-600" />
                              )}
                            </div>
                            <span className="font-bold text-white">{p.player_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                            {p.category || 'General'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{p.role || 'All-Rounder'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          ₹{Number(p.base_price || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3">
                          {p.status === 'SOLD' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                              SOLD
                            </span>
                          ) : p.status === 'UNSOLD' ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black">
                              UNSOLD
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black">
                              PENDING
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {p.status === 'SOLD' ? (
                            <div>
                              <span className="font-mono font-bold text-amber-400 block">
                                ₹{Number(p.sold_price || 0).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate block">{p.sold_to_name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* PHOTO GRID VIEW */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {filteredPlayers.map((p: any) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-cyan-500/40 bg-slate-950 p-2.5 shadow-md flex flex-col justify-between hover:border-cyan-400 transition"
                  >
                    <div>
                      {/* Photo & Badges */}
                      <div className="relative w-full h-36 rounded-lg overflow-hidden bg-slate-900 mb-2 border border-white/10">
                        {p.photo_url ? (
                          <img
                            src={resolveMediaUrl(p.photo_url)}
                            alt={p.player_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users className="w-10 h-10 text-slate-700" />
                          </div>
                        )}
                        <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-black/80 font-mono text-[9px] font-black text-white">
                          #{p.serial_no || '-'}
                        </span>
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-yellow-500 text-black text-[9px] font-black uppercase">
                          {p.category || 'General'}
                        </span>
                      </div>

                      <h4 className="font-black text-sm text-white truncate">{p.player_name}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{p.role || 'All-Rounder'}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 block uppercase">Base</span>
                        <span className="font-mono font-bold text-emerald-400">
                          ₹{Number(p.base_price || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="text-right">
                        {p.status === 'SOLD' ? (
                          <>
                            <span className="text-[9px] text-slate-500 block uppercase">Sold Price</span>
                            <span className="font-mono font-bold text-amber-300">
                              ₹{Number(p.sold_price || 0).toLocaleString('en-IN')}
                            </span>
                          </>
                        ) : p.status === 'UNSOLD' ? (
                          <span className="text-rose-400 text-[10px] font-black">UNSOLD</span>
                        ) : (
                          <span className="text-amber-400 text-[10px] font-black">PENDING</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: HIGHLIGHTS & RANKINGS ================= */}
        {activeTab === 'highlights' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Top 10 Sold Players */}
            <div className="rounded-2xl border border-amber-500/30 bg-slate-900/70 p-5 space-y-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h4 className="font-black text-sm text-white">Top 10 Sold Players</h4>
              </div>

              {topSoldPlayers.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No players sold yet.</p>
              ) : (
                <div className="space-y-2">
                  {topSoldPlayers.map((p: any, idx: number) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs hover:border-amber-400/40 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-white block truncate">{p.player_name}</span>
                          <span className="text-[10px] text-slate-400 truncate block">{p.sold_to_name}</span>
                        </div>
                      </div>
                      <span className="font-mono font-black text-amber-300 shrink-0 ml-2">
                        ₹{Number(p.sold_price || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Teams Ranked by Purse Balance */}
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-5 space-y-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <h4 className="font-black text-sm text-white">Teams by Highest Balance</h4>
              </div>

              <div className="space-y-2">
                {teamsRankedByBalance.map((t: any, idx: number) => (
                  <div
                    key={t.team_id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-white truncate">{t.team_name}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 shrink-0 ml-2">
                      ₹{Number(t.balance || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Teams Ranked by Max Bid */}
            <div className="rounded-2xl border border-blue-500/30 bg-slate-900/70 p-5 space-y-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h4 className="font-black text-sm text-white">Teams by Max Bid Power</h4>
              </div>

              <div className="space-y-2">
                {teamsRankedByMaxBid.map((t: any, idx: number) => (
                  <div
                    key={t.team_id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-white truncate">{t.team_name}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-300 shrink-0 ml-2">
                      ₹{Number(t.max_bid || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TEAM ROSTER DRILL-DOWN MODAL ================= */}
        {selectedTeamRoster && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <div className="bg-slate-950 w-full max-w-2xl rounded-3xl border border-white/20 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow"
                    style={{ backgroundColor: selectedTeamRoster.team_color || selectedTeamRoster.color || '#3b82f6' }}
                  >
                    {selectedTeamRoster.short_name || selectedTeamRoster.team_name?.slice(0, 2)?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedTeamRoster.team_name}</h3>
                    <p className="text-xs text-slate-400">
                      Acquired Squad Roster ({teamRosterPlayers.length} Players)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTeamRoster(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 text-xs">
                <div>
                  <span className="text-slate-400 block">Remaining Purse</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    ₹{Number(selectedTeamRoster.balance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Max Bid Ceiling</span>
                  <span className="font-mono font-black text-amber-300 text-sm">
                    ₹{Number(selectedTeamRoster.max_bid || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Acquired Players List */}
              {teamRosterPlayers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 border border-dashed border-white/10 rounded-2xl">
                  <Users className="w-8 h-8 mx-auto mb-1 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">No players acquired yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {teamRosterPlayers.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 shrink-0 border border-white/10 flex items-center justify-center">
                          {p.photo_url ? (
                            <img src={resolveMediaUrl(p.photo_url)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">{p.player_name}</span>
                          <span className="text-[10px] text-slate-400 block">
                            #{p.serial_no || '-'} • {p.category || 'General'} • {p.role || 'All-Rounder'}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-black text-amber-400 shrink-0 ml-3">
                        ₹{Number(p.sold_price || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTeamRoster(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
