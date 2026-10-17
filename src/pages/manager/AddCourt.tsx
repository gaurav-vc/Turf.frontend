import { useState, useEffect } from 'react'
import { apiClient } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AddCourt() {
  const [turfs, setTurfs] = useState([])
  const [courts, setCourts] = useState([])
  const [totalCourts, setTotalCourts] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('create')
  
  const [form, setForm] = useState({ turf: '', name: '', capacity: 10, surface: '' })
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchTurfs = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await apiClient.get('/v1/turfs-app/turfs/?owner_me=true', {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Ensure we get array of turfs
      setTurfs(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to fetch turfs', err)
    }
  }

  const fetchCourts = async (page = 1) => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await apiClient.get(`/v1/turfs-app/courts/?paginate=true&page=${page}&page_size=10&owner_me=true`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCourts(res.data.results || [])
      setTotalCourts(res.data.count || 0)
      setTotalPages(Math.ceil((res.data.count || 0) / 10))
      setCurrentPage(page)
    } catch (err) {
      console.error('Failed to fetch courts', err)
    }
  }

  useEffect(() => {
    fetchTurfs()
    fetchCourts(1)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const token = localStorage.getItem('access_token')
      if (editingId) {
        await apiClient.patch(`/v1/turfs-app/courts/${editingId}/`, form, {
          headers: { Authorization: `Bearer ${token}` }
        })
        alert('Court Updated Successfully!')
        setEditingId(null)
      } else {
        await apiClient.post('/v1/turfs-app/courts/', form, {
          headers: { Authorization: `Bearer ${token}` }
        })
        alert('Court Created Successfully!')
      }
      setForm({ turf: '', name: '', capacity: 10, surface: '' })
      fetchCourts(currentPage)
      setActiveTab('list')
    } catch (err) {
      console.error(err)
      alert(editingId ? 'Failed to update Court.' : 'Failed to create Court.')
    } finally {
      setCreating(false)
    }
  }

  const handleEditClick = (c: any) => {
    setForm({
      turf: c.turf || c.turf_id || '',
      name: c.name,
      capacity: c.capacity,
      surface: c.surface || ''
    })
    setEditingId(c.id)
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Court?')) return
    setDeletingId(id)
    try {
      const token = localStorage.getItem('access_token')
      await apiClient.delete(`/v1/turfs-app/courts/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchCourts(currentPage)
    } catch (err) {
      console.error(err)
      alert('Failed to delete court.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-2">
      
      <header className="pb-4 border-b border-border">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Manage Courts</h1>
        <p className="text-muted-foreground mt-1">Add specific pitches or courts to an existing venue.</p>
      </header>

      {/* TABS */}
      <div className="flex space-x-2 border-b border-border mb-6">
        <button 
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'create' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {editingId ? 'Edit Court' : 'Create a New Court'}
        </button>
        <button 
          onClick={() => { setActiveTab('list'); setEditingId(null); setForm({ turf: '', name: '', capacity: 10, surface: '' }); }}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'list' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          All Registered Courts
        </button>
      </div>
      
      {/* TAB CONTENT */}
      <div>
        {activeTab === 'create' && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-brand text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                {editingId ? '✏️' : '1'}
              </span> 
              {editingId ? 'Edit Court' : 'Create a New Court'}
            </h2>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setForm({ turf: '', name: '', capacity: 10, surface: '' }); }} className="text-muted-foreground">
                Cancel Edit
              </Button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Turf</Label>
                <select 
                  className="w-full h-10 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none" 
                  value={form.turf} 
                  onChange={e => setForm({...form, turf: e.target.value})} 
                  required
                >
                  <option value="" className="bg-background text-foreground">-- Select Turf Venue --</option>
                  {turfs.map((t: any) => (
                    <option key={t.id} value={t.id} className="bg-background text-foreground">{t.name} ({t.city})</option>
                  ))}
                </select>
                {turfs.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">You must create a Turf venue first before adding a Court.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Court Name</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Court A" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Surface Type</Label>
                  <Input value={form.surface} onChange={e => setForm({...form, surface: e.target.value})} placeholder="e.g. Artificial Grass" />
                </div>
                <div className="space-y-2">
                  <Label>Capacity (Players)</Label>
                  <Input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value) || 10})} required />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={creating || turfs.length === 0} className="w-full bg-brand hover:bg-brand-hover text-white font-bold h-11 mt-6">
              {creating ? 'Saving...' : (editingId ? 'Update Court' : 'Create Court')}
            </Button>
          </form>
        </section>
        )}

      {activeTab === 'list' && (
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="bg-brand text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> 
            All Registered Courts ({totalCourts})
          </h2>
        </div>
        
        {courts.length === 0 ? (
          <div className="bg-card p-10 text-center rounded-xl border border-border text-muted-foreground">
            No courts have been registered yet.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-bold">Court Name</th>
                    <th className="px-6 py-4 font-bold">Turf Venue</th>
                    <th className="px-6 py-4 font-bold">Surface</th>
                    <th className="px-6 py-4 font-bold">Capacity</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courts.map((c: any) => {
                    const parentTurf: any = turfs.find((t: any) => t.id === c.turf || t.id === c.turf_id)
                    return (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{c.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{parentTurf ? parentTurf.name : `Turf #${c.turf}`}</td>
                        <td className="px-6 py-4 text-muted-foreground">{c.surface || 'N/A'}</td>
                        <td className="px-6 py-4 text-muted-foreground">{c.capacity} players</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEditClick(c)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(c.id)}
                            disabled={deletingId === c.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20">
              <div className="text-sm text-muted-foreground">
                Showing page <span className="font-medium text-foreground">{currentPage}</span> of <span className="font-medium text-foreground">{totalPages || 1}</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchCourts(currentPage - 1)} 
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchCourts(currentPage + 1)} 
                  disabled={currentPage >= totalPages}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
        </section>
      )}
      </div>
    </div>
  )
}
