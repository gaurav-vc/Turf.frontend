import { useState, useEffect } from 'react'
import { Tv, Copy, ExternalLink, Check, Info, Sliders, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'
import OverlayDesignerStudio from './OverlayDesignerStudio'

interface OverlayStudioProps {
  auctionId: string
}

export default function OverlayStudio({ auctionId }: OverlayStudioProps) {
  const [publicToken, setPublicToken] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [studioTab, setStudioTab] = useState<'presets' | 'designer'>('presets')

  useEffect(() => {
    loadToken()
  }, [auctionId])

  const loadToken = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/public_link/`)
      if (res.data?.public_token) {
        setPublicToken(res.data.public_token)
      }
    } catch (err) {
      console.error('Failed to load public token for overlays', err)
    } finally {
      setLoading(false)
    }
  }

  const baseUrl = window.location.origin

  const presets = [
    {
      key: 'ipl_card',
      name: 'IPL Broadcast Mega Card (Star Sports / JioCinema Style)',
      description: 'Television broadcast-grade pop-up graphics with 3D player cutout, dynamic neon rim, gold live bid counter, leading team banner, and purse ceiling.',
      url: publicToken ? `${baseUrl}/auction/overlay/${publicToken}?type=ipl_card` : '',
      resolution: '1920 × 1080 (Transparent Full Canvas)',
      position: 'Bottom Center / Lower Third',
      highlight: true,
    },
    {
      key: 'lower_third',
      name: 'Lower Third Broadcast Ticker',
      description: 'Transparent lower-third banner displaying the active player lot, high bidder, current bid, and base price.',
      url: publicToken ? `${baseUrl}/auction/overlay/${publicToken}?type=lower_third` : '',
      resolution: '1920 × 280 (or 1920 × 1080 full canvas)',
      position: 'Bottom of screen',
    },
    {
      key: 'scoreboard',
      name: 'Top Broadcast Scoreboard',
      description: 'Header ticker showing round, category badge, player number, current bid, and franchise wallet status.',
      url: publicToken ? `${baseUrl}/auction/overlay/${publicToken}?type=scoreboard` : '',
      resolution: '1920 × 180 (or 1920 × 1080 full canvas)',
      position: 'Top of screen',
    },
    {
      key: 'sponsor_strip',
      name: 'Franchise Wallet & Sponsor Strip',
      description: 'Continuous smooth scrolling marquee ticker displaying all team purse balances and sponsor brand logos.',
      url: publicToken ? `${baseUrl}/auction/overlay/${publicToken}?type=sponsor_strip` : '',
      resolution: '1920 × 90',
      position: 'Bottom edge',
    },
  ]

  const copyUrl = (key: string, url: string) => {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
            <Tv className="w-5 h-5 text-rose-600" />
            OBS & Streaming Overlay Studio
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Transparent, real-time browser source overlays for YouTube Live, Twitch, OBS Studio, and vMix.
          </p>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="flex items-center rounded-2xl bg-slate-100 p-1 border border-slate-200 shadow-xs">
          <button
            onClick={() => setStudioTab('presets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              studioTab === 'presets'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-slate-600 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Built-in Presets</span>
          </button>
          <button
            onClick={() => setStudioTab('designer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              studioTab === 'designer'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-zinc-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>🎨 Overlay Designer & Video Studio</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading overlay presets...</div>
      ) : !publicToken ? (
        <div className="p-8 border border-dashed border-slate-300 rounded-2xl bg-white text-center text-slate-600 text-xs font-semibold shadow-sm">
          Public live link must be enabled first to generate secure overlay tokens.
        </div>
      ) : studioTab === 'designer' ? (
        <OverlayDesignerStudio
          auctionId={auctionId}
          publicToken={publicToken}
          onBack={() => setStudioTab('presets')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preset Cards (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Built-in Overlay Presets</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStudioTab('designer')}
                className="text-xs font-bold rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 flex items-center gap-1"
              >
                <Sliders className="w-3.5 h-3.5" /> Open 16:9 Canvas Designer
              </Button>
            </div>

            {presets.map((p: any) => (
              <div
                key={p.key}
                className={`bg-white border rounded-2xl p-5 shadow-sm space-y-3 transition-all ${
                  p.highlight
                    ? 'border-amber-400/80 bg-gradient-to-br from-white via-amber-50/20 to-white ring-2 ring-amber-400/20 shadow-md'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                          p.highlight ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                      ></span>
                      <h4 className="text-sm font-black text-zinc-900">{p.name}</h4>
                      {p.highlight && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-white tracking-wider shadow-xs">
                          ⭐ TV BROADCAST
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{p.description}</p>
                  </div>

                  <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold w-fit border border-slate-200">
                    {p.resolution}
                  </span>
                </div>

                {/* URL display box */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex-wrap sm:flex-nowrap">
                  <input
                    readOnly
                    value={p.url}
                    className="w-full bg-transparent text-xs text-slate-800 font-mono font-semibold focus:outline-none truncate select-all"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyUrl(p.key, p.url)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs shrink-0 flex items-center gap-1.5 rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    {copiedKey === p.key ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy URL
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(p.url, '_blank')}
                    className="text-slate-600 hover:text-zinc-900 shrink-0 p-2 rounded-xl cursor-pointer"
                    title="Open Test View"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setStudioTab('designer')}
                    className="bg-rose-600 hover:bg-rose-500 text-white shrink-0 text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Customize background video, placement, and elements in 16:9 designer"
                  >
                    🎨 Design Screen
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* OBS Setup Guide (1 col) */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" />
                How to use in OBS Studio
              </h3>

              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside font-medium leading-relaxed">
                <li>Open <b>OBS Studio</b> or <b>vMix</b>.</li>
                <li>In your Scenes panel, click <b>+</b> and choose <b>Browser Source</b>.</li>
                <li>Name the source (e.g. <i>"Auction Lower Third"</i>).</li>
                <li>Paste the copied overlay URL into the <b>URL</b> field.</li>
                <li>Set Width: <b>1920</b> and Height: <b>1080</b> (or custom strip height).</li>
                <li>Tick <b>"Shutdown source when not visible"</b> to save CPU during breaks.</li>
                <li>Position the browser source layer above your webcam or gameplay video feed.</li>
              </ol>

              <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 font-medium">
                <b>Alpha Channel Ready:</b> Backgrounds are 100% transparent CSS so your live cameras and stadium video stream pass through crisply.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
