import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { MatchStatus } from '../../types';
import { Calendar, Play, Radio, MapPin, Clock, Filter, Plus, CheckCircle2 } from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';

export const FixturesManager: React.FC = () => {
  const {
    activeTournament,
    generateTournamentFixtures,
    setActiveMatchId,
    setOrganizerTab,
  } = useTournament();

  const [filter, setFilter] = useState<'ALL' | MatchStatus>('ALL');

  if (!activeTournament) return null;

  const fixtures = activeTournament.fixtures;
  const teams = activeTournament.teams;
  const venues = activeTournament.venues;

  const filteredFixtures = fixtures.filter((m) => {
    if (filter === 'ALL') return true;
    return m.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-sport-navy flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sport-orange" />
            Fixtures & Match Schedule
          </h3>
          <p className="text-xs text-slate-500">
            Automated conflict-free scheduling ({fixtures.length} Total Matches)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => generateTournamentFixtures(activeTournament.id)}
            className="px-4 py-2.5 bg-sport-navy hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-sport-orange" />
            Auto-Schedule Engine
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {(['ALL', 'LIVE', 'UPCOMING', 'COMPLETED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filter === status
                ? 'bg-sport-navy text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Fixtures List */}
      {filteredFixtures.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">No Fixtures Found</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Generate fixtures automatically from your registered teams and chosen format.
          </p>
          <button
            onClick={() => generateTournamentFixtures(activeTournament.id)}
            className="px-5 py-2.5 bg-sport-orange text-white text-xs font-bold rounded-xl shadow-glow-orange cursor-pointer"
          >
            Run Auto-Scheduler Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFixtures.map((match) => {
            const home = teams.find((t) => t.id === match.homeTeamId);
            const away = teams.find((t) => t.id === match.awayTeamId);
            const venue = venues.find((v) => v.id === match.venueId) || venues[0];

            return (
              <div
                key={match.id}
                className={`bg-white p-5 rounded-2xl border transition shadow-sm hover:shadow-md ${
                  match.status === 'LIVE'
                    ? 'border-red-400 ring-2 ring-red-500/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Match Card Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-600">{match.roundName}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                      match.status === 'LIVE'
                        ? 'bg-red-500 text-white animate-pulse'
                        : match.status === 'COMPLETED'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {match.status}
                  </span>
                </div>

                {/* Teams VS Score Area */}
                <div className="py-4 flex items-center justify-between gap-4">
                  {/* Home Team */}
                  <div className="flex-1 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-sm flex-shrink-0"
                      style={{ backgroundColor: home?.color || '#94a3b8' }}
                    >
                      {home?.shortName || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-sport-navy truncate">
                        {home?.name || 'TBD'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {home?.seed ? `Seed #${home.seed}` : 'Qualifier'}
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-center px-3 py-1 bg-slate-100 rounded-xl">
                    <span className="text-lg font-black text-sport-navy">
                      {match.homeScore} : {match.awayScore}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 flex items-center justify-end gap-3 text-right">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-sport-navy truncate">
                        {away?.name || 'TBD'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {away?.seed ? `Seed #${away.seed}` : 'Qualifier'}
                      </div>
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-sm flex-shrink-0"
                      style={{ backgroundColor: away?.color || '#94a3b8' }}
                    >
                      {away?.shortName || '?'}
                    </div>
                  </div>
                </div>

                {/* Match Footer & Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{venue?.name || 'Main Court'}</span>
                  </div>

                  <button
                    onClick={() => {
                      setActiveMatchId(match.id);
                      setOrganizerTab('scoring');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      match.status === 'LIVE'
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                        : 'bg-sport-orange hover:bg-orange-600 text-white'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    {match.status === 'LIVE' ? 'Scoring Desk' : 'Open Scorer'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
