import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gavel, Plus, Trophy, Wallet, ChevronRight, Copy, RefreshCw,
  Sparkles, Check, ArrowRight
} from 'lucide-react'
import { apiClient } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import AuctionSuite from '../auction/AuctionSuite'

interface TeamConfig {
  name: string
  captain_name: string
  captain_email: string
  purse: number
  color: string
}

interface PlayerConfig {
  name: string
  role: string
  tier: string
  base_price: number
}

const PRESET_TEAMS: TeamConfig[] = [
  { name: 'Mumbai Titans', captain_name: 'Gaurav Kokane', captain_email: 'gaurav@turf.com', purse: 100000, color: '#2563eb' },
  { name: 'Bangalore Blasters', captain_name: 'Rahul Sharma', captain_email: 'rahul@turf.com', purse: 100000, color: '#dc2626' },
  { name: 'Chennai Superstars', captain_name: 'Aman Verma', captain_email: 'aman@turf.com', purse: 100000, color: '#eab308' },
  { name: 'Delhi Smashers', captain_name: 'Sameer Khan', captain_email: 'sameer@turf.com', purse: 100000, color: '#7c3aed' },
]

const PRESET_PLAYERS: PlayerConfig[] = [
  { name: 'Virat Kohli', role: 'Top-Order Batsman', tier: 'Icon', base_price: 5000 },
  { name: 'Jasprit Bumrah', role: 'Fast Bowler', tier: 'Icon', base_price: 5000 },
  { name: 'Hardik Pandya', role: 'All-Rounder', tier: 'Tier 1', base_price: 4000 },
  { name: 'Rishabh Pant', role: 'Wicket-Keeper', tier: 'Tier 1', base_price: 3500 },
  { name: 'Rashid Khan', role: 'Spin Bowler', tier: 'Tier 1', base_price: 3500 },
  { name: 'Suryakumar Yadav', role: '360 Batsman', tier: 'Tier 1', base_price: 4000 },
  { name: 'Mohammed Shami', role: 'Pace Bowler', tier: 'Tier 2', base_price: 2500 },
  { name: 'Rinku Singh', role: 'Finisher Batsman', tier: 'Tier 2', base_price: 2000 },
]

