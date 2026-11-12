import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

export interface UserUIPreferences {
  fontSize: number // Card text font size (px), e.g. 10 to 28
  fontColor: string // Custom font color override, e.g. '#FFFFFF', '#00F0FF', or empty for team color
  useCustomColor: boolean // If true, apply fontColor; if false, use dynamic team sequence color
  cardBg: 'default' | 'oled' | 'navy' | 'carbon' | 'transparent'
  borderGlow: boolean
}

export const DEFAULT_USER_UI_PREFS: UserUIPreferences = {
  fontSize: 15,
  fontColor: '#FFFFFF',
  useCustomColor: false,
  cardBg: 'default',
  borderGlow: true,
}

export function useUserUIPreferences(auctionId: string) {
  const user = useAuthStore((s) => s.user)
  const userIdentifier = user?.id || user?.email || 'local_user'
  const storageKey = `turf_auction_user_ui_pref_${userIdentifier}_${auctionId || 'default'}`

  const [prefs, setPrefs] = useState<UserUIPreferences>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...DEFAULT_USER_UI_PREFS, ...parsed }
      }
    } catch (e) {
      console.warn('Failed to parse user UI preferences', e)
    }
    return DEFAULT_USER_UI_PREFS
  })

  // Synchronize when storageKey changes (e.g. user logs in / auctionId changes)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setPrefs({ ...DEFAULT_USER_UI_PREFS, ...JSON.parse(saved) })
        return
      }
    } catch {}
    setPrefs(DEFAULT_USER_UI_PREFS)
  }, [storageKey])

  // Save to localStorage whenever prefs change
  const savePrefs = useCallback(
    (newPrefs: UserUIPreferences) => {
      setPrefs(newPrefs)
      try {
        localStorage.setItem(storageKey, JSON.stringify(newPrefs))
        window.dispatchEvent(
          new CustomEvent('auction_user_ui_pref_updated', {
            detail: { storageKey, prefs: newPrefs },
          })
        )
      } catch (e) {
        console.error('Error saving user UI preferences', e)
      }
    },
    [storageKey]
  )

  const updatePref = useCallback(
    <K extends keyof UserUIPreferences>(key: K, value: UserUIPreferences[K]) => {
      setPrefs((prev) => {
        const updated = { ...prev, [key]: value }
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated))
          window.dispatchEvent(
            new CustomEvent('auction_user_ui_pref_updated', {
              detail: { storageKey, prefs: updated },
            })
          )
        } catch {}
        return updated
      })
    },
    [storageKey]
  )

  const resetPrefs = useCallback(() => {
    setPrefs(DEFAULT_USER_UI_PREFS)
    try {
      localStorage.removeItem(storageKey)
      window.dispatchEvent(
        new CustomEvent('auction_user_ui_pref_updated', {
          detail: { storageKey, prefs: DEFAULT_USER_UI_PREFS },
        })
      )
    } catch {}
  }, [storageKey])

  // Listen for storage events from other components/windows
  useEffect(() => {
    const handleStorageEvent = (e: any) => {
      if (e.detail?.storageKey === storageKey && e.detail?.prefs) {
        setPrefs(e.detail.prefs)
      }
    }
    window.addEventListener('auction_user_ui_pref_updated', handleStorageEvent)
    return () => {
      window.removeEventListener('auction_user_ui_pref_updated', handleStorageEvent)
    }
  }, [storageKey])

  return {
    prefs,
    updatePref,
    savePrefs,
    resetPrefs,
    user,
    userIdentifier,
  }
}

