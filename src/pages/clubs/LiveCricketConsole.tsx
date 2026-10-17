import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { 
  Play, Pause, Square, Clock, AlertTriangle, Search, 
  Sparkles, Trophy, ArrowRightLeft, Flame, Activity, Coffee,
  Users, Building, UserPlus
} from 'lucide-react'
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid 
} from 'recharts'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient, ENDPOINTS } from '@/api/apiClient'

// Web Audio API Chime for 2-Minute Reminder Warning
const playAlertChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15) // A5
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.8)
  } catch (e) {
    console.warn('Audio chime unsupported or blocked', e)
  }
}

export default function LiveCricketConsole() {
  const { matchId } = useParams()

  const [match, setMatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Modals
  const [showTossModal, setShowTossModal] = useState(false)
  const [showInningConfigModal, setShowInningConfigModal] = useState(false)
  const [showWicketModal, setShowWicketModal] = useState(false)
  const [showPlayerSelectModal, setShowPlayerSelectModal] = useState(false)
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [customBreakReason, setCustomBreakReason] = useState('Drink Break')
  const [customBreakSeconds, setCustomBreakSeconds] = useState(30)
  const [showCustomRunsModal, setShowCustomRunsModal] = useState(false)
  const [customRunsInput, setCustomRunsInput] = useState(5)
  const [playerModalTarget, setPlayerModalTarget] = useState<'striker' | 'non_striker' | 'bowler'>('striker')
  const [playerModalTab, setPlayerModalTab] = useState<'squad' | 'members' | 'instant'>('squad')
  const [instantPlayerName, setInstantPlayerName] = useState('')
  const [instantPlayerRole, setInstantPlayerRole] = useState('Batsman')
  const [addingInstant, setAddingInstant] = useState(false)
  const [customRunsMode, setCustomRunsMode] = useState<'RUN' | 'BYE' | 'LEG_BYE'>('RUN')

  // Inning & Match Config Form
  const [configMinutes, setConfigMinutes] = useState(13)
  const [configReminder, setConfigReminder] = useState(120)
  const [configOvers, setConfigOvers] = useState(6)
  const [configVenueType, setConfigVenueType] = useState<'TURF' | 'GROUND'>('TURF')
  const [configGroundName, setConfigGroundName] = useState('')

  // Toss Form
  const [tossWinnerId, setTossWinnerId] = useState('')
  const [tossDecision, setTossDecision] = useState<'BAT' | 'BOWL'>('BAT')

  // Wicket Form
  const [wicketMode, setWicketMode] = useState('BOWLED')
  const [autoBreakPause, setAutoBreakPause] = useState(true)

  // Break Event / Pause States
  const [breakCountdown, setBreakCountdown] = useState<number | null>(null)
  const [hasFiredReminderAlert, setHasFiredReminderAlert] = useState(false)

  // Player Search Input in Modal
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')

  // Client-side ticking timer
  const [clientRemainingSeconds, setClientRemainingSeconds] = useState(780)

  // Polling for real-time synchronization every 2.5s
  useEffect(() => {
    fetchMatchData()
    const interval = setInterval(fetchMatchData, 2500)
    return () => clearInterval(interval)
  }, [matchId])

  const fetchMatchData = async () => {
    try {
      const res = await apiClient.get(`${ENDPOINTS.CLUB_MATCHES}${matchId}/`)
      const data = res.data
      setMatch(data)

      if (data.status === 'SCHEDULED' && !data.toss_winner) {
        setShowTossModal(true)
      }

      // Sync remaining playing time
      if (data.timer_state) {
        const totalDuration = data.timer_state.inning_duration_seconds || 780
        const elapsedPlaying = data.timer_state.elapsed_playing_seconds || 0
        const remaining = Math.max(0, totalDuration - elapsedPlaying)
        setClientRemainingSeconds(remaining)

        // Check if 2-min reminder alert threshold reached
        const threshold = data.timer_state.reminder_threshold_seconds || 120
        if (remaining <= threshold && remaining > 0 && data.timer_state.is_running && !hasFiredReminderAlert) {
          playAlertChime()
          setHasFiredReminderAlert(true)
        }
      }

      if (data.total_overs || data.custom_rules?.total_overs) {
        setConfigOvers(Number(data.total_overs || data.custom_rules?.total_overs) || 6)
      }
      if (data.venue_type) {
        setConfigVenueType(data.venue_type)
      }
      if (data.ground_name) {
        setConfigGroundName(data.ground_name)
      }

      setLoading(false)
    } catch (err) {
      console.error('Failed to load match console', err)
    }
  }

  // Local ticker for smooth second-by-second countdown without server lag
  useEffect(() => {
    if (!match?.timer_state?.is_running || match?.timer_state?.is_paused) return

    const tick = setInterval(() => {
      setClientRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(tick)
          return 0
        }
        const threshold = match?.timer_state?.reminder_threshold_seconds || 120
        if (prev === threshold && !hasFiredReminderAlert) {
          playAlertChime()
          setHasFiredReminderAlert(true)
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(tick)
  }, [match?.timer_state?.is_running, match?.timer_state?.is_paused, hasFiredReminderAlert])

  // Break Event ticker
  useEffect(() => {
    if (!match?.timer_state?.is_paused || !match?.timer_state?.active_pause_preset_seconds) {
      setBreakCountdown(null)
      return
    }

    if (breakCountdown === null) {
      setBreakCountdown(match.timer_state.active_pause_preset_seconds)
    }

    const breakTick = setInterval(() => {
      setBreakCountdown(prev => {
        if (prev === null || prev <= 1) return 0
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(breakTick)
  }, [match?.timer_state?.is_paused, match?.timer_state?.active_pause_preset_seconds])

  // API Action: Start Match & Record Toss
  const handleRecordToss = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tossWinnerId) return
    try {
      await apiClient.post(`${ENDPOINTS.CLUB_MATCHES}${matchId}/record_toss/`, {
        toss_winner_id: tossWinnerId,
        toss_decision: tossDecision,
        auto_start_timer: true
      })
      setShowTossModal(false)
      fetchMatchData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record toss')
    }
  }

  // API Action: Timer Controls
  const handleTimerAction = async (action: string, extra: any = {}) => {
    try {
      await apiClient.post(`${ENDPOINTS.CLUB_MATCHES}${matchId}/timer_control/`, {
        action,
        ...extra
      })
      fetchMatchData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Timer action failed')
    }
  }

  // API Action: Ball by Ball Scoring
  const handleScoreEvent = async (type: string, runs = 0, extraParams = {}) => {
    if (!scorecard.striker && type !== 'WIDE') {
      alert('Please select an on-strike batsman first!')
      setPlayerModalTarget('striker')
      setShowPlayerSelectModal(true)
      return
    }
    if (!scorecard.current_bowler) {
      alert('Please select the current bowler first!')
      setPlayerModalTarget('bowler')
      setShowPlayerSelectModal(true)
      return
    }

    try {
      // Fire confetti on boundary 6
      if (runs === 6) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#ffffff']
        })
      }

      await apiClient.post(`${ENDPOINTS.CLUB_MATCHES}${matchId}/score_event/`, {
        type,
        runs,
        ...extraParams
      })
      fetchMatchData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record score event')
    }
  }

  // API Action: Swap Strike
  const handleSwapStrike = async () => {
    try {
      await apiClient.post(`${ENDPOINTS.CLUB_MATCHES}${matchId}/swap_strike/`)
      fetchMatchData()
    } catch (err) {
      console.error('Failed to swap strike', err)
    }
  }

  // API Action: Set Player
  const handleSelectPlayer = async (playerId: string) => {
    try {
      const payload: any = {}
      if (playerModalTarget === 'striker') payload.striker_id = playerId
      if (playerModalTarget === 'non_striker') payload.non_striker_id = playerId
      if (playerModalTarget === 'bowler') payload.bowler_id = playerId

      await apiClient.post(`${ENDPOINTS.CLUB_MATCHES}${matchId}/set_players/`, payload)
      setShowPlayerSelectModal(false)
      fetchMatchData()
    } catch (err) {
      console.error('Failed to set player', err)
    }
  }

  // API Action: Set Player from Club Member / Employee
  const handleSelectClubMember = async (userId: string) => {
    try {
      const targetTeam = playerModalTarget === 'bowler' ? (match?.team2_details || match?.team2) : (match?.team1_details || match?.team1)
      await apiClient.post(`${ENDPOINTS.CLUB_MATCHES}${matchId}/set_players/`, {
        user_id: userId,
        target: playerModalTarget,
        team_id: targetTeam?.id
      })
      setShowPlayerSelectModal(false)
      fetchMatchData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to assign club employee to team')
    }
  }

  // API Action: Add Instant Walk-in Player (No account in system)
  const handleAddInstantPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instantPlayerName.trim()) return
    setAddingInstant(true)
    try {
      const targetTeam = playerModalTarget === 'bowler' ? (match?.team2_details || match?.team2) : (match?.team1_details || match?.team1)
      await apiClient.post(`${ENDPOINTS.CLUB_MATCHES}${matchId}/add_instant_player/`, {
        name: instantPlayerName.trim(),
        role: instantPlayerRole,
        target: playerModalTarget,
        team_id: targetTeam?.id
      })
      setInstantPlayerName('')
      setShowPlayerSelectModal(false)
      fetchMatchData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add instant player')
    } finally {
      setAddingInstant(false)
    }
  }

  // API Action: Update Match Config (Overs, Venue Type, Ground Name, Ball Type)
  const handleUpdateMatchConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    try {
      await apiClient.post(`${ENDPOINTS.CLUB_MATCHES}${matchId}/update_match_config/`, {
        total_overs: configOvers,
        venue_type: configVenueType,
        ground_name: configGroundName
      })
      await handleTimerAction('config', {
        inning_duration_minutes: configMinutes,
        reminder_threshold_seconds: configReminder
      })
      setShowInningConfigModal(false)
      fetchMatchData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update match configuration')
    }
  }

  // API Action: Finish Match
  const handleFinishMatch = async () => {
    if (!confirm('Are you sure you want to finish this match and declare the final result?')) return
    try {
      const scorecard = match?.scorecard
      const winnerId = scorecard?.total_runs > 50 ? match.team1?.id : match.team2?.id
      await apiClient.post(`${ENDPOINTS.CLUB_MATCHES}${matchId}/finish_match/`, {
        winner_id: winnerId,
        summary: `Match concluded with score ${scorecard?.total_runs}/${scorecard?.wickets_down}`
      })
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 } })
      fetchMatchData()
    } catch (err) {
      console.error('Failed to finish match', err)
    }
  }

  if (loading || !match) {
    return (
      <div className="flex justify-center p-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  const timer = match.timer_state || {}
  const scorecard = match.scorecard || {}
  const minutes = Math.floor(clientRemainingSeconds / 60)
  const seconds = clientRemainingSeconds % 60
  const isTimeCritical = clientRemainingSeconds <= (timer.reminder_threshold_seconds || 120)

  const totalOvers = match.total_overs || match.custom_rules?.total_overs || 6
  const battingTeam = match.team1_details || match.team1 || {}
  const bowlingTeam = match.team2_details || match.team2 || {}
  const targetTeamName = playerModalTarget === 'bowler'
    ? (match.team2_name || bowlingTeam.name || 'Bowling Team')
    : (match.team1_name || battingTeam.name || 'Batting Team')

  // Batting and Bowling Team Squads for Player Selection
  const battingPlayers: any[] = match.team1_details?.players || match.team1?.players || []
  const bowlingPlayers: any[] = match.team2_details?.players || match.team2?.players || []
  const currentPool: any[] = playerModalTarget === 'bowler' ? bowlingPlayers : battingPlayers
  const clubMembers: any[] = match.club_members || []

  const filteredPool = currentPool.filter((p: any) => 
    (p.name || '').toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
    String(p.id).includes(playerSearchQuery) ||
    String(p.role || '').toLowerCase().includes(playerSearchQuery.toLowerCase())
  )

  const filteredMembers = clubMembers.filter((m: any) =>
    (m.name || '').toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
    (m.email || '').toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
    String(m.role || '').toLowerCase().includes(playerSearchQuery.toLowerCase())
  )

  // Format Recharts data
  const wormData = scorecard.worm_progression?.length > 0 
    ? scorecard.worm_progression 
    : [{ over: 0, cumulative_runs: 0 }]

  const manhattanData = scorecard.manhattan_overs?.length > 0 
    ? scorecard.manhattan_overs 
    : [{ over: 1, runs: scorecard.total_runs || 0 }]

  return (
    <div className="space-y-6 p-3 md:p-6 max-w-7xl mx-auto">
      {/* MATCH DAY CONTROL BANNER: Inning Timer & Stoppage HUD */}
      <div className={`relative overflow-hidden rounded-3xl border shadow-2xl transition-all p-6 ${
        timer.is_paused 
          ? 'bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-900/80 border-amber-500/50' 
          : isTimeCritical 
            ? 'bg-gradient-to-r from-red-950 via-slate-900 to-red-900 border-red-500/60 animate-pulse'
            : 'bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 border-emerald-500/40'
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* Teams Header */}
          <div className="flex items-center gap-4 text-center md:text-left">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  {match.club_name || 'Club Cricket League'} • Inning {timer.current_inning || 1}
                </span>
                {match.venue_type === 'GROUND' ? (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase flex items-center gap-1">
                    🌿 Open Ground {match.ground_name ? `(${match.ground_name})` : ''}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase flex items-center gap-1">
                    🏟️ Turf Venue {match.ground_name ? `(${match.ground_name})` : ''}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black uppercase">
                  ⚡ {totalOvers} Overs
                </span>
                {match.ball_type && (
                  <span className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 text-[10px] font-bold">
                    ⚾ {match.ball_type}
                  </span>
                )}
                {match.is_last_match && (
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-black uppercase">
                    Last Match
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
                {match.team1_name} <span className="text-muted-foreground font-light">vs</span> {match.team2_name}
              </h1>
              {match.toss_winner_name && (
                <p className="text-xs text-slate-300 mt-1">
                  🪙 Toss: <strong>{match.toss_winner_name}</strong> elected to <strong>{match.toss_decision === 'BAT' ? 'Bat' : 'Bowl'}</strong> first
                </p>
              )}
            </div>
          </div>

          {/* EVIDENT INNING TIMER HUD */}
          <div className="flex flex-col items-center">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              {timer.is_paused ? 'Inning Paused (Stoppage Excluded)' : 'Official Inning Playing Time'}
            </div>

            <div className={`font-mono font-black text-5xl md:text-6xl tracking-tight drop-shadow-md ${
              timer.is_paused ? 'text-amber-400' : isTimeCritical ? 'text-red-400' : 'text-white'
            }`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>

            {/* Break Event Indicator */}
            {timer.is_paused && (
              <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                <Coffee className="w-3.5 h-3.5 animate-spin-slow" />
                <span>{timer.active_pause_reason || 'Break'}</span>
                {breakCountdown !== null && breakCountdown > 0 && (
                  <span className="font-mono bg-black/40 px-1.5 py-0.2 rounded font-black">{breakCountdown}s</span>
                )}
                <span className="text-[10px] opacity-75">(Excluded from Inning)</span>
              </div>
            )}

            {/* 2-Min Warning Toast */}
            {isTimeCritical && !timer.is_paused && clientRemainingSeconds > 0 && (
              <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black animate-bounce">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>2-Minute Warning Reminder Alert!</span>
              </div>
            )}
          </div>

          {/* Timer Control Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!timer.is_running || timer.is_paused ? (
              <Button 
                onClick={() => handleTimerAction(timer.is_paused ? 'resume' : 'start')}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-lg text-xs gap-1.5"
              >
                <Play className="w-4 h-4 fill-current" /> 
                {timer.is_paused ? 'Resume Inning' : 'Start Timer'}
              </Button>
            ) : (
              <Button 
                onClick={() => handleTimerAction('pause', { reason: 'Manual Pause' })}
                variant="outline"
                className="bg-white border-amber-500 text-black hover:bg-white/90 font-black text-xs gap-1.5 shadow-sm"
              >
                <Pause className="w-4 h-4 text-amber-600" /> Pause
              </Button>
            )}

            {/* Dynamic Break Events from Club Config */}
            {(match?.club_customization?.pause_presets || [
              { name: 'Wicket Break', seconds: 20 },
              { name: 'Ball Lost', seconds: 60 }
            ]).map((preset: any, idx: number) => (
              <Button 
                key={idx}
                onClick={() => handleTimerAction('break_event', { reason: preset.name, preset_seconds: preset.seconds })}
                variant="outline"
                size="sm"
                className="bg-white border-white/40 text-black hover:bg-white/90 text-xs font-black shadow-sm"
              >
                <span className="text-amber-600 mr-1">⚡</span>{preset.name} ({preset.seconds}s)
              </Button>
            ))}

            <Button 
              onClick={() => setShowBreakModal(true)}
              variant="outline"
              size="sm"
              className="bg-white border-emerald-500/40 text-black hover:bg-white/90 text-xs font-black shadow-sm"
            >
              <span className="text-emerald-600 font-black mr-1">+</span>Custom Break
            </Button>

            <Button 
              onClick={() => handleTimerAction('stop')}
              variant="destructive"
              size="sm"
              className="font-bold text-xs gap-1"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Stop
            </Button>

            <Button 
              onClick={() => setShowInningConfigModal(true)}
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white text-xs"
            >
              Config
            </Button>
          </div>
        </div>
      </div>

      {/* SCOREBOARD MAIN BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Big Live Score & Run Rates */}
        <Card className="border-border bg-card/60 backdrop-blur-sm p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                Batting: {scorecard.batting_team_name || 'Team 1'}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                Max Wickets: {match.wickets_allowed || 6}
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-4">
              <div className="text-7xl font-black text-foreground font-mono tracking-tighter">
                {scorecard.total_runs}
                <span className="text-emerald-500 font-light">/{scorecard.wickets_down}</span>
              </div>
              <div className="text-xl font-bold text-muted-foreground font-mono">
                ({scorecard.overs || '0.0'} / {totalOvers} ov)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-border/60 text-xs">
              <div>
                <span className="text-muted-foreground font-bold">Current Run Rate:</span>
                <p className="text-lg font-black text-emerald-400">
                  {scorecard.balls_bowled > 0 ? ((scorecard.total_runs / scorecard.balls_bowled) * 6).toFixed(2) : '0.00'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground font-bold">Extras (W, NB, B, LB):</span>
                <p className="text-lg font-black text-foreground">
                  {(scorecard.extras?.wides || 0) + (scorecard.extras?.no_balls || 0) + (scorecard.extras?.byes || 0) + (scorecard.extras?.leg_byes || 0)}
                  <span className="text-[10px] font-normal text-muted-foreground ml-1.5 block">
                    w:{scorecard.extras?.wides || 0} • nb:{scorecard.extras?.no_balls || 0} • b:{scorecard.extras?.byes || 0} • lb:{scorecard.extras?.leg_byes || 0}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <Button 
              onClick={handleFinishMatch}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md"
            >
              <Trophy className="w-3.5 h-3.5 mr-1.5" /> Declare & Finish Match
            </Button>
            <Button 
              onClick={handleSwapStrike}
              variant="outline"
              size="sm"
              className="text-xs font-bold gap-1"
            >
              <ArrowRightLeft className="w-3 h-3" /> Swap Strike
            </Button>
          </div>
        </Card>

        {/* Middle Column: Active Batsmen & Bowler Cards */}
        <Card className="border-border bg-card/60 backdrop-blur-sm p-6 shadow-xl flex flex-col justify-between space-y-4">
          {/* Batsmen Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-black uppercase text-muted-foreground">
              <span>On-Pitch Batsmen</span>
              <span>R (B) • 4s • 6s • SR</span>
            </div>

            {/* Striker */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <button 
                    onClick={() => { setPlayerModalTarget('striker'); setShowPlayerSelectModal(true) }}
                    className="font-black text-sm text-foreground hover:text-emerald-400 flex items-center gap-1.5"
                  >
                    <span>{scorecard.striker_name || 'Select Striker *'} 🏏</span>
                    {(scorecard.striker_role?.includes('Walk-in') || scorecard.striker_role?.includes('Instant')) && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        ⚡ Walk-in
                      </span>
                    )}
                  </button>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">On Strike</span>
                </div>
              </div>

              {scorecard.striker ? (
                <div className="font-mono text-sm font-bold text-right">
                  <span className="text-base font-black text-white">
                    {scorecard.batsmen_stats?.[String(scorecard.striker)]?.runs || 0}
                  </span>
                  <span className="text-muted-foreground">
                    ({scorecard.batsmen_stats?.[String(scorecard.striker)]?.balls || 0})
                  </span>
                  <div className="text-[10px] text-slate-400">
                    SR: {scorecard.batsmen_stats?.[String(scorecard.striker)]?.strike_rate || '0.0'}
                  </div>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  onClick={() => { setPlayerModalTarget('striker'); setShowPlayerSelectModal(true) }}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Pick
                </Button>
              )}
            </div>

            {/* Non-Striker */}
            <div className="p-3 rounded-xl bg-muted/20 border border-border flex items-center justify-between">
              <div>
                <button 
                  onClick={() => { setPlayerModalTarget('non_striker'); setShowPlayerSelectModal(true) }}
                  className="font-black text-sm text-foreground hover:text-emerald-400 flex items-center gap-1.5"
                >
                  <span>{scorecard.non_striker_name || 'Select Non-Striker'}</span>
                  {(scorecard.non_striker_role?.includes('Walk-in') || scorecard.non_striker_role?.includes('Instant')) && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      ⚡ Walk-in
                    </span>
                  )}
                </button>
                <div className="text-[10px] text-muted-foreground font-bold uppercase">Non-Striker</div>
              </div>

              {scorecard.non_striker ? (
                <div className="font-mono text-sm font-bold text-right">
                  <span className="text-base font-black text-foreground">
                    {scorecard.batsmen_stats?.[String(scorecard.non_striker)]?.runs || 0}
                  </span>
                  <span className="text-muted-foreground">
                    ({scorecard.batsmen_stats?.[String(scorecard.non_striker)]?.balls || 0})
                  </span>
                  <div className="text-[10px] text-muted-foreground">
                    SR: {scorecard.batsmen_stats?.[String(scorecard.non_striker)]?.strike_rate || '0.0'}
                  </div>
                </div>
              ) : (
                <Button 
                  size="sm" 
                  onClick={() => { setPlayerModalTarget('non_striker'); setShowPlayerSelectModal(true) }}
                  variant="outline"
                  className="h-7 text-xs font-bold"
                >
                  Pick
                </Button>
              )}
            </div>
          </div>

          {/* Bowler Box */}
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
            <div>
              <button 
                onClick={() => { setPlayerModalTarget('bowler'); setShowPlayerSelectModal(true) }}
                className="font-black text-sm text-foreground hover:text-purple-400 flex items-center gap-1.5"
              >
                <span>{scorecard.current_bowler_name || 'Select Current Bowler *'} ⚾</span>
                {(scorecard.current_bowler_role?.includes('Walk-in') || scorecard.current_bowler_role?.includes('Instant')) && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    ⚡ Walk-in
                  </span>
                )}
              </button>
              <div className="text-[10px] text-purple-400 font-bold uppercase">Bowling Now</div>
            </div>

            {scorecard.current_bowler ? (
              <div className="font-mono text-sm font-bold text-right">
                <span className="text-foreground">
                  {scorecard.bowlers_stats?.[String(scorecard.current_bowler)]?.overs || '0.0'} ov • 
                </span>
                <span className="text-purple-400 font-black ml-1">
                  {scorecard.bowlers_stats?.[String(scorecard.current_bowler)]?.wickets || 0}W
                </span>
                <span className="text-muted-foreground ml-1">
                  ({scorecard.bowlers_stats?.[String(scorecard.current_bowler)]?.runs_conceded || 0}R)
                </span>
                <div className="text-[10px] text-slate-400">
                  Econ: {scorecard.bowlers_stats?.[String(scorecard.current_bowler)]?.economy || '0.0'}
                </div>
              </div>
            ) : (
              <Button 
                size="sm" 
                onClick={() => { setPlayerModalTarget('bowler'); setShowPlayerSelectModal(true) }}
                className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                Pick
              </Button>
            )}
          </div>
        </Card>

        {/* Right Column: Live Ball-by-Ball Buttons Console */}
        <Card className="border-border bg-card/60 backdrop-blur-sm p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs font-black uppercase text-emerald-400">
            <span>Score Next Ball</span>
            <span className="text-muted-foreground">Striker: {scorecard.striker_name || 'TBD'}</span>
          </div>

          {/* Main Runs Grid */}
          <div className="grid grid-cols-4 gap-2">
            <Button 
              onClick={() => handleScoreEvent('RUN', 0)}
              variant="outline" 
              className="h-12 text-lg font-black font-mono border-border hover:bg-muted"
            >
              • 0
            </Button>
            <Button 
              onClick={() => handleScoreEvent('RUN', 1)}
              className="h-12 text-lg font-black font-mono bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              1
            </Button>
            <Button 
              onClick={() => handleScoreEvent('RUN', 2)}
              className="h-12 text-lg font-black font-mono bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              2
            </Button>
            <Button 
              onClick={() => handleScoreEvent('RUN', 3)}
              className="h-12 text-lg font-black font-mono bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              3
            </Button>
          </div>

          {/* Boundaries */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={() => handleScoreEvent('RUN', 4)}
              className="h-11 text-base font-black font-mono bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              FOUR (4)
            </Button>
            <Button 
              onClick={() => handleScoreEvent('RUN', 6)}
              className="h-11 text-base font-black font-mono bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md font-black"
            >
              SIX (6) 🚀
            </Button>
          </div>

          {/* Extras Row 1: Wides, No Balls, Byes, Leg Byes */}
          <div className="grid grid-cols-4 gap-1.5">
            <Button 
              onClick={() => handleScoreEvent('WIDE')}
              variant="outline"
              className="h-9 text-xs font-bold border-amber-500/40 text-amber-300 hover:bg-amber-500/10 px-1"
            >
              Wide (+1)
            </Button>
            <Button 
              onClick={() => handleScoreEvent('NO_BALL')}
              variant="outline"
              className="h-9 text-xs font-bold border-red-500/40 text-red-300 hover:bg-red-500/10 px-1"
            >
              No Ball (+1)
            </Button>
            <Button 
              onClick={() => handleScoreEvent('BYE', 1)}
              variant="outline"
              className="h-9 text-xs font-bold border-teal-500/40 text-teal-300 hover:bg-teal-500/10 px-1"
            >
              Bye (+1)
            </Button>
            <Button 
              onClick={() => handleScoreEvent('LEG_BYE', 1)}
              variant="outline"
              className="h-9 text-xs font-bold border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 px-1"
            >
              Leg Bye (+1)
            </Button>
          </div>

          {/* Extras Row 2: Multi Byes, Custom Runs, and Wickets */}
          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={() => {
                setCustomRunsMode('BYE')
                setCustomRunsInput(2)
                setShowCustomRunsModal(true)
              }}
              variant="outline"
              className="h-9 text-xs font-bold border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
            >
              Byes (2-4B)
            </Button>
            <Button 
              onClick={() => {
                setCustomRunsMode('RUN')
                setCustomRunsInput(5)
                setShowCustomRunsModal(true)
              }}
              variant="outline"
              className="h-9 text-xs font-bold border-purple-500/40 text-purple-300 hover:bg-purple-500/10"
            >
              + Runs
            </Button>
            <Button 
              onClick={() => setShowWicketModal(true)}
              className="h-9 text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md animate-pulse"
            >
              WICKET ⚡
            </Button>
          </div>
        </Card>
      </div>

      {/* DYNAMIC DATA VISUALIZATION SECTION: Recharts Worm & Manhattan Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Worm Progress Chart */}
        <Card className="border-border bg-card/60 backdrop-blur-sm p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Worm Chart (Cumulative Runs Progression)
            </CardTitle>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              Total: {scorecard.total_runs} R
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wormData}>
                <defs>
                  <linearGradient id="wormGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="over" label={{ value: 'Overs', position: 'insideBottom', offset: -5 }} stroke="#94a3b8" />
                <YAxis label={{ value: 'Runs', angle: -90, position: 'insideLeft' }} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelFormatter={val => `Over ${val}`}
                />
                <Area type="monotone" dataKey="cumulative_runs" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#wormGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Manhattan Chart (Runs Per Over) */}
        <Card className="border-border bg-card/60 backdrop-blur-sm p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Flame className="w-4 h-4 text-purple-400" /> Manhattan Chart (Runs per Over)
            </CardTitle>
            <span className="text-xs font-mono text-purple-400 font-bold">
              {scorecard.wickets_down} Wickets Fallen
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={manhattanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="over" label={{ value: 'Over #', position: 'insideBottom', offset: -5 }} stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  labelFormatter={val => `Over ${val}`}
                />
                <Bar dataKey="runs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* RECENT BALLS & COMMENTARY LOG */}
      <Card className="border-border bg-card/60 backdrop-blur-sm p-6 shadow-xl space-y-3">
        <h3 className="text-sm font-black uppercase text-muted-foreground tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" /> Live Ball-by-Ball Commentary Stream
        </h3>

        <div className="flex flex-wrap gap-2 pt-2 max-h-32 overflow-y-auto">
          {scorecard.ball_events?.slice(-20).reverse().map((b: any, idx: number) => (
            <span 
              key={idx}
              className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 ${
                b.event === 'WICKET' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                b.runs === 6 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                b.runs === 4 ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                'bg-muted/40 text-foreground border-border'
              }`}
            >
              <span>{b.striker}: {b.event === 'WICKET' ? 'W' : b.runs}R</span>
              <span className="text-[10px] text-muted-foreground">({b.timestamp})</span>
            </span>
          ))}
        </div>
      </Card>

      {/* MODAL: Toss Workflow */}
      <AnimatePresence>
        {showTossModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6"
            >
              <div className="text-center mb-6">
                <span className="text-4xl">🪙</span>
                <h3 className="text-2xl font-black text-white mt-2">Match Toss</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Who won the toss and what did they choose to do?
                </p>
              </div>

              <form onSubmit={handleRecordToss} className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Toss Winner Team *</Label>
                  <select
                    required
                    value={tossWinnerId}
                    onChange={e => setTossWinnerId(e.target.value)}
                    className="w-full mt-1 p-3 rounded-xl bg-background border border-border text-sm font-bold"
                  >
                    <option value="">Select Winning Team</option>
                    <option value={match.team1?.id}>{match.team1_name}</option>
                    <option value={match.team2?.id}>{match.team2_name}</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Decision *</Label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <Button 
                      type="button"
                      onClick={() => setTossDecision('BAT')}
                      variant={tossDecision === 'BAT' ? 'default' : 'outline'}
                      className={tossDecision === 'BAT' ? 'bg-emerald-600 text-white font-bold' : ''}
                    >
                      Batting First
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => setTossDecision('BOWL')}
                      variant={tossDecision === 'BOWL' ? 'default' : 'outline'}
                      className={tossDecision === 'BOWL' ? 'bg-emerald-600 text-white font-bold' : ''}
                    >
                      Bowling First
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black mt-2"
                >
                  Confirm Toss & Start Inning
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Wicket Event (Dismissal + 20s Wicket Break Pause) */}
      <AnimatePresence>
        {showWicketModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6"
            >
              <h3 className="text-xl font-black text-red-400 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Record Wicket
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Select dismissal mode. A 20-second break pause will be initiated.
              </p>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Dismissal Type</Label>
                  <select
                    value={wicketMode}
                    onChange={e => setWicketMode(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border text-sm font-bold"
                  >
                    <option value="BOWLED">Bowled</option>
                    <option value="CAUGHT">Caught</option>
                    <option value="RUN_OUT">Run Out</option>
                    <option value="LBW">LBW</option>
                    <option value="STUMPED">Stumped</option>
                    <option value="HIT_WICKET">Hit Wicket</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input 
                    type="checkbox"
                    checked={autoBreakPause}
                    onChange={e => setAutoBreakPause(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Trigger 20s Wicket Break Pause (Excluded from Inning)</span>
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowWicketModal(false)}>Cancel</Button>
                  <Button 
                    onClick={() => {
                      setShowWicketModal(false)
                      handleScoreEvent('WICKET', 0, { 
                        wicket_mode: wicketMode, 
                        auto_break: autoBreakPause 
                      })
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    Confirm Wicket
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Player Selection with Affiliated Team, Club Employees & Instant Walk-in Player */}
      <AnimatePresence>
        {showPlayerSelectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                  <Search className="w-5 h-5 text-emerald-400" /> 
                  Select {playerModalTarget.replace('_', ' ').toUpperCase()}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {targetTeamName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Selecting {playerModalTarget.replace('_', ' ')} for <strong className="text-foreground">{targetTeamName}</strong> ({playerModalTarget === 'bowler' ? 'Bowling side' : 'Batting side'}).
              </p>

              {/* Modal Tabs */}
              <div className="flex border-b border-border/70 mb-4 gap-1">
                <button
                  type="button"
                  onClick={() => setPlayerModalTab('squad')}
                  className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-black transition-all border-b-2 ${
                    playerModalTab === 'squad'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Team Squad ({filteredPool.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerModalTab('members')}
                  className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-black transition-all border-b-2 ${
                    playerModalTab === 'members'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  Club Employees ({filteredMembers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerModalTab('instant')}
                  className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-black transition-all border-b-2 ${
                    playerModalTab === 'instant'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-amber-400/70 hover:text-amber-300'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  + Instant Walk-in
                </button>
              </div>

              {/* TAB 1: Affiliated Team Squad */}
              {playerModalTab === 'squad' && (
                <div className="space-y-4">
                  <Input 
                    placeholder={`Search ${targetTeamName} player name, role or ID...`}
                    value={playerSearchQuery}
                    onChange={e => setPlayerSearchQuery(e.target.value)}
                    className="font-bold text-xs"
                  />

                  <div className="max-h-60 overflow-y-auto divide-y divide-border/60">
                    {filteredPool.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No matching players found in {targetTeamName} squad.
                      </div>
                    ) : (
                      filteredPool.map((p: any) => {
                        const isWalkIn = (p.role || '').includes('Walk-in') || (p.role || '').includes('Instant')
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPlayer(p.id)}
                            className="w-full py-2.5 px-3 flex items-center justify-between text-left hover:bg-muted/40 rounded-lg transition-colors group"
                          >
                            <div>
                              <div className="font-bold text-sm text-foreground flex items-center gap-2">
                                <span>{p.name}</span>
                                {isWalkIn && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    ⚡ Walk-in
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Role: {p.role || 'Player'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-emerald-400 font-bold">
                                #{String(p.id).substring(0, 5)}
                              </span>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-400 opacity-0 group-hover:opacity-100">
                                Pick
                              </Button>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Club Employees / Members */}
              {playerModalTab === 'members' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                    🏢 Select any verified club employee or member to assign them to <strong>{targetTeamName}</strong> and put them directly on pitch.
                  </div>

                  <Input 
                    placeholder="Search employee or club member by name / email..."
                    value={playerSearchQuery}
                    onChange={e => setPlayerSearchQuery(e.target.value)}
                    className="font-bold text-xs"
                  />

                  <div className="max-h-56 overflow-y-auto divide-y divide-border/60">
                    {filteredMembers.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No registered club employees or members found.
                      </div>
                    ) : (
                      filteredMembers.map((m: any) => (
                        <div
                          key={m.id}
                          className="py-2.5 px-3 flex items-center justify-between hover:bg-muted/40 rounded-lg transition-colors"
                        >
                          <div>
                            <div className="font-bold text-sm text-foreground">{m.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {m.email} • <span className="text-emerald-400 font-bold">{m.role || 'Member'}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSelectClubMember(m.user_id || m.id)}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            Assign & Pick
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Instant Walk-in Player (No Account in System) */}
              {playerModalTab === 'instant' && (
                <form onSubmit={handleAddInstantPlayer} className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                    <div className="font-black flex items-center gap-1.5 text-amber-400 mb-1">
                      <Sparkles className="w-4 h-4" /> Instant Walk-in Player (No Account Required)
                    </div>
                    This player does not have a user account in the system. They will be added immediately to <strong>{targetTeamName}</strong> with a special <span className="font-bold underline text-amber-300">⚡ Walk-in</span> badge.
                  </div>

                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Player Full Name *</Label>
                    <Input 
                      placeholder="e.g. Rahul Verma"
                      value={instantPlayerName}
                      onChange={e => setInstantPlayerName(e.target.value)}
                      required
                      className="mt-1 font-bold"
                      autoFocus
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Playing Role</Label>
                    <select
                      value={instantPlayerRole}
                      onChange={e => setInstantPlayerRole(e.target.value)}
                      className="w-full mt-1 p-2 rounded-lg bg-background border border-border text-xs font-bold"
                    >
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="Wicket-Keeper">Wicket-Keeper</option>
                    </select>
                  </div>

                  <Button 
                    type="submit"
                    disabled={addingInstant || !instantPlayerName.trim()}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-lg"
                  >
                    {addingInstant ? 'Adding Instant Player...' : `⚡ Add to ${targetTeamName} & Put on Pitch`}
                  </Button>
                </form>
              )}

              <div className="flex justify-end pt-3 border-t border-border/60 mt-4">
                <Button variant="outline" onClick={() => setShowPlayerSelectModal(false)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Dynamic Inning & Match Config (Overs, Playing Area, Timers) */}
      <AnimatePresence>
        {showInningConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6"
            >
              <h3 className="text-xl font-black text-foreground flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-emerald-400" /> Match & Inning Configuration
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Dynamically adjust match overs, playing area ground/turf, and inning timers.
              </p>

              <form onSubmit={handleUpdateMatchConfig} className="space-y-4">
                {/* Playing Area: Turf vs Ground */}
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                    Playing Area (Ground or Turf) *
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfigVenueType('TURF')}
                      className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                        configVenueType === 'TURF'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <span>🏟️</span> Turf Venue
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfigVenueType('GROUND')}
                      className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                        configVenueType === 'GROUND'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <span>🌿</span> Open Ground
                    </button>
                  </div>
                </div>

                {/* Ground / Venue Name */}
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    {configVenueType === 'TURF' ? 'Turf Court / Facility Name' : 'Ground / Field Name'}
                  </Label>
                  <Input 
                    placeholder={configVenueType === 'TURF' ? 'e.g. VIP Turf Box 1' : 'e.g. Main Cricket Ground / Oval 2'}
                    value={configGroundName}
                    onChange={e => setConfigGroundName(e.target.value)}
                    className="mt-1 font-bold text-xs"
                  />
                </div>

                {/* Total Match Overs */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Total Match Overs *</Label>
                    <span className="text-[10px] text-emerald-400 font-bold">Standard: 6, 8, 10, 20</span>
                  </div>
                  <Input 
                    type="number"
                    min={1}
                    max={50}
                    value={configOvers}
                    onChange={e => setConfigOvers(Math.max(1, Number(e.target.value)))}
                    className="mt-1 font-mono font-black text-lg"
                    required
                  />
                </div>

                {/* Inning Duration (Minutes) & Warning Alert */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Inning Time (Mins)</Label>
                    <Input 
                      type="number"
                      min={3}
                      max={180}
                      value={configMinutes}
                      onChange={e => setConfigMinutes(Number(e.target.value))}
                      className="mt-1 font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Alert At (Secs)</Label>
                    <Input 
                      type="number"
                      min={30}
                      max={600}
                      value={configReminder}
                      onChange={e => setConfigReminder(Number(e.target.value))}
                      className="mt-1 font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                  <Button type="button" variant="outline" onClick={() => setShowInningConfigModal(false)}>Cancel</Button>
                  <Button 
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md"
                  >
                    Save & Apply Config
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Dynamic Custom Break / Stoppage Event */}
      <AnimatePresence>
        {showBreakModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6"
            >
              <h3 className="text-xl font-black text-amber-400 flex items-center gap-2 mb-2">
                <Coffee className="w-5 h-5 text-amber-400" /> Trigger Break Stoppage
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Inning countdown will freeze. This stoppage time will NOT be calculated in the inning playing time.
              </p>

              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Break Reason / Event</Label>
                  <Input 
                    placeholder="e.g. Injury Time, Rain, Third Umpire, Ball Lost"
                    value={customBreakReason}
                    onChange={e => setCustomBreakReason(e.target.value)}
                    className="mt-1 font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Break Preset (Seconds)</Label>
                  <Input 
                    type="number"
                    min={5}
                    max={1800}
                    value={customBreakSeconds}
                    onChange={e => setCustomBreakSeconds(Number(e.target.value))}
                    className="mt-1 font-bold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowBreakModal(false)}>Cancel</Button>
                  <Button 
                    onClick={() => {
                      handleTimerAction('break_event', {
                        reason: customBreakReason || 'Break',
                        preset_seconds: customBreakSeconds || 30
                      })
                      setShowBreakModal(false)
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black"
                  >
                    Start Break Stoppage
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Custom Deliveries, Byes, Leg Byes & Runs Input */}
      <AnimatePresence>
        {showCustomRunsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6"
            >
              <h3 className="text-xl font-black text-purple-400 flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-purple-400" /> Score Custom Delivery
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Score Byes, Leg Byes, penalty runs, or overthrows.
              </p>

              <div className="space-y-4">
                {/* Type Selection */}
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">Delivery Type</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomRunsMode('RUN')}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-black transition-all ${
                        customRunsMode === 'RUN'
                          ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      🏏 Runs
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomRunsMode('BYE')}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-black transition-all ${
                        customRunsMode === 'BYE'
                          ? 'bg-teal-600 border-teal-500 text-white shadow-md'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      🧤 Byes (B)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomRunsMode('LEG_BYE')}
                      className={`py-2 px-1 text-center rounded-xl border text-xs font-black transition-all ${
                        customRunsMode === 'LEG_BYE'
                          ? 'bg-cyan-600 border-cyan-500 text-white shadow-md'
                          : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      🦵 Leg Byes
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground">
                  {customRunsMode === 'BYE' && (
                    <span>🧤 <strong>Byes:</strong> Runs credited to extras. Not charged against bowler; strike rotates if runs are odd.</span>
                  )}
                  {customRunsMode === 'LEG_BYE' && (
                    <span>🦵 <strong>Leg Byes:</strong> Runs off pads/body. Credited to extras; not charged against bowler; strike rotates if runs are odd.</span>
                  )}
                  {customRunsMode === 'RUN' && (
                    <span>🏏 <strong>Standard Runs:</strong> Runs off bat, overthrows, or regular running.</span>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Number of Runs / Byes</Label>
                  <Input 
                    type="number"
                    min={1}
                    max={50}
                    value={customRunsInput}
                    onChange={e => setCustomRunsInput(Math.max(1, Number(e.target.value)))}
                    className="mt-1 text-center font-mono font-black text-2xl h-12"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                  <Button variant="outline" onClick={() => setShowCustomRunsModal(false)}>Cancel</Button>
                  <Button 
                    onClick={() => {
                      setShowCustomRunsModal(false)
                      handleScoreEvent(customRunsMode, customRunsInput)
                    }}
                    className={`font-black text-white shadow-md ${
                      customRunsMode === 'BYE'
                        ? 'bg-teal-600 hover:bg-teal-700'
                        : customRunsMode === 'LEG_BYE'
                          ? 'bg-cyan-600 hover:bg-cyan-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    Score {customRunsInput} {customRunsMode === 'BYE' ? 'Byes (B)' : customRunsMode === 'LEG_BYE' ? 'Leg Byes (LB)' : 'Runs'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
