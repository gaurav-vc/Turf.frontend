import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, Plus, MapPin, Search, Key, ChevronRight, X, UserPlus 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient, ENDPOINTS } from '@/api/apiClient'

interface Club {
  id: string
  name: string
  slug: string
  description: string
  theme_color: string
  privacy: string
  invite_code: string
  home_turf_name?: string
  is_owner: boolean
  user_role?: string
  members: any[]
  tournaments: any[]
  recent_matches: any[]
  customization: any
  created_at: string
}

export default function ClubsHub() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMine, setFilterMine] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [turfs, setTurfs] = useState<any[]>([])

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [creating, setCreating] = useState(false)

  // Create Club Form Data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    home_turf: '',
    theme_color: '#10b981',
    privacy: 'PUBLIC',
    co_admin_email: '',
    co_admin_role: 'CO_OWNER',
  })

  useEffect(() => {
    fetchClubs()
    fetchTurfs()
  }, [filterMine])

  const fetchClubs = async () => {
    setLoading(true)
    try {
      const url = filterMine ? `${ENDPOINTS.CLUBS}?mine=true` : ENDPOINTS.CLUBS
      const res = await apiClient.get(url)
      setClubs(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to fetch clubs', err)
      setClubs([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTurfs = async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.TURFS)
      setTurfs(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to fetch turfs', err)
    }
  }

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    setCreating(true)
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        home_turf: formData.home_turf || null,
        theme_color: formData.theme_color,
        privacy: formData.privacy,
        co_admin_email: formData.co_admin_email.trim() || undefined,
        co_admin_role: formData.co_admin_role,
        customization: {
          default_inning_minutes: 13,
          default_reminder_seconds: 120,
          default_player_count: 7,
          default_wickets_rule: 6,
          pause_presets: [
            { name: 'Wicket Break', seconds: 20 },
            { name: 'Ball Lost', seconds: 60 },
            { name: 'Injury Break', seconds: 60 },
            { name: 'Strategy Timeout', seconds: 90 },
          ]
        }
      }
      await apiClient.post(ENDPOINTS.CLUBS, payload)
      setShowCreateModal(false)
      setFormData({
        name: '',
        description: '',
        home_turf: '',
        theme_color: '#10b981',
        privacy: 'PUBLIC',
        co_admin_email: '',
        co_admin_role: 'CO_OWNER',
      })
      fetchClubs()
    } catch (err: any) {
      console.error('Failed to create club', err)
      alert(err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to create club')
    } finally {
      setCreating(false)
    }
  }

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCodeInput.trim()) return
    try {
      await apiClient.post(`${ENDPOINTS.CLUBS}join_by_invite/`, {
        invite_code: inviteCodeInput.trim().toUpperCase()
      })
      alert('Successfully joined the club!')
      setShowInviteModal(false)
      setInviteCodeInput('')
      fetchClubs()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to join club with code.')
    }
  }

  const filteredClubs = clubs.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.home_turf_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 border border-emerald-500/20 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Shield className="w-3.5 h-3.5" /> Club Network
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Club
            </h1>
            <p className="text-slate-300 max-w-xl mt-2 text-sm md:text-base font-medium">
              Create and manage your official club. Schedule recurring tournaments, run real-time matches with configurable wickets, and control live inning timers with break stoppage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={() => setShowInviteModal(true)}
              variant="outline"
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-bold"
            >
              <Key className="w-4 h-4 mr-2" /> Enter Invite Code
            </Button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/25"
            >
              <Plus className="w-4 h-4 mr-2 stroke-[3]" /> Create New Club
            </Button>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search clubs by name, description, or turf..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant={!filterMine ? 'default' : 'outline'}
            onClick={() => setFilterMine(false)}
            size="sm"
            className={!filterMine ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}
          >
            All Clubs
          </Button>
          <Button 
            variant={filterMine ? 'default' : 'outline'}
            onClick={() => setFilterMine(true)}
            size="sm"
            className={filterMine ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold' : ''}
          >
            My Clubs & Roles
          </Button>
        </div>
      </div>

      {/* Clubs Grid */}
      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        </div>
      ) : filteredClubs.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent text-center p-12">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-bold">No Clubs Found</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1 mb-6">
            {filterMine 
              ? "You haven't created or joined any clubs yet. Create your first club to get started!" 
              : "No clubs match your query. Create one now and invite co-owners and players!"}
          </p>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Club
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.map(club => (
            <motion.div
              key={club.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="h-full border-border bg-card/60 backdrop-blur-sm shadow-md hover:shadow-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between overflow-hidden relative group">
                <div 
                  className="h-3 w-full"
                  style={{ backgroundColor: club.theme_color || '#10b981' }}
                />
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-md"
                        style={{ backgroundColor: club.theme_color || '#10b981' }}
                      >
                        {club.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black group-hover:text-emerald-400 transition-colors">
                          {club.name}
                        </CardTitle>
                        {club.home_turf_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span>{club.home_turf_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {club.user_role && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        {club.user_role}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {club.description || 'Dedicated sports club with real-time tournament and match management.'}
                  </p>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/60 bg-muted/20 rounded-xl px-3 text-center">
                    <div>
                      <div className="text-lg font-black text-foreground">
                        {club.members?.length || 1}
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Members</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-foreground">
                        {club.tournaments?.length || 0}
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Tournaments</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-foreground">
                        {club.recent_matches?.length || 0}
                      </div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">Matches</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      Code: <strong className="font-mono text-emerald-400">{club.invite_code}</strong>
                    </span>
                    <Link to={`/clubs/${club.id}`}>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1">
                        View Club <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Club Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-950 to-slate-900 p-6 border-b border-border flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white flex items-center gap-2">
                    <Shield className="w-6 h-6 text-emerald-400" /> Create Sports Club
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    You will automatically become the Club Owner with full permission to appoint Co-Owners and Co-Admins.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-4 shrink-0"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateClub} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Club Name *</Label>
                  <Input 
                    required
                    placeholder="e.g. Royal Kings Cricket Club"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
                  <textarea 
                    rows={2}
                    placeholder="Short description of your club, goals, and history..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Home Turf</Label>
                    <select
                      value={formData.home_turf}
                      onChange={e => setFormData({ ...formData, home_turf: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-lg bg-background border border-border text-sm"
                    >
                      <option value="">None / Open Venue</option>
                      {turfs.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.city})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Theme Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input 
                        type="color"
                        value={formData.theme_color}
                        onChange={e => setFormData({ ...formData, theme_color: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                      />
                      <Input 
                        value={formData.theme_color}
                        onChange={e => setFormData({ ...formData, theme_color: e.target.value })}
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Appoint Co-Owner / Co-Administrator */}
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" /> Appoint Co-Owner or Co-Administrator
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400">Optional</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Provide the email or username of a member to grant immediate Co-Owner (full admin powers) or Co-Administrator (matches & tournaments) rights.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] font-bold">Email or Username</Label>
                      <Input 
                        placeholder="e.g. partner@example.com"
                        value={formData.co_admin_email}
                        onChange={e => setFormData({ ...formData, co_admin_email: e.target.value })}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold">Role Designation</Label>
                      <select
                        value={formData.co_admin_role}
                        onChange={e => setFormData({ ...formData, co_admin_role: e.target.value })}
                        className="w-full mt-1 h-9 px-2.5 rounded-lg bg-background border border-border text-xs font-bold"
                      >
                        <option value="CO_OWNER">Co-Owner (Full Admin Powers)</option>
                        <option value="CO_ADMIN">Co-Administrator (Matches & Tournaments)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={creating}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {creating ? 'Creating Club...' : 'Confirm & Create Club'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Join Club Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                  <Key className="w-5 h-5 text-emerald-400" /> Enter Club Invite Code
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors -mr-1 -mt-1"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Ask your club owner or co-owner for the unique 8-character invite code.
              </p>

              <form onSubmit={handleJoinByCode} className="space-y-4">
                <Input 
                  required
                  placeholder="e.g. A1B2C3D4"
                  value={inviteCodeInput}
                  onChange={e => setInviteCodeInput(e.target.value.toUpperCase())}
                  className="font-mono text-center text-lg tracking-widest font-black uppercase h-12"
                  maxLength={8}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    Join Club
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
