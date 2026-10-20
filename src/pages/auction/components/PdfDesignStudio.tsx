import { useState, useEffect } from 'react'
import {
  FileText,
  Save,
  CheckCircle2,
  Grid,
  Users,
  Printer,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/api/apiClient'

interface PdfDesignStudioProps {
  auctionId: string
}

interface CardElement {
  selected: boolean
  x: number
  y: number
  w: number
  h: number
  font_size: number
  font_family: string
  colour: string
  align: 'left' | 'center' | 'right'
  bold: boolean
  italic: boolean
  show_label: boolean
  z: number
}

const DEFAULT_CARD_ELEMENTS: Record<string, CardElement> = {
  player_number: { selected: true, x: 38, y: 6, w: 24, h: 12, font_size: 13, font_family: 'Helvetica-Bold', colour: '#0284c7', align: 'left', bold: true, italic: false, show_label: false, z: 2 },
  player_photo: { selected: true, x: 4, y: 6, w: 30, h: 86, font_size: 10, font_family: 'Helvetica', colour: '#000000', align: 'center', bold: false, italic: false, show_label: true, z: 2 },
  name: { selected: true, x: 38, y: 19, w: 58, h: 14, font_size: 14, font_family: 'Helvetica-Bold', colour: '#0f172a', align: 'left', bold: true, italic: false, show_label: false, z: 2 },
  category: { selected: true, x: 62, y: 6, w: 34, h: 12, font_size: 10, font_family: 'Helvetica-Bold', colour: '#7c3aed', align: 'right', bold: true, italic: false, show_label: false, z: 2 },
  base_price: { selected: true, x: 38, y: 44, w: 58, h: 14, font_size: 11, font_family: 'Helvetica-Bold', colour: '#16a34a', align: 'left', bold: true, italic: false, show_label: true, z: 2 },
  role: { selected: true, x: 38, y: 32, w: 58, h: 12, font_size: 10, font_family: 'Helvetica', colour: '#334155', align: 'left', bold: false, italic: false, show_label: false, z: 2 },
  location: { selected: true, x: 38, y: 58, w: 28, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, z: 2 },
  batting: { selected: true, x: 68, y: 58, w: 28, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, z: 2 },
  bowling: { selected: true, x: 38, y: 70, w: 28, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, z: 2 },
  mobile: { selected: true, x: 68, y: 70, w: 28, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, z: 2 },
  age: { selected: true, x: 38, y: 82, w: 18, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, z: 2 },
  experience: { selected: true, x: 57, y: 82, w: 20, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, z: 2 },
  application_id: { selected: true, x: 78, y: 82, w: 18, h: 11, font_size: 9, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, z: 2 },
}

const FIELD_LABELS: Record<string, string> = {
  player_number: 'Player Number',
  player_photo: 'Player Photo',
  name: 'Player Name',
  category: 'Category',
  base_price: 'Base Price',
  role: 'Role',
  location: 'Location',
  batting: 'Batting Style',
  bowling: 'Bowling Style',
  mobile: 'Mobile Number',
  age: 'Age',
  experience: 'Experience',
  application_id: 'Application Name & ID',
}

export default function PdfDesignStudio({ auctionId }: PdfDesignStudioProps) {
  const [activeTab, setActiveTab] = useState<'category' | 'auction'>('category')
  const [cols, setCols] = useState<number>(3)
  const [rows, setRows] = useState<number>(5)
  const [cardFill, setCardFill] = useState<string>('#ffffff')
  const [accentColour, setAccentColour] = useState<string>('#2563eb')
  const [elements, setElements] = useState<Record<string, CardElement>>(DEFAULT_CARD_ELEMENTS)
  const [selectedKey, setSelectedKey] = useState<string>('name')

  // Header & Branding states
  const [showTournamentName, setShowTournamentName] = useState(true)
  const [showTournamentLogo, setShowTournamentLogo] = useState(true)
  const [logoCount, setLogoCount] = useState<number>(1)
  const [logoAlignment, setLogoAlignment] = useState<'left' | 'center' | 'right'>('left')
  const [titleMode, setTitleMode] = useState<'Text' | 'Image'>('Text')
  const [showFieldLabelsByDefault, setShowFieldLabelsByDefault] = useState<'Yes' | 'No'>('Yes')
  const [logoX, setLogoX] = useState<number>(5)
  const [logoY, setLogoY] = useState<number>(2)
  const [logoWidth, setLogoWidth] = useState<number>(12)
  const [titleX, setTitleX] = useState<number>(22)
  const [titleY, setTitleY] = useState<number>(2)
  const [titleWidth, setTitleWidth] = useState<number>(56)
  const [titleImageName, setTitleImageName] = useState<string>('')
  const [sponsorLogoFiles, setSponsorLogoFiles] = useState<string[]>([])
  const [cardBackgroundImage, setCardBackgroundImage] = useState<string>('')

  // UI state
  const [showHowItWorks, setShowHowItWorks] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const apiBase = apiClient.defaults.baseURL || window.location.origin

  useEffect(() => {
    loadDesign()
  }, [auctionId])

  const loadDesign = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/page_design/`)
      const d = res.data?.design_json?.pdf_design
      if (d) {
        if (d.activeTab) setActiveTab(d.activeTab)
        if (d.cols) setCols(d.cols)
        if (d.rows) setRows(d.rows)
        if (d.card_fill) setCardFill(d.card_fill)
        if (d.accent_colour) setAccentColour(d.accent_colour)
        if (d.elements) setElements({ ...DEFAULT_CARD_ELEMENTS, ...d.elements })

        const b = d.branding || {}
        if (typeof b.showTournamentName === 'boolean') setShowTournamentName(b.showTournamentName)
        if (typeof b.showTournamentLogo === 'boolean') setShowTournamentLogo(b.showTournamentLogo)
        if (b.logoCount) setLogoCount(b.logoCount)
        if (b.logoAlignment) setLogoAlignment(b.logoAlignment)
        if (b.titleMode) setTitleMode(b.titleMode)
        if (b.showFieldLabelsByDefault) setShowFieldLabelsByDefault(b.showFieldLabelsByDefault)
        if (b.logoX !== undefined) setLogoX(b.logoX)
        if (b.logoY !== undefined) setLogoY(b.logoY)
        if (b.logoWidth !== undefined) setLogoWidth(b.logoWidth)
        if (b.titleX !== undefined) setTitleX(b.titleX)
        if (b.titleY !== undefined) setTitleY(b.titleY)
        if (b.titleWidth !== undefined) setTitleWidth(b.titleWidth)
        if (b.titleImageName) setTitleImageName(b.titleImageName)
        if (b.sponsorLogoFiles) setSponsorLogoFiles(b.sponsorLogoFiles)
        if (b.cardBackgroundImage) setCardBackgroundImage(b.cardBackgroundImage)
      }
    } catch (err) {
      console.error('Failed to load PDF design', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/page_design/`)
      const currentJson = res.data?.design_json || {}
      currentJson.pdf_design = {
        activeTab,
        cols,
        rows,
        card_fill: cardFill,
        accent_colour: accentColour,
        elements,
        branding: {
          showTournamentName,
          showTournamentLogo,
          logoCount,
          logoAlignment,
          titleMode,
          showFieldLabelsByDefault,
          logoX,
          logoY,
          logoWidth,
          titleX,
          titleY,
          titleWidth,
          titleImageName,
          sponsorLogoFiles,
          cardBackgroundImage,
        },
      }
      await apiClient.post(`/v1/auction/console/${auctionId}/page_design/`, {
        design_json: currentJson,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save PDF design', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadCardsPdf = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/export_cards_pdf/?cols=${cols}&rows=${rows}&format=${activeTab}`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Player_Cards_${activeTab}_${cols}x${rows}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to download cards PDF', err)
      const downloadUrl = `${apiBase}/v1/auction/console/${auctionId}/export_cards_pdf/?cols=${cols}&rows=${rows}&format=${activeTab}`
      window.open(downloadUrl, '_blank')
    }
  }

  const handleDownloadTeamsPdf = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/export_teams_pdf/`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Auction_Squads_Report.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to export teams PDF', err)
      const downloadUrl = `${apiBase}/v1/auction/console/${auctionId}/export_teams_pdf/`
      window.open(downloadUrl, '_blank')
    }
  }

  const updateProp = (key: string, prop: keyof CardElement, val: any) => {
    setElements((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [prop]: val,
      },
    }))
  }

  const selectedEl = elements[selectedKey] || elements.name
  const sampleCount = Math.min(cols * rows, 12)

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
              {activeTab === 'category' ? 'CATEGORY WISE' : 'AUCTION FORMAT'}
            </span>
            <span className="text-xs text-slate-400 font-semibold">•</span>
            <span className="text-xs text-slate-500 font-semibold">{cols} Columns × {rows} Rows Grid</span>
          </div>
          <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2 mt-1">
            <FileText className="w-5 h-5 text-indigo-600" />
            PDF Design Studio & Sheet Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTab === 'category'
              ? 'Every category starts on a new page. Maximum 4 columns × 8 rows.'
              : 'All auction lots printed in sequential order. Maximum 4 columns × 8 rows.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> PDF Design Saved!
            </span>
          )}

          <Button
            onClick={handleDownloadCardsPdf}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm rounded-xl"
            title="Download printable grid of player auction cards"
          >
            <Printer className="w-3.5 h-3.5" />
            Download {activeTab === 'category' ? 'Category Wise' : 'Auction'} PDF
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadTeamsPdf}
            className="border-slate-300 text-zinc-800 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 rounded-xl"
            title="Export full squads roster report PDF"
          >
            <Users className="w-3.5 h-3.5 text-slate-600" />
            Export Squads PDF
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm rounded-xl"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Design'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading PDF design studio...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Panels (Left 5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* 1. Page & Grid */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-indigo-600" />
                  Page & Grid
                </span>
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                  Max 4 cols × 8 rows
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('category')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition ${
                    activeTab === 'category'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  CATEGORY WISE
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('auction')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition ${
                    activeTab === 'auction'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Auction Format
                </button>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {activeTab === 'category' ? (
                  <p className="font-medium text-slate-700">
                    <span className="font-bold text-indigo-600">Category Wise:</span> Every category starts on a new page. Maximum 4 columns × 8 rows.
                  </p>
                ) : (
                  <p className="font-medium text-slate-700">
                    <span className="font-bold text-indigo-600">Auction Format:</span> Continuous lots order across pages. Maximum 4 columns × 8 rows.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Columns</label>
                  <select
                    value={cols}
                    onChange={(e) => setCols(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 font-semibold focus:outline-none"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Column' : 'Columns'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Rows</label>
                  <select
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 font-semibold focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} Rows
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Header & Branding */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Header & Branding
                </span>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <label className="flex items-center justify-between text-xs text-slate-700 font-medium cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <span>Show tournament name</span>
                  <input
                    type="checkbox"
                    checked={showTournamentName}
                    onChange={(e) => setShowTournamentName(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-700 font-medium cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <span>Show tournament logo</span>
                  <input
                    type="checkbox"
                    checked={showTournamentLogo}
                    onChange={(e) => setShowTournamentLogo(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Logo count</label>
                  <select
                    value={logoCount}
                    onChange={(e) => setLogoCount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 font-semibold"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Logo alignment</label>
                  <select
                    value={logoAlignment}
                    onChange={(e) => setLogoAlignment(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 font-semibold"
                  >
                    <option value="left">left</option>
                    <option value="center">center</option>
                    <option value="right">right</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Title mode</label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="title_mode"
                        checked={titleMode === 'Text'}
                        onChange={() => setTitleMode('Text')}
                        className="text-indigo-600"
                      />
                      <span>Text</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="title_mode"
                        checked={titleMode === 'Image'}
                        onChange={() => setTitleMode('Image')}
                        className="text-indigo-600"
                      />
                      <span>Image</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Show field labels by default</label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="default_labels"
                        checked={showFieldLabelsByDefault === 'Yes'}
                        onChange={() => setShowFieldLabelsByDefault('Yes')}
                        className="text-indigo-600"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="default_labels"
                        checked={showFieldLabelsByDefault === 'No'}
                        onChange={() => setShowFieldLabelsByDefault('No')}
                        className="text-indigo-600"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Logo Coordinates */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Logo X %</label>
                  <Input
                    type="number"
                    value={logoX}
                    onChange={(e) => setLogoX(Number(e.target.value))}
                    className="bg-white border-slate-200 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Logo Y %</label>
                  <Input
                    type="number"
                    value={logoY}
                    onChange={(e) => setLogoY(Number(e.target.value))}
                    className="bg-white border-slate-200 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Logo Width %</label>
                  <Input
                    type="number"
                    value={logoWidth}
                    onChange={(e) => setLogoWidth(Number(e.target.value))}
                    className="bg-white border-slate-200 text-xs text-zinc-900"
                  />
                </div>
              </div>

              {/* Title Coordinates */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Title X %</label>
                  <Input
                    type="number"
                    value={titleX}
                    onChange={(e) => setTitleX(Number(e.target.value))}
                    className="bg-white border-slate-200 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Title Y %</label>
                  <Input
                    type="number"
                    value={titleY}
                    onChange={(e) => setTitleY(Number(e.target.value))}
                    className="bg-white border-slate-200 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Title Width %</label>
                  <Input
                    type="number"
                    value={titleWidth}
                    onChange={(e) => setTitleWidth(Number(e.target.value))}
                    className="bg-white border-slate-200 text-xs text-zinc-900"
                  />
                </div>
              </div>

              {/* File Uploads for Title & Sponsors */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Tournament title image
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setTitleImageName(file.name)
                      }}
                      className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {titleImageName ? `Selected: ${titleImageName}` : 'No file chosen'}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Sponsor logos (up to 10)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        setSponsorLogoFiles(files.slice(0, 10).map((f) => f.name))
                      }}
                      className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {sponsorLogoFiles.length > 0 ? `${sponsorLogoFiles.length} file(s) chosen` : 'No file chosen'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Information on card (All 13 fields) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Information on card</span>
                <span className="text-[10px] text-slate-500 font-medium">13 Fields Available</span>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {Object.entries(elements).map(([key, el]) => (
                  <div
                    key={key}
                    onClick={() => setSelectedKey(key)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition ${
                      selectedKey === key
                        ? 'bg-indigo-50 border border-indigo-300 text-indigo-950 font-bold'
                        : 'bg-slate-50/70 hover:bg-slate-100 border border-transparent text-slate-700'
                    }`}
                  >
                    <label
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={el.selected}
                        onChange={(e) => updateProp(key, 'selected', e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 h-3.5 w-3.5"
                      />
                      <span>{FIELD_LABELS[key] || key}</span>
                    </label>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => updateProp(key, 'show_label', !el.show_label)}
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold transition ${
                          el.show_label
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                        title="Toggle whether field label (e.g. 'Base Price:') is shown"
                      >
                        Field name: {el.show_label ? 'Yes' : 'No'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Card Appearance */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Card appearance</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Card colour</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cardFill}
                      onChange={(e) => setCardFill(e.target.value)}
                      className="w-7 h-7 rounded border border-slate-200 bg-transparent cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-600">{cardFill}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Accent</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColour}
                      onChange={(e) => setAccentColour(e.target.value)}
                      className="w-7 h-7 rounded border border-slate-200 bg-transparent cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-600">{accentColour}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Background image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setCardBackgroundImage(file.name)
                  }}
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {cardBackgroundImage ? `Selected: ${cardBackgroundImage}` : 'No file chosen'}
                </span>
              </div>
            </div>

            {/* 5. Selected Field Properties */}
            {selectedEl && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    {FIELD_LABELS[selectedKey] || selectedKey} Properties
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Font Size (px)</label>
                    <Input
                      type="number"
                      min={6}
                      max={40}
                      value={selectedEl.font_size}
                      onChange={(e) => updateProp(selectedKey, 'font_size', Number(e.target.value))}
                      className="bg-white border-slate-200 text-xs text-zinc-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Text Colour</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedEl.colour}
                        onChange={(e) => updateProp(selectedKey, 'colour', e.target.value)}
                        className="w-7 h-7 rounded border border-slate-200 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-600">{selectedEl.colour}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">X %</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedEl.x}
                      onChange={(e) => updateProp(selectedKey, 'x', Number(e.target.value))}
                      className="bg-white border-slate-200 text-[11px] text-zinc-900 p-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Y %</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedEl.y}
                      onChange={(e) => updateProp(selectedKey, 'y', Number(e.target.value))}
                      className="bg-white border-slate-200 text-[11px] text-zinc-900 p-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Width %</label>
                    <Input
                      type="number"
                      min={4}
                      max={100}
                      value={selectedEl.w}
                      onChange={(e) => updateProp(selectedKey, 'w', Number(e.target.value))}
                      className="bg-white border-slate-200 text-[11px] text-zinc-900 p-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Height %</label>
                    <Input
                      type="number"
                      min={4}
                      max={100}
                      value={selectedEl.h}
                      onChange={(e) => updateProp(selectedKey, 'h', Number(e.target.value))}
                      className="bg-white border-slate-200 text-[11px] text-zinc-900 p-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. How it works section */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 shadow-sm space-y-2">
              <button
                type="button"
                onClick={() => setShowHowItWorks(!showHowItWorks)}
                className="w-full flex items-center justify-between text-xs font-bold text-indigo-950 uppercase tracking-wider text-left"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  How it works
                </span>
                {showHowItWorks ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
              </button>

              {showHowItWorks && (
                <div className="text-xs text-slate-600 space-y-2 pt-1 font-normal leading-relaxed">
                  <p>
                    <strong className="text-zinc-900 font-semibold">1. Category Wise Format:</strong> Every category starts on a brand-new page. If a category has more players than the grid capacity (Columns × Rows), it paginates seamlessly into subsequent pages before moving to the next category.
                  </p>
                  <p>
                    <strong className="text-zinc-900 font-semibold">2. Auction Format:</strong> Prints all lots sequentially in lot/serial order without category page breaks.
                  </p>
                  <p>
                    <strong className="text-zinc-900 font-semibold">3. Master Template:</strong> Customizing fonts, positioning, and field label displays on the master card automatically formats all player cards across the printed PDF.
                  </p>
                  <p>
                    <strong className="text-zinc-900 font-semibold">4. Print Engine:</strong> Generates high-resolution vector PDF sheets ready for standard A4 paper printing.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Live Page Preview (Right 7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-indigo-600" />
                Live Page Grid Preview ({cols} Columns × {rows} Rows)
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                Page 1 • {cols * rows} Cards per Page
              </span>
            </div>

            {/* A4 Paper Simulation Canvas */}
            <div className="bg-slate-200/70 border border-slate-300 rounded-2xl p-6 overflow-hidden flex justify-center shadow-inner">
              <div className="w-full max-w-[720px] aspect-[1/1.414] bg-white text-slate-900 rounded-xl shadow-2xl p-5 flex flex-col relative select-none border border-slate-300">
                {/* Simulated Sheet Header with Branding */}
                <div className="border-b border-slate-200 pb-2 mb-3 flex items-center justify-between text-[11px] font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    {showTournamentLogo && (
                      <div className="w-5 h-5 rounded bg-indigo-600 text-white text-[8px] font-black flex items-center justify-center">
                        T
                      </div>
                    )}
                    {showTournamentName && (
                      <span className="uppercase tracking-wider">
                        {activeTab === 'category' ? 'Category: Icon Players' : 'Auction Format Order'}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {activeTab === 'category' ? 'Every category on new page' : 'Continuous order'}
                  </span>
                </div>

                {/* Grid */}
                <div
                  className="grid gap-2 flex-1"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: sampleCount }).map((_, cIdx) => (
                    <div
                      key={cIdx}
                      className="relative rounded-lg border overflow-hidden p-1 transition"
                      style={{
                        backgroundColor: cardFill,
                        borderColor: accentColour,
                        boxShadow: cIdx === 0 ? '0 0 0 2px #4f46e5' : 'none',
                      }}
                    >
                      {cIdx === 0 && (
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-bl z-10">
                          Template
                        </div>
                      )}

                      {/* Top accent bar */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ backgroundColor: accentColour }}
                      />

                      {/* Render Card Elements */}
                      {Object.entries(elements).map(([key, el]) => {
                        if (!el.selected) return null
                        const isPhoto = key === 'player_photo'

                        let sampleText = ''
                        if (key === 'player_number') sampleText = el.show_label ? `No: #${cIdx + 1}` : `#${cIdx + 1}`
                        else if (key === 'name') sampleText = el.show_label ? 'Name: Virat Kohli' : 'Virat Kohli'
                        else if (key === 'category') sampleText = el.show_label ? 'Cat: Icon' : 'Icon'
                        else if (key === 'role') sampleText = el.show_label ? 'Role: Batsman' : 'Batsman'
                        else if (key === 'base_price') sampleText = el.show_label ? 'Base Price: ₹50K' : '₹50,000'
                        else if (key === 'location') sampleText = el.show_label ? 'Loc: Mumbai' : 'Mumbai'
                        else if (key === 'batting') sampleText = el.show_label ? 'Bat: RHB' : 'Right-Hand'
                        else if (key === 'bowling') sampleText = el.show_label ? 'Bowl: RAF' : 'Right-Arm'
                        else if (key === 'mobile') sampleText = el.show_label ? 'Mob: 9876543210' : '9876543210'
                        else if (key === 'age') sampleText = el.show_label ? 'Age: 28' : '28'
                        else if (key === 'experience') sampleText = el.show_label ? 'Exp: 5 Yrs' : '5 Yrs'
                        else if (key === 'application_id') sampleText = el.show_label ? 'App ID: 104' : '#104'

                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedKey(key)}
                            className={`absolute flex items-center overflow-hidden cursor-pointer ${
                              cIdx === 0 && selectedKey === key ? 'ring-1 ring-indigo-500' : ''
                            } ${
                              isPhoto
                                ? 'bg-slate-100 border border-slate-200 justify-center text-[7px] text-slate-500 font-bold'
                                : ''
                            }`}
                            style={{
                              left: `${el.x}%`,
                              top: `${el.y}%`,
                              width: `${el.w}%`,
                              height: `${el.h}%`,
                              fontSize: `${Math.max(6, Math.round(el.font_size * 0.65))}px`,
                              color: el.colour,
                              fontWeight: el.bold ? 800 : 400,
                              justifyContent:
                                el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
                              zIndex: el.z,
                            }}
                          >
                            {isPhoto ? (el.show_label ? 'PHOTO' : '') : sampleText}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
