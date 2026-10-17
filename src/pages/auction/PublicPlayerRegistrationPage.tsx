import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserCheck, CheckCircle2, AlertCircle, RefreshCw, Upload, Phone, User, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/api/apiClient'

interface RegConfig {
  tournament_name: string
  title: string
  intro_text: string
  success_message: string
  show_tournament_logo: boolean
  show_tournament_name: boolean
  fields: string[]
  categories: { name: string; base_price?: number }[]
  custom_fields: {
    field_key: string
    label: string
    data_type: string
    required: boolean
    options: string[]
  }[]
}

const ROLE_OPTIONS = [
  'Top-Order Batsman',
  'Middle-Order Batsman',
  'Finisher / Power Hitter',
  'All-Rounder (Batting)',
  'All-Rounder (Bowling)',
  'Wicket-Keeper Batsman',
  'Fast Bowler',
  'Medium Pacer',
  'Spin Bowler (Off-Spin)',
  'Spin Bowler (Leg-Spin)'
]

const BATTING_OPTIONS = ['Right Hand Bat', 'Left Hand Bat']
const BOWLING_OPTIONS = [
  'Right Arm Fast',
  'Right Arm Medium',
  'Right Arm Spin',
  'Left Arm Fast',
  'Left Arm Medium',
  'Left Arm Spin'
]

