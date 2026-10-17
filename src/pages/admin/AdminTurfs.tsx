import { useState, useEffect } from 'react'
import { apiClient } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

const MUMBAI_HIERARCHY: Record<string, Record<string, string[]>> = {
  "Mumbai": {
    "Churchgate": ["Marine Drive", "Nariman Point", "Fort", "Colaba"],
    "Marine Lines": ["Kalbadevi", "Princess Street", "Dhobi Talao"],
    "Charni Road": ["Girgaon", "Opera House", "Thakurdwar"],
    "Grant Road": ["Tardeo", "Nana Chowk", "Kumbharwada"],
    "Mumbai Central": ["Agripada", "Tardeo", "Bellasis Road"],
    "Mahalaxmi": ["Haji Ali", "Warden Road", "Jacob Circle"],
    "Lower Parel": ["Kamala Mills", "High Street Phoenix", "Tulsi Pipe Road", "Delisle Road"],
    "Prabhadevi": ["Siddhivinayak", "Adarsh Nagar", "Appasaheb Marathe Marg"],
    "Dadar": ["Shivaji Park", "Dadar TT", "Hindmata", "Dadar West", "Dadar East"],
    "Matunga": ["Matunga East", "Matunga West", "Ruia College Road"],
    "Mahim": ["Mahim Causeway", "Sitladevi Temple", "Mori Road"],
    "Bandra": ["Bandra Kurla Complex (BKC)", "Carter Road", "Pali Hill", "Bandstand", "Linking Road", "Khar Danda"],
    "Khar Road": ["Khar West", "Khar East", "Pali Naka"],
    "Santacruz": ["Juhu", "Kalina", "Vakola", "Linking Road Extension"],
    "Vile Parle": ["Juhu Scheme", "Irla", "Milan Subway", "Vile Parle East", "Vile Parle West"],
    "Andheri": ["Lokhandwala Complex", "Versova", "Oshiwara", "Marol", "Saki Naka", "MIDC", "Chakala", "Seven Bungalows", "Four Bungalows"],
    "Jogeshwari": ["JVLR", "Meghwadi", "Amboli", "Oshiwara District Centre"],
    "Goregaon": ["Aarey Milk Colony", "Gokuldham", "Bangur Nagar", "Motilal Nagar", "Film City Road"],
    "Malad": ["Mindspace", "Orlem", "Evershine Nagar", "Marve", "Pathanwadi", "Malad West", "Malad East", "Chincholi Bunder"],
    "Kandivali": ["Thakur Village", "Thakur Complex", "Lokhandwala Township", "Charkop", "Mahavir Nagar", "Poisar", "Dahanukar Wadi"],
    "Borivali": ["IC Colony", "Gorai", "Shimpoli", "Eksar", "Yogi Nagar", "Chikuwadi", "Vazira Naka", "Devidas Lane"],
    "Dahisar": ["Kandarpara", "Shailendra Nagar", "Check Naka", "Dahisar East", "Dahisar West"],
    
    // Central Line Mumbai
    "CSMT": ["Fort", "Ballard Estate", "Colaba"],
    "Byculla": ["Mazgaon", "Clare Road", "Agripada"],
    "Parel": ["Lalbaug", "KEM Hospital", "Parel East"],
    "Kurla": ["Phoenix Marketcity", "Kamani", "Nehru Nagar", "Kohinoor City"],
    "Ghatkopar": ["Pant Nagar", "Asalpha", "Garodia Nagar", "Rajawadi"],
    "Vikhroli": ["Tagore Nagar", "Kannamwar Nagar", "Godrej Colony"],
    "Kanjurmarg": ["NGEF", "Crompton Greaves", "Hiranandani Link Road"],
    "Bhandup": ["LBS Marg", "Bhandup Village", "Sonapur"],
    "Mulund": ["Bhakti Marg", "Navghar", "LBS Road", "Mulund West", "Mulund East"],
    "Powai": ["Hiranandani Gardens", "Chandivali", "IIT Bombay", "Rambaug"]
  },
  "Navi Mumbai": {
    "Vashi": ["Sector 17", "Sector 9", "APMC Market", "Inorbit Mall", "Sector 29"],
    "Kopar Khairane": ["Sector 1", "Sector 3", "Ghansoli", "Sector 19"],
    "Turbhe": ["MIDC", "Sanpada", "Juinagar"],
    "Nerul": ["Seawoods", "Sector 15", "Sector 21", "Darave", "Shiravane"],
    "CBD Belapur": ["Sector 11", "Sector 15", "Artist Village", "Agroli"],
    "Kharghar": ["Sector 12", "Sector 20", "Utsav Chowk", "Little World Mall", "Sector 35"],
    "Panvel": ["Old Panvel", "New Panvel", "Khanda Colony", "Kalamboli"]
  },
  "Thane": {
    "Thane West": ["Ghodbunder Road", "Majiwada", "Vartak Nagar", "Upvan", "Manpada", "Waghbil", "Kasarvadavali"],
    "Thane East": ["Kopri", "Chendani Koliwada", "Hari Om Nagar"],
    "Kalwa": ["Kharegaon", "Parsik Nagar", "Vitawa"],
    "Mumbra": ["Kausa", "Shil Phata", "Daighar"],
    "Dombivli": ["Dombivli East", "Dombivli West", "Palava City", "MIDC"],
    "Kalyan": ["Kalyan West", "Kalyan East", "Khadakpada", "Bail Bazar"]
  }
}

