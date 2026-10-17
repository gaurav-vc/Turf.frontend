import { useState, useEffect } from 'react'
import { Eye, Shield, Trophy, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'

interface PublicSpectatorPortalProps {
  auctionId: string
}

export default function PublicSpectatorPortal({ auctionId }: PublicSpectatorPortalProps) {
  const [publicLink, setPublicLink] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadPublicLink()
  }, [auctionId])

  const loadPublicLink = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/public_link/`)
      setPublicLink(res.data)
    } catch (err) {
      console.error('Failed to load public link', err)
    }
  }

  const handleToggle = async () => {
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/public_link/`, {
        action: 'toggle',
      })
      setPublicLink(res.data)
    } catch (err) {
      console.error('Toggle public link failed', err)
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('Regenerating will invalidate the previous public link. Continue?')) return
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/public_link/`, {
        action: 'regenerate',
      })
      setPublicLink(res.data)
    } catch (err) {
      console.error('Regenerate public link failed', err)
    }
  }

  const publicUrl = publicLink?.public_token
    ? `${window.location.origin}/auction/live/${publicLink.public_token}`
    : ''

  const copyUrl = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-400" />
              Public Fan Spectator Viewer (Phase 2 V24)
            </h3>
            <p className="text-xs text-slate-400">
              No-login, public responsive live auction link for fans, players, and spectators.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggle}
              className={`text-xs ${
                publicLink?.enabled
                  ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-red-500/40 text-red-300 hover:bg-red-500/20'
              }`}
            >
              {publicLink?.enabled ? 'Active & Live' : 'Link Disabled'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRegenerate}
              className="text-xs text-slate-400 hover:text-white"
            >
              Regenerate Token
            </Button>
          </div>
        </div>

        {/* Link box */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3">
          <div className="truncate">
            <span className="text-[10px] text-slate-400 uppercase block mb-0.5">Shareable Public URL:</span>
            <span className="font-mono text-xs text-amber-300 truncate block">
              {publicUrl || 'Generating public link...'}
            </span>
          </div>
          <Button
            size="sm"
            onClick={copyUrl}
            className="bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shrink-0"
          >
            {copied ? 'Copied URL!' : 'Copy Share Link'}
          </Button>
        </div>

        {/* Features highlight */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/5 p-3.5">
            <Shield className="h-5 w-5 text-blue-400 mb-2" />
            <span className="font-bold text-white text-xs block">Public Anonymity</span>
            <p className="text-[11px] text-slate-400 mt-1">
              Viewer exposes strictly public tournament data with no login credentials required.
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 p-3.5">
            <Clock className="h-5 w-5 text-emerald-400 mb-2" />
            <span className="font-bold text-white text-xs block">1.2s Real-Time Polling</span>
            <p className="text-[11px] text-slate-400 mt-1">
              Fans see bid updates, hammer drops, and player transitions in real-time.
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 p-3.5">
            <Trophy className="h-5 w-5 text-amber-400 mb-2" />
            <span className="font-bold text-white text-xs block">Franchise Leaderboard</span>
            <p className="text-[11px] text-slate-400 mt-1">
              Spectators track wallet purse, players bought, and remaining team quota counts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
