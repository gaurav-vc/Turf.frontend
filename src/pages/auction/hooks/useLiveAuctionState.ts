import { useState, useEffect, useRef, useCallback } from 'react'
import { apiClient } from '@/api/apiClient'

export interface BidHistoryItem {
  id: string
  amount: number
  team_id: string
  team_name: string
  short_name: string
  team_logo?: string
  bid_type: string
  created_at: string
}

export interface PlayerOnBlock {
  id: string
  player_name: string
  serial_no: number
  category: string
  role: string
  batting_style: string
  bowling_style: string
  location: string
  base_price: number
  photo_url: string
  status: string
  custom_data: Record<string, any>
}

export interface TeamFinancial {
  team_id: string
  team_name: string
  short_name: string
  team_color?: string
  team_logo?: string
  kitty: number
  spent: number
  balance: number
  reserve: number
  future_base_cost: number
  max_bid: number
  bought: number
  pending: number
  category_counts: Record<string, number>
}

export interface LiveAuctionState {
  auction_id: string
  auction_name: string
  status: string
  active_player: PlayerOnBlock | null
  current_bid: number
  highest_bid: BidHistoryItem | null
  bid_history: BidHistoryItem[]
  teams: TeamFinancial[]
  config: Record<string, any>
  design: Record<string, any>
}

export function useLiveAuctionState(auctionId: string | null, pollIntervalMs = 1200) {
  const [state, setState] = useState<LiveAuctionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const pollTimerRef = useRef<any>(null)

  const fetchState = useCallback(async () => {
    if (!auctionId) return
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/live_state/`)
      setState(res.data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to poll auction state', err)
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  useEffect(() => {
    if (!auctionId) return
    setLoading(true)
    fetchState()

    pollTimerRef.current = setInterval(fetchState, pollIntervalMs)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [auctionId, pollIntervalMs, fetchState])

  const placeBid = async (teamId: string, amount?: number, isCustom = false, allowMultiple = false) => {
    if (!auctionId) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/bid/`, {
        team_id: teamId,
        amount,
        is_custom: isCustom,
        allow_multiple: allowMultiple,
      })
      setState(res.data)
      return { success: true }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Bid failed'
      return { success: false, error: msg }
    } finally {
      setActionLoading(false)
    }
  }

  const hammerSold = async () => {
    if (!auctionId) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/hammer_sold/`)
      if (res.data?.state) setState(res.data.state)
      return { success: true, celebration: res.data?.celebration }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Sold action failed'
      return { success: false, error: msg }
    } finally {
      setActionLoading(false)
    }
  }

  const hammerUnsold = async () => {
    if (!auctionId) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/hammer_unsold/`)
      if (res.data?.state) setState(res.data.state)
      return { success: true }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Unsold action failed'
      return { success: false, error: msg }
    } finally {
      setActionLoading(false)
    }
  }

  const undoSale = async () => {
    if (!auctionId) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/undo_sale/`)
      if (res.data?.state) setState(res.data.state)
      return { success: true, message: res.data?.message }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Undo sale failed'
      return { success: false, error: msg }
    } finally {
      setActionLoading(false)
    }
  }

  const undoBid = async () => {
    if (!auctionId) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/undo_bid/`)
      if (res.data?.state) setState(res.data.state)
      return { success: true }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Undo bid failed'
      return { success: false, error: msg }
    } finally {
      setActionLoading(false)
    }
  }

  const resetBid = async () => {
    if (!auctionId) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/reset_bid/`)
      if (res.data?.state) setState(res.data.state)
      return { success: true }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Reset bid failed'
      return { success: false, error: msg }
    } finally {
      setActionLoading(false)
    }
  }

  const selectPlayerNo = async (serialNo: number) => {
    if (!auctionId) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/select_player_no/`, {
        serial_no: serialNo,
      })
      if (res.data?.state) setState(res.data.state)
      return { success: true }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Select player failed'
      return { success: false, error: msg }
    } finally {
      setActionLoading(false)
    }
  }

  const startReauction = async (category?: string) => {
    if (!auctionId) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/reauction/`, {
        category,
      })
      if (res.data?.state) setState(res.data.state)
      return { success: true, message: res.data?.message }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Re-auction failed'
      return { success: false, error: msg }
    } finally {
      setActionLoading(false)
    }
  }

  const selectNextPlayer = async (category?: string) => {
    if (!auctionId) return
    setActionLoading(true)
    try {
      const res = await apiClient.post(`/v1/auction/console/${auctionId}/select_next_player/`, {
        category,
      })
      if (res.data?.state) setState(res.data.state)
      return { success: true }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to select next player'
      return { success: false, error: msg }
    } finally {
      setActionLoading(false)
    }
  }

  return {
    state,
    loading,
    error,
    actionLoading,
    refresh: fetchState,
    placeBid,
    hammerSold,
    hammerUnsold,
    undoSale,
    undoBid,
    resetBid,
    selectPlayerNo,
    selectNextPlayer,
    startReauction,
  }
}
