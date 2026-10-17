import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, MapPin, Calendar as CalendarIcon, Clock, DollarSign, Filter, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient, ENDPOINTS } from '@/api/apiClient'

export default function Matchmaking() {
  const [lobbies, setLobbies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showHostModal, setShowHostModal] = useState(false)
  const [sports, setSports] = useState<any[]>([])
  const [turfs, setTurfs] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSport, setFilterSport] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    sport: '',
    turf: '',
    date_time: '',
    players_needed: 1,
    skill_level: 'ALL',
    cost_per_person: 0,
    description: ''
  })

  useEffect(() => {
    fetchFormData()
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLobbies()
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, filterSport])

  const fetchFormData = async () => {
    try {
      const [sportsRes, turfsRes] = await Promise.all([
        apiClient.get(ENDPOINTS.SPORTS),
        apiClient.get(ENDPOINTS.TURFS)
      ])
      setSports(sportsRes.data.results || sportsRes.data || [])
      setTurfs(turfsRes.data.results || turfsRes.data || [])
    } catch (err) {
      console.error('Failed to load form data', err)
    }
  }

  const fetchLobbies = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterSport) params.append('sport', filterSport)
      
      const res = await apiClient.get(`/v1/matchmaking/lobbies/?${params.toString()}`)
      setLobbies(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to load matchmaking lobbies', err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRequest = async (lobbyId: string) => {
    try {
      await apiClient.post(`/v1/matchmaking/lobbies/${lobbyId}/join/`, { message: "Hey! I'd love to play." })
      alert('Join request sent successfully!')
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send join request.')
    }
  }

  const handleHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // Clean up empty turf string
      const payload = { ...formData }
      if (!payload.turf) {
        delete (payload as any).turf
      }
      
      await apiClient.post('/v1/matchmaking/lobbies/', payload)
      setShowHostModal(false)
      fetchLobbies()
      alert('Game hosted successfully!')
    } catch (err: any) {
      alert('Failed to host game: ' + (err.response?.data?.error || err.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-brand to-brand/60 bg-clip-text text-transparent">
            Looking for Players (LFP)
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Find games near you that are short on players.</p>
        </div>
        <Button onClick={() => setShowHostModal(true)} className="bg-brand text-primary-foreground font-bold shadow-md hover:bg-brand-hover">
          <Users className="w-5 h-5 mr-2" /> Host a Game
        </Button>
      </header>

      <div className="flex gap-4 items-center bg-card p-2 rounded-2xl border border-border shadow-sm mb-6 relative">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search games by title, location, description..." 
            className="pl-10 border-0 bg-transparent shadow-none focus-visible:ring-0" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
          variant={showFilters || filterSport ? "default" : "outline"} 
          className={showFilters || filterSport ? "bg-brand text-white rounded-xl font-semibold" : "rounded-xl font-semibold"}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" /> Filters {filterSport && ' (1)'}
        </Button>
        
        {showFilters && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg p-4 z-10">
            <h4 className="font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Filter by Sport</h4>
            <div className="space-y-2">
              <div 
                className={`p-2 rounded-lg cursor-pointer text-sm font-medium ${filterSport === '' ? 'bg-brand/10 text-brand' : 'hover:bg-muted'}`}
                onClick={() => setFilterSport('')}
              >
                All Sports
              </div>
              {sports.map(s => (
                <div 
                  key={s.id}
                  className={`p-2 rounded-lg cursor-pointer text-sm font-medium ${filterSport === s.slug ? 'bg-brand/10 text-brand' : 'hover:bg-muted'}`}
                  onClick={() => setFilterSport(s.slug)}
                >
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      ) : lobbies.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center shadow-sm">
          <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground">No open games right now</h3>
          <p className="text-muted-foreground mt-2">Check back later or host your own game!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lobbies.map((lobby) => (
            <motion.div 
              key={lobby.id}
              whileHover={{ y: -4 }}
              className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col h-full relative overflow-hidden group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-brand/10 text-brand text-xs font-black uppercase px-3 py-1 rounded-full tracking-wider">
                  {lobby.sport_details?.name || 'SPORT'}
                </div>
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-brand/20 border-2 border-card flex items-center justify-center text-xs font-bold text-brand">
                    {lobby.current_players}/{lobby.players_needed}
                  </div>
                </div>
              </div>
              
              <h3 className="text-xl font-extrabold text-foreground mb-2 line-clamp-1">{lobby.title}</h3>
              <p className="text-sm font-semibold text-muted-foreground mb-4 flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-brand" /> {lobby.turf_details?.name || 'TBD Location'}
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-6 bg-muted/40 p-4 rounded-2xl">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-muted-foreground mb-1 flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> DATE</span>
                  <span className="text-sm font-bold">{new Date(lobby.date_time).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-muted-foreground mb-1 flex items-center"><Clock className="w-3 h-3 mr-1" /> TIME</span>
                  <span className="text-sm font-bold">{new Date(lobby.date_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-muted-foreground mb-1 flex items-center"><DollarSign className="w-3 h-3 mr-1" /> COST</span>
                  <span className="text-sm font-bold">₹{lobby.cost_per_person}/head</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-muted-foreground mb-1 flex items-center"><Users className="w-3 h-3 mr-1" /> SKILL</span>
                  <span className="text-sm font-bold">{lobby.skill_level}</span>
                </div>
              </div>
              
              <div className="mt-auto">
                <Button 
                  onClick={() => handleJoinRequest(lobby.id)}
                  className="w-full bg-brand text-primary-foreground font-bold hover:bg-brand-hover shadow-md rounded-xl"
                >
                  Join Game
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showHostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30 sticky top-0 z-10">
              <h2 className="text-xl font-extrabold text-foreground">Host a Game</h2>
              <button onClick={() => setShowHostModal(false)} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="host-form" onSubmit={handleHostSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Lobby Title</Label>
                  <Input 
                    required 
                    placeholder="e.g., Casual 5v5 Friday Night" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Sport</Label>
                    <select 
                      required
                      value={formData.sport}
                      onChange={e => setFormData({...formData, sport: e.target.value})}
                      className="w-full h-11 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none"
                    >
                      <option value="">-- Choose Sport --</option>
                      {sports.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Turf / Location (Optional)</Label>
                    <select 
                      value={formData.turf}
                      onChange={e => setFormData({...formData, turf: e.target.value})}
                      className="w-full h-11 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none"
                    >
                      <option value="">-- TBD / Any Turf --</option>
                      {turfs.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date & Time</Label>
                    <Input 
                      type="datetime-local" 
                      required 
                      value={formData.date_time} 
                      onChange={e => setFormData({...formData, date_time: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Players Needed</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      required 
                      value={formData.players_needed} 
                      onChange={e => setFormData({...formData, players_needed: parseInt(e.target.value)})} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Skill Level</Label>
                    <select 
                      required
                      value={formData.skill_level}
                      onChange={e => setFormData({...formData, skill_level: e.target.value})}
                      className="w-full h-11 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none"
                    >
                      <option value="ALL">All Levels</option>
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cost per Person (₹)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01"
                      required 
                      value={formData.cost_per_person} 
                      onChange={e => setFormData({...formData, cost_per_person: parseFloat(e.target.value)})} 
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-border bg-muted/30 sticky bottom-0 z-10 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowHostModal(false)}>Cancel</Button>
              <Button type="submit" form="host-form" disabled={isSubmitting} className="bg-brand text-white hover:bg-brand-hover">
                {isSubmitting ? 'Hosting...' : 'Host Game'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
