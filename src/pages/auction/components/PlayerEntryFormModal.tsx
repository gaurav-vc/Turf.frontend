import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, UserPlus, Save, Upload, User, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/api/apiClient'

interface PlayerEntryFormModalProps {
  auctionId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  playerToEdit?: any | null
}

const DEFAULT_ROLES = [
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

const DEFAULT_TAGS = ['Icon', 'Marquee', 'Overseas', 'Domestic', 'Retained', 'Player']

export default function PlayerEntryFormModal({
  auctionId,
  isOpen,
  onClose,
  onSuccess,
  playerToEdit
}: PlayerEntryFormModalProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [customFields, setCustomFields] = useState<any[]>([])
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    player_no: '',
    name: '',
    mobile: '',
    age: '',
    location: '',
    role: 'All-Rounder (Batting)',
    category: '',
    base_price: 1000,
    tagging: 'Player',
    photo_url: '',
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
    if (isOpen) {
      loadConfig()
      if (playerToEdit) {
        setFormData({
          player_no: playerToEdit.serial_no?.toString() || '',
          name: playerToEdit.player_name || playerToEdit.name || '',
          mobile: playerToEdit.mobile || '',
          age: playerToEdit.age?.toString() || '',
          location: playerToEdit.location || '',
          role: playerToEdit.role || playerToEdit.player_skills || 'All-Rounder',
          category: playerToEdit.category || '',
          base_price: playerToEdit.base_price || 1000,
          tagging: playerToEdit.custom_data?.tagging || 'Player',
          photo_url: playerToEdit.photo_url || '',
          batting_style: playerToEdit.batting_style || 'Right Hand Bat',
          bowling_style: playerToEdit.bowling_style || 'Right Arm Medium',
          app_name: playerToEdit.custom_data?.app_name || '',
          app_id: playerToEdit.custom_data?.app_id || '',
          experience: playerToEdit.custom_data?.experience || '',
        })
        setCustomValues(playerToEdit.custom_data || {})
        setPhotoPreview(playerToEdit.photo_url || null)
      } else {
        resetForm()
      }
    }
  }, [isOpen, playerToEdit])

  const resetForm = () => {
    const defaultCat = categories[0]?.name || ''
    const defaultBase = categories[0]?.base_price !== undefined ? categories[0].base_price : 1000
    setFormData({
      player_no: '',
      name: '',
      mobile: '',
      age: '',
      location: '',
      role: 'All-Rounder (Batting)',
      category: defaultCat,
      base_price: defaultBase,
      tagging: 'Player',
      photo_url: '',
      batting_style: 'Right Hand Bat',
      bowling_style: 'Right Arm Medium',
      app_name: '',
      app_id: '',
      experience: '',
    })
    setCustomValues({})
    setPhotoFile(null)
    setPhotoPreview(null)
    setErrorMsg('')
  }

  const loadConfig = async () => {
    setLoadingConfig(true)
    try {
      const [catRes, cfRes] = await Promise.all([
        apiClient.get(`/v1/auction/categories/?auction=${auctionId}`),
        apiClient.get(`/v1/auction/custom-fields/?auction=${auctionId}&entity_type=player`)
      ])
      let cats = catRes.data.results || catRes.data || []
      if (!Array.isArray(cats) || cats.length === 0) {
        try {
          const rulesRes = await apiClient.get(`/v1/auction/console/${auctionId}/setup_rules/`)
          if (rulesRes.data.categories && Array.isArray(rulesRes.data.categories)) {
            cats = rulesRes.data.categories
          }
        } catch (_) {}
      }

      setCategories(cats)
      if (!playerToEdit && cats.length > 0) {
        setFormData(prev => ({
          ...prev,
          category: prev.category && cats.some((c: any) => c.name === prev.category) ? prev.category : cats[0].name,
          base_price: (prev.base_price && prev.base_price !== 1000) ? prev.base_price : (cats[0].base_price || 1000)
        }))
      }
      setCustomFields(cfRes.data.results || cfRes.data || [])
    } catch (err) {
      console.error('Failed to load form config', err)
    } finally {
      setLoadingConfig(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Please enter player name')
      return
    }

    setSaving(true)
    setErrorMsg('')

    try {
      const submitData = new FormData()
      submitData.append('auction', auctionId)
      submitData.append('name', formData.name.trim())
      if (formData.player_no) submitData.append('serial_no', formData.player_no)
      submitData.append('mobile', formData.mobile.trim())
      if (formData.age) submitData.append('age', formData.age)
      submitData.append('location', formData.location.trim())
      submitData.append('role', formData.role)
      submitData.append('category', formData.category)
      submitData.append('base_price', formData.base_price.toString())
      submitData.append('tagging', formData.tagging)
      submitData.append('batting_style', formData.batting_style)
      submitData.append('bowling_style', formData.bowling_style)
      submitData.append('app_name', formData.app_name)
      submitData.append('app_id', formData.app_id)
      submitData.append('experience', formData.experience)
      if (formData.photo_url) submitData.append('photo_url', formData.photo_url)

      if (photoFile) {
        submitData.append('photo_file', photoFile)
      }

      // Pack custom fields into custom_data JSON
      submitData.append('custom_data', JSON.stringify(customValues))

      if (playerToEdit) {
        await apiClient.patch(`/v1/auction/players/${playerToEdit.id}/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        // Create player via dedicated players endpoint
        await apiClient.post(`/v1/auction/console/${auctionId}/players/`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Save player failed', err)
      setErrorMsg(err.response?.data?.error || 'Failed to save player. Please verify inputs.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl my-6 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                <span>{playerToEdit ? 'Edit Player Profile' : 'Add Player to Auction Pool'}</span>
                {loadingConfig && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Authoritative Player Master Form
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-zinc-900 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-zinc-900">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-2xl flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Player No. */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Player No. <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Input
                type="number"
                min={1}
                placeholder="Auto next number"
                value={formData.player_no}
                onChange={(e) => setFormData({ ...formData, player_no: e.target.value })}
                className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-semibold"
              />
            </div>

            {/* Name */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Name <span className="text-emerald-600">*</span>
              </label>
              <Input
                required
                placeholder="Player full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-semibold"
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Mobile Number
              </label>
              <Input
                type="tel"
                maxLength={10}
                placeholder="10-digit mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-semibold"
              />
            </div>

            {/* Age */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Age
              </label>
              <Input
                type="number"
                min={10}
                max={99}
                placeholder="e.g. 25"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-semibold"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Location
              </label>
              <Input
                placeholder="City / Region"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-semibold"
              />
            </div>

            {/* Role */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Role <span className="text-emerald-600">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-white border border-slate-200 text-xs text-zinc-900 font-semibold rounded-xl px-2.5 py-2 outline-none"
              >
                {DEFAULT_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Category <span className="text-emerald-600">*</span>
              </label>
              {categories.length > 0 ? (
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const selCat = e.target.value
                    const matched = categories.find((c) => c.name === selCat)
                    setFormData((prev) => ({
                      ...prev,
                      category: selCat,
                      base_price: matched?.base_price !== undefined ? matched.base_price : prev.base_price,
                    }))
                  }}
                  className="w-full bg-white border border-slate-200 text-xs text-zinc-900 font-semibold rounded-xl px-2.5 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  {categories.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} {c.base_price ? `(Base: ₹${Number(c.base_price).toLocaleString('en-IN')})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  required
                  placeholder="e.g. cyclone, storm, etc."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-semibold"
                />
              )}
            </div>

            {/* Base Price */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Base Price (₹) <span className="text-emerald-600">*</span>
              </label>
              <Input
                required
                type="number"
                min={0}
                step={500}
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-semibold"
              />
            </div>

            {/* Tagging */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Tagging
              </label>
              <select
                value={formData.tagging}
                onChange={(e) => setFormData({ ...formData, tagging: e.target.value })}
                className="w-full bg-white border border-slate-200 text-xs text-zinc-900 font-semibold rounded-xl px-2.5 py-2 outline-none"
              >
                {DEFAULT_TAGS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Batting Style */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Batting Style
              </label>
              <select
                value={formData.batting_style}
                onChange={(e) => setFormData({ ...formData, batting_style: e.target.value })}
                className="w-full bg-white border border-slate-200 text-xs text-zinc-900 font-semibold rounded-xl px-2.5 py-2 outline-none"
              >
                <option value="Right Hand Bat">Right Hand Bat</option>
                <option value="Left Hand Bat">Left Hand Bat</option>
              </select>
            </div>

            {/* Bowling Style */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Bowling Style
              </label>
              <select
                value={formData.bowling_style}
                onChange={(e) => setFormData({ ...formData, bowling_style: e.target.value })}
                className="w-full bg-white border border-slate-200 text-xs text-zinc-900 font-semibold rounded-xl px-2.5 py-2 outline-none"
              >
                <option value="Right Arm Fast">Right Arm Fast</option>
                <option value="Right Arm Medium">Right Arm Medium</option>
                <option value="Right Arm Spin">Right Arm Spin</option>
                <option value="Left Arm Fast">Left Arm Fast</option>
                <option value="Left Arm Medium">Left Arm Medium</option>
                <option value="Left Arm Spin">Left Arm Spin</option>
              </select>
            </div>

            {/* App Tracking & Experience */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                App Name
              </label>
              <Input
                placeholder="e.g. TurfPass / CricClubs"
                value={formData.app_name}
                onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                App ID
              </label>
              <Input
                placeholder="e.g. TP-98421"
                value={formData.app_id}
                onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Experience
              </label>
              <Input
                placeholder="e.g. 5 Years / District Level"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-medium"
              />
            </div>

            {/* Photo Section */}
            <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Player Photo
              </label>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-2xl object-cover border border-emerald-500 shadow-xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                    <User className="w-7 h-7" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-zinc-800 text-xs font-bold rounded-xl cursor-pointer border border-slate-200 shadow-xs transition">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      Upload Image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] text-slate-500 font-semibold">OR Photo URL</span>
                  </div>
                  <Input
                    placeholder="https://example.com/player.jpg"
                    value={formData.photo_url}
                    onChange={(e) => {
                      setFormData({ ...formData, photo_url: e.target.value })
                      if (!photoFile) setPhotoPreview(e.target.value)
                    }}
                    className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl h-8 font-medium"
                  />
                  <p className="text-[11px] text-slate-500 italic">
                    Choose either an image file or a Photo URL. If editing, leave both blank to keep the existing photo. If both are supplied, the uploaded image is used.
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Player Information (Player Field Studio) */}
            <div className="sm:col-span-2 space-y-3 pt-3 border-t border-slate-200">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Additional Player Information
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  These fields are configured in Player Field Studio. Select-type fields use the tournament's managed validation list.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Nationality
                  </label>
                  <Input
                    placeholder="e.g. Indian"
                    value={customValues['nationality'] || 'Indian'}
                    onChange={(e) => setCustomValues({ ...customValues, nationality: e.target.value })}
                    className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Pin Code
                  </label>
                  <Input
                    placeholder="e.g. 400001"
                    value={customValues['pin_code'] || ''}
                    onChange={(e) => setCustomValues({ ...customValues, pin_code: e.target.value })}
                    className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Awards Won
                  </label>
                  <Input
                    placeholder="e.g. Player of the Tournament"
                    value={customValues['awards_won'] || ''}
                    onChange={(e) => setCustomValues({ ...customValues, awards_won: e.target.value })}
                    className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Bowling Type
                  </label>
                  <Input
                    placeholder="e.g. Right Arm Off-Spin"
                    value={customValues['bowling_type'] || ''}
                    onChange={(e) => setCustomValues({ ...customValues, bowling_type: e.target.value })}
                    className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-medium"
                  />
                </div>

                {/* Dynamic custom fields */}
                {customFields.filter(cf => !['nationality', 'pin_code', 'awards_won', 'bowling_type', 'tagging'].includes(cf.field_key)).map((cf) => (
                  <div key={cf.id || cf.field_key}>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      {cf.label} {cf.required && <span className="text-emerald-600">*</span>}
                    </label>
                    <Input
                      required={cf.required}
                      placeholder={`Enter ${cf.label.toLowerCase()}`}
                      value={customValues[cf.field_key] || ''}
                      onChange={(e) => setCustomValues({ ...customValues, [cf.field_key]: e.target.value })}
                      className="bg-white border-slate-200 text-xs text-zinc-900 rounded-xl font-medium"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-200 text-slate-600 hover:text-zinc-900 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 rounded-xl shadow-xs px-4"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : playerToEdit ? 'Save Changes' : 'Save Player'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
