import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Users, Trophy, ChevronRight, Coins } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { apiClient } from '@/api/apiClient'

export default function PlayerDashboard() {
  const { user } = useAuthStore()
  const [wallet, setWallet] = useState<any>(null)

  useEffect(() => {
    apiClient.get('/v1/loyalty/wallet/').then(res => setWallet(res.data)).catch(console.error)
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      {/* Welcome Section */}
      <section className="bg-gradient-to-r from-brand to-brand-hover rounded-3xl p-8 md:p-12 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight">
            Ready to play, {user?.name.split(' ')[0]}?
          </h1>
          <p className="text-brand-foreground/90 text-lg max-w-2xl font-medium mb-8">
            Manage your upcoming matches, rally your squad, or discover new arenas to conquer today.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/explore" className="bg-white text-brand px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition shadow-sm">
              Find a Turf
            </Link>
            <Link to="/tournaments" className="bg-black/20 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-black/30 transition">
              Host a Tournament
            </Link>
          </div>
        </div>

        {/* TurfCoins Widget */}
        <div className="absolute top-8 right-8 z-10 hidden md:block">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform cursor-pointer">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-bold uppercase tracking-wider text-white/90">TurfCoins</span>
            </div>
            <div className="text-4xl font-black text-white">
              {wallet ? parseFloat(wallet.balance).toFixed(0) : '0'}
            </div>
            <div className="text-[10px] text-white/70 mt-1 uppercase font-bold">1 Coin = ₹100 Spent</div>
          </div>
        </div>
        
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-32 w-48 h-48 bg-black opacity-10 rounded-full blur-2xl transform translate-y-1/2"></div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming Bookings (Mocked/Empty State for now) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Upcoming Matches</h2>
              <p className="text-muted-foreground text-sm">Your next scheduled turf bookings</p>
            </div>
            <Link to="/bookings" className="text-sm font-bold text-brand hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-bold text-lg mb-2">No Upcoming Matches</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              You haven't booked any turfs yet. Browse available turfs and secure your slot!
            </p>
            <Link to="/explore" className="inline-block bg-brand text-primary-foreground font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-hover transition">
              Book a Turf
            </Link>
          </div>
        </div>

        {/* Quick Stats / Hub Links */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your Hubs</h2>
            <p className="text-muted-foreground text-sm">Manage your sports life</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Link to="/teams" className="group bg-card border border-border p-5 rounded-2xl hover:border-brand/50 hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground group-hover:text-brand transition-colors">My Squads</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Manage your teams</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-brand" />
            </Link>

            <Link to="/tournaments" className="group bg-card border border-border p-5 rounded-2xl hover:border-brand/50 hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground group-hover:text-brand transition-colors">Tournaments</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Compete & win</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-brand" />
            </Link>
            
            <Link to="/toss" className="group bg-card border border-border p-5 rounded-2xl hover:border-brand/50 hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <div className="font-black text-xl">¢</div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground group-hover:text-brand transition-colors">Coin Toss</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Settle disputes</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-brand" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
