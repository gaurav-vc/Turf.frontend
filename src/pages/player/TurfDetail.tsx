import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Star, MapPin, Info, Check, Clock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient, ENDPOINTS } from '@/api/apiClient'

export default function TurfDetail() {
  const { id } = useParams()
  
  const [turf, setTurf] = useState<any>(null)
  const [courts, setCourts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourt, setSelectedCourt] = useState<any>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>('21:00')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [priceRules, setPriceRules] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isBookingSuccessful, setIsBookingSuccessful] = useState(false)

  useEffect(() => {
    const fetchTurfDetails = async () => {
      try {
        // Fetch the specific turf
        const turfRes = await apiClient.get(`${ENDPOINTS.TURFS}${id}/`)
        setTurf(turfRes.data)
        
        // Fetch all courts and filter
        const courtsRes = await apiClient.get(ENDPOINTS.COURTS)
        const allCourts = courtsRes.data.results || courtsRes.data || []
        const filtered = allCourts.filter((c: any) => c.turf === id)
        setCourts(filtered)
        if (filtered.length > 0) setSelectedCourt(filtered[0])
        
        // Fetch price rules
        try {
          const pricesRes = await apiClient.get(ENDPOINTS.PRICING_RULES)
          setPriceRules(pricesRes.data.results || pricesRes.data || [])
        } catch (e) {
          console.error("Failed to load price rules", e)
        }
        
      } catch (err) {
        console.error("Failed to load turf details", err)
      } finally {
        setLoading(false)
      }
    }
    
    if (id) {
      fetchTurfDetails()
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full mb-4"
        />
        <h2 className="text-xl font-bold text-foreground animate-pulse">Loading Arena...</h2>
      </div>
    )
  }

  if (!turf) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-xl font-bold text-muted-foreground">Arena not found.</div>
  }

  let parsedAbout = turf.description || `Welcome to ${turf.name}. A premium sports facility located in the heart of ${turf.city}.`
  let parsedImage = ''
  let parsedAmenities = ['Washrooms', 'Drinking Water', 'Floodlights', 'Dugout', 'First Aid'] // Default fallback
  
  try {
    const parsed = JSON.parse(turf.description)
    if (parsed && typeof parsed === 'object') {
      if (parsed.about) parsedAbout = parsed.about
      if (parsed.image_url) parsedImage = parsed.image_url
      if (parsed.amenities && Array.isArray(parsed.amenities) && parsed.amenities.length > 0) {
        parsedAmenities = parsed.amenities
      }
    }
  } catch (e) {
    // If it fails to parse, it just means it's a legacy plain-text description.
  }

  const timeSlots = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00']

  // Compute Price
  let computedPrice = 1500; // default fallback
  if (selectedCourt && priceRules.length > 0) {
    // try to find a rule for this specific court
    const courtRule = priceRules.find(r => r.court === selectedCourt.id)
    if (courtRule && courtRule.value) {
      computedPrice = parseFloat(courtRule.value)
    } else {
      // try to find a turf-level rule
      const turfRule = priceRules.find(r => r.turf === id && !r.court)
      if (turfRule && turfRule.value) {
        computedPrice = parseFloat(turfRule.value)
      }
    }
  }

  // Calculate total days
  let totalDays = 1;
  if (selectedDate && endDate) {
    const start = new Date(selectedDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    totalDays = diffDays >= 0 ? diffDays + 1 : 1; 
  }

  const finalPrice = computedPrice * totalDays;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
  }

  const handleHoldAndPay = async () => {
    if (!selectedCourt) {
      alert("Please select a court.")
      return
    }

    setIsProcessing(true)
    try {
      // 1. Create a Booking (Status: PENDING)
      const bookingRes = await apiClient.post(ENDPOINTS.BOOKINGS, {
        court: selectedCourt.id,
        start_at: `${selectedDate}T${selectedTime}:00`,
        end_at: `${endDate}T${String(parseInt(selectedTime!) + 1).padStart(2, '0')}:00`,
        status: 'PENDING',
        amount: finalPrice
      })
      const bookingId = bookingRes.data.id

      // 2. Create Razorpay Order
      const orderRes = await apiClient.post('/v1/payments/create_order/', {
        booking_id: bookingId,
        amount: finalPrice
      })
      const { order_id, amount, currency, key } = orderRes.data

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: "TurfArena",
        description: `Booking for ${turf.name}`,
        order_id: order_id,
        handler: async function (response: any) {
          // 4. Verify Signature
          try {
            await apiClient.post('/v1/payments/verify/', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            })
            setIsBookingSuccessful(true)
          } catch (err) {
            alert("Payment verification failed.")
          }
        },
        prefill: {
          name: "Player",
          email: "player@example.com"
        },
        theme: {
          color: "#0ea5e9"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        alert("Payment Failed. Reason: " + response.error.description);
      });
      rzp.open();

    } catch (err) {
      console.error("Booking/Payment failed", err)
      alert("Failed to initialize payment.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="pb-24 bg-background min-h-screen text-foreground selection:bg-brand/20">
      {/* Hero Header */}
      <div className="relative h-[40vh] md:h-[50vh] bg-muted overflow-hidden">
        {/* Dynamic Image Background */}
        {parsedImage ? (
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 hover:scale-105" 
            style={{ backgroundImage: `url(${parsedImage})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/20 via-background to-background" />
        )}
        
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/40" />

        <Link to="/explore" className="absolute top-6 left-6 z-20 glass p-3 rounded-full hover:bg-background/80 transition-all text-white shadow-sm group">
          <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
        </Link>
        
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 bg-gradient-to-t from-background via-background/90 to-transparent z-20">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="glass px-3 py-1 rounded-full text-sm font-bold text-brand flex items-center shadow-sm">
                  <Star className="w-4 h-4 mr-1 fill-brand" /> {turf.rating_avg || 'New'}
                </span>
                <span className="glass px-3 py-1 rounded-full text-sm font-semibold text-muted-foreground shadow-sm">
                  Premium Venue
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-foreground tracking-tight drop-shadow-sm mb-2">
                {turf.name}
              </h1>
              <div className="flex items-center text-muted-foreground font-medium text-lg">
                <MapPin className="w-5 h-5 mr-1.5 text-brand" /> {turf.address}, {turf.city}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* About Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="w-2 h-6 bg-brand rounded-full mr-3" /> About Arena
            </h2>
            <p className="text-muted-foreground leading-relaxed font-medium text-lg">
              {parsedAbout}
            </p>
          </motion.section>

          {/* Amenities Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="w-2 h-6 bg-brand rounded-full mr-3" /> Amenities
            </h2>
            <div className="flex flex-wrap gap-3">
              {parsedAmenities.map((am) => (
                <motion.span 
                  key={am} 
                  whileHover={{ scale: 1.05 }}
                  className="px-5 py-2.5 rounded-xl bg-card border border-border text-sm font-bold shadow-sm flex items-center text-foreground"
                >
                  <Check className="w-4 h-4 mr-2 text-brand" /> {am}
                </motion.span>
              ))}
            </div>
          </motion.section>

          {/* Slot Grid */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold flex items-center">
                <span className="w-2 h-6 bg-brand rounded-full mr-3" /> Book a Slot
              </h2>
              <div className="hidden sm:flex items-center gap-4 text-xs font-bold text-muted-foreground bg-card px-4 py-2 rounded-full border border-border">
                <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-background border border-border mr-1.5 shadow-sm"></span> Available</span>
                <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-200 mr-1.5"></span> Booked</span>
                <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-brand shadow-[0_0_10px_rgba(var(--brand),0.4)] mr-1.5"></span> Selected</span>
              </div>
            </div>
            
            {courts.length === 0 ? (
              <div className="bg-card border border-border border-dashed rounded-2xl p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-semibold">No courts registered for this turf yet.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {courts.map(court => (
                  <div key={court.id} className={`p-6 rounded-3xl border transition-all duration-300 ${selectedCourt?.id === court.id ? 'bg-brand/5 border-brand/20 shadow-md' : 'bg-card border-border shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-xl font-extrabold text-foreground">{court.name}</h3>
                        <p className="text-sm font-semibold text-brand mt-1">{court.sport_type || court.surface || 'General Surface'}</p>
                      </div>
                      <Button 
                        variant={selectedCourt?.id === court.id ? 'default' : 'outline'}
                        className={`rounded-xl font-bold ${selectedCourt?.id === court.id ? 'bg-brand text-white shadow-md' : ''}`}
                        onClick={() => setSelectedCourt(court)}
                      >
                        {selectedCourt?.id === court.id ? 'Selected' : 'Select Court'}
                      </Button>
                    </div>
                    
                    {/* Time Slots */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {timeSlots.map((time) => {
                        const isBooked = time === '19:00'; // Dummy logic just for visual representation
                        const isSelected = selectedCourt?.id === court.id && selectedTime === time;
                        
                        return (
                          <motion.div 
                            key={time}
                            whileHover={!isBooked ? { scale: 1.05 } : {}}
                            whileTap={!isBooked ? { scale: 0.95 } : {}}
                            onClick={() => {
                              if (!isBooked) {
                                setSelectedCourt(court);
                                setSelectedTime(time);
                              }
                            }}
                            className={`
                              flex flex-col items-center justify-center py-3 rounded-xl border-2 font-bold text-sm cursor-pointer transition-all
                              ${isBooked ? 'bg-red-50/50 border-red-100 text-red-400 cursor-not-allowed' : 
                                isSelected ? 'bg-brand border-brand text-white shadow-[0_4px_14px_0_rgba(var(--brand),0.39)]' : 
                                'bg-background border-border text-foreground hover:border-brand/30 hover:bg-brand/5'}
                            `}
                          >
                            <span>{time}</span>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-1">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="sticky top-24 bg-card rounded-3xl p-8 shadow-2xl border border-border/50"
          >
            <h3 className="text-2xl font-extrabold mb-6 flex items-center">
              Booking Summary
            </h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex flex-col space-y-2 p-3 bg-muted/50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold flex items-center"><Calendar className="w-4 h-4 mr-2" /> Start Date</span>
                  <input type="date" value={selectedDate} onChange={e => {
                    setSelectedDate(e.target.value);
                    if (new Date(e.target.value) > new Date(endDate)) {
                      setEndDate(e.target.value);
                    }
                  }} className="bg-background border border-border rounded text-sm px-2 py-1 font-bold outline-none focus:ring-1 focus:ring-brand text-foreground" />
                </div>
              </div>
              <div className="flex flex-col space-y-2 p-3 bg-muted/50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold flex items-center"><Calendar className="w-4 h-4 mr-2" /> End Date</span>
                  <input type="date" value={endDate} min={selectedDate} onChange={e => setEndDate(e.target.value)} className="bg-background border border-border rounded text-sm px-2 py-1 font-bold outline-none focus:ring-1 focus:ring-brand text-foreground" />
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-muted-foreground font-semibold flex items-center"><Clock className="w-4 h-4 mr-2" /> Time</span>
                <span className="font-bold text-foreground">{selectedTime ? `${selectedTime} - ${String(parseInt(selectedTime) + 1).padStart(2, '0')}:00` : '--:--'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/50 rounded-xl">
                <span className="text-muted-foreground font-semibold flex items-center"><MapPin className="w-4 h-4 mr-2" /> Court</span>
                <span className="font-bold text-brand">{selectedCourt ? selectedCourt.name : 'Select a court'}</span>
              </div>
            </div>
            
            <div className="border-t-2 border-dashed border-border pt-6 mb-8">
              <div className="flex justify-between items-end mb-2">
                <span className="text-muted-foreground font-bold text-lg">Total Amount</span>
                <span className="text-4xl font-black text-foreground">
                  {formatCurrency(finalPrice)}
                </span>
              </div>
              {totalDays > 1 && (
                <p className="text-sm font-semibold text-brand text-right mt-1">For {totalDays} consecutive days</p>
              )}
              <p className="text-xs text-muted-foreground font-medium text-right mt-1">Includes all applicable taxes</p>
            </div>
            
            <Button 
              onClick={handleHoldAndPay}
              disabled={isProcessing}
              className="w-full bg-brand text-white hover:bg-brand-hover font-black text-xl h-16 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(var(--brand),0.3)] transition-all">
              {isProcessing ? 'Processing...' : 'Hold & Pay'}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-5 flex items-center justify-center font-bold">
              <Info className="w-4 h-4 mr-1.5 text-yellow-500" /> Slots are held for 8 minutes
            </p>
          </motion.div>
        </div>
      </div>

      {/* Success Modal Overlay */}
      {isBookingSuccessful && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white text-black p-10 rounded-3xl shadow-2xl flex flex-col items-center justify-center max-w-sm w-full mx-4"
          >
            <h2 className="text-2xl font-black text-center mb-6 leading-tight">
              Booking Successful<br/>Done
            </h2>
            <div className="bg-green-500 rounded-full p-4 mb-8 shadow-lg shadow-green-500/30">
              <Check className="w-16 h-16 text-white stroke-[4]" />
            </div>
            <Link to="/player/bookings" className="w-full">
              <Button className="w-full bg-black text-white hover:bg-gray-800 rounded-xl h-12 font-bold text-lg">
                View My Bookings
              </Button>
            </Link>
          </motion.div>
        </div>
      )}
    </div>
  )
}