export default function PlayerAuction() {
  const [searchParams] = useSearchParams()
  const [auctions, setAuctions] = useState<any[]>([])
  const [selectedAuction, setSelectedAuction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Wizard Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)
  const [wizardName, setWizardName] = useState('Turf Premier League Mega Auction')
  const [wizardBasePurse, setWizardBasePurse] = useState<number>(100000)
  const [wizardTeams, setWizardTeams] = useState<TeamConfig[]>(PRESET_TEAMS)
  const [wizardPlayers, setWizardPlayers] = useState<PlayerConfig[]>(PRESET_PLAYERS)

  const fetchAuctions = async () => {
    try {
      const tournamentParam = searchParams.get('tournament')
      const url = tournamentParam
        ? `/v1/auction/auctions/?tournament=${tournamentParam}`
        : '/v1/auction/auctions/'
      const res = await apiClient.get(url)
      const data = res.data.results || res.data || []
      setAuctions(data)

      // If a specific tournament was requested and has an auction, auto-select it immediately
      if (tournamentParam && data.length > 0) {
        setSelectedAuction(data[0])
      } else if (!selectedAuction && data.length > 0 && searchParams.get('tab')) {
        setSelectedAuction(data[0])
      } else if (selectedAuction) {
        const updated = data.find((a: any) => a.id === selectedAuction.id)
        if (updated) setSelectedAuction(updated)
      }
    } catch (err) {
      console.error('Failed to fetch auctions', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuctions()
  }, [searchParams])

  // Setup Wizard Submission
  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const payload: any = {
        name: wizardName,
        base_budget: wizardBasePurse,
        status: 'PENDING',
        teams: wizardTeams,
        players: wizardPlayers,
      }
      const tournamentParam = searchParams.get('tournament')
      if (tournamentParam) {
        payload.tournament = tournamentParam
      }
      const res = await apiClient.post('/v1/auction/auctions/create_full/', payload)
      setIsWizardOpen(false)
      await fetchAuctions()
      setSelectedAuction(res.data)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initialize tournament auction.')
    } finally {
      setActionLoading(false)
    }
  }

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
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Gavel className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
                TurfArena Live Auction
                {selectedAuction && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {selectedAuction.status}
                  </span>
                )}
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm font-medium">
                {selectedAuction
                  ? `${selectedAuction.name} • Phase 2 (V24) Master Workspace`
                  : 'Real-time player bidding, franchise purse budgets & squad rosters.'}
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedAuction ? (
              <>
                {/* Switch Tournament Dropdown if multiple exist */}
                {auctions.length > 1 && (
                  <select
                    value={selectedAuction.id}
                    onChange={(e) => {
                      const found = auctions.find((a) => a.id.toString() === e.target.value)
                      if (found) setSelectedAuction(found)
                    }}
                    className="bg-muted border border-border text-xs rounded-xl px-3 py-2 font-semibold text-foreground focus:outline-none"
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
                  onClick={() => setSelectedAuction(null)}
                  className="rounded-xl font-bold border-border text-xs"
                >
                  All Tournaments
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloneAuction(selectedAuction.id, selectedAuction.name)}
                  disabled={actionLoading}
                  className="rounded-xl font-bold border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 text-xs flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  Clone Settings
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setWizardTeams(PRESET_TEAMS)
                  setWizardPlayers(PRESET_PLAYERS)
                  setWizardStep(1)
                  setIsWizardOpen(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-2 text-xs"
              >
                <Plus className="w-4 h-4" /> Setup & Configure Auction
              </Button>
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
            onBack={() => setSelectedAuction(null)}
          />
        ) : (
          /* TOURNAMENT LIST VIEW */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Active & Upcoming Tournaments ({auctions.length})
              </h2>

              <Button
                onClick={() => {
                  setWizardTeams(PRESET_TEAMS)
                  setWizardPlayers(PRESET_PLAYERS)
                  setWizardStep(1)
                  setIsWizardOpen(true)
                }}
                variant="outline"
                size="sm"
                className="rounded-xl font-bold border-border text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> New Auction
              </Button>
            </div>

            {auctions.length === 0 ? (
              <div className="p-12 border border-dashed border-border rounded-2xl text-center space-y-4">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-bold">No Auctions Created Yet</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set up your first tournament auction with franchise teams and player catalogs in 1 click.
                  </p>
                </div>
                <Button
                  onClick={() => setIsWizardOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" /> Start Setup Wizard
                </Button>
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

                    <h3 className="text-xl font-black mb-1 group-hover:text-emerald-500 transition-colors line-clamp-1">
                      {a.name}
                    </h3>
                    <p className="text-muted-foreground text-xs mb-4">
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

      {/* SETUP WIZARD MODAL */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl border border-border overflow-hidden p-6 md:p-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Auction Setup Wizard</h2>
                    <p className="text-xs text-muted-foreground">Step {wizardStep} of 3</p>
                  </div>
                </div>
                <button onClick={() => setIsWizardOpen(false)} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              <form onSubmit={handleWizardSubmit} className="mt-6 space-y-6">
                {/* STEP 1: Basic Config */}
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-bold">Tournament Name</Label>
                      <Input
                        value={wizardName}
                        onChange={(e) => setWizardName(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Team Base Purse (₹)</Label>
                      <Input
                        type="number"
                        value={wizardBasePurse}
                        onChange={(e) => setWizardBasePurse(parseInt(e.target.value) || 0)}
                        required
                        className="mt-1 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: Teams Preview */}
                {wizardStep === 2 && (
                  <div className="space-y-3">
                    <Label className="text-xs font-bold block">Franchise Teams ({wizardTeams.length})</Label>
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                      {wizardTeams.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/40 text-xs">
                          <span className="font-bold">{t.name}</span>
                          <span className="text-muted-foreground">Purse: ₹{t.purse.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3: Players Preview */}
                {wizardStep === 3 && (
                  <div className="space-y-3">
                    <Label className="text-xs font-bold block">Player Pool ({wizardPlayers.length})</Label>
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                      {wizardPlayers.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/40 text-xs">
                          <div>
                            <span className="font-bold">{p.name}</span>
                            <span className="text-muted-foreground ml-2">({p.role})</span>
                          </div>
                          <span className="font-mono text-emerald-500 font-bold">Base: ₹{p.base_price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  {wizardStep > 1 ? (
                    <Button type="button" variant="outline" onClick={() => setWizardStep((prev) => (prev - 1) as any)}>
                      Back
                    </Button>
                  ) : <div />}

                  {wizardStep < 3 ? (
                    <Button type="button" onClick={() => setWizardStep((prev) => (prev + 1) as any)} className="bg-emerald-600 text-white font-bold">
                      Next Step <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={actionLoading} className="bg-emerald-600 text-white font-bold">
                      <Check className="w-4 h-4 mr-1" /> {actionLoading ? 'Initializing...' : 'Complete & Launch Auction'}
                    </Button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
