import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CheckCircle, RefreshCcw, Radio } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'

export default function UmpireDashboard() {
  const [matches, setMatches] = useState<any[]>([])
  const [availableMatches, setAvailableMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Polling for live score updates every 3 seconds to simulate WebSockets without server breakage
  useEffect(() => {
    fetchMatches()
    const interval = setInterval(fetchMatches, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchMatches = async () => {
    try {
      // Fetch active livescores for THIS user's tournaments
      const res = await apiClient.get('/v1/livescore/matches/?umpire_me=true')
      setMatches(res.data)
      
      // Fetch matches that are SCHEDULED/ONGOING but don't have a livescore yet
      const availRes = await apiClient.get('/v1/livescore/matches/available_matches/')
      setAvailableMatches(availRes.data)
      
      setLoading(false)
    } catch (err) {
      console.error('Failed to load data', err)
    }
  }

  const updateScore = async (id: string, team: string, points: number, eventMsg: string) => {
    try {
      await apiClient.post(`/v1/livescore/matches/${id}/increment/`, {
        team: team,
        points: points,
        event: eventMsg
      })
      fetchMatches()
    } catch (err) {
      console.error('Failed to update score', err)
    }
  }

  const toggleLive = async (id: string) => {
    try {
      await apiClient.post(`/v1/livescore/matches/${id}/toggle_live/`)
      fetchMatches()
    } catch (err) {
      console.error('Failed to toggle status', err)
    }
  }

  const finishScoringMatch = async (id: string) => {
    if (!confirm('Are you sure you want to finish this match? This will record the winner and remove it from the live scoreboard.')) return;
    try {
      setLoading(true)
      await apiClient.post(`/v1/livescore/matches/${id}/finish_scoring/`)
      fetchMatches()
    } catch (err: any) {
      console.error('Failed to finish match', err)
      alert('Failed to finish match: ' + (err.response?.data?.details || err.message))
      setLoading(false)
    }
  }

  const startScoringMatch = async (matchId: number) => {
    try {
      setLoading(true)
      await apiClient.post('/v1/livescore/matches/start_scoring/', { match_id: matchId })
      fetchMatches()
    } catch (err) {
      console.error('Failed to start scoring match', err)
      setLoading(false)
    }
  }

  const renderScoringButtons = (score: any, team: string) => {
    const engine = score.match_details?.sport_scoring_engine?.toLowerCase() || 'cricket'
    
    if (engine === 'football' || engine === 'soccer') {
      return (
        <div className="flex gap-2">
          <Button onClick={() => updateScore(score.id, team, 1, 'Goal')} size="lg" className="w-32 font-bold bg-brand hover:bg-brand/90">+1 Goal</Button>
        </div>
      )
    }
    
    if (engine === 'basketball') {
      return (
        <div className="flex gap-2">
          <Button onClick={() => updateScore(score.id, team, 1, 'Free Throw')} size="lg" variant="outline" className="w-16 font-bold">+1</Button>
          <Button onClick={() => updateScore(score.id, team, 2, 'Field Goal')} size="lg" className="w-16 font-bold bg-brand hover:bg-brand/90">+2</Button>
          <Button onClick={() => updateScore(score.id, team, 3, '3-Pointer')} size="lg" variant="outline" className="w-16 font-bold">+3</Button>
        </div>
      )
    }
    
    // Default to Cricket / Baseball style
    return (
      <div className="flex gap-2">
        <Button onClick={() => updateScore(score.id, team, 1, '1 Run')} size="lg" className="w-20 font-bold bg-brand hover:bg-brand/90">+1</Button>
        <Button onClick={() => updateScore(score.id, team, 4, 'Boundary (4)')} size="lg" variant="outline" className="w-16 font-bold">+4</Button>
        <Button onClick={() => updateScore(score.id, team, 6, 'Six (6)')} size="lg" variant="outline" className="w-16 font-bold">+6</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-5xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center">
            <Activity className="w-8 h-8 mr-3 text-brand" /> Live Scoreboard
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Manage live scoring and tournament match points.</p>
        </div>
        <Link to="/streams">
          <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Go Live Video Stream</span>
          </Button>
        </Link>
      </header>

      {matches.length === 0 ? (
        availableMatches.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Matches Available to Score</h2>
            <div className="grid gap-4">
              {availableMatches.map((m: any) => (
                <Card key={m.id} className="border-border shadow-sm flex items-center justify-between p-4">
                  <div>
                    <span className="text-xs font-black uppercase text-brand tracking-widest">{m.round_name}</span>
                    <p className="font-bold text-lg mt-1">
                      {m.team1_name || 'TBD'} vs {m.team2_name || 'TBD'}
                    </p>
                  </div>
                  <Button 
                    onClick={() => startScoringMatch(m.id)}
                    className="bg-brand hover:bg-brand-hover text-white font-bold"
                  >
                    Start Scoring
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Live Matches</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                You are not currently assigned to score any live matches. Please wait for the tournament organizer to start a match.
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {matches.map((score: any) => (
            <Card key={score.id} className="border-border shadow-md overflow-hidden relative">
              {score.is_live && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl uppercase flex items-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse mr-2"></div> Live
                </div>
              )}
              
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>Match #{score.match_details?.id || score.match} - Inning {score.current_inning}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleLive(score.id)} className={score.is_live ? 'text-red-500' : 'text-emerald-500'}>
                      {score.is_live ? 'End Broadcast' : 'Start Broadcast'}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => finishScoringMatch(score.id)}>
                      Finish Match
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="grid grid-cols-2 divide-x divide-border">
                  {/* Team 1 Column */}
                  <div className="p-6 flex flex-col items-center">
                    <h3 className="text-xl font-bold text-muted-foreground mb-4">Team A</h3>
                    <div className="text-7xl font-black text-foreground mb-6 font-mono tracking-tighter">{score.team1_score}</div>
                    {renderScoringButtons(score, '1')}
                  </div>
                  
                  {/* Team 2 Column */}
                  <div className="p-6 flex flex-col items-center">
                    <h3 className="text-xl font-bold text-muted-foreground mb-4">Team B</h3>
                    <div className="text-7xl font-black text-foreground mb-6 font-mono tracking-tighter">{score.team2_score}</div>
                    {renderScoringButtons(score, '2')}
                  </div>
                </div>
                
                {/* Event Log */}
                <div className="bg-muted/10 p-4 border-t border-border max-h-40 overflow-y-auto">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center">
                    <RefreshCcw className="w-3 h-3 mr-2 animate-spin-slow" /> Live Commentary Log
                  </h4>
                  <div className="space-y-2">
                    {[...score.event_log].reverse().map((log: any, idx: number) => (
                      <div key={idx} className="text-sm flex gap-3">
                        <span className="text-muted-foreground font-mono">{log.time}</span>
                        <span className="font-medium text-foreground">{log.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
