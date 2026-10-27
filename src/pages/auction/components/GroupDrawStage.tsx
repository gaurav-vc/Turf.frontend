import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Shuffle, Eye, EyeOff, RotateCcw, Shield, Trophy, Sparkles,
  GripVertical, Search, Users, Check, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient, resolveMediaUrl } from '@/api/apiClient'

interface GroupDrawStageProps {
  auctionId: string
}

export default function GroupDrawStage({ auctionId }: GroupDrawStageProps) {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [teams, setTeams] = useState<any[]>([])
  const [configuredGroups, setConfiguredGroups] = useState<any[]>([])

  // Master Setup & Rules configuration states
  const [flipAnimation, setFlipAnimation] = useState<string>('3D Flip Horizontal')
  const [animationEnabled, setAnimationEnabled] = useState<boolean>(true)
  const [cardBgImage, setCardBgImage] = useState<string>('')
  const [cardColour, setCardColour] = useState<string>('#FFFFFF')

  // Left panel UI states
  const [teamSearchQuery, setTeamSearchQuery] = useState('')
  const [teamFilterTab, setTeamFilterTab] = useState<'all' | 'unassigned' | 'assigned'>('all')

  // Drag and drop states
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null)
  const [dragOverCardNumber, setDragOverCardNumber] = useState<number | null>(null)

  // Tracking recently revealed cards for triggering animations
  const [animatingCardNumbers, setAnimatingCardNumbers] = useState<number[]>([])

  const playRevealSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime
      const freqs = [659.25, 830.61, 987.77]
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, now + idx * 0.08)
        gain.gain.setValueAtTime(0, now + idx * 0.08)
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.55)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + idx * 0.08)
        osc.stop(now + idx * 0.08 + 0.6)
      })
    } catch {
      // Audio autoplay policy fallback
    }
  }

  const triggerCardAnimation = (cardNums: number[]) => {
    if (!animationEnabled || cardNums.length === 0) return
    setAnimatingCardNumbers((prev) => Array.from(new Set([...prev, ...cardNums])))
    playRevealSound()
    setTimeout(() => {
      setAnimatingCardNumbers((prev) => prev.filter((n) => !cardNums.includes(n)))
    }, 1300)
  }

  useEffect(() => {
    loadDrawState()
    loadTeams()
    loadMasterSetupGroups()
  }, [auctionId])

  const loadMasterSetupGroups = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/setup_rules/`)
      const cfg = res.data?.config || {}
      setConfiguredGroups(cfg.groups || [])
      if (cfg.group_card_animation) setFlipAnimation(cfg.group_card_animation)
      if (cfg.group_draw_animation_enabled !== undefined) {
        setAnimationEnabled(Boolean(cfg.group_draw_animation_enabled))
      }
      if (cfg.group_card_bg_image) setCardBgImage(cfg.group_card_bg_image)
      if (cfg.group_card_colour) setCardColour(cfg.group_card_colour)
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
    } catch (err) {
      console.error('Failed to load teams', err)
    }
  }

  // --- Assigned / Available Teams Computation ---
  const assignedTeamMap = useMemo(() => {
    const map = new Map<string, any>()
    cards.forEach((c) => {
      const teamId = c.team || c.team_id
      if (teamId) {
        map.set(String(teamId), c)
      }
      if (c.team_name) {
        map.set(c.team_name.trim().toLowerCase(), c)
      }
    })
    return map
  }, [cards])

  const isTeamAssigned = (t: any): boolean => {
    if (assignedTeamMap.has(String(t.id))) return true
    const name = (t.team_name || t.name || '').trim().toLowerCase()
    return !!name && assignedTeamMap.has(name)
  }

  const getCardForTeam = (t: any) => {
    return assignedTeamMap.get(String(t.id)) ||
      assignedTeamMap.get((t.team_name || t.name || '').trim().toLowerCase()) ||
      null
  }

  // Filtered available teams for the dropdowns (STRICTLY non-assigned)
  const availableTeams = useMemo(() => {
    return teams.filter((t) => !isTeamAssigned(t))
  }, [teams, assignedTeamMap])

  // Filtered teams list for the left panel
  const filteredTeamsList = useMemo(() => {
    return teams.filter((t) => {
      const name = (t.team_name || t.name || '').toLowerCase()
      const matchesSearch = !teamSearchQuery || name.includes(teamSearchQuery.toLowerCase())
      const assigned = isTeamAssigned(t)

      if (!matchesSearch) return false
      if (teamFilterTab === 'unassigned') return !assigned
      if (teamFilterTab === 'assigned') return assigned
      return true
    })
  }, [teams, teamSearchQuery, teamFilterTab, assignedTeamMap])

  // --- Live Group Log / Team Allocation Aggregator ---
  const groupLogs = useMemo(() => {
    const map: Record<string, { revealed: string[]; hidden: string[]; all: string[] }> = {}

    // Seed configured groups in correct order
    configuredGroups.forEach((g) => {
      map[g.name] = { revealed: [], hidden: [], all: [] }
    })

    // Populate from active cards
    cards.forEach((c) => {
      const gName = c.group_name || 'Group A'
      if (!map[gName]) {
        map[gName] = { revealed: [], hidden: [], all: [] }
      }
      if (c.team_name) {
        map[gName].all.push(c.team_name)
        if (c.revealed) {
          map[gName].revealed.push(c.team_name)
        } else {
          map[gName].hidden.push(c.team_name)
        }
      }
    })

    return map
  }, [cards, configuredGroups])

  // --- API Handlers ---
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

  const handleAssignTeam = async (cardNumber: number, teamId: string) => {
    if (!teamId) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/group_draw/`, {
        action: 'assign',
        card_number: cardNumber,
        team_id: teamId,
      })
      setCards(res.data || [])
    } catch (err) {
      console.error('Assign team failed', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnassignTeam = async (cardNumber: number) => {
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/group_draw/`, {
        action: 'unassign',
        card_number: cardNumber,
      })
      setCards(res.data || [])
    } catch (err) {
      console.error('Unassign team failed', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevealCard = async (cardNumber: number) => {
    triggerCardAnimation([cardNumber])
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

  const handleRevealAll = async () => {
    const unrevealedCardNums = cards.filter((c) => !c.revealed).map((c) => c.card_number)
    triggerCardAnimation(unrevealedCardNums)
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/group_draw/`, {
        action: 'reveal_all',
      })
      setCards(res.data || [])
    } catch (err) {
      console.error('Reveal all cards failed', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleHideAll = async () => {
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/group_draw/`, {
        action: 'hide_all',
      })
      setCards(res.data || [])
    } catch (err) {
      console.error('Hide all cards failed', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetDraw = async () => {
    if (!confirm('Are you sure you want to reset the group draw? All card assignments will be cleared.')) return
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

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, teamId: string) => {
    e.dataTransfer.setData('text/plain', teamId)
    e.dataTransfer.setData('application/json', JSON.stringify({ teamId }))
    setDraggedTeamId(teamId)
  }

  const handleDragEnd = () => {
    setDraggedTeamId(null)
    setDragOverCardNumber(null)
  }

  const handleCardDragOver = (e: React.DragEvent, cardNumber: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (dragOverCardNumber !== cardNumber) {
      setDragOverCardNumber(cardNumber)
    }
  }

  const handleCardDragLeave = (cardNumber: number) => {
    if (dragOverCardNumber === cardNumber) {
      setDragOverCardNumber(null)
    }
  }

  const handleCardDrop = (e: React.DragEvent, cardNumber: number) => {
    e.preventDefault()
    setDragOverCardNumber(null)
    const teamId = e.dataTransfer.getData('text/plain') || draggedTeamId
    if (teamId) {
      handleAssignTeam(cardNumber, teamId)
    }
    setDraggedTeamId(null)
  }

  // Quick auto-assign to first unassigned card
  const handleQuickAssignToNextCard = (teamId: string) => {
    const nextUnassignedCard = cards.find((c) => !c.team_name && !c.team)
    if (nextUnassignedCard) {
      handleAssignTeam(nextUnassignedCard.card_number, teamId)
    } else {
      alert('All available cards are already assigned!')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  const totalCards = cards.length
  const assignedCardsCount = cards.filter((c) => !!c.team_name).length
  const revealedCardsCount = cards.filter((c) => !!c.revealed).length

  return (
    <div className="space-y-5">
      {/* 1. Control Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-zinc-900 flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-purple-600" />
            Tournament Interactive Blind Group Draw
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Server-side lottery shuffle. Drag teams from the left panel onto cards or select via dropdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Animation ON/OFF Toggle Button */}
          <button
            type="button"
            onClick={() => setAnimationEnabled((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition shadow-2xs ${
              animationEnabled
                ? 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
            title="Toggle card flip animations on card reveal"
          >
            <Sparkles className={`w-3.5 h-3.5 ${animationEnabled ? 'text-purple-600' : 'text-slate-400'}`} />
            <span>Animation: {animationEnabled ? 'ON' : 'OFF'}</span>
            {animationEnabled && (
              <span className="text-[10px] font-mono text-purple-600 bg-purple-100/70 px-1.5 py-0.2 rounded font-semibold ml-0.5">
                {flipAnimation}
              </span>
            )}
          </button>

          {cards.length === 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 font-bold">
                <Trophy className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>
                  {configuredGroups.length > 0
                    ? `Master Setup: ${configuredGroups.length} Groups`
                    : '2 Default Groups'}
                </span>
              </div>
              <Button
                onClick={handleGenerateDraw}
                disabled={actionLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                <Shuffle className="h-4 w-4 mr-1.5" />
                {actionLoading ? 'Generating...' : 'Generate Blind Cards'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Reveal All Cards Button */}
              <Button
                onClick={handleRevealAll}
                disabled={actionLoading || revealedCardsCount === totalCards}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow-xs"
                title="Reveal all assigned cards to reveal groups at once"
              >
                <Eye className="h-4 w-4 mr-1.5" />
                Reveal All Cards
              </Button>

              {revealedCardsCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleHideAll}
                  disabled={actionLoading}
                  className="border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold"
                  title="Hide revealed cards without clearing assignments"
                >
                  <EyeOff className="h-3.5 w-3.5 mr-1 text-slate-500" /> Hide All
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleResetDraw}
                disabled={actionLoading}
                className="border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold"
              >
                <RotateCcw className="h-4 w-4 mr-1 text-rose-600" /> Reset Draw
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Live Group Log / Team Allocation Banner (Requirement: Group A: Team 2, Team 4 & Group B: Team 3, Team 5) */}
      {cards.length > 0 && (
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-indigo-100/70 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-black">
                <Trophy className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-indigo-950">
                Live Tournament Group Allocation Log
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                Assigned: <strong className="text-zinc-900 font-mono">{assignedCardsCount}/{totalCards}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Revealed: <strong className="text-zinc-900 font-mono">{revealedCardsCount}/{totalCards}</strong>
              </span>
            </div>
          </div>

          {/* Group summaries */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(groupLogs).map(([groupName, info], gIdx) => {
              const borderCol = gIdx % 2 === 0 ? 'border-purple-200' : 'border-blue-200'
              const badgeBg = gIdx % 2 === 0 ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'

              return (
                <div
                  key={groupName}
                  className={`bg-white rounded-2xl border ${borderCol} p-3 shadow-2xs space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md ${badgeBg}`}>
                      {groupName}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {info.revealed.length} Revealed • {info.hidden.length} Blind
                    </span>
                  </div>

                  <div className="min-h-[38px] flex flex-wrap gap-1 items-center">
                    {info.revealed.length > 0 ? (
                      info.revealed.map((teamName, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-2.5 h-2.5 text-amber-600" />
                          {teamName}
                        </span>
                      ))
                    ) : info.hidden.length > 0 ? (
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50/70 border border-purple-100 px-2 py-0.5 rounded-lg">
                        {info.hidden.length} Team(s) Assigned (Concealed)
                      </span>
                    ) : (
                      <span className="text-[10px] italic text-slate-400">
                        No teams revealed yet
                      </span>
                    )}

                    {info.hidden.length > 0 && info.revealed.length > 0 && (
                      <span className="text-[9px] font-mono text-slate-400 font-semibold">
                        +{info.hidden.length} hidden
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. Main Stage: Two Columns (Left Teams Box + Right Cards Grid) */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Panel: Teams Box */}
          <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3.5 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                  Franchise Teams ({teams.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-200">
                {availableTeams.length} Open
              </span>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                placeholder="Search team..."
                className="text-xs h-8 pl-8 rounded-xl bg-slate-50 border-slate-200 font-medium"
              />
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setTeamFilterTab('all')}
                className={`py-1 rounded-lg transition ${
                  teamFilterTab === 'all' ? 'bg-white shadow-2xs text-purple-700 font-black' : 'text-slate-600'
                }`}
              >
                All ({teams.length})
              </button>
              <button
                type="button"
                onClick={() => setTeamFilterTab('unassigned')}
                className={`py-1 rounded-lg transition ${
                  teamFilterTab === 'unassigned' ? 'bg-white shadow-2xs text-purple-700 font-black' : 'text-slate-600'
                }`}
              >
                Open ({availableTeams.length})
              </button>
              <button
                type="button"
                onClick={() => setTeamFilterTab('assigned')}
                className={`py-1 rounded-lg transition ${
                  teamFilterTab === 'assigned' ? 'bg-white shadow-2xs text-purple-700 font-black' : 'text-slate-600'
                }`}
              >
                Assigned ({teams.length - availableTeams.length})
              </button>
            </div>

            {/* Draggable Teams List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredTeamsList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  No teams found
                </div>
              ) : (
                filteredTeamsList.map((t) => {
                  const assigned = isTeamAssigned(t)
                  const assignedCard = getCardForTeam(t)
                  const teamName = t.team_name || t.name || 'Team'
                  const teamColor = t.logo_color || t.color || '#4f46e5'

                  return (
                    <div
                      key={t.id}
                      draggable={!assigned}
                      onDragStart={(e) => handleDragStart(e, t.id)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                        assigned
                          ? 'bg-slate-50/70 border-slate-200 opacity-75'
                          : 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-xs cursor-grab active:cursor-grabbing group'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                        {!assigned && (
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-500 shrink-0" />
                        )}
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: teamColor }}
                        />
                        <span className="text-xs font-bold text-zinc-900 truncate" title={teamName}>
                          {teamName}
                        </span>
                      </div>

                      {assigned ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-md">
                            Card #{assignedCard?.card_number || '—'}
                          </span>
                          <button
                            type="button"
                            onClick={() => assignedCard && handleUnassignTeam(assignedCard.card_number)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Remove assignment"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => handleQuickAssignToNextCard(t.id)}
                          className="h-6 px-2 text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg shrink-0"
                          title="Click to assign to next open card or drag directly"
                        >
                          Assign →
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium text-center">
              💡 Drag any unassigned team card directly onto a blind card
            </div>
          </div>

          {/* Right Column: Blind Cards Grid */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {cards.map((c) => {
                const isAssigned = !!c.team_name
                const isRevealed = c.revealed
                const isDragOver = dragOverCardNumber === c.card_number
                const isJustRevealed = animatingCardNumbers.includes(c.card_number)

                // Native Framer Motion 3D / Reveal animation state
                const getMotionAnimation = () => {
                  if (!isJustRevealed || !animationEnabled) {
                    return { rotateY: 0, rotateX: 0, scale: 1, x: 0, y: 0, rotate: 0 }
                  }
                  if (flipAnimation === '3D Flip Vertical') {
                    return { rotateX: [0, 90, 180, 0], scale: [1, 1.15, 1.15, 1] }
                  }
                  if (flipAnimation === 'Zoom Reveal') {
                    return { scale: [1, 1.35, 0.95, 1], rotate: [0, -6, 6, 0] }
                  }
                  if (flipAnimation === 'Shimmer Slide') {
                    return { x: [-45, 25, -10, 0], scale: [0.92, 1.15, 1] }
                  }
                  if (flipAnimation === 'Slot Machine Roll') {
                    return { y: [-50, 15, 0], rotate: [0, 360], scale: [0.85, 1.15, 1] }
                  }
                  // Default: '3D Flip Horizontal'
                  return { rotateY: [0, 90, 180, 0], scale: [1, 1.18, 1.18, 1] }
                }

                return (
                  <div key={c.id || c.card_number} style={{ perspective: 1000 }} className="w-full">
                    <motion.div
                      layout
                      animate={getMotionAnimation()}
                      transition={{
                        duration: 0.95,
                        ease: [0.34, 1.56, 0.64, 1],
                      }}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      onDragOver={(e) => handleCardDragOver(e, c.card_number)}
                      onDragLeave={() => handleCardDragLeave(c.card_number)}
                      onDrop={(e) => handleCardDrop(e, c.card_number)}
                      className={`relative flex min-h-[220px] flex-col justify-between rounded-3xl border p-4 text-center select-none overflow-hidden transition-all ${
                        isDragOver
                          ? 'border-purple-500 bg-purple-50/80 ring-4 ring-purple-300/60 shadow-lg scale-102'
                          : isJustRevealed
                          ? 'border-amber-400 bg-amber-50/90 ring-4 ring-amber-400/50 shadow-2xl z-20'
                          : isRevealed
                          ? 'border-amber-300/80 bg-amber-50/40 shadow-sm'
                          : isAssigned
                          ? 'border-purple-200 bg-purple-50/30 shadow-xs'
                          : cardBgImage
                          ? 'border-slate-200 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                      }`}
                      style={{
                        transformStyle: 'preserve-3d',
                        backgroundColor: cardColour && cardColour !== '#FFFFFF' && !isRevealed ? cardColour : undefined,
                        // Custom background texture or uploaded image clearly visible both before and after reveal
                        backgroundImage: cardBgImage
                          ? (isRevealed
                              ? `linear-gradient(rgba(255, 251, 235, 0.45), rgba(254, 243, 199, 0.55)), url(${resolveMediaUrl(cardBgImage)})`
                              : `linear-gradient(rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.45)), url(${resolveMediaUrl(cardBgImage)})`)
                          : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      {/* Golden flash overlay on active reveal animation */}
                      {isJustRevealed && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.5, 2] }}
                          transition={{ duration: 0.9, ease: 'easeOut' }}
                          className="absolute inset-0 bg-gradient-to-tr from-amber-400/40 via-yellow-300/40 to-amber-500/30 rounded-3xl pointer-events-none z-30"
                        />
                      )}

                      {/* Top Row: Card # and Team Dropdown (STRICTLY showing only unassigned teams) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 font-mono text-xs font-black text-zinc-900 border border-slate-200 shadow-2xs">
                          #{c.card_number}
                        </span>

                        {isRevealed ? (
                          <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-950 shadow-2xs">
                            REVEALED
                          </span>
                        ) : isAssigned ? (
                          <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-[9px] font-bold">
                            Assigned
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[9px] font-semibold">
                            Open
                          </span>
                        )}
                      </div>

                      {/* Dropdown on top of the card (Requirement: Select team from dropdown list, disappearing when assigned) */}
                      {!isAssigned && (
                        <div className="pt-0.5">
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignTeam(c.card_number, e.target.value)
                              }
                            }}
                            className="w-full rounded-xl border border-purple-200 bg-purple-50/60 px-2 py-1 text-[11px] font-bold text-purple-900 focus:outline-none cursor-pointer truncate hover:bg-purple-100/70 transition"
                          >
                            <option value="">▼ Select Team...</option>
                            {availableTeams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.team_name || t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Center Card Content */}
                    <div className="my-auto py-2">
                      {isRevealed ? (
                        <div className="space-y-1">
                          <p className="text-2xl font-black tracking-tight text-amber-700 drop-shadow-xs">
                            {c.group_name}
                          </p>
                          <div className="inline-block bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-amber-200 shadow-2xs max-w-full">
                            <p className="text-xs font-black text-zinc-900 truncate">
                              {c.team_name || 'Team Assigned'}
                            </p>
                          </div>
                        </div>
                      ) : isAssigned ? (
                        <div className="space-y-1">
                          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-1.5 shadow-2xs border border-purple-200">
                            <Shield className="w-5 h-5" />
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Assigned Team
                          </p>
                          <p className="text-xs font-black text-purple-900 truncate px-1">
                            {c.team_name}
                          </p>
                        </div>
                      ) : (
                        <div className="text-slate-400 space-y-1">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-1 border transition ${
                            isDragOver ? 'bg-purple-200 border-purple-400 text-purple-700 animate-bounce' : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}>
                            <Shield className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">
                            {isDragOver ? 'DROP TEAM HERE' : 'UNASSIGNED'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      {!isAssigned ? (
                        <div className="text-[10px] font-semibold text-slate-400">
                          Drag team here or pick above
                        </div>
                      ) : !isRevealed ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleRevealCard(c.card_number)}
                            disabled={actionLoading}
                            className="flex-1 h-7 text-[10px] bg-amber-500 text-zinc-950 font-black hover:bg-amber-600 rounded-xl shadow-2xs"
                          >
                            <Eye className="h-3 w-3 mr-1" /> REVEAL
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleUnassignTeam(c.card_number)}
                            className="h-7 px-2 text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200"
                            title="Unassign team from this card"
                          >
                            Unassign
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[10px] text-emerald-700 font-bold px-1">
                          <span className="flex items-center gap-1">
                            ✓ Group Locked
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => triggerCardAnimation([c.card_number])}
                              className="text-[9px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200/80 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 transition"
                              title="Replay reveal flip animation"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-amber-600" /> Re-flip
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnassignTeam(c.card_number)}
                              className="text-[9px] font-semibold text-slate-400 hover:text-rose-600"
                              title="Reset this card"
                            >
                              Re-draw
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )
            })}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <Trophy className="h-12 w-12 text-purple-300 mx-auto mb-3" />
          <h3 className="text-base font-black text-zinc-900">No Blind Cards Generated</h3>
          <p className="text-xs text-slate-500 font-medium mt-1 max-w-md mx-auto">
            Click <strong>Generate Blind Cards</strong> above to prepare lottery cards based on your Master Setup groups and franchise teams.
          </p>
        </div>
      )}
    </div>
  )
}
