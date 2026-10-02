import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { MatchStatus } from '../../types';
import { Calendar, Play, Radio, MapPin, Clock, Filter, Plus, CheckCircle2, Users, Lock } from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';
import { MatchLineupModal } from './MatchLineupModal';
import { Match } from '../../types';
import { printFixtures } from '../../utils/printUtils';


export const FixturesManager: React.FC = () => {
  const {
    activeTournament,
    generateTournamentFixtures,
    setActiveMatchId,
    setOrganizerTab,
  } = useTournament();

  const [filter, setFilter] = useState<'ALL' | MatchStatus>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | 'A' | 'B' | 'C' | 'D' | 'KNOCKOUT'>('ALL');
  const [lineupModalMatch, setLineupModalMatch] = useState<Match | null>(null);

  if (!activeTournament) return null;

  const fixtures = activeTournament.fixtures;
  const teams = activeTournament.teams;
  const venues = activeTournament.venues;

  const getMatchTime = (m: Match) => {
    const d = m.schedule?.date || m.date;
    const t = m.schedule?.startTime || m.startTime;
    if (!d && !t) return Number.MAX_SAFE_INTEGER;
    const time = new Date(`${d || '2099-12-31'}T${t || '23:59'}`).getTime();
    return isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
  };

  const sortedFixtures = [...fixtures].sort((a, b) => {
    const timeA = getMatchTime(a);
    const timeB = getMatchTime(b);
    if (timeA !== timeB) return timeA - timeB;
    return (a.fixtureNumber ?? a.position) - (b.fixtureNumber ?? b.position);
  });

  const filteredFixtures = sortedFixtures.filter((m) => {
    if (filter !== 'ALL' && m.status !== filter) return false;
    if (stageFilter === 'ALL') return true;
    if (stageFilter === 'KNOCKOUT') return m.stage === 'KNOCKOUT' || m.stage === 'FINAL' || !m.groupId;
    return m.groupId === stageFilter;
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
            Authoritative Competition Schedule ({fixtures.length} Total Matches • Canonical Sequence)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => printFixtures(filteredFixtures, teams)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            Print Fixtures
          </button>
          <button
            onClick={() => generateTournamentFixtures(activeTournament.id)}
            className="px-4 py-2.5 bg-sport-navy hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-sport-orange" />
            Generate Fixtures
          </button>
        </div>
      </div>

      {/* Stage & Group Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Stage Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 mr-1">Stage:</span>
          {(
            [
              { id: 'ALL', label: 'All Fixtures' },
              { id: 'A', label: 'Group A' },
              { id: 'B', label: 'Group B' },
              { id: 'C', label: 'Group C' },
              { id: 'D', label: 'Group D' },
              { id: 'KNOCKOUT', label: 'Knockout / Finals' },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              onClick={() => setStageFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                stageFilter === st.id
                  ? 'bg-sport-navy text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 mr-1">Status:</span>
          {(['ALL', 'LIVE', 'UPCOMING', 'COMPLETED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filter === status
                  ? 'bg-sport-orange text-white'
                  : 'text-slate-500 hover:text-slate-900 bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
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
            Generate Competition Fixtures
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFixtures.map((match) => {
            const home = teams.find((t) => t.id === match.homeTeamId);
            const away = teams.find((t) => t.id === match.awayTeamId);
            const venue = venues.find((v) => v.id === match.venueId) || venues[0];
            const homeDisplayName = home?.name || match.homePlaceholder || 'TBD';
            const awayDisplayName = away?.name || match.awayPlaceholder || 'TBD';

            const isKnockout = match.roundName.toLowerCase().includes('semi') || match.roundName.toLowerCase().includes('final');
            const hasIncompleteGroups = activeTournament.fixtures.some(m => {
              const isGrpMatch = !m.roundName.toLowerCase().includes('semi') && !m.roundName.toLowerCase().includes('final');
              return isGrpMatch && m.status !== 'COMPLETED';
            });
            const isScoringLocked = isKnockout && hasIncompleteGroups;

            return (
              <div
                key={match.id}
                className={`bg-white p-5 rounded-2xl border transition shadow-sm hover:shadow-md ${
                  match.status === 'LIVE'
                    ? 'border-red-400 ring-2 ring-red-500/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Match Card Header with Local Code + Sequence Number */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    {match.matchCode && (
                      <span className="font-mono font-black px-2 py-0.5 rounded bg-orange-100 text-sport-orange text-[10px] tracking-wider">
                        {match.matchCode}
                      </span>
                    )}
                    {match.fixtureNumber && (
                      <span className="font-mono text-slate-400 font-bold text-[10px]">
                        #{match.fixtureNumber}
                      </span>
                    )}
                    <span className="font-bold text-slate-700 truncate">{match.roundName}</span>
                  </div>
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
                      style={{ backgroundColor: home?.color || '#f97316' }}
                    >
                      {home?.shortName || match.homePlaceholder || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-sport-navy truncate">
                        {homeDisplayName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {match.groupPositionA ? `Position ${match.groupPositionA}` : home?.seed ? `Seed #${home.seed}` : 'Qualifier'}
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-center px-3 py-1 bg-slate-100 rounded-xl">
                    <span className="text-lg font-black text-sport-navy">
                      {match.status === 'WALKOVER' ? 'W/O' : `${match.homeScore} : ${match.awayScore}`}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 flex items-center justify-end gap-3 text-right">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-sport-navy truncate">
                        {awayDisplayName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {match.groupPositionB ? `Position ${match.groupPositionB}` : away?.seed ? `Seed #${away.seed}` : 'Qualifier'}
                      </div>
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-sm flex-shrink-0"
                      style={{ backgroundColor: away?.color || '#2563eb' }}
                    >
                      {away?.shortName || match.awayPlaceholder || '?'}
                    </div>
                  </div>
                </div>

                {/* Match Footer & Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{venue?.name || 'Main Court'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLineupModalMatch(match)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700"
                      title="Manage 6+2 Match Lineup"
                    >
                      <Users className="w-3.5 h-3.5 text-sport-orange" />
                      <span>Lineup</span>
                    </button>

                    <button
                      disabled={isScoringLocked}
                      onClick={() => {
                        setActiveMatchId(match.id);
                        setOrganizerTab('scoring');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isScoringLocked
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : match.status === 'LIVE'
                          ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                          : 'bg-sport-orange hover:bg-orange-600 text-white'
                      }`}
                      title={isScoringLocked ? 'Complete all group stage matches before starting knockouts' : 'Open live scorer desk'}
                    >
                      {isScoringLocked ? <Lock className="w-3.5 h-3.5" /> : <Radio className="w-3.5 h-3.5" />}
                      {match.status === 'LIVE' ? 'Scoring Desk' : isScoringLocked ? 'Locked' : 'Open Scorer'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lineupModalMatch && (
        <MatchLineupModal
          match={lineupModalMatch}
          isOpen={Boolean(lineupModalMatch)}
          onClose={() => setLineupModalMatch(null)}
        />
      )}
    </div>
  );
};
