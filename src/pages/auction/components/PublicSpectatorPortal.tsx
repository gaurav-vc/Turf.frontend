import { useState, useEffect } from 'react'
import { Eye, Shield, Trophy, Clock, Copy, Check, ExternalLink } from 'lucide-react'
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
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-500" />
              Public Fan Spectator Viewer
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              No-login, public responsive live auction link for fans, players, and spectators.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggle}
              className={`text-xs font-bold rounded-xl ${
                publicLink?.enabled
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  : 'border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100'
              }`}
            >
              {publicLink?.enabled ? 'Active & Live' : 'Link Disabled'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRegenerate}
              className="text-xs text-slate-600 hover:text-zinc-900 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Regenerate Token
            </Button>
          </div>
        </div>

        {/* Link box */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">
              Shareable Spectator Link:
            </span>
            <span className="font-mono text-xs text-zinc-900 font-semibold truncate block select-all">
              {publicUrl || 'Generating public link...'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {publicUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(publicUrl, '_blank')}
                className="border-slate-300 text-zinc-800 text-xs font-bold rounded-xl hover:bg-slate-100"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1 text-slate-500" /> Open Viewer
              </Button>
            )}
            <Button
              size="sm"
              onClick={copyUrl}
              className="bg-amber-500 text-zinc-950 font-black hover:bg-amber-600 text-xs rounded-xl shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-900" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied Link!' : 'Copy Share Link'}
            </Button>
          </div>
        </div>

        {/* Features highlight */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <Shield className="h-5 w-5 text-blue-600 mb-2" />
            <span className="font-bold text-zinc-900 text-xs block">Public Anonymity</span>
            <p className="text-[11px] text-slate-600 mt-1">
              Viewer exposes strictly public tournament data with no login credentials required.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <Clock className="h-5 w-5 text-emerald-600 mb-2" />
            <span className="font-bold text-zinc-900 text-xs block">1.2s Real-Time Polling</span>
            <p className="text-[11px] text-slate-600 mt-1">
              Fans see bid updates, hammer drops, and player transitions in real-time.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <Trophy className="h-5 w-5 text-amber-500 mb-2" />
            <span className="font-bold text-zinc-900 text-xs block">Franchise Leaderboard</span>
            <p className="text-[11px] text-slate-600 mt-1">
              Spectators track wallet purse, players bought, and remaining team quota counts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
