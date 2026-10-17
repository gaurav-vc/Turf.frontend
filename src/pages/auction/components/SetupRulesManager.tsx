import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, RefreshCw, Sliders, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/api/apiClient'

interface SetupRulesManagerProps {
  auctionId: string
}

export default function SetupRulesManager({ auctionId }: SetupRulesManagerProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [slabs, setSlabs] = useState<any[]>([])
  const [squadRules, setSquadRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // New Rule Form
  const [newRuleKey, setNewRuleKey] = useState('category')
  const [newRuleValue, setNewRuleValue] = useState('')
  const [newRuleMin, setNewRuleMin] = useState<number>(1)
  const [newRuleMax, setNewRuleMax] = useState<number | undefined>(undefined)

  // New Category Form
  const [newCatName, setNewCatName] = useState('')
  const [newCatTarget, setNewCatTarget] = useState<number>(3)
  const [newCatBasePrice, setNewCatBasePrice] = useState<number>(2000)

  // New Slab Form
  const [newSlabUpTo, setNewSlabUpTo] = useState<number>(1000000)
  const [newSlabInc, setNewSlabInc] = useState<number>(50000)

  useEffect(() => {
    loadAllRules()
  }, [auctionId])

  const loadAllRules = async () => {
    setLoading(true)
    try {
      const [catRes, slabRes, ruleRes] = await Promise.all([
        apiClient.get(`/v1/auction/categories/?auction=${auctionId}`),
        apiClient.get(`/v1/auction/slabs/?auction=${auctionId}`),
        apiClient.get(`/v1/auction/squad-rules/?auction=${auctionId}`),
      ])
      setCategories(catRes.data.results || catRes.data || [])
      setSlabs(slabRes.data.results || slabRes.data || [])
      setSquadRules(ruleRes.data.results || ruleRes.data || [])
    } catch (err) {
      console.error('Failed to load rules', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCatName) return
    try {
      await apiClient.post('/v1/auction/categories/', {
        auction: auctionId,
        name: newCatName,
        target_count: newCatTarget,
        base_price: newCatBasePrice,
      })
      setNewCatName('')
      loadAllRules()
    } catch (err) {
      console.error('Add category failed', err)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      await apiClient.delete(`/v1/auction/categories/${id}/`)
      loadAllRules()
    } catch (err) {
      console.error('Delete category failed', err)
    }
  }

  const handleAddSquadRule = async () => {
    if (!newRuleValue) return
    try {
      await apiClient.post('/v1/auction/squad-rules/', {
        auction: auctionId,
        field_key: newRuleKey,
        field_value: newRuleValue,
        min_count: newRuleMin,
        max_count: newRuleMax,
        operator: 'minimum',
        active: true,
      })
      setNewRuleValue('')
      loadAllRules()
    } catch (err) {
      console.error('Add squad rule failed', err)
    }
  }

  const handleDeleteSquadRule = async (id: string) => {
    try {
      await apiClient.delete(`/v1/auction/squad-rules/${id}/`)
      loadAllRules()
    } catch (err) {
      console.error('Delete squad rule failed', err)
    }
  }

  const handleAddSlab = async () => {
    try {
      await apiClient.post('/v1/auction/slabs/', {
        auction: auctionId,
        up_to_bid: newSlabUpTo,
        increment: newSlabInc,
      })
      loadAllRules()
    } catch (err) {
      console.error('Add slab failed', err)
    }
  }

  const handleDeleteSlab = async (id: string) => {
    try {
      await apiClient.delete(`/v1/auction/slabs/${id}/`)
      loadAllRules()
    } catch (err) {
      console.error('Delete slab failed', err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Categories Quota Management */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
          <Layers className="h-5 w-5 text-amber-400" />
          Category Target Quotas & Base Prices
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Defines the mandatory number of players each franchise must acquire per category.
        </p>

        {/* Existing Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5"
            >
              <div>
                <span className="font-bold text-white text-sm">{c.name}</span>
                <p className="text-xs text-slate-400">
                  Target: <span className="text-amber-300 font-semibold">{c.target_count} players</span> | Base: ₹{parseFloat(c.base_price).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleDeleteCategory(c.id)}
                className="text-slate-500 hover:text-red-400 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Category Form */}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
          <Input
            placeholder="Category Name (e.g. Icon, Batsman)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="w-48 bg-white/5 text-xs text-white"
          />
          <Input
            type="number"
            placeholder="Target Count"
            value={newCatTarget}
            onChange={(e) => setNewCatTarget(parseInt(e.target.value) || 0)}
            className="w-32 bg-white/5 text-xs text-white"
          />
          <Input
            type="number"
            placeholder="Base Price (₹)"
            value={newCatBasePrice}
            onChange={(e) => setNewCatBasePrice(parseFloat(e.target.value) || 0)}
            className="w-36 bg-white/5 text-xs text-white"
          />
          <Button
            size="sm"
            onClick={handleAddCategory}
            className="bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Category
          </Button>
        </div>
      </div>

      {/* Dynamic Squad Rules Engine (e.g. Male 8 + Female 4) */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-emerald-400" />
          Squad Composition Rules (Dynamic DP Enforcement)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Server-side authoritative squad constraints (e.g., Male 8 + Female 4 or Bowler quotas). Max Bid calculation guarantees purse reserves for these rules.
        </p>

        {/* Active Rules List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {squadRules.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5"
            >
              <div>
                <span className="font-bold text-emerald-300 text-sm">
                  {r.field_key.toUpperCase()}: &apos;{r.field_value}&apos;
                </span>
                <p className="text-xs text-slate-300 mt-0.5">
                  Min: <span className="font-semibold text-white">{r.min_count}</span>
                  {r.max_count !== null && (
                    <> | Max: <span className="font-semibold text-white">{r.max_count}</span></>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleDeleteSquadRule(r.id)}
                className="text-slate-500 hover:text-red-400 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {squadRules.length === 0 && (
            <p className="text-xs text-slate-500 italic col-span-2">No custom squad rules added yet.</p>
          )}
        </div>

        {/* Add Squad Rule Form */}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
          <select
            value={newRuleKey}
            onChange={(e) => setNewRuleKey(e.target.value)}
            className="rounded-lg border border-white/20 bg-slate-800 p-2 text-xs text-white"
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
            className="w-48 bg-white/5 text-xs text-white"
          />
          <Input
            type="number"
            placeholder="Min Count"
            value={newRuleMin}
            onChange={(e) => setNewRuleMin(parseInt(e.target.value) || 0)}
            className="w-28 bg-white/5 text-xs text-white"
          />
          <Input
            type="number"
            placeholder="Max Count (opt)"
            value={newRuleMax || ''}
            onChange={(e) => setNewRuleMax(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-28 bg-white/5 text-xs text-white"
          />
          <Button
            size="sm"
            onClick={handleAddSquadRule}
            className="bg-emerald-600 text-white font-bold hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Squad Constraint
          </Button>
        </div>
      </div>

      {/* Bid Slabs Ladder */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
          <Sliders className="h-5 w-5 text-blue-400" />
          Bid Increment Slabs Ladder
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Configures minimum increment step based on current bid threshold.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {slabs.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5"
            >
              <div>
                <span className="font-bold text-white text-sm">Up to ₹{parseFloat(s.up_to_bid).toLocaleString()}</span>
                <p className="text-xs text-blue-300 font-semibold">
                  Increment: +₹{parseFloat(s.increment).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleDeleteSlab(s.id)}
                className="text-slate-500 hover:text-red-400 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-white/5 pt-4">
          <Input
            type="number"
            placeholder="Up to Bid Amount (₹)"
            value={newSlabUpTo}
            onChange={(e) => setNewSlabUpTo(parseFloat(e.target.value) || 0)}
            className="w-48 bg-white/5 text-xs text-white"
          />
          <Input
            type="number"
            placeholder="Increment Step (₹)"
            value={newSlabInc}
            onChange={(e) => setNewSlabInc(parseFloat(e.target.value) || 0)}
            className="w-40 bg-white/5 text-xs text-white"
          />
          <Button
            size="sm"
            onClick={handleAddSlab}
            className="bg-blue-600 text-white font-bold hover:bg-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Slab
          </Button>
        </div>
      </div>
    </div>
  )
}
