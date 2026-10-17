import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Plus, Trash2, Edit2, RefreshCw, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient, ENDPOINTS } from '@/api/apiClient'

interface Sport {
  id: number
  name: string
  slug: string
  team_size_min: number
  team_size_max: number
  scoring_engine: string
  roles?: string[]
}

const PRESET_SPORTS = [
  { name: 'Cricket', team_size_min: 6, team_size_max: 11, scoring_engine: 'runs_wickets' },
  { name: 'Box Cricket', team_size_min: 6, team_size_max: 8, scoring_engine: 'runs_wickets' },
  { name: 'Football', team_size_min: 5, team_size_max: 11, scoring_engine: 'goals' },
  { name: 'Futsal', team_size_min: 5, team_size_max: 8, scoring_engine: 'goals' },
  { name: 'Pickleball', team_size_min: 1, team_size_max: 2, scoring_engine: 'points' },
  { name: 'Tennis', team_size_min: 1, team_size_max: 2, scoring_engine: 'sets_games_points' },
  { name: 'Badminton', team_size_min: 1, team_size_max: 2, scoring_engine: 'points' },
  { name: 'Basketball', team_size_min: 3, team_size_max: 5, scoring_engine: 'points' },
  { name: 'Volleyball', team_size_min: 6, team_size_max: 8, scoring_engine: 'sets_points' },
]

export default function AdminSports() {
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSport, setEditingSport] = useState<Sport | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    team_size_min: 1,
    team_size_max: 11,
    scoring_engine: 'standard',
  })

  useEffect(() => {
    fetchSports()
  }, [])

  const fetchSports = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(ENDPOINTS.SPORTS)
      setSports(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to load sports', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingSport(null)
    setFormData({
      name: '',
      team_size_min: 1,
      team_size_max: 11,
      scoring_engine: 'standard',
    })
    setErrorMsg('')
    setShowAddModal(true)
  }

  const handleEditSport = (sport: Sport) => {
    setEditingSport(sport)
    setFormData({
      name: sport.name,
      team_size_min: sport.team_size_min,
      team_size_max: sport.team_size_max,
      scoring_engine: sport.scoring_engine || 'standard',
    })
    setErrorMsg('')
    setShowAddModal(true)
  }

  const handleApplyPreset = (preset: typeof PRESET_SPORTS[0]) => {
    setFormData({
      name: preset.name,
      team_size_min: preset.team_size_min,
      team_size_max: preset.team_size_max,
      scoring_engine: preset.scoring_engine,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setErrorMsg('Sport name is required.')
      return
    }

    setSaving(true)
    setErrorMsg('')
    try {
      if (editingSport) {
        await apiClient.put(`${ENDPOINTS.SPORTS}${editingSport.id}/`, formData)
      } else {
        await apiClient.post(ENDPOINTS.SPORTS, formData)
      }
      setShowAddModal(false)
      fetchSports()
    } catch (err: any) {
      console.error('Failed to save sport', err)
      setErrorMsg(err.response?.data?.name?.[0] || 'Failed to save sport. Please check fields.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this sport? Associated tournaments may be affected.')) return
    try {
      await apiClient.delete(`${ENDPOINTS.SPORTS}${id}/`)
      fetchSports()
    } catch (err) {
      alert('Failed to delete sport.')
    }
  }

  const handleSeedDefaults = async () => {
    setSaving(true)
    try {
      for (const preset of PRESET_SPORTS) {
        const exists = sports.some(s => s.name.toLowerCase() === preset.name.toLowerCase())
        if (!exists) {
          await apiClient.post(ENDPOINTS.SPORTS, preset).catch(() => {})
        }
      }
      fetchSports()
      alert('Standard sports have been successfully seeded!')
    } catch (err) {
      console.error('Seeding failed', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-brand" />
            Manage Sports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure available sports categories for tournaments, teams, and live scoring.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {sports.length === 0 && (
            <Button
              variant="outline"
              onClick={handleSeedDefaults}
              disabled={saving}
              className="border-brand text-brand hover:bg-brand/10"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Seed Popular Sports
            </Button>
          )}
          <Button onClick={handleOpenAdd} className="bg-brand text-white hover:bg-brand-hover">
            <Plus className="w-4 h-4 mr-2" /> Add Sport
          </Button>
        </div>
      </div>

      {/* Sports Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-brand" />
        </div>
      ) : sports.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-2xl border border-border">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-lg font-bold text-foreground">No Sports Added Yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Tournaments and teams require at least one registered sport. Click "Seed Popular Sports" to quickly populate Cricket, Football, Pickleball, Tennis, and more.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={handleSeedDefaults} disabled={saving} className="bg-brand text-white hover:bg-brand-hover">
              <Sparkles className="w-4 h-4 mr-2" /> Seed Popular Sports Now
            </Button>
            <Button variant="outline" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-2" /> Create Custom Sport
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sports.map((sport) => (
            <motion.div
              key={sport.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-black">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {sport.scoring_engine || 'Standard'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-foreground mb-1">{sport.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">slug: {sport.slug}</p>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-brand" />
                    <span>{sport.team_size_min} - {sport.team_size_max} players/team</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditSport(sport)}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(sport.id)}
                  className="h-8 px-2.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Sport Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-2xl p-6 border border-border shadow-2xl relative"
            >
              <h2 className="text-xl font-black text-foreground mb-1">
                {editingSport ? 'Edit Sport' : 'Add New Sport'}
              </h2>
              <p className="text-xs text-muted-foreground mb-5">
                Configure tournament team limits and scoring rules for this sport.
              </p>

              {/* Quick Preset Selector */}
              {!editingSport && (
                <div className="mb-5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Quick Presets:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SPORTS.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                          formData.name === p.name
                            ? 'bg-brand text-white border-brand font-bold'
                            : 'bg-muted/50 border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="sportName" className="text-xs font-bold">Sport Name</Label>
                  <Input
                    id="sportName"
                    required
                    placeholder="e.g. Cricket, Football, Pickleball"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="minPlayers" className="text-xs font-bold">Min Team Players</Label>
                    <Input
                      id="minPlayers"
                      type="number"
                      min={1}
                      value={formData.team_size_min}
                      onChange={e => setFormData({ ...formData, team_size_min: parseInt(e.target.value) || 1 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxPlayers" className="text-xs font-bold">Max Team Players</Label>
                    <Input
                      id="maxPlayers"
                      type="number"
                      min={1}
                      value={formData.team_size_max}
                      onChange={e => setFormData({ ...formData, team_size_max: parseInt(e.target.value) || 11 })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="scoringEngine" className="text-xs font-bold">Scoring Engine</Label>
                  <select
                    id="scoringEngine"
                    value={formData.scoring_engine}
                    onChange={e => setFormData({ ...formData, scoring_engine: e.target.value })}
                    className="w-full h-10 border border-border rounded-md px-3 bg-background text-sm mt-1 focus:ring-2 focus:ring-brand outline-none"
                  >
                    <option value="standard">Standard Points</option>
                    <option value="runs_wickets">Cricket (Runs & Wickets)</option>
                    <option value="goals">Football / Futsal (Goals)</option>
                    <option value="sets_games_points">Tennis (Sets, Games & Points)</option>
                    <option value="sets_points">Volleyball / Table Tennis (Sets & Points)</option>
                    <option value="points">Direct Points</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-brand text-white hover:bg-brand-hover"
                  >
                    {saving ? 'Saving...' : editingSport ? 'Update Sport' : 'Create Sport'}
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
