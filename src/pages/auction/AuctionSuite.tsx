import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiClient } from '@/api/apiClient'
import {
  Gavel, Users, Layout, Sliders, Tag, Shuffle, Eye,
  Sparkles, MessageSquare, FileText, Tv, BarChart3, Shield
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

export type TabType =
  | 'overview'
  | 'live'
  | 'roster'
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
  onTabChange?: (tab: TabType) => void
  onBack?: () => void
}

export default function AuctionSuite({ auctionId, auctionName, activeTab: propActiveTab, onTabChange: propOnTabChange }: AuctionSuiteProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as TabType | null
  const [internalTab, setInternalTab] = useState<TabType>(tabFromUrl || 'overview')

  const activeTab = propActiveTab || internalTab

  useEffect(() => {
    const currentTab = searchParams.get('tab') as TabType | null
    if (currentTab && currentTab !== internalTab) {
      setInternalTab(currentTab)
    }
  }, [searchParams])

  const handleTabChange = (tabId: TabType) => {
    if (propOnTabChange) {
      propOnTabChange(tabId)
    } else {
      setInternalTab(tabId)
      setSearchParams({ tab: tabId })
    }
  }

  return (
    <div className="space-y-6">

      {/* Tab Panels */}
      <div>
        {activeTab === 'overview' && (
          <AuctionOverviewDashboard
            auctionId={auctionId}
            auctionName={auctionName}
            onNavigateTab={(tab: any) => handleTabChange(tab)}
          />
        )}
        {activeTab === 'live' && (
          <LiveBroadcastConsole
            auctionId={auctionId}
            auctionName={auctionName}
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