export default function AdminTurfs() {
  const [turfs, setTurfs] = useState([])
  const [totalTurfs, setTotalTurfs] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('create')
  
  const [turfForm, setTurfForm] = useState({
    name: '',
    city: '',
    station: '',
    location: ''
  })
  const [creatingTurf, setCreatingTurf] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTurfId, setEditingTurfId] = useState<string | null>(null)

  const availableCities = Object.keys(MUMBAI_HIERARCHY)
  const availableStations = turfForm.city ? Object.keys(MUMBAI_HIERARCHY[turfForm.city]) : []
  const availableLocations = turfForm.station && turfForm.city ? MUMBAI_HIERARCHY[turfForm.city][turfForm.station] : []

  const fetchTurfs = (page = 1) => {
    const token = localStorage.getItem('access_token')
    apiClient.get(`/v1/turfs-app/turfs/?paginate=true&page=${page}&page_size=10`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setTurfs(res.data.results || [])
      setTotalTurfs(res.data.count || 0)
      setTotalPages(Math.ceil((res.data.count || 0) / 10))
      setCurrentPage(page)
    }).catch(err => {
      console.error(err)
    })
  }

  useEffect(() => {
    fetchTurfs(1)
  }, [])

  const handleCreateTurf = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingTurf(true)
    try {
      const token = localStorage.getItem('access_token')
      const addressString = `${turfForm.location}, ${turfForm.station}`
      
      if (editingTurfId) {
        // Edit Mode
        await apiClient.patch(`/v1/turfs-app/turfs/${editingTurfId}/`, {
          name: turfForm.name,
          city: turfForm.city,
          address: addressString,
          location: addressString
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        alert('Turf Updated Successfully!')
        setEditingTurfId(null)
      } else {
        // Create Mode
        const slug = turfForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        await apiClient.post('/v1/turfs-app/turfs/', {
          name: turfForm.name,
          slug: slug || `turf-${Date.now()}`,
          city: turfForm.city,
          address: addressString,
          location: addressString
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        alert('Turf Created Successfully!')
      }
      
      setTurfForm({ name: '', city: '', station: '', location: '' })
      fetchTurfs(currentPage)
      setActiveTab('list')
    } catch (err) {
      console.error(err)
      alert(editingTurfId ? 'Failed to update Turf.' : 'Failed to create Turf.')
    } finally {
      setCreatingTurf(false)
    }
  }

  const handleEditClick = (t: any) => {
    let loc = ''
    let st = ''
    if (t.address) {
      const parts = t.address.split(', ')
      if (parts.length >= 2) {
        loc = parts[0]
        st = parts[1]
      }
    }
    setTurfForm({
      name: t.name,
      city: t.city,
      location: loc,
      station: st
    })
    setEditingTurfId(t.id)
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Turf?')) return
    setDeletingId(id)
    try {
      const token = localStorage.getItem('access_token')
      await apiClient.delete(`/v1/turfs-app/turfs/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchTurfs(currentPage)
    } catch (err) {
      console.error(err)
      alert('Failed to delete turf.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-2">
      
      <header className="pb-4 border-b border-border">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Manage Turfs</h1>
        <p className="text-muted-foreground mt-1">Create and view all registered turfs in the system.</p>
      </header>

      {/* TABS */}
      <div className="flex space-x-2 border-b border-border mb-6">
        <button 
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'create' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {editingTurfId ? 'Edit Turf' : 'Create a New Turf'}
        </button>
        <button 
          onClick={() => { setActiveTab('list'); setEditingTurfId(null); setTurfForm({ name: '', city: '', station: '', location: '' }); }}
          className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'list' ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          All Registered Turfs
        </button>
      </div>
      
      {/* TAB CONTENT */}
      <div>
        {activeTab === 'create' && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-brand text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                {editingTurfId ? '✏️' : '1'}
              </span> 
              {editingTurfId ? 'Edit Turf' : 'Create a New Turf'}
            </h2>
            {editingTurfId && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingTurfId(null); setTurfForm({ name: '', city: '', station: '', location: '' }); }} className="text-muted-foreground">
                Cancel Edit
              </Button>
            )}
          </div>
          <form onSubmit={handleCreateTurf} className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Turf Name</Label>
                <Input required value={turfForm.name} onChange={e => setTurfForm({...turfForm, name: e.target.value})} placeholder="e.g. Downtown Arena" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <select 
                  required
                  value={turfForm.city}
                  onChange={e => setTurfForm({...turfForm, city: e.target.value, station: '', location: ''})}
                  className="w-full h-10 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none"
                >
                  <option value="" className="bg-background text-foreground">-- Select City --</option>
                  {availableCities.map(city => (
                    <option key={city} value={city} className="bg-background text-foreground">{city}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Region / Station</Label>
                <select 
                  required
                  value={turfForm.station}
                  onChange={e => setTurfForm({...turfForm, station: e.target.value, location: ''})}
                  disabled={!turfForm.city}
                  className="w-full h-10 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none disabled:opacity-50"
                >
                  <option value="" className="bg-background text-foreground">-- Select Region --</option>
                  {availableStations.map(station => (
                    <option key={station} value={station} className="bg-background text-foreground">{station}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Specific Location</Label>
                <select 
                  required
                  value={turfForm.location}
                  onChange={e => setTurfForm({...turfForm, location: e.target.value})}
                  disabled={!turfForm.station}
                  className="w-full h-10 border border-border rounded-md px-3 bg-background focus:ring-2 focus:ring-brand outline-none disabled:opacity-50"
                >
                  <option value="" className="bg-background text-foreground">-- Select Location --</option>
                  {availableLocations.map(loc => (
                    <option key={loc} value={loc} className="bg-background text-foreground">{loc}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" disabled={creatingTurf} className="w-full bg-brand hover:bg-brand-hover text-white font-bold h-11 mt-6">
              {creatingTurf ? 'Saving...' : (editingTurfId ? 'Update Turf' : 'Create Turf')}
            </Button>
          </form>
        </section>
        )}

      {activeTab === 'list' && (
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="bg-brand text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> 
            All Registered Turfs ({totalTurfs})
          </h2>
        </div>
        
        {turfs.length === 0 ? (
          <div className="bg-card p-10 text-center rounded-xl border border-border text-muted-foreground">
            No turfs have been created yet.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-bold">Turf Name</th>
                    <th className="px-6 py-4 font-bold">City</th>
                    <th className="px-6 py-4 font-bold">Address</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Date Created</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {turfs.map((t: any) => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{t.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{t.city}</td>
                      <td className="px-6 py-4 text-muted-foreground">{t.address || t.location}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${t.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEditClick(t)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
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
                  onClick={() => fetchTurfs(currentPage - 1)} 
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchTurfs(currentPage + 1)} 
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
