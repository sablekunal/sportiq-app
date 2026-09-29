import React from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Match } from '../../types';
import { Trophy, GitBranch, Radio, CheckCircle2, ChevronRight } from 'lucide-react';

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

  if (knockoutMatches.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
        <GitBranch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-700">No Knockout Bracket Generated</h4>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Generate fixtures under the Fixtures tab to view the live playoff bracket.
        </p>
      </div>
    );
  }

  // Find championship winner if final is completed
  const finalMatch = knockoutMatches.find((m) => m.stage === 'FINAL' && m.status === 'COMPLETED');
  const championTeam = finalMatch ? teams.find((t) => t.id === finalMatch.winnerId) : null;

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

        {championTeam && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-md font-bold text-xs animate-bounce">
            <Trophy className="w-4 h-4 text-yellow-200" />
            Tournament Champion: {championTeam.name}
          </div>
        )}
      </div>

      {/* Bracket Tree Canvas */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl overflow-x-auto min-h-[500px]">
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
                    const isWinnerHome = match.winnerId === home?.id && match.status === 'COMPLETED';
                    const isWinnerAway = match.winnerId === away?.id && match.status === 'COMPLETED';

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
                            : match.status === 'COMPLETED'
                            ? 'border-slate-800 hover:border-slate-700'
                            : 'border-slate-800 hover:border-sport-orange/50'
                        }`}
                      >
                        {/* Live / Status Indicator */}
                        <div className="flex items-center justify-between text-[10px] mb-2 font-mono">
                          <span className="text-slate-400 font-semibold">Match #{match.position}</span>
                          {match.status === 'LIVE' ? (
                            <span className="flex items-center gap-1 text-red-400 font-bold bg-red-950/60 px-2 py-0.5 rounded-full border border-red-500/30 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              LIVE
                            </span>
                          ) : match.status === 'COMPLETED' ? (
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
                            <span className="truncate">{home?.name || 'TBD (Awaiting)'}</span>
                          </div>
                          <span className="font-mono font-bold text-white px-1.5 py-0.5 rounded bg-slate-800">
                            {match.homeScore}
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
                            <span className="truncate">{away?.name || 'TBD (Awaiting)'}</span>
                          </div>
                          <span className="font-mono font-bold text-white px-1.5 py-0.5 rounded bg-slate-800">
                            {match.awayScore}
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
      </div>
    </div>
  );
};
