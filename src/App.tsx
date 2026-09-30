import React, { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import { Header } from './components/common/Header';
import { CreateTournamentModal } from './components/organizer/CreateTournamentModal';
import { OrganizerDashboard } from './components/organizer/OrganizerDashboard';
import { OverviewPanel } from './components/organizer/OverviewPanel';
import { TeamsManagement } from './components/organizer/TeamsManagement';
import { LiveDrawRoom } from './components/organizer/LiveDrawRoom';
import { FixturesManager } from './components/organizer/FixturesManager';
import { LiveScoringStudio } from './components/organizer/LiveScoringStudio';
import { StandingsTable } from './components/organizer/StandingsTable';
import { InteractiveBracket } from './components/organizer/InteractiveBracket';
import { BudgetAccounting } from './components/organizer/BudgetAccounting';
import { ShareAndQRStudio } from './components/organizer/ShareAndQRStudio';
import { PublicTournamentPortal } from './components/public/PublicTournamentPortal';
import { MatchDayTools } from './components/tools/MatchDayTools';
import { OrganizerAuthPage } from './components/auth/OrganizerAuthPage';

const AppContent: React.FC = () => {
  const { viewMode, organizerTab } = useTournament();
  const { loading: authLoading, isAuthenticated, isProfileComplete } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // 1. PUBLIC SPECTATOR VIEW: Free public access without authentication
  if (viewMode === 'public') {
    return <PublicTournamentPortal />;
  }

  // 2. AUTH INITIALIZATION: Prevent visual flashes during Firebase auth verification
  if (authLoading) {
    return (
      <div className="min-h-screen bg-sport-midnight flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-glow-orange mb-4 animate-pulse">
          <img src="/assests/logo-small.png" alt="SportIQ" className="w-10 h-10 object-contain drop-shadow" />
        </div>
        <h3 className="text-xl font-black text-white tracking-tight">
          Sport<span className="text-sport-orange">IQ</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">Connecting to Secure Session...</p>
      </div>
    );
  }

  // 3. ORGANIZER ACCESS GUARD: Unauthenticated organizers must log in with Phone OTP
  if (viewMode === 'organizer' && (!isAuthenticated || !isProfileComplete)) {
    return <OrganizerAuthPage />;
  }

  return (
    <div className="min-h-screen bg-sport-surface flex flex-col selection:bg-sport-orange selection:text-white">
      {/* Top Application Header */}
      <Header onOpenCreateModal={() => setCreateModalOpen(true)} />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[2200px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-safe">
        {viewMode === 'organizer' && (
          <div className="space-y-6">
            <OrganizerDashboard onOpenCreateModal={() => setCreateModalOpen(true)} />

            {/* Subtab Content View */}
            <div className="animate-fadeIn">
              {organizerTab === 'overview' && <OverviewPanel />}
              {organizerTab === 'teams' && <TeamsManagement />}
              {organizerTab === 'draw' && <LiveDrawRoom />}
              {organizerTab === 'fixtures' && <FixturesManager />}
              {organizerTab === 'scoring' && <LiveScoringStudio />}
              {organizerTab === 'standings' && <StandingsTable />}
              {organizerTab === 'bracket' && <InteractiveBracket />}
              {organizerTab === 'budget' && <BudgetAccounting />}
              {organizerTab === 'share' && <ShareAndQRStudio />}
            </div>
          </div>
        )}

        {viewMode === 'tools' && (
          <div className="animate-fadeIn">
            <MatchDayTools />
          </div>
        )}
      </main>

      {/* Global Modals */}
      <CreateTournamentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-sport-navy text-slate-400 border-t border-slate-800 text-xs py-6 mt-12 pb-safe">
        <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/assests/logo-small.png" alt="SportIQ Logo" className="w-5 h-5 object-contain" />
            <span className="font-extrabold text-white">SportIQ</span>
            <span>— The Sports Tournament Operating System</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Knockout & League Engines</span>
            <span>•</span>
            <span>Sport Abstraction Layer</span>
            <span>•</span>
            <span>Realtime Match Scoring</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <AppContent />
      </TournamentProvider>
    </AuthProvider>
  );
}
