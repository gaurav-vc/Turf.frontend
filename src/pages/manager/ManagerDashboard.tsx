import { useState, useEffect } from 'react'
import { apiClient } from '@/api/apiClient'
import { Link } from 'react-router-dom'
import { MapPin, Search, CalendarX, IndianRupee, TrendingUp, Users, Activity } from 'lucide-react'

export default function ManagerDashboard() {
  const [stats, setStats] = useState({
    turfs: 0,
    courts: 0,
    blocked: 0,
    prices: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [turfsRes, courtsRes, blockedRes, pricesRes] = await Promise.all([
          apiClient.get('/v1/turfs-app/turfs/'),
          apiClient.get('/v1/turfs-app/courts/'),
          apiClient.get('/v1/turfs-app/blocked-periods/'),
          apiClient.get('/v1/turfs-app/price-rules/')
        ])
        setStats({
          turfs: turfsRes.data.length || 0,
          courts: courtsRes.data.length || 0,
          blocked: blockedRes.data.length || 0,
          prices: pricesRes.data.length || 0
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [])

  return (
    <div className="space-y-8">
      <header className="pb-6 border-b border-border flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Analytical Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time reports for your turf operations.</p>
        </div>
        <Link to="/manager/add-turf" className="px-4 py-2 bg-brand text-black rounded-lg font-bold shadow-[0_0_15px_rgba(57,255,20,0.4)] hover:bg-brand-hover transition-colors hidden sm:block">
          + New Venue
        </Link>
      </header>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Turfs</p>
            <h3 className="text-4xl font-black">{loading ? '-' : stats.turfs}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-brand" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Active Courts</p>
            <h3 className="text-4xl font-black">{loading ? '-' : stats.courts}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Search className="w-6 h-6 text-blue-500" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Pricing Rules</p>
            <h3 className="text-4xl font-black">{loading ? '-' : stats.prices}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <IndianRupee className="w-6 h-6 text-green-500" />
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Maintenance Blocks</p>
            <h3 className="text-4xl font-black">{loading ? '-' : stats.blocked}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
            <CalendarX className="w-6 h-6 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Advanced Stats Section (Placeholder for future Bookings Data) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Revenue Overview (Last 30 Days)</h3>
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/20">
            <TrendingUp className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground font-medium text-sm">Real-time revenue charts will appear once bookings are enabled.</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Recent Activity</h3>
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-brand mt-1.5" />
              <div>
                <p className="text-sm font-semibold">Dashboard Initialized</p>
                <p className="text-xs text-muted-foreground">Just now</p>
              </div>
            </div>
            {!loading && stats.turfs > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                <div>
                  <p className="text-sm font-semibold">{stats.turfs} Turfs Registered</p>
                  <p className="text-xs text-muted-foreground">System active</p>
                </div>
              </div>
            )}
            {!loading && stats.courts > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                <div>
                  <p className="text-sm font-semibold">{stats.courts} Courts Available</p>
                  <p className="text-xs text-muted-foreground">System active</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
