import { useState, useEffect } from 'react'
import { FileText, Save, CheckCircle2, Grid, Users, Printer } from 'lucide-react'
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
  player_photo: { selected: true, x: 4, y: 6, w: 32, h: 88, font_size: 10, font_family: 'Helvetica', colour: '#000000', align: 'center', bold: false, italic: false, show_label: false, z: 2 },
  player_number: { selected: true, x: 40, y: 8, w: 25, h: 14, font_size: 14, font_family: 'Helvetica-Bold', colour: '#0284c7', align: 'left', bold: true, italic: false, show_label: false, z: 2 },
  name: { selected: true, x: 40, y: 24, w: 56, h: 18, font_size: 15, font_family: 'Helvetica-Bold', colour: '#0f172a', align: 'left', bold: true, italic: false, show_label: false, z: 2 },
  category: { selected: true, x: 68, y: 8, w: 28, h: 14, font_size: 11, font_family: 'Helvetica-Bold', colour: '#7c3aed', align: 'right', bold: true, italic: false, show_label: false, z: 2 },
  role: { selected: true, x: 40, y: 44, w: 56, h: 14, font_size: 11, font_family: 'Helvetica', colour: '#334155', align: 'left', bold: false, italic: false, show_label: false, z: 2 },
  base_price: { selected: true, x: 40, y: 60, w: 56, h: 16, font_size: 12, font_family: 'Helvetica-Bold', colour: '#16a34a', align: 'left', bold: true, italic: false, show_label: true, z: 2 },
  batting: { selected: true, x: 40, y: 78, w: 28, h: 14, font_size: 10, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, z: 2 },
  bowling: { selected: true, x: 68, y: 78, w: 28, h: 14, font_size: 10, font_family: 'Helvetica', colour: '#64748b', align: 'left', bold: false, italic: false, show_label: true, z: 2 },
}

const FIELD_LABELS: Record<string, string> = {
  player_photo: 'Photo Box',
  player_number: 'Player Number (Serial)',
  name: 'Player Name',
  category: 'Category Badge',
  role: 'Specialist Role',
  base_price: 'Base Price',
  batting: 'Batting Style',
  bowling: 'Bowling Style',
}

