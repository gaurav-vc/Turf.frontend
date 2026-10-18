import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Gavel, Users, Layout, Sliders, Tag, Shuffle, Eye,
  Trophy, Sparkles, MessageSquare, ListOrdered, FileText, Tv, BarChart3
} from 'lucide-react'
import AuctionOverviewDashboard from './components/AuctionOverviewDashboard'
import LiveBroadcastConsole from './components/LiveBroadcastConsole'
import AuctionPageDesigner from './components/AuctionPageDesigner'
import SetupRulesManager from './components/SetupRulesManager'
import PlayerRosterManager from './components/PlayerRosterManager'
import CustomFieldsStudio from './components/CustomFieldsStudio'
import GroupDrawStage from './components/GroupDrawStage'
import PublicSpectatorPortal from './components/PublicSpectatorPortal'
import AllTeamsRosterSheet from './components/AllTeamsRosterSheet'
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
    { id: 'roster', label: 'Roster & Intake', icon: Users },
    { id: 'designer', label: 'Page Designer', icon: Layout },
    { id: 'pdf_studio', label: 'PDF Cards', icon: FileText },
    { id: 'rules', label: 'Squad Rules & Slabs', icon: Sliders },
    { id: 'fields', label: 'Custom Fields', icon: Tag },
    { id: 'all_teams', label: 'Teams Roster', icon: ListOrdered },
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
              className="text-xs text-slate-500 hover:text-zinc-900 font-bold transition-colors"
            >
              ← Back
            </button>
          )}
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: '#09090b' }}>
            <Trophy className="h-6 w-6 text-amber-500" />
            <span style={{ color: '#09090b' }}>{auctionName || 'Cricket Auction Master Suite'}</span>
          </h1>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap items-center rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all ${
                activeTab === id
                  ? 'bg-amber-500 text-zinc-950 shadow-sm font-black'
                  : 'text-slate-600 hover:text-zinc-900 hover:bg-slate-100 font-bold'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'overview' && (
          <AuctionOverviewDashboard
            auctionId={auctionId}
            onNavigateTab={(tab: any) => handleTabChange(tab)}
          />
        )}
        {activeTab === 'live' && <LiveBroadcastConsole auctionId={auctionId} />}
        {activeTab === 'roster' && (
          <PlayerRosterManager
            auctionId={auctionId}
            onPlayerSelected={() => handleTabChange('live')}
          />
        )}
        {activeTab === 'designer' && <AuctionPageDesigner auctionId={auctionId} />}
        {activeTab === 'pdf_studio' && <PdfDesignStudio auctionId={auctionId} />}
        {activeTab === 'rules' && <SetupRulesManager auctionId={auctionId} />}
        {activeTab === 'fields' && <CustomFieldsStudio auctionId={auctionId} />}
        {activeTab === 'all_teams' && <AllTeamsRosterSheet auctionId={auctionId} />}
        {activeTab === 'sponsors' && <SponsorMediaStudio auctionId={auctionId} />}
        {activeTab === 'draw' && <GroupDrawStage auctionId={auctionId} />}
        {activeTab === 'overlays' && <OverlayStudio auctionId={auctionId} />}
        {activeTab === 'spectator' && <PublicSpectatorPortal auctionId={auctionId} />}
        {activeTab === 'comms' && <CommunicationsStudio auctionId={auctionId} />}
      </div>
    </div>
  )
}
