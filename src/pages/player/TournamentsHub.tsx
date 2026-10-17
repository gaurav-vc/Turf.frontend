import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { apiClient, ENDPOINTS } from '@/api/apiClient'
import { Trophy, Plus, ShieldCheck, Lock, Globe, Calendar, Edit3, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/useAuthStore'

interface Tournament {
  id: string
  name: string
  sport: string | number
  sport_name: string
  organizer: string | number
  organizer_name: string
  tournament_type: string
  privacy: string
  status: string
  start_date: string | null
  venue: string
}

export default function TournamentsHub() {
  const { user } = useAuthStore()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [sports, setSports] = useState<any[]>([])
  const [turfs, setTurfs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    sport: '',
    privacy: 'PUBLIC',
    venue: '',
    start_date: '',
  })

  const [showQuickSportModal, setShowQuickSportModal] = useState(false)
  const [quickSportName, setQuickSportName] = useState('')
  const [quickSportSaving, setQuickSportSaving] = useState(false)

  const handleQuickAddSport = async (nameToAdd?: string) => {
    const sportTitle = (nameToAdd || quickSportName).trim()
    if (!sportTitle) return
    setQuickSportSaving(true)
    try {
      const res = await apiClient.post(ENDPOINTS.SPORTS, {
        name: sportTitle,
        team_size_min: 1,
        team_size_max: 11,
        scoring_engine: 'standard'
      })
      await fetchSports()
      if (res.data?.id) {
        setFormData(prev => ({ ...prev, sport: res.data.id.toString() }))
      }
      setShowQuickSportModal(false)
      setQuickSportName('')
    } catch (err) {
      console.error('Failed to create sport', err)
      alert('Failed to add sport. It may already exist.')
    } finally {
      setQuickSportSaving(false)
    }
  }

  useEffect(() => {
    fetchTournaments()
    fetchSports()
    fetchTurfs()
  }, [])
  const fetchTournaments = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.TOURNAMENTS)
      if (Array.isArray(res.data)) {
        setTournaments(res.data)
      } else {
        setTournaments(res.data?.results || [])
      }
    } catch (err) {
      console.error('Failed to fetch tournaments', err)
      setTournaments([])
    }
  }

  const fetchSports = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.SPORTS)
      if (Array.isArray(res.data)) {
        setSports(res.data)
      } else {
        setSports(res.data?.results || [])
      }
    } catch (err) {
      console.error('Failed to fetch sports', err)
      setSports([])
    }
  }

  const fetchTurfs = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.TURFS)
      if (Array.isArray(res.data)) {
        setTurfs(res.data)
      } else {
        setTurfs(res.data?.results || [])
      }
    } catch (err) {
      console.error('Failed to fetch turfs', err)
      setTurfs([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...formData,
        tournament_type: 'FRIENDLY'
      }
      
      if (editingId) {
        await apiClient.patch(`${ENDPOINTS.TOURNAMENTS}${editingId}/`, payload)
        alert('Tournament updated successfully!')
      } else {
        await apiClient.post(ENDPOINTS.TOURNAMENTS, payload)
        alert('Tournament created successfully! You are the organizer.')
      }
      
      setIsCreating(false)
      setEditingId(null)
      fetchTournaments()
    } catch (err) {
      console.error('Error saving tournament:', err)
      alert('Failed to save tournament.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (tournament: Tournament) => {
    setFormData({
      name: tournament.name,
      sport: String(tournament.sport),
      privacy: tournament.privacy,
      venue: tournament.venue,
      start_date: tournament.start_date ? tournament.start_date.split('T')[0] : '',
    })
    setEditingId(tournament.id)
    setIsCreating(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this tournament? This cannot be undone.")) return;
    try {
      await apiClient.delete(`${ENDPOINTS.TOURNAMENTS}${id}/`)
      alert("Tournament deleted.")
      fetchTournaments()
    } catch (err) {
      console.error("Error deleting tournament", err)
      alert("Failed to delete tournament.")
    }
  }

  const openCreateForm = () => {
    setFormData({
      name: '', sport: '', privacy: 'PUBLIC', venue: '', start_date: ''
    })
    setEditingId(null)
    setIsCreating(true)
  }

  if (isCreating) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{editingId ? 'Edit Tournament' : 'Create Friendly Tournament'}</h1>
            <p className="text-muted-foreground mt-1">Host your own self-managed tournament.</p>
          </div>
          <Button variant="outline" onClick={() => { setIsCreating(false); setEditingId(null); }}>Cancel</Button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-xl border border-border shadow-sm">
          
          <div className="bg-brand/10 text-brand px-4 py-3 rounded-lg border border-brand/20 flex gap-3 items-start mb-6">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">You are the Organizer</p>
              <p className="text-xs mt-1">As the creator of a Friendly Tournament, you have full control over teams, brackets, and match results. No admin approval is required.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Tournament Name</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Summer Bash 2026" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sport</Label>
                <button
                  type="button"
                  onClick={() => setShowQuickSportModal(true)}
                  className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Sport
                </button>
              </div>
              <select 
                required
                value={formData.sport}
                onChange={e => setFormData({...formData, sport: e.target.value})}
                className="w-full h-11 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none"
              >
                <option value="">-- Choose a Sport --</option>
                {sports.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Venue / Location</Label>
              <select 
                value={formData.venue} 
                onChange={e => setFormData({...formData, venue: e.target.value})}
                className="w-full h-11 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none"
              >
                <option value="">-- Choose a Venue --</option>
                {turfs.map(t => (
                  <option key={t.id} value={t.name}>{t.name} ({t.city})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date"
                required
                value={formData.start_date} 
                onChange={e => setFormData({...formData, start_date: e.target.value})} 
              />
            </div>

            <div className="space-y-2">
              <Label>Privacy</Label>
              <select 
                required
                value={formData.privacy}
                onChange={e => setFormData({...formData, privacy: e.target.value})}
                className="w-full h-11 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none"
              >
                <option value="PUBLIC">Public (Anyone can view)</option>
                <option value="PRIVATE">Private (Invite only)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading} className="w-full md:w-auto px-8 h-12 text-lg font-bold bg-brand text-primary-foreground hover:bg-brand-hover shadow-lg">
              {loading ? 'Creating...' : <><Trophy className="w-5 h-5 mr-2" /> Create Tournament</>}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Tournaments</h1>
          <p className="text-muted-foreground mt-1">Discover public tournaments or host your own.</p>
        </div>
        <Button onClick={openCreateForm} className="bg-brand text-primary-foreground font-bold shadow-md hover:bg-brand-hover">
          <Plus className="w-5 h-5 mr-2" /> Host Tournament
        </Button>
      </header>

      {tournaments.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border flex flex-col items-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Tournaments Yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">Be the first to host a Friendly Tournament and invite teams to compete!</p>
          <Button onClick={openCreateForm} variant="outline" className="border-brand/50 text-brand hover:bg-brand/10 font-semibold">
            Create Tournament
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tournaments.map((tournament, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={tournament.id} 
              className="glass glass-hover rounded-3xl overflow-hidden flex flex-col group h-full border border-border/50 shadow-sm hover:shadow-lg"
            >
              <div className="p-6 border-b border-border/30 relative overflow-hidden bg-gradient-to-br from-muted/50 to-background">
                {/* Decorative background blur */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand/5 rounded-full blur-3xl group-hover:bg-brand/10 transition-colors duration-500" />
                
                <div className="absolute top-4 right-4 z-10">
                  {tournament.privacy === 'PRIVATE' ? (
                    <span className="flex items-center text-xs font-bold bg-slate-900/50 backdrop-blur-md text-slate-100 px-3 py-1.5 rounded-full shadow-sm border border-slate-700">
                      <Lock className="w-3 h-3 mr-1" /> Private
                    </span>
                  ) : (
                    <span className="flex items-center text-xs font-bold bg-emerald-500/10 backdrop-blur-md text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-sm">
                      <Globe className="w-3 h-3 mr-1" /> Public
                    </span>
                  )}
                </div>
                <div className="w-14 h-14 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-brand/20 relative z-10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <Trophy className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-black truncate pr-4 text-foreground mb-1 relative z-10 group-hover:text-brand transition-colors">{tournament.name}</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-brand relative z-10">{tournament.sport_name}</p>
              </div>
              
              <div className="p-6 flex-1 space-y-5 bg-background/50">
                <div className="flex items-center text-sm">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-4 border border-border/50 shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Organizer</p>
                    <p className="font-bold text-foreground">{tournament.organizer_name || user?.name || 'Admin'}</p>
                  </div>
                </div>
                <div className="flex items-center text-sm">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-4 border border-border/50 shadow-sm">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Status</p>
                    <div>
                      {tournament.status === 'DRAFT' ? (
                        <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs font-black px-2 py-0.5 rounded shadow-sm">Draft Phase</span>
                      ) : (
                        <span className="bg-brand/10 text-brand text-xs font-black px-2 py-0.5 rounded shadow-sm">{tournament.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-5 border-t border-border/30 bg-muted/10 flex gap-2">
                <Link to={`/tournaments/${tournament.id}`} className="flex-1">
                  <Button className="w-full bg-background hover:bg-brand hover:text-white border-2 border-brand text-brand font-bold transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(var(--brand),0.3)] h-11 text-base">
                    View Details
                  </Button>
                </Link>
                {user && user.id == tournament.organizer && (
                  <>
                    <Button variant="outline" size="icon" onClick={() => handleEdit(tournament)} className="h-11 w-11 shrink-0 border-2 border-brand/20 text-brand hover:bg-brand/10 hover:border-brand/40" title="Edit Tournament">
                      <Edit3 className="w-5 h-5" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(tournament.id)} className="h-11 w-11 shrink-0 border-2 border-red-500/20 text-red-500 hover:bg-red-50 hover:border-red-500/40" title="Delete Tournament">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Add Sport Modal */}
      {showQuickSportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 border border-border shadow-2xl relative">
            <h3 className="text-lg font-black text-foreground mb-1">Add Sport</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Type a sport name or tap any popular preset:
            </p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {['Cricket', 'Box Cricket', 'Football', 'Futsal', 'Pickleball', 'Tennis', 'Badminton', 'Basketball'].map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleQuickAddSport(name)}
                  disabled={quickSportSaving}
                  className="text-xs px-2.5 py-1 rounded-lg border border-border bg-muted/50 hover:bg-brand hover:text-white hover:border-brand transition font-medium"
                >
                  + {name}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleQuickAddSport()
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="customSport" className="text-xs font-bold">Custom Sport Name</Label>
                <Input
                  id="customSport"
                  required
                  placeholder="e.g. Volleyball, Dodgeball"
                  value={quickSportName}
                  onChange={(e) => setQuickSportName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuickSportModal(false)}
                  disabled={quickSportSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={quickSportSaving || !quickSportName.trim()}
                  className="bg-brand text-white hover:bg-brand-hover font-bold"
                >
                  {quickSportSaving ? 'Adding...' : 'Add & Select'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