export default function PdfDesignStudio({ auctionId }: PdfDesignStudioProps) {
  const [activeTab, setActiveTab] = useState<'category' | 'auction'>('category')
  const [cols, setCols] = useState<number>(3)
  const [rows, setRows] = useState<number>(4)
  const [cardFill, setCardFill] = useState<string>('#ffffff')
  const [accentColour, setAccentColour] = useState<string>('#2563eb')
  const [elements, setElements] = useState<Record<string, CardElement>>(DEFAULT_CARD_ELEMENTS)
  const [selectedKey, setSelectedKey] = useState<string>('name')
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
        if (d.cols) setCols(d.cols)
        if (d.rows) setRows(d.rows)
        if (d.card_fill) setCardFill(d.card_fill)
        if (d.accent_colour) setAccentColour(d.accent_colour)
        if (d.elements) setElements({ ...DEFAULT_CARD_ELEMENTS, ...d.elements })
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
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/export_cards_pdf/?cols=${cols}&rows=${rows}`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Player_Cards_${cols}x${rows}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to download cards PDF', err)
      const downloadUrl = `${apiBase}/v1/auction/console/${auctionId}/export_cards_pdf/?cols=${cols}&rows=${rows}`
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
  const sampleCount = Math.min(cols * rows, 8)

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            PDF Design Studio & Printable Sheet Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Design one player card. Choose your grid dimensions and the print engine automatically repeats it across every A4 page.
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
            Download Player Cards PDF
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
          {/* Settings Panel (Left 4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Format Selector */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Format & Grid</span>
                <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">A4 Standard</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('category')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition ${
                    activeTab === 'category'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Category Wise
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('auction')}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition ${
                    activeTab === 'auction'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Auction Format
                </button>
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
                        {n} Columns
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Rows per Page</label>
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

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Card Background</label>
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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Accent Border</label>
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
            </div>

            {/* Elements Checklist */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Card Information</span>
                <span className="text-[10px] text-slate-500 font-medium">Click to edit box</span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
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

                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                        el.show_label
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Label: {el.show_label ? 'Yes' : 'No'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Element Properties Box */}
            {selectedEl && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    {FIELD_LABELS[selectedKey] || selectedKey} Properties
                  </span>
                </div>

                {/* Show Field Name Radio */}
                <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-zinc-900 block">
                    Show Field Name Label:
                  </span>
                  <div className="flex items-center gap-4 text-xs pt-1">
                    <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="show_label_radio"
                        checked={selectedEl.show_label === true}
                        onChange={() => updateProp(selectedKey, 'show_label', true)}
                        className="text-indigo-600"
                      />
                      <span>Yes (e.g. "Base Price: ₹50,000")</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="show_label_radio"
                        checked={selectedEl.show_label === false}
                        onChange={() => updateProp(selectedKey, 'show_label', false)}
                        className="text-indigo-600"
                      />
                      <span>No (Value Only)</span>
                    </label>
                  </div>
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
          </div>

          {/* Interactive Live Page Preview (Right 8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-indigo-600" />
                Live Page Grid Preview ({cols} Columns × {rows} Rows)
              </span>
              <span className="text-[11px] text-slate-500">First card is the active master template</span>
            </div>

            {/* A4 Paper Simulation Canvas */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 overflow-hidden flex justify-center shadow-inner">
              <div
                className="w-full max-w-[700px] aspect-[1/1.414] bg-white text-slate-900 rounded-xl shadow-xl p-5 flex flex-col relative select-none border border-slate-300"
              >
                {/* Simulated Sheet Header */}
                <div className="border-b border-slate-200 pb-2 mb-3 flex items-center justify-between text-[11px] font-bold text-slate-800">
                  <span className="uppercase tracking-wider">Tournament Player Profile Sheet</span>
                  <span className="text-slate-500 font-mono">Page 1 • {cols * rows} Players per Page</span>
                </div>

                {/* Grid */}
                <div
                  className="grid gap-2.5 flex-1"
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

                      {/* Render Card Elements */}
                      {Object.entries(elements).map(([key, el]) => {
                        if (!el.selected) return null
                        const isPhoto = key === 'player_photo'

                        let sampleText = ''
                        if (key === 'player_number') sampleText = el.show_label ? `NO. #${cIdx + 1}` : `#${cIdx + 1}`
                        else if (key === 'name') sampleText = el.show_label ? 'NAME: Virat Kohli' : 'Virat Kohli'
                        else if (key === 'category') sampleText = el.show_label ? 'CAT: Icon' : 'Icon'
                        else if (key === 'role') sampleText = el.show_label ? 'ROLE: Batsman' : 'Top-Order Batsman'
                        else if (key === 'base_price') sampleText = el.show_label ? 'BASE: ₹5,000' : '₹5,000'
                        else if (key === 'batting') sampleText = el.show_label ? 'BAT: Right' : 'Right-Hand'
                        else if (key === 'bowling') sampleText = el.show_label ? 'BOWL: Right Fast' : 'Right-Arm'

                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedKey(key)}
                            className={`absolute flex items-center overflow-hidden cursor-pointer ${
                              cIdx === 0 && selectedKey === key ? 'ring-1 ring-indigo-500' : ''
                            } ${isPhoto ? 'bg-slate-100 border border-slate-200 justify-center text-[8px] text-slate-500 font-bold' : ''}`}
                            style={{
                              left: `${el.x}%`,
                              top: `${el.y}%`,
                              width: `${el.w}%`,
                              height: `${el.h}%`,
                              fontSize: `${Math.max(6, Math.round(el.font_size * 0.7))}px`,
                              color: el.colour,
                              fontWeight: el.bold ? 800 : 400,
                              justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
                              zIndex: el.z,
                            }}
                          >
                            {isPhoto ? 'PHOTO' : sampleText}
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
