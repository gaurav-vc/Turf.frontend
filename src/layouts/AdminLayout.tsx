import { useState, useEffect } from 'react'
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { LayoutDashboard, Users, LogOut, ArrowLeft, ChevronDown, Key, ShieldCheck, MapPin, ShoppingBag, Search, Bell, Check, Clock, Package, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/api/apiClient'

const formatDistanceToNow = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

interface Notification {
  id: number
  title: string
  message: string
  is_read: boolean
  type: string
  link?: string
  created_at: string
}

export default function AdminLayout() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  const unreadCount = notifications.filter(n => !n.is_read).length

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return <Navigate to="/login" replace />
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    return { Authorization: `Bearer ${token}` }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        fetchSearchResults()
      } else {
        setSearchResults([])
        setShowSearchResults(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const fetchSearchResults = async () => {
    setIsSearching(true)
    setShowSearchResults(true)
    try {
      const q = searchQuery.toLowerCase()
      const pages = [
        { title: 'Admin Dashboard', subtitle: 'System overview', link: '/admin', type: 'PAGE' },
        { title: 'Manage Turfs', subtitle: 'View all platforms', link: '/admin/turfs', type: 'PAGE' },
        { title: 'Manage Users', subtitle: 'Manage accounts', link: '/admin/users', type: 'PAGE' },
        { title: 'Assign Manager', subtitle: 'System settings', link: '/admin/settings', type: 'PAGE' },
        { title: 'Manage Shop', subtitle: 'Merchandise config', link: '/admin/shop', type: 'PAGE' },
        { title: 'Manage Orders', subtitle: 'Track customer shipments', link: '/admin/orders', type: 'PAGE' },
      ].filter(p => p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q))

      const res = await apiClient.get(`/v1/core/search/?q=${encodeURIComponent(searchQuery)}`, {
        headers: getAuthHeaders()
      })
      
      setSearchResults([...pages, ...res.data])
    } catch (err) {
      console.error('Search failed', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim().length >= 2) {
      fetchSearchResults()
    }
  }

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/v1/accounts/notifications/', {
        headers: getAuthHeaders()
      })
      setNotifications(res.data)
    } catch (err) {
      console.error('Failed to fetch notifications')
    }
  }

  const markAllRead = async () => {
    try {
      await apiClient.post('/v1/accounts/notifications/mark_all_read/', {}, {
        headers: getAuthHeaders()
      })
      fetchNotifications()
    } catch (err) {
      console.error('Failed to mark read')
    }
  }

  const markAsReadAndNavigate = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await apiClient.patch(`/v1/accounts/notifications/${notif.id}/`, { is_read: true }, {
          headers: getAuthHeaders()
        })
        fetchNotifications()
      } catch (err) {
        console.error('Failed to update notification')
      }
    }
    if (notif.link) {
      navigate(notif.link)
      setShowNotifications(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/admin" className="text-2xl font-black tracking-tight text-foreground">
            TURF<span className="text-brand">ARENA</span>
          </Link>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Admin Panel</div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/admin" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${location.pathname === '/admin' ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard</Link>
          <Link to="/admin/sports" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/admin/sports') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Trophy className="w-5 h-5 mr-3" /> Manage Sports</Link>
          <Link to="/admin/orders" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/admin/orders') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Package className="w-5 h-5 mr-3" /> Manage Orders</Link>
          <Link to="/admin/shop" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/admin/shop') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><ShoppingBag className="w-5 h-5 mr-3" /> Manage Shop</Link>
          <Link to="/admin/turfs" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/admin/turfs') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><MapPin className="w-5 h-5 mr-3" /> Manage Turfs</Link>
          <Link to="/admin/users" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/admin/users') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Users className="w-5 h-5 mr-3" /> Manage Users</Link>
          <Link to="/admin/settings" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/admin/settings') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><ShieldCheck className="w-5 h-5 mr-3" /> Assign Manager</Link>
        </nav>

        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={logout}>
            <LogOut className="w-5 h-5 mr-3" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="hidden md:flex h-16 bg-card border-b border-border items-center justify-between px-8 shrink-0">
          <div className="flex items-center flex-1">
            <Button variant="outline" size="icon" className="border-brand text-muted-foreground hover:text-brand hover:bg-brand/10 transition-all group rounded-xl shrink-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Button>
            
            {/* Global Search Bar */}
            <div className="hidden lg:block max-w-md w-full ml-4 relative">
              <form onSubmit={handleSearchSubmit} className="flex items-center w-full relative z-30">
                <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="Search turfs, teams, users..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => { if(searchQuery.length >= 2) setShowSearchResults(true) }}
                  className="pl-9 h-10 rounded-full bg-muted/50 border-transparent focus:bg-background focus:border-brand/30 focus:ring-2 focus:ring-brand/20 w-full text-sm"
                />
                {isSearching && (
                  <div className="absolute right-3 w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                )}
              </form>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowSearchResults(false)} />
                  <div className="absolute top-12 left-0 w-full bg-card border border-border rounded-xl shadow-2xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-1 max-h-96 overflow-y-auto">
                    {searchResults.length === 0 && !isSearching ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No results found for "{searchQuery}"
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {searchResults.map(result => (
                          <li key={`${result.type}-${result.id}`} 
                              onClick={() => {
                                navigate(result.link);
                                setShowSearchResults(false);
                                setSearchQuery('');
                              }}
                              className="p-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                              <Search className="w-4 h-4 text-brand" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{result.title}</p>
                              <p className="text-xs font-medium text-muted-foreground truncate">{result.subtitle}</p>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-2 py-1 rounded-md">{result.type}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-border bg-muted/30 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-sm text-foreground">Notifications</h3>
                        <p className="text-xs text-muted-foreground">{unreadCount} unread messages</p>
                      </div>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs font-semibold text-brand hover:text-brand-hover flex items-center gap-1">
                          <Check className="w-3 h-3" /> Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                            <Bell className="w-5 h-5 text-muted-foreground/50" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">You're all caught up!</p>
                        </div>
                      ) : (
                        <ul className="divide-y divide-border">
                          {notifications.map(notif => (
                            <li key={notif.id} 
                                onClick={() => markAsReadAndNavigate(notif)}
                                className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors flex gap-3 ${!notif.is_read ? 'bg-brand/5' : ''}`}>
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.is_read ? 'bg-brand' : 'bg-transparent'}`} />
                              <div>
                                <h4 className={`text-sm ${!notif.is_read ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                  {notif.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                  {notif.message}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mt-2 uppercase tracking-wider">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(notif.created_at)}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Button */}
            <div className="relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 hover:bg-muted p-1.5 pr-4 rounded-full border border-border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand"
              >
              <img src={user?.avatar} alt="avatar" className="w-8 h-8 rounded-full bg-background border border-border" />
              <span className="text-sm font-semibold hidden sm:block">{user?.name}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-20 py-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-border mb-2 bg-muted/30">
                    <p className="text-sm font-bold text-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false)
                      setShowPasswordModal(true)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-muted flex items-center text-foreground transition-colors"
                  >
                    <Key className="w-4 h-4 mr-3 text-muted-foreground" /> Change Password
                  </button>
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
            <Link to="/admin" className="text-xl font-black tracking-tight text-foreground">
              TURF<span className="text-brand">ARENA</span>
            </Link>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}><LogOut className="w-5 h-5 text-red-500" /></Button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>
        
        {/* Mobile Nav */}
        <nav className="md:hidden bg-card border-t border-border flex items-center justify-around p-2 pb-safe">
          <Link to="/admin" className={`flex flex-col items-center transition-colors ${location.pathname === '/admin' ? 'text-brand' : 'text-muted-foreground'}`}><LayoutDashboard className="w-6 h-6" /><span className="text-[10px] mt-1 font-semibold">Dash</span></Link>
          <Link to="/admin/turfs" className={`flex flex-col items-center transition-colors ${isActive('/admin/turfs') ? 'text-brand' : 'text-muted-foreground'}`}><MapPin className="w-6 h-6" /><span className="text-[10px] mt-1 font-semibold">Turfs</span></Link>
          <Link to="/admin/users" className={`flex flex-col items-center transition-colors ${isActive('/admin/users') ? 'text-brand' : 'text-muted-foreground'}`}><Users className="w-6 h-6" /><span className="text-[10px] mt-1 font-semibold">Users</span></Link>
          <Link to="/admin/settings" className={`flex flex-col items-center transition-colors ${isActive('/admin/settings') ? 'text-brand' : 'text-muted-foreground'}`}><ShieldCheck className="w-6 h-6" /><span className="text-[10px] mt-1 font-semibold">Assign</span></Link>
        </nav>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-1 text-foreground">Change Password</h2>
            <p className="text-sm text-muted-foreground mb-6">Update your account password securely.</p>
            
            <form className="space-y-4" onSubmit={(e) => { 
              e.preventDefault(); 
              setShowPasswordModal(false); 
              alert('Password changed successfully!') 
            }}>
              <div className="space-y-2">
                <Label htmlFor="current-pwd" className="text-xs uppercase tracking-wider text-muted-foreground">Current Password</Label>
                <Input id="current-pwd" type="password" required className="bg-background border-border h-11" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pwd" className="text-xs uppercase tracking-wider text-muted-foreground">New Password</Label>
                <Input id="new-pwd" type="password" required className="bg-background border-border h-11" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pwd" className="text-xs uppercase tracking-wider text-muted-foreground">Confirm New Password</Label>
                <Input id="confirm-pwd" type="password" required className="bg-background border-border h-11" placeholder="••••••••" />
              </div>
              
              <div className="flex gap-3 justify-end mt-8">
                <Button variant="outline" type="button" className="border-border hover:bg-muted" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-brand text-white hover:bg-brand-hover shadow-md font-semibold">Update Password</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
