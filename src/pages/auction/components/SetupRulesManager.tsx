import { useState, useEffect } from 'react'
import {
  Layers, Sliders, Shield, Plus, Trash2, RefreshCw, Eye,
  Trophy, Sparkles, Clock, Palette, CheckCircle2,
  AlertCircle, Play, ExternalLink, Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient, resolveMediaUrl } from '@/api/apiClient'

interface SetupRulesManagerProps {
  auctionId: string
  onNavigateTab?: (tab: string) => void
}

interface CategoryItem {
  id?: string
  name: string
  base_price: number
  target_count: number
  min_players?: number
  max_players?: number
  priority?: number
  display_order?: number
}

interface SlabItem {
  id?: string
  up_to_bid: number
  increment: number
  display_order?: number
}

interface GroupItem {
  name: string
  team_count: number
}

export default function SetupRulesManager({ auctionId, onNavigateTab }: SetupRulesManagerProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // 1. Auction Completion
  const [completionMessage, setCompletionMessage] = useState('Auction Completed - All team are now completed')

  // 2. Auction Type & Player Selection
  const [auctionMode, setAuctionMode] = useState<'Centralized' | 'Online'>('Centralized')
  const [playerSelectionMode, setPlayerSelectionMode] = useState<'Open' | 'Category Wise'>('Open')

  // 3. Squad Rules & Budget
  const [maxSquad, setMaxSquad] = useState<number>(11)
  const [teamPurse, setTeamPurse] = useState<number>(50000)
  const [retentionAllowed, setRetentionAllowed] = useState(false)
  const [bringBackUnsold, setBringBackUnsold] = useState(true)
  const [confirmSale, setConfirmSale] = useState(false)
  const [reserveAmount, setReserveAmount] = useState<number>(0)
  const [additionalKitty, setAdditionalKitty] = useState<number>(0)
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0)

  // 4. SOLD Celebration Animations
  const [soldAnimation, setSoldAnimation] = useState(true)
  const [highestBidAnimation, setHighestBidAnimation] = useState(true)
  const [soldAnimationStyle, setSoldAnimationStyle] = useState('Confetti Burst')
  const [soldAnimationDuration, setSoldAnimationDuration] = useState<number>(3)
  const [highestBidAnimationStyle, setHighestBidAnimationStyle] = useState('Fireworks')
  const [highestBidAnimationDuration, setHighestBidAnimationDuration] = useState<number>(5)
  const [soldAnimationCustom, setSoldAnimationCustom] = useState('')
  const [highestBidAnimationCustom, setHighestBidAnimationCustom] = useState('')
  const [soldAnimationFile, setSoldAnimationFile] = useState<File | null>(null)
  const [highestBidAnimationFile, setHighestBidAnimationFile] = useState<File | null>(null)

  // Animation Preview Overlay State
  const [previewAnimation, setPreviewAnimation] = useState<{
    type: 'sold' | 'highest'
    style: string
    duration: number
    label: string
  } | null>(null)

  // 5. Player Categories
  const [categorySource, setCategorySource] = useState<'Setup' | 'Player Master'>('Setup')
  const [categoryNamesInput, setCategoryNamesInput] = useState('')
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [categorySequenceInput, setCategorySequenceInput] = useState('')
  const [masterCategories, setMasterCategories] = useState<string[]>([])

  // 6. Custom Bid Slabs
  const [slabs, setSlabs] = useState<SlabItem[]>([
    { up_to_bid: 1000000, increment: 50000 },
    { up_to_bid: 2000000, increment: 100000 },
    { up_to_bid: 999999999, increment: 200000 },
  ])

  // 7. Group Setup
  const [groupCount, setGroupCount] = useState<number>(2)
  const [groups, setGroups] = useState<GroupItem[]>([
    { name: 'Group 1', team_count: 2 },
    { name: 'Group 2', team_count: 2 },
  ])
  const [activeTeamsCount, setActiveTeamsCount] = useState<number>(4)

  // 8. Tournament Branding & Group Draw
  const [groupCardColour, setGroupCardColour] = useState('#FFFFFF')
  const [groupCardAnimation, setGroupCardAnimation] = useState('3D Flip Horizontal')
  const [groupDrawAnimationEnabled, setGroupDrawAnimationEnabled] = useState(true)
  const [groupCardBgImage, setGroupCardBgImage] = useState('')
  const [groupCardBgFile, setGroupCardBgFile] = useState<File | null>(null)
  const [previewFlipAnim, setPreviewFlipAnim] = useState(false)
  const [tournamentLogo, setTournamentLogo] = useState('')
  const [removeTournamentLogoBg, setRemoveTournamentLogoBg] = useState(false)
  const [tournamentLogoFile, setTournamentLogoFile] = useState<File | null>(null)
  const [auctionBackground, setAuctionBackground] = useState('stadium')
  const [auctionBgFile, setAuctionBgFile] = useState<File | null>(null)
  const [overallBackground, setOverallBackground] = useState('default')
  const [overallBgFile, setOverallBgFile] = useState<File | null>(null)

  // 9. Online Timer & Sound
  const [onlineTimerEnabled, setOnlineTimerEnabled] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState<number>(30)
  const [closingWaitSeconds, setClosingWaitSeconds] = useState<number>(5)
  const [soundEffects, setSoundEffects] = useState(true)

  // 10. Squad Composition Rules (Purse Protected)
  const [squadRules, setSquadRules] = useState<any[]>([])
  const [newRuleKey, setNewRuleKey] = useState('category')
  const [newRuleValue, setNewRuleValue] = useState('')
  const [newRuleMin, setNewRuleMin] = useState<number>(1)
  const [newRuleMax, setNewRuleMax] = useState<number | undefined>(undefined)

  useEffect(() => {
    loadSetupRules()
  }, [auctionId])

  // Sync category names input to categories list
  useEffect(() => {
    const parsedNames = categoryNamesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (parsedNames.length === 0) {
      if (categoryNamesInput.trim() === '') {
        setCategories([])
      }
      return
    }

    setCategories((prevCats) => {
      const currentNames = prevCats.map(c => c.name.toLowerCase()).join(',')
      const newNames = parsedNames.map(n => n.toLowerCase()).join(',')
      if (currentNames === newNames) return prevCats

      return parsedNames.map((name, idx) => {
        const existing = prevCats.find((c) => c.name.toLowerCase() === name.toLowerCase())
        if (existing) {
          return { ...existing, name, display_order: idx + 1 }
        }
        return {
          name,
          base_price: 2000,
          target_count: 1,
          display_order: idx + 1,
        }
      })
    })
  }, [categoryNamesInput])

  // Sync groups array to groupCount
  useEffect(() => {
    const count = Math.max(0, groupCount)
    setGroups((prev) => {
      const next: GroupItem[] = []
      for (let i = 0; i < count; i++) {
        if (prev[i]) {
          next.push(prev[i])
        } else {
          next.push({
            name: `Group ${String.fromCharCode(65 + i)}`,
            team_count: Math.max(1, Math.floor(activeTeamsCount / Math.max(1, count))),
          })
        }
      }
      return next
    })
  }, [groupCount, activeTeamsCount])

  const loadSetupRules = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/setup_rules/`)
      const d = res.data
      const cfg = d.config || {}

      if (cfg.auction_completion_message) setCompletionMessage(cfg.auction_completion_message)
      if (cfg.auction_mode) setAuctionMode(cfg.auction_mode)
      if (cfg.player_selection_mode) setPlayerSelectionMode(cfg.player_selection_mode)
      if (cfg.max_squad) setMaxSquad(cfg.max_squad)
      if (cfg.team_purse !== undefined) setTeamPurse(cfg.team_purse)
      if (cfg.retention_allowed !== undefined) setRetentionAllowed(Boolean(cfg.retention_allowed))
      if (cfg.bring_back_unsold !== undefined) setBringBackUnsold(Boolean(cfg.bring_back_unsold))
      if (cfg.confirm_sale !== undefined) setConfirmSale(Boolean(cfg.confirm_sale))
      if (cfg.reserve_amount !== undefined) setReserveAmount(cfg.reserve_amount)
      if (cfg.additional_kitty !== undefined) setAdditionalKitty(cfg.additional_kitty)
      if (cfg.penalty_amount !== undefined) setPenaltyAmount(cfg.penalty_amount)

      if (cfg.sold_animation !== undefined) setSoldAnimation(Boolean(cfg.sold_animation))
      if (cfg.highest_bid_animation !== undefined) setHighestBidAnimation(Boolean(cfg.highest_bid_animation))
      if (cfg.sold_animation_style) setSoldAnimationStyle(cfg.sold_animation_style)
      if (cfg.sold_animation_duration) setSoldAnimationDuration(cfg.sold_animation_duration)
      if (cfg.highest_bid_animation_style) setHighestBidAnimationStyle(cfg.highest_bid_animation_style)
      if (cfg.highest_bid_animation_duration) setHighestBidAnimationDuration(cfg.highest_bid_animation_duration)
      if (cfg.sold_animation_custom) setSoldAnimationCustom(cfg.sold_animation_custom)
      if (cfg.highest_bid_animation_custom) setHighestBidAnimationCustom(cfg.highest_bid_animation_custom)

      if (cfg.category_source) setCategorySource(cfg.category_source)
      if (cfg.group_card_colour) setGroupCardColour(cfg.group_card_colour)
      if (cfg.group_card_animation) setGroupCardAnimation(cfg.group_card_animation)
      if (cfg.group_draw_animation_enabled !== undefined) setGroupDrawAnimationEnabled(Boolean(cfg.group_draw_animation_enabled))
      if (cfg.group_card_bg_image) setGroupCardBgImage(cfg.group_card_bg_image)
      if (cfg.tournament_logo) setTournamentLogo(cfg.tournament_logo)
      if (cfg.auction_background) setAuctionBackground(cfg.auction_background)
      if (cfg.overall_background) setOverallBackground(cfg.overall_background)

      if (cfg.online_timer_enabled !== undefined) setOnlineTimerEnabled(Boolean(cfg.online_timer_enabled))
      if (cfg.timer_seconds) setTimerSeconds(cfg.timer_seconds)
      if (cfg.closing_wait_seconds) setClosingWaitSeconds(cfg.closing_wait_seconds)
      if (cfg.sound_effects !== undefined) setSoundEffects(Boolean(cfg.sound_effects))

      if (d.auction) {
        if (d.auction.active_teams_count) setActiveTeamsCount(d.auction.active_teams_count)
      }

      if (d.categories && d.categories.length > 0) {
        setCategories(d.categories)
        setCategoryNamesInput(d.categories.map((c: any) => c.name).join(', '))
      }

      if (cfg.category_sequence && Array.isArray(cfg.category_sequence)) {
        setCategorySequenceInput(cfg.category_sequence.join(', '))
      } else if (d.categories && d.categories.length > 0) {
        setCategorySequenceInput(d.categories.map((c: any) => c.name).join(', '))
      }

      if (d.slabs && d.slabs.length > 0) {
        setSlabs(d.slabs)
      }

      if (cfg.groups && Array.isArray(cfg.groups) && cfg.groups.length > 0) {
        setGroups(cfg.groups)
        setGroupCount(cfg.groups.length)
      }

      if (d.squad_rules) {
        setSquadRules(d.squad_rules)
      }

      if (d.player_master_categories) {
        setMasterCategories(d.player_master_categories)
      }
    } catch (err: any) {
      console.error('Failed to load setup rules', err)
      setErrorMessage(err.response?.data?.error || 'Failed to load configuration.')
    } finally {
      setLoading(false)
    }
  }

  const handlePullFromPlayerMaster = () => {
    if (masterCategories.length === 0) {
      alert('No distinct player categories found in the Player pool yet. Import players or add categories first.')
      return
    }
    setCategoryNamesInput(masterCategories.join(', '))
    setCategorySequenceInput(masterCategories.join(', '))
  }

  const handleUpdateCategory = (
    index: number,
    field: 'base_price' | 'target_count' | 'min_players' | 'max_players' | 'priority',
    value: number
  ) => {
    setCategories((prev) => {
      const copy = [...prev]
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: Math.max(0, value) }
      }
      return copy
    })
  }

  const handleUpdateCategoryName = (index: number, newName: string) => {
    setCategories((prev) => {
      const copy = [...prev]
      if (copy[index]) {
        copy[index] = { ...copy[index], name: newName }
      }
      setCategoryNamesInput(copy.map((c) => c.name).join(', '))
      return copy
    })
  }

  const handleAddCategory = () => {
    const newIdx = categories.length + 1
    const newCatName = `Category ${newIdx}`
    const updated = [
      ...categories,
      { name: newCatName, base_price: 2000, target_count: 1, display_order: newIdx },
    ]
    setCategories(updated)
    setCategoryNamesInput(updated.map((c) => c.name).join(', '))
  }

  const handleRemoveCategory = (index: number) => {
    const updated = categories.filter((_, i) => i !== index)
    setCategories(updated)
    setCategoryNamesInput(updated.map((c) => c.name).join(', '))
  }

  const handleSyncCategorySequence = () => {
    const seq = categories.map((c) => c.name).join(', ')
    setCategorySequenceInput(seq)
  }

  const handleAddSlab = () => {
    setSlabs((prev) => {
      const last = prev[prev.length - 1]
      const nextUpTo = last ? last.up_to_bid + 1000000 : 1000000
      const nextInc = last ? last.increment : 50000
      return [...prev, { up_to_bid: nextUpTo, increment: nextInc }]
    })
  }

  const handleRemoveSlab = (index: number) => {
    setSlabs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateSlab = (index: number, field: 'up_to_bid' | 'increment', value: number) => {
    setSlabs((prev) => {
      const copy = [...prev]
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: Math.max(1, value) }
      }
      return copy
    })
  }

  const handleUpdateGroup = (index: number, field: 'name' | 'team_count', value: any) => {
    setGroups((prev) => {
      const copy = [...prev]
      if (copy[index]) {
        copy[index] = {
          ...copy[index],
          [field]: field === 'team_count' ? Math.max(1, parseInt(value) || 1) : value,
        }
      }
      return copy
    })
  }

  // Preview celebration trigger
  const triggerAnimationPreview = (type: 'sold' | 'highest') => {
    const style = type === 'highest' ? highestBidAnimationStyle : soldAnimationStyle
    const duration = type === 'highest' ? highestBidAnimationDuration : soldAnimationDuration
    const label = type === 'highest' ? 'HIGHEST BID!' : 'SOLD!'

    setPreviewAnimation({ type, style, duration, label })

    setTimeout(() => {
      setPreviewAnimation(null)
    }, duration * 1000)
  }

  // Save all settings to the unified setup_rules endpoint
  const handleSaveAll = async () => {
    setSaving(true)
    setSaveSuccess(false)
    setErrorMessage('')

    const totalTarget = categories.reduce((sum, c) => sum + (c.target_count || 0), 0)
    if (totalTarget !== maxSquad && categories.length > 0) {
      if (
        !confirm(
          `Notice: Sum of category targets (${totalTarget}) does not equal Max Squad (${maxSquad}). Would you like to auto-adjust Max Squad to ${totalTarget} before saving?`
        )
      ) {
        setSaving(false)
        return
      }
      setMaxSquad(totalTarget)
    }

    try {
      const formData = new FormData()

      // 1. Completion & Auction Mode
      formData.append('auction_completion_message', completionMessage)
      formData.append('auction_mode', auctionMode)
      formData.append('player_selection_mode', playerSelectionMode)
      formData.append('category_wise_bidding', playerSelectionMode === 'Category Wise' ? 'true' : 'false')

      // 2. Budget & Squad
      formData.append('max_squad', (totalTarget > 0 ? totalTarget : maxSquad).toString())
      formData.append('team_purse', teamPurse.toString())
      formData.append('retention_allowed', retentionAllowed ? 'true' : 'false')
      formData.append('bring_back_unsold', bringBackUnsold ? 'true' : 'false')
      formData.append('confirm_sale', confirmSale ? 'true' : 'false')
      formData.append('reserve_amount', reserveAmount.toString())
      formData.append('additional_kitty', additionalKitty.toString())
      formData.append('penalty_amount', penaltyAmount.toString())

      // 3. Celebrations
      formData.append('sold_animation', soldAnimation ? 'true' : 'false')
      formData.append('highest_bid_animation', highestBidAnimation ? 'true' : 'false')
      formData.append('sold_animation_style', soldAnimationStyle)
      formData.append('sold_animation_duration', soldAnimationDuration.toString())
      formData.append('highest_bid_animation_style', highestBidAnimationStyle)
      formData.append('highest_bid_animation_duration', highestBidAnimationDuration.toString())

      if (soldAnimationFile) {
        formData.append('sold_animation_custom', soldAnimationFile)
      } else if (soldAnimationCustom) {
        formData.append('sold_animation_custom_url', soldAnimationCustom)
      }

      if (highestBidAnimationFile) {
        formData.append('highest_bid_animation_custom', highestBidAnimationFile)
      } else if (highestBidAnimationCustom) {
        formData.append('highest_bid_animation_custom_url', highestBidAnimationCustom)
      }

      // 4. Categories & Slabs
      formData.append('category_source', categorySource)
      formData.append('category_names', categoryNamesInput)
      formData.append('categories', JSON.stringify(categories))
      formData.append('category_sequence', categorySequenceInput)
      formData.append('slabs', JSON.stringify(slabs))

      // 5. Groups & Group Draw Card Customization
      formData.append('groups', JSON.stringify(groups))
      formData.append('group_card_colour', groupCardColour)
      formData.append('group_card_animation', groupCardAnimation)
      formData.append('group_draw_animation_enabled', groupDrawAnimationEnabled ? 'true' : 'false')

      if (groupCardBgFile) {
        formData.append('group_card_bg_image', groupCardBgFile)
      } else if (groupCardBgImage) {
        formData.append('group_card_bg_image_url', groupCardBgImage)
      }

      // 6. Branding
      if (tournamentLogoFile) {
        formData.append('tournament_logo', tournamentLogoFile)
        formData.append('remove_tournament_logo_bg', removeTournamentLogoBg ? 'true' : 'false')
      }
      if (auctionBgFile) {
        formData.append('auction_background_file', auctionBgFile)
      } else if (auctionBackground) {
        formData.append('auction_background', auctionBackground)
      }
      if (overallBgFile) {
        formData.append('overall_background_file', overallBgFile)
      } else if (overallBackground) {
        formData.append('overall_background', overallBackground)
      }

      // 7. Timer & Sound
      formData.append('online_timer_enabled', onlineTimerEnabled ? 'true' : 'false')
      formData.append('timer_seconds', timerSeconds.toString())
      formData.append('closing_wait_seconds', closingWaitSeconds.toString())
      formData.append('sound_effects', soundEffects ? 'true' : 'false')

      await apiClient.post(`/v1/auction/console/${auctionId}/setup_rules/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
      await loadSetupRules()
    } catch (err: any) {
      console.error('Save setup & rules error:', err)
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to save configuration.')
    } finally {
      setSaving(false)
    }
  }

  // Squad Rules CRUD
  const handleAddSquadRule = async () => {
    if (!newRuleValue.trim()) return
    try {
      await apiClient.post('/v1/auction/squad-rules/', {
        auction: auctionId,
        field_key: newRuleKey,
        field_value: newRuleValue.trim(),
        min_count: newRuleMin,
        max_count: newRuleMax,
        operator: 'minimum',
        active: true,
      })
      setNewRuleValue('')
      const res = await apiClient.get(`/v1/auction/squad-rules/?auction=${auctionId}`)
      setSquadRules(res.data.results || res.data || [])
    } catch (err: any) {
      console.error('Add squad rule failed', err)
      alert(err.response?.data?.error || 'Failed to add squad constraint.')
    }
  }

  const handleDeleteSquadRule = async (id: string) => {
    try {
      await apiClient.delete(`/v1/auction/squad-rules/${id}/`)
      setSquadRules((prev) => prev.filter((r) => r.id !== id))
    } catch (err: any) {
      console.error('Delete squad rule failed', err)
    }
  }

  const sumTargets = categories.reduce((sum, c) => sum + (c.target_count || 0), 0)
  const sumGroupTeams = groups.reduce((sum, g) => sum + (g.team_count || 0), 0)

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Sliders className="h-6 w-6 text-amber-500" /> Master Setup & Rules
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            All tournament rules, budget parameters, celebration animations, categories and bid slabs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" /> Rules saved successfully!
            </span>
          )}
          {errorMessage && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
              <AlertCircle className="h-4 w-4" /> {errorMessage}
            </span>
          )}
          <Button
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black rounded-xl text-xs px-5 shadow-sm"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Save Master Setup & Rules
          </Button>
        </div>
      </div>

      {/* 1. Auction Completion */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-base font-black text-foreground flex items-center gap-2 mb-1">
          <Trophy className="h-5 w-5 text-amber-500" />
          Auction Completion
        </h2>
        <div className="space-y-2 mt-4 max-w-2xl">
          <Label className="text-xs font-bold text-muted-foreground">All Teams Completed Message</Label>
          <Input
            value={completionMessage}
            onChange={(e) => setCompletionMessage(e.target.value)}
            placeholder="Auction Completed - All team are now completed"
            className="text-xs font-medium rounded-xl border-border bg-background"
          />
          <p className="text-[11px] text-muted-foreground">
            Shown automatically when every active team has fulfilled all category requirements.
          </p>
        </div>
      </section>

      {/* 2. Auction Type & Player Selection */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-base font-black text-foreground flex items-center gap-2 mb-1">
          <Eye className="h-5 w-5 text-blue-500" />
          Auction Type & Player Selection
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Auction Type *</Label>
            <select
              value={auctionMode}
              onChange={(e) => setAuctionMode(e.target.value as any)}
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="Centralized">Centralized Auction</option>
              <option value="Online">Online Auction</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Centralized: one auctioneer controls bidding. Online: authorised teams/bidders can bid.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Player Auction Sequence *</Label>
            <select
              value={playerSelectionMode}
              onChange={(e) => setPlayerSelectionMode(e.target.value as any)}
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="Open">Open Auction</option>
              <option value="Category Wise">Category Wise Auction</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Open = random player from any eligible category. Category Wise = random player from the selected category.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Squad Rules & Budget */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-base font-black text-foreground flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-emerald-500" />
          Squad Rules & Budget
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Squad Size / Max Squad *</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={maxSquad}
                onChange={(e) => setMaxSquad(parseInt(e.target.value) || 1)}
                className="text-xs font-bold rounded-xl border-border bg-background"
              />
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap ${
                  sumTargets === maxSquad
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                Target Sum: {sumTargets}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Must equal the sum of category target counts ({sumTargets}).
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Team Kitty (₹) *</Label>
            <Input
              type="number"
              min={0}
              value={teamPurse}
              onChange={(e) => setTeamPurse(parseFloat(e.target.value) || 0)}
              className="text-xs font-bold rounded-xl border-border bg-background font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Base purse budget credited to each franchise at tournament start.
            </p>
          </div>
        </div>

        {/* Financial Adjustments Notice */}
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-100/90 dark:bg-amber-950/70 p-4 mt-4 text-xs shadow-xs">
          <span className="font-black text-amber-950 dark:text-amber-100 block mb-1 text-sm">
            Team-specific financial adjustments
          </span>
          <p className="text-xs text-amber-950 dark:text-amber-200 font-semibold leading-relaxed">
            Reserve, Additional Kitty and Penalty are now maintained separately for each team in Team Setup. The legacy tournament defaults are retained only for backward compatibility.
          </p>
        </div>

        {/* Checkbox Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
          <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={retentionAllowed}
              onChange={(e) => setRetentionAllowed(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            Retention allowed
          </label>
          <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bringBackUnsold}
              onChange={(e) => setBringBackUnsold(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            Allow re-auction of unsold players
          </label>
          <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmSale}
              onChange={(e) => setConfirmSale(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            Confirm sale before marking sold
          </label>
        </div>
      </section>

      {/* 4. SOLD Celebration Animations */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-base font-black text-foreground flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-amber-500" />
          SOLD Celebration Animations
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          The regular SOLD animation plays after every SOLD player. If the sale matches or exceeds the highest sale achieved earlier in this tournament auction (including re-auction), the Highest Bid animation is used instead.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-border">
          <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={soldAnimation}
              onChange={(e) => setSoldAnimation(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            Enable Regular SOLD Animation
          </label>
          <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={highestBidAnimation}
              onChange={(e) => setHighestBidAnimation(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            Enable Highest Bid Animation
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Regular SOLD Animation</Label>
            <select
              value={soldAnimationStyle}
              onChange={(e) => setSoldAnimationStyle(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-semibold text-foreground focus:outline-none"
            >
              {['Confetti Burst', 'Fireworks', 'Gold Celebration', 'Spotlight', 'Trophy Celebration'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Regular Animation Duration</Label>
            <select
              value={soldAnimationDuration}
              onChange={(e) => setSoldAnimationDuration(parseInt(e.target.value) || 3)}
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value={2}>2 seconds</option>
              <option value={3}>3 seconds</option>
              <option value={4}>4 seconds</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Highest Bid Animation</Label>
            <select
              value={highestBidAnimationStyle}
              onChange={(e) => setHighestBidAnimationStyle(e.target.value)}
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-semibold text-foreground focus:outline-none"
            >
              {['Confetti Burst', 'Fireworks', 'Gold Celebration', 'Spotlight', 'Trophy Celebration'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Highest Bid Animation Duration</Label>
            <select
              value={highestBidAnimationDuration}
              onChange={(e) => setHighestBidAnimationDuration(parseInt(e.target.value) || 5)}
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value={4}>4 seconds</option>
              <option value={5}>5 seconds</option>
              <option value={6}>6 seconds</option>
            </select>
          </div>
        </div>

        {/* Live Preview Buttons */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => triggerAnimationPreview('sold')}
            className="rounded-xl text-xs font-bold"
          >
            <Play className="h-3.5 w-3.5 mr-1 text-emerald-600" /> ▶ Preview SOLD
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => triggerAnimationPreview('highest')}
            className="rounded-xl text-xs font-bold"
          >
            <Play className="h-3.5 w-3.5 mr-1 text-amber-500" /> ▶ Preview Highest Bid
          </Button>
        </div>

        {/* Custom Video / WebM / GIF Animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Custom SOLD animation (GIF/WEBM/MP4/PNG)</Label>
            <Input
              type="file"
              accept="image/gif,image/png,image/webp,video/webm,video/mp4"
              onChange={(e) => setSoldAnimationFile(e.target.files?.[0] || null)}
              className="text-xs rounded-xl border-border bg-background"
            />
            {soldAnimationCustom && (
              <p className="text-[11px] text-emerald-600 truncate font-mono">
                Current custom: {soldAnimationCustom.split('/').pop()}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Custom Highest Bid animation (GIF/WEBM/MP4/PNG)</Label>
            <Input
              type="file"
              accept="image/gif,image/png,image/webp,video/webm,video/mp4"
              onChange={(e) => setHighestBidAnimationFile(e.target.files?.[0] || null)}
              className="text-xs rounded-xl border-border bg-background"
            />
            {highestBidAnimationCustom && (
              <p className="text-[11px] text-emerald-600 truncate font-mono">
                Current custom: {highestBidAnimationCustom.split('/').pop()}
              </p>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mt-3 italic">
          Built-in styles: Confetti Burst, Fireworks, Gold Celebration, Spotlight and Trophy Celebration. For transparent broadcast-style custom animations, WebM with alpha is the preferred format; MP4 is supported but normally has an opaque background.
        </p>
      </section>

      {/* 5. Player Categories */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-base font-black text-foreground flex items-center gap-2 mb-1">
          <Layers className="h-5 w-5 text-indigo-500" />
          Player Categories
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Categories can be maintained manually or pulled from the Player Master. When using Player Master, category names are synchronized from the players already loaded in this tournament; you still define the base price and required number per team here.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Category source</Label>
            <select
              value={categorySource}
              onChange={(e) => setCategorySource(e.target.value as any)}
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-semibold text-foreground focus:outline-none"
            >
              <option value="Setup">Enter in Setup</option>
              <option value="Player Master">Pull from Player Master</option>
            </select>
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
            <Label className="text-xs font-bold text-foreground">Player Field Studio</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab ? onNavigateTab('fields') : window.open('/tournaments/2/field-studio', '_blank')}
                className="rounded-xl text-xs font-bold"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Manage Fields & Validation
              </Button>
              {categorySource === 'Player Master' && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handlePullFromPlayerMaster}
                  className="rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Pull Master Categories ({masterCategories.length})
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground">Category names (comma separated)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCategory}
              className="h-7 text-xs font-bold rounded-lg border-dashed border-indigo-400 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Category
            </Button>
          </div>
          <Input
            value={categoryNamesInput}
            onChange={(e) => setCategoryNamesInput(e.target.value)}
            placeholder="e.g. Diamond, Gold, Silver or Icon, Tier 1, Tier 2"
            className="text-xs font-semibold rounded-xl border-border bg-background font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Type comma-separated category names above or use the Add Category button below to configure categories dynamically.
          </p>
        </div>

        {/* Dynamic Category Cards */}
        {categories.length === 0 ? (
          <div className="mt-4 p-6 rounded-2xl border border-dashed border-border text-center bg-muted/20">
            <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold text-foreground">No Categories Defined</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">
              Add your tournament categories above or click Add Category to get started.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCategory}
              className="text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add First Category
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
            {categories.map((cat, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3 relative group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                      Category Name
                    </label>
                    <Input
                      value={cat.name}
                      onChange={(e) => handleUpdateCategoryName(idx, e.target.value)}
                      placeholder="Category name"
                      className="text-xs font-black rounded-lg bg-background h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end">
                    {/* Priority Option (Ascending Order in Auction) */}
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded-lg shadow-2xs">
                      <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300">Priority:</span>
                      <input
                        type="number"
                        min={1}
                        value={cat.priority !== undefined ? cat.priority : (idx + 1)}
                        onChange={(e) => handleUpdateCategory(idx, 'priority', parseInt(e.target.value) || 1)}
                        className="w-10 text-xs font-black font-mono bg-transparent text-amber-950 dark:text-amber-100 focus:outline-none text-center"
                        title="Category auction priority (1 = auctioned first)"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCategory(idx)}
                      title="Remove this category"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* 4-Column Grid: Base Price, Target Count, Min Player, Max Player */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Base Price (₹)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step={500}
                      value={cat.base_price}
                      onChange={(e) => handleUpdateCategory(idx, 'base_price', parseFloat(e.target.value) || 0)}
                      className="text-xs font-bold font-mono rounded-xl bg-background h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">
                      Target (Req./Team)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={cat.target_count}
                      onChange={(e) => handleUpdateCategory(idx, 'target_count', parseInt(e.target.value) || 0)}
                      className="text-xs font-bold font-mono rounded-xl bg-background h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                      Min Player
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={cat.min_players || 0}
                      onChange={(e) => handleUpdateCategory(idx, 'min_players', parseInt(e.target.value) || 0)}
                      className="text-xs font-bold font-mono rounded-xl bg-background h-8 border-emerald-500/30"
                      placeholder="Min"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                      Max Player
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={cat.max_players !== undefined && cat.max_players !== null ? cat.max_players : ''}
                      onChange={(e) => handleUpdateCategory(idx, 'max_players', parseInt(e.target.value) || 0)}
                      className="text-xs font-bold font-mono rounded-xl bg-background h-8 border-blue-500/30"
                      placeholder="Max Cap"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Category Sequence */}
        <div className="space-y-2 mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground">Category-wise Auction Sequence</Label>
            {categories.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSyncCategorySequence}
                className="h-6 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 p-0"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> Sync with Categories
              </Button>
            )}
          </div>
          <Input
            value={categorySequenceInput}
            onChange={(e) => setCategorySequenceInput(e.target.value)}
            placeholder="e.g. Diamond, Gold, Silver"
            className="text-xs font-semibold rounded-xl border-border bg-background font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Controls the order used by Category Wise Auction and the pre-auction Maximum Bid assumption.
          </p>
        </div>
      </section>

      {/* 6. Custom Bid Slabs */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-base font-black text-foreground flex items-center gap-2 mb-1">
          <Sliders className="h-5 w-5 text-blue-600" />
          Custom Bid Slabs
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          A bid must land on the valid increment grid. Example: through ₹10 lakh → ₹50,000; through ₹20 lakh → ₹1 lakh; above ₹20 lakh → ₹2 lakh. Thus ₹20 lakh → ₹22 lakh → ₹24 lakh, never ₹21 lakh.
        </p>

        <div className="space-y-3 mb-4">
          {slabs.map((slab, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border"
            >
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Up to Bid (₹)</label>
                <Input
                  type="number"
                  min={1}
                  value={slab.up_to_bid}
                  onChange={(e) => handleUpdateSlab(idx, 'up_to_bid', parseFloat(e.target.value) || 0)}
                  placeholder="Up to bid"
                  className="text-xs font-bold font-mono rounded-xl bg-background"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Increment (₹)</label>
                <Input
                  type="number"
                  min={1}
                  value={slab.increment}
                  onChange={(e) => handleUpdateSlab(idx, 'increment', parseFloat(e.target.value) || 0)}
                  placeholder="Increment"
                  className="text-xs font-bold font-mono rounded-xl bg-background"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveSlab(idx)}
                className="mt-5 p-2 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition"
                title="Remove Slab"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSlab}
          className="rounded-xl text-xs font-bold"
        >
          <Plus className="h-4 w-4 mr-1 text-blue-600" /> ＋ Add slab
        </Button>
      </section>

      {/* 7. Group Setup */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-base font-black text-foreground flex items-center gap-2 mb-1">
          <Trophy className="h-5 w-5 text-amber-500" />
          Group Setup
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Groups are independent of auction. The system will randomly place group identities behind numbered cards. Nobody sees the hidden mapping before reveal. Group team counts must add up to the number of active teams before a draw can be generated.
        </p>

        <div className="max-w-xs space-y-1.5 mb-4">
          <Label className="text-xs font-bold text-foreground">Number of Groups</Label>
          <Input
            type="number"
            min={0}
            value={groupCount}
            onChange={(e) => setGroupCount(Math.max(0, parseInt(e.target.value) || 0))}
            className="text-xs font-bold rounded-xl border-border bg-background"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3"
            >
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Group {idx + 1} Name</Label>
                <Input
                  value={group.name}
                  onChange={(e) => handleUpdateGroup(idx, 'name', e.target.value)}
                  placeholder={`Group ${idx + 1}`}
                  className="text-xs font-bold rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Group {idx + 1} Number of Teams</Label>
                <Input
                  type="number"
                  min={1}
                  value={group.team_count}
                  onChange={(e) => handleUpdateGroup(idx, 'team_count', e.target.value)}
                  className="text-xs font-bold rounded-xl bg-background"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Total Allocated Teams in Groups: <strong className="text-foreground">{sumGroupTeams}</strong>
          </span>
          <span className="text-muted-foreground">
            Active Franchise Teams in Tournament: <strong className="text-foreground">{activeTeamsCount}</strong>
          </span>
        </div>

        {/* Group Draw Card Flip Animation & Revealed Card Customization */}
        <div className="mt-5 pt-5 border-t border-border space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Blind Group Card Animation & Reveal Styling
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Configure the flip animation effect and card background image shown when blind group cards are revealed.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 px-3 py-1.5 rounded-xl">
              <input
                type="checkbox"
                checked={groupDrawAnimationEnabled}
                onChange={(e) => setGroupDrawAnimationEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 cursor-pointer"
              />
              <span>Animation: {groupDrawAnimationEnabled ? 'ON' : 'OFF'}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Flip Animation Style Selector */}
            <div className="space-y-2 bg-muted/20 p-4 rounded-2xl border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Card Flip Animation Style</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewFlipAnim(true)
                    setTimeout(() => setPreviewFlipAnim(false), 2000)
                  }}
                  className="h-6 text-[10px] font-bold text-purple-600 hover:text-purple-700 rounded-lg px-2"
                >
                  <Play className="h-2.5 w-2.5 mr-1" /> Test Flip Effect
                </Button>
              </div>

              <select
                value={groupCardAnimation}
                onChange={(e) => setGroupCardAnimation(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="3D Flip Horizontal">3D Flip Horizontal (Y-Axis 180°)</option>
                <option value="3D Flip Vertical">3D Flip Vertical (X-Axis 180°)</option>
                <option value="Zoom Reveal">Zoom Reveal (Burst & Golden Glow)</option>
                <option value="Shimmer Slide">Shimmer Slide (Diagonal Sweep)</option>
                <option value="Slot Machine Roll">Slot Machine Roll (Spinning Roll)</option>
              </select>

              {/* Mini Flip Preview Box */}
              <div className="h-24 rounded-xl border border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 flex items-center justify-center overflow-hidden relative">
                <div
                  className={`w-28 h-16 rounded-xl border flex flex-col items-center justify-center p-2 shadow-sm transition-all duration-700 ${
                    previewFlipAnim
                      ? groupCardAnimation === '3D Flip Vertical'
                        ? 'rotate-x-180 scale-105 bg-amber-400 text-zinc-950 border-amber-500'
                        : groupCardAnimation === 'Zoom Reveal'
                        ? 'scale-115 shadow-xl bg-amber-400 text-zinc-950 border-amber-300 ring-4 ring-amber-300/40'
                        : groupCardAnimation === 'Shimmer Slide'
                        ? 'translate-x-1 scale-105 bg-amber-400 text-zinc-950 border-amber-300'
                        : groupCardAnimation === 'Slot Machine Roll'
                        ? 'rotate-12 scale-105 bg-amber-400 text-zinc-950 border-amber-300'
                        : 'rotate-y-180 scale-105 bg-amber-400 text-zinc-950 border-amber-500'
                      : 'bg-white dark:bg-zinc-900 border-purple-300 text-purple-900 dark:text-purple-100'
                  }`}
                  style={{
                    backgroundImage: (previewFlipAnim && groupCardBgImage) ? `url(${groupCardBgImage})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <span className="text-[10px] font-black uppercase">
                    {previewFlipAnim ? 'GROUP A' : '#1 CARD'}
                  </span>
                  <span className="text-[8px] opacity-80 font-bold">
                    {previewFlipAnim ? 'Team Assigned' : 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>

            {/* Revealed Card Background Image */}
            <div className="space-y-2 bg-muted/20 p-4 rounded-2xl border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Revealed Card Background Image</Label>
                {groupCardBgImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setGroupCardBgImage('')
                      setGroupCardBgFile(null)
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>

              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setGroupCardBgFile(file)
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      setGroupCardBgImage(ev.target?.result as string)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
                className="text-xs rounded-xl border-border bg-background"
              />

              {/* Quick Preset Textures */}
              <div className="pt-1">
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                  Or select a premium texture preset:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Gold Luxury', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80' },
                    { label: 'Turf Stadium', url: 'https://images.unsplash.com/photo-1529900245534-47fbf822495d?w=600&auto=format&fit=crop&q=80' },
                    { label: 'Midnight Blue', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80' },
                    { label: 'Dark Carbon', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setGroupCardBgImage(p.url)
                        setGroupCardBgFile(null)
                      }}
                      className={`text-[9px] font-bold py-1 px-1.5 rounded-lg border truncate transition ${
                        groupCardBgImage === p.url
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-background hover:bg-muted border-border text-foreground'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {groupCardBgImage && (
                <div className="flex items-center gap-2 pt-1">
                  <div
                    className="h-9 w-14 rounded-lg border border-purple-300 shadow-2xs"
                    style={{
                      backgroundImage: `url(${groupCardBgImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <span className="text-[10px] text-emerald-600 font-bold">
                    ✓ Background active (shows on card reveal)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 8. Tournament Branding */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-base font-black text-foreground flex items-center gap-2 mb-1">
          <Palette className="h-5 w-5 text-purple-500" />
          Tournament Branding
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Card Colour */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Group Draw Card Non-Logo Colour</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={groupCardColour}
                onChange={(e) => setGroupCardColour(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-border p-0.5 bg-background"
              />
              <Input
                value={groupCardColour}
                onChange={(e) => setGroupCardColour(e.target.value)}
                className="w-32 text-xs font-mono font-bold rounded-xl border-border bg-background"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              This is the colour of the card area outside the fixed tournament logo area.
            </p>
          </div>

          {/* Tournament Logo */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Tournament Logo</Label>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => setTournamentLogoFile(e.target.files?.[0] || null)}
              className="text-xs rounded-xl border-border bg-background"
            />
            <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={removeTournamentLogoBg}
                onChange={(e) => setRemoveTournamentLogoBg(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500"
              />
              Remove background and use transparent version
            </label>
            {tournamentLogo && (
              <div className="flex items-center gap-2 pt-1">
                <img
                  src={resolveMediaUrl(tournamentLogo)}
                  alt="Tournament Logo"
                  className="h-10 w-10 object-contain rounded-lg border bg-muted/40 p-1"
                />
                <span className="text-[11px] text-muted-foreground">Current logo loaded</span>
              </div>
            )}
          </div>

          {/* Auction Background */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Auction Background</Label>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => setAuctionBgFile(e.target.files?.[0] || null)}
              className="text-xs rounded-xl border-border bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              Used behind the live auction page. PDF backgrounds are configured separately in PDF Design Setup.
            </p>
          </div>

          {/* Overall Background */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Overall Tournament Background</Label>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => setOverallBgFile(e.target.files?.[0] || null)}
              className="text-xs rounded-xl border-border bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              Used on tournament management pages where applicable.
            </p>
          </div>
        </div>
      </section>

      {/* 9. Online Timer & Sound */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-base font-black text-foreground flex items-center gap-2 mb-1">
          <Clock className="h-5 w-5 text-amber-500" />
          Online Timer & Sound
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-2 flex items-center">
            <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlineTimerEnabled}
                onChange={(e) => setOnlineTimerEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
              />
              Enable automatic bidding timer
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Timer seconds</Label>
            <Input
              type="number"
              min={1}
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(parseInt(e.target.value) || 30)}
              className="text-xs font-bold rounded-xl border-border bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Closing wait seconds</Label>
            <Input
              type="number"
              min={0}
              value={closingWaitSeconds}
              onChange={(e) => setClosingWaitSeconds(parseInt(e.target.value) || 5)}
              className="text-xs font-bold rounded-xl border-border bg-background"
            />
          </div>

          <div className="space-y-2 flex items-center">
            <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => setSoundEffects(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
              />
              Sound effects enabled
            </label>
          </div>
        </div>
      </section>

      {/* 10. Dynamic Squad Composition Rules (Purse Protected Engine) */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-base font-black text-foreground flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-emerald-600" />
          Squad Composition Rules (Purse-Protected Enforcement)
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Server-side authoritative squad constraints (e.g. Gender → Female → Min 4, or Role → Bowler quotas). Max Bid calculation guarantees purse reserves for these rules.
        </p>

        {/* Existing Squad Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {squadRules.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4"
            >
              <div>
                <span className="font-extrabold text-emerald-900 dark:text-emerald-300 text-sm block">
                  {r.field_key.toUpperCase()}: &apos;{r.field_value}&apos;
                </span>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Min: <span className="font-bold text-foreground">{r.min_count}</span>
                  {r.max_count !== null && (
                    <> | Max: <span className="font-bold text-foreground">{r.max_count}</span></>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteSquadRule(r.id)}
                className="text-muted-foreground hover:text-rose-600 p-1 rounded-lg hover:bg-background transition"
                title="Remove squad rule"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {squadRules.length === 0 && (
            <p className="text-xs text-muted-foreground italic col-span-2">No custom squad rules added yet.</p>
          )}
        </div>

        {/* Add Squad Rule Inline Form */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <select
            value={newRuleKey}
            onChange={(e) => setNewRuleKey(e.target.value)}
            className="rounded-xl border border-border bg-background p-2 text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="category">Category</option>
            <option value="role">Role</option>
            <option value="gender">Gender</option>
            <option value="batting_style">Batting Style</option>
            <option value="bowling_style">Bowling Style</option>
            <option value="location">Location</option>
          </select>
          <Input
            placeholder="Value (e.g. Male, Female, Bowler)"
            value={newRuleValue}
            onChange={(e) => setNewRuleValue(e.target.value)}
            className="w-48 bg-background border-border text-xs rounded-xl font-medium"
          />
          <Input
            type="number"
            placeholder="Min Count"
            value={newRuleMin}
            onChange={(e) => setNewRuleMin(parseInt(e.target.value) || 0)}
            className="w-28 bg-background border-border text-xs rounded-xl font-medium"
          />
          <Input
            type="number"
            placeholder="Max Count (opt)"
            value={newRuleMax || ''}
            onChange={(e) => setNewRuleMax(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-28 bg-background border-border text-xs rounded-xl font-medium"
          />
          <Button
            size="sm"
            type="button"
            onClick={handleAddSquadRule}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Squad Constraint
          </Button>
        </div>
      </section>

      {/* Floating Bottom Action Bar */}
      <div className="sticky bottom-4 z-40 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-xl">
        <div className="text-xs text-muted-foreground">
          Make changes and click <strong className="text-foreground">Save Setup & Rules</strong> to sync to backend in real time.
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSetupRules}
            disabled={saving}
            className="rounded-xl text-xs font-bold"
          >
            Reset / Reload
          </Button>
          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black rounded-xl text-xs px-6 shadow-sm"
          >
            {saving ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save Setup & Rules
          </Button>
        </div>
      </div>

      {/* Interactive Celebration Preview Overlay */}
      {previewAnimation && (
        <div
          onClick={() => setPreviewAnimation(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer animate-in fade-in"
        >
          <div className="text-center space-y-4 p-8 relative max-w-lg">
            {/* Visual Effect Render according to previewAnimation.style */}
            <div className="relative flex flex-col items-center justify-center">
              {previewAnimation.style === 'Spotlight' && (
                <div className="w-64 h-64 rounded-full bg-gradient-to-b from-yellow-300/40 via-amber-400/20 to-transparent blur-2xl animate-pulse" />
              )}
              {previewAnimation.style === 'Fireworks' && (
                <div className="flex gap-2">
                  <span className="text-6xl animate-bounce">🎆</span>
                  <span className="text-7xl animate-pulse">✨</span>
                  <span className="text-6xl animate-bounce">🎇</span>
                </div>
              )}
              {previewAnimation.style === 'Confetti Burst' && (
                <div className="text-7xl animate-bounce">🎉 🎊 ✨</div>
              )}
              {previewAnimation.style === 'Gold Celebration' && (
                <div className="text-7xl animate-pulse">👑 🌟 🪙 🌟 👑</div>
              )}
              {previewAnimation.style === 'Trophy Celebration' && (
                <div className="text-8xl animate-bounce">🏆</div>
              )}

              <h1 className="text-6xl font-black text-amber-400 tracking-wider uppercase mt-4 drop-shadow-[0_4px_16px_rgba(251,191,36,0.6)]">
                {previewAnimation.label}
              </h1>
              <p className="text-sm font-bold text-white/90 mt-2">
                Style: <span className="text-amber-300">{previewAnimation.style}</span> ({previewAnimation.duration}s)
              </p>
            </div>
            <p className="text-xs text-white/50">Click anywhere to dismiss preview</p>
          </div>
        </div>
      )}
    </div>
  )
}
