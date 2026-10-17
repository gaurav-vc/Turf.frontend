import { useState, useEffect } from 'react'
import { MessageSquare, CheckCircle2, AlertCircle, Eye, EyeOff, Save, PhoneCall, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { apiClient } from '@/api/apiClient'

interface CommunicationsStudioProps {
  auctionId: string
}

const DEFAULT_TEMPLATES = [
  { event_key: 'player_sold', title: 'Player Sold Notification', template_name: 'player_sold_alert', language: 'en_US', enabled: true, body_preview: 'Congratulations! {{player_name}} has been sold to {{team_name}} for {{sale_amount}}.' },
  { event_key: 'player_unsold', title: 'Player Unsold Alert', template_name: 'player_unsold_alert', language: 'en_US', enabled: false, body_preview: '{{player_name}} remains UNSOLD in the current bidding round.' },
  { event_key: 'squad_summary', title: 'Squad Purse Summary', template_name: 'squad_balance_update', language: 'en_US', enabled: true, body_preview: '{{team_name}} current purse balance is {{balance}}.' },
]

export default function CommunicationsStudio({ auctionId }: CommunicationsStudioProps) {
  const [settings, setSettings] = useState<any>({
    enabled: false,
    phone_number_id: '',
    access_token: '',
    business_account_id: '',
    language: 'en_US',
    graph_api_version: 'v23.0',
    sold_delay_minutes: 5,
  })

  const [templates, setTemplates] = useState<any[]>(DEFAULT_TEMPLATES)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    loadCommunications()
  }, [auctionId])

  const loadCommunications = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/communications/`)
      if (res.data?.settings) setSettings(res.data.settings)
      if (res.data?.templates && res.data.templates.length > 0) {
        setTemplates(res.data.templates)
      } else {
        setTemplates(DEFAULT_TEMPLATES)
      }
      if (res.data?.logs) setLogs(res.data.logs)
    } catch (err) {
      console.error('Failed to load communications', err)
      setTemplates(DEFAULT_TEMPLATES)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)
    try {
      await apiClient.post(`/v1/auction/console/${auctionId}/communications/`, {
        settings,
        templates,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save communication settings', err)
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/communications_test/`, {
        settings,
      })
      setTestResult({ ok: true, message: res.data.message || 'WhatsApp Cloud API connection successful!' })
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Connection test failed. Verify Phone ID and Access Token.'
      setTestResult({ ok: false, message: msg })
    } finally {
      setTesting(false)
    }
  }

  const updateTemplate = (idx: number, field: string, val: any) => {
    const updated = [...templates]
    updated[idx] = { ...updated[idx], [field]: val }
    setTemplates(updated)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            WhatsApp Broadcast & Cloud API Automation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automate instant player sold notifications, unsold alerts, and team squad balance summaries via Meta WhatsApp Cloud API.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4" /> Settings Saved!
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading communications studio...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* WhatsApp API Configuration Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                  Meta WhatsApp Cloud API Credentials
                </h3>
                <p className="text-[11px] text-slate-400">
                  Connect your official Meta Developer App to deliver transactional template messages.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 h-4 w-4"
                />
                <span>Enable Automation</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Business Account ID</label>
                <Input
                  value={settings.business_account_id || ''}
                  onChange={(e) => setSettings({ ...settings, business_account_id: e.target.value })}
                  placeholder="e.g. 102938475610293"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Phone Number ID</label>
                <Input
                  value={settings.phone_number_id || ''}
                  onChange={(e) => setSettings({ ...settings, phone_number_id: e.target.value })}
                  placeholder="e.g. 109283746501928"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Graph API Version</label>
                <Input
                  value={settings.graph_api_version || 'v23.0'}
                  onChange={(e) => setSettings({ ...settings, graph_api_version: e.target.value })}
                  placeholder="v23.0"
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">Permanent Access Token</label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    value={settings.access_token || ''}
                    onChange={(e) => setSettings({ ...settings, access_token: e.target.value })}
                    placeholder="EAAB..."
                    className="bg-slate-950 border-slate-800 text-xs text-white pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Sold Dispatch Delay (Minutes)</label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={settings.sold_delay_minutes ?? 5}
                  onChange={(e) => setSettings({ ...settings, sold_delay_minutes: Number(e.target.value) })}
                  className="bg-slate-950 border-slate-800 text-xs text-white"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">0 for immediate delivery</span>
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80">
              <Button
                type="button"
                variant="outline"
                disabled={testing || !settings.phone_number_id || !settings.access_token}
                onClick={handleTestConnection}
                className="border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Testing WhatsApp API...' : 'Test WhatsApp Connection'}
              </Button>

              {testResult && (
                <div
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                    testResult.ok
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  {testResult.message}
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Event Templates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Event Message Templates</h3>
                <p className="text-[11px] text-slate-400">
                  Configure approved WhatsApp template names and customize the fallback preview copy.
                </p>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Tokens: {'{{player_name}}'}, {'{{team_name}}'}, {'{{sale_amount}}'}, {'{{balance}}'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl, idx) => (
                <div
                  key={tpl.event_key || idx}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      {tpl.title || tpl.event_key}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tpl.enabled}
                        onChange={(e) => updateTemplate(idx, 'enabled', e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-emerald-500 h-3.5 w-3.5"
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-0.5">Template Name</label>
                      <Input
                        value={tpl.template_name || ''}
                        onChange={(e) => updateTemplate(idx, 'template_name', e.target.value)}
                        placeholder="template_name_in_meta"
                        className="bg-slate-950 border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-0.5">Language</label>
                      <Input
                        value={tpl.language || 'en_US'}
                        onChange={(e) => updateTemplate(idx, 'language', e.target.value)}
                        placeholder="en_US"
                        className="bg-slate-950 border-slate-800 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-0.5">Message Copy / Preview</label>
                    <Textarea
                      rows={3}
                      value={tpl.body_preview || ''}
                      onChange={(e) => updateTemplate(idx, 'body_preview', e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs text-slate-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Communication Settings'}
            </Button>
          </div>

          {/* Communication Logs */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Recent Communication & Auction Event Logs</span>
              <span className="text-xs text-slate-500 font-normal">Last {logs.length} events</span>
            </h3>

            {logs.length === 0 ? (
              <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                No communication messages logged yet. Events will record here during live bidding.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-slate-950 text-slate-400 uppercase font-semibold text-[10px]">
                    <tr className="border-b border-slate-800">
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3">Event</th>
                      <th className="py-2 px-3">Recipient</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {logs.map((l, i) => (
                      <tr key={l.id || i} className="hover:bg-slate-800/20">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-400">{l.time}</td>
                        <td className="py-2 px-3 font-semibold text-white">{l.event}</td>
                        <td className="py-2 px-3 text-slate-300">{l.recipient}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
