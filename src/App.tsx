import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import Login from '@/pages/auth/Login'
import PlayerLayout from '@/layouts/PlayerLayout'
import PlayerDashboard from '@/pages/player/PlayerDashboard'
import TurfExplorer from '@/components/TurfExplorer'
import TurfDetail from '@/pages/player/TurfDetail'
import BookingsDashboard from '@/pages/player/BookingsDashboard'
import CoinFlip from '@/pages/player/CoinFlip'
import TeamsHub from '@/pages/player/TeamsHub'
import TournamentsHub from '@/pages/player/TournamentsHub'
import TournamentDetail from '@/pages/player/TournamentDetail'
import Matchmaking from '@/pages/player/Matchmaking'
import PlayerShop from '@/pages/player/PlayerShop'
import PlayerOrders from '@/pages/player/PlayerOrders'
import LiveStreamsHub from '@/pages/player/LiveStreamsHub'
import PlayerAuction from '@/pages/player/PlayerAuction'
import PublicViewerPage from '@/pages/auction/PublicViewerPage'
import PublicPlayerRegistrationPage from '@/pages/auction/PublicPlayerRegistrationPage'
import StreamOverlayPage from '@/pages/auction/StreamOverlayPage'
import TeamLivePortalPage from '@/pages/auction/TeamLivePortalPage'
import ClubsHub from '@/pages/clubs/ClubsHub'
import ClubDetail from '@/pages/clubs/ClubDetail'
import LiveCricketConsole from '@/pages/clubs/LiveCricketConsole'

import ManagerLayout from '@/layouts/ManagerLayout'
import ManagerDashboard from '@/pages/manager/ManagerDashboard'
import AddTurf from '@/pages/manager/AddTurf'
import AddCourt from '@/pages/manager/AddCourt'
import AddMaintenance from '@/pages/manager/AddMaintenance'
import SetPricing from '@/pages/manager/SetPricing'
import AnalyticsDashboard from '@/pages/manager/AnalyticsDashboard'
import UmpireDashboard from '@/pages/player/UmpireDashboard'

import AdminLayout from '@/layouts/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminSports from '@/pages/admin/AdminSports'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminSettings from '@/pages/admin/AdminSettings'
import AdminTurfs from '@/pages/admin/AdminTurfs'
import AdminShop from '@/pages/admin/AdminShop'
import AdminOrders from '@/pages/admin/AdminOrders'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auction/live/:token" element={<PublicViewerPage />} />
        <Route path="/register/:token" element={<PublicPlayerRegistrationPage />} />
        <Route path="/auction/register/:token" element={<PublicPlayerRegistrationPage />} />
        <Route path="/auction/overlay/:token" element={<StreamOverlayPage />} />
        <Route path="/auction/team-live/:token" element={<TeamLivePortalPage />} />
        
        <Route path="/" element={<AuthGuard><PlayerLayout /></AuthGuard>}>
          <Route index element={<PlayerDashboard />} />
          <Route path="explore" element={<TurfExplorer />} />
          <Route path="explore/:id" element={<TurfDetail />} />
          <Route path="bookings" element={<BookingsDashboard />} />
          <Route path="teams" element={<TeamsHub />} />
          <Route path="tournaments" element={<TournamentsHub />} />
          <Route path="tournaments/:id" element={<TournamentDetail />} />
          <Route path="lfp" element={<Matchmaking />} />
          <Route path="toss" element={<CoinFlip />} />
          <Route path="scoreboard" element={<UmpireDashboard />} />
          <Route path="shop" element={<PlayerShop />} />
          <Route path="orders" element={<PlayerOrders />} />
          <Route path="streams" element={<LiveStreamsHub />} />
          <Route path="auction" element={<PlayerAuction />} />
          <Route path="clubs" element={<ClubsHub />} />
          <Route path="clubs/:id" element={<ClubDetail />} />
          <Route path="clubs/matches/:matchId/live" element={<LiveCricketConsole />} />
        </Route>
        
        <Route path="/manager" element={<AuthGuard><ManagerLayout /></AuthGuard>}>
          <Route index element={<ManagerDashboard />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="add-turf" element={<AddTurf />} />
          <Route path="add-court" element={<AddCourt />} />
          <Route path="maintenance" element={<AddMaintenance />} />
          <Route path="pricing" element={<SetPricing />} />
        </Route>
        
        <Route path="/admin" element={<AuthGuard><AdminLayout /></AuthGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="sports" element={<AdminSports />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="turfs" element={<AdminTurfs />} />
          <Route path="shop" element={<AdminShop />} />
          <Route path="orders" element={<AdminOrders />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
