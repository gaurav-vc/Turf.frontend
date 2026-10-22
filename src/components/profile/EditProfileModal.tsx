import React, { useState, useEffect, useRef } from 'react'
import { 
  X, 
  Camera, 
  Sparkles, 
  Upload, 
  Dices, 
  Check, 
  User as UserIcon, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Trash2, 
  RefreshCw,
  Palette,
  Layers,
  Award
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/useAuthStore'
import { apiClient } from '@/api/apiClient'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

const AVATAR_STYLES = [
  { id: 'adventurer', name: 'Turf Athlete', desc: 'Adventurous sports character' },
  { id: 'avataaars', name: '3D Cartoon', desc: 'Modern expressive avatar' },
  { id: 'bottts', name: 'Cyber Bot', desc: 'Robotic futuristic player' },
  { id: 'lorelei', name: 'Modern Anime', desc: 'Stylized anime persona' },
  { id: 'micah', name: 'Minimalist', desc: 'Clean geometric portrait' },
]

const BG_COLORS = [
  { id: '10b981', label: 'Turf Green', hex: '#10b981' },
  { id: '059669', label: 'Deep Emerald', hex: '#059669' },
  { id: '0284c7', label: 'Ocean Blue', hex: '#0284c7' },
  { id: '6366f1', label: 'Indigo', hex: '#6366f1' },
  { id: '8b5cf6', label: 'Purple Ace', hex: '#8b5cf6' },
  { id: 'f59e0b', label: 'Sunset Amber', hex: '#f59e0b' },
  { id: 'ef4444', label: 'Ruby Red', hex: '#ef4444' },
  { id: '1e293b', label: 'Midnight Slate', hex: '#1e293b' },
  { id: 'f1f5f9', label: 'Crisp White', hex: '#f1f5f9' },
]

const PRESET_SPORTS_AVATARS = [
  { name: 'Striker Ace', style: 'adventurer', seed: 'Striker99', bg: '10b981' },
  { name: 'Turf Captain', style: 'adventurer', seed: 'CaptainTurf', bg: '0284c7' },
  { name: 'Wall Goalie', style: 'bottts', seed: 'IronGoalie', bg: '6366f1' },
  { name: 'Speed Runner', style: 'avataaars', seed: 'SpeedsterFlash', bg: 'f59e0b' },
  { name: 'MVP Playmaker', style: 'lorelei', seed: 'Playmaker', bg: '8b5cf6' },
  { name: 'Cricket Maestro', style: 'adventurer', seed: 'SixerKing', bg: '059669' },
  { name: 'Stealth Ninja', style: 'micah', seed: 'TurfNinja', bg: '1e293b' },
  { name: 'Champion Star', style: 'avataaars', seed: 'GoldChampion', bg: 'ef4444' },
]

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, updateUser } = useAuthStore()

  const [activeTab, setActiveTab] = useState<'avatar' | 'upload'>('avatar')
  const [fullName, setFullName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  
  // Custom avatar builder state
  const [selectedStyle, setSelectedStyle] = useState('adventurer')
  const [avatarSeed, setAvatarSeed] = useState(user?.name || 'Striker')
  const [selectedBg, setSelectedBg] = useState('10b981')
  
  // Custom photo upload state
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // Current active preview avatar
  const [previewAvatar, setPreviewAvatar] = useState(user?.avatar || '')

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.name || '')
      setPhone(user.phone || '')
      setPreviewAvatar(user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`)
      setErrorMsg('')
      setSuccessMsg('')
      setUploadedFile(null)
    }
  }, [isOpen, user])

  if (!isOpen || !user) return null

  // Compute live dicebear avatar URL
  const buildDicebearUrl = (style: string, seed: string, bg: string) => {
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}`
  }

  const handleSeedChange = (seed: string) => {
    setAvatarSeed(seed)
    const newUrl = buildDicebearUrl(selectedStyle, seed, selectedBg)
    setPreviewAvatar(newUrl)
    setCustomPhotoUrl(null)
    setUploadedFile(null)
  }

  const handleStyleChange = (style: string) => {
    setSelectedStyle(style)
    const newUrl = buildDicebearUrl(style, avatarSeed, selectedBg)
    setPreviewAvatar(newUrl)
    setCustomPhotoUrl(null)
    setUploadedFile(null)
  }

  const handleBgChange = (bg: string) => {
    setSelectedBg(bg)
    const newUrl = buildDicebearUrl(selectedStyle, avatarSeed, bg)
    setPreviewAvatar(newUrl)
    setCustomPhotoUrl(null)
    setUploadedFile(null)
  }

  const handleRollDice = () => {
    const randomKeywords = ['Striker', 'Captain', 'Turbo', 'Maverick', 'Viper', 'Dynamo', 'Phantom', 'Blaze', 'Rocket', 'Shadow', 'Apex', 'Champion']
    const randomWord = randomKeywords[Math.floor(Math.random() * randomKeywords.length)] + Math.floor(Math.random() * 900 + 100)
    const randomBg = BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)].id
    setAvatarSeed(randomWord)
    setSelectedBg(randomBg)
    const newUrl = buildDicebearUrl(selectedStyle, randomWord, randomBg)
    setPreviewAvatar(newUrl)
    setCustomPhotoUrl(null)
    setUploadedFile(null)
  }

  const handleSelectPreset = (preset: typeof PRESET_SPORTS_AVATARS[0]) => {
    setSelectedStyle(preset.style)
    setAvatarSeed(preset.seed)
    setSelectedBg(preset.bg)
    const newUrl = buildDicebearUrl(preset.style, preset.seed, preset.bg)
    setPreviewAvatar(newUrl)
    setCustomPhotoUrl(null)
    setUploadedFile(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be under 5MB.')
      return
    }

    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setCustomPhotoUrl(dataUrl)
      setPreviewAvatar(dataUrl)
      setErrorMsg('')
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setCustomPhotoUrl(null)
    setUploadedFile(null)
    const fallback = buildDicebearUrl(selectedStyle, avatarSeed, selectedBg)
    setPreviewAvatar(fallback)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!fullName.trim()) {
      setErrorMsg('Full name cannot be empty.')
      return
    }

    setSaving(true)

    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
      const headers = { Authorization: `Bearer ${token}` }

      let savedAvatarUrl = previewAvatar

      // If user uploaded a raw file, send as multipart/form-data
      if (uploadedFile) {
        const formData = new FormData()
        formData.append('avatar', uploadedFile)
        formData.append('full_name', fullName.trim())
        if (phone) formData.append('phone', phone.trim())

        const res = await apiClient.patch('/v1/accounts/users/me/', formData, {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data',
          },
        })
        savedAvatarUrl = res.data.avatar || previewAvatar
        updateUser({
          name: res.data.full_name || fullName.trim(),
          phone: res.data.phone || phone.trim(),
          avatar: savedAvatarUrl,
        })
      } else {
        // Otherwise send JSON update
        const payload: any = {
          full_name: fullName.trim(),
          phone: phone.trim(),
          avatar: previewAvatar,
        }

        const res = await apiClient.patch('/v1/accounts/users/me/', payload, { headers })
        savedAvatarUrl = res.data.avatar || previewAvatar
        updateUser({
          name: res.data.full_name || fullName.trim(),
          phone: res.data.phone || phone.trim(),
          avatar: savedAvatarUrl,
        })
      }

      setSuccessMsg('Profile updated successfully!')
      setTimeout(() => {
        onClose()
      }, 900)
    } catch (err: any) {
      console.error('Failed to update profile', err)
      const errDetail = err.response?.data?.detail || err.response?.data?.message || 'Failed to update profile. Please try again.'
      setErrorMsg(errDetail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Turf Gradient Accent */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-brand via-emerald-500 to-brand-hover text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Edit Profile & Avatar
              </h2>
              <p className="text-xs text-white/90 font-medium">
                Customize your player identity, photo, and dynamic avatar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Avatar Hero Preview Banner */}
          <div className="p-5 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row items-center gap-5 justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-background border-2 border-brand/40 shadow-md p-1 flex items-center justify-center">
                  <img 
                    src={previewAvatar} 
                    alt="Avatar Preview" 
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-brand text-white p-1 rounded-full shadow border-2 border-card">
                  <Sparkles className="w-3 h-3" />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-brand bg-brand/10 px-2 py-0.5 rounded-md border border-brand/20">
                  Live Preview
                </span>
                <h3 className="text-lg font-black text-foreground mt-1">
                  {fullName || 'Your Player Name'}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleRollDice}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-card hover:bg-muted border border-border text-xs font-bold text-foreground transition shadow-sm"
              >
                <Dices className="w-4 h-4 text-brand" />
                <span>Roll Dice</span>
              </button>
            </div>
          </div>

          {/* Form Fields: Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <UserIcon className="w-3.5 h-3.5 text-brand" /> Full Name
              </Label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-xl font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Phone className="w-3.5 h-3.5 text-brand" /> Mobile Number
              </Label>
              <Input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Avatar Method Switcher Tabs */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Choose Avatar Method
              </Label>
              <div className="inline-flex p-1 rounded-xl bg-muted border border-border text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('avatar')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'avatar' 
                      ? 'bg-card text-brand font-black shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Custom Avatar Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'upload' 
                      ? 'bg-card text-brand font-black shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Picture</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Custom Avatar Studio */}
            {activeTab === 'avatar' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* 1. Style Picker */}
                <div>
                  <Label className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand" /> 1. Select Style
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {AVATAR_STYLES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleStyleChange(st.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          selectedStyle === st.id
                            ? 'bg-brand/10 border-brand text-brand ring-1 ring-brand font-bold shadow-sm'
                            : 'bg-card hover:bg-muted/50 border-border text-foreground'
                        }`}
                      >
                        <span className="text-xs font-bold truncate">{st.name}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                          {st.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Custom Seed & Keyword */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand" /> 2. Avatar Seed / Handle
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Type anything to change facial features
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="e.g. Striker, Captain, Virat"
                      value={avatarSeed}
                      onChange={(e) => handleSeedChange(e.target.value)}
                      className="rounded-xl font-medium"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRollDice}
                      className="rounded-xl shrink-0 gap-1.5 font-bold"
                    >
                      <Dices className="w-4 h-4 text-brand" /> Randomize
                    </Button>
                  </div>
                </div>

                {/* 3. Background Color Picker */}
                <div>
                  <Label className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-brand" /> 3. Turf Background Color
                  </Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {BG_COLORS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => handleBgChange(bg.id)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform relative flex items-center justify-center ${
                          selectedBg === bg.id ? 'scale-115 border-brand ring-2 ring-brand/30' : 'border-card hover:scale-105'
                        }`}
                        style={{ backgroundColor: bg.hex }}
                        title={bg.label}
                      >
                        {selectedBg === bg.id && (
                          <Check className={`w-3.5 h-3.5 ${bg.id === 'f1f5f9' ? 'text-slate-800' : 'text-white'}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Quick Sports Presets */}
                <div>
                  <Label className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-brand" /> Or Pick a Sports Preset
                  </Label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PRESET_SPORTS_AVATARS.map((preset, idx) => {
                      const presetUrl = buildDicebearUrl(preset.style, preset.seed, preset.bg)
                      const isSelected = previewAvatar === presetUrl
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                            isSelected 
                              ? 'border-brand bg-brand/10 ring-2 ring-brand/30 scale-105' 
                              : 'border-border bg-card hover:bg-muted/50 hover:scale-102'
                          }`}
                          title={preset.name}
                        >
                          <img 
                            src={presetUrl} 
                            alt={preset.name} 
                            className="w-10 h-10 rounded-lg object-cover" 
                          />
                          <span className="text-[9px] font-bold text-foreground truncate w-full text-center">
                            {preset.name.split(' ')[0]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Upload Custom Photo */}
            {activeTab === 'upload' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-brand/60 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-brand/5 flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Click to upload your profile picture
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports JPG, PNG, or WebP (max 5MB)
                    </p>
                  </div>
                </div>

                {customPhotoUrl && (
                  <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={customPhotoUrl} 
                        alt="Uploaded preview" 
                        className="w-12 h-12 rounded-xl object-cover border border-border" 
                      />
                      <div>
                        <p className="text-xs font-bold text-foreground truncate max-w-[200px]">
                          {uploadedFile?.name || 'Uploaded Photo'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB` : 'Custom Image'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-brand" />
            <span>Updates live throughout the app</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-brand hover:bg-brand-hover text-white rounded-xl font-black gap-2 shadow-md shadow-brand/20"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
