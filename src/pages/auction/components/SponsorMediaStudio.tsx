import { useState, useEffect, useRef } from 'react'
import {
  Award, Video, Plus, Trash2, Eye, EyeOff, Image as ImageIcon,
  Play, Clock, Sparkles, Layers, Wand2, Copy, Check, ExternalLink,
  Upload, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/api/apiClient'

interface SponsorMediaStudioProps {
  auctionId: string
}

export default function SponsorMediaStudio({ auctionId }: SponsorMediaStudioProps) {
  const [activeTab, setActiveTab] = useState<'sponsors' | 'media' | 'assets'>('sponsors')
  const [sponsors, setSponsors] = useState<any[]>([])
  const [mediaList, setMediaList] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // New Sponsor State
  const [sponsorMode, setSponsorMode] = useState<'file' | 'url'>('file')
  const [sponsorTitle, setSponsorTitle] = useState('')
  const [sponsorUrl, setSponsorUrl] = useState('')
  const [sponsorFile, setSponsorFile] = useState<File | null>(null)
  const [sponsorFilePreview, setSponsorFilePreview] = useState<string | null>(null)
  const [sponsorDuration, setSponsorDuration] = useState(10)
  const [sponsorOrder, setSponsorOrder] = useState(1)
  const [submittingSponsor, setSubmittingSponsor] = useState(false)
  const sponsorFileInputRef = useRef<HTMLInputElement>(null)

  // New Media State
  const [mediaTitle, setMediaTitle] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video')
  const [mediaDuration, setMediaDuration] = useState(15)
  const [mediaOrder, setMediaOrder] = useState(1)
  const [submittingMedia, setSubmittingMedia] = useState(false)

  // Asset Manager State
  const [assetName, setAssetName] = useState('')
  const [assetType, setAssetType] = useState('Logo')
  const [assetFile, setAssetFile] = useState<File | null>(null)
  const [removeBg, setRemoveBg] = useState(true)
  const [uploadingAsset, setUploadingAsset] = useState(false)
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [auctionId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sponsRes, medRes, assetRes] = await Promise.all([
        apiClient.get(`/v1/auction/sponsors/?auction=${auctionId}`),
        apiClient.get(`/v1/auction/media/?auction=${auctionId}`),
        apiClient.get(`/v1/auction/console/${auctionId}/assets/`),
      ])
      setSponsors(sponsRes.data.results || sponsRes.data || [])
      setMediaList(medRes.data.results || medRes.data || [])
      setAssets(assetRes.data.assets || [])
    } catch (err) {
      console.error('Failed to load sponsors/media/assets', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSponsorFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSponsorFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setSponsorFilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleClearSponsorFile = () => {
    setSponsorFile(null)
    setSponsorFilePreview(null)
    if (sponsorFileInputRef.current) {
      sponsorFileInputRef.current.value = ''
    }
  }

  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sponsorMode === 'file' && !sponsorFile) {
      alert('Please select an image file to upload as the sponsor logo.')
      return
    }
    if (sponsorMode === 'url' && !sponsorUrl.trim()) {
      alert('Please enter a valid image URL.')
      return
    }

    setSubmittingSponsor(true)
    try {
      if (sponsorMode === 'file' && sponsorFile) {
        const formData = new FormData()
        formData.append('auction', auctionId)
        formData.append('file', sponsorFile)
        formData.append('title', sponsorTitle || sponsorFile.name.replace(/\.[^/.]+$/, ''))
        formData.append('duration_seconds', String(sponsorDuration))
        formData.append('display_order', String(sponsorOrder))
        formData.append('active', 'true')

        await apiClient.post('/v1/auction/sponsors/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await apiClient.post('/v1/auction/sponsors/', {
          auction: auctionId,
          title: sponsorTitle || 'Sponsor',
          source_url: sponsorUrl,
          duration_seconds: sponsorDuration,
          display_order: sponsorOrder,
          active: true,
        })
      }

      setSponsorTitle('')
      setSponsorUrl('')
      handleClearSponsorFile()
      setSponsorDuration(10)
      loadData()
    } catch (err: any) {
      console.error('Failed to add sponsor', err)
      alert(err.response?.data?.error || 'Failed to add sponsor logo.')
    } finally {
      setSubmittingSponsor(false)
    }
  }

  const handleToggleSponsor = async (sponsor: any) => {
    try {
      await apiClient.patch(`/v1/auction/sponsors/${sponsor.id}/`, {
        active: !sponsor.active,
      })
      loadData()
    } catch (err) {
      console.error('Failed to toggle sponsor', err)
    }
  }

  const handleDeleteSponsor = async (id: string) => {
    if (!confirm('Remove this sponsor logo?')) return
    try {
      await apiClient.delete(`/v1/auction/sponsors/${id}/`)
      loadData()
    } catch (err) {
      console.error('Failed to delete sponsor', err)
    }
  }

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mediaUrl.trim()) return
    setSubmittingMedia(true)
    try {
      await apiClient.post('/v1/auction/media/', {
        auction: auctionId,
        title: mediaTitle || 'Auction Media',
        source_url: mediaUrl,
        media_type: mediaType,
        duration_seconds: mediaDuration,
        display_order: mediaOrder,
        active: true,
      })
      setMediaTitle('')
      setMediaUrl('')
      setMediaDuration(15)
      loadData()
    } catch (err) {
      console.error('Failed to add media item', err)
    } finally {
      setSubmittingMedia(false)
    }
  }

  const handleToggleMedia = async (media: any) => {
    try {
      await apiClient.patch(`/v1/auction/media/${media.id}/`, {
        active: !media.active,
      })
      loadData()
    } catch (err) {
      console.error('Failed to toggle media', err)
    }
  }

  const handleDeleteMedia = async (id: string) => {
    if (!confirm('Remove this media item?')) return
    try {
      await apiClient.delete(`/v1/auction/media/${id}/`)
      loadData()
    } catch (err) {
      console.error('Failed to delete media', err)
    }
  }

  // Asset Manager Handlers
  const handleUploadAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetFile) return
    setUploadingAsset(true)

    const formData = new FormData()
    formData.append('asset_file', assetFile)
    formData.append('name', assetName)
    formData.append('asset_type', assetType)
    formData.append('remove_background', String(removeBg))

    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/assets/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAssets(res.data.assets || [])
      setAssetName('')
      setAssetFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload and process asset.')
    } finally {
      setUploadingAsset(false)
    }
  }

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Remove this asset from tournament library?')) return
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/assets/`, {
        action: 'delete',
        asset_id: assetId,
      })
      setAssets(res.data.assets || [])
    } catch (err) {
      console.error('Failed to delete asset', err)
    }
  }

  const handlePromoteToSponsor = async (assetId: string) => {
    setPromotingId(assetId)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/assets/`, {
        action: 'promote_to_sponsor',
        asset_id: assetId,
      })
      alert(res.data?.message || 'Added to Sponsor Logos!')
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add to sponsors.')
    } finally {
      setPromotingId(null)
    }
  }

  const copyAssetUrl = (id: string, url: string) => {
    const full = url.startsWith('http') ? url : `${window.location.origin}${url}`
    navigator.clipboard.writeText(full)
    setCopiedAssetId(id)
    setTimeout(() => setCopiedAssetId(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Sponsors & Broadcast Media Studio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage sponsor banner carousels, promotional video reels, and conservative background removal for tournament branding assets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 border border-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('sponsors')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'sponsors'
                ? 'bg-white text-zinc-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-zinc-900'
            }`}
          >
            <Award className="w-4 h-4 text-amber-500" />
            Sponsor Logos ({sponsors.length})
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'media'
                ? 'bg-white text-zinc-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-zinc-900'
            }`}
          >
            <Video className="w-4 h-4 text-sky-500" />
            Video & Media Reels ({mediaList.length})
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'assets'
                ? 'bg-white text-zinc-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-600" />
            Asset Manager & BG Remover ({assets.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading media assets...</div>
      ) : activeTab === 'sponsors' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Sponsor Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                Add Sponsor Logo
              </h3>

              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSponsorMode('file')}
                  className={`px-2 py-0.5 rounded-md transition ${
                    sponsorMode === 'file' ? 'bg-white text-zinc-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setSponsorMode('url')}
                  className={`px-2 py-0.5 rounded-md transition ${
                    sponsorMode === 'url' ? 'bg-white text-zinc-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  URL Link
                </button>
              </div>
            </div>

            <form onSubmit={handleAddSponsor} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Sponsor / Brand Name
                </label>
                <Input
                  value={sponsorTitle}
                  onChange={(e) => setSponsorTitle(e.target.value)}
                  placeholder="e.g. Red Bull, Dream11"
                  className="bg-white border-slate-200 text-xs text-zinc-900"
                />
              </div>

              {sponsorMode === 'file' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Upload Logo File (PNG, JPG, SVG, WEBP)
                  </label>
                  <input
                    type="file"
                    ref={sponsorFileInputRef}
                    accept="image/*"
                    onChange={handleSponsorFileSelect}
                    className="hidden"
                  />

                  {sponsorFilePreview ? (
                    <div className="relative border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={sponsorFilePreview}
                          alt="Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-zinc-900 truncate">
                          {sponsorFile?.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {sponsorFile ? `${(sponsorFile.size / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleClearSponsorFile}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => sponsorFileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-amber-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-amber-50/20 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                      <p className="text-xs font-bold text-zinc-800">Click to choose image file</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">PNG or SVG with transparent background recommended</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Image URL
                  </label>
                  <Input
                    value={sponsorUrl}
                    onChange={(e) => setSponsorUrl(e.target.value)}
                    placeholder="https://.../sponsor-logo.png"
                    required
                    className="bg-white border-slate-200 text-xs text-zinc-900"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tip: Upload to <b>Asset Manager</b> tab to generate a transparent background first.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Display (Seconds)
                  </label>
                  <Input
                    type="number"
                    min={3}
                    max={60}
                    value={sponsorDuration}
                    onChange={(e) => setSponsorDuration(Number(e.target.value))}
                    className="bg-white border-slate-200 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={sponsorOrder}
                    onChange={(e) => setSponsorOrder(Number(e.target.value))}
                    className="bg-white border-slate-200 text-xs text-zinc-900"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submittingSponsor || (sponsorMode === 'file' ? !sponsorFile : !sponsorUrl)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs py-2 shadow-sm"
              >
                {submittingSponsor ? 'Adding Sponsor...' : 'Add Sponsor Logo'}
              </Button>
            </form>
          </div>

          {/* Sponsor Carousel List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center justify-between">
              <span>Active Sponsor Banners ({sponsors.length})</span>
              <span className="text-xs text-slate-500">Cycles automatically in live console</span>
            </h3>

            {sponsors.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 bg-white rounded-2xl text-center text-slate-500 text-xs">
                No sponsors added yet. Upload sponsor logos on the left or promote them from the Asset Manager.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sponsors.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition ${
                      s.active
                        ? 'bg-white border-slate-200 shadow-sm'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={s.source_url}
                          alt={s.title || 'Sponsor'}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            ;(e.target as any).style.display = 'none'
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-zinc-900 truncate">
                          {s.title || 'Sponsor'}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1 font-semibold text-amber-600">
                            <Clock className="w-3 h-3" />
                            {s.duration_seconds}s
                          </span>
                          <span>•</span>
                          <span>Order #{s.display_order}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleSponsor(s)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-zinc-900"
                        title={s.active ? 'Disable' : 'Enable'}
                      >
                        {s.active ? (
                          <Eye className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSponsor(s.id)}
                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'media' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Media Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-500" />
              Add Promotional Media
            </h3>
            <form onSubmit={handleAddMedia} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Title / Caption
                </label>
                <Input
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  placeholder="e.g. Tournament Intro Video"
                  className="bg-white border-slate-200 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Media Type
                </label>
                <select
                  value={mediaType}
                  onChange={(e: any) => setMediaType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none"
                >
                  <option value="video">MP4 Video Reel</option>
                  <option value="image">Promotional Image</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Source URL
                </label>
                <Input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://.../video.mp4"
                  required
                  className="bg-white border-slate-200 text-xs text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Duration (Seconds)
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={180}
                    value={mediaDuration}
                    onChange={(e) => setMediaDuration(Number(e.target.value))}
                    className="bg-white border-slate-200 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Order
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={mediaOrder}
                    onChange={(e) => setMediaOrder(Number(e.target.value))}
                    className="bg-white border-slate-200 text-xs text-zinc-900"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submittingMedia || !mediaUrl}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs py-2 mt-2"
              >
                {submittingMedia ? 'Adding...' : 'Add Media Reel'}
              </Button>
            </form>
          </div>

          {/* Media Playlist */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center justify-between">
              <span>Promotional Media Playlist ({mediaList.length})</span>
              <span className="text-xs text-slate-500">Plays during auction breaks & pauses</span>
            </h3>

            {mediaList.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 bg-white rounded-2xl text-center text-slate-500 text-xs">
                No video or media items configured yet.
              </div>
            ) : (
              <div className="space-y-3">
                {mediaList.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition ${
                      m.active
                        ? 'bg-white border-slate-200 shadow-sm'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
                        {m.media_type === 'video' ? (
                          <Play className="w-5 h-5 text-sky-600" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-sky-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-zinc-900 truncate">
                          {m.title || 'Media Reel'}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="uppercase text-sky-600 font-bold">{m.media_type}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {m.duration_seconds} sec
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-[200px] text-slate-400">
                            {m.source_url}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleMedia(m)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-zinc-900"
                        title={m.active ? 'Disable' : 'Enable'}
                      >
                        {m.active ? (
                          <Eye className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteMedia(m.id)}
                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 3. ASSET MANAGER & BACKGROUND REMOVER */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Asset Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-zinc-900">Upload & Strip Background</h3>
            </div>
            <form onSubmit={handleUploadAsset} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Asset Name</label>
                <Input
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g. Tournament Official Logo"
                  className="bg-white border-slate-200 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Asset Category</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-zinc-900 focus:outline-none"
                >
                  <option value="Logo">Tournament Logo</option>
                  <option value="Team Logo">Team Franchise Logo</option>
                  <option value="Sponsor">Sponsor Brand</option>
                  <option value="Title">Title Header Graphic</option>
                  <option value="Other">Other Media</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Image File (PNG, JPG, WEBP)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  required
                  onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <label className="flex items-start gap-2.5 text-xs text-purple-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeBg}
                    onChange={(e) => setRemoveBg(e.target.checked)}
                    className="rounded border-purple-300 text-purple-600 h-4 w-4 mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="font-bold text-zinc-900 block">Remove edge-connected background</span>
                    <span className="text-[10px] text-slate-600 block mt-0.5">
                      Conservative PIL flood-fill algorithm converts white or solid background borders into transparent PNG.
                    </span>
                  </div>
                </label>
              </div>

              <Button
                type="submit"
                disabled={uploadingAsset || !assetFile}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 mt-2 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {uploadingAsset ? 'Processing Background...' : 'Upload & Process Asset'}
              </Button>
            </form>
          </div>

          {/* Asset Library Grid */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center justify-between">
              <span>Tournament Asset Library ({assets.length})</span>
              <span className="text-xs text-slate-500">Side-by-side comparison on transparent canvas</span>
            </h3>

            {assets.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 bg-white rounded-2xl text-center text-slate-500 text-xs">
                No branding assets uploaded yet. Upload your tournament logos above to generate transparent versions.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assets.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      {/* Side by side comparison */}
                      <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-semibold text-slate-500">
                        <div>
                          <span className="block mb-1">Original Upload</span>
                          <div className="h-28 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center overflow-hidden">
                            <img
                              src={a.original_url}
                              alt={a.name}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        </div>

                        <div>
                          <span className="block mb-1 text-purple-700 font-bold flex items-center justify-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            {a.is_transparent ? 'Transparent PNG' : 'Processed'}
                          </span>
                          {/* Transparent checkerboard background */}
                          <div className="h-28 rounded-xl border border-purple-200 p-2 flex items-center justify-center overflow-hidden bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[size:14px_14px] bg-white">
                            <img
                              src={a.processed_url}
                              alt={a.name}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Title & Badge */}
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-zinc-900 truncate">{a.name}</h4>
                          <span className="text-[10px] text-slate-500">{a.asset_type}</span>
                        </div>
                        {a.is_transparent && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 font-bold">
                            Transparent
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="border-t border-slate-100 pt-2 flex flex-wrap items-center justify-between gap-1 text-xs">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromoteToSponsor(a.id)}
                        disabled={promotingId === a.id}
                        className="h-7 text-[11px] border-amber-300 text-amber-700 hover:bg-amber-50 px-2 font-bold"
                        title="Add this transparent logo to the sponsor carousel"
                      >
                        <Award className="w-3 h-3 mr-1 text-amber-500" />
                        {promotingId === a.id ? 'Adding...' : 'Add to Sponsors'}
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyAssetUrl(a.id, a.processed_url)}
                          className="h-7 px-2 text-[11px] text-slate-500 hover:text-zinc-900"
                          title="Copy image URL"
                        >
                          {copiedAssetId === a.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(a.processed_url, '_blank')}
                          className="h-7 px-2 text-[11px] text-slate-500 hover:text-zinc-900"
                          title="Open full size"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAsset(a.id)}
                          className="h-7 px-2 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
