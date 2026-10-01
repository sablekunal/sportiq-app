import React from 'react';
import { useTournament, OrganizerTab } from '../../context/TournamentContext';
import { SPORT_CONFIGS } from '../../engines/sportEngine';
import { TournamentStatus } from '../../types';
import {
  Trophy,
  Users,
  Calendar,
  Radio,
  BarChart3,
  GitBranch,
  Share2,
  Settings,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Trash2,
  PlusCircle,
  RotateCcw,
} from 'lucide-react';



interface Props {
  onOpenCreateModal: () => void;
}

export const OrganizerDashboard: React.FC<Props> = ({ onOpenCreateModal }) => {
  const {
    activeTournament,
    organizerTab,
    setOrganizerTab,
    setViewMode,
    generateTournamentFixtures,
    deleteTournament,
    clearAllData,
    scheduleConflicts,
  } = useTournament();

  if (!activeTournament) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6">
        <div className="bg-gradient-to-br from-sport-navy via-slate-900 to-sport-midnight text-white p-8 sm:p-12 rounded-3xl border border-slate-800 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-sport-orange/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 mx-auto flex items-center justify-center text-3xl shadow-glow-orange">
              🏆
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome to SportIQ Tournament OS
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
              The sports tournament operating system: create custom tournaments, enter teams, conduct animated live draws, schedule fixtures, and manage live scoring.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onOpenCreateModal}
                className="px-6 py-3 bg-sport-orange hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-glow-orange transition cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Create New Tournament
              </button>
            </div>

            {/* Quick Sports Support Pills */}
            <div className="pt-8 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-500">Supported Sport Engines:</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">🤾 Throwball</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">⚽ Football</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">🏏 Cricket</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">🏐 Volleyball</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">🏀 Basketball</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">🏸 Badminton</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">🤼 Kabaddi</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sportConfig = SPORT_CONFIGS[activeTournament.sport] || SPORT_CONFIGS.football;
  const teamsCount = activeTournament.teams.length;
  const matchesCount = activeTournament.fixtures.length;
  const liveCount = activeTournament.fixtures.filter((m) => m.status === 'LIVE').length;
  const completedCount = activeTournament.fixtures.filter((m) => m.status === 'COMPLETED').length;


  const tabs: { id: OrganizerTab; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'teams', label: 'Teams & Rosters', icon: <Users className="w-4 h-4" />, badge: teamsCount },
    { id: 'draw', label: 'Live Draw Room', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'fixtures', label: 'Fixtures', icon: <Calendar className="w-4 h-4" />, badge: matchesCount },
    {
      id: 'schedule',
      label: 'Schedule & Courts',
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      badge: scheduleConflicts.length > 0 ? `${scheduleConflicts.length} ⚠️` : undefined,
    },
    {
      id: 'scoring',
      label: 'Live Scorer Desk',
      icon: <Radio className="w-4 h-4 text-red-500" />,
      badge: liveCount > 0 ? `${liveCount} LIVE` : undefined,
    },
    { id: 'standings', label: 'Standings', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'bracket', label: 'Brackets', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'share', label: 'Share & QR Studio', icon: <Share2 className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Tournament Identity Bar */}
      <div className="bg-gradient-to-r from-sport-navy via-slate-900 to-sport-midnight text-white p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sport-orange/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl p-2 rounded-xl bg-white/10 backdrop-blur-md">
                {sportConfig.icon}
              </span>
              <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-sport-orange/20 text-sport-orange border border-sport-orange/30">
                {sportConfig.displayName} • {activeTournament.format === 'GROUP_KNOCKOUT' ? 'LEAGUE + KNOCKOUT' : activeTournament.format.replace('_', ' ')}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {activeTournament.status}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{activeTournament.name}</h2>
            <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3">
              <span>📍 {activeTournament.location}</span>
              <span>•</span>
              <span>📅 {activeTournament.startDate} to {activeTournament.endDate}</span>
              <span>•</span>
              <span>Organized by {activeTournament.organizerName}</span>
            </p>
          </div>

          {/* Quick Actions Header */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setViewMode('public')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Public URL & QR
            </button>

            {matchesCount === 0 && (
              <button
                onClick={() => generateTournamentFixtures(activeTournament.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sport-orange hover:bg-orange-600 text-white shadow-glow-orange transition cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5" />
                Generate Fixtures
              </button>
            )}

            {liveCount > 0 && (
              <button
                onClick={() => setOrganizerTab('scoring')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse transition cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
                Scoring Studio ({liveCount} Live)
              </button>
            )}

            <button
              onClick={() => {
                if (window.confirm(`Delete tournament "${activeTournament.name}"?`)) {
                  deleteTournament(activeTournament.id);
                }
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 transition cursor-pointer"
              title="Delete Tournament"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-slate-200 no-scrollbar touch-scroll">
        {tabs.map((tab) => {
          const isActive = organizerTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setOrganizerTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-sport-navy text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                    isActive
                      ? 'bg-sport-orange text-white'
                      : tab.badge.toString().includes('LIVE')
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
