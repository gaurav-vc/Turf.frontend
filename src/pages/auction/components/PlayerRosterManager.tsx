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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or player #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-9 bg-slate-50 border-slate-200 text-xs text-zinc-900"
            />
          </div>

          {/* Status Filter */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs">
            {(['ALL', 'AVAILABLE', 'SOLD', 'UNSOLD'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1 font-bold transition-all ${
                  statusFilter === st ? 'bg-white text-zinc-900 shadow-xs' : 'text-slate-600 hover:text-zinc-900'
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
              className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-zinc-800 focus:outline-none"
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
            className="bg-emerald-600 font-bold text-white hover:bg-emerald-500 shadow-sm"
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
            className="bg-blue-600 font-bold text-white hover:bg-blue-500 shadow-sm"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            {uploading ? 'Importing...' : 'Bulk Excel / CSV'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRegModal(true)}
            className="border-purple-300 text-purple-700 hover:bg-purple-50 font-bold"
          >
            <Link2 className="h-4 w-4 mr-1.5 text-purple-600" />
            Registration Link & QR
          </Button>
        </div>
      </div>

      {/* Upload Feedback Banner */}
      {uploadResult && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 shadow-sm">
          <p className="font-bold">
            Successfully imported {uploadResult.imported} players into tournament master!
          </p>
          {uploadResult.errors.length > 0 && (
            <div className="mt-2 text-red-600">
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
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-100 text-zinc-800">
              {filteredPlayers.map((p) => {
                const name = p.player_name || p.name || 'Unnamed'
                const serial = p.serial_no || '—'
                const isSold = p.status === 'SOLD'
                const isBidding = p.status === 'BIDDING'

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-black text-amber-600">#{serial}</td>
                    <td className="p-3.5 font-bold text-zinc-900 flex items-center gap-2">
                      {name}
                      {isSold && (
                        <span className="text-[10px] text-emerald-600 font-mono font-bold">
                          (₹{parseFloat(p.sold_price || 0).toLocaleString()})
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800 font-bold">
                        {p.category || 'General'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{p.role || p.player_skills || 'All-Rounder'}</td>
                    <td className="p-3.5 font-mono font-semibold text-zinc-900">
                      ₹{parseFloat(p.base_price || 1000).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isSold
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isBidding
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                            : p.status === 'UNSOLD'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
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
                        className="h-7 text-xs text-slate-600 hover:text-zinc-900 hover:bg-slate-100 font-semibold"
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      {onPlayerSelected && p.serial_no && p.status !== 'SOLD' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onPlayerSelected(p.serial_no)}
                          className="h-7 text-xs text-amber-600 hover:bg-amber-50 font-bold"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70 shrink-0">
              <div>
                <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-purple-600" />
                  Public Player Registration Setup & Link
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure the public registration form. Submissions are saved directly into the tournament Player Master.
                </p>
              </div>
              <button
                onClick={() => setShowRegModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-zinc-900 hover:bg-slate-200/60 transition"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-zinc-900">
              {/* Link & QR Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-center">
                <div className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs w-fit mx-auto">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(registrationUrl)}`}
                    alt="Registration QR"
                    className="w-28 h-28 object-contain"
                  />
                  <span className="text-[9px] text-slate-600 font-bold mt-1.5 uppercase tracking-wider">Scan to Register</span>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-zinc-900 block">
                    Public Shareable URL (No login required)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={registrationUrl}
                      className="bg-white border border-slate-300 text-xs text-zinc-900 font-mono w-full px-3 py-2 rounded-xl truncate focus:outline-none shadow-xs"
                    />
                    <Button
                      size="sm"
                      onClick={copyRegUrl}
                      className="bg-purple-600 text-white text-xs shrink-0 hover:bg-purple-500 font-bold px-3 py-2 rounded-xl"
                    >
                      {copiedLink ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <a
                      href={registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
                    >
                      Open Live Form ↗
                    </a>
                    <button
                      type="button"
                      onClick={handleRegenerateRegLink}
                      disabled={regeneratingReg}
                      className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition"
                    >
                      {regeneratingReg ? 'Regenerating...' : 'Regenerate Link'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Registration Form Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Form Presentation</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Registration Form Title</label>
                    <Input
                      value={regTitle}
                      onChange={(e) => setRegTitle(e.target.value)}
                      className="bg-white border-slate-200 text-xs text-zinc-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Introduction Text</label>
                    <Input
                      value={regIntro}
                      onChange={(e) => setRegIntro(e.target.value)}
                      className="bg-white border-slate-200 text-xs text-zinc-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Success Message</label>
                    <Input
                      value={regSuccessMsg}
                      onChange={(e) => setRegSuccessMsg(e.target.value)}
                      className="bg-white border-slate-200 text-xs text-zinc-900 font-medium"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap items-center gap-6 pt-2 text-xs">
                  <label className="flex items-center gap-2 text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regEnabled}
                      onChange={(e) => setRegEnabled(e.target.checked)}
                      className="rounded border-slate-300 text-purple-600 h-4 w-4"
                    />
                    <span className="font-bold">Enable Registration Link</span>
                  </label>

                  <label className="flex items-center gap-2 text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regShowLogo}
                      onChange={(e) => setRegShowLogo(e.target.checked)}
                      className="rounded border-slate-300 text-purple-600 h-4 w-4"
                    />
                    <span className="font-semibold">Show Tournament Logo</span>
                  </label>

                  <label className="flex items-center gap-2 text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regShowName}
                      onChange={(e) => setRegShowName(e.target.checked)}
                      className="rounded border-slate-300 text-purple-600 h-4 w-4"
                    />
                    <span className="font-semibold">Show Tournament Name</span>
                  </label>
                </div>
              </div>

              {/* Registration Fields Selection */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Exposed Player Fields
                </h4>
                <p className="text-[11px] text-slate-500">
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
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        regFields.includes(f.key)
                          ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 font-medium hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={regFields.includes(f.key)}
                        disabled={f.mandatory}
                        onChange={() => toggleField(f.key)}
                        className="rounded border-slate-300 text-purple-600 h-4 w-4"
                      />
                      <span className="truncate">{f.label}</span>
                      {f.mandatory && (
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md ml-auto font-bold">
                          Req
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50 shrink-0">
              <Button
                variant="ghost"
                onClick={() => setShowRegModal(false)}
                className="text-xs text-slate-600 hover:text-zinc-900 font-semibold"
              >
                Close
              </Button>

              <Button
                disabled={savingReg}
                onClick={handleSaveRegSettings}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-xs"
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
