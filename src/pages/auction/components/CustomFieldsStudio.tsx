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

  const handleAddField = async () => {
    if (!fieldKey || !label) return
    try {
      await apiClient.post('/v1/auction/custom-fields/', {
        auction: auctionId,
        entity_type: entityType,
        field_key: fieldKey.toLowerCase().replace(/\s+/g, '_'),
        label,
        data_type: dataType,
        required,
        filterable,
        active: true,
      })
      setFieldKey('')
      setLabel('')
      loadFields()
    } catch (err) {
      console.error('Add field failed', err)
    }
  }

  const handleDeleteField = async (id: string) => {
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
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
          <Tag className="h-5 w-5 text-amber-400" />
          Extensible Custom Field Studio
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Add dynamic attributes for players and teams. Select fields automatically learn distinct options when uploaded via CSV or Excel.
        </p>

        {/* Existing Custom Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {fields.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-sm">{f.label}</span>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300 uppercase">
                    {f.data_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">key: {f.field_key}</p>

                {/* Learned Options */}
                {f.options && f.options.length > 0 && (
                  <div className="mt-2.5">
                    <span className="text-[10px] text-slate-500 uppercase block mb-1">
                      Learned Options ({f.options.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {f.options.map((opt: any) => (
                        <span
                          key={opt.id}
                          className="rounded-md border border-white/10 bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
                        >
                          {opt.option_value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>{f.entity_type === 'player' ? 'Player Attribute' : 'Team Attribute'}</span>
                <button
                  onClick={() => handleDeleteField(f.id)}
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-xs text-slate-500 italic col-span-3">No custom fields defined yet.</p>
          )}
        </div>

        {/* Add Custom Field Form */}
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
            Add New Custom Field
          </h4>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={entityType}
              onChange={(e: any) => setEntityType(e.target.value)}
              className="rounded-lg border border-white/20 bg-slate-800 p-2 text-xs text-white"
            >
              <option value="player">Player Field</option>
              <option value="team">Team Field</option>
            </select>
            <Input
              placeholder="Field Key (e.g. jersey_size, awards)"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              className="w-48 bg-white/5 text-xs text-white"
            />
            <Input
              placeholder="Display Label (e.g. Jersey Size)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-48 bg-white/5 text-xs text-white"
            />
            <select
              value={dataType}
              onChange={(e: any) => setDataType(e.target.value)}
              className="rounded-lg border border-white/20 bg-slate-800 p-2 text-xs text-white"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="select">Select (Auto-Learned)</option>
              <option value="multiselect">Multi-Select</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-white/20 text-amber-500"
              />
              Required
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filterable}
                onChange={(e) => setFilterable(e.target.checked)}
                className="rounded border-white/20 text-amber-500"
              />
              Filterable
            </label>
            <Button
              size="sm"
              onClick={handleAddField}
              className="bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Definition
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
