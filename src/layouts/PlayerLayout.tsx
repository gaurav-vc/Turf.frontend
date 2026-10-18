import { useState, useEffect } from 'react'
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Home, Map, Trophy, Calendar, User, Users, ChevronDown, ChevronUp, Key, LogOut, Coins, ArrowLeft, Search, Bell, Check, Clock, Activity, ShoppingBag, Radio, Gavel, Package, Shield } from 'lucide-react'
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

export default function PlayerLayout() {
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
  const [isAuctionDropdownOpen, setIsAuctionDropdownOpen] = useState(false)
  
  const unreadCount = notifications.filter(n => !n.is_read).length

  if (!isAuthenticated || user?.role !== 'PLAYER') {
    return <Navigate to="/login" replace />
  }

  const isActive = (path: string) => location.pathname.startsWith(path)

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
      // Static Pages for Player
      const pages = [
        { title: 'Explore Turfs', subtitle: 'Find venues to play', link: '/explore', type: 'PAGE' },
        { title: 'My Bookings', subtitle: 'View past and upcoming bookings', link: '/bookings', type: 'PAGE' },
        { title: 'My Teams', subtitle: 'Manage your squads', link: '/teams', type: 'PAGE' },
        { title: 'Tournaments', subtitle: 'Compete in local events', link: '/tournaments', type: 'PAGE' },
        { title: 'Matchmaking', subtitle: 'Find opponents and games', link: '/lfp', type: 'PAGE' },
        { title: 'Toss Coin', subtitle: 'Virtual coin toss for matches', link: '/toss', type: 'PAGE' },
        { title: 'Live Scoreboard', subtitle: 'Real-time scores', link: '/scoreboard', type: 'PAGE' },
        { title: 'Shop & Merchandise', subtitle: 'Customize and buy jerseys', link: '/shop', type: 'PAGE' },
        { title: 'My Orders & Tracking', subtitle: 'Track your deliveries & shipments', link: '/orders', type: 'PAGE' },
        { title: 'Club', subtitle: 'Manage club, tournaments & matches', link: '/clubs', type: 'PAGE' },
        { title: 'Live Streams', subtitle: 'Watch live matches', link: '/streams', type: 'PAGE' },
        { title: 'Live Auction', subtitle: 'Real-time player bidding', link: '/auction', type: 'PAGE' },
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
    }
    setShowNotifications(false)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card shadow-sm z-10">
        <div className="h-16 flex items-center px-6 font-extrabold text-2xl tracking-tighter border-b border-border">TURF<span className="text-brand">ARENA</span></div>
        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto max-h-[calc(100vh-5.5rem)] pr-1">
          <Link to="/" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${location.pathname === '/' ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Home className="w-5 h-5 mr-3" /> Dashboard</Link>
          <Link to="/explore" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/explore') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Map className="w-5 h-5 mr-3" /> Explore</Link>
          <Link to="/bookings" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/bookings') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Calendar className="w-5 h-5 mr-3" /> Bookings</Link>
          <Link to="/teams" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/teams') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><User className="w-5 h-5 mr-3" /> Teams</Link>
          <Link to="/tournaments" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/tournaments') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Trophy className="w-5 h-5 mr-3" /> Tournaments</Link>

          {/* Live Auction Main Sidebar Section (Positioned Directly Below Tournaments) */}
          <div className="rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => {
                const nextState = !isAuctionDropdownOpen
                setIsAuctionDropdownOpen(nextState)
                if (nextState && !location.pathname.startsWith('/auction')) {
                  navigate('/auction')
                }
              }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-colors cursor-pointer text-left ${
                isActive('/auction')
                  ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm font-bold'
                  : 'hover:bg-muted hover:text-brand'
              }`}
            >
              <div className="flex items-center flex-1">
                <Gavel className="w-5 h-5 mr-3 text-amber-500 shrink-0" />
                <span className="truncate">Live Auction</span>
              </div>
              
              <div className="p-0.5 shrink-0 ml-1">
                {isAuctionDropdownOpen ? (
                  <ChevronUp className="w-4 h-4 text-brand transition-transform duration-200" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200" />
                )}
              </div>
            </button>

            {/* Collapsible Dropdown List of Live Auction Pages */}
            {isAuctionDropdownOpen && (
              <div className="ml-3 pl-3 border-l-2 border-brand/40 my-1 space-y-0.5 py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                {[
                  { tab: 'overview', label: 'Command Center' },
                  { tab: 'live', label: 'Live Broadcast' },
                  { tab: 'roster', label: 'Roster & Intake' },
                  { tab: 'designer', label: 'Page Designer' },
                  { tab: 'pdf_studio', label: 'PDF Cards' },
                  { tab: 'rules', label: 'Squad Rules & Slabs' },
                  { tab: 'fields', label: 'Custom Fields' },
                  { tab: 'all_teams', label: 'Teams Roster' },
                  { tab: 'sponsors', label: 'Sponsors & Media' },
                  { tab: 'draw', label: 'Group Draw' },
                  { tab: 'overlays', label: 'OBS Overlays' },
                  { tab: 'spectator', label: 'Public Viewer' },
                  { tab: 'comms', label: 'WhatsApp Comms' },
                ].map((item) => {
                  const isCurrent =
                    location.pathname.startsWith('/auction') &&
                    (location.search.includes(`tab=${item.tab}`) ||
                      (!location.search && item.tab === 'overview'))
                  return (
                    <Link
                      key={item.tab}
                      to={`/auction?tab=${item.tab}`}
                      className={`block px-2.5 py-1 text-[11px] rounded-lg transition-all ${
                        isCurrent
                          ? 'bg-brand/15 text-brand font-extrabold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <Link to="/clubs" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/clubs') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Shield className="w-5 h-5 mr-3 text-emerald-400" /> Club</Link>
          <Link to="/lfp" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/lfp') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Users className="w-5 h-5 mr-3" /> Matchmaking</Link>
          <Link to="/shop" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/shop') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><ShoppingBag className="w-5 h-5 mr-3" /> TurfArena Shop</Link>
          <Link to="/orders" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/orders') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Package className="w-5 h-5 mr-3" /> My Orders</Link>
          <Link to="/streams" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/streams') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Radio className="w-5 h-5 mr-3" /> Live Streams</Link>
          <Link to="/toss" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/toss') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Coins className="w-5 h-5 mr-3" /> Toss Coin</Link>
          <Link to="/scoreboard" className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${isActive('/scoreboard') ? 'bg-brand/10 text-brand border border-brand/20 shadow-sm' : 'hover:bg-muted hover:text-brand'}`}><Activity className="w-5 h-5 mr-3 text-red-500" /> Live Scoreboard</Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-20 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-full transition-colors hidden sm:block" title="Go Back">
              <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
            <div className="font-semibold text-lg sm:text-xl tracking-tight md:hidden">TURF<span className="text-brand">ARENA</span></div>
            
            {/* Global Search Bar */}
            <div className="hidden lg:block max-w-md w-full ml-4 relative">
              <form onSubmit={handleSearchSubmit} className="flex items-center w-full relative z-30">
                <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="Search turfs, teams, tournaments..." 
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
                              {result.type === 'PAGE' ? <Search className="w-4 h-4 text-brand" /> : result.type === 'TURF' ? <Map className="w-4 h-4 text-brand" /> : result.type === 'TEAM' ? <User className="w-4 h-4 text-brand" /> : <Trophy className="w-4 h-4 text-brand" />}
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
            {/* Mobile Search Icon */}
            <button className="lg:hidden p-2 hover:bg-muted rounded-full text-muted-foreground">
              <Search className="w-5 h-5" />
            </button>

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

            {/* Profile Dropdown */}
            <div className="relative border-l border-border pl-2 sm:pl-4">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 hover:bg-muted p-1.5 pr-3 sm:pr-4 rounded-full border border-border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <img src={user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'} alt="avatar" className="w-8 h-8 rounded-full bg-background border border-border" />
                <span className="text-sm font-semibold hidden sm:block max-w-[100px] truncate">{user.name}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showProfileMenu ? 'rotate-180' : ''} hidden sm:block`} />
              </button>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-20 py-2 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-border mb-2 bg-muted/30">
                      <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
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

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 w-full bg-card/90 backdrop-blur-xl border-t border-border flex justify-around p-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] overflow-x-auto">
        <Link to="/" className={`flex flex-col items-center shrink-0 px-2 transition-colors ${location.pathname === '/' ? 'text-brand' : 'text-muted-foreground hover:text-brand'}`}><Home className="w-5 h-5" /><span className="text-[10px] mt-1 font-semibold">Home</span></Link>
        <Link to="/explore" className={`flex flex-col items-center shrink-0 px-2 transition-colors ${isActive('/explore') ? 'text-brand' : 'text-muted-foreground hover:text-brand'}`}><Map className="w-5 h-5" /><span className="text-[10px] mt-1 font-semibold">Explore</span></Link>
        <Link to="/bookings" className={`flex flex-col items-center shrink-0 px-2 transition-colors ${isActive('/bookings') ? 'text-brand' : 'text-muted-foreground hover:text-brand'}`}><Calendar className="w-5 h-5" /><span className="text-[10px] mt-1 font-semibold">Bookings</span></Link>
        <Link to="/auction" className={`flex flex-col items-center shrink-0 px-2 transition-colors ${isActive('/auction') ? 'text-brand' : 'text-muted-foreground hover:text-brand'}`}><Gavel className="w-5 h-5 text-amber-500" /><span className="text-[10px] mt-1 font-semibold">Auction</span></Link>
        <Link to="/tournaments" className={`flex flex-col items-center shrink-0 px-2 transition-colors ${isActive('/tournaments') ? 'text-brand' : 'text-muted-foreground hover:text-brand'}`}><Trophy className="w-5 h-5" /><span className="text-[10px] mt-1 font-semibold">Play</span></Link>
        <Link to="/scoreboard" className={`flex flex-col items-center shrink-0 px-2 transition-colors ${isActive('/scoreboard') ? 'text-red-500' : 'text-muted-foreground hover:text-brand'}`}><Activity className="w-5 h-5" /><span className="text-[10px] mt-1 font-semibold">Scoreboard</span></Link>
      </nav>

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
