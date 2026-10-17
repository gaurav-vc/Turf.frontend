import { useState, useEffect } from 'react'
import { apiClient } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create')
  
  const [turfs, setTurfs] = useState([])
  
  // Manager List State
  const [managers, setManagers] = useState([])
  const [totalManagers, setTotalManagers] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Form State
  const [loading, setLoading] = useState(false)
  const [editingManagerId, setEditingManagerId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    turf_id: ''
  })
  
  const fetchTurfs = () => {
    const token = localStorage.getItem('access_token')
    apiClient.get('/v1/turfs-app/turfs/', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setTurfs(res.data)).catch(console.error)
  }

  const fetchManagers = (page = 1) => {
    const token = localStorage.getItem('access_token')
    apiClient.get(`/v1/accounts/users/?user_type=MANAGER&paginate=true&page=${page}&page_size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setManagers(res.data.results || [])
      setTotalManagers(res.data.count || 0)
      setTotalPages(Math.ceil((res.data.count || 0) / 10))
      setCurrentPage(page)
    }).catch(console.error)
  }

  useEffect(() => {
    fetchTurfs()
    fetchManagers(1)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const config = { headers: { Authorization: `Bearer ${token}` } }

      if (editingManagerId) {
        // Edit Mode
        const updateData: any = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
        }
        if (form.password) updateData.password = form.password // Only update if provided
        
        await apiClient.patch(`/v1/accounts/users/${editingManagerId}/`, updateData, config)
        
        // Turf assignment
        if (form.turf_id) {
           await apiClient.patch(`/v1/turfs-app/turfs/${form.turf_id}/`, {
             owner: editingManagerId
           }, config)
        }
        
        alert('Manager Updated Successfully!')
        setEditingManagerId(null)
      } else {
        // Create Mode
        await apiClient.post('/v1/accounts/admin-create-user/', {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          password: form.password
        }, config)

        const usersRes = await apiClient.get('/v1/accounts/users/', config)
        const newUser = usersRes.data.find((u: any) => u.email === form.email)

        if (!newUser) throw new Error("Could not find newly created user")

        await apiClient.patch(`/v1/accounts/users/${newUser.id}/`, {
          user_type: 'MANAGER'
        }, config)

        if (form.turf_id) {
          await apiClient.patch(`/v1/turfs-app/turfs/${form.turf_id}/`, {
            owner: newUser.id
          }, config)
        }
        alert('Site Manager Created & Assigned Successfully!')
      }

      setForm({ full_name: '', email: '', phone: '', password: '', turf_id: '' })
      fetchManagers(currentPage)
      setActiveTab('list')
    } catch (err) {
      console.error(err)
      alert(editingManagerId ? 'Failed to update manager.' : 'Failed to create manager.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (m: any) => {
    setForm({
      full_name: m.full_name || '',
      email: m.email || '',
      phone: m.phone || '',
      password: '', // Don't prefill password
      turf_id: ''
    })
    setEditingManagerId(m.id)
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Manager?')) return
    setDeletingId(id)
    try {
      const token = localStorage.getItem('access_token')
      await apiClient.delete(`/v1/accounts/users/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchManagers(currentPage)
    } catch (err) {
      console.error(err)
      alert('Failed to delete manager.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-2">
      <header className="pb-4 border-b border-border">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Manage Site Managers</h1>
        <p className="text-muted-foreground mt-1">Create new manager accounts and assign them to turfs.</p>
      </header>
      
      {/* TABS */}
      <div className="flex space-x-2 border-b border-border mb-6">
        <button 
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'create' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {editingManagerId ? 'Edit Manager' : 'Assign Site Manager'}
        </button>
        <button 
          onClick={() => { setActiveTab('list'); setEditingManagerId(null); setForm({ full_name: '', email: '', phone: '', password: '', turf_id: '' }); }}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'list' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          All Assigned Managers
        </button>
      </div>

      {/* TAB CONTENT */}
      <div>
        {activeTab === 'create' && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-brand text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                {editingManagerId ? '✏️' : '1'}
              </span> 
              {editingManagerId ? 'Edit Manager' : 'Create a New Manager'}
            </h2>
            {editingManagerId && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingManagerId(null); setForm({ full_name: '', email: '', phone: '', password: '', turf_id: '' }); }} className="text-muted-foreground">
                Cancel Edit
              </Button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Manager Name" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="manager@turf.com" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="1234567890" />
              </div>
              <div className="space-y-2">
                <Label>{editingManagerId ? 'New Password (Optional)' : 'Temporary Password'}</Label>
                <Input required={!editingManagerId} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label>Assign to Turf</Label>
              <select 
                required={!editingManagerId} 
                value={form.turf_id} 
                onChange={e => setForm({...form, turf_id: e.target.value})}
                className="w-full h-11 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none"
              >
                <option value="" className="bg-background text-foreground">-- Select Turf to Manage --</option>
                {turfs.map((t: any) => (
                  <option key={t.id} value={t.id} className="bg-background text-foreground">{t.name} ({t.city})</option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-brand hover:bg-brand-hover text-white h-12 font-bold mt-4">
              {loading ? 'Processing...' : (editingManagerId ? 'Update Manager' : 'Create & Assign Manager')}
            </Button>
          </form>
        </section>
        )}

        {activeTab === 'list' && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-brand text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> 
              All Assigned Managers ({totalManagers})
            </h2>
          </div>
          
          {managers.length === 0 ? (
            <div className="bg-card p-10 text-center rounded-xl border border-border text-muted-foreground">
              No managers have been assigned yet.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4 font-bold">Name</th>
                      <th className="px-6 py-4 font-bold">Email</th>
                      <th className="px-6 py-4 font-bold">Phone</th>
                      <th className="px-6 py-4 font-bold">Date Joined</th>
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {managers.map((m: any) => (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{m.full_name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{m.email}</td>
                        <td className="px-6 py-4 text-muted-foreground">{m.phone}</td>
                        <td className="px-6 py-4 text-muted-foreground">{new Date(m.date_joined).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEditClick(m)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(m.id)}
                            disabled={deletingId === m.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
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
                    onClick={() => fetchManagers(currentPage - 1)} 
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchManagers(currentPage + 1)} 
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
