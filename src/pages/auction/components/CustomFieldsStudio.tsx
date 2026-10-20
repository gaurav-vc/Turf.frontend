import { useState, useEffect } from 'react'
import { Plus, Trash2, RefreshCw, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/api/apiClient'

interface CustomFieldsStudioProps {
  auctionId: string
}

export default function CustomFieldsStudio({ auctionId }: CustomFieldsStudioProps) {
  const [fields, setFields] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // New field form
  const [entityType, setEntityType] = useState<'player' | 'team'>('player')
  const [fieldKey, setFieldKey] = useState('')
  const [label, setLabel] = useState('')
  const [dataType, setDataType] = useState<'text' | 'number' | 'select' | 'multiselect'>('text')
  const [required, setRequired] = useState(false)
  const [filterable, setFilterable] = useState(true)

  useEffect(() => {
    loadFields()
  }, [auctionId])

  const loadFields = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/v1/auction/custom-fields/?auction=${auctionId}`)
      setFields(res.data.results || res.data || [])
    } catch (err) {
      console.error('Failed to load custom fields', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddField = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!fieldKey.trim() || !label.trim()) return
    setSubmitting(true)
    try {
      await apiClient.post('/v1/auction/custom-fields/', {
        auction: auctionId,
        entity_type: entityType,
        field_key: fieldKey.trim().toLowerCase().replace(/\s+/g, '_'),
        label: label.trim(),
        data_type: dataType,
        required,
        filterable,
        active: true,
      })
      setFieldKey('')
      setLabel('')
      loadFields()
    } catch (err: any) {
      console.error('Add field failed', err)
      alert(err.response?.data?.error || 'Failed to add custom field')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteField = async (id: string, fieldLabel: string) => {
    if (!confirm(`Delete custom field "${fieldLabel}"?`)) return
    try {
      await apiClient.delete(`/v1/auction/custom-fields/${id}/`)
      loadFields()
    } catch (err) {
      console.error('Delete field failed', err)
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-500" />
            Extensible Custom Field Studio
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Define dynamic attributes for players and teams. Select fields automatically learn distinct options when uploaded via CSV or Excel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            {fields.length} {fields.length === 1 ? 'Field' : 'Fields'} Configured
          </span>
        </div>
      </div>

      {/* Main Studio Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 flex items-center gap-2">
              <span>Active Custom Field Definitions</span>
            </h3>
          </div>

          {/* Existing Custom Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.map((f) => (
              <div
                key={f.id}
                className="rounded-2xl border-2 border-slate-200/90 bg-slate-50/70 p-4 flex flex-col justify-between hover:border-amber-400 hover:shadow-sm transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-extrabold text-zinc-900 text-sm leading-tight">{f.label}</span>
                    <span className="shrink-0 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider">
                      {f.data_type}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs font-mono text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-semibold">
                      key: <span className="text-zinc-900 font-bold">{f.field_key}</span>
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                        f.entity_type === 'player'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-blue-50 text-blue-800 border-blue-300'
                      }`}
                    >
                      {f.entity_type === 'player' ? 'Player' : 'Team'}
                    </span>
                  </div>

                  {/* Learned Options */}
                  {f.options && f.options.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200">
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block mb-1.5">
                        Learned Options ({f.options.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {f.options.map((opt: any) => (
                          <span
                            key={opt.id}
                            className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-zinc-800 font-semibold shadow-2xs"
                          >
                            {opt.option_value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    {f.required && (
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        Required
                      </span>
                    )}
                    {f.filterable && (
                      <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        Filterable
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteField(f.id, f.label)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                    title="Delete field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="col-span-full border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50/60">
                <Tag className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-zinc-900">No custom fields defined yet</p>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Create custom attributes below like Jersey Size, Base Town, or Application ID to capture extra player/team details.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Custom Field Form */}
        <div className="border-t border-slate-200 pt-6">
          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 mb-3 flex items-center gap-2">
            <span>Add New Custom Field</span>
          </h4>
          <form onSubmit={handleAddField} className="flex flex-wrap items-center gap-3">
            <select
              value={entityType}
              onChange={(e: any) => setEntityType(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
            >
              <option value="player">Player Field</option>
              <option value="team">Team Field</option>
            </select>
            <Input
              placeholder="Field Key (e.g. jersey_size, awards)"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              className="w-56 bg-white border-slate-300 text-xs font-semibold text-zinc-900 placeholder:text-slate-400 rounded-xl focus:border-amber-500 shadow-xs"
            />
            <Input
              placeholder="Display Label (e.g. Jersey Size)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-56 bg-white border-slate-300 text-xs font-semibold text-zinc-900 placeholder:text-slate-400 rounded-xl focus:border-amber-500 shadow-xs"
            />
            <select
              value={dataType}
              onChange={(e: any) => setDataType(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="select">Select (Auto-Learned)</option>
              <option value="multiselect">Multi-Select</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              Required
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterable}
                onChange={(e) => setFilterable(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              Filterable
            </label>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !fieldKey.trim() || !label.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs px-4 py-2 rounded-xl shadow-xs transition"
            >
              <Plus className="h-4 w-4 mr-1 stroke-[3]" />
              {submitting ? 'Adding...' : 'Add Definition'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
