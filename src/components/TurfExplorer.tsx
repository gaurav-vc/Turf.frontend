import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Star, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'
import { Link } from 'react-router-dom'
import type { Turf } from '@/api/models/Turf'

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

export default function TurfExplorer() {
  const [turfs, setTurfs] = useState<Turf[]>([])
  const [loading, setLoading] = useState(true)
  
  const [searchCity, setSearchCity] = useState('')
  const [searchStation, setSearchStation] = useState('')
  const [searchLocation, setSearchLocation] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    apiClient.get('/v1/turfs-app/turfs/', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        const data = res.data;
        setTurfs(data.results || data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch turfs", err)
        setLoading(false)
      })
  }, [])

  const availableCities = Object.keys(MUMBAI_HIERARCHY)
  const availableStations = searchCity ? Object.keys(MUMBAI_HIERARCHY[searchCity]) : []
  const availableLocations = searchCity && searchStation ? MUMBAI_HIERARCHY[searchCity][searchStation] : []

  const filteredTurfs = turfs.filter(t => {
    // Backend saves address as "Location, Station" or similar, and city as "City"
    // Let's make it robust by checking inclusion.
    const matchesCity = !searchCity || (t.city && t.city.toLowerCase().includes(searchCity.toLowerCase()))
    const matchesStation = !searchStation || (t.address && t.address.toLowerCase().includes(searchStation.toLowerCase()))
    const matchesLocation = !searchLocation || (t.address && t.address.toLowerCase().includes(searchLocation.toLowerCase()))

    return matchesCity && matchesStation && matchesLocation
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <div className="relative pt-10 pb-8 px-6 lg:px-12 flex flex-col items-center text-center overflow-hidden bg-muted/30">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/10 via-background to-background pointer-events-none" />
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl lg:text-5xl font-extrabold tracking-tight z-10 text-foreground"
        >
          BOOK YOUR <span className="text-brand drop-shadow-sm">TURF</span>
        </motion.h1>
        
        {/* Dynamic Filters UI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 w-full max-w-5xl relative z-10 flex flex-col md:flex-row gap-6 p-6 sm:p-8 bg-card rounded-3xl shadow-xl border border-border"
        >
          {/* City Dropdown */}
          <div className="flex-1 text-left">
            <label className="block text-xs font-bold text-muted-foreground mb-1 ml-1">City</label>
            <div className="relative w-full">
              <select 
                value={searchCity}
                onChange={(e) => {
                  setSearchCity(e.target.value)
                  setSearchStation('')
                  setSearchLocation('')
                }}
                className="w-full pl-4 pr-10 py-3 h-12 rounded-xl border border-border bg-background focus:ring-2 focus:ring-brand outline-none transition-all text-foreground appearance-none font-semibold"
              >
                <option value="">All Cities</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Region/Station Dropdown */}
          <div className="flex-1 text-left">
            <label className="block text-xs font-bold text-muted-foreground mb-1 ml-1">Region / Station</label>
            <div className="relative w-full">
              <select 
                value={searchStation}
                onChange={(e) => {
                  setSearchStation(e.target.value)
                  setSearchLocation('')
                }}
                disabled={!searchCity}
                className="w-full pl-4 pr-10 py-3 h-12 rounded-xl border border-border bg-background focus:ring-2 focus:ring-brand outline-none transition-all text-foreground appearance-none disabled:opacity-50 font-semibold"
              >
                <option value="">All Regions</option>
                {availableStations.map(station => (
                  <option key={station} value={station}>{station}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Specific Location Dropdown */}
          <div className="flex-1 text-left">
            <label className="block text-xs font-bold text-muted-foreground mb-1 ml-1">Specific Location</label>
            <div className="relative w-full">
              <select 
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                disabled={!searchStation}
                className="w-full pl-4 pr-10 py-3 h-12 rounded-xl border border-border bg-background focus:ring-2 focus:ring-brand outline-none transition-all text-foreground appearance-none disabled:opacity-50 font-semibold"
              >
                <option value="">All Locations</option>
                {availableLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
          
        </motion.div>
      </div>

      {/* Turf Grid */}
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-16">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-bold">
            Featured Venues
            {searchCity && <span className="text-brand"> in {searchCity}</span>}
            {searchStation && <span className="text-muted-foreground text-xl block mt-1">Showing results for {searchLocation || searchStation}</span>}
          </h2>
        </div>
        
        {loading ? (
          <div className="text-center py-20 text-muted-foreground animate-pulse font-semibold">Loading venues...</div>
        ) : filteredTurfs.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
            <MapPin className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">No venues found</h3>
            <p className="text-muted-foreground mt-2 font-medium">Try selecting a different region or city.</p>
            <Button variant="outline" className="mt-6" onClick={() => {setSearchCity(''); setSearchStation(''); setSearchLocation('');}}>Clear Filters</Button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTurfs.map((turf, i) => {
            let parsedImage = '';
            try {
              if (turf.description) {
                const parsed = JSON.parse(turf.description);
                if (parsed && parsed.image_url) {
                  parsedImage = parsed.image_url;
                }
              }
            } catch (e) {}

            return (
            <Link to={`/explore/${turf.id}`} key={turf.id} className="block">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass glass-hover rounded-2xl overflow-hidden flex flex-col group h-full"
              >
              <div className="h-48 bg-muted relative overflow-hidden">
                {/* Dynamic Image Container */}
                {parsedImage ? (
                  <div 
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500" 
                    style={{ backgroundImage: `url(${parsedImage})` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20 group-hover:scale-105 transition-transform duration-500" />
                )}
                
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center text-sm text-foreground font-bold shadow-sm z-10">
                  <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" /> {turf.rating_avg || 'New'}
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-foreground group-hover:text-brand transition-colors line-clamp-1">{turf.name}</h3>
                </div>
                <div className="flex items-start text-muted-foreground text-sm mb-4">
                  <MapPin className="w-4 h-4 mr-1 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{turf.address}, {turf.city}</span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-brand font-bold">Book Now</span>
                  <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors text-brand">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
              </div>
              </motion.div>
            </Link>
          )})}
        </div>
        )}
      </div>
    </div>
  )
}
