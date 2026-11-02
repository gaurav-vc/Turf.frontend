import { useState, useEffect, useRef } from 'react'
import {
  Users, Shield, Plus, Download, Upload, Link2, Search,
  Edit2, Trash2, RefreshCw, Check, Copy, ExternalLink,
  Trophy, Award, Gavel, List, LayoutGrid
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
  const rawUrl = team.logo || team.logo_url
  const resolved = rawUrl ? resolveMediaUrl(rawUrl) : ''
  const teamColor = team.color || '#2563EB'
  const shortName = (team.short_name || team.name?.substring(0, 3) || 'TM').toUpperCase()

  if (resolved && !hasError) {
    return (
      <div className="w-14 h-14 rounded-2xl p-1.5 flex items-center justify-center bg-slate-900 border-2 border-slate-700/80 shadow-md overflow-hidden shrink-0">
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
      className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 border-white/20 text-white font-black text-xs uppercase tracking-wider shadow-md shrink-0 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${teamColor} 0%, #0f172a 100%)`,
      }}
      title={team.name}
    >
      <Shield className="w-4 h-4 opacity-30 absolute top-1 right-1" />
      <span className="relative z-10 text-[13px] font-black tracking-tight">{shortName}</span>
      <span className="relative z-10 text-[8px] font-bold opacity-80 uppercase tracking-widest -mt-0.5">TEAM</span>
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
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')
  const [deletingBulk, setDeletingBulk] = useState(false)

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

  const handleDeleteAllTeams = async () => {
    if (teams.length === 0) return
    if (!confirm(`Are you sure you want to delete ALL ${teams.length} franchise teams? This will release all assigned players back to the available pool. This cannot be undone.`)) return
    try {
      await apiClient.post(`/v1/auction/console/${auctionId}/delete_all_teams/`)
      await loadTeams()
      await loadPlayers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete all teams.')
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

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Are you sure you want to remove player "${playerName}" from this tournament?`)) return
    try {
      await apiClient.delete(`/v1/auction/console/${auctionId}/players/${playerId}/`)
      setSelectedPlayerIds(prev => prev.filter(id => id !== playerId))
      await loadPlayers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove player.')
    }
  }

  const handleDeleteAllPlayers = async () => {
    if (players.length === 0) return
    if (!confirm(`Are you sure you want to delete ALL ${players.length} players from this tournament? This cannot be undone.`)) return
    setDeletingBulk(true)
    try {
      await apiClient.post(`/v1/auction/console/${auctionId}/delete_all_players/`)
      setSelectedPlayerIds([])
      await loadPlayers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete all players.')
    } finally {
      setDeletingBulk(false)
    }
  }

  const handleBulkDeletePlayers = async () => {
    if (selectedPlayerIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedPlayerIds.length} selected player(s)? This cannot be undone.`)) return
    setDeletingBulk(true)
    try {
      await apiClient.post(`/v1/auction/console/${auctionId}/bulk_delete_players/`, {
        player_ids: selectedPlayerIds
      })
      setSelectedPlayerIds([])
      await loadPlayers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete selected players.')
    } finally {
      setDeletingBulk(false)
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

  const isAllSelected = filteredPlayers.length > 0 && filteredPlayers.every((p) => selectedPlayerIds.includes(p.id))
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPlayerIds([])
    } else {
      setSelectedPlayerIds(filteredPlayers.map((p) => p.id))
    }
  }

  const toggleSelectPlayer = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Switcher: Franchise Teams vs Players Sub-Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: '#000000' }}>
            <Users className="w-5 h-5 text-emerald-600" />
            Franchise Teams & Players Management
          </h2>
          <p className="text-xs font-semibold mt-0.5" style={{ color: '#1e293b' }}>
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

              {teams.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAllTeams}
                  className="rounded-xl border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  title="Delete all franchise teams and reset squad allocations"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete All Teams
                </Button>
              )}
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
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-base text-foreground uppercase tracking-wide line-clamp-1">{t.name}</h3>
                              <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-md bg-[#facc15] text-slate-950 font-mono shadow-xs">
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
                      <div className="bg-muted/30 p-3 rounded-2xl border border-border/40 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground font-semibold">Owner:</span>
                          <span className="font-black uppercase text-foreground">{t.owner_name || 'Not assigned'}</span>
                        </div>
                        {t.owner_email && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-mono text-foreground font-bold uppercase">{t.owner_email}</span>
                          </div>
                        )}
                        {t.owner_mobile && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Mobile:</span>
                            <span className="font-mono text-foreground font-bold">{t.owner_mobile}</span>
                          </div>
                        )}
                        {t.manager_name && (
                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                            <span className="text-muted-foreground">Manager:</span>
                            <span className="font-semibold text-foreground">{t.manager_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Financials & Squads Two-Column Hub */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Financials Column */}
                        <div className="flex flex-col gap-2">
                          <div className="p-3 rounded-2xl bg-muted/40 border border-border/40">
                            <span className="text-[11px] font-bold text-muted-foreground block">
                              Team Balance
                            </span>
                            <span className="text-base font-black font-mono text-emerald-600 block mt-0.5">
                              ₹{(t.remaining_budget || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="p-3 rounded-2xl bg-muted/40 border border-border/40">
                            <span className="text-[11px] font-bold text-muted-foreground block">
                              Max. Bid
                            </span>
                            <span className="text-base font-black font-mono text-blue-600 block mt-0.5">
                              ₹{Math.max(0, Math.floor(t.max_bid !== undefined ? t.max_bid : (t.remaining_budget || 0))).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* SQUADS Breakdown Column */}
                        <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-black uppercase text-foreground tracking-wider block text-center mb-1.5">
                              SQUADS
                            </span>
                            <div className="space-y-1 text-xs font-bold">
                              {t.categories_meta && t.categories_meta.length > 0 ? (
                                t.categories_meta.map((cm: any) => {
                                  const acquired = t.category_counts?.[cm.name] || 0
                                  const req = cm.target_count || cm.min_players || cm.max_players || 0
                                  return (
                                    <div key={cm.name} className="flex items-center justify-between text-foreground">
                                      <span className="capitalize">{cm.name}</span>
                                      <span className="font-mono font-black">{acquired}/{req > 0 ? req : (t.max_squad || 11)}</span>
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="flex items-center justify-between text-foreground">
                                  <span>Open</span>
                                  <span className="font-mono font-black">{t.players_count || 0}/{t.max_squad || 11}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="pt-2 border-t border-border/80 mt-2">
                            <div className="flex items-center justify-between text-xs font-black text-foreground">
                              <span>Total</span>
                              <span className="font-mono">{t.players_count || 0}/{t.max_squad || 11}</span>
                            </div>
                          </div>
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
              {/* View Mode Switcher */}
              <div className="flex items-center rounded-xl border border-border bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'list'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Tabular Master List View"
                >
                  <List className="w-3.5 h-3.5" /> List View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'cards'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Visual Cards View styled like PDF Designer"
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Card View
                </button>
              </div>

              {/* Bulk Deletion Actions */}
              {selectedPlayerIds.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDeletePlayers}
                  disabled={deletingBulk}
                  className="rounded-xl text-xs font-bold border-rose-300 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-9 flex items-center gap-1.5 shadow-xs"
                  title="Delete selected players"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  Delete Selected ({selectedPlayerIds.length})
                </Button>
              )}

              {players.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeleteAllPlayers}
                  disabled={deletingBulk}
                  className="rounded-xl text-xs font-bold border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-9 flex items-center gap-1.5 shadow-xs"
                  title="Delete all players from this tournament"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete All Players
                </Button>
              )}

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
          ) : viewMode === 'cards' ? (
            /* Visual Card Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPlayers.map((p) => {
                const isSelected = selectedPlayerIds.includes(p.id)
                const isSold = p.status === 'SOLD'
                const isUnsold = p.status === 'UNSOLD'
                const rawPhoto = p.photo_url || p.photo
                const photoSrc = rawPhoto ? resolveMediaUrl(rawPhoto) : ''
                const playerName = p.player_name || p.name || 'Unknown Player'

                return (
                  <div
                    key={p.id}
                    className={`group relative rounded-2xl border bg-card transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'border-border hover:border-indigo-500/40'
                    }`}
                  >
                    {/* Top Strip (Lot #, Category, Checkbox) */}
                    <div className="p-3 pb-2 flex items-center justify-between gap-2 border-b border-border/70 bg-muted/30">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectPlayer(p.id)}
                          className="rounded border-border text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="font-mono text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          #{p.serial_no || '-'}
                        </span>
                      </div>

                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border truncate max-w-[110px]">
                        {p.category || 'General'}
                      </span>
                    </div>

                    {/* Photo & Player Details */}
                    <div className="p-4 flex flex-col items-center text-center space-y-2.5">
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-muted border-2 border-border shadow-2xs flex items-center justify-center">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={playerName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const fb = e.currentTarget.nextElementSibling
                              if (fb) (fb as HTMLElement).style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div
                          className="w-full h-full flex flex-col items-center justify-center text-muted-foreground font-black text-2xl uppercase bg-gradient-to-br from-indigo-500/10 to-purple-500/10"
                          style={{ display: photoSrc ? 'none' : 'flex' }}
                        >
                          <Users className="w-8 h-8 opacity-40 mb-1" />
                          <span className="text-xs font-bold">{playerName.charAt(0)}</span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`absolute bottom-1 right-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shadow-xs ${
                            isSold
                              ? 'bg-emerald-600 text-white'
                              : isUnsold
                              ? 'bg-rose-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-black text-sm text-foreground line-clamp-1 leading-snug">
                          {playerName}
                        </h4>
                        <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 line-clamp-1">
                          {p.role || p.player_skills || 'All-Rounder'}
                        </p>
                      </div>

                      {/* Style & Details */}
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {p.batting_style && (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                            🏏 {p.batting_style}
                          </span>
                        )}
                        {p.bowling_style && (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                            ⚡ {p.bowling_style}
                          </span>
                        )}
                        {p.location && (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md">
                            📍 {p.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Pricing & Actions */}
                    <div className="p-3 pt-2 bg-muted/20 border-t border-border space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Base Price</span>
                        <span className="font-mono font-black text-foreground">
                          ₹{parseFloat(p.base_price || 0).toLocaleString()}
                        </span>
                      </div>

                      {isSold && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                          <span className="text-[10px] uppercase font-bold text-emerald-600">Hammer Price</span>
                          <span className="font-mono font-black text-emerald-600">
                            ₹{parseFloat(p.sold_price || 0).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {p.sold_to_name && (
                        <div className="text-[11px] font-bold text-foreground truncate pt-1">
                          🏆 {p.sold_to_name}
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-end gap-1 border-t border-border/60">
                        <button
                          onClick={() => {
                            setPlayerToEdit(p)
                            setShowPlayerModal(true)
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(p.id, playerName)}
                          className="p-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Delete Player"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-card rounded-3xl border border-border shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-3 font-bold w-10">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          title="Select all players"
                        />
                      </th>
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
                    {filteredPlayers.map((p) => {
                      const rawPhoto = p.photo_url || p.photo
                      const photoSrc = rawPhoto ? resolveMediaUrl(rawPhoto) : ''
                      const playerName = p.player_name || p.name || 'Unknown'
                      const isSelected = selectedPlayerIds.includes(p.id)

                      return (
                        <tr key={p.id} className={`hover:bg-muted/30 transition-colors ${isSelected ? 'bg-indigo-500/5' : ''}`}>
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectPlayer(p.id)}
                              className="rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono font-black text-muted-foreground">
                            #{p.serial_no || '-'}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {photoSrc ? (
                                <img
                                  src={photoSrc}
                                  alt={playerName}
                                  className="w-9 h-9 rounded-xl object-cover border border-border shadow-2xs"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const fb = e.currentTarget.nextElementSibling
                                    if (fb) (fb as HTMLElement).style.display = 'flex'
                                  }}
                                />
                              ) : null}
                              <div
                                className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-muted-foreground text-xs"
                                style={{ display: photoSrc ? 'none' : 'flex' }}
                              >
                                {playerName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-xs">{playerName}</p>
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
                                onClick={() => handleDeletePlayer(p.id, playerName)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                                title="Delete Player"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
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
