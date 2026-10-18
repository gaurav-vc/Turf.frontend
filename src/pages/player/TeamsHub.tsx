import { useState, useEffect } from 'react'
import { apiClient, ENDPOINTS, BASE_URL } from '@/api/apiClient'
import { Plus, Users, Save, Trash2, UserPlus, Shield, Activity, Star, Edit2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'

interface Player {
  id?: string
  name: string
  role: string
  is_substitute: boolean
}

interface Team {
  id: string
  name: string
  sport: string
  sport_name?: string
  logo_color: string
  logo?: string | null
  players: Player[]
}

export default function TeamsHub() {
  const [teams, setTeams] = useState<Team[]>([])
  const [sports, setSports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null)
  
  const [formData, setFormData] = useState<{
    name: string;
    sport: string;
    logo_color: string;
    logo: File | null;
  }>({
    name: '',
    sport: '',
    logo_color: '#3b82f6',
    logo: null,
  })
  
  const [players, setPlayers] = useState<Player[]>(
    Array(5).fill(null).map(() => ({ name: '', role: '', is_substitute: false }))
  )

  const [showQuickSportModal, setShowQuickSportModal] = useState(false)
  const [quickSportName, setQuickSportName] = useState('')
  const [quickSportSaving, setQuickSportSaving] = useState(false)

  const handleQuickAddSport = async () => {
    const title = quickSportName.trim()
    if (!title) return
    setQuickSportSaving(true)
    try {
      const res = await apiClient.post(ENDPOINTS.SPORTS, {
        name: title,
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
    fetchTeams()
    fetchSports()
  }, [])

  const fetchTeams = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.TEAMS)
      setTeams(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to fetch teams', err)
    }
  }

  const fetchSports = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.SPORTS)
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || [])
      setSports(list)
    } catch (err) {
      console.error('Failed to fetch sports', err)
    }
  }

  const handlePlayerChange = (index: number, field: keyof Player, value: any) => {
    const newPlayers = [...players]
    newPlayers[index] = { ...newPlayers[index], [field]: value }
    setPlayers(newPlayers)
  }

  const handleSportChange = (sportId: string) => {
    setFormData({ ...formData, sport: sportId })
    const sport = sports.find(s => s.id.toString() === sportId)
    if (sport && !editingTeamId) {
      const defaultSize = sport.team_size_min || 5
      const newPlayers = Array(defaultSize).fill(null).map(() => ({ name: '', role: '', is_substitute: false }))
      setPlayers(newPlayers)
    }
  }

  const addPlayerRow = (is_substitute = false) => {
    setPlayers([...players, { name: '', role: is_substitute ? 'Substitute' : '', is_substitute }])
  }

  const removePlayerRow = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index))
  }

  const openForm = (team?: Team) => {
    fetchSports()
    if (team) {
      setEditingTeamId(team.id)
      setFormData({
        name: team.name,
        sport: team.sport.toString(),
        logo_color: team.logo_color || '#3b82f6',
        logo: null
      })
      setPlayers(team.players.length > 0 ? team.players : Array(5).fill(null).map(() => ({ name: '', role: '', is_substitute: false })))
    } else {
      setEditingTeamId(null)
      setFormData({ name: '', sport: '', logo_color: '#3b82f6', logo: null })
      setPlayers(Array(5).fill(null).map(() => ({ name: '', role: '', is_substitute: false })))
    }
    setIsFormOpen(true)
  }

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const submitData = new FormData()
      submitData.append('name', formData.name)
      submitData.append('sport', formData.sport)
      submitData.append('logo_color', formData.logo_color)
      if (formData.logo) {
        submitData.append('logo', formData.logo)
      }
      
      submitData.append('players', JSON.stringify(players.filter(p => p.name.trim() !== '')))
      
      if (editingTeamId) {
        await apiClient.patch(`${ENDPOINTS.TEAMS}${editingTeamId}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        alert('Team updated successfully!')
      } else {
        await apiClient.post(ENDPOINTS.TEAMS, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        alert('Team registered successfully!')
      }
      
      setIsFormOpen(false)
      fetchTeams()
    } catch (err) {
      console.error('Error saving team:', err)
      alert('Failed to save team.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this team?')) return
    try {
      await apiClient.delete(`${ENDPOINTS.TEAMS}${id}/`)
      if (viewingTeam?.id === id) setViewingTeam(null)
      fetchTeams()
    } catch (err) {
      alert('Failed to delete team')
    }
  }

  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BASE_URL.replace('/api', '')}${url}`;
  }

  const selectedSportData = sports.find(s => s.id.toString() === formData.sport)

  if (isFormOpen) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6 max-w-5xl mx-auto p-4 md:p-8"
      >
        <header className="flex justify-between items-center pb-4 border-b border-border/50">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-brand to-brand/60 bg-clip-text text-transparent">
              {editingTeamId ? 'Edit Team' : 'Register a New Team'}
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">Build your squad and configure your team settings beautifully.</p>
          </div>
          <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)} className="rounded-full shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
            Cancel
          </Button>
        </header>

        <form onSubmit={handleSaveTeam} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="space-y-3">
              <Label className="text-sm font-bold text-gray-700 ml-1">Team Name</Label>
              <Input 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. Thunderbolts XI" 
                className="h-12 rounded-xl bg-gray-50/50 border-gray-200 focus:bg-white focus:ring-brand/20 transition-all shadow-sm"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-gray-700 ml-1">Select Sport</Label>
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
                onChange={e => handleSportChange(e.target.value)}
                className="w-full h-12 border border-gray-200 rounded-xl px-4 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-brand/20 outline-none transition-all shadow-sm font-medium text-gray-700"
              >
                <option value="">-- Choose a Sport --</option>
                {sports.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-bold text-gray-700 ml-1">Team Logo (Optional)</Label>
              <div className="h-12 flex items-center bg-gray-50/50 border border-gray-200 rounded-xl px-4 shadow-sm overflow-hidden">
                <input 
                  type="file"
                  accept="image/*"
                  onChange={e => setFormData({...formData, logo: e.target.files ? e.target.files[0] : null})}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 transition-all cursor-pointer outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 flex flex-col">
              <Label className="text-sm font-bold text-gray-700 ml-1">Team Theme Color</Label>
              <div className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-200 w-max shadow-sm">
                <input 
                  type="color" 
                  value={formData.logo_color}
                  onChange={e => setFormData({...formData, logo_color: e.target.value})}
                  className="h-10 w-16 cursor-pointer rounded-xl border-none bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-xl [&::-webkit-color-swatch]:border-none shadow-sm"
                />
                <span className="text-sm font-bold tracking-wider text-gray-600 uppercase w-20 text-center">{formData.logo_color}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h3 className="text-2xl font-black flex items-center gap-3 text-gray-800">
                  <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  Squad Setup
                </h3>
                <p className="text-sm text-gray-500 font-medium mt-2 ml-1">
                  {selectedSportData 
                    ? `Configure up to ${selectedSportData.team_size_max || 'unlimited'} players for ${selectedSportData.name}.`
                    : 'Select a sport first to configure your dynamic squad.'}
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => addPlayerRow(false)}
                  className="rounded-xl border-gray-200 bg-white hover:bg-brand/5 hover:text-brand hover:border-brand/30 shadow-sm transition-all h-11 px-5"
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Add Player
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => addPlayerRow(true)}
                  className="rounded-xl border-gray-200 bg-white hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 shadow-sm transition-all h-11 px-5"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Sub
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence>
                {players.map((player, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`relative p-5 rounded-2xl border-2 transition-all duration-300 group ${
                      player.is_substitute 
                        ? 'bg-orange-50/30 border-orange-100 hover:border-orange-300 hover:shadow-orange-100/50' 
                        : 'bg-white border-gray-100 hover:border-brand/30 hover:shadow-brand/5'
                    } hover:shadow-xl`}
                  >
                    <button 
                      type="button" 
                      onClick={() => removePlayerRow(idx)} 
                      className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 bg-white rounded-full p-1.5 shadow-sm border border-gray-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`p-1.5 rounded-lg ${player.is_substitute ? 'bg-orange-100 text-orange-600' : 'bg-brand/10 text-brand'}`}>
                        {player.is_substitute ? <Star className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </div>
                      <span className={`text-xs font-black uppercase tracking-widest ${player.is_substitute ? 'text-orange-600' : 'text-gray-500'}`}>
                        {player.is_substitute ? 'Substitute' : `Player ${idx + 1}`}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <Input 
                        placeholder="Enter player name" 
                        value={player.name}
                        onChange={e => handlePlayerChange(idx, 'name', e.target.value)}
                        className={`h-11 rounded-xl border-none shadow-inner focus:ring-2 transition-all ${
                          player.is_substitute ? 'bg-orange-50/50 focus:ring-orange-200' : 'bg-gray-50 focus:ring-brand/20'
                        }`}
                      />
                      {selectedSportData?.roles?.length ? (
                        <select
                          value={player.role}
                          onChange={e => handlePlayerChange(idx, 'role', e.target.value)}
                          className={`w-full h-11 rounded-xl px-4 outline-none transition-all shadow-inner font-medium text-sm border-none cursor-pointer appearance-none ${
                            player.is_substitute ? 'bg-orange-50/50 focus:ring-2 focus:ring-orange-200 text-orange-900' : 'bg-gray-50 focus:ring-2 focus:ring-brand/20 text-gray-700'
                          }`}
                        >
                          <option value="">Select Role</option>
                          {selectedSportData.roles.map((r: string) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                          <option value="Substitute">Substitute</option>
                        </select>
                      ) : (
                        <Input 
                          placeholder="Role (Optional)" 
                          value={player.role}
                          onChange={e => handlePlayerChange(idx, 'role', e.target.value)}
                          className={`h-11 rounded-xl border-none shadow-inner focus:ring-2 transition-all ${
                            player.is_substitute ? 'bg-orange-50/50 focus:ring-orange-200' : 'bg-gray-50 focus:ring-brand/20'
                          }`}
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {players.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <Users className="w-8 h-8 text-gray-300" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-700 mb-2">Squad is Empty</h4>
                  <p className="text-sm text-gray-500 max-w-sm text-center mb-6">Add players or substitutes to start building your dream team.</p>
                  <Button onClick={() => addPlayerRow()} variant="outline" className="rounded-full shadow-sm">
                    <UserPlus className="w-4 h-4 mr-2" /> Add First Player
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 pb-12">
            <Button type="submit" disabled={loading} className="w-full md:w-auto px-10 h-14 rounded-2xl text-lg font-black bg-brand text-primary-foreground hover:bg-brand-hover shadow-xl hover:shadow-brand/20 transition-all transform hover:-translate-y-1">
              {loading ? 'Saving...' : <><Save className="w-5 h-5 mr-2" /> {editingTeamId ? 'Update Team' : 'Register Team'}</>}
            </Button>
          </div>
        </form>

        {/* Quick Add Sport Modal */}
        {showQuickSportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-card w-full max-w-md rounded-2xl p-6 border border-border shadow-2xl relative">
              <h3 className="text-lg font-black text-foreground mb-1">Add Sport</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Type any custom sport name to add it dynamically:
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleQuickAddSport()
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="quickSport" className="text-xs font-bold">Sport Name</Label>
                  <Input
                    id="quickSport"
                    required
                    autoFocus
                    placeholder="e.g. Cricket, Volleyball, Dodgeball"
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
      </motion.div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border/50">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Teams Hub</h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage your squads and track your teams seamlessly.</p>
        </div>
        <Button onClick={() => openForm()} className="bg-brand text-primary-foreground font-bold shadow-lg hover:shadow-brand/20 hover:bg-brand-hover rounded-xl h-11 px-6 transition-all">
          <Plus className="w-5 h-5 mr-2" /> Create New Team
        </Button>
      </header>

      {teams.length === 0 ? (
        <div className="text-center py-24 bg-white/50 backdrop-blur-xl rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100">
            <Users className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-2xl font-black mb-3 text-gray-800">No Teams Found</h3>
          <p className="text-gray-500 font-medium max-w-md mb-8 leading-relaxed">You haven't registered any teams yet. Create one to start managing your squads for upcoming matches and tournaments.</p>
          <Button onClick={() => openForm()} variant="outline" className="border-brand/30 text-brand hover:bg-brand/5 font-bold rounded-xl h-12 px-8 shadow-sm">
            Register your first team
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teams.map(team => (
            <motion.div 
              key={team.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setViewingTeam(team)}
              className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer group"
            >
              <div className="h-32 relative p-6 flex items-end overflow-hidden" style={{ backgroundColor: team.logo_color + '15' }}>
                <div 
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-20 transition-transform duration-700 group-hover:scale-150" 
                  style={{ backgroundColor: team.logo_color }} 
                />
                
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <button onClick={(e) => { e.stopPropagation(); openForm(team); }} className="w-9 h-9 rounded-full bg-white/80 hover:bg-blue-500 hover:text-white backdrop-blur-md flex items-center justify-center text-blue-500 transition-all shadow-sm border border-white/20">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => handleDelete(team.id, e)} className="w-9 h-9 rounded-full bg-white/80 hover:bg-red-500 hover:text-white backdrop-blur-md flex items-center justify-center text-red-500 transition-all shadow-sm border border-white/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-4 w-full z-10">
                  {team.logo ? (
                    <img src={getImageUrl(team.logo)} alt={`${team.name} Logo`} className="w-14 h-14 rounded-2xl object-cover shadow-lg border border-white/20 transform -rotate-3 group-hover:rotate-0 transition-transform bg-white" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg border border-white/20 transform -rotate-3 group-hover:rotate-0 transition-transform" style={{ backgroundColor: team.logo_color, color: '#fff' }}>
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-black truncate pr-4 text-gray-900 drop-shadow-sm group-hover:text-brand transition-colors">{team.name}</h3>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mt-1" style={{ color: team.logo_color }}>
                      {team.sport_name || 'Sport'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 flex-1 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-5 text-sm font-bold text-gray-500 uppercase tracking-wider">
                    <Activity className="w-4 h-4" /> Squad Members <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md ml-1">{team.players.length}</span>
                  </div>
                  <ul className="space-y-3">
                    {team.players.slice(0, 3).map(p => (
                      <li key={p.id || p.name} className="flex justify-between items-center text-sm p-3 rounded-xl bg-gray-50/50 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${p.is_substitute ? 'bg-orange-400' : 'bg-brand'}`} />
                          <span className="font-bold text-gray-800">{p.name}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                          p.is_substitute ? 'bg-orange-100 text-orange-700' : 'bg-white text-gray-500 border border-gray-200 shadow-sm'
                        }`}>
                          {p.is_substitute ? 'Sub' : p.role || 'Player'}
                        </span>
                      </li>
                    ))}
                    {team.players.length > 3 && (
                      <li className="text-xs text-center text-brand font-bold pt-3 pb-1">
                        + {team.players.length - 3} more players
                      </li>
                    )}
                    {team.players.length === 0 && (
                      <li className="text-sm text-center text-gray-400 italic py-4">No squad members yet.</li>
                    )}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Team Details Modal */}
      <AnimatePresence>
        {viewingTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setViewingTeam(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="h-32 sm:h-40 relative p-6 sm:p-8 flex items-end shrink-0" style={{ backgroundColor: viewingTeam.logo_color + '20' }}>
                <button onClick={() => setViewingTeam(null)} className="absolute top-4 right-4 w-8 h-8 bg-white/50 hover:bg-white rounded-full flex items-center justify-center transition-colors shadow-sm">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-5 z-10 w-full">
                  {viewingTeam.logo ? (
                    <img src={getImageUrl(viewingTeam.logo)} alt={`${viewingTeam.name} Logo`} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-xl border-4 border-white bg-white" />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-black text-4xl shadow-xl border-4 border-white" style={{ backgroundColor: viewingTeam.logo_color, color: '#fff' }}>
                      {viewingTeam.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pb-1">
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 truncate">{viewingTeam.name}</h2>
                    <p className="text-sm font-bold uppercase tracking-widest mt-1" style={{ color: viewingTeam.logo_color }}>
                      {viewingTeam.sport_name || 'Sport'}
                    </p>
                  </div>
                  <Button onClick={() => { setViewingTeam(null); openForm(viewingTeam); }} className="hidden sm:flex bg-white text-gray-900 hover:bg-gray-50 shadow-md">
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Team
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-gray-50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand" /> Full Squad Lineup
                  </h3>
                  <span className="bg-white border border-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                    {viewingTeam.players.length} Members
                  </span>
                </div>

                {viewingTeam.players.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 font-medium">No players found in this team.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {viewingTeam.players.map((p, i) => (
                      <div key={p.id || i} className={`p-4 rounded-2xl border ${p.is_substitute ? 'bg-orange-50/50 border-orange-100' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-black text-gray-900">{p.name}</span>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            p.is_substitute ? 'bg-orange-100 text-orange-700' : 'bg-brand/10 text-brand'
                          }`}>
                            {p.is_substitute ? 'Sub' : 'Main'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-500">{p.role || 'No specific role'}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-8 sm:hidden">
                  <Button onClick={() => { setViewingTeam(null); openForm(viewingTeam); }} className="w-full bg-white text-gray-900 hover:bg-gray-50 shadow-md">
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Team
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
