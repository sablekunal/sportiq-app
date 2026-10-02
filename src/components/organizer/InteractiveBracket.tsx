import React from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Match } from '../../types';
import { Trophy, GitBranch, Radio, CheckCircle2, ChevronRight, Printer } from 'lucide-react';
import { printKnockoutBrackets } from '../../utils/printUtils';

export const InteractiveBracket: React.FC = () => {
  const { activeTournament, setActiveMatchId, setOrganizerTab } = useTournament();

  if (!activeTournament) return null;

  const fixtures = activeTournament.fixtures;
  const teams = activeTournament.teams;

  // Filter knockout matches
  const knockoutMatches = fixtures.filter(
    (m) => m.stage === 'KNOCKOUT' || m.stage === 'FINAL' || m.stage === 'WINNERS_BRACKET'
  );

  // Group by round
  const roundsMap: Record<number, Match[]> = {};
  knockoutMatches.forEach((m) => {
    if (!roundsMap[m.round]) roundsMap[m.round] = [];
    roundsMap[m.round].push(m);
  });

  const roundNumbers = Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b);

  // Find championship winner if final is completed
  const finalMatch = knockoutMatches.find((m) => m.stage === 'FINAL' && m.status === 'COMPLETED');
  const championTeam = finalMatch ? teams.find((t) => t.id === finalMatch.winnerId) : null;

  const handlePrintBrackets = (mode: 'ALL' | 'SEMIS' | 'FINAL') => {
    printKnockoutBrackets(knockoutMatches, teams, mode);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-sport-navy flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-sport-orange" />
            Tournament Playoff Bracket Tree
          </h3>
          <p className="text-xs text-slate-500">
            Interactive tree visualization with automated winner advancement into next_match_id
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={() => handlePrintBrackets('SEMIS')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl transition font-bold text-xs shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Semis
            </button>
            <button
              onClick={() => handlePrintBrackets('FINAL')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl transition font-bold text-xs shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Finals
            </button>
            <button
              onClick={() => handlePrintBrackets('ALL')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sport-navy hover:bg-slate-800 text-white border border-slate-700 rounded-xl transition font-bold text-xs shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print All
            </button>
          </div>
          
          {championTeam && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-md font-bold text-xs animate-bounce">
              <Trophy className="w-4 h-4 text-yellow-200" />
              Tournament Champion: {championTeam.name}
            </div>
          )}
        </div>
      </div>

      {/* Bracket Tree Canvas */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl overflow-x-auto min-h-[500px]">
        {knockoutMatches.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center pt-20">
            <GitBranch className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-500">No Knockout Bracket Generated</h4>
            <p className="text-xs text-slate-600 mt-1 mb-4">
              Generate fixtures under the Fixtures tab to view the live playoff bracket.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-12 sm:gap-16 min-w-[700px]">
            {roundNumbers.map((rNum, rIdx) => {
              const matchesInRound = roundsMap[rNum].sort((a, b) => a.position - b.position);
              const roundTitle = matchesInRound[0]?.roundName.split('(')[0] || `Round ${rNum}`;

            return (
              <div key={rNum} className="flex-1 flex flex-col justify-around space-y-8">
                {/* Round Title */}
                <div className="text-center pb-2 border-b border-slate-800">
                  <span className="text-xs font-black uppercase tracking-wider text-sport-orange">
                    {roundTitle}
                  </span>
                </div>

                {/* Matches in this column */}
                <div className="flex flex-col justify-around gap-8 flex-1">
                  {matchesInRound.map((match) => {
                    const home = teams.find((t) => t.id === match.homeTeamId);
                    const away = teams.find((t) => t.id === match.awayTeamId);
                    const isWinnerHome = match.winnerId === home?.id && (match.status === 'COMPLETED' || match.status === 'WALKOVER');
                    const isWinnerAway = match.winnerId === away?.id && (match.status === 'COMPLETED' || match.status === 'WALKOVER');

                    return (
                      <div
                        key={match.id}
                        onClick={() => {
                          setActiveMatchId(match.id);
                          setOrganizerTab('scoring');
                        }}
                        className={`w-64 bg-slate-950/90 rounded-2xl border transition-all p-3.5 shadow-lg relative cursor-pointer group ${
                          match.status === 'LIVE'
                            ? 'border-red-500 ring-2 ring-red-500/30'
                            : match.status === 'COMPLETED' || match.status === 'WALKOVER'
                            ? 'border-slate-800 hover:border-slate-700'
                            : 'border-slate-800 hover:border-sport-orange/50'
                        }`}
                      >
                        {/* Live / Status Indicator */}
                        <div className="flex items-center justify-between text-[10px] mb-2 font-mono">
                          <div className="flex items-center gap-1.5">
                            {match.matchCode && (
                              <span className="font-mono font-black px-1.5 py-0.5 rounded bg-orange-500/20 text-sport-orange text-[9px]">
                                {match.matchCode}
                              </span>
                            )}
                            <span className="text-slate-400 font-semibold">Match #{match.fixtureNumber ?? match.position}</span>
                          </div>
                          {match.status === 'LIVE' ? (
                            <span className="flex items-center gap-1 text-red-400 font-bold bg-red-950/60 px-2 py-0.5 rounded-full border border-red-500/30 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              LIVE
                            </span>
                          ) : match.status === 'COMPLETED' || match.status === 'WALKOVER' ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </span>
                          ) : (
                            <span className="text-slate-500">Scheduled</span>
                          )}
                        </div>

                        {/* Home Team Slot */}
                        <div
                          className={`flex items-center justify-between p-2 rounded-xl text-xs transition mb-1.5 ${
                            isWinnerHome
                              ? 'bg-emerald-950/40 text-emerald-300 font-black border border-emerald-500/40'
                              : 'bg-slate-900/80 text-slate-300 font-semibold'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {home && (
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: home.color || '#f97316' }}
                              />
                            )}
                            <span className="truncate">{home?.name || match.homePlaceholder || 'TBD (Awaiting)'}</span>
                          </div>
                          <span className="font-mono font-bold text-white px-1.5 py-0.5 rounded bg-slate-800">
                            {match.status === 'WALKOVER' ? 'W/O' : match.homeScore}
                          </span>
                        </div>

                        {/* Away Team Slot */}
                        <div
                          className={`flex items-center justify-between p-2 rounded-xl text-xs transition ${
                            isWinnerAway
                              ? 'bg-emerald-950/40 text-emerald-300 font-black border border-emerald-500/40'
                              : 'bg-slate-900/80 text-slate-300 font-semibold'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {away && (
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: away.color || '#2563eb' }}
                              />
                            )}
                            <span className="truncate">{away?.name || match.awayPlaceholder || 'TBD (Awaiting)'}</span>
                          </div>
                          <span className="font-mono font-bold text-white px-1.5 py-0.5 rounded bg-slate-800">
                            {match.status === 'WALKOVER' ? 'W/O' : match.awayScore}
                          </span>
                        </div>

                        {/* Winner advancement preview */}
                        {match.nextMatchId && (
                          <div className="mt-2 pt-2 border-t border-slate-900 text-[10px] text-slate-500 flex items-center justify-between">
                            <span>Advances to next round</span>
                            <ChevronRight className="w-3 h-3 text-sport-orange" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
