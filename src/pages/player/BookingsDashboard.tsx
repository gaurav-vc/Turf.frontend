import { useState, useEffect } from 'react'
import { apiClient } from '@/api/apiClient'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BookingsDashboard() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('access_token')
      // Fetch bookings where player_me is true
      const res = await apiClient.get('/v1/bookings/?player_me=true', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBookings(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to fetch bookings', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return
    try {
      const token = localStorage.getItem('access_token')
      await apiClient.patch(`/v1/bookings/${id}/`, {
        status: 'CANCELLED'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert('Booking cancelled successfully.')
      fetchBookings()
    } catch (err) {
      console.error(err)
      alert('Failed to cancel booking.')
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'CONFIRMED':
        return <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Confirmed</span>
      case 'CANCELLED':
        return <span className="px-3 py-1 bg-red-500/10 text-red-600 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelled</span>
      case 'HOLD':
        return <span className="px-3 py-1 bg-yellow-500/10 text-yellow-600 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Payment Pending</span>
      case 'COMPLETED':
        return <span className="px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>
      default:
        return <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-bold">{status}</span>
    }
  }

  // Sort bookings so upcoming ones are first
  const sortedBookings = [...bookings].sort((a: any, b: any) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header Section */}
      <section className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">My Bookings</h1>
            <p className="text-muted-foreground mt-2 font-medium">
              Manage your upcoming matches and review past games.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-2xl border border-border">
            <div className="text-center">
              <p className="text-sm text-muted-foreground font-semibold">Total Games</p>
              <p className="text-2xl font-black text-brand">{bookings.filter((b: any) => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bookings List */}
      <section className="space-y-6">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
          </div>
        ) : sortedBookings.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-3xl p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">No bookings found</h3>
            <p className="text-muted-foreground mt-2 mb-6">You haven't booked any turfs yet.</p>
            <Button className="bg-brand text-white hover:bg-brand-hover font-bold" onClick={() => navigate('/explore')}>
              Find a Turf Now
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedBookings.map((b: any, index: number) => {
              // Basic parsing if court/turf data is nested or flat
              // Depending on serializer, we might need to fetch court detail, but assuming it's available or we display code
              const isUpcoming = new Date(b.start_at) > new Date() && b.status !== 'CANCELLED'

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={b.id} 
                  className={`bg-card rounded-2xl border ${isUpcoming ? 'border-brand/30 shadow-md' : 'border-border shadow-sm'} overflow-hidden flex flex-col`}
                >
                  {/* Status Banner */}
                  <div className="px-5 py-3 border-b border-border bg-muted/30 flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-muted-foreground">ID: {b.code}</span>
                    {getStatusBadge(b.status)}
                  </div>
                  
                  {/* Body */}
                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-brand" />
                      </div>
                      <div>
                        {/* Assuming the serializer returns court object or just ID. We handle both cleanly. */}
                        <h3 className="font-bold text-lg leading-tight">
                          {b.court?.name ? `${b.court.turf?.name} - ${b.court.name}` : `Court #${b.court}`}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {b.sport?.name || `Sport #${b.sport}`} Match
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/40 rounded-xl p-3 space-y-2 border border-border/50">
                      <div className="flex items-center text-sm font-medium">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        {new Date(b.start_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex items-center text-sm font-medium text-foreground">
                        <Clock className="w-4 h-4 mr-2 text-brand" />
                        {new Date(b.start_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(b.end_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-5 py-4 border-t border-border bg-muted/10 mt-auto">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-lg">₹{b.amount}</div>
                      
                      {(b.status === 'CONFIRMED' || b.status === 'HOLD') && isUpcoming && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="font-bold shadow-sm"
                          onClick={() => handleCancel(b.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
