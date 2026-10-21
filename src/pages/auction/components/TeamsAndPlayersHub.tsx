import { useState, useEffect, useRef } from 'react'
import {
  Users, Shield, Plus, Download, Upload, Link2, Search,
  Edit2, Trash2, RefreshCw, Check, Copy, ExternalLink,
  Trophy, Award, Gavel
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient, resolveMediaUrl } from '@/api/apiClient'
import TeamEntryModal from './TeamEntryModal'
import PlayerEntryFormModal from './PlayerEntryFormModal'
import AllTeamsRosterSheet from './AllTeamsRosterSheet'

interface TeamsAndPlayersHubProps {
  auctionId: string
  onNavigateToLive?: () => void
}

function TeamLogoBadge({ team }: { team: any }) {
  const [hasError, setHasError] = useState(false)
  const resolved = resolveMediaUrl(team.logo || team.logo_url)

  if (resolved && !hasError) {
    return (
      <div
        className={`w-12 h-12 rounded-2xl p-1 flex items-center justify-center border border-border shadow-xs overflow-hidden ${
          team.remove_logo_background ? 'bg-transparent' : 'bg-muted/40'
        }`}
      >
        <img
          src={resolved}
          alt={team.name}
          className="w-full h-full object-contain"
          onError={() => setHasError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md"
      style={{ backgroundColor: team.color || '#2563EB' }}
    >
      {team.short_name || team.name?.slice(0, 3).toUpperCase() || 'TM'}
    </div>
  )
}

export default function TeamsAndPlayersHub({ auctionId, onNavigateToLive }: TeamsAndPlayersHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'teams' | 'players' | 'report'>('teams')

  // Teams State
  const [teams, setTeams] = useState<any[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [teamToEdit, setTeamToEdit] = useState<any | null>(null)
  const [importingTeams, setImportingTeams] = useState(false)
  const teamFileInputRef = useRef<HTMLInputElement>(null)

  // Players State
  const [players, setPlayers] = useState<any[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [searchPlayer, setSearchPlayer] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'SOLD' | 'UNSOLD'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [categories, setCategories] = useState<string[]>([])
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [playerToEdit, setPlayerToEdit] = useState<any | null>(null)
  const [importingPlayers, setImportingPlayers] = useState(false)
  const playerFileInputRef = useRef<HTMLInputElement>(null)

  // Registration Link Modal State
  const [showRegModal, setShowRegModal] = useState(false)
  const [regLinkData, setRegLinkData] = useState<any>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [savingReg, setSavingReg] = useState(false)
  const [regEnabled, setRegEnabled] = useState(true)
  const [regTitle, setRegTitle] = useState('Player Self-Registration')
  const [regIntro, setRegIntro] = useState('Register to participate in this cricket tournament auction.')

  useEffect(() => {
    loadTeams()
    loadPlayers()
    loadRegistrationLink()
  }, [auctionId])

  // ================= TEAMS LOGIC =================
  const loadTeams = async () => {
    setLoadingTeams(true)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/teams/`)
      setTeams(res.data || [])
    } catch (err) {
      console.error('Failed to load teams', err)
    } finally {
      setLoadingTeams(false)
    }
  }

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to remove team "${teamName}" from this tournament?`)) return
    try {
      await apiClient.delete(`/v1/auction/console/${auctionId}/teams/${teamId}/`)
      await loadTeams()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove team.')
    }
  }

  const handleDownloadTeamTemplate = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/teams_template/`, {
        responseType: 'blob'
      })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'teams_import_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(`${apiClient.defaults.baseURL || ''}/v1/auction/console/${auctionId}/teams_template/`, '_blank')
    }
  }

  const handleTeamFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingTeams(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/bulk_import_teams/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert(`Bulk Team Import Success: ${res.data.imported_count} teams imported!${res.data.errors?.length ? `\nErrors: ${res.data.errors.join(', ')}` : ''}`)
      await loadTeams()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to bulk import teams.')
    } finally {
      setImportingTeams(false)
      if (teamFileInputRef.current) teamFileInputRef.current.value = ''
    }
  }

  // ================= PLAYERS LOGIC =================
  const loadPlayers = async () => {
    setLoadingPlayers(true)
    try {
      const [playerRes, catRes] = await Promise.all([
        apiClient.get(`/v1/auction/players/?auction=${auctionId}`),
        apiClient.get(`/v1/auction/categories/?auction=${auctionId}`),
      ])
      const data = playerRes.data.results || playerRes.data || []
      setPlayers(data)

      let dbCats: string[] = []
      const rawCats = catRes.data.results || catRes.data || []
      if (Array.isArray(rawCats) && rawCats.length > 0) {
        dbCats = rawCats.map((c: any) => c.name).filter(Boolean)
      } else {
        try {
          const rulesRes = await apiClient.get(`/v1/auction/console/${auctionId}/setup_rules/`)
          if (rulesRes.data.categories && Array.isArray(rulesRes.data.categories)) {
            dbCats = rulesRes.data.categories.map((c: any) => c.name).filter(Boolean)
          }
        } catch (_) {}
      }

      const playerCats = data.map((p: any) => p.category).filter(Boolean) as string[]
      const cats = Array.from(new Set([...dbCats, ...playerCats])) as string[]
      setCategories(cats)
    } catch (err) {
      console.error('Failed to load players', err)
    } finally {
      setLoadingPlayers(false)
    }
  }

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Are you sure you want to remove player "${playerName}"?`)) return
    try {
      await apiClient.delete(`/v1/auction/players/${playerId}/`)
      await loadPlayers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete player.')
    }
  }

  const handleDownloadPlayerTemplate = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/players_template/`, {
        responseType: 'blob'
      })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'players_import_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(`${apiClient.defaults.baseURL || ''}/v1/auction/console/${auctionId}/players_template/`, '_blank')
    }
  }

  const handlePlayerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingPlayers(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/bulk_import_players/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert(`Player Bulk Import Success: ${res.data.imported_count} players imported!${res.data.errors?.length ? `\nErrors: ${res.data.errors.join(', ')}` : ''}`)
      await loadPlayers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to bulk import players.')
    } finally {
      setImportingPlayers(false)
      if (playerFileInputRef.current) playerFileInputRef.current.value = ''
    }
  }

  // ================= REGISTRATION LINK LOGIC =================
  const loadRegistrationLink = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/registration_link/`)
      setRegLinkData(res.data)
      if (res.data) {
        setRegEnabled(res.data.enabled !== false)
        if (res.data.title) setRegTitle(res.data.title)
        if (res.data.intro_text) setRegIntro(res.data.intro_text)
      }
    } catch (err) {
      console.error('Failed to load registration link', err)
    }
  }

  const handleSaveRegLink = async () => {
    setSavingReg(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/registration_link/`, {
        enabled: regEnabled,
        title: regTitle,
        intro_text: regIntro,
      })
      setRegLinkData(res.data)
      alert('Registration link settings saved successfully!')
    } catch (err) {
      alert('Failed to update registration link.')
    } finally {
      setSavingReg(false)
    }
  }

  const handleRegenerateToken = async () => {
    if (!confirm('Regenerating will invalidate the previous registration link. Continue?')) return
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/registration_link/`, {
        regenerate: true
      })
      setRegLinkData(res.data)
      alert('New registration link generated!')
    } catch (err) {
      alert('Failed to regenerate token.')
    }
  }

  const registrationUrl = regLinkData?.registration_token
    ? `${window.location.origin}/register/${regLinkData.registration_token}`
    : ''

  const handleCopyLink = () => {
    if (!registrationUrl) return
    navigator.clipboard.writeText(registrationUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  // Filter players
  const filteredPlayers = players.filter((p) => {
    const matchesSearch = (p.player_name || p.name || '').toLowerCase().includes(searchPlayer.toLowerCase()) ||
      (p.role || '').toLowerCase().includes(searchPlayer.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchPlayer.toLowerCase()) ||
      (p.serial_no?.toString() || '').includes(searchPlayer)

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Top Switcher: Franchise Teams vs Players Sub-Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            Franchise Teams & Players Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage franchise registrations, player intake, CSV bulk import, and public online forms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onNavigateToLive && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToLive}
              className="text-xs font-bold rounded-xl border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 flex items-center gap-1.5"
            >
              <Gavel className="w-3.5 h-3.5 text-emerald-500" /> Open Live Console
            </Button>
          )}

          {/* Sub-Page Toggle */}
          <div className="flex items-center rounded-2xl bg-muted p-1 border border-border shadow-xs">
          <button
            onClick={() => setActiveSubTab('teams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'teams'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-500" />
            Franchise Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveSubTab('players')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'players'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            Player Roster ({players.length})
          </button>
          <button
            onClick={() => setActiveSubTab('report')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'report'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            Squad Orders & PDF
          </button>
        </div>
      </div>
    </div>

      {/* ================= VIEW 1: FRANCHISE TEAMS ================= */}
      {activeSubTab === 'teams' && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Franchises ({teams.length})</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTeamTemplate}
                className="text-xs font-bold rounded-xl border-border flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Download Template
              </Button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold cursor-pointer transition shadow-xs">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                {importingTeams ? 'Importing...' : 'Import CSV'}
                <input
                  ref={teamFileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleTeamFileChange}
                  disabled={importingTeams}
                  className="hidden"
                />
              </label>

              <Button
                size="sm"
                onClick={() => {
                  setTeamToEdit(null)
                  setShowTeamModal(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Team
              </Button>
            </div>
          </div>

          {/* Teams Grid */}
          {loadingTeams ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-xs font-bold text-muted-foreground">Loading franchise teams...</span>
            </div>
          ) : teams.length === 0 ? (
            <div className="p-12 border border-dashed border-border rounded-3xl text-center space-y-4 bg-muted/20">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
              <div>
                <h3 className="text-base font-bold">No Franchise Teams Registered</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Add franchise teams manually or download our CSV template to bulk upload all team owners and kitty budgets.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    setTeamToEdit(null)
                    setShowTeamModal(true)
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add First Team
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadTeamTemplate}
                  className="rounded-xl font-bold text-xs"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download Template
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="bg-card rounded-3xl border border-border hover:border-emerald-500/50 transition-all shadow-md overflow-hidden flex flex-col justify-between"
                >
                  {/* Card Header with Team Color Accent */}
                  <div>
                    <div
                      className="h-3 w-full"
                      style={{ backgroundColor: t.color || '#2563EB' }}
                    />
                    <div className="p-5 space-y-4">
                      {/* Brand Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <TeamLogoBadge team={t} />

                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-extrabold text-base text-foreground line-clamp-1">{t.name}</h3>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-muted text-foreground/80 font-mono">
                                {t.short_name}
                              </span>
                            </div>
                            {t.sponsor_name && (
                              <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                                <Award className="w-3 h-3" /> Sponsor: {t.sponsor_name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setTeamToEdit(t)
                              setShowTeamModal(true)
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                            title="Edit Team"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(t.id, t.name)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                            title="Delete Team"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Contacts Box */}
                      <div className="bg-muted/30 p-3 rounded-2xl border border-border/40 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-medium">Owner:</span>
                          <span className="font-bold text-foreground">{t.owner_name || 'Not assigned'}</span>
                        </div>
                        {t.owner_email && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-mono text-muted-foreground">{t.owner_email}</span>
                          </div>
                        )}
                        {t.owner_mobile && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Mobile:</span>
                            <span className="font-mono text-muted-foreground">{t.owner_mobile}</span>
                          </div>
                        )}
                        {t.manager_name && (
                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                            <span className="text-muted-foreground">Manager:</span>
                            <span className="font-semibold">{t.manager_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Financials & Kitty Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Purse Balance
                          </span>
                          <span className="text-sm font-black font-mono text-emerald-600">
                            ₹{(t.remaining_budget || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            Squad Players
                          </span>
                          <span className="text-sm font-black font-mono text-foreground">
                            {t.players_count || 0} Acquired
                          </span>
                        </div>
                      </div>

                      {/* Kitty, Penalty, Reserve breakdown if non-zero */}
                      {(t.additional_kitty > 0 || t.penalty_amount > 0 || t.reserve_amount > 0) && (
                        <div className="flex items-center justify-between text-[11px] font-mono px-1 text-muted-foreground">
                          {t.additional_kitty > 0 && <span>+Kitty: ₹{t.additional_kitty}</span>}
                          {t.penalty_amount > 0 && <span className="text-destructive">-Pen: ₹{t.penalty_amount}</span>}
                          {t.reserve_amount > 0 && <span className="text-amber-500">Res: ₹{t.reserve_amount}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-3 border-t border-border/60 bg-muted/20 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || '#2563EB' }} />
                      Color: {t.color}
                    </span>
                    {t.live_token && (
                      <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Live Token Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 2: PLAYERS INTAKE ================= */}
      {activeSubTab === 'players' && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative w-56 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search player, role, no..."
                  value={searchPlayer}
                  onChange={(e) => setSearchPlayer(e.target.value)}
                  className="pl-8 text-xs h-9 rounded-xl"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-background border border-border text-xs rounded-xl px-2.5 py-1.5 font-bold outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="SOLD">Sold</option>
                <option value="UNSOLD">Unsold</option>
              </select>

              {/* Category Filter */}
              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-background border border-border text-xs rounded-xl px-2.5 py-1.5 font-bold outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPlayerTemplate}
                className="text-xs font-bold rounded-xl border-border flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Download Template
              </Button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold cursor-pointer transition shadow-xs">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                {importingPlayers ? 'Importing...' : 'Bulk Import CSV'}
                <input
                  ref={playerFileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handlePlayerFileChange}
                  disabled={importingPlayers}
                  className="hidden"
                />
              </label>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegModal(true)}
                className="text-xs font-bold rounded-xl border-indigo-500/40 text-indigo-500 hover:bg-indigo-500/10 flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" /> Registration Link
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setPlayerToEdit(null)
                  setShowPlayerModal(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Player
              </Button>
            </div>
          </div>

          {/* Players Table / List */}
          {loadingPlayers ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-xs font-bold text-muted-foreground">Loading player roster...</span>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="p-12 border border-dashed border-border rounded-3xl text-center space-y-4 bg-muted/20">
              <Users className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
              <div>
                <h3 className="text-base font-bold">No Players Found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Add players individually, import using our CSV template, or share the public registration link.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => {
                    setPlayerToEdit(null)
                    setShowPlayerModal(true)
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add Player
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPlayerTemplate}
                  className="rounded-xl font-bold text-xs"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download Template
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-3xl border border-border shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4 font-bold">No.</th>
                      <th className="py-3.5 px-4 font-bold">Player</th>
                      <th className="py-3.5 px-4 font-bold">Category</th>
                      <th className="py-3.5 px-4 font-bold">Role & Style</th>
                      <th className="py-3.5 px-4 font-bold">Base Price</th>
                      <th className="py-3.5 px-4 font-bold">Status</th>
                      <th className="py-3.5 px-4 font-bold">Sold To</th>
                      <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPlayers.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-black text-muted-foreground">
                          #{p.serial_no || '-'}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {p.photo_url ? (
                              <img
                                src={p.photo_url}
                                alt={p.player_name || p.name}
                                className="w-9 h-9 rounded-xl object-cover border border-border shadow-2xs"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-muted-foreground text-xs">
                                {(p.player_name || p.name || 'P')[0]}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-foreground text-xs">{p.player_name || p.name}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {p.age && <span>{p.age} yrs</span>}
                                {p.location && <span>• {p.location}</span>}
                                {p.mobile && <span>• {p.mobile}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px]">
                            {p.category || 'General'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-semibold text-foreground text-xs">{p.role || p.player_skills || 'All-Rounder'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {p.batting_style || 'Right Hand'} • {p.bowling_style || 'Right Arm'}
                          </p>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          ₹{parseFloat(p.base_price || 0).toLocaleString()}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full border ${
                              p.status === 'SOLD'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : p.status === 'UNSOLD'
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {p.sold_to_name ? (
                            <div>
                              <span className="font-bold text-emerald-600">{p.sold_to_name}</span>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                ₹{parseFloat(p.sold_price || 0).toLocaleString()}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setPlayerToEdit(p)
                                setShowPlayerModal(true)
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
                              title="Edit Player"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeletePlayer(p.id, p.player_name || p.name)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                              title="Delete Player"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* ================= VIEW 3: SQUADS ORDER & PDF ================= */}
      {activeSubTab === 'report' && (
        <AllTeamsRosterSheet auctionId={auctionId} />
      )}

      {/* TEAM ENTRY MODAL */}
      <TeamEntryModal
        auctionId={auctionId}
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        onSuccess={loadTeams}
        teamToEdit={teamToEdit}
        existingTeamsCount={teams.length}
      />

      {/* PLAYER ENTRY FORM MODAL */}
      <PlayerEntryFormModal
        auctionId={auctionId}
        isOpen={showPlayerModal}
        onClose={() => setShowPlayerModal(false)}
        onSuccess={loadPlayers}
        playerToEdit={playerToEdit}
      />

      {/* ONLINE REGISTRATION LINK MODAL (GOOGLE FORM STYLE) */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-3xl shadow-2xl border border-border overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Online Player Registration Link</h2>
                  <p className="text-xs text-muted-foreground">Self-registration form for players (like Google Form)</p>
                </div>
              </div>
              <button onClick={() => setShowRegModal(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            {/* Link Copy Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Public Registration URL</label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={registrationUrl}
                  className="font-mono text-xs bg-muted/40 font-semibold"
                />
                <Button
                  onClick={handleCopyLink}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </Button>
                {registrationUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(registrationUrl, '_blank')}
                    className="rounded-xl shrink-0"
                    title="Open Registration Page"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Allow Self-Registration</p>
                  <p className="text-[11px] text-muted-foreground">When enabled, players can register via this link.</p>
                </div>
                <input
                  type="checkbox"
                  checked={regEnabled}
                  onChange={(e) => setRegEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Form Title</label>
                <Input
                  value={regTitle}
                  onChange={(e) => setRegTitle(e.target.value)}
                  placeholder="e.g. Player Registration Form"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold">Introduction / Instructions</label>
                <textarea
                  value={regIntro}
                  onChange={(e) => setRegIntro(e.target.value)}
                  placeholder="Instructions for participants..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateToken}
                className="text-xs text-rose-500 hover:text-rose-600 border-rose-200 hover:bg-rose-50 font-bold rounded-xl"
              >
                Regenerate New Link
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowRegModal(false)} className="rounded-xl">
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveRegLink}
                  disabled={savingReg}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                >
                  {savingReg ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
