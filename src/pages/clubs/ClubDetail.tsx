import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Trophy, Calendar, MapPin, Plus, UserPlus, Key, 
  Activity, Play, Trash2, Sliders, X, Zap, Clock,
  Search, ChevronDown, Check
} from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient, ENDPOINTS } from '@/api/apiClient'
import { useAuthStore } from '@/store/useAuthStore'

function TeamSelectDropdown({
  label,
  value,
  onChange,
  teams,
  excludedTeamName,
  placeholder,
  required = false
}: {
  label: string
  value: string
  onChange: (val: string) => void
  teams: any[]
  excludedTeamName?: string
  placeholder: string
  required?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setSearch(value)
    }
  }, [value, isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const filteredTeams = teams.filter(t => {
    if (excludedTeamName && t.name.toLowerCase() === excludedTeamName.toLowerCase()) {
      return false
    }
    if (!search.trim()) return true
    return t.name.toLowerCase().includes(search.toLowerCase())
  })

  const isCustom = Boolean(
    search.trim() && 
    !teams.some(t => t.name.toLowerCase() === search.trim().toLowerCase())
  )

  return (
    <div ref={containerRef} className="relative">
      <Label className="text-xs font-bold uppercase text-muted-foreground">{label}</Label>
      <div className="relative mt-1">
        <Input
          required={required}
          placeholder={placeholder}
          value={isOpen ? search : value}
          onChange={e => {
            setSearch(e.target.value)
            onChange(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => {
            setSearch(value)
            setIsOpen(true)
          }}
          className="font-bold text-sm pr-16 bg-background cursor-pointer"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
                setSearch('')
              }}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
              title="Clear team"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-transform"
            tabIndex={-1}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-3 py-1.5 bg-muted/40 border-b border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <Search className="w-3 h-3 text-primary" />
                {filteredTeams.length} teams available
              </span>
              {value && <span className="text-emerald-500 font-bold">Selected</span>}
            </div>

            <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
              {filteredTeams.length === 0 && !isCustom && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No matching teams found.
                </div>
              )}

              {filteredTeams.map(team => {
                const isSelected = value.toLowerCase() === team.name.toLowerCase()
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      onChange(team.name)
                      setSearch(team.name)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs font-semibold transition-colors ${
                      isSelected 
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold' 
                        : 'hover:bg-muted/70 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div 
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white shrink-0"
                        style={{ backgroundColor: team.logo_color || '#3b82f6' }}
                      >
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{team.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-2" />}
                  </button>
                )
              })}

              {isCustom && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(search.trim())
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors border-t border-border/40 mt-1"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Use &ldquo;{search.trim()}&rdquo; as team</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ClubDetail() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [club, setClub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'matches' | 'tournaments' | 'members' | 'settings'>('matches')

  // Available teams and turfs for match creation
  const [teams, setTeams] = useState<any[]>([])
  const [turfs, setTurfs] = useState<any[]>([])

  // Modal states
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [showTournamentModal, setShowTournamentModal] = useState(false)

  // Member Management Form
  const [memberForm, setMemberForm] = useState({
    email: '',
    role: 'CO_ADMIN'
  })

  // Match Creation Form (Dynamic Wickets, Ball Type, Ground, Inning Timer, Overs)
  const [matchForm, setMatchForm] = useState({
    team1: '',
    team2: '',
    venue_type: 'TURF' as 'TURF' | 'GROUND',
    turf: '',
    ground_name: '',
    ball_type: 'White Ball', // 'White Ball' | 'Leather Ball' | 'Tennis Ball'
    match_date: new Date().toISOString().slice(0, 16),
    round_name: 'Club Match',
    total_overs: 6,
    team1_players_count: 7,
    team2_players_count: 7,
    wickets_allowed: 6, // 7 players -> 6 wickets configurable
    last_man_stands: false,
    is_last_match: false,
    inning_minutes: 13,
    reminder_seconds: 120
  })

  // Recurring Tournament Form (Dynamic Custom Dates)
  const [tournForm, setTournForm] = useState({
    name: '',
    description: '',
    is_recurring: true,
    recurrence_type: 'CUSTOM_DATES',
    recurring_dates: [] as string[],
    new_date_input: ''
  })

  const [editingSettings, setEditingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    default_inning_minutes: 13,
    default_reminder_seconds: 120,
    default_player_count: 7,
    default_wickets_rule: 6,
    theme_color: '#10b981'
  })

  useEffect(() => {
    fetchClubDetail()
    fetchTeams()
    fetchTurfs()
  }, [id])

  useEffect(() => {
    if (showMatchModal) {
      fetchTeams()
    }
  }, [showMatchModal])

  const fetchClubDetail = async () => {
    try {
      const res = await apiClient.get(`${ENDPOINTS.CLUBS}${id}/`)
      const data = res.data
      setClub(data)
      if (data.customization) {
        const defaultP = Number(data.customization.default_player_count) || 7
        const defaultW = Number(data.customization.default_wickets_rule) || Math.max(1, defaultP - 1)
        const defaultInning = Number(data.customization.default_inning_minutes) || 13
        const defaultRem = Number(data.customization.default_reminder_seconds) || 120
        setMatchForm(prev => ({
          ...prev,
          team1_players_count: defaultP,
          team2_players_count: defaultP,
          wickets_allowed: defaultW,
          inning_minutes: defaultInning,
          reminder_seconds: defaultRem
        }))
        setSettingsForm({
          default_inning_minutes: defaultInning,
          default_reminder_seconds: defaultRem,
          default_player_count: defaultP,
          default_wickets_rule: defaultW,
          theme_color: data.theme_color || '#10b981'
        })
      }
    } catch (err) {
      console.error('Failed to load club', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeams = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.TEAMS)
      setTeams(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to load teams', err)
    }
  }

  const fetchTurfs = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.TURFS)
      setTurfs(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to load turfs', err)
    }
  }

  // Permission Checks: Owner, Co-Owner, or Co-Admin can create matches and tournaments
  const isOwner = club?.is_owner || club?.owner === user?.id
  const userRole = club?.user_role
  const canManage = isOwner || userRole === 'CO_OWNER' || userRole === 'CO_ADMIN'

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberForm.email.trim()) return
    try {
      await apiClient.post(`${ENDPOINTS.CLUBS}${id}/add_member/`, {
        email: memberForm.email.trim(),
        role: memberForm.role
      })
      alert(`User assigned as ${memberForm.role}!`)
      setShowMemberModal(false)
      setMemberForm({ email: '', role: 'CO_ADMIN' })
      fetchClubDetail()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add member.')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    try {
      await apiClient.post(`${ENDPOINTS.CLUBS}${id}/remove_member/`, { user_id: userId })
      fetchClubDetail()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove member.')
    }
  }

  const handleCreateMatch = async (e: React.FormEvent, startImmediately: boolean = false) => {
    e.preventDefault()
    if (!matchForm.team1.trim() || !matchForm.team2.trim()) {
      alert('Please specify both Team A and Team B')
      return
    }
    if (matchForm.team1.trim().toLowerCase() === matchForm.team2.trim().toLowerCase()) {
      alert('Team A and Team B must be different teams')
      return
    }

    try {
      const payload = {
        club: id,
        team1: matchForm.team1.trim(),
        team2: matchForm.team2.trim(),
        venue_type: matchForm.venue_type,
        turf: matchForm.venue_type === 'TURF' ? (matchForm.turf || null) : null,
        ground_name: matchForm.venue_type === 'GROUND' ? (matchForm.ground_name.trim() || 'Open Ground') : (matchForm.ground_name.trim() || undefined),
        ball_type: matchForm.ball_type,
        total_overs: Number(matchForm.total_overs) || 6,
        match_date: matchForm.match_date,
        round_name: matchForm.round_name,
        team1_players_count: Number(matchForm.team1_players_count),
        team2_players_count: Number(matchForm.team2_players_count),
        wickets_allowed: Number(matchForm.wickets_allowed),
        last_man_stands: matchForm.last_man_stands,
        is_last_match: matchForm.is_last_match,
        inning_minutes: Number(matchForm.inning_minutes) || 13,
        reminder_seconds: Number(matchForm.reminder_seconds) || 120
      }

      const res = await apiClient.post(ENDPOINTS.CLUB_MATCHES, payload)
      const newMatch = res.data

      if (startImmediately && newMatch?.id) {
        await apiClient.post(`${ENDPOINTS.CLUB_MATCHES}${newMatch.id}/start_match_day/`, {
          inning_minutes: Number(matchForm.inning_minutes) || 13,
          reminder_seconds: Number(matchForm.reminder_seconds) || 120
        })
        setShowMatchModal(false)
        navigate(`/clubs/matches/${newMatch.id}/live`)
        return
      }

      setShowMatchModal(false)
      fetchClubDetail()
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.detail || 'Failed to create match.')
    }
  }

  const handleStartMatch = async (matchId: string) => {
    try {
      await apiClient.post(`${ENDPOINTS.CLUB_MATCHES}${matchId}/start_match_day/`, {
        inning_minutes: Number(club?.customization?.default_inning_minutes) || 13,
        reminder_seconds: Number(club?.customization?.default_reminder_seconds) || 120
      })
      navigate(`/clubs/matches/${matchId}/live`)
    } catch (err: any) {
      console.error('Failed to start match day', err)
      navigate(`/clubs/matches/${matchId}/live`)
    }
  }

  const handleAddRecurringDate = () => {
    if (!tournForm.new_date_input) return
    setTournForm({
      ...tournForm,
      recurring_dates: [...tournForm.recurring_dates, tournForm.new_date_input],
      new_date_input: ''
    })
  }

  const handleRemoveRecurringDate = (idx: number) => {
    const updated = [...tournForm.recurring_dates]
    updated.splice(idx, 1)
    setTournForm({ ...tournForm, recurring_dates: updated })
  }

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tournForm.name.trim()) return

    try {
      const payload = {
        club: id,
        name: tournForm.name,
        description: tournForm.description,
        is_recurring: tournForm.is_recurring,
        recurrence_type: tournForm.recurrence_type,
        recurrence_dates: tournForm.recurring_dates,
        start_date: tournForm.recurring_dates[0] ? `${tournForm.recurring_dates[0]}T10:00:00Z` : new Date().toISOString()
      }

      await apiClient.post(ENDPOINTS.CLUB_TOURNAMENTS, payload)
      setShowTournamentModal(false)
      fetchClubDetail()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create tournament.')
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const updatedCustomization = {
        ...(club.customization || {}),
        default_inning_minutes: Number(settingsForm.default_inning_minutes),
        default_reminder_seconds: Number(settingsForm.default_reminder_seconds),
        default_player_count: Number(settingsForm.default_player_count),
        default_wickets_rule: Number(settingsForm.default_wickets_rule),
      }
      await apiClient.patch(`${ENDPOINTS.CLUBS}${id}/`, {
        customization: updatedCustomization,
        theme_color: settingsForm.theme_color
      })
      alert('Club dynamic rules updated successfully!')
      setEditingSettings(false)
      fetchClubDetail()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update club settings')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold">Club Not Found</h2>
        <Link to="/clubs">
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">Back to Clubs</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Club Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 border border-emerald-500/30 p-8 shadow-2xl">
        <div 
          className="absolute -right-16 -top-16 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: club.theme_color || '#10b981' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl text-white shadow-xl border-2 border-white/20"
              style={{ backgroundColor: club.theme_color || '#10b981' }}
            >
              {club.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  {club.name}
                </h1>
                {isOwner && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black uppercase">
                    Club Owner
                  </span>
                )}
                {userRole && !isOwner && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase">
                    {userRole}
                  </span>
                )}
              </div>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                {club.description || 'Official club console for match creation and dynamic live scoring.'}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3">
                {club.home_turf_name && (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <MapPin className="w-3.5 h-3.5" /> Home Turf: {club.home_turf_name}
                  </span>
                )}
                <span className="flex items-center gap-1 font-mono bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                  <Key className="w-3 h-3 text-emerald-400" /> Invite: {club.invite_code}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons for Authorized Club Staff */}
          <div className="flex flex-wrap items-center gap-3">
            {canManage && (
              <>
                <Button 
                  onClick={() => setShowMatchModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/25 gap-1.5"
                >
                  <Zap className="w-4 h-4 fill-current" /> Start / Schedule Match
                </Button>
                <Button 
                  onClick={() => setShowTournamentModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black shadow-lg"
                >
                  <Trophy className="w-4 h-4 mr-1.5" /> Add Tournament
                </Button>
                {isOwner && (
                  <Button 
                    onClick={() => setShowMemberModal(true)}
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-bold"
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" /> Appoint Staff
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border/80 gap-6">
        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'matches'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="w-4 h-4" /> Recent & Live Matches ({club.recent_matches?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('tournaments')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'tournaments'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Trophy className="w-4 h-4" /> Tournaments & Series ({club.tournaments?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'members'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" /> Members & Staff ({club.members?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'settings'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sliders className="w-4 h-4" /> Rules & Customization
        </button>
      </div>

      {/* TAB 1: MATCHES */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {(!club.recent_matches || club.recent_matches.length === 0) ? (
            <Card className="border-dashed border-2 bg-transparent text-center p-12">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-bold">No Matches Scheduled Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Schedule a match with custom players, wickets, and inning timers!
              </p>
              {canManage && (
                <Button 
                  onClick={() => setShowMatchModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Schedule Match
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {club.recent_matches.map((m: any) => {
                const isLive = m.status === 'IN_PROGRESS' || m.status === 'TOSS'
                return (
                  <Card key={m.id} className="border-border bg-card/60 backdrop-blur-sm overflow-hidden shadow-md hover:border-emerald-500/40 transition-all p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                          {m.round_name || 'Club Match'}
                        </span>
                        {m.is_last_match && (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-black uppercase">
                            Last Match
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        isLive ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' :
                        m.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-y border-border/60 my-2">
                      <div className="text-center flex-1 font-bold">
                        <div className="text-base font-black text-foreground">{m.team1_name}</div>
                        <div className="text-[11px] text-muted-foreground">{m.team1_players_count} Players</div>
                      </div>
                      <div className="text-xs font-black text-muted-foreground px-3">VS</div>
                      <div className="text-center flex-1 font-bold">
                        <div className="text-base font-black text-foreground">{m.team2_name}</div>
                        <div className="text-[11px] text-muted-foreground">{m.team2_players_count} Players</div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground mt-3 gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>⚡ {m.wickets_allowed} Wkts</span>
                        <span className="font-semibold text-foreground/80">📍 {m.ground_name || m.turf_name || 'Open Ground'}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[10px]">
                          🏏 {m.ball_type || 'White Ball'}
                        </span>
                      </div>

                      {m.status === 'SCHEDULED' ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleStartMatch(m.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1 shadow-md shadow-emerald-600/20"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Start Match Now
                        </Button>
                      ) : (
                        <Link to={`/clubs/matches/${m.id}/live`}>
                          <Button size="sm" className={`${
                            isLive 
                              ? 'bg-red-600 hover:bg-red-700 text-white font-black animate-pulse' 
                              : 'bg-slate-700 hover:bg-slate-600 text-white font-bold'
                          } text-xs gap-1`}>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            {isLive ? 'Live Scoreboard' : 'View Scorecard'}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TOURNAMENTS */}
      {activeTab === 'tournaments' && (
        <div className="space-y-4">
          {(!club.tournaments || club.tournaments.length === 0) ? (
            <Card className="border-dashed border-2 bg-transparent text-center p-12">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-lg font-bold">No Tournaments Created Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Create single or recurring tournaments (e.g. Jan 1, Jan 5, Jan 15, Jan 20 series)
              </p>
              {canManage && (
                <Button 
                  onClick={() => setShowTournamentModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Tournament
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {club.tournaments.map((t: any) => (
                <Card key={t.id} className="border-border bg-card/60 backdrop-blur-sm p-5 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg font-black">{t.name}</CardTitle>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40">
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t.description || 'Club tournament series with dynamic round scheduling.'}
                  </p>

                  {t.is_recurring && t.recurrence_dates && t.recurrence_dates.length > 0 && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/60 mb-3 space-y-1.5">
                      <span className="text-[11px] font-black uppercase text-purple-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Recurring Tournament Dates:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {t.recurrence_dates.map((d: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-bold">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                    <span>{t.matches_count || 0} Matches Scheduled</span>
                    <span className="font-bold text-emerald-400">Recurring Engine Active</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEMBERS & STAFF */}
      {activeTab === 'members' && (
        <Card className="border-border bg-card/60 backdrop-blur-sm p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-foreground">Club Leadership & Members</h3>
              <p className="text-xs text-muted-foreground">
                Owners can assign Co-Owners and Co-Administrators who are empowered to schedule matches and tournaments.
              </p>
            </div>
            {isOwner && (
              <Button 
                onClick={() => setShowMemberModal(true)}
                size="sm" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Staff
              </Button>
            )}
          </div>

          <div className="divide-y divide-border/60">
            {club.members?.map((m: any) => (
              <div key={m.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                    {m.user_details?.email?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">
                      {m.user_details?.full_name || m.user_details?.email}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.user_details?.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    m.role === 'OWNER' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    m.role === 'CO_OWNER' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                    m.role === 'CO_ADMIN' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                    'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                  }`}>
                    {m.role}
                  </span>

                  {isOwner && m.role !== 'OWNER' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveMember(m.user_details?.id)}
                      className="text-red-400 hover:text-red-500 hover:bg-red-500/10 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 4: SETTINGS & CUSTOMIZATION */}
      {activeTab === 'settings' && (
        <Card className="border-border bg-card/60 backdrop-blur-sm p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-foreground">Club Rules & Engine Customization</h3>
              <p className="text-xs text-muted-foreground">
                Fully dynamic match presets configured for this club.
              </p>
            </div>
            {isOwner && (
              <Button 
                onClick={() => setEditingSettings(!editingSettings)}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {editingSettings ? 'Cancel Edit' : 'Edit Dynamic Rules'}
              </Button>
            )}
          </div>

          {editingSettings ? (
            <form onSubmit={handleSaveSettings} className="p-4 rounded-xl bg-muted/30 border border-border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Default Inning Duration (Minutes)</Label>
                  <Input 
                    type="number"
                    min={3}
                    max={120}
                    value={settingsForm.default_inning_minutes}
                    onChange={e => setSettingsForm({ ...settingsForm, default_inning_minutes: Number(e.target.value) })}
                    className="mt-1 font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Reminder Warning (Seconds)</Label>
                  <Input 
                    type="number"
                    min={15}
                    max={600}
                    value={settingsForm.default_reminder_seconds}
                    onChange={e => setSettingsForm({ ...settingsForm, default_reminder_seconds: Number(e.target.value) })}
                    className="mt-1 font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Default Squad Player Count</Label>
                  <Input 
                    type="number"
                    min={2}
                    max={15}
                    value={settingsForm.default_player_count}
                    onChange={e => {
                      const p = Number(e.target.value)
                      setSettingsForm({ 
                        ...settingsForm, 
                        default_player_count: p,
                        default_wickets_rule: Math.max(1, p - 1)
                      })
                    }}
                    className="mt-1 font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Default Wickets Allowed</Label>
                  <Input 
                    type="number"
                    min={1}
                    max={15}
                    value={settingsForm.default_wickets_rule}
                    onChange={e => setSettingsForm({ ...settingsForm, default_wickets_rule: Number(e.target.value) })}
                    className="mt-1 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button type="button" variant="outline" onClick={() => setEditingSettings(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  Save Dynamic Rules
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/20 border border-border/60">
                <span className="text-xs font-black uppercase text-emerald-400">Default Inning Duration</span>
                <p className="text-2xl font-black mt-1">
                  {club.customization?.default_inning_minutes || 13} Minutes
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Stoppage time for break events (e.g. 20s wicket break) is automatically excluded!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/60">
                <span className="text-xs font-black uppercase text-emerald-400">2-Minute Reminder Warning</span>
                <p className="text-2xl font-black mt-1">
                  {club.customization?.default_reminder_seconds || 120} Seconds
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fires an audible audio chime and visual alert HUD when time reaches threshold.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/60">
                <span className="text-xs font-black uppercase text-emerald-400">Squad & Wickets Formula</span>
                <p className="text-2xl font-black mt-1">
                  {club.customization?.default_player_count || 7} Players ➔ {club.customization?.default_wickets_rule || 6} Wickets
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formula: Players - 1 with customizable override for Last Man Stands rules.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/60">
                <span className="text-xs font-black uppercase text-emerald-400">Break Pause Presets</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(club.customization?.pause_presets || [
                    { name: 'Wicket', seconds: 20 },
                    { name: 'Ball Lost', seconds: 60 },
                    { name: 'Strategy', seconds: 90 }
                  ]).map((p: any, idx: number) => (
                    <span key={idx} className="px-2 py-1 rounded bg-black/40 border border-white/10 text-xs font-mono font-bold">
                      {p.name}: {p.seconds}s
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* MODAL: Appoint Staff / Co-Owner */}
      <AnimatePresence>
        {showMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" /> Appoint Club Staff
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors -mr-1 -mt-1"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Co-Owners and Co-Administrators can schedule matches, create tournaments, and operate live scoring.
              </p>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">User Email *</Label>
                  <Input 
                    type="email"
                    required
                    placeholder="e.g. member@example.com"
                    value={memberForm.email}
                    onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Role Designation *</Label>
                  <select
                    value={memberForm.role}
                    onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border text-sm font-bold"
                  >
                    <option value="CO_OWNER">Co-Owner (Full Admin Powers)</option>
                    <option value="CO_ADMIN">Co-Administrator (Can Create Matches & Tournaments)</option>
                    <option value="SCORER">Official Scorer (Live Score Access)</option>
                    <option value="MEMBER">Standard Member</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowMemberModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    Appoint Role
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Schedule or Start Match */}
      <AnimatePresence>
        {showMatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-2xl font-black text-foreground flex items-center gap-2">
                  <Play className="w-6 h-6 text-emerald-400 fill-current" /> Schedule or Start Match
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMatchModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors -mr-1 -mt-1"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Select Team A & Team B, match date, turf venue or open ground, ball type, and dynamic wicket rules & timers.
              </p>

              <form onSubmit={(e) => handleCreateMatch(e, false)} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                {/* Team Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TeamSelectDropdown
                    label="Team A *"
                    placeholder="Search or enter Team A..."
                    value={matchForm.team1}
                    onChange={val => setMatchForm({ ...matchForm, team1: val })}
                    teams={teams}
                    required
                  />

                  <TeamSelectDropdown
                    label="Team B *"
                    placeholder="Search or enter Team B..."
                    value={matchForm.team2}
                    onChange={val => setMatchForm({ ...matchForm, team2: val })}
                    teams={teams}
                    excludedTeamName={matchForm.team1}
                    required
                  />
                </div>

                {/* Match Date & Time */}
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Match Date & Time *</Label>
                  <Input 
                    type="datetime-local"
                    required
                    value={matchForm.match_date}
                    onChange={e => setMatchForm({ ...matchForm, match_date: e.target.value })}
                    className="mt-1"
                  />
                </div>

                {/* Playing Area: Turf vs Open Ground Toggle */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground block">Playing Area (Ground or Turf) *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMatchForm({ ...matchForm, venue_type: 'TURF' })}
                      className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                        matchForm.venue_type === 'TURF'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-muted/40 border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <span className="text-base">🏟️</span>
                      <span>Turf Venue</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchForm({ ...matchForm, venue_type: 'GROUND' })}
                      className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                        matchForm.venue_type === 'GROUND'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-muted/40 border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <span className="text-base">🌿</span>
                      <span>Open Ground</span>
                    </button>
                  </div>

                  {matchForm.venue_type === 'TURF' ? (
                    <div>
                      <Label className="text-[11px] font-bold text-muted-foreground">Select Turf Venue</Label>
                      <select
                        value={matchForm.turf}
                        onChange={e => setMatchForm({ ...matchForm, turf: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border text-sm font-semibold"
                      >
                        <option value="">-- Choose an affiliated turf --</option>
                        {turfs.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.city || 'Local'})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-[11px] font-bold text-muted-foreground">Open Ground Name / Location *</Label>
                      <Input 
                        placeholder="e.g. Shivaji Park Ground, Central Oval, Open Field"
                        value={matchForm.ground_name}
                        onChange={e => setMatchForm({ ...matchForm, ground_name: e.target.value })}
                        className="mt-1 text-sm font-semibold"
                      />
                    </div>
                  )}
                </div>

                {/* Ball Type Selection */}
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">Ball Type *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'White Ball', label: 'White Ball', icon: '⚪' },
                      { id: 'Leather Ball', label: 'Leather Ball', icon: '🔴' },
                      { id: 'Tennis Ball', label: 'Tennis Ball', icon: '🎾' },
                    ].map(ball => (
                      <button
                        key={ball.id}
                        type="button"
                        onClick={() => setMatchForm({ ...matchForm, ball_type: ball.id })}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          matchForm.ball_type === ball.id
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                            : 'bg-muted/30 border-border hover:border-border/80 text-muted-foreground'
                        }`}
                      >
                        <span>{ball.icon}</span>
                        <span>{ball.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Match Day Defaults */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-3">
                  <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Dynamic Match Day Defaults & Timers
                  </h4>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] font-bold">Total Match Overs *</Label>
                      <Input 
                        type="number"
                        min={1}
                        max={50}
                        value={matchForm.total_overs}
                        onChange={e => setMatchForm({ ...matchForm, total_overs: Number(e.target.value) })}
                        className="mt-1 h-9 font-bold"
                        placeholder="e.g. 6 or 10 or 20"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Inning Time (Mins)</Label>
                      <Input 
                        type="number"
                        min={3}
                        max={180}
                        value={matchForm.inning_minutes}
                        onChange={e => setMatchForm({ ...matchForm, inning_minutes: Number(e.target.value) })}
                        className="mt-1 h-9 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Reminder (Secs)</Label>
                      <Input 
                        type="number"
                        min={15}
                        max={600}
                        value={matchForm.reminder_seconds}
                        onChange={e => setMatchForm({ ...matchForm, reminder_seconds: Number(e.target.value) })}
                        className="mt-1 h-9 font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                    <div>
                      <Label className="text-[11px] font-bold">Default Players (e.g. 7)</Label>
                      <Input 
                        type="number"
                        min={2}
                        max={15}
                        value={matchForm.team1_players_count}
                        onChange={e => {
                          const p = Number(e.target.value)
                          setMatchForm({ 
                            ...matchForm, 
                            team1_players_count: p,
                            team2_players_count: p,
                            wickets_allowed: Math.max(1, p - 1)
                          })
                        }}
                        className="mt-1 h-9 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Default Wickets (e.g. 6)</Label>
                      <Input 
                        type="number"
                        min={1}
                        max={15}
                        value={matchForm.wickets_allowed}
                        onChange={e => setMatchForm({ ...matchForm, wickets_allowed: Number(e.target.value) })}
                        className="mt-1 h-9 font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                      <input 
                        type="checkbox"
                        checked={matchForm.last_man_stands}
                        onChange={e => setMatchForm({ ...matchForm, last_man_stands: e.target.checked })}
                        className="rounded border-border"
                      />
                      <span>Last Man Stands Rule</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-red-400">
                      <input 
                        type="checkbox"
                        checked={matchForm.is_last_match}
                        onChange={e => setMatchForm({ ...matchForm, is_last_match: e.target.checked })}
                        className="rounded border-border"
                      />
                      <span>Mark as "Last Match"</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowMatchModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={(e) => handleCreateMatch(e, false)}
                    className="font-bold text-xs"
                  >
                    Schedule Match
                  </Button>
                  <Button 
                    type="button" 
                    onClick={(e) => handleCreateMatch(e, true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
                  >
                    <Zap className="w-4 h-4 fill-current" /> Start Match Now
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Recurring Tournament Engine (Dynamic Dates e.g. Jan 1, Jan 5, Jan 15, Jan 20) */}
      <AnimatePresence>
        {showTournamentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-2xl font-black text-foreground flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-purple-400" /> Create Tournament Series
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTournamentModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors -mr-1 -mt-1"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Configure dynamic recurring dates (e.g. Jan 1, Jan 5, Jan 15, Jan 20).
              </p>

              <form onSubmit={handleCreateTournament} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Tournament Name *</Label>
                  <Input 
                    required
                    placeholder="e.g. Club Champions Trophy 2026"
                    value={tournForm.name}
                    onChange={e => setTournForm({ ...tournForm, name: e.target.value })}
                    className="mt-1 font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
                  <textarea 
                    rows={2}
                    placeholder="Tournament series rules, prizes, and stage details..."
                    value={tournForm.description}
                    onChange={e => setTournForm({ ...tournForm, description: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border text-sm"
                  />
                </div>

                {/* Recurring Dates Engine */}
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Recurring Match Dates Series
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Dynamic & Customizable</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input 
                      type="date"
                      value={tournForm.new_date_input}
                      onChange={e => setTournForm({ ...tournForm, new_date_input: e.target.value })}
                      className="text-xs"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddRecurringDate}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                    >
                      Add Date
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {tournForm.recurring_dates.map((d, idx) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold"
                      >
                        {d}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveRecurringDate(idx)}
                          className="hover:text-red-400 text-purple-300 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowTournamentModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                    Create Tournament
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
