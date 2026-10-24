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
  const [configuredGroups, setConfiguredGroups] = useState<any[]>([])

  useEffect(() => {
    loadDrawState()
    loadTeams()
    loadMasterSetupGroups()
  }, [auctionId])

  const loadMasterSetupGroups = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/setup_rules/`)
      const grps = res.data?.config?.groups || res.data?.groups || []
      setConfiguredGroups(grps)
    } catch (err) {
      console.error('Failed to load master setup groups', err)
    }
  }

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
      const gNames = configuredGroups.length > 0
        ? configuredGroups.map((g) => g.name)
        : ['Group A', 'Group B']
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-zinc-900 flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-purple-600" />
            Tournament Interactive Blind Group Draw
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Server-side blind lottery shuffle. Group names remain concealed until card reveal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cards.length === 0 ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 font-bold shadow-2xs">
                <Trophy className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>
                  {configuredGroups.length > 0
                    ? `Master Setup: ${configuredGroups.length} Groups (${configuredGroups.map((g) => g.name).join(', ')})`
                    : '2 Default Groups (Configure in Master Setup & Rules)'}
                </span>
              </div>
              <Button
                onClick={handleGenerateDraw}
                disabled={actionLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                <Shuffle className="h-4 w-4 mr-1.5" />
                {actionLoading ? 'Generating...' : 'Generate Blind Cards'}
              </Button>
            </div>
          ) : (
            <>
              {/* Franchise Selector for Assignment */}
              {teams.length > 0 && (
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-zinc-900 font-semibold max-w-xs focus:outline-none"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      Assign: {t.team_name || t.name}
                    </option>
                  ))}
                </select>
              )}

              <Button
                variant="outline"
                onClick={handleResetDraw}
                disabled={actionLoading}
                className="border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold"
              >
                <RotateCcw className="h-4 w-4 mr-1.5 text-rose-600" /> Reset Draw
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
                className={`relative flex min-h-[170px] flex-col justify-between rounded-2xl border p-4 text-center transition-all ${
                  isRevealed
                    ? 'border-amber-300 bg-amber-50/70 shadow-sm'
                    : isAssigned
                    ? 'border-purple-200 bg-purple-50/60 shadow-sm'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                {/* Card Number Badge */}
                <div className="flex items-center justify-between">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 font-mono text-xs font-black text-zinc-900 border border-slate-200">
                    #{c.card_number}
                  </span>
                  {isRevealed && (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-950">
                      REVEALED
                    </span>
                  )}
                </div>

                {/* Team Name or Group Display */}
                <div className="my-2">
                  {isRevealed ? (
                    <div>
                      <p className="text-xl font-black tracking-tight text-amber-700">
                        {c.group_name}
                      </p>
                      <p className="mt-1 text-xs font-bold text-zinc-900 truncate">{c.team_name || 'Team Assigned'}</p>
                    </div>
                  ) : isAssigned ? (
                    <div>
                      <p className="text-xs text-slate-500 font-semibold">Assigned Team:</p>
                      <p className="text-sm font-black text-purple-700 truncate mt-1">{c.team_name}</p>
                    </div>
                  ) : (
                    <div className="text-slate-400">
                      <Shield className="h-8 w-8 mx-auto mb-1 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">UNASSIGNED</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100">
                  {!isAssigned ? (
                    <Button
                      size="sm"
                      onClick={() => handleAssignTeam(c.card_number)}
                      disabled={actionLoading || teams.length === 0}
                      className="w-full h-7 text-[10px] bg-purple-600 text-white font-bold hover:bg-purple-700 rounded-lg"
                    >
                      Assign Card
                    </Button>
                  ) : !isRevealed ? (
                    <Button
                      size="sm"
                      onClick={() => handleRevealCard(c.card_number)}
                      disabled={actionLoading}
                      className="w-full h-7 text-[10px] bg-amber-500 text-zinc-950 font-black hover:bg-amber-600 rounded-lg"
                    >
                      <Eye className="h-3 w-3 mr-1" /> REVEAL
                    </Button>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                      ✓ Group Locked
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-black text-zinc-900">No Blind Cards Generated</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Choose your group count above and generate blind draw cards for active franchise teams.
          </p>
        </div>
      )}
    </div>
  )
}
