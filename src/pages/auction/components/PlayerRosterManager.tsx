import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Upload,
  Link2,
  QrCode,
  Search,
  UserPlus,
  Edit2,
  Download,
  FileSpreadsheet,
  Filter,
  Gavel,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Flame,
  CheckCircle,
  HelpCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient, resolveMediaUrl } from '@/api/apiClient'
import PlayerEntryFormModal from './PlayerEntryFormModal'

interface PlayerRosterManagerProps {
  auctionId: string
  onPlayerSelected?: (serialNo: number) => void
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
  'Spin Bowler (Leg-Spin)',
]

const BATTING_STYLES = ['Right Hand Bat', 'Left Hand Bat']
const BOWLING_STYLES = [
  'Right Arm Fast',
  'Right Arm Medium',
  'Right Arm Spin',
  'Left Arm Fast',
  'Left Arm Medium',
  'Left Arm Spin',
]
const TAGGING_OPTIONS = ['Player', 'Captain', 'Icon', 'Marquee', 'Overseas']

export default function PlayerRosterManager({ auctionId, onPlayerSelected }: PlayerRosterManagerProps) {
  const [players, setPlayers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Filters State
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [auctionStatusFilter, setAuctionStatusFilter] = useState<string>('ALL')
  const [teamFilter, setTeamFilter] = useState<string>('ALL')
  const [battingFilter, setBattingFilter] = useState<string>('ALL')
  const [bowlingFilter, setBowlingFilter] = useState<string>('ALL')
  const [taggingFilter, setTaggingFilter] = useState<string>('ALL')
  const [showFilterBar, setShowFilterBar] = useState(true)
  const [showPhotos, setShowPhotos] = useState<boolean>(true)

  // Real-time Roster Metrics (Sold, Unsold, Pending, In Auction, Total Spend)
  const metrics = useMemo(() => {
    let sold = 0
    let unsold = 0
    let pending = 0
    let bidding = 0
    let totalSpend = 0

    players.forEach((p) => {
      const st = String(p.status || '').toUpperCase()
      if (st === 'SOLD') {
        sold++
        totalSpend += parseFloat(p.sold_price || 0) || 0
      } else if (st === 'UNSOLD') {
        unsold++
      } else if (st === 'BIDDING') {
        bidding++
      } else {
        pending++
      }
    })

    return {
      total: players.length,
      sold,
      unsold,
      pending,
      bidding,
      totalSpend,
    }
  }, [players])

  // Bulk Upload State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ imported: number; errors: string[] } | null>(null)

  // Player Entry Form Modal State (No auction outcome fields inside)
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null)

  // Host / Organizer "Update Auction Outcome" Modal State
  const [outcomePlayer, setOutcomePlayer] = useState<any | null>(null)
  const [outcomeStatus, setOutcomeStatus] = useState<'PENDING' | 'AVAILABLE' | 'SOLD' | 'UNSOLD' | 'BIDDING'>('PENDING')
  const [outcomeTeamId, setOutcomeTeamId] = useState<string>('')
  const [outcomeBidAmount, setOutcomeBidAmount] = useState<number>(1000)
  const [savingOutcome, setSavingOutcome] = useState(false)
  const [outcomeError, setOutcomeError] = useState('')

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
  const [regFields, setRegFields] = useState<string[]>([
    'name',
    'mobile',
    'role',
    'category',
    'batting_style',
    'bowling_style',
    'photo',
  ])
  const [savingReg, setSavingReg] = useState(false)

  useEffect(() => {
    loadPlayers()
    loadTeams()
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
      const [playerRes, catRes] = await Promise.all([
        apiClient.get(`/v1/auction/players/?auction=${auctionId}`),
        apiClient.get(`/v1/auction/categories/?auction=${auctionId}`),
      ])
      const data = playerRes.data.results || playerRes.data || []
      setPlayers(data)

      let dbCats: string[] = []
      const rawCats = catRes.data.results || catRes.data || []
      if (Array.isArray(rawCats) && rawCats.length > 0) {
        dbCats = rawCats.map((c: any) => c.name).filter(Boolean)
      } else {
        try {
          const rulesRes = await apiClient.get(`/v1/auction/console/${auctionId}/setup_rules/`)
          if (rulesRes.data.categories && Array.isArray(rulesRes.data.categories)) {
            dbCats = rulesRes.data.categories.map((c: any) => c.name).filter(Boolean)
          }
        } catch (_) {}
      }

      const playerCats = data.map((p: any) => p.category).filter(Boolean) as string[]
      const combined = Array.from(new Set([...dbCats, ...playerCats]))
      setCategories(combined)
    } catch (err) {
      console.error('Failed to load players', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/teams/`)
      const list = Array.isArray(res.data) ? res.data : res.data?.results || []
      setTeams(list)
    } catch (err) {
      console.error('Failed to load teams', err)
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

  const handleDownloadTemplate = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/players_template/`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'players_import_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download template', err)
      window.open(`/api/v1/auction/console/${auctionId}/players_template/`, '_blank')
    }
  }

  const handleExportCSV = () => {
    const dataToExport = filteredPlayers.length > 0 ? filteredPlayers : players
    if (dataToExport.length === 0) {
      alert('No players available to export.')
      return
    }

    const headers = [
      'Player No',
      'Player Name',
      'Category',
      'Role',
      'Base Price (₹)',
      'Auction Status',
      'Team Name',
      'Bid Amount (₹)',
      'Mobile',
      'Location',
      'Age',
      'Batting Style',
      'Bowling Style',
      'Tagging',
    ]

    const escapeCsv = (val: any) => {
      const s = String(val ?? '').replace(/"/g, '""')
      return `"${s}"`
    }

    const rows = dataToExport.map((p) => {
      const teamObj = teams.find((t: any) => t.id === p.sold_to || t.team_id === p.sold_to)
      const teamName = p.sold_to_name || teamObj?.name || (p.status === 'SOLD' ? 'Assigned' : '—')
      const bidAmt = p.status === 'SOLD' && p.sold_price ? p.sold_price : '—'

      return [
        p.serial_no || '',
        p.player_name || p.name || '',
        p.category || 'General',
        p.role || p.player_skills || 'All-Rounder',
        p.base_price || 0,
        p.status || 'AVAILABLE',
        teamName,
        bidAmt,
        p.mobile || '',
        p.location || '',
        p.age || '',
        p.batting_style || '',
        p.bowling_style || '',
        p.custom_data?.tagging || p.tagging || 'Player',
      ]
        .map(escapeCsv)
        .join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `players_roster_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
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
      await loadPlayers()
    } catch (err: any) {
      console.error('Import failed', err)
      alert(err.response?.data?.error || 'Failed to import player file.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const clearAllFilters = () => {
    setSearch('')
    setCategoryFilter('ALL')
    setRoleFilter('ALL')
    setAuctionStatusFilter('ALL')
    setTeamFilter('ALL')
    setBattingFilter('ALL')
    setBowlingFilter('ALL')
    setTaggingFilter('ALL')
  }

  const activeFiltersCount = [
    categoryFilter !== 'ALL',
    roleFilter !== 'ALL',
    auctionStatusFilter !== 'ALL',
    teamFilter !== 'ALL',
    battingFilter !== 'ALL',
    bowlingFilter !== 'ALL',
    taggingFilter !== 'ALL',
    search.trim() !== '',
  ].filter(Boolean).length

  // Multi-Dimension Filtering
  const filteredPlayers = players.filter((p) => {
    const pName = (p.player_name || p.name || '').toLowerCase()
    const pNo = String(p.serial_no || '')
    const pMobile = String(p.mobile || '').toLowerCase()
    const pLoc = String(p.location || '').toLowerCase()

    const matchesSearch =
      !search ||
      pName.includes(search.toLowerCase()) ||
      pNo.includes(search) ||
      pMobile.includes(search.toLowerCase()) ||
      pLoc.includes(search.toLowerCase())

    const matchesCat = categoryFilter === 'ALL' || (p.category || '').toLowerCase() === categoryFilter.toLowerCase()
    const matchesRole = roleFilter === 'ALL' || (p.role || p.player_skills || '').toLowerCase() === roleFilter.toLowerCase()

    const matchesAuctionStatus =
      auctionStatusFilter === 'ALL' ||
      (auctionStatusFilter === 'PENDING' && (p.status === 'AVAILABLE' || p.status === 'PENDING' || !p.status)) ||
      p.status === auctionStatusFilter

    const matchesTeam =
      teamFilter === 'ALL' ||
      (teamFilter === 'UNASSIGNED' && !p.sold_to) ||
      p.sold_to === teamFilter ||
      (p.sold_to_name || '').toLowerCase() === teamFilter.toLowerCase()

    const matchesBatting = battingFilter === 'ALL' || (p.batting_style || '').toLowerCase() === battingFilter.toLowerCase()
    const matchesBowling = bowlingFilter === 'ALL' || (p.bowling_style || '').toLowerCase() === bowlingFilter.toLowerCase()
    const matchesTagging =
      taggingFilter === 'ALL' ||
      (p.custom_data?.tagging || p.tagging || 'Player').toLowerCase() === taggingFilter.toLowerCase()

    return (
      matchesSearch &&
      matchesCat &&
      matchesRole &&
      matchesAuctionStatus &&
      matchesTeam &&
      matchesBatting &&
      matchesBowling &&
      matchesTagging
    )
  })

  // Inline Status Change Handler (PENDING, SOLD, UNSOLD)
  const handleInlineStatusChange = async (player: any, newStatus: string) => {
    if (newStatus === 'SOLD') {
      openOutcomeModal(player)
      return
    }

    const apiStatus = newStatus === 'PENDING' ? 'AVAILABLE' : newStatus

    // Optimistic UI update
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === player.id
          ? {
              ...p,
              status: apiStatus,
              sold_to: null,
              sold_to_name: null,
              sold_price: null,
            }
          : p
      )
    )

    try {
      await apiClient.post(`/v1/auction/console/${auctionId}/update_player_outcome/`, {
        player_id: player.id,
        status: apiStatus,
        sold_to: null,
        sold_price: null,
      })
      await Promise.all([loadPlayers(), loadTeams()])
    } catch (err: any) {
      console.error('Failed to update player status', err)
      alert(err.response?.data?.error || 'Failed to update status.')
      await loadPlayers()
    }
  }

  // Open Host / Organizer Auction Outcome Modal
  const openOutcomeModal = (p: any) => {
    setOutcomePlayer(p)
    const cur = p.status || 'AVAILABLE'
    setOutcomeStatus(cur === 'AVAILABLE' ? 'PENDING' : cur)
    setOutcomeTeamId(p.sold_to || (teams[0]?.id || ''))
    setOutcomeBidAmount(
      p.sold_price ? parseFloat(p.sold_price) : p.base_price ? parseFloat(p.base_price) : 1000
    )
    setOutcomeError('')
  }

  // Save Outcome Handler
  const handleSaveOutcome = async () => {
    if (!outcomePlayer) return
    setSavingOutcome(true)
    setOutcomeError('')

    const apiStatus = outcomeStatus === 'PENDING' ? 'AVAILABLE' : outcomeStatus

    try {
      await apiClient.post(`/v1/auction/console/${auctionId}/update_player_outcome/`, {
        player_id: outcomePlayer.id,
        status: apiStatus,
        sold_to: apiStatus === 'SOLD' ? outcomeTeamId : null,
        sold_price: apiStatus === 'SOLD' ? outcomeBidAmount : null,
      })

      await Promise.all([loadPlayers(), loadTeams()])
      setOutcomePlayer(null)
    } catch (err: any) {
      console.error('Failed to update player outcome', err)
      setOutcomeError(err.response?.data?.error || 'Failed to update player outcome.')
    } finally {
      setSavingOutcome(false)
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
    <div className="space-y-4">
      {/* ================= TOP COMMAND TOOLBAR ================= */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4">
        {/* Tier 1: Roster Identity & Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              Player Master Roster
              <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {players.length} Total
              </span>
            </h2>
          </div>

          {/* Action Buttons Group */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="rounded-xl text-xs font-bold border-border text-foreground hover:bg-muted h-9 flex items-center gap-1.5"
              title="Download clean CSV template for player bulk import"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              Download Template
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl text-xs font-bold border-border text-foreground hover:bg-muted h-9 flex items-center gap-1.5"
              title="Export current roster to CSV spreadsheet"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
              Export CSV
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
              className="rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-9 shadow-xs flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? 'Importing...' : 'Bulk Excel / CSV'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRegModal(true)}
              className="rounded-xl text-xs font-bold border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 h-9 flex items-center gap-1.5"
            >
              <Link2 className="h-3.5 w-3.5 text-purple-600" />
              Registration Link & QR
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setEditingPlayer(null)
                setShowPlayerModal(true)
              }}
              className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-9 shadow-xs flex items-center gap-1.5"
            >
              <UserPlus className="h-3.5 w-3.5" />
              + Add Player
            </Button>
          </div>
        </div>

        {/* Real-time Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 border-b border-border/50 pb-3">
          {/* Total Pool */}
          <div
            onClick={() => setAuctionStatusFilter('ALL')}
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer ${
              auctionStatusFilter === 'ALL'
                ? 'bg-blue-50/80 border-blue-400 dark:bg-blue-950/40 shadow-xs ring-2 ring-blue-400/20'
                : 'bg-muted/30 border-border hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300">Total Pool</span>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <div className="text-lg sm:text-xl font-black text-foreground mt-1 font-mono">{metrics.total}</div>
            <span className="text-[10px] text-muted-foreground font-semibold">Registered Players</span>
          </div>

          {/* Sold */}
          <div
            onClick={() => setAuctionStatusFilter('SOLD')}
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer ${
              auctionStatusFilter === 'SOLD'
                ? 'bg-emerald-50/80 border-emerald-500 dark:bg-emerald-950/40 shadow-xs ring-2 ring-emerald-500/20'
                : 'bg-muted/30 border-border hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">Sold</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">{metrics.sold}</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate block">
              ₹{metrics.totalSpend.toLocaleString('en-IN')} Spent
            </span>
          </div>

          {/* Unsold */}
          <div
            onClick={() => setAuctionStatusFilter('UNSOLD')}
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer ${
              auctionStatusFilter === 'UNSOLD'
                ? 'bg-rose-50/80 border-rose-400 dark:bg-rose-950/40 shadow-xs ring-2 ring-rose-400/20'
                : 'bg-muted/30 border-border hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400">Unsold</span>
              <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-400 mt-1 font-mono">{metrics.unsold}</div>
            <span className="text-[10px] text-muted-foreground font-semibold">Passed In Auction</span>
          </div>

          {/* Pending */}
          <div
            onClick={() => setAuctionStatusFilter('PENDING')}
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer ${
              auctionStatusFilter === 'PENDING'
                ? 'bg-amber-50/80 border-amber-400 dark:bg-amber-950/40 shadow-xs ring-2 ring-amber-400/20'
                : 'bg-muted/30 border-border hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">Pending</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-700 dark:text-amber-400 mt-1 font-mono">{metrics.pending}</div>
            <span className="text-[10px] text-muted-foreground font-semibold">Waiting In Pool</span>
          </div>

          {/* In Auction */}
          <div
            onClick={() => setAuctionStatusFilter('BIDDING')}
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              auctionStatusFilter === 'BIDDING'
                ? 'bg-purple-50/80 border-purple-400 dark:bg-purple-950/40 shadow-xs ring-2 ring-purple-400/20'
                : 'bg-muted/30 border-border hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-400">On Block</span>
              <Flame className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-purple-700 dark:text-purple-400 mt-1 font-mono">{metrics.bidding}</div>
            <span className="text-[10px] text-muted-foreground font-semibold">Active Bidding</span>
          </div>
        </div>

        {/* Tier 2: Search Bar & Quick Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, player #, mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 text-xs font-semibold rounded-xl bg-background border-border text-foreground h-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Category Filter Dropdown */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer h-9 shadow-xs"
              >
                <option value="ALL">🏷️ All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Quick Auction Status Filter Dropdown */}
            <div className="relative">
              <select
                value={auctionStatusFilter}
                onChange={(e) => setAuctionStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer h-9 shadow-xs"
              >
                <option value="ALL">⚡ All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="SOLD">SOLD</option>
                <option value="UNSOLD">UNSOLD</option>
                <option value="BIDDING">IN AUCTION</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Photo Visibility Toggle (Hide / Unhide Photo) */}
            <Button
              variant={showPhotos ? 'outline' : 'secondary'}
              size="sm"
              onClick={() => setShowPhotos(!showPhotos)}
              className="rounded-xl text-xs font-bold border-border h-9 flex items-center gap-1.5"
              title={showPhotos ? 'Hide real-time player photos' : 'Unhide and display real-time player photos'}
            >
              {showPhotos ? <EyeOff className="w-3.5 h-3.5 text-indigo-500" /> : <Eye className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{showPhotos ? 'Hide Photo' : 'Unhide Photo'}</span>
            </Button>
          </div>

          {/* Right: Filter Toggle & Reset */}
          <div className="flex items-center gap-2">
            <Button
              variant={showFilterBar ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowFilterBar(!showFilterBar)}
              className="rounded-xl text-xs font-bold border-border h-9 flex items-center gap-1.5"
            >
              <Filter className="h-3.5 w-3.5 text-indigo-500" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-600 text-white font-mono">
                  {activeFiltersCount}
                </span>
              )}
              {showFilterBar ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
            </Button>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 rounded-xl"
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* ================= ADVANCED FILTER BAR ================= */}
        {showFilterBar && (
          <div className="pt-3 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Filter className="h-3 w-3 text-indigo-500" />
                Filter Options & Dimensions
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Showing <strong className="text-foreground">{filteredPlayers.length}</strong> of{' '}
                  <strong className="text-foreground">{players.length}</strong> players
                </span>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-7 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 rounded-lg"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {/* 1. Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Role */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Player Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="ALL">All Roles</option>
                  {DEFAULT_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Auction Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Auction Status
                </label>
                <select
                  value={auctionStatusFilter}
                  onChange={(e) => setAuctionStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">PENDING (In Pool)</option>
                  <option value="SOLD">SOLD</option>
                  <option value="UNSOLD">UNSOLD</option>
                  <option value="BIDDING">IN AUCTION (Bidding)</option>
                </select>
              </div>

              {/* 4. Franchise Team */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Team Name
                </label>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="ALL">All Teams</option>
                  <option value="UNASSIGNED">Unassigned (None)</option>
                  {teams.map((t: any) => (
                    <option key={t.id || t.team_id} value={t.id || t.name}>
                      {t.name} ({t.short_name || 'TM'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Batting Style */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Batting Style
                </label>
                <select
                  value={battingFilter}
                  onChange={(e) => setBattingFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="ALL">All Batting</option>
                  {BATTING_STYLES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Bowling Style */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Bowling Style
                </label>
                <select
                  value={bowlingFilter}
                  onChange={(e) => setBowlingFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="ALL">All Bowling</option>
                  {BOWLING_STYLES.map((bw) => (
                    <option key={bw} value={bw}>
                      {bw}
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. Tagging */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Tagging
                </label>
                <select
                  value={taggingFilter}
                  onChange={(e) => setTaggingFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="ALL">All Tagging</option>
                  {TAGGING_OPTIONS.map((tg) => (
                    <option key={tg} value={tg}>
                      {tg}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Feedback Banner */}
      {uploadResult && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-4 text-xs text-blue-900 dark:text-blue-200 shadow-sm flex items-start justify-between">
          <div>
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Successfully imported {uploadResult.imported} players into tournament master!
            </p>
            {uploadResult.errors.length > 0 && (
              <div className="mt-2 text-red-600 dark:text-red-400">
                <span className="font-semibold">Skipped rows with errors:</span>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {uploadResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button
            onClick={() => setUploadResult(null)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================= ROSTER TABLE (Freeze Panes / Sticky Headers) ================= */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="max-h-[72vh] overflow-y-auto overflow-x-auto relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 border-b border-border bg-slate-100 dark:bg-zinc-800 font-black uppercase tracking-wider text-[11px] shadow-xs" style={{ color: '#334155' }}>
              <tr>
                <th className="py-3.5 px-3.5 w-12 text-center whitespace-nowrap sticky top-0 bg-slate-100 dark:bg-zinc-800 z-20" style={{ color: '#d97706' }}>#</th>
                <th className="py-3.5 px-3.5 min-w-[200px] whitespace-nowrap sticky top-0 bg-slate-100 dark:bg-zinc-800 z-20" style={{ color: '#334155' }}>Player Name</th>
                <th className="py-3.5 px-3.5 min-w-[140px] whitespace-nowrap sticky top-0 bg-slate-100 dark:bg-zinc-800 z-20" style={{ color: '#334155' }}>Category</th>
                <th className="py-3.5 px-3.5 min-w-[160px] whitespace-nowrap sticky top-0 bg-slate-100 dark:bg-zinc-800 z-20" style={{ color: '#334155' }}>Role</th>
                <th className="py-3.5 px-3.5 min-w-[110px] whitespace-nowrap sticky top-0 bg-slate-100 dark:bg-zinc-800 z-20" style={{ color: '#334155' }}>Base Price</th>
                <th className="py-3.5 px-3.5 min-w-[140px] whitespace-nowrap sticky top-0 bg-slate-100 dark:bg-zinc-800 z-20" style={{ color: '#334155' }}>Auction Status</th>
                <th className="py-3.5 px-3.5 min-w-[140px] whitespace-nowrap sticky top-0 bg-slate-100 dark:bg-zinc-800 z-20" style={{ color: '#334155' }}>Team Name</th>
                <th className="py-3.5 px-3.5 min-w-[120px] whitespace-nowrap sticky top-0 bg-slate-100 dark:bg-zinc-800 z-20" style={{ color: '#334155' }}>Bid Amount</th>
                <th className="py-3.5 px-3.5 text-right min-w-[240px] whitespace-nowrap sticky top-0 bg-slate-100 dark:bg-zinc-800 z-20" style={{ color: '#334155' }}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {filteredPlayers.map((p) => {
                const name = p.player_name || p.name || 'Unnamed'
                const serial = p.serial_no || '—'
                const isSold = p.status === 'SOLD'
                const isBidding = p.status === 'BIDDING'
                const isUnsold = p.status === 'UNSOLD'

                // Team resolution
                const teamObj = teams.find(
                  (t: any) =>
                    t.id === p.sold_to ||
                    t.team_id === p.sold_to ||
                    t.name?.toLowerCase() === (p.sold_to_name || '').toLowerCase()
                )
                const teamName = p.sold_to_name || teamObj?.name || (isSold ? 'Assigned Team' : null)
                const teamColor = teamObj?.color || '#2563eb'

                return (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    {/* # Player Serial */}
                    <td className="py-3 px-3.5 font-mono font-black text-amber-600 dark:text-amber-400 text-center align-middle whitespace-nowrap">
                      #{serial}
                    </td>

                    {/* Player Name & Photo */}
                    <td className="py-3 px-3.5 align-middle">
                      <div className="flex items-center gap-2">
                        {showPhotos && (p.photo_url || p.photo) ? (
                          <img
                            src={resolveMediaUrl(p.photo_url || p.photo)}
                            alt={name}
                            className="w-8 h-8 rounded-lg object-cover border border-indigo-200 dark:border-indigo-800 shadow-2xs shrink-0"
                            onError={(e) => {
                              const target = e.currentTarget
                              target.style.display = 'none'
                              const fallback = target.nextElementSibling
                              if (fallback) (fallback as HTMLElement).style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div
                          className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold items-center justify-center text-xs shrink-0"
                          style={{ display: showPhotos && (p.photo_url || p.photo) ? 'none' : 'flex' }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ color: '#09090b' }} className="font-black text-xs leading-tight dark:text-foreground">{name}</p>
                          {(p.mobile || p.location) && (
                            <p style={{ color: '#64748b' }} className="text-[10px] font-medium mt-0.5 dark:text-muted-foreground">
                              {[p.mobile, p.location].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                      <span
                        style={{ backgroundColor: '#fef3c7', color: '#78350f', borderColor: '#fde68a' }}
                        className="rounded-full border px-2.5 py-0.5 text-[11px] font-black shadow-2xs inline-block"
                      >
                        {p.category || 'General'}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                      <span style={{ color: '#1e293b' }} className="font-semibold text-xs dark:text-slate-200">
                        {p.role || p.player_skills || 'All-Rounder'}
                      </span>
                    </td>

                    {/* Base Price */}
                    <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                      <span style={{ color: '#09090b' }} className="font-mono font-black text-xs dark:text-foreground">
                        ₹{parseFloat(p.base_price || 1000).toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* AUCTION STATUS Dropdown (Manual Selection: PENDING, SOLD, UNSOLD) */}
                    <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                      <div className="relative inline-flex items-center">
                        <span
                          className={`w-2 h-2 rounded-full absolute left-2.5 pointer-events-none z-10 ${
                            isSold
                              ? 'bg-emerald-600'
                              : isUnsold
                              ? 'bg-rose-600'
                              : isBidding
                              ? 'bg-amber-600'
                              : 'bg-blue-600'
                          }`}
                        />
                        <select
                          value={isSold ? 'SOLD' : isUnsold ? 'UNSOLD' : isBidding ? 'BIDDING' : 'PENDING'}
                          onChange={(e) => handleInlineStatusChange(p, e.target.value)}
                          style={
                            isSold
                              ? { backgroundColor: '#dcfce7', color: '#14532d', borderColor: '#86efac' }
                              : isUnsold
                              ? { backgroundColor: '#fee2e2', color: '#7f1d1d', borderColor: '#fca5a5' }
                              : isBidding
                              ? { backgroundColor: '#fef3c7', color: '#78350f', borderColor: '#fcd34d' }
                              : { backgroundColor: '#eff6ff', color: '#1e3a8a', borderColor: '#bfdbfe' }
                          }
                          className="appearance-none rounded-full border pl-6 pr-7 py-1 text-[11px] font-black tracking-wider uppercase shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
                        >
                          <option value="PENDING" className="bg-white text-blue-900 font-bold py-1">
                            PENDING
                          </option>
                          <option value="SOLD" className="bg-white text-emerald-900 font-bold py-1">
                            SOLD
                          </option>
                          <option value="UNSOLD" className="bg-white text-rose-900 font-bold py-1">
                            UNSOLD
                          </option>
                        </select>
                        <ChevronDown
                          className={`w-3 h-3 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${
                            isSold
                              ? 'text-emerald-800'
                              : isUnsold
                              ? 'text-rose-800'
                              : isBidding
                              ? 'text-amber-800'
                              : 'text-blue-800'
                          }`}
                        />
                      </div>
                    </td>

                    {/* TEAM NAME */}
                    <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                      {teamName ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: teamColor }}
                          />
                          <span style={{ color: '#09090b' }} className="font-bold text-xs truncate max-w-[130px] dark:text-foreground" title={teamName}>
                            {teamName}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }} className="font-mono font-bold text-xs">—</span>
                      )}
                    </td>

                    {/* BID AMOUNT */}
                    <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                      {isSold && p.sold_price ? (
                        <span style={{ color: '#15803d' }} className="font-mono font-black text-xs dark:text-emerald-400">
                          ₹{parseFloat(p.sold_price).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }} className="font-mono font-bold text-xs">—</span>
                      )}
                    </td>

                    {/* ACTION */}
                    <td className="py-3 px-3.5 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {/* Host / Organizer Set Outcome */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openOutcomeModal(p)}
                          className="h-7 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-bold px-2 rounded-lg shrink-0 flex items-center gap-1"
                          title="Host / Organizer: Assign Winning Team, Status & Hammer Price"
                        >
                          <Gavel className="w-3 h-3" /> Outcome
                        </Button>

                        {/* Standard Edit (Player Profile only) */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingPlayer(p)
                            setShowPlayerModal(true)
                          }}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted font-semibold px-2 rounded-lg shrink-0 flex items-center gap-1"
                          title="Edit Player Master Profile"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </Button>

                        {/* Send to Block (Always Visible) */}
                        {onPlayerSelected && p.serial_no && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onPlayerSelected(p.serial_no)}
                            className={`h-7 text-xs font-bold px-2 rounded-lg shrink-0 whitespace-nowrap ${
                              isSold
                                ? 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 bg-emerald-50/50'
                                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            }`}
                            title={isSold ? 'Sold Player - Click to view on auction block' : 'Send to auction block'}
                          >
                            Block →
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredPlayers.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-12 px-4 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="text-xs font-bold text-foreground">No players match the current filters</p>
                      <p className="text-[11px] text-muted-foreground">
                        Try clearing or adjusting your search keyword and filter criteria.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-xs font-bold rounded-xl mt-2 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset / Clear All Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= HOST / ORGANIZER OUTCOME MODAL ================= */}
      {outcomePlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Gavel className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">Auction Outcome Control</h3>
                  <p className="text-[11px] text-muted-foreground">Host / Organizer authoritative outcome assignment</p>
                </div>
              </div>
              <button
                onClick={() => setOutcomePlayer(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition text-xs"
              >
                ✕
              </button>
            </div>

            {/* Body Form */}
            <div className="p-6 space-y-4 text-xs">
              {/* Player Summary Card */}
              <div className="p-3 rounded-2xl bg-muted/30 border border-border flex items-center justify-between">
                <div>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 mr-1.5">
                    #{outcomePlayer.serial_no}
                  </span>
                  <span className="font-bold text-foreground text-xs">
                    {outcomePlayer.player_name || outcomePlayer.name}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Category: <strong className="text-foreground">{outcomePlayer.category || 'General'}</strong> • Base:{' '}
                    <strong className="text-foreground">₹{parseFloat(outcomePlayer.base_price || 0).toLocaleString('en-IN')}</strong>
                  </p>
                </div>
              </div>

              {outcomeError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold">
                  {outcomeError}
                </div>
              )}

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground text-xs block">
                  Auction Status <span className="text-emerald-500">*</span>
                </label>
                <select
                  value={outcomeStatus === 'AVAILABLE' ? 'PENDING' : outcomeStatus}
                  onChange={(e) => setOutcomeStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-bold text-foreground focus:outline-none"
                >
                  <option value="PENDING">PENDING (In Pool / Not Auctioned Yet)</option>
                  <option value="SOLD">SOLD (Sold to Franchise Team)</option>
                  <option value="UNSOLD">UNSOLD (Passed / No Bid)</option>
                  <option value="BIDDING">IN AUCTION (Currently on Live Hammer Block)</option>
                </select>
              </div>

              {/* SOLD Fields (Only visible when status is SOLD) */}
              {outcomeStatus === 'SOLD' && (
                <div className="space-y-3 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <div className="space-y-1">
                    <label className="font-bold text-foreground text-xs block">
                      Sold To Franchise Team <span className="text-emerald-500">*</span>
                    </label>
                    <select
                      value={outcomeTeamId}
                      onChange={(e) => setOutcomeTeamId(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-2 text-xs font-semibold text-foreground focus:outline-none"
                    >
                      <option value="">Select Franchise Team</option>
                      {teams.map((t: any) => (
                        <option key={t.id || t.team_id} value={t.id}>
                          {t.name} (Remaining Purse: ₹{parseFloat(t.remaining_budget || 0).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-foreground text-xs block">
                      Winning Bid Amount (₹) <span className="text-emerald-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={500}
                      value={outcomeBidAmount}
                      onChange={(e) => setOutcomeBidAmount(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 50000"
                      className="text-xs font-mono font-bold rounded-xl bg-background border-border"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      This amount will be deducted from the franchise team's live purse budget.
                    </p>
                  </div>
                </div>
              )}

              {outcomeStatus !== 'SOLD' && (
                <p className="text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border">
                  Setting status to <strong>{outcomeStatus}</strong> will clear any assigned team and restore purse
                  budget if the player was previously marked SOLD.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-border px-6 py-3.5 bg-muted/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOutcomePlayer(null)}
                className="text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={savingOutcome || (outcomeStatus === 'SOLD' && !outcomeTeamId)}
                onClick={handleSaveOutcome}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
              >
                {savingOutcome ? 'Saving Outcome...' : 'Save Auction Outcome'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Public Registration Link Setup Modal */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40 shrink-0">
              <div>
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-purple-600" />
                  Public Player Registration Setup & Link
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Configure public registration form. Submissions are saved directly into the tournament Player Master.
                </p>
              </div>
              <button
                onClick={() => setShowRegModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Share URL Banner */}
              <div className="rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50/70 dark:bg-purple-950/20 p-4 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Public Registration URL
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={registrationUrl}
                    className="bg-background border-purple-200 dark:border-purple-800 text-xs font-mono font-semibold"
                  />
                  <Button
                    size="sm"
                    onClick={copyRegUrl}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 rounded-xl"
                  >
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>
              </div>

              {/* Title & Intro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">Form Header Title</label>
                  <Input
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                    className="text-xs font-semibold rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">Success Message</label>
                  <Input
                    value={regSuccessMsg}
                    onChange={(e) => setRegSuccessMsg(e.target.value)}
                    className="text-xs font-semibold rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Introductory Text</label>
                <textarea
                  rows={2}
                  value={regIntro}
                  onChange={(e) => setRegIntro(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-medium text-foreground focus:outline-none"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-border">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={regEnabled}
                    onChange={(e) => setRegEnabled(e.target.checked)}
                    className="rounded border-border text-purple-600 h-4 w-4"
                  />
                  Registration Form Enabled
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={regShowLogo}
                    onChange={(e) => setRegShowLogo(e.target.checked)}
                    className="rounded border-border text-purple-600 h-4 w-4"
                  />
                  Show Tournament Logo
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={regShowName}
                    onChange={(e) => setRegShowName(e.target.checked)}
                    className="rounded border-border text-purple-600 h-4 w-4"
                  />
                  Show Tournament Name
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-border px-6 py-3.5 bg-muted/40 shrink-0">
              <Button
                variant="ghost"
                onClick={() => setShowRegModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
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

      {/* Standard Player Master Form Modal (No Auction Status/Team/Bid Amount fields inside) */}
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
