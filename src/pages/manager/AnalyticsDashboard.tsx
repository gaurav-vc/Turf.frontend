import { useState, useEffect } from 'react'
import { TrendingUp, Users, DollarSign, Activity, AlertTriangle, Mail, BarChart3 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await apiClient.get('/v1/analytics/manager-dashboard/')
      setData(res.data)
    } catch (err) {
      console.error('Failed to load analytics', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendWinBack = (email: string) => {
    // In a real app, this would hit an endpoint to trigger an email
    alert(`Win-Back discount email simulated sent to: ${email}!`)
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    )
  }

  if (!data) return <div className="p-8 text-center text-muted-foreground">Failed to load data.</div>

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Command Center</h1>
          <p className="text-muted-foreground mt-1 font-medium">Real-time revenue & retention analytics across your turfs.</p>
        </div>
        {/* Generate Demo Data removed for real-time mode */}
      </header>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">₹{data.total_revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="text-emerald-500 font-bold flex items-center mr-1"><TrendingUp className="w-3 h-3 mr-1"/> +12.5%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Bookings</CardTitle>
            <Activity className="w-4 h-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{data.total_bookings}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span className="text-emerald-500 font-bold flex items-center mr-1"><TrendingUp className="w-3 h-3 mr-1"/> +4.2%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Upcoming Games</CardTitle>
            <Activity className="w-4 h-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{data.upcoming_bookings}</div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed & Scheduled</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Unique Players</CardTitle>
            <Users className="w-4 h-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{data.unique_customers}</div>
            <p className="text-xs text-muted-foreground mt-1">Total customer base</p>
          </CardContent>
        </Card>
      </div>

      {/* 3D Animated Revenue Chart */}
      {data.revenue_trend && data.revenue_trend.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-card border-border shadow-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 to-transparent pointer-events-none" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center text-xl font-extrabold">
                <BarChart3 className="w-6 h-6 mr-2 text-brand" /> Revenue Growth Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground">7-Day Real-Time Trajectory</p>
            </CardHeader>
            <CardContent className="h-[300px] mt-4 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenue_trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0ea5e9" floodOpacity="0.3"/>
                    </filter>
                  </defs>
                  <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderRadius: '12px', border: 'none', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#0ea5e9', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#0ea5e9" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    animationDuration={2000}
                    animationEasing="ease-out"
                    filter="url(#shadow)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Customer Lifetime Value (CLV) */}
        <Card className="bg-card border-border shadow-sm flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center text-lg font-extrabold">
              <DollarSign className="w-5 h-5 mr-2 text-brand" /> Top CLV Customers
            </CardTitle>
            <p className="text-sm text-muted-foreground">Players who have spent the most at your turfs.</p>
          </CardHeader>
          <CardContent className="flex-1">
            {data.top_customers_clv.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground border border-dashed border-border rounded-xl">No booking data available.</div>
            ) : (
              <div className="space-y-4">
                {data.top_customers_clv.map((customer: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center font-bold text-brand">
                        {customer.user__first_name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{customer.user__first_name} {customer.user__last_name}</p>
                        <p className="text-xs text-muted-foreground font-medium">{customer.booking_count} total bookings</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-foreground">₹{customer.total_spent}</p>
                      <p className="text-xs text-muted-foreground">Lifetime Value</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Churning Customers */}
        <Card className="bg-card border-border shadow-sm border-orange-500/20 flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center text-lg font-extrabold text-orange-500">
              <AlertTriangle className="w-5 h-5 mr-2" /> Churn Risk (Win-Back)
            </CardTitle>
            <p className="text-sm text-muted-foreground">Past customers who haven't booked in over 3 weeks.</p>
          </CardHeader>
          <CardContent className="flex-1">
            {data.churning_customers.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground border border-dashed border-border rounded-xl flex items-center justify-center flex-col">
                <Users className="w-8 h-8 mb-2 opacity-50" />
                No churning customers right now. Great retention!
              </div>
            ) : (
              <div className="space-y-4">
                {data.churning_customers.map((customer: any, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 gap-3">
                    <div>
                      <p className="font-bold text-foreground text-sm">{customer.user__first_name || customer.user__email}</p>
                      <p className="text-xs text-muted-foreground font-medium">Last booking: {new Date(customer.last_booking).toLocaleDateString()}</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleSendWinBack(customer.user__email)}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md w-full sm:w-auto"
                    >
                      <Mail className="w-4 h-4 mr-2" /> Send 10% Off
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
