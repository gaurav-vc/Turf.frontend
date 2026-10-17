import { useState, useEffect } from 'react'
import { apiClient } from '@/api/apiClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SetPricing() {
  const [turfs, setTurfs] = useState([])
  const [courts, setCourts] = useState([])
  const [form, setForm] = useState({ court: '', rule_type: 'fixed', value: '' })

  useEffect(() => {
    apiClient.get('/v1/turfs-app/turfs/').then(res => setTurfs(res.data))
    apiClient.get('/v1/turfs-app/courts/').then(res => setCourts(res.data))
  }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    try {
      await apiClient.post('/v1/turfs-app/price-rules/', {
        ...form,
        priority: 1
      })
      alert('Price created!')
      setForm({ ...form, value: '' })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Set Turf Price</h1>
        <p className="text-muted-foreground">Configure hourly rates for courts.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-xl border border-border">
        <div>
          <Label>Select Court</Label>
          <select className="w-full h-10 border border-border rounded-md px-3 bg-background" value={form.court} onChange={e => setForm({...form, court: e.target.value})} required>
            <option value="">-- Select --</option>
            {courts.map((c: any) => {
              const turf = turfs.find((t: any) => t.id === c.turf) as any;
              return <option key={c.id} value={c.id}>{turf?.name} - {c.name}</option>
            })}
          </select>
        </div>
        <div>
          <Label>Price (per hour)</Label>
          <Input type="number" step="0.01" value={form.value} onChange={e => setForm({...form, value: e.target.value})} required placeholder="e.g. 1500.00" />
        </div>
        <Button type="submit" className="bg-brand hover:bg-brand-hover text-white">Save Price</Button>
      </form>
    </div>
  )
}
