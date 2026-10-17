import { useState, useEffect, useRef } from 'react'
import { Upload, Link2, QrCode, Search, UserPlus, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/api/apiClient'
import PlayerEntryFormModal from './PlayerEntryFormModal'

interface PlayerRosterManagerProps {
  auctionId: string
  onPlayerSelected?: (serialNo: number) => void
}

export default function PlayerRosterManager({ auctionId, onPlayerSelected }: PlayerRosterManagerProps) {
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'SOLD' | 'UNSOLD'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [categories, setCategories] = useState<string[]>([])

  // Bulk Upload State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ imported: number; errors: string[] } | null>(null)

  // Player Entry Form Modal State
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null)

  // Registration Link State
  const [regLink, setRegLink] = useState<any>(null)
  const [showRegModal, setShowRegModal] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [regTitle, setRegTitle] = useState('Player Registration')
  const [regIntro, setRegIntro] = useState('Register to participate in this tournament auction.')
  const [regSuccessMsg, setRegSuccessMsg] = useState('Thank you. Your player registration has been submitted successfully.')
  const [regEnabled, setRegEnabled] = useState(true)
  const [regShowLogo, setRegShowLogo] = useState(true)
  const [regShowName, setRegShowName] = useState(true)
  const [regFields, setRegFields] = useState<string[]>(['name', 'mobile', 'role', 'category', 'batting_style', 'bowling_style', 'photo'])
  const [savingReg, setSavingReg] = useState(false)
  const [regeneratingReg, setRegeneratingReg] = useState(false)

  useEffect(() => {
    loadPlayers()
    loadRegistrationLink()
  }, [auctionId])

  useEffect(() => {
    if (regLink) {
      if (regLink.title) setRegTitle(regLink.title)
      if (regLink.intro_text) setRegIntro(regLink.intro_text)
      if (regLink.success_message) setRegSuccessMsg(regLink.success_message)
      setRegEnabled(regLink.enabled !== false)
      setRegShowLogo(regLink.show_tournament_logo !== false)
      setRegShowName(regLink.show_tournament_name !== false)
      if (Array.isArray(regLink.fields_json) && regLink.fields_json.length > 0) {
        setRegFields(regLink.fields_json)
      }
    }
  }, [regLink])

  const loadPlayers = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/v1/auction/players/?auction=${auctionId}`)
      const data = res.data.results || res.data || []
      setPlayers(data)

      // Collect unique categories
      const cats = Array.from(new Set(data.map((p: any) => p.category || 'General'))) as string[]
      setCategories(cats)
    } catch (err) {
      console.error('Failed to load players', err)
    } finally {
      setLoading(false)
    }
  }

  const loadRegistrationLink = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/registration_link/`)
      setRegLink(res.data)
    } catch (err) {
      console.error('Failed to load registration link', err)
    }
  }

  const handleSaveRegSettings = async () => {
    setSavingReg(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/registration_link/`, {
        title: regTitle,
        intro_text: regIntro,
        success_message: regSuccessMsg,
        enabled: regEnabled,
        show_tournament_logo: regShowLogo,
        show_tournament_name: regShowName,
        fields_json: regFields,
      })
      setRegLink(res.data)
      alert('Registration settings saved successfully!')
    } catch (err) {
      console.error('Failed to save registration settings', err)
    } finally {
      setSavingReg(false)
    }
  }

  const handleRegenerateRegLink = async () => {
    if (!confirm('Regenerate registration link? The previous link will stop working.')) return
    setRegeneratingReg(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/registration_link/`, {
        regenerate: true,
      })
      setRegLink(res.data)
    } catch (err) {
      console.error('Failed to regenerate link', err)
    } finally {
      setRegeneratingReg(false)
    }
  }

  const toggleField = (key: string) => {
    if (['name', 'mobile', 'role', 'category'].includes(key)) return // Mandatory
    setRegFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadResult(null)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/bulk_import_players/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadResult({
        imported: res.data.imported_count || 0,
        errors: res.data.errors || [],
      })
      loadPlayers()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Import failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filteredPlayers = players.filter((p) => {
    const pName = (p.player_name || p.name || '').toLowerCase()
    const pNo = String(p.serial_no || '')
    const matchesSearch = pName.includes(search.toLowerCase()) || pNo.includes(search)
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchesCat = categoryFilter === 'ALL' || (p.category || 'General') === categoryFilter
    return matchesSearch && matchesStatus && matchesCat
  })

  const registrationUrl = regLink
    ? `${window.location.origin}/auction/register/${regLink.registration_token}`
    : ''

  const copyRegUrl = () => {
    if (!registrationUrl) return
    navigator.clipboard.writeText(registrationUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or player #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-9 bg-white/5 text-xs text-white"
            />
          </div>

          {/* Status Filter */}
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
            {(['ALL', 'AVAILABLE', 'SOLD', 'UNSOLD'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded px-3 py-1 font-semibold transition-all ${
                  statusFilter === st ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 p-2 text-xs text-white"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setEditingPlayer(null)
              setShowPlayerModal(true)
            }}
            className="bg-emerald-600 font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            + Add Player
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-blue-600 font-bold text-white hover:bg-blue-500"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {uploading ? 'Importing...' : 'Bulk Excel / CSV'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRegModal(true)}
            className="border-purple-500/40 text-purple-300 hover:bg-purple-500/20"
          >
            <Link2 className="h-4 w-4 mr-1.5" />
            Registration Link & QR
          </Button>
        </div>
      </div>

      {/* Upload Feedback Banner */}
      {uploadResult && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-950/40 p-4 text-xs text-blue-200">
          <p className="font-bold">
            Successfully imported {uploadResult.imported} players into tournament master!
          </p>
          {uploadResult.errors.length > 0 && (
            <div className="mt-2 text-red-300">
              <span className="font-semibold">Skipped rows with errors:</span>
              <ul className="list-disc pl-4 mt-1">
                {uploadResult.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Roster Table */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/5 text-slate-400 font-semibold uppercase">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">Player Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Base Price</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredPlayers.map((p) => {
                const name = p.player_name || p.name || 'Unnamed'
                const serial = p.serial_no || '—'
                const isSold = p.status === 'SOLD'
                const isBidding = p.status === 'BIDDING'

                return (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-amber-400">#{serial}</td>
                    <td className="p-3.5 font-bold text-white flex items-center gap-2">
                      {name}
                      {isSold && (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          (₹{parseFloat(p.sold_price || 0).toLocaleString()})
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                        {p.category || 'General'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">{p.role || p.player_skills || 'All-Rounder'}</td>
                    <td className="p-3.5 font-mono text-slate-300">
                      ₹{parseFloat(p.base_price || 1000).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isSold
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isBidding
                            ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                            : p.status === 'UNSOLD'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingPlayer(p)
                          setShowPlayerModal(true)
                        }}
                        className="h-7 text-xs text-slate-400 hover:text-white hover:bg-white/10"
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      {onPlayerSelected && p.serial_no && p.status !== 'SOLD' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onPlayerSelected(p.serial_no)}
                          className="h-7 text-xs text-amber-400 hover:bg-amber-500/20"
                        >
                          Send to Block →
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredPlayers.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No players found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Public Registration Link Setup Modal */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-purple-400" />
                  Public Player Registration Setup & Link
                </h3>
                <p className="text-[11px] text-slate-400">
                  Configure the public registration form. Submissions are saved directly into the tournament Player Master.
                </p>
              </div>
              <button
                onClick={() => setShowRegModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Link & QR Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 items-center">
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg w-fit mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(registrationUrl)}`}
                  alt="Registration QR"
                  className="w-28 h-28 object-contain"
                />
                <span className="text-[9px] text-slate-700 font-semibold mt-1">Scan to Register</span>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Public Shareable URL (No login required)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={registrationUrl}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono w-full px-2.5 py-1.5 rounded-lg truncate focus:outline-none"
                  />
                  <Button
                    size="sm"
                    onClick={copyRegUrl}
                    className="bg-purple-600 text-white text-xs shrink-0 hover:bg-purple-500 font-semibold"
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <a
                    href={registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:underline flex items-center gap-1"
                  >
                    Open Live Form ↗
                  </a>
                  <button
                    type="button"
                    onClick={handleRegenerateRegLink}
                    disabled={regeneratingReg}
                    className="text-xs text-slate-400 hover:text-rose-400 transition"
                  >
                    {regeneratingReg ? 'Regenerating...' : 'Regenerate Link'}
                  </button>
                </div>
              </div>
            </div>

            {/* Registration Form Settings */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Form Presentation</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[11px] text-slate-400 block mb-1">Registration Form Title</label>
                  <Input
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Introduction Text</label>
                  <Input
                    value={regIntro}
                    onChange={(e) => setRegIntro(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Success Message</label>
                  <Input
                    value={regSuccessMsg}
                    onChange={(e) => setRegSuccessMsg(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regEnabled}
                    onChange={(e) => setRegEnabled(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-purple-500 h-4 w-4"
                  />
                  <span className="font-semibold">Enable Registration Link</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regShowLogo}
                    onChange={(e) => setRegShowLogo(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-purple-500 h-4 w-4"
                  />
                  <span>Show Tournament Logo</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regShowName}
                    onChange={(e) => setRegShowName(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-purple-500 h-4 w-4"
                  />
                  <span>Show Tournament Name</span>
                </label>
              </div>
            </div>

            {/* Registration Fields Selection */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Exposed Player Fields
              </h4>
              <p className="text-[11px] text-slate-400">
                Name, Mobile, Role and Category are always mandatory. Base Price and Player No. are controlled by the organizer.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { key: 'name', label: 'Full Name', mandatory: true },
                  { key: 'mobile', label: 'Mobile Number', mandatory: true },
                  { key: 'role', label: 'Specialist Role', mandatory: true },
                  { key: 'category', label: 'Category', mandatory: true },
                  { key: 'batting_style', label: 'Batting Style' },
                  { key: 'bowling_style', label: 'Bowling Style' },
                  { key: 'location', label: 'City / Location' },
                  { key: 'age', label: 'Player Age' },
                  { key: 'photo', label: 'Photo Upload' },
                ].map((f) => (
                  <label
                    key={f.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      regFields.includes(f.key)
                        ? 'bg-purple-950/40 border-purple-600/40 text-purple-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={regFields.includes(f.key)}
                      disabled={f.mandatory}
                      onChange={() => toggleField(f.key)}
                      className="rounded border-slate-700 bg-slate-900 text-purple-500 h-3.5 w-3.5"
                    />
                    <span className="font-semibold truncate">{f.label}</span>
                    {f.mandatory && (
                      <span className="text-[9px] bg-purple-900/60 text-purple-300 px-1 rounded ml-auto">
                        Req
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <Button
                variant="ghost"
                onClick={() => setShowRegModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </Button>

              <Button
                disabled={savingReg}
                onClick={handleSaveRegSettings}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4"
              >
                {savingReg ? 'Saving Settings...' : 'Save Registration Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Player Entry & Edit Master Form Modal */}
      <PlayerEntryFormModal
        auctionId={auctionId}
        isOpen={showPlayerModal}
        onClose={() => setShowPlayerModal(false)}
        onSuccess={() => loadPlayers()}
        playerToEdit={editingPlayer}
      />
    </div>
  )
}
