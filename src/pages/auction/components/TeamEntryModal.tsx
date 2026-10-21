import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient, resolveMediaUrl } from '@/api/apiClient'

interface TeamEntryModalProps {
  auctionId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  teamToEdit?: any | null
  existingTeamsCount?: number
}

const COLOR_PALETTE = [
  '#2563EB', '#DC2626', '#EAB308', '#16A34A', '#7C3AED', '#EA580C',
  '#0891B2', '#DB2777', '#4F46E5', '#059669', '#D97706', '#9333EA',
  '#0284C7', '#E11D48', '#65A30D', '#0D9488'
]

export default function TeamEntryModal({
  auctionId,
  isOpen,
  onClose,
  onSuccess,
  teamToEdit,
  existingTeamsCount = 0
}: TeamEntryModalProps) {
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerMobile, setOwnerMobile] = useState('')
  const [managerName, setManagerName] = useState('')
  const [managerEmail, setManagerEmail] = useState('')
  const [managerMobile, setManagerMobile] = useState('')
  const [teamColor, setTeamColor] = useState('#2563EB')
  const [logoUrl, setLogoUrl] = useState('')
  const [removeBg, setRemoveBg] = useState(false)
  const [additionalKitty, setAdditionalKitty] = useState<number>(0)
  const [penalty, setPenalty] = useState<number>(0)
  const [reserve, setReserve] = useState<number>(0)
  const [sponsorName, setSponsorName] = useState('')

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
      if (teamToEdit) {
        setName(teamToEdit.name || '')
        setShortName(teamToEdit.short_name || '')
        setOwnerName(teamToEdit.owner_name || '')
        setOwnerEmail(teamToEdit.owner_email || '')
        setOwnerMobile(teamToEdit.owner_mobile || '')
        setManagerName(teamToEdit.manager_name || '')
        setManagerEmail(teamToEdit.manager_email || '')
        setManagerMobile(teamToEdit.manager_mobile || '')
        setTeamColor(teamToEdit.color || '#2563EB')
        setLogoUrl(teamToEdit.logo_url || '')
        setRemoveBg(Boolean(teamToEdit.remove_logo_background))
        setAdditionalKitty(teamToEdit.additional_kitty || 0)
        setPenalty(teamToEdit.penalty_amount || 0)
        setReserve(teamToEdit.reserve_amount || 0)
        setSponsorName(teamToEdit.sponsor_name || '')
        setLogoPreview(resolveMediaUrl(teamToEdit.logo || teamToEdit.logo_url) || null)
        setLogoFile(null)
      } else {
        // New Team: Auto distinct color
        const distinct = COLOR_PALETTE[existingTeamsCount % COLOR_PALETTE.length]
        setName('')
        setShortName('')
        setOwnerName('')
        setOwnerEmail('')
        setOwnerMobile('')
        setManagerName('')
        setManagerEmail('')
        setManagerMobile('')
        setTeamColor(distinct)
        setLogoUrl('')
        setRemoveBg(false)
        setAdditionalKitty(0)
        setPenalty(0)
        setReserve(0)
        setSponsorName('')
        setLogoPreview(null)
        setLogoFile(null)
      }
    }
  }, [isOpen, teamToEdit, existingTeamsCount])

  // Automatically update shortName if user hasn't manually customized it
  const handleNameChange = (val: string) => {
    setName(val)
    if (!teamToEdit && (!shortName || shortName.length <= 3)) {
      const generated = val
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3)
      if (generated) setShortName(generated)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('Team name is required.')
      return
    }
    if (!shortName.trim() || shortName.length > 3) {
      setErrorMsg('Short name must be 1 to 3 characters.')
      return
    }
    if (!ownerName.trim()) {
      setErrorMsg('Owner name is required.')
      return
    }
    if (!ownerEmail.trim()) {
      setErrorMsg('Owner email is required.')
      return
    }
    if (!ownerMobile.trim()) {
      setErrorMsg('Owner mobile is required.')
      return
    }

    setSaving(true)
    setErrorMsg('')

    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('short_name', shortName.trim().toUpperCase())
      formData.append('owner_name', ownerName.trim())
      formData.append('owner_email', ownerEmail.trim())
      formData.append('owner_mobile', ownerMobile.trim())
      formData.append('manager_name', managerName.trim())
      formData.append('manager_email', managerEmail.trim())
      formData.append('manager_mobile', managerMobile.trim())
      formData.append('color', teamColor)
      formData.append('team_colour', teamColor)
      formData.append('logo_url', logoUrl.trim())
      formData.append('remove_logo_background', removeBg ? 'true' : 'false')
      formData.append('additional_kitty', additionalKitty.toString())
      formData.append('penalty_amount', penalty.toString())
      formData.append('reserve_amount', reserve.toString())
      formData.append('sponsor_name', sponsorName.trim())

      if (logoFile) {
        formData.append('logo', logoFile)
      }

      if (teamToEdit?.id) {
        await apiClient.patch(`/v1/auction/console/${auctionId}/teams/${teamToEdit.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await apiClient.post(`/v1/auction/console/${auctionId}/teams/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving team:', err)
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to save franchise team.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card w-full max-w-3xl rounded-3xl shadow-2xl border border-border overflow-hidden my-8"
        >
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-md"
                style={{ backgroundColor: teamColor }}
              >
                {shortName ? shortName.slice(0, 3) : <Shield className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-xl font-bold">{teamToEdit ? 'Edit Team' : 'Add Team'}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Team colour and logo are maintained after import/basic entry.
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Primary Team Identity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold">Team name *</Label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Mumbai Titans"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Short name * (1–3 characters)</Label>
                <Input
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value.toUpperCase().slice(0, 3))}
                  placeholder="e.g. MT"
                  maxLength={3}
                  required
                  className="font-mono uppercase font-bold"
                />
              </div>
            </div>

            {/* Ownership Details */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Owner Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Owner name *</Label>
                  <Input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Owner email *</Label>
                  <Input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@domain.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Owner mobile *</Label>
                  <Input
                    type="tel"
                    value={ownerMobile}
                    onChange={(e) => setOwnerMobile(e.target.value)}
                    placeholder="10-digit mobile"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Manager / Co-Owner Details */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Manager / Co-Owner Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Manager / Co-owner name</Label>
                  <Input
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Manager / Co-owner email</Label>
                  <Input
                    type="email"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Manager / Co-owner mobile</Label>
                  <Input
                    type="tel"
                    value={managerMobile}
                    onChange={(e) => setManagerMobile(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Branding & Logo */}
            <div className="space-y-4 pt-2 border-t border-border/60">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Team Colour & Logo</h3>

              {/* Color selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Team colour</Label>
                  <span className="text-[11px] text-muted-foreground">
                    A distinct colour is generated automatically for new teams.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    value={teamColor}
                    onChange={(e) => setTeamColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-border p-1 bg-background"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTeamColor(c)}
                        className={`w-7 h-7 rounded-lg transition-transform ${teamColor.toLowerCase() === c.toLowerCase() ? 'scale-110 ring-2 ring-foreground ring-offset-2' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Logo Upload & URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-border/60">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Team logo (Upload Image)</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer text-muted-foreground"
                  />
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="removeLogoBg"
                      checked={removeBg}
                      onChange={(e) => setRemoveBg(e.target.checked)}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="removeLogoBg" className="text-xs font-medium cursor-pointer">
                      Remove logo background
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Team logo URL</Label>
                  <Input
                    value={logoUrl}
                    onChange={(e) => {
                      setLogoUrl(e.target.value)
                      if (!logoFile) setLogoPreview(e.target.value)
                    }}
                    placeholder="https://.../team-logo.png"
                  />
                  {logoPreview && (
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <div className="w-8 h-8 rounded-lg border border-border overflow-hidden bg-black/10 flex items-center justify-center p-0.5">
                        <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600">Logo preview ready</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Adjustments */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Purse Adjustments</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Additional Kitty (₹)</Label>
                  <Input
                    type="number"
                    value={additionalKitty}
                    onChange={(e) => setAdditionalKitty(parseFloat(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Penalty (₹)</Label>
                  <Input
                    type="number"
                    value={penalty}
                    onChange={(e) => setPenalty(parseFloat(e.target.value) || 0)}
                    className="font-mono text-destructive"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Reserve (₹)</Label>
                  <Input
                    type="number"
                    value={reserve}
                    onChange={(e) => setReserve(parseFloat(e.target.value) || 0)}
                    className="font-mono text-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Team Information */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Additional Team Information</h3>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Sponsor Name</Label>
                <Input
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="e.g. Red Bull / Dream11"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl font-bold">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> {teamToEdit ? 'Update Team' : 'Add Team'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
