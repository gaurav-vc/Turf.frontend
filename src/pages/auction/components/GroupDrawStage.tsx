import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shuffle, Eye, RotateCcw, Shield, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/api/apiClient'

interface GroupDrawStageProps {
  auctionId: string
}

export default function GroupDrawStage({ auctionId }: GroupDrawStageProps) {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [teams, setTeams] = useState<any[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [groupCount, setGroupCount] = useState<number>(2)

  useEffect(() => {
    loadDrawState()
    loadTeams()
  }, [auctionId])

  const loadDrawState = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/group_draw/`)
      setCards(res.data || [])
    } catch (err) {
      console.error('Failed to load group draw', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/teams/?auction=${auctionId}`)
      const data = res.data.results || res.data || []
      setTeams(data)
      if (data.length > 0) setSelectedTeamId(data[0].id)
    } catch (err) {
      console.error('Failed to load teams', err)
    }
  }

  const handleGenerateDraw = async () => {
    setActionLoading(true)
    try {
      const gNames = Array.from({ length: groupCount }, (_, i) => `Group ${String.fromCharCode(65 + i)}`)
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/group_draw/`, {
        action: 'generate',
        groups: gNames,
      })
      setCards(res.data || [])
    } catch (err) {
      console.error('Generate draw failed', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAssignTeam = async (cardNumber: number) => {
    if (!selectedTeamId) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/group_draw/`, {
        action: 'assign',
        card_number: cardNumber,
        team_id: selectedTeamId,
      })
      setCards(res.data || [])
    } catch (err) {
      console.error('Assign team failed', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevealCard = async (cardNumber: number) => {
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/group_draw/`, {
        action: 'reveal',
        card_number: cardNumber,
      })
      setCards(res.data || [])
    } catch (err) {
      console.error('Reveal card failed', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetDraw = async () => {
    if (!confirm('Are you sure you want to reset the group draw?')) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/group_draw/`, {
        action: 'reset',
      })
      setCards(res.data || [])
    } catch (err) {
      console.error('Reset draw failed', err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Control Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-purple-400" />
            Tournament Interactive Blind Group Draw
          </h2>
          <p className="text-xs text-slate-400">
            Server-side blind lottery shuffle. Group names remain concealed until card reveal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cards.length === 0 ? (
            <>
              <select
                value={groupCount}
                onChange={(e) => setGroupCount(parseInt(e.target.value) || 2)}
                className="rounded-lg border border-white/20 bg-slate-800 p-2 text-xs text-white"
              >
                <option value={2}>2 Groups (A & B)</option>
                <option value={3}>3 Groups (A, B, C)</option>
                <option value={4}>4 Groups (A, B, C, D)</option>
              </select>
              <Button
                onClick={handleGenerateDraw}
                disabled={actionLoading || teams.length === 0}
                className="bg-purple-600 font-bold text-white hover:bg-purple-500"
              >
                <Shuffle className="h-4 w-4 mr-1.5" />
                Generate Blind Cards
              </Button>
            </>
          ) : (
            <>
              {/* Franchise Selector for Assignment */}
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="rounded-lg border border-white/20 bg-slate-800 p-2 text-xs text-white max-w-xs"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    Assign: {t.team_name || t.name}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                onClick={handleResetDraw}
                disabled={actionLoading}
                className="border-red-500/40 text-red-300 hover:bg-red-500/20"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" /> Reset Draw
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {cards.map((c) => {
            const isAssigned = !!c.team_name
            const isRevealed = c.revealed

            return (
              <motion.div
                key={c.id || c.card_number}
                whileHover={{ scale: 1.02 }}
                className={`relative flex min-h-[170px] flex-col justify-between rounded-2xl border p-4 text-center shadow-xl transition-all ${
                  isRevealed
                    ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/20 to-slate-900 shadow-amber-950/40'
                    : isAssigned
                    ? 'border-purple-500/40 bg-slate-900 shadow-purple-950/20'
                    : 'border-white/10 bg-slate-900/60'
                }`}
              >
                {/* Card Number Badge */}
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 font-mono text-xs font-bold text-white">
                    #{c.card_number}
                  </span>
                  {isRevealed && (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-extrabold uppercase text-slate-950">
                      REVEALED
                    </span>
                  )}
                </div>

                {/* Team Name or Group Display */}
                <div className="my-2">
                  {isRevealed ? (
                    <div>
                      <p className="text-xl font-extrabold tracking-tight text-amber-300">
                        {c.group_name}
                      </p>
                      <p className="mt-1 text-xs font-bold text-white truncate">{c.team_name}</p>
                    </div>
                  ) : isAssigned ? (
                    <div>
                      <p className="text-xs text-slate-400">Assigned Team:</p>
                      <p className="text-sm font-bold text-purple-300 truncate mt-1">{c.team_name}</p>
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <Shield className="h-8 w-8 mx-auto mb-1 text-slate-600" />
                      <span className="text-[10px] font-semibold uppercase">UNASSIGNED</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-white/5">
                  {!isAssigned ? (
                    <Button
                      size="sm"
                      onClick={() => handleAssignTeam(c.card_number)}
                      disabled={actionLoading}
                      className="w-full h-7 text-[10px] bg-purple-600 text-white font-semibold hover:bg-purple-500"
                    >
                      Assign Card
                    </Button>
                  ) : !isRevealed ? (
                    <Button
                      size="sm"
                      onClick={() => handleRevealCard(c.card_number)}
                      disabled={actionLoading}
                      className="w-full h-7 text-[10px] bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                    >
                      <Eye className="h-3 w-3 mr-1" /> REVEAL
                    </Button>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                      ✓ Group Locked
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-12 text-center backdrop-blur-xl">
          <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-300">No Blind Cards Generated</h3>
          <p className="text-xs text-slate-500 mt-1">
            Choose your group count above and generate blind draw cards for active franchise teams.
          </p>
        </div>
      )}
    </div>
  )
}
