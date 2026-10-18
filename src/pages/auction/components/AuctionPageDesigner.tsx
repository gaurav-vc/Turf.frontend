import { useState, useEffect } from 'react'
import { Layout, Check, RefreshCw, Eye, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'

interface AuctionPageDesignerProps {
  auctionId: string
}

const FONT_OPTIONS = ['Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Impact']

const DEFAULT_DESIGN = {
  elements: {
    player_name: { show_label: false, font_family: 'Arial', font_size: 36, colour: '#FFFFFF' },
    player_category: { show_label: false, font_family: 'Arial', font_size: 22, colour: '#FFD54A' },
    player_number: { show_label: false, font_family: 'Arial', font_size: 16, colour: '#B8C7DA' },
    role: { show_label: false, font_family: 'Arial', font_size: 16, colour: '#D8E2EF' },
    current_bid: { show_label: true, font_family: 'Arial', font_size: 36, colour: '#FFD54A' },
    bidder_name: { show_label: false, font_family: 'Arial', font_size: 18, colour: '#FFFFFF' },
    balance: { show_label: true, font_family: 'Arial', font_size: 13, colour: '#B9C7D7' },
    max_bid: { show_label: true, font_family: 'Arial', font_size: 13, colour: '#FFFFFF' },
    base_price: { show_label: true, font_family: 'Arial', font_size: 16, colour: '#FFFFFF' },
    batting_style: { show_label: true, font_family: 'Arial', font_size: 12, colour: '#FFFFFF' },
    bowling_style: { show_label: true, font_family: 'Arial', font_size: 12, colour: '#FFFFFF' },
  }
}

export default function AuctionPageDesigner({ auctionId }: AuctionPageDesignerProps) {
  const [design, setDesign] = useState<any>(DEFAULT_DESIGN)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    fetchDesign()
  }, [auctionId])

  const fetchDesign = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/page_design/`)
      if (res.data && res.data.elements) {
        setDesign(res.data)
      } else {
        setDesign(DEFAULT_DESIGN)
      }
    } catch (err) {
      console.error('Failed to load page design', err)
      setDesign(DEFAULT_DESIGN)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.post(`/v1/auction/console/${auctionId}/page_design/`, design)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (err) {
      console.error('Failed to save design', err)
    } finally {
      setSaving(false)
    }
  }

  const updateElementProp = (elementKey: string, prop: string, value: any) => {
    setDesign((prev: any) => {
      const copy = { ...prev }
      if (!copy.elements) copy.elements = {}
      if (!copy.elements[elementKey]) copy.elements[elementKey] = {}
      copy.elements[elementKey][prop] = value
      return copy
    })
  }

  if (loading || !design) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const elements = design.elements || {}

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layout className="h-5 w-5 text-amber-400" />
            Auction Page Broadcast Designer
          </h2>
          <p className="text-xs text-slate-400">
            Configure broadcast elements, show/hide field labels, font typography, and layout zones.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
        >
          {savedSuccess ? (
            <>
              <Check className="h-4 w-4 mr-1 text-emerald-950" /> Saved!
            </>
          ) : (
            'Save Broadcast Layout'
          )}
        </Button>
      </div>

      {/* Grid: Preview & Element Customizer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Live Broadcast Card Preview (7 cols) */}
        <div className="lg:col-span-7">
          <div
            className="sticky top-6 rounded-2xl border border-slate-800 p-6"
            style={{ backgroundColor: '#020617', backgroundImage: 'none', boxShadow: 'none' }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Broadcast Stage Live Preview
              </span>
              <span className="text-[10px] text-slate-400">Auto-Fit Font Scaling Active</span>
            </div>

            {/* Simulated Live Broadcast Display */}
            <div className="relative min-h-[340px] rounded-xl border border-white/10 bg-slate-900/90 p-5 shadow-inner flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div
                    style={{
                      color: elements.player_category?.colour || '#FFD54A',
                      fontSize: `${Math.min(elements.player_category?.font_size || 22, 24)}px`,
                      fontFamily: elements.player_category?.font_family || 'Arial',
                    }}
                    className="font-bold uppercase tracking-wider"
                  >
                    {elements.player_category?.show_label ? 'Category: ' : ''}ICON PLAYER
                  </div>
                  <div
                    style={{
                      color: elements.player_number?.colour || '#B8C7DA',
                      fontSize: `${elements.player_number?.font_size || 16}px`,
                      fontFamily: elements.player_number?.font_family || 'Arial',
                    }}
                    className="font-mono font-bold"
                  >
                    {elements.player_number?.show_label ? 'No: ' : ''}#12
                  </div>
                </div>

                <div className="mt-3">
                  <div
                    style={{
                      color: elements.player_name?.colour || '#FFFFFF',
                      fontSize: `${Math.min(elements.player_name?.font_size || 36, 36)}px`,
                      fontFamily: elements.player_name?.font_family || 'Arial',
                    }}
                    className="font-extrabold tracking-tight truncate"
                  >
                    {elements.player_name?.show_label ? 'Player: ' : ''}Virat Kohli
                  </div>
                  <div
                    style={{
                      color: elements.role?.colour || '#D8E2EF',
                      fontSize: `${elements.role?.font_size || 16}px`,
                      fontFamily: elements.role?.font_family || 'Arial',
                    }}
                    className="font-semibold text-slate-300"
                  >
                    {elements.role?.show_label ? 'Role: ' : ''}Top-Order Batsman
                  </div>
                </div>

                <div className="mt-4 flex gap-4 text-xs">
                  <div style={{ color: elements.batting_style?.colour || '#FFFFFF' }}>
                    {elements.batting_style?.show_label ? 'Batting Style: ' : ''}Right Hand
                  </div>
                  <div style={{ color: elements.bowling_style?.colour || '#FFFFFF' }}>
                    {elements.bowling_style?.show_label ? 'Bowling Style: ' : ''}Right Arm Medium
                  </div>
                </div>
              </div>

              {/* Bottom Bid Area */}
              <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-300 uppercase">
                    {elements.current_bid?.show_label ? 'Current Bid Amount' : 'Bid'}
                  </span>
                  <p
                    style={{
                      color: elements.current_bid?.colour || '#FFD54A',
                      fontSize: `${Math.min(elements.current_bid?.font_size || 36, 36)}px`,
                      fontFamily: elements.current_bid?.font_family || 'Arial',
                    }}
                    className="font-mono font-extrabold"
                  >
                    ₹5,00,000
                  </p>
                </div>
                <div className="text-right">
                  <p
                    style={{
                      color: elements.bidder_name?.colour || '#FFFFFF',
                      fontSize: `${elements.bidder_name?.font_size || 18}px`,
                      fontFamily: elements.bidder_name?.font_family || 'Arial',
                    }}
                    className="font-bold"
                  >
                    Mumbai Titans
                  </p>
                  <p
                    style={{
                      color: elements.balance?.colour || '#B9C7D7',
                      fontSize: `${elements.balance?.font_size || 13}px`,
                    }}
                    className="text-xs"
                  >
                    {elements.balance?.show_label ? 'Balance: ' : ''}₹95,00,000
                  </p>
                  <p
                    style={{
                      color: elements.max_bid?.colour || '#FFFFFF',
                      fontSize: `${elements.max_bid?.font_size || 13}px`,
                    }}
                    className="text-xs font-semibold text-amber-300"
                  >
                    {elements.max_bid?.show_label ? 'Max Bid: ' : ''}₹85,00,000
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Element Settings Editor (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
              <Type className="h-4 w-4 text-amber-400" />
              Element Properties & Labels
            </h3>

            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
              {[
                { key: 'player_name', label: 'Player Name' },
                { key: 'player_category', label: 'Player Category' },
                { key: 'player_number', label: 'Player Number' },
                { key: 'role', label: 'Role' },
                { key: 'current_bid', label: 'Current Bid' },
                { key: 'bidder_name', label: 'Bidder Name' },
                { key: 'balance', label: 'Balance' },
                { key: 'max_bid', label: 'Max Bid' },
                { key: 'base_price', label: 'Base Price' },
                { key: 'batting_style', label: 'Batting Style' },
                { key: 'bowling_style', label: 'Bowling Style' },
              ].map(({ key, label }) => {
                const el = elements[key] || {}
                return (
                  <div key={key} className="rounded-xl border border-white/5 bg-white/5 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{label}</span>
                      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={el.show_label ?? false}
                          onChange={(e) => updateElementProp(key, 'show_label', e.target.checked)}
                          className="rounded border-white/20 text-amber-500 focus:ring-0"
                        />
                        Show Label
                      </label>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {/* Font Family */}
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Font</span>
                        <select
                          value={el.font_family || 'Arial'}
                          onChange={(e) => updateElementProp(key, 'font_family', e.target.value)}
                          className="w-full rounded border border-white/10 bg-slate-800 p-1 text-white text-xs"
                        >
                          {FONT_OPTIONS.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Font Size */}
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Size (px)</span>
                        <input
                          type="number"
                          value={el.font_size || 16}
                          onChange={(e) => updateElementProp(key, 'font_size', parseInt(e.target.value) || 16)}
                          className="w-full rounded border border-white/10 bg-slate-800 p-1 text-white text-xs font-mono"
                        />
                      </div>

                      {/* Color */}
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Color</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            value={el.colour || '#ffffff'}
                            onChange={(e) => updateElementProp(key, 'colour', e.target.value)}
                            className="h-6 w-6 rounded border-0 cursor-pointer bg-transparent"
                          />
                          <span className="font-mono text-[10px] text-slate-400">{el.colour || '#ffffff'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
