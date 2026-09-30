import React from 'react';
import { useTournament, AppViewMode } from '../../context/TournamentContext';
import { useAuth } from '../../auth/AuthContext';
import { useDevice } from '../../hooks/useDevice';
import { Trophy, Globe, Wrench, Shield, PlusCircle, Radio, Sparkles, LogOut, User } from 'lucide-react';
import { SPORT_CONFIGS } from '../../engines/sportEngine';

interface HeaderProps {
  onOpenCreateModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCreateModal }) => {
  const {
    viewMode,
    setViewMode,
    tournaments,
    activeTournament,
    setActiveTournamentId,
  } = useTournament();

  const { profile, isAuthenticated, signOut } = useAuth();
  const device = useDevice();

  const sportConfig = activeTournament ? SPORT_CONFIGS[activeTournament.sport] : null;
  const liveMatchesCount = activeTournament?.fixtures.filter((m) => m.status === 'LIVE').length || 0;

  return (
    <header className="sticky top-0 z-40 bg-sport-navy text-white border-b border-slate-800 shadow-lg">
      {/* Top Banner / Telemetry Ribbon */}
      <div className="bg-sport-midnight px-3 sm:px-6 py-1.5 border-b border-slate-800/80 text-xs">
        <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[2200px] mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="flex items-center gap-1.5 font-bold tracking-wider text-sport-orange uppercase shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
              SportIQ OS
            </span>
            <span className="text-slate-500 hidden xs:inline">|</span>
            <span className="text-slate-300 hidden md:inline truncate">
              Tournament Operating System v2.6
            </span>
            {liveMatchesCount > 0 && (
              <span className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-semibold text-[10px] sm:text-[11px] border border-red-500/30 animate-pulse shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span>{liveMatchesCount} Live</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-slate-400 shrink-0">
            <span className="hidden lg:inline text-[11px]">Instant Public Sharing Ready</span>
            <button
              onClick={() => setViewMode('public')}
              className="text-sport-orange hover:underline font-medium flex items-center gap-1 cursor-pointer text-xs"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Spectator View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[2200px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-glow-orange cursor-pointer shrink-0"
            onClick={() => setViewMode('organizer')}
          >
            <img src="/assests/logo-small.png" alt="SportIQ Logo" className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow-md" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1
                className="text-lg sm:text-xl font-extrabold tracking-tight text-white cursor-pointer"
                onClick={() => setViewMode('organizer')}
              >
                Sport<span className="text-sport-orange">IQ</span>
              </h1>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                PRO
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">Tournament Command Hub</p>
          </div>
        </div>

        {/* Organizer Workspace Navigation Switcher */}
        <nav className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-full border border-slate-800 shrink-0">
          <button
            onClick={() => setViewMode('organizer')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'organizer'
                ? 'bg-sport-orange text-white shadow-glow-orange'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Command Hub</span>
          </button>

          <button
            onClick={() => setViewMode('tools')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'tools'
                ? 'bg-sport-orange text-white shadow-glow-orange'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Match-Day</span>
            <span>Tools</span>
          </button>
        </nav>

        {/* Active Tournament Selector & New Tournament Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {tournaments.length > 0 && (
            <div className="relative">
              <select
                value={activeTournament?.id || ''}
                onChange={(e) => setActiveTournamentId(e.target.value)}
                className="bg-slate-800 text-xs font-medium text-white px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 rounded-lg border border-slate-700 hover:border-sport-orange/50 focus:outline-none focus:ring-1 focus:ring-sport-orange transition cursor-pointer appearance-none max-w-[130px] xs:max-w-[170px] sm:max-w-[200px] truncate"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {SPORT_CONFIGS[t.sport]?.icon} {t.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                ▼
              </span>
            </div>
          )}

          {isAuthenticated ? (
            <>
              <button
                onClick={onOpenCreateModal}
                title="Create New Tournament"
                className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-sm hover:shadow transition active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Tournament</span>
                <span className="sm:hidden">New</span>
              </button>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                <div className="hidden xl:flex flex-col text-right">
                  <span className="text-xs font-bold text-white leading-tight">
                    {profile?.displayName || 'Organizer'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {profile?.organization || 'SportIQ'}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  title="Sign Out"
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/40 text-xs font-semibold px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setViewMode('organizer')}
              className="flex items-center gap-1.5 bg-sport-orange hover:bg-orange-600 text-white text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-sm transition cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Organizer Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