export default function PublicPlayerRegistrationPage() {
  const { token } = useParams<{ token: string }>()
  const [config, setConfig] = useState<RegConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Form inputs
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    mobile: '',
    age: '',
    location: '',
    role: 'All-Rounder (Batting)',
    category: '',
    batting_style: 'Right Hand Bat',
    bowling_style: 'Right Arm Medium',
    app_name: '',
    app_id: '',
    experience: '',
  })
  const [customValues, setCustomValues] = useState<Record<string, any>>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [token])

  const fetchConfig = async () => {
    if (!token) return
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await apiClient.get(`/v1/auction/public/register/${token}/`)
      setConfig(res.data)
      if (res.data.categories?.length > 0) {
        setFormData(prev => ({ ...prev, category: res.data.categories[0].name }))
      }
    } catch (err: any) {
      console.error('Failed to load registration form', err)
      setErrorMsg(err.response?.data?.error || 'Registration link is either expired, disabled, or invalid.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCustomChange = (key: string, value: any) => {
    setCustomValues(prev => ({ ...prev, [key]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (!formData.name.trim()) {
      alert('Please enter your full name')
      return
    }
    if (!formData.mobile.trim() || formData.mobile.replace(/\\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
      const submitData = new FormData()
      submitData.append('name', formData.name.trim())
      submitData.append('mobile', formData.mobile.trim())
      if (formData.age) submitData.append('age', formData.age)
      if (formData.location) submitData.append('location', formData.location)
      if (formData.role) submitData.append('role', formData.role)
      if (formData.category) submitData.append('category', formData.category)
      if (formData.batting_style) submitData.append('batting_style', formData.batting_style)
      if (formData.bowling_style) submitData.append('bowling_style', formData.bowling_style)
      if (formData.app_name) submitData.append('app_name', formData.app_name)
      if (formData.app_id) submitData.append('app_id', formData.app_id)
      if (formData.experience) submitData.append('experience', formData.experience)

      if (photoFile) {
        submitData.append('photo_file', photoFile)
      }

      // Append custom fields
      Object.entries(customValues).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          submitData.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
        }
      })

      const res = await apiClient.post(`/v1/auction/public/register/${token}/`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data?.success) {
        setSubmitted(true)
      }
    } catch (err: any) {
      console.error('Registration failed', err)
      setErrorMsg(err.response?.data?.error || 'Registration submission failed. Please verify your details.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
        <p className="text-slate-300 font-semibold animate-pulse text-sm">Loading Registration Form...</p>
      </div>
    )
  }

  if (errorMsg && !config) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-14 h-14 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Registration Unavailable</h2>
          <p className="text-sm text-slate-400">{errorMsg}</p>
          <Link to="/">
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Return to TurfArena</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Registration Successful!</h2>
            <p className="text-sm text-slate-300 mt-2 font-medium">
              {config?.success_message || 'Thank you! Your player profile has been submitted and registered into the tournament auction pool.'}
            </p>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 text-left text-xs space-y-1.5">
            <p className="text-slate-400">Player Name: <span className="text-white font-bold">{formData.name}</span></p>
            <p className="text-slate-400">Mobile: <span className="text-white font-bold">{formData.mobile}</span></p>
            <p className="text-slate-400">Role: <span className="text-white font-bold">{formData.role}</span></p>
            <p className="text-slate-400">Category: <span className="text-white font-bold">{formData.category || 'General'}</span></p>
          </div>
          <p className="text-xs text-slate-500">You will be notified via SMS/WhatsApp when the auction starts.</p>
        </motion.div>
      </div>
    )
  }

  const fields = config?.fields || ['name', 'mobile', 'role', 'category', 'batting_style', 'bowling_style', 'photo']
  const isFieldActive = (key: string) => fields.includes(key) || fields.includes(`custom:${key}`)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          {config?.show_tournament_name && config.tournament_name && (
            <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              {config.tournament_name}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {config?.title || 'Player Registration Form'}
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            {config?.intro_text || 'Enter your verified details to participate in the upcoming live player auction.'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs p-4 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Registration Card Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Full Name <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <Input
                    required
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="bg-slate-950 border-slate-800 pl-10 text-white text-sm h-11 rounded-xl"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Mobile Number <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <Input
                    required
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\\D/g, ''))}
                    className="bg-slate-950 border-slate-800 pl-10 text-white text-sm h-11 rounded-xl"
                  />
                </div>
              </div>

              {/* Age */}
              {isFieldActive('age') && (
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Age
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <Input
                      type="number"
                      min={10}
                      max={90}
                      placeholder="e.g. 24"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      className="bg-slate-950 border-slate-800 pl-10 text-white text-sm h-11 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Location / City */}
              {isFieldActive('location') && (
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    City / Location
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <Input
                      placeholder="e.g. Mumbai, Pune"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="bg-slate-950 border-slate-800 pl-10 text-white text-sm h-11 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Role */}
              {isFieldActive('role') && (
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Primary Playing Role <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm h-11 rounded-xl px-3 outline-none"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category */}
              {isFieldActive('category') && config?.categories && config.categories.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Auction Category <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm h-11 rounded-xl px-3 outline-none"
                  >
                    {config.categories.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Batting Style */}
              {isFieldActive('batting_style') && (
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Batting Style
                  </label>
                  <select
                    value={formData.batting_style}
                    onChange={(e) => handleInputChange('batting_style', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm h-11 rounded-xl px-3 outline-none"
                  >
                    {BATTING_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bowling Style */}
              {isFieldActive('bowling_style') && (
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Bowling Style
                  </label>
                  <select
                    value={formData.bowling_style}
                    onChange={(e) => handleInputChange('bowling_style', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white text-sm h-11 rounded-xl px-3 outline-none"
                  >
                    {BOWLING_OPTIONS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Photo Upload */}
              {isFieldActive('photo') && (
                <div className="sm:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Player Photo (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-16 h-16 rounded-xl object-cover border border-emerald-500/40"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                    <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer border border-slate-700 transition">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      Choose Photo File
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-500">PNG, JPG or WebP</span>
                  </div>
                </div>
              )}

              {/* Dynamic Custom Fields configured by Organiser */}
              {config?.custom_fields?.map((cf) => {
                if (!isFieldActive(cf.field_key) && !isFieldActive(`custom:${cf.field_key}`)) return null
                return (
                  <div key={cf.field_key} className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                      {cf.label} {cf.required && <span className="text-emerald-400">*</span>}
                    </label>
                    {cf.data_type === 'select' && cf.options?.length > 0 ? (
                      <select
                        required={cf.required}
                        value={customValues[cf.field_key] || ''}
                        onChange={(e) => handleCustomChange(cf.field_key, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white text-sm h-11 rounded-xl px-3 outline-none"
                      >
                        <option value="">Select an option</option>
                        {cf.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        required={cf.required}
                        type={cf.data_type === 'number' ? 'number' : 'text'}
                        placeholder={`Enter ${cf.label.toLowerCase()}`}
                        value={customValues[cf.field_key] || ''}
                        onChange={(e) => handleCustomChange(cf.field_key, e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white text-sm h-11 rounded-xl"
                      />
                    )}
                  </div>
                )
              })}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 mt-4"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Submitting Registration...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" /> Submit Registration
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500">
          Powered by TurfArena Live Auction Engine
        </p>
      </div>
    </div>
  )
}
