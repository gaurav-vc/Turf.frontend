import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Gavel, Users, Layout, Sliders, Tag, Shuffle, Eye,
  Trophy, Sparkles, MessageSquare, FileText, Tv, BarChart3, Shield, ChevronDown
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

interface AuctionSuiteProps {
  auctionId: string
  auctionName?: string
  onBack?: () => void
}

type TabType =
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

export default function AuctionSuite({ auctionId, auctionName, onBack }: AuctionSuiteProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || 'overview')

  useEffect(() => {
    const currentTab = searchParams.get('tab') as TabType | null
    if (currentTab && currentTab !== activeTab) {
      setActiveTab(currentTab)
    }
  }, [searchParams])

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }

  const tabs = [
    { id: 'overview', label: 'Command Center', icon: BarChart3 },
    { id: 'live', label: 'Live Broadcast', icon: Gavel },
    { id: 'all_teams', label: 'Teams & Players', icon: Shield },
    { id: 'roster', label: 'Roster & Intake', icon: Users },
    { id: 'designer', label: 'Page Designer', icon: Layout },
    { id: 'pdf_studio', label: 'PDF Cards', icon: FileText },
    { id: 'rules', label: 'Squad Rules & Slabs', icon: Sliders },
    { id: 'fields', label: 'Custom Fields', icon: Tag },
    { id: 'sponsors', label: 'Sponsors & Media', icon: Sparkles },
    { id: 'draw', label: 'Group Draw', icon: Shuffle },
    { id: 'overlays', label: 'OBS Overlays', icon: Tv },
    { id: 'spectator', label: 'Public Viewer', icon: Eye },
    { id: 'comms', label: 'WhatsApp Comms', icon: MessageSquare },
  ] as const

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 hover:text-zinc-950 font-bold shadow-2xs transition-all"
            >
              ← Back to {auctionName || 'Tournaments'}
            </button>
          )}
          {/* Page Dropdown Selector */}
          <div className="relative flex items-center">
            <Trophy className="absolute left-3 w-4 h-4 text-amber-500 pointer-events-none" />
            <select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value as TabType)}
              className="appearance-none pl-9 pr-9 py-2 rounded-2xl border-2 border-amber-500/40 hover:border-amber-500 bg-white text-sm font-black text-zinc-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer transition-all"
            >
              {tabs.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

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
            onPlayerSelected={() => handleTabChange('live')}
          />
        )}
        {activeTab === 'designer' && (
          <AuctionPageDesigner
            auctionId={auctionId}
            onBack={() => handleTabChange('all_teams')}
          />
        )}
        {activeTab === 'pdf_studio' && <PdfDesignStudio auctionId={auctionId} />}
        {activeTab === 'rules' && <SetupRulesManager auctionId={auctionId} />}
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
