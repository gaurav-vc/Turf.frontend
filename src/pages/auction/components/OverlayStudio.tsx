import { useState, useEffect } from 'react'
import { Tv, Copy, ExternalLink, Check, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'

interface OverlayStudioProps {
  auctionId: string
}

export default function OverlayStudio({ auctionId }: OverlayStudioProps) {
  const [publicToken, setPublicToken] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-rose-500" />
            OBS & Streaming Overlay Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent, real-time browser source overlays for YouTube Live, Twitch, OBS Studio, and vMix.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading overlay presets...</div>
      ) : !publicToken ? (
        <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
          Public live link must be enabled first to generate secure overlay tokens.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preset Cards (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-white">Built-in Overlay Presets</h3>

            {presets.map((p) => (
              <div
                key={p.key}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                      {p.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono w-fit">
                    {p.resolution}
                  </span>
                </div>

                {/* URL display box */}
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2">
                  <input
                    readOnly
                    value={p.url}
                    className="w-full bg-transparent text-xs text-slate-300 font-mono focus:outline-none truncate"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyUrl(p.key, p.url)}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs shrink-0 flex items-center gap-1.5"
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
                    className="text-slate-400 hover:text-white shrink-0 p-2"
                    title="Open Test View"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* OBS Setup Guide (1 col) */}
          <div className="space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-400" />
                How to use in OBS Studio
              </h3>

              <ol className="text-xs text-slate-300 space-y-2 list-decimal pl-4">
                <li>
                  Open <b>OBS Studio</b> or <b>vMix</b>.
                </li>
                <li>
                  In your Scenes panel, click <b>+</b> and choose <b>Browser Source</b>.
                </li>
                <li>Name the source (e.g. <i>"Auction Lower Third"</i>).</li>
                <li>
                  Paste the copied overlay URL into the <b>URL</b> field.
                </li>
                <li>
                  Set <b>Width: 1920</b> and <b>Height: 1080</b> (or custom strip height).
                </li>
                <li>
                  Tick <b>"Shutdown source when not visible"</b> to save CPU during breaks.
                </li>
                <li>Position the browser source layer above your webcam or gameplay video feed.</li>
              </ol>

              <div className="mt-4 p-3 bg-sky-950/40 border border-sky-800/40 rounded-lg text-[11px] text-sky-300">
                <b>Alpha Channel Ready:</b> Backgrounds are 100% transparent CSS so your live cameras and stadium video stream pass through crisply.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
