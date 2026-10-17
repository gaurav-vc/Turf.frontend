import { useState, useEffect } from 'react'
import { apiClient } from '@/api/apiClient'
import { Users, MapPin, Activity, DollarSign, CalendarCheck, TrendingUp } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeManagers: 0,
    totalTurfs: 0,
    totalCourts: 0,
    totalRevenue: 0,
    totalBookings: 0,
    recentBookings: [] as any[],
    bookingTrends: [] as any[],
    statusData: [] as any[],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const config = { headers: { Authorization: `Bearer ${token}` } }
        
        const [usersRes, turfsRes, courtsRes, bookingsRes] = await Promise.all([
          apiClient.get('/v1/accounts/users/', config),
          apiClient.get('/v1/turfs-app/turfs/', config),
          apiClient.get('/v1/turfs-app/courts/', config),
          apiClient.get('/v1/bookings/', config).catch(() => ({ data: [] }))
        ])
        
        const users = usersRes.data || []
        const bookings = bookingsRes.data || []
        
        const totalRevenue = bookings
          .filter((b: any) => ['CONFIRMED', 'COMPLETED'].includes(b.status))
          .reduce((sum: number, b: any) => sum + parseFloat(b.amount || 0), 0)

        // Generate trend data based on bookings start date
        const trends = bookings.reduce((acc: any, b: any) => {
          const date = new Date(b.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (!acc[date]) acc[date] = { date, revenue: 0, bookings: 0 }
          if (['CONFIRMED', 'COMPLETED'].includes(b.status)) {
            acc[date].revenue += parseFloat(b.amount || 0)
          }
          acc[date].bookings += 1
          return acc
        }, {})

        const bookingTrends = Object.values(trends).slice(-7) // Last 7 unique dates

        // Status distribution
        const statuses = bookings.reduce((acc: any, b: any) => {
          acc[b.status] = (acc[b.status] || 0) + 1
          return acc
        }, {})
        const statusData = Object.keys(statuses).map(key => ({
          name: key,
          count: statuses[key]
        }))

        setStats({
          totalUsers: users.length,
          activeManagers: users.filter((u: any) => u.user_type === 'MANAGER').length,
          totalTurfs: turfsRes.data.length || 0,
          totalCourts: courtsRes.data.length || 0,
          totalRevenue,
          totalBookings: bookings.length,
          recentBookings: bookings.slice(0, 5),
          bookingTrends,
          statusData
        })
      } catch (error) {
        console.error('Failed to fetch admin stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAdminStats()
  }, [])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="pb-6 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-500 bg-clip-text text-transparent">
              Platform Analytics
            </h1>
            <p className="text-muted-foreground mt-2 text-sm font-medium">Real-time overview of the TurfArena system performance.</p>
          </div>
          <div className="flex items-center gap-3 bg-green-500/10 text-green-700 px-4 py-2 rounded-full border border-green-500/20 shadow-sm backdrop-blur-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="font-semibold text-xs tracking-wide uppercase">System Operational</span>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Revenue" 
          value={loading ? '-' : `$${stats.totalRevenue.toLocaleString()}`} 
          icon={<DollarSign className="w-5 h-5 text-emerald-500" />} 
          color="bg-emerald-500"
          trend="+12%"
        />
        <KPICard 
          title="Total Bookings" 
          value={loading ? '-' : stats.totalBookings} 
          icon={<CalendarCheck className="w-5 h-5 text-indigo-500" />} 
          color="bg-indigo-500"
          trend="+5%"
        />
        <KPICard 
          title="Total Users" 
          value={loading ? '-' : stats.totalUsers} 
          icon={<Users className="w-5 h-5 text-blue-500" />} 
          color="bg-blue-500"
          trend="+18%"
        />
        <KPICard 
          title="Registered Turfs" 
          value={loading ? '-' : stats.totalTurfs} 
          icon={<MapPin className="w-5 h-5 text-orange-500" />} 
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)] lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">Revenue Overview</h3>
          </div>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading chart...</div>
            ) : stats.bookingTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.bookingTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dx={-10} tickFormatter={(val) => `$${val}`} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    itemStyle={{ color: '#111827', fontWeight: 600 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <TrendingUp className="w-12 h-12 mb-3 text-gray-300" />
                <p>No revenue data available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)]">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Booking Statuses</h3>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground animate-pulse">Loading chart...</div>
            ) : stats.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.statusData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 12, fontWeight: 500}} width={80} />
                  <RechartsTooltip 
                    cursor={{fill: '#f3f4f6'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="w-12 h-12 mb-3 text-gray-300" />
                <p>No status data</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)] overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">Recent Transactions</h3>
          <button className="text-sm font-semibold text-brand hover:text-brand/80 transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Booking Code</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading recent transactions...</td>
                </tr>
              ) : stats.recentBookings.length > 0 ? (
                stats.recentBookings.map((b, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{b.code || `BKG-${Math.floor(Math.random()*10000)}`}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                        b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{new Date(b.start_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-gray-900 text-right">${parseFloat(b.amount || '0').toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No recent transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

function KPICard({ title, value, icon, color, trend }: { title: string, value: string | number, icon: React.ReactNode, color: string, trend?: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-[0.03] rounded-bl-[100px] transition-transform duration-500 group-hover:scale-110`} />
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100/50 shadow-sm`}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
        <p className="text-sm font-medium text-gray-500 mt-1">{title}</p>
      </div>
    </div>
  )
}
