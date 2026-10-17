import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Trophy, Calendar, Users, MapPin, ShieldCheck, Activity, UserPlus, Info, Gavel, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { apiClient, ENDPOINTS } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/useAuthStore'

interface Tournament {
  id: string
  name: string
  sport_name: string
  organizer: number | string
  organizer_name: string
  tournament_type: string
  privacy: string
  status: string
  start_date: string | null
  venue: string
  teams: any[]
  matches?: any[]
}

export default function TournamentDetail() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [myTeams, setMyTeams] = useState<any[]>([])
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [registering, setRegistering] = useState(false)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteSearchQuery, setInviteSearchQuery] = useState('')
  const [inviteSearchResults, setInviteSearchResults] = useState<any[]>([])
  const [invitingTeamId, setInvitingTeamId] = useState<string | null>(null)
  const [generatingBracket, setGeneratingBracket] = useState(false)
  const [tournamentAuction, setTournamentAuction] = useState<any | null>(null)

  useEffect(() => {
    fetchTournament()
    fetchMyTeams()
    fetchTournamentAuction()
  }, [id])

  const fetchTournamentAuction = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/auctions/?tournament=${id}`)
      const list = res.data.results || res.data || []
      if (list.length > 0) {
        setTournamentAuction(list[0])
      }
    } catch (err) {
      console.error('Failed to load tournament auction', err)
    }
  }

  const isOrganizer = user?.id == tournament?.organizer

  const fetchMyTeams = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.TEAMS)
      if (Array.isArray(res.data)) {
        setMyTeams(res.data)
      } else {
        setMyTeams(res.data?.results || [])
      }
    } catch (err) {
      console.error('Failed to fetch user teams', err)
    }
  }

  const fetchTournament = async () => {
    try {
      const res = await apiClient.get(`${ENDPOINTS.TOURNAMENTS}${id}/`)
      setTournament(res.data)
    } catch (err) {
      console.error('Failed to fetch tournament details', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterTeam = async () => {
    if (!selectedTeamId) {
      alert('Please select a team to register!')
      return
    }
    setRegistering(true)
    try {
      await apiClient.post(ENDPOINTS.TOURNAMENT_TEAMS, {
        tournament: id,
        team: selectedTeamId
      })
      alert('Successfully registered for the tournament!')
      setShowRegisterModal(false)
      fetchTournament() // Refresh teams list
    } catch (err: any) {
      console.error('Failed to register', err)
      if (err.response?.status === 400) {
        alert('This team is already registered for this tournament!')
      } else {
        alert('Failed to register team. Please try again.')
      }
    } finally {
      setRegistering(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground">Tournament Not Found</h2>
        <Link to="/tournaments" className="text-brand hover:underline mt-4 inline-block">Return to Tournaments Hub</Link>
      </div>
    )
  }

  const handleSearchToInvite = async (q: string) => {
    setInviteSearchQuery(q)
    if (q.length < 2) {
      setInviteSearchResults([])
      return
    }
    try {
      const res = await apiClient.get(`${ENDPOINTS.SEARCH}?q=${encodeURIComponent(q)}`)
      // Only show TEAM results
      setInviteSearchResults(res.data.filter((item: any) => item.type === 'TEAM'))
    } catch (err) {
      console.error('Search failed', err)
    }
  }

  const handleSendInvite = async (teamId: string) => {
    setInvitingTeamId(teamId)
    try {
      await apiClient.post(`${ENDPOINTS.TOURNAMENTS}${id}/invite_team/`, {
        team_id: teamId
      })
      alert('Invitation sent successfully! The team owner has been notified.')
      setShowInviteModal(false)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send invitation.')
    } finally {
      setInvitingTeamId(null)
    }
  }

  const handleGenerateBracket = async () => {
    if (!window.confirm('Are you sure you want to generate the bracket? No more teams can join after this.')) return;
    setGeneratingBracket(true)
    try {
      await apiClient.post(`${ENDPOINTS.TOURNAMENTS}${id}/generate_bracket/`, {})
      alert('Bracket generated successfully! The tournament is now ONGOING.')
      fetchTournament() // Refresh to see matches
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate bracket.')
    } finally {
      setGeneratingBracket(false)
    }
  }

  return (
    <div className="pb-24 bg-background min-h-screen text-foreground">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white overflow-hidden shadow-xl">
        {/* Subtle Sports Radial Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/30 pointer-events-none" />
        
        <div className="relative z-10 px-6 sm:px-8 md:px-12 pt-6 pb-8 md:pb-10 min-h-[260px] md:min-h-[300px] flex flex-col justify-between">
          {/* Top Bar with Clean Back Link (Does NOT overlap trophy) */}
          <div className="mb-6">
            <Link 
              to="/tournaments" 
              className="inline-flex items-center gap-2 text-white/90 hover:text-white bg-black/20 hover:bg-black/35 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold border border-white/15 transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All Tournaments
            </Link>
          </div>

          {/* Header Title + Trophy Badge + Actions */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-5 sm:gap-6 flex-1 min-w-0"
            >
              {/* Trophy Badge */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-white/15 backdrop-blur-xl rounded-2xl md:rounded-3xl flex items-center justify-center border border-white/25 shadow-2xl shrink-0 ring-4 ring-white/10">
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-white drop-shadow-md" />
              </div>

              {/* Title & Meta Info */}
              <div className="min-w-0 flex-1">
                {tournament.sport_name ? (
                  <span className="inline-block px-3 py-0.5 bg-white/20 backdrop-blur-md rounded-md text-xs font-black tracking-wider uppercase mb-2 border border-white/20 shadow-sm text-white">
                    {tournament.sport_name}
                  </span>
                ) : (
                  <span className="inline-block px-3 py-0.5 bg-white/20 backdrop-blur-md rounded-md text-xs font-black tracking-wider uppercase mb-2 border border-white/20 shadow-sm text-white">
                    TOURNAMENT
                  </span>
                )}
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-md leading-tight break-words">
                  {tournament.name}
                </h1>
                <p className="text-white/90 font-medium text-sm sm:text-base flex items-center mt-2 drop-shadow-sm">
                  <MapPin className="w-4 h-4 mr-1.5 shrink-0 text-emerald-200" />
                  {tournament.venue || 'Ace Arena'}
                </p>
              </div>
            </motion.div>
            
            {/* Header Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="flex flex-wrap items-center gap-3 shrink-0"
            >
              {isOrganizer && (
                <Button 
                  size="lg" 
                  onClick={() => setShowInviteModal(true)}
                  className="h-12 px-5 text-sm sm:text-base font-bold bg-white/20 backdrop-blur-md text-white border border-white/30 hover:bg-white/30 transition-all rounded-xl shadow-sm"
                >
                  Invite Team
                </Button>
              )}
              <Link to={`/auction?tournament=${tournament.id}`}>
                <Button 
                  size="lg" 
                  className="h-12 px-5 text-sm sm:text-base font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg hover:shadow-amber-500/25 transition-all rounded-xl flex items-center gap-2 border border-amber-400/50"
                >
                  <Gavel className="w-4 h-4 text-slate-950" /> Live Auction
                </Button>
              </Link>
              <Button 
                size="lg" 
                onClick={() => setShowRegisterModal(true)}
                className="h-12 px-6 text-sm sm:text-base font-black bg-white text-emerald-700 hover:bg-white/90 shadow-xl hover:scale-105 transition-all rounded-xl"
              >
                <UserPlus className="w-4 h-4 mr-2" /> Register Team
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card w-full max-w-lg rounded-3xl p-8 border border-border shadow-2xl relative"
          >
            <h3 className="text-2xl font-black mb-2">Invite a Team</h3>
            <p className="text-muted-foreground mb-6">Search for a team to send them a direct invitation.</p>
            
            <div className="space-y-4 mb-6">
              <input 
                type="text"
                placeholder="Search team by name..."
                value={inviteSearchQuery}
                onChange={(e) => handleSearchToInvite(e.target.value)}
                className="w-full h-12 bg-muted/50 border border-border rounded-xl px-4 font-medium focus:bg-background focus:ring-2 focus:ring-brand outline-none"
              />
              
              <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded-xl p-2 bg-muted/10">
                {inviteSearchQuery.length < 2 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">Type at least 2 characters to search.</p>
                ) : inviteSearchResults.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">No teams found matching "{inviteSearchQuery}".</p>
                ) : (
                  inviteSearchResults.map(team => (
                    <div key={team.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:border-brand/30 transition-colors">
                      <div>
                        <p className="font-bold text-foreground text-sm">{team.title}</p>
                        <p className="text-xs text-muted-foreground">{team.subtitle}</p>
                      </div>
                      <Button 
                        size="sm"
                        disabled={invitingTeamId === team.id}
                        onClick={() => handleSendInvite(team.id)}
                        className="bg-brand text-white hover:bg-brand-hover rounded-lg font-bold shadow-sm"
                      >
                        {invitingTeamId === team.id ? 'Sending...' : 'Invite'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" className="h-12 px-6 rounded-xl font-bold" onClick={() => setShowInviteModal(false)}>Close</Button>
            </div>
          </motion.div>
        </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card w-full max-w-md rounded-3xl p-8 border border-border shadow-2xl relative"
          >
            <h3 className="text-2xl font-black mb-2">Register for Tournament</h3>
            <p className="text-muted-foreground mb-6">Select one of your teams to participate in {tournament.name}.</p>
            
            {myTeams.length === 0 ? (
              <div className="text-center p-6 bg-muted/30 rounded-xl border border-dashed border-border mb-6">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-foreground">You don't have any teams yet.</p>
                <Link to="/teams" className="text-brand font-bold mt-2 inline-block hover:underline">Create a Team first</Link>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider">Select Team</label>
                <select 
                  className="w-full h-12 bg-background border border-border rounded-xl px-4 font-semibold focus:ring-2 focus:ring-brand outline-none"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <option value="">-- Select your team --</option>
                  {myTeams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex gap-3 mt-8">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setShowRegisterModal(false)}>Cancel</Button>
              <Button 
                className="flex-1 h-12 rounded-xl font-bold bg-brand text-white hover:bg-brand-hover shadow-lg disabled:opacity-50"
                onClick={handleRegisterTeam}
                disabled={!selectedTeamId || registering || myTeams.length === 0}
              >
                {registering ? 'Registering...' : 'Confirm Registration'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 pt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-3xl p-8 border border-border/50 shadow-sm"
          >
            <h2 className="text-2xl font-extrabold flex items-center mb-6">
              <Info className="w-6 h-6 text-brand mr-3" />
              Tournament Info
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted/40 p-5 rounded-2xl border border-border/30 hover:border-brand/30 transition-colors">
                <div className="flex items-center text-muted-foreground mb-2">
                  <ShieldCheck className="w-4 h-4 mr-2" /> <span className="font-bold text-xs uppercase tracking-wider">Organizer</span>
                </div>
                <p className="text-lg font-bold text-foreground">{tournament.organizer_name || user?.name || 'Admin'}</p>
              </div>
              <div className="bg-muted/40 p-5 rounded-2xl border border-border/30 hover:border-brand/30 transition-colors">
                <div className="flex items-center text-muted-foreground mb-2">
                  <Activity className="w-4 h-4 mr-2" /> <span className="font-bold text-xs uppercase tracking-wider">Status</span>
                </div>
                {tournament.status === 'DRAFT' ? (
                  <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm font-black px-3 py-1 rounded-lg uppercase tracking-wider shadow-sm">Draft Phase</span>
                ) : (
                  <span className="bg-brand/10 text-brand text-sm font-black px-3 py-1 rounded-lg uppercase tracking-wider shadow-sm">{tournament.status}</span>
                )}
              </div>
              <div className="bg-muted/40 p-5 rounded-2xl border border-border/30 hover:border-brand/30 transition-colors">
                <div className="flex items-center text-muted-foreground mb-2">
                  <Users className="w-4 h-4 mr-2" /> <span className="font-bold text-xs uppercase tracking-wider">Privacy</span>
                </div>
                <p className="text-lg font-bold text-foreground capitalize">{tournament.privacy?.toLowerCase() || 'public'}</p>
              </div>
              <div className="bg-muted/40 p-5 rounded-2xl border border-border/30 hover:border-brand/30 transition-colors">
                <div className="flex items-center text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4 mr-2" /> <span className="font-bold text-xs uppercase tracking-wider">Start Date</span>
                </div>
                <p className="text-lg font-bold text-foreground">{tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : 'TBA'}</p>
              </div>
            </div>
          </motion.section>

          {/* Tournament Live Player Auction Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass rounded-3xl p-8 border border-border/50 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold flex items-center">
                <Gavel className="w-6 h-6 text-amber-500 mr-3" />
                Tournament Live Player Auction
              </h2>
              {tournamentAuction && (
                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  {tournamentAuction.status}
                </span>
              )}
            </div>

            {tournamentAuction ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/40 p-4 rounded-2xl border border-border/30">
                    <span className="text-xs text-muted-foreground uppercase font-bold block mb-1">Franchises</span>
                    <p className="text-xl font-black text-foreground">{tournamentAuction.teams?.length || 0} Teams</p>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-2xl border border-border/30">
                    <span className="text-xs text-muted-foreground uppercase font-bold block mb-1">Player Pool</span>
                    <p className="text-xl font-black text-foreground">{tournamentAuction.players?.length || 0} Players</p>
                  </div>
                  <div className="bg-muted/40 p-4 rounded-2xl border border-border/30">
                    <span className="text-xs text-muted-foreground uppercase font-bold block mb-1">Base Purse</span>
                    <p className="text-xl font-black text-brand">₹{Number(tournamentAuction.base_budget).toLocaleString()}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link to={`/auction?tournament=${tournament.id}`}>
                    <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                      <Gavel className="w-4 h-4 text-amber-400" />
                      Open {tournament.name} Live Auction Room →
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-6 border border-dashed border-border rounded-2xl text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  No live player auction configured for this tournament yet.
                </p>
                <Link to={`/auction?tournament=${tournament.id}`}>
                  <Button className="bg-brand text-white hover:bg-brand-hover font-bold rounded-xl">
                    <Gavel className="w-4 h-4 mr-1.5" /> Initialize Auction for {tournament.name}
                  </Button>
                </Link>
              </div>
            )}
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-3xl p-8 border border-border/50 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold">Bracket & Schedule</h2>
              {isOrganizer && tournament.status === 'DRAFT' && (tournament.teams?.length || 0) > 1 && (
                <Button 
                  onClick={handleGenerateBracket} 
                  disabled={generatingBracket}
                  className="bg-brand text-white hover:bg-brand-hover shadow-sm font-bold rounded-xl"
                >
                  {generatingBracket ? 'Generating...' : 'Generate Bracket'}
                </Button>
              )}
            </div>

            {(!tournament.matches || tournament.matches.length === 0) ? (
              <div className="h-64 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground bg-muted/20 hover:bg-muted/40 transition-colors">
                <Calendar className="w-12 h-12 mb-4 opacity-50 text-brand" />
                <p className="font-bold text-lg text-foreground">No matches scheduled yet.</p>
                <p className="text-sm mt-1">Once teams register, the organizer will generate the bracket.</p>
                {isOrganizer && tournament.status === 'DRAFT' && ((tournament.teams?.length || 0) < 2) && (
                  <p className="text-xs text-amber-500 mt-4 font-bold bg-amber-50 px-3 py-1 rounded-full">Requires at least 2 teams</p>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(
                  tournament.matches.reduce((acc: any, match: any) => {
                    if (!acc[match.round_name]) acc[match.round_name] = [];
                    acc[match.round_name].push(match);
                    return acc;
                  }, {})
                ).map(([roundName, matches]: [string, any]) => (
                  <div key={roundName} className="space-y-4">
                    <h3 className="text-xl font-black text-brand border-b border-border pb-2">{roundName}</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {matches.map((match: any) => (
                        <div key={match.id} className="bg-background border border-border rounded-2xl p-5 shadow-sm hover:border-brand/30 transition-all flex flex-col justify-between gap-4">
                          <div className="flex-1">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">Match {match.match_order}</span>
                            <div className="flex flex-col gap-2">
                              <div className={`flex items-center justify-between p-2 rounded-lg ${match.winner && match.winner === match.team1 ? 'bg-emerald-50 border border-emerald-100' : 'bg-muted/30'}`}>
                                <span className={`font-bold ${match.winner && match.winner === match.team1 ? 'text-emerald-700' : 'text-foreground'}`}>
                                  {match.team1_name || 'TBD'}
                                </span>
                                {match.score_team1 && <span className="font-black text-lg">{match.score_team1}</span>}
                              </div>
                              <div className={`flex items-center justify-between p-2 rounded-lg ${match.winner && match.winner === match.team2 ? 'bg-emerald-50 border border-emerald-100' : 'bg-muted/30'}`}>
                                <span className={`font-bold ${match.winner && match.winner === match.team2 ? 'text-emerald-700' : 'text-foreground'}`}>
                                  {match.team2_name || 'TBD'}
                                </span>
                                {match.score_team2 && <span className="font-black text-lg">{match.score_team2}</span>}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-center gap-3 w-full pt-2 border-t border-border">
                            {match.status === 'COMPLETED' ? (
                              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full text-center">Completed</span>
                            ) : match.status === 'ONGOING' ? (
                              <span className="bg-brand/10 text-brand text-xs font-bold px-3 py-1 rounded-full text-center flex items-center justify-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /> Live
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full text-center">Scheduled</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        </div>

        {/* Right Column: Teams Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-3xl p-6 border border-border/50 shadow-sm sticky top-24"
          >
            <h3 className="text-xl font-extrabold mb-6 flex items-center justify-between">
              Registered Teams
              <span className="bg-brand/10 text-brand border border-brand/20 text-sm px-3 py-1 rounded-lg font-bold shadow-sm">{tournament.teams?.length || 0}</span>
            </h3>
            
            <div className="space-y-4">
              {!tournament.teams || tournament.teams.length === 0 ? (
                <div className="p-6 bg-muted/30 border border-border border-dashed rounded-2xl text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-brand" />
                  <p className="font-semibold text-sm text-foreground">No teams have registered yet.</p>
                  <p className="text-xs mt-1">Be the first to join the tournament!</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {tournament.teams.map((tTeam: any) => (
                    <div key={tTeam.id} className="p-4 bg-background border border-border rounded-xl shadow-sm flex items-center group hover:border-brand/40 transition-colors">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mr-4 shadow-sm"
                        style={{ backgroundColor: tTeam.team_logo || '#333' }}
                      >
                        {tTeam.team_name ? tTeam.team_name.substring(0, 2).toUpperCase() : 'T'}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-foreground truncate group-hover:text-brand transition-colors">{tTeam.team_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center mt-0.5">
                          {tTeam.is_approved ? (
                            <span className="text-emerald-500 font-bold flex items-center"><ShieldCheck className="w-3 h-3 mr-1" /> Approved</span>
                          ) : (
                            <span className="text-amber-500 font-bold">Pending Approval</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
