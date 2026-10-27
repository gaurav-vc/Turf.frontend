import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Gavel, Trophy, Wallet, ChevronRight, Copy, RefreshCw, ChevronDown
} from 'lucide-react'
import { apiClient } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import AuctionSuite, { AUCTION_TABS, type TabType } from '../auction/AuctionSuite'

export default function PlayerAuction() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [auctions, setAuctions] = useState<any[]>([])
  const [selectedAuction, setSelectedAuction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const tabFromUrl = (searchParams.get('tab') as TabType) || 'overview'
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl)

  useEffect(() => {
    const currentTab = searchParams.get('tab') as TabType | null
    if (currentTab && currentTab !== activeTab) {
      setActiveTab(currentTab)
    }
  }, [searchParams])

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId)
    const currentTournament = searchParams.get('tournament')
    if (currentTournament) {
      setSearchParams({ tab: tabId, tournament: currentTournament })
    } else {
      setSearchParams({ tab: tabId })
    }
  }

  const fetchAuctions = async () => {
    try {
      const tournamentParam = searchParams.get('tournament')
      const tabParam = searchParams.get('tab')
      const url = tournamentParam
        ? `/v1/auction/auctions/?tournament=${tournamentParam}`
        : '/v1/auction/auctions/'
      const res = await apiClient.get(url)
      const data = res.data.results || res.data || []
      setAuctions(data)

      // If a specific tournament was requested and has an auction, auto-select it immediately
      if (tournamentParam && data.length > 0) {
        setSelectedAuction(data[0])
      } else if (tabParam) {
        if (data.length > 0) {
          const current = data.find((a: any) => a.id === selectedAuction?.id) || data[0]
          setSelectedAuction(current)
        } else {
          // Fallback workspace so all 13 sidebar pages (PDF Cards, Designer, Broadcast, etc.) open immediately!
          setSelectedAuction({
            id: '1',
            name: 'Turf Premier League (Live Auction)',
            status: 'ACTIVE',
            base_budget: 100000,
            teams: [],
            players: [],
          })
        }
      } else if (selectedAuction) {
        const updated = data.find((a: any) => a.id === selectedAuction.id)
        if (updated) setSelectedAuction(updated)
      }
    } catch (err) {
      console.error('Failed to fetch auctions', err)
      // Even if offline/network error, allow user to open pages if a tab is requested
      if (searchParams.get('tab')) {
        setSelectedAuction({
          id: '1',
          name: 'Turf Premier League (Live Auction)',
          status: 'ACTIVE',
          base_budget: 100000,
          teams: [],
          players: [],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuctions()
  }, [searchParams])

  // Clone Auction Settings
  const handleCloneAuction = async (auctionId: string, auctionName: string) => {
    const newName = prompt(`Enter new tournament name to clone settings from "${auctionName}":`, `${auctionName} (Copy)`)
    if (!newName || !newName.trim()) return

    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/clone_settings/`, {
        new_name: newName.trim(),
      })
      alert(res.data.message || 'Tournament cloned successfully!')
      await fetchAuctions()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to clone tournament settings.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading && auctions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        <h2 className="text-xl font-bold animate-pulse text-foreground">Loading TurfArena Live Auctions...</h2>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Banner Header */}
      <div className="border-b border-border/40 bg-card/60 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0">
              <Gavel className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2" style={{ color: '#09090b' }}>
                  <span style={{ color: '#09090b' }}>TurfArena Live Auction</span>
                  {selectedAuction && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {selectedAuction.status}
                    </span>
                  )}
                </h1>

                {/* Dropdown List right to main heading text */}
                {selectedAuction && (
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex items-center">
                      <Trophy className="absolute left-3 w-4 h-4 text-amber-500 pointer-events-none" />
                      <select
                        value={activeTab}
                        onChange={(e) => handleTabChange(e.target.value as TabType)}
                        className="appearance-none pl-9 pr-9 py-1.5 rounded-xl border-2 border-amber-500/50 hover:border-amber-500 bg-white dark:bg-card text-xs md:text-sm font-black text-zinc-900 dark:text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer transition-all"
                      >
                        {AUCTION_TABS.map(({ id, label }) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>

                    {/* Tournament Name Badge right next to dropdown to emit any confusion */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 font-bold text-xs shadow-xs">
                      <span className="text-[10px] uppercase font-black text-amber-600/80 tracking-wider">Tournament:</span>
                      <span className="font-extrabold truncate max-w-[200px] md:max-w-[320px] text-zinc-900 dark:text-amber-300">
                        {selectedAuction.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs md:text-sm font-semibold mt-0.5" style={{ color: '#09090b' }}>
                {selectedAuction ? (
                  <span className="text-emerald-600 font-bold">Live Auction Workspace</span>
                ) : (
                  <span className="text-slate-600 font-medium">Real-time player bidding, franchise purse budgets & squad rosters.</span>
                )}
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            {selectedAuction ? (
              <div className="flex items-center gap-2">
                {/* Switch Tournament Dropdown if multiple exist */}
                {auctions.length > 1 && (
                  <select
                    value={selectedAuction.id}
                    onChange={(e) => {
                      const found = auctions.find((a) => a.id.toString() === e.target.value)
                      if (found) setSelectedAuction(found)
                    }}
                    className="bg-muted border border-border text-xs rounded-xl px-3 py-1.5 font-semibold text-foreground focus:outline-none h-8"
                  >
                    {auctions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAuction(null)
                    setSearchParams({})
                  }}
                  className="rounded-xl font-bold border-border text-xs flex items-center gap-1.5 h-8 px-3 shadow-xs"
                  title="Back to tournaments"
                >
                  ← Back
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloneAuction(selectedAuction.id, selectedAuction.name)}
                  disabled={actionLoading}
                  className="rounded-xl font-bold border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 text-xs flex items-center gap-1.5 h-8 px-3 shadow-xs whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  Clone Settings
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    if (auctions.length > 0) {
                      setSelectedAuction(auctions[0])
                    } else {
                      setSelectedAuction({
                        id: 'default',
                        name: 'Turf Premier League (Live Auction Workspace)',
                        status: 'ACTIVE',
                        base_budget: 100000,
                        teams: [],
                        players: [],
                      })
                    }
                  }}
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Gavel className="w-3.5 h-3.5" /> Open Auction Suite
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {selectedAuction ? (
          /* PHASE 2 V24 SUITE (All 13 Workspaces Integrated) */
          <AuctionSuite
            auctionId={selectedAuction.id}
            auctionName={selectedAuction.name}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onBack={() => {
              setSelectedAuction(null)
              setSearchParams({})
            }}
          />
        ) : (
          /* TOURNAMENT LIST VIEW */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Active & Upcoming Tournaments ({auctions.length})
              </h2>
            </div>

            {auctions.length === 0 ? (
              <div className="p-12 border border-dashed border-border rounded-2xl text-center space-y-4">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-bold">No Auctions Created Yet</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Launch the master workspace directly to manage franchise teams and players.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() => {
                      setSelectedAuction({
                        id: '1',
                        name: 'Turf Premier League (Live Auction Workspace)',
                        status: 'ACTIVE',
                        base_budget: 100000,
                        teams: [],
                        players: [],
                      })
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                  >
                    <Gavel className="w-4 h-4 mr-2" /> Open Master Auction Suite
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {auctions.map((a) => (
                  <motion.div
                    key={a.id}
                    whileHover={{ y: -4 }}
                    onClick={() => setSelectedAuction(a)}
                    className="p-6 rounded-3xl bg-card border border-border/60 hover:border-emerald-500/50 transition-all cursor-pointer shadow-lg hover:shadow-xl group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                        <Gavel className="w-6 h-6 text-amber-500" />
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {a.status}
                      </span>
                    </div>

                    <h3
                      className="text-xl font-black mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1"
                      style={{ color: '#09090b' }}
                    >
                      {a.name}
                    </h3>
                    <p className="text-slate-600 text-xs font-medium mb-4">
                      Organizer: {a.organizer_name || 'Turf Arena'}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-4 bg-muted/40 p-3.5 rounded-2xl border border-border/40 text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Franchises</p>
                        <p className="text-base font-black">{a.teams?.length || 0} Teams</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Player Pool</p>
                        <p className="text-base font-black">{a.players?.length || 0} Players</p>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-border/40 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1">
                          <Wallet className="w-3 h-3 text-emerald-500" /> Base Purse
                        </span>
                        <span className="text-sm font-black text-emerald-500 font-mono">
                          ₹{parseFloat(a.base_budget).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Open Auction Room <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
