import { useState, useEffect } from 'react'
import { apiClient } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AddMaintenance() {
  const [turfs, setTurfs] = useState([])
  const [courts, setCourts] = useState([])
  const [blockedDates, setBlockedDates] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('create')
  
  const [form, setForm] = useState({ court: '', start_at: '', end_at: '', reason: 'Maintenance' })
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchTurfsAndCourts = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const [turfsRes, courtsRes] = await Promise.all([
        apiClient.get('/v1/turfs-app/turfs/?owner_me=true', { headers: { Authorization: `Bearer ${token}` } }),
        apiClient.get('/v1/turfs-app/courts/?owner_me=true', { headers: { Authorization: `Bearer ${token}` } })
      ])
      setTurfs(turfsRes.data.results || turfsRes.data || [])
      setCourts(courtsRes.data.results || courtsRes.data || [])
    } catch (err) {
      console.error('Failed to fetch dependencies', err)
    }
  }

  const fetchBlockedDates = async (page = 1) => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await apiClient.get(`/v1/turfs-app/blocked-periods/?paginate=true&page=${page}&page_size=10&owner_me=true`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBlockedDates(res.data.results || [])
      setTotalItems(res.data.count || 0)
      setTotalPages(Math.ceil((res.data.count || 0) / 10))
      setCurrentPage(page)
    } catch (err) {
      console.error('Failed to fetch blocked dates', err)
    }
  }

  useEffect(() => {
    fetchTurfsAndCourts()
    fetchBlockedDates(1)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const token = localStorage.getItem('access_token')
      if (editingId) {
        await apiClient.patch(`/v1/turfs-app/blocked-periods/${editingId}/`, form, {
          headers: { Authorization: `Bearer ${token}` }
        })
        alert('Blocked Date Updated Successfully!')
        setEditingId(null)
      } else {
        await apiClient.post('/v1/turfs-app/blocked-periods/', form, {
          headers: { Authorization: `Bearer ${token}` }
        })
        alert('Maintenance/Holiday Blocked Period added!')
      }
      setForm({ court: '', start_at: '', end_at: '', reason: 'Maintenance' })
      fetchBlockedDates(currentPage)
      setActiveTab('list')
    } catch (err) {
      console.error(err)
      alert(editingId ? 'Failed to update.' : 'Failed to create.')
    } finally {
      setCreating(false)
    }
  }

  const handleEditClick = (b: any) => {
    // Ensure datetime strings are formatted for <input type="datetime-local">
    const formatDateTime = (dateString: string) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      // shift timezone to local for input
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
      return date.toISOString().slice(0, 16)
    }

    setForm({
      court: b.court || b.court_id || '',
      start_at: formatDateTime(b.start_at),
      end_at: formatDateTime(b.end_at),
      reason: b.reason || 'Maintenance'
    })
    setEditingId(b.id)
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to unblock these dates?')) return
    setDeletingId(id)
    try {
      const token = localStorage.getItem('access_token')
      await apiClient.delete(`/v1/turfs-app/blocked-periods/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchBlockedDates(currentPage)
    } catch (err) {
      console.error(err)
      alert('Failed to delete blocked date.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-2">
      
      <header className="pb-4 border-b border-border">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Block Dates</h1>
        <p className="text-muted-foreground mt-1">Manage turf maintenance or holidays by blocking bookings.</p>
      </header>

      {/* TABS */}
      <div className="flex space-x-2 border-b border-border mb-6">
        <button 
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'create' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {editingId ? 'Edit Blocked Date' : 'Add Blocked Date'}
        </button>
        <button 
          onClick={() => { setActiveTab('list'); setEditingId(null); setForm({ court: '', start_at: '', end_at: '', reason: 'Maintenance' }); }}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'list' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          All Blocked Dates
        </button>
      </div>
      
      {/* TAB CONTENT */}
      <div>
        {activeTab === 'create' && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                {editingId ? '✏️' : '1'}
              </span> 
              {editingId ? 'Edit Blocked Date' : 'Block New Dates'}
            </h2>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setForm({ court: '', start_at: '', end_at: '', reason: 'Maintenance' }); }} className="text-muted-foreground">
                Cancel Edit
              </Button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Court</Label>
                <select 
                  className="w-full h-10 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none" 
                  value={form.court} 
                  onChange={e => setForm({...form, court: e.target.value})} 
                  required
                >
                  <option value="" className="bg-background text-foreground">-- Select Court --</option>
                  {courts.map((c: any) => {
                    const turf: any = turfs.find((t: any) => t.id === c.turf || t.id === c.turf_id)
                    return (
                      <option key={c.id} value={c.id} className="bg-background text-foreground">
                        {turf ? turf.name : 'Unknown Turf'} - {c.name}
                      </option>
                    )
                  })}
                </select>
                {courts.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1">You must create a Court first before blocking dates.</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date & Time</Label>
                  <Input type="datetime-local" value={form.start_at} onChange={e => setForm({...form, start_at: e.target.value})} required className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label>End Date & Time</Label>
                  <Input type="datetime-local" value={form.end_at} onChange={e => setForm({...form, end_at: e.target.value})} required className="bg-background border-border" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} required placeholder="e.g. Pitch Maintenance, Public Holiday" />
              </div>
            </div>
            <Button type="submit" disabled={creating || courts.length === 0} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-11 mt-6 shadow-sm">
              {creating ? 'Saving...' : (editingId ? 'Update Blocked Date' : 'Mark as Blocked')}
            </Button>
          </form>
        </section>
        )}

      {activeTab === 'list' && (
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> 
            Ongoing & Scheduled Blocked Dates ({totalItems})
          </h2>
        </div>
        
        {blockedDates.length === 0 ? (
          <div className="bg-card p-10 text-center rounded-xl border border-border text-muted-foreground">
            No courts are currently blocked.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-bold">Court & Turf</th>
                    <th className="px-6 py-4 font-bold">Start Time</th>
                    <th className="px-6 py-4 font-bold">End Time</th>
                    <th className="px-6 py-4 font-bold">Reason</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {blockedDates.map((b: any) => {
                    const court: any = courts.find((c: any) => c.id === b.court || c.id === b.court_id)
                    const turf: any = court ? turfs.find((t: any) => t.id === court.turf || t.id === court.turf_id) : null
                    
                    return (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">
                          {court ? `${turf ? turf.name : 'Unknown'} - ${court.name}` : `Court #${b.court}`}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{new Date(b.start_at).toLocaleString()}</td>
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{new Date(b.end_at).toLocaleString()}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          <span className="bg-orange-500/10 text-orange-600 px-2 py-1 rounded-md text-xs font-semibold">{b.reason}</span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEditClick(b)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(b.id)}
                            disabled={deletingId === b.id}
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
                  onClick={() => fetchBlockedDates(currentPage - 1)} 
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchBlockedDates(currentPage + 1)} 
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
