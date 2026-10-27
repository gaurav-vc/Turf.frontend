import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiClient, resolveMediaUrl } from '@/api/apiClient'
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

  const handleTabChange = (tabId: TabType) => {
    if (propOnTabChange) {
      propOnTabChange(tabId)
    } else {
      setInternalTab(tabId)
      setSearchParams({ tab: tabId })
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
      {/* Tournament Branding Bar (Logo + Name) */}
      {branding.tournament_logo && (
        <div className="flex items-center justify-between gap-4 bg-card/90 backdrop-blur-md border border-border/80 px-4 py-2.5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3">
            <img
              src={resolveMediaUrl(branding.tournament_logo)}
              alt="Tournament Logo"
              className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1 border border-border/60 shadow-2xs"
            />
            <div>
              <h2 className="text-sm font-black text-foreground flex items-center gap-2">
                {auctionName || 'Turf Premier League'}
                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Official Tournament
                </span>
              </h2>
              <p className="text-[10px] text-muted-foreground font-semibold">
                Live Auction & Tournament Management
              </p>
            </div>
          </div>
          {hasOverallBg && (
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl hidden sm:inline-flex items-center gap-1">
              ✨ Custom Theme Active
            </span>
          )}
        </div>
      )}

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
