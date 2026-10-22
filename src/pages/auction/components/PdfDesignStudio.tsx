import { useState, useEffect, useRef } from 'react'
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
  Image as ImageIcon,
  Move,
  Trash2,
  Sliders,
  Sparkles,
  UploadCloud,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/api/apiClient'

interface PdfDesignStudioProps {
  auctionId: string
}

export interface PlacedLogo {
  id: string
  url: string
  name: string
  x: number // %
  y: number // %
  width: number // %
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

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '')
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return hex
}

export default function PdfDesignStudio({ auctionId }: PdfDesignStudioProps) {
  const [activeTab, setActiveTab] = useState<'category' | 'auction'>('category')
  const [cols, setCols] = useState<number>(3)
  const [rows, setRows] = useState<number>(5)
  const [cardFill, setCardFill] = useState<string>('#ffffff')
  const [cardFillOpacity, setCardFillOpacity] = useState<number>(95)
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
  const [titleX, setTitleX] = useState<number>(22)
  const [titleY, setTitleY] = useState<number>(2)
  const [titleWidth, setTitleWidth] = useState<number>(56)
  const [titleImageName, setTitleImageName] = useState<string>('')
  const [sponsorLogoFiles, setSponsorLogoFiles] = useState<string[]>([])
  const [cardBackgroundImage, setCardBackgroundImage] = useState<string>('')

  // Configurable Sheet Background Image & Opacity
  const [pageBackgroundImage, setPageBackgroundImage] = useState<string>('')
  const [pageBackgroundName, setPageBackgroundName] = useState<string>('')
  const [pageBackgroundOpacity, setPageBackgroundOpacity] = useState<number>(20)

  // Multiple Configurable Draggable Logos
  const [placedLogos, setPlacedLogos] = useState<PlacedLogo[]>([])
  const [selectedLogoId, setSelectedLogoId] = useState<string | null>(null)
  const [draggingLogoId, setDraggingLogoId] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ startMouseX: number; startMouseY: number; startLogoX: number; startLogoY: number } | null>(null)

  // UI state
  const [showHowItWorks, setShowHowItWorks] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const apiBase = apiClient.defaults.baseURL || window.location.origin

  // Handle Logo Dragging
  const handleLogoMouseDown = (e: React.MouseEvent, logo: PlacedLogo) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedLogoId(logo.id)
    setDraggingLogoId(logo.id)
    dragStartRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startLogoX: logo.x,
      startLogoY: logo.y,
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingLogoId || !dragStartRef.current || !canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const deltaX = e.clientX - dragStartRef.current.startMouseX
      const deltaY = e.clientY - dragStartRef.current.startMouseY

      const deltaXPct = (deltaX / rect.width) * 100
      const deltaYPct = (deltaY / rect.height) * 100

      setPlacedLogos((prev) =>
        prev.map((l) => {
          if (l.id !== draggingLogoId) return l
          const newX = Math.max(0, Math.min(100 - l.width, dragStartRef.current!.startLogoX + deltaXPct))
          const newY = Math.max(0, Math.min(95, dragStartRef.current!.startLogoY + deltaYPct))
          return {
            ...l,
            x: Math.round(newX * 10) / 10,
            y: Math.round(newY * 10) / 10,
          }
        })
      )
    }

    const handleMouseUp = () => {
      if (draggingLogoId) {
        setDraggingLogoId(null)
        dragStartRef.current = null
      }
    }

    if (draggingLogoId) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingLogoId])

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
        if (d.card_fill_opacity !== undefined) setCardFillOpacity(d.card_fill_opacity)
        if (d.accent_colour) setAccentColour(d.accent_colour)
        if (d.elements) setElements({ ...DEFAULT_CARD_ELEMENTS, ...d.elements })

        const b = d.branding || {}
        if (typeof b.showTournamentName === 'boolean') setShowTournamentName(b.showTournamentName)
        if (typeof b.showTournamentLogo === 'boolean') setShowTournamentLogo(b.showTournamentLogo)
        if (b.logoCount) setLogoCount(b.logoCount)
        if (b.logoAlignment) setLogoAlignment(b.logoAlignment)
        if (b.titleMode) setTitleMode(b.titleMode)
        if (b.showFieldLabelsByDefault) setShowFieldLabelsByDefault(b.showFieldLabelsByDefault)
        if (b.titleX !== undefined) setTitleX(b.titleX)
        if (b.titleY !== undefined) setTitleY(b.titleY)
        if (b.titleWidth !== undefined) setTitleWidth(b.titleWidth)
        if (b.titleImageName) setTitleImageName(b.titleImageName)
        if (b.sponsorLogoFiles) setSponsorLogoFiles(b.sponsorLogoFiles)
        if (b.cardBackgroundImage) setCardBackgroundImage(b.cardBackgroundImage)
        if (b.pageBackgroundImage) setPageBackgroundImage(b.pageBackgroundImage)
        if (b.pageBackgroundName) setPageBackgroundName(b.pageBackgroundName)
        if (b.pageBackgroundOpacity !== undefined) setPageBackgroundOpacity(Number(b.pageBackgroundOpacity))
        if (b.cardFillOpacity !== undefined) setCardFillOpacity(Number(b.cardFillOpacity))

        // Load multiple placed logos
        if (Array.isArray(b.placedLogos) && b.placedLogos.length > 0) {
          setPlacedLogos(b.placedLogos)
          setSelectedLogoId(b.placedLogos[0].id)
        } else if (Array.isArray(b.logos) && b.logos.length > 0) {
          setPlacedLogos(b.logos)
          setSelectedLogoId(b.logos[0].id)
        } else if (b.customLogoUrl) {
          const initialLogo: PlacedLogo = {
            id: 'logo_1',
            url: b.customLogoUrl,
            name: b.customLogoName || 'Logo 1',
            x: Number(b.logoX ?? 4),
            y: Number(b.logoY ?? 1.5),
            width: Number(b.logoWidth ?? 10),
          }
          setPlacedLogos([initialLogo])
          setSelectedLogoId(initialLogo.id)
        }
      }
    } catch (err) {
      console.error('Failed to load PDF design', err)
    } finally {
      setLoading(false)
    }
  }

  const getDesignPayload = () => ({
    activeTab,
    cols,
    rows,
    card_fill: cardFill,
    card_fill_opacity: cardFillOpacity,
    accent_colour: accentColour,
    elements,
    branding: {
      showTournamentName,
      showTournamentLogo,
      logoCount,
      logoAlignment,
      titleMode,
      showFieldLabelsByDefault,
      titleX,
      titleY,
      titleWidth,
      titleImageName,
      sponsorLogoFiles,
      cardBackgroundImage,
      pageBackgroundImage,
      pageBackgroundName,
      pageBackgroundOpacity,
      cardFillOpacity,
      placedLogos,
      logos: placedLogos,
      customLogoUrl: placedLogos[0]?.url || '',
      customLogoName: placedLogos[0]?.name || '',
      logoX: placedLogos[0]?.x ?? 4,
      logoY: placedLogos[0]?.y ?? 1.5,
      logoWidth: placedLogos[0]?.width ?? 10,
    },
  })

  const handleMultipleLogosUpload = (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    fileArr.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newLogo: PlacedLogo = {
          id: `logo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${index}`,
          url: e.target?.result as string,
          name: file.name,
          x: Math.min(84, 4 + ((placedLogos.length + index) * 14) % 80),
          y: Math.min(90, 1.5 + Math.floor(((placedLogos.length + index) * 14) / 80) * 8),
          width: 10,
        }
        setPlacedLogos((prev) => [...prev, newLogo])
        setSelectedLogoId(newLogo.id)
      }
      reader.readAsDataURL(file)
    })
  }

  const updateSelectedLogo = (prop: 'x' | 'y' | 'width', val: number) => {
    if (!selectedLogoId) return
    setPlacedLogos((prev) =>
      prev.map((l) => (l.id === selectedLogoId ? { ...l, [prop]: val } : l))
    )
  }

  const removeLogo = (id: string) => {
    setPlacedLogos((prev) => prev.filter((l) => l.id !== id))
    if (selectedLogoId === id) {
      setSelectedLogoId(null)
    }
  }

  const selectedLogo = placedLogos.find((l) => l.id === selectedLogoId) || placedLogos[0] || null

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/page_design/`)
      const currentJson = res.data?.design_json || {}
      currentJson.pdf_design = getDesignPayload()
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
      setSaving(true)
      const payload = getDesignPayload()
      // Auto-save latest design payload before download
      try {
        const resDesign = await apiClient.get(`/v1/auction/console/${auctionId}/page_design/`)
        const currentJson = resDesign.data?.design_json || {}
        currentJson.pdf_design = payload
        await apiClient.post(`/v1/auction/console/${auctionId}/page_design/`, {
          design_json: currentJson,
        })
      } catch (saveErr) {
        console.warn('Auto-save before export skipped:', saveErr)
      }

      // Download with latest design via POST
      const res = await apiClient.post(
        `/v1/auction/console/${auctionId}/export_cards_pdf/?cols=${cols}&rows=${rows}&pdf_format=${activeTab}`,
        { pdf_design: payload, pdf_format: activeTab },
        { responseType: 'blob' }
      )
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
      console.error('Failed to download cards PDF with POST, attempting GET fallback', err)
      const downloadUrl = `${apiBase}/v1/auction/console/${auctionId}/export_cards_pdf/?cols=${cols}&rows=${rows}&pdf_format=${activeTab}`
      window.open(downloadUrl, '_blank')
    } finally {
      setSaving(false)
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

  const handleBackgroundUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setPageBackgroundImage(e.target?.result as string)
      setPageBackgroundName(file.name)
    }
    reader.readAsDataURL(file)
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

            {/* 2. Page Sheet Background & Watermark */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  Sheet Background & Watermark
                </span>
                {pageBackgroundImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setPageBackgroundImage('')
                      setPageBackgroundName('')
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    title="Remove background image"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              {/* Upload Box */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Upload Background Image
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl cursor-pointer bg-slate-50/70 hover:bg-indigo-50/30 transition group">
                    <UploadCloud className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
                    <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-700">
                      {pageBackgroundName || 'Choose or Drag Image...'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleBackgroundUpload(file)
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="pt-1 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    Background Opacity
                  </label>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                    {pageBackgroundOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={pageBackgroundOpacity}
                  onChange={(e) => setPageBackgroundOpacity(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
                {/* Opacity Quick Presets */}
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[
                    { label: '15% Subtle', val: 15 },
                    { label: '30% Light', val: 30 },
                    { label: '60% Med', val: 60 },
                    { label: '100% Solid', val: 100 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setPageBackgroundOpacity(p.val)}
                      className={`text-[10px] py-1 rounded-lg font-bold border transition ${
                        pageBackgroundOpacity === p.val
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Header & Draggable Logos (Multiple) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Header & Logos ({placedLogos.length})
                </span>
                {placedLogos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlacedLogos([])
                      setSelectedLogoId(null)
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    title="Remove all logos"
                  >
                    <Trash2 className="w-3 h-3" /> Clear All
                  </button>
                )}
              </div>

              {/* Multi-upload Button */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Upload Logos & Sponsor Images
                </label>
                <label className="flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-xl cursor-pointer bg-indigo-50/40 hover:bg-indigo-50/70 transition group">
                  <Plus className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-indigo-700">
                    + Add Logo / Images (Select Multiple)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleMultipleLogosUpload(e.target.files)
                      }
                    }}
                    className="hidden"
                  />
                </label>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Supports multiple files at once (.png, .jpg, .webp). Each image can be placed individually!
                </span>
              </div>

              {/* Placed Logos List */}
              {placedLogos.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span>Placed Logos ({placedLogos.length})</span>
                    <span className="text-[10px] text-slate-400 font-normal">Click to configure</span>
                  </div>

                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {placedLogos.map((l, idx) => {
                      const isSel = (selectedLogoId === l.id) || (!selectedLogoId && idx === 0)
                      return (
                        <div
                          key={l.id}
                          onClick={() => setSelectedLogoId(l.id)}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border transition text-xs ${
                            isSel
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-200'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <img
                              src={l.url}
                              alt=""
                              className="w-6 h-6 object-contain rounded bg-white border border-slate-200 p-0.5 shrink-0"
                            />
                            <span className="truncate max-w-[130px] text-[11px] font-semibold">{l.name}</span>
                            <span className="text-[9px] font-mono text-slate-400 bg-white px-1 py-0.5 rounded border border-slate-200 shrink-0">
                              {Math.round(l.x)}%, {Math.round(l.y)}%
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeLogo(l.id)
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition shrink-0"
                            title="Delete this logo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Fine-tune Controls for Currently Selected Logo */}
                  {selectedLogo && (
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2 mt-2">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-900 border-b border-slate-200 pb-1.5">
                        <span className="truncate max-w-[170px] text-indigo-950 flex items-center gap-1.5">
                          <Move className="w-3.5 h-3.5 text-indigo-600" />
                          {selectedLogo.name}
                        </span>
                        <span className="text-[10px] text-indigo-600 font-mono">
                          {selectedLogo.width}% width
                        </span>
                      </div>

                      {/* Size slider */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <label className="font-semibold text-slate-700">Size / Width</label>
                          <span className="font-mono font-bold text-slate-700">{selectedLogo.width}%</span>
                        </div>
                        <input
                          type="range"
                          min={4}
                          max={40}
                          value={selectedLogo.width}
                          onChange={(e) => updateSelectedLogo('width', Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                        />
                      </div>

                      {/* Coordinates */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">X %</label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={selectedLogo.x}
                            onChange={(e) => updateSelectedLogo('x', Number(e.target.value))}
                            className="bg-white border-slate-200 text-xs text-zinc-900 font-semibold p-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Y %</label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={selectedLogo.y}
                            onChange={(e) => updateSelectedLogo('y', Number(e.target.value))}
                            className="bg-white border-slate-200 text-xs text-zinc-900 font-semibold p-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Width %</label>
                          <Input
                            type="number"
                            min={4}
                            max={40}
                            value={selectedLogo.width}
                            onChange={(e) => updateSelectedLogo('width', Number(e.target.value))}
                            className="bg-white border-slate-200 text-xs text-zinc-900 font-semibold p-1"
                          />
                        </div>
                      </div>

                      {/* Quick Position Presets */}
                      <div className="pt-1">
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Quick Positions</label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { label: 'Top-Left', x: 4, y: 1.5 },
                            { label: 'Top-Center', x: 45, y: 1.5 },
                            { label: 'Top-Right', x: 86, y: 1.5 },
                            { label: 'Center Page', x: 38, y: 40 },
                            { label: 'Bottom-Left', x: 4, y: 92 },
                            { label: 'Bottom-Right', x: 86, y: 92 },
                          ].map((pos) => (
                            <button
                              key={pos.label}
                              type="button"
                              onClick={() => {
                                updateSelectedLogo('x', pos.x)
                                updateSelectedLogo('y', pos.y)
                              }}
                              className="text-[10px] py-1 px-1 rounded-lg font-bold border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition text-slate-700 text-center"
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tournament Name Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center justify-between text-xs text-slate-700 font-medium cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                  <span>Show Tournament Header Title</span>
                  <input
                    type="checkbox"
                    checked={showTournamentName}
                    onChange={(e) => setShowTournamentName(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                  />
                </label>
              </div>
            </div>

            {/* 4. Information on card (All 13 fields) */}
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

            {/* 5. Card Appearance */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Card appearance
                </span>
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

              {/* Card Fill Opacity (allows watermark to show through) */}
              <div className="pt-1 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-700">Card Fill Opacity</label>
                  <span className="font-mono font-bold text-slate-700 text-xs">{cardFillOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={cardFillOpacity}
                  onChange={(e) => setCardFillOpacity(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                />
                <span className="text-[10px] text-slate-400 block">
                  Lower opacity allows background watermarks to show through card bodies.
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
              <div
                ref={canvasRef}
                className="w-full max-w-[720px] aspect-[1/1.414] bg-white text-slate-900 rounded-xl shadow-2xl p-5 flex flex-col relative select-none border border-slate-300 overflow-hidden"
              >
                {/* 1. Page Background Watermark Layer */}
                {pageBackgroundImage && (
                  <div
                    className="absolute inset-0 pointer-events-none z-0 bg-center bg-cover transition-opacity duration-150"
                    style={{
                      backgroundImage: `url(${pageBackgroundImage})`,
                      opacity: pageBackgroundOpacity / 100,
                    }}
                  />
                )}

                {/* 2. Multiple Draggable Placed Logos */}
                {placedLogos.map((logo) => {
                  const isSelected = selectedLogoId === logo.id || (!selectedLogoId && placedLogos[0]?.id === logo.id)
                  const isDragging = draggingLogoId === logo.id
                  return (
                    <div
                      key={logo.id}
                      onMouseDown={(e) => handleLogoMouseDown(e, logo)}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLogoId(logo.id)
                      }}
                      className={`absolute z-30 cursor-grab active:cursor-grabbing select-none group p-0.5 rounded transition-all ${
                        isDragging
                          ? 'ring-2 ring-indigo-500 bg-white/40 shadow-xl scale-105'
                          : isSelected
                          ? 'ring-2 ring-indigo-400 bg-indigo-50/30 shadow-md'
                          : 'hover:ring-1 hover:ring-indigo-300 hover:bg-white/20'
                      }`}
                      style={{
                        left: `${logo.x}%`,
                        top: `${logo.y}%`,
                        width: `${logo.width}%`,
                        touchAction: 'none',
                      }}
                      title={`Drag to reposition ${logo.name} (${Math.round(logo.x)}%, ${Math.round(logo.y)}%)`}
                    >
                      <img
                        src={logo.url}
                        alt={logo.name}
                        className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                      />
                      <div className="absolute -top-5 left-0 bg-indigo-950/90 text-white text-[8px] font-mono px-1 rounded shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-1 z-40">
                        <Move className="w-2.5 h-2.5" /> {logo.name}: {Math.round(logo.x)}%, {Math.round(logo.y)}%
                      </div>
                    </div>
                  )
                })}

                {/* Simulated Sheet Header with Branding */}
                <div className="border-b border-slate-200 pb-2 mb-3 flex items-center justify-between text-[11px] font-bold text-slate-800 relative z-10">
                  <div className="flex items-center gap-2">
                    {showTournamentLogo && placedLogos.length === 0 && (
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
                  className="grid gap-2 flex-1 relative z-10"
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
                        backgroundColor: hexToRgba(cardFill, cardFillOpacity / 100),
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
