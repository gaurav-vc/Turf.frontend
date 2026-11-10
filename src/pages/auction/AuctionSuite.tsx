import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiClient, resolveMediaUrl } from '@/api/apiClient'
import {
  Gavel, Users, Layout, Sliders, Tag, Shuffle, Eye,
  Sparkles, MessageSquare, FileText, Tv, BarChart3, Shield, LayoutGrid
} from 'lucide-react'
import AuctionOverviewDashboard from './components/AuctionOverviewDashboard'
import LiveBroadcastConsole from './components/LiveBroadcastConsole'
import AuctionPageDesigner from './components/AuctionPageDesigner'
import SetupRulesManager from './components/SetupRulesManager'
import PlayerRosterManager from './components/PlayerRosterManager'
import CustomFieldsStudio from './components/CustomFieldsStudio'
import GroupDrawStage from './components/GroupDrawStage'
import PublicSpectatorPortal from './components/PublicSpectatorPortal'
import TeamsAndPlayersHub from './components/TeamsAndPlayersHub'
import SponsorMediaStudio from './components/SponsorMediaStudio'
import CommunicationsStudio from './components/CommunicationsStudio'
import PdfDesignStudio from './components/PdfDesignStudio'
import OverlayStudio from './components/OverlayStudio'
import PlayerCardSheetView from './components/PlayerCardSheetView'

export type TabType =
  | 'overview'
  | 'live'
  | 'roster'
  | 'card_view'
  | 'designer'
  | 'pdf_studio'
  | 'rules'
  | 'fields'
  | 'all_teams'
  | 'sponsors'
  | 'draw'
  | 'overlays'
  | 'spectator'
  | 'comms'

export const AUCTION_TABS = [
  { id: 'overview', label: 'Command Center', icon: BarChart3 },
  { id: 'live', label: 'Live Broadcast', icon: Gavel },
  // Setup Pipeline (1 to 7)
  { id: 'rules', label: 'Master Setup & Rules', icon: Sliders },
  { id: 'all_teams', label: 'Team Setup', icon: Shield },
  { id: 'fields', label: 'Custom Fields', icon: Tag },
  { id: 'roster', label: 'Player Setup', icon: Users },
  { id: 'card_view', label: 'Player Cards View', icon: LayoutGrid },
  { id: 'pdf_studio', label: 'PDF Designer', icon: FileText },
  { id: 'designer', label: 'Auction Page Designer', icon: Layout },
  { id: 'draw', label: 'Group Draw', icon: Shuffle },
  // Media & Utilities
  { id: 'sponsors', label: 'Sponsors & Media', icon: Sparkles },
  { id: 'overlays', label: 'OBS Overlays', icon: Tv },
  { id: 'spectator', label: 'Public Viewer', icon: Eye },
  { id: 'comms', label: 'WhatsApp Comms', icon: MessageSquare },
] as const

interface AuctionSuiteProps {
  auctionId: string
  auctionName?: string
  activeTab?: TabType
  onTabChange?: (tab: TabType, extraParams?: Record<string, string>) => void
  onBack?: () => void
}

export default function AuctionSuite({ auctionId, auctionName, activeTab: propActiveTab, onTabChange: propOnTabChange }: AuctionSuiteProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as TabType | null
  const [internalTab, setInternalTab] = useState<TabType>(tabFromUrl || 'overview')
  const [branding, setBranding] = useState<{
    tournament_logo?: string
    overall_background?: string
    auction_background?: string
  }>({})

  const activeTab = propActiveTab || internalTab

  const loadBranding = async () => {
    try {
      const res = await apiClient.get(`/v1/auction/console/${auctionId}/setup_rules/`)
      const cfg = res.data?.config || {}
      setBranding({
        tournament_logo: cfg.tournament_logo || '',
        overall_background: cfg.overall_background || '',
        auction_background: cfg.auction_background || '',
      })
    } catch (e) {
      console.warn('Failed to load branding setup', e)
    }
  }

  useEffect(() => {
    loadBranding()
  }, [auctionId])

  useEffect(() => {
    const currentTab = searchParams.get('tab') as TabType | null
    if (currentTab && currentTab !== internalTab) {
      setInternalTab(currentTab)
    }
    // Refresh branding when navigating from rules
    if (currentTab !== 'rules') {
      loadBranding()
    }
  }, [searchParams])

  const handleTabChange = (tabId: TabType, extraParams?: Record<string, string>) => {
    if (propOnTabChange) {
      propOnTabChange(tabId, extraParams)
    } else {
      setInternalTab(tabId)
      const newParams: Record<string, string> = { tab: tabId }
      const currTournament = searchParams.get('tournament')
      if (currTournament) newParams.tournament = currTournament
      if (extraParams) {
        Object.assign(newParams, extraParams)
      }
      setSearchParams(newParams)
    }
  }

  const hasOverallBg = branding.overall_background &&
    branding.overall_background !== 'default' &&
    branding.overall_background !== ''

  return (
    <div
      className={`space-y-6 transition-all duration-300 ${hasOverallBg ? 'p-4 sm:p-6 rounded-3xl' : ''}`}
      style={
        hasOverallBg
          ? {
              backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.88)), url(${resolveMediaUrl(branding.overall_background)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
            }
          : undefined
      }
    >
      {/* Tab Panels */}
      <div>
        {activeTab === 'overview' && (
          <AuctionOverviewDashboard
            auctionId={auctionId}
            auctionName={auctionName}
            onNavigateTab={(tab: any, extraParams?: any) => handleTabChange(tab, extraParams)}
          />
        )}
        {activeTab === 'live' && (
          <LiveBroadcastConsole
            auctionId={auctionId}
            auctionName={auctionName}
            auctionBackground={branding.auction_background || branding.overall_background}
          />
        )}
        {activeTab === 'roster' && (
          <PlayerRosterManager
            auctionId={auctionId}
            onPlayerSelected={async (serialNo) => {
              if (serialNo) {
                try {
                  await apiClient.post(`/v1/auction/console/${auctionId}/select_player_no/`, {
                    serial_no: serialNo,
                  })
                } catch (e) {
                  console.warn('Failed to place player on block', e)
                }
              }
              handleTabChange('live')
            }}
          />
        )}
        {activeTab === 'card_view' && (
          <PlayerCardSheetView
            auctionId={auctionId}
            auctionName={auctionName}
            onNavigateTab={(tab: any, extraParams?: any) => handleTabChange(tab, extraParams)}
          />
        )}
        {activeTab === 'designer' && (
          <AuctionPageDesigner
            auctionId={auctionId}
            onBack={() => handleTabChange('all_teams')}
          />
        )}
        {activeTab === 'pdf_studio' && <PdfDesignStudio auctionId={auctionId} />}
        {activeTab === 'rules' && <SetupRulesManager auctionId={auctionId} onNavigateTab={(tab: any) => handleTabChange(tab)} />}
        {activeTab === 'fields' && <CustomFieldsStudio auctionId={auctionId} />}
        {activeTab === 'all_teams' && (
          <TeamsAndPlayersHub
            auctionId={auctionId}
            onNavigateToLive={() => handleTabChange('live')}
          />
        )}
        {activeTab === 'sponsors' && <SponsorMediaStudio auctionId={auctionId} />}
        {activeTab === 'draw' && <GroupDrawStage auctionId={auctionId} />}
        {activeTab === 'overlays' && <OverlayStudio auctionId={auctionId} />}
        {activeTab === 'spectator' && <PublicSpectatorPortal auctionId={auctionId} />}
        {activeTab === 'comms' && <CommunicationsStudio auctionId={auctionId} />}
      </div>
    </div>
  )
}
