import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { calculateSportStandings, SPORT_CONFIGS } from '../../engines/sportEngine';
import { BarChart3, Trophy, Medal, Info } from 'lucide-react';

export const StandingsTable: React.FC = () => {
  const { activeTournament } = useTournament();

  if (!activeTournament) return null;

  const sportConfig = SPORT_CONFIGS[activeTournament.sport] || SPORT_CONFIGS.football;
  const groups = activeTournament.groups;

  // Selected Group tab if group stage exists
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    groups.length > 0 ? groups[0].id : ''
  );

  const standings = calculateSportStandings(
    activeTournament.sport,
    activeTournament.teams,
    activeTournament.fixtures,
    selectedGroupId || undefined
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-sport-navy flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sport-orange" />
            Tournament Standings & League Table
          </h3>
          <p className="text-xs text-slate-500">
            Real-time standings automatically computed by the {sportConfig.displayName} Engine
          </p>
        </div>

        {/* Scoring rules info pill */}
        <div className="flex items-center gap-2 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-medium">
          <Info className="w-3.5 h-3.5 text-sport-orange" />
          <span>
            Win: {sportConfig.defaultWinPoints} pts • Draw: {sportConfig.defaultDrawPoints} pts • Loss: {sportConfig.defaultLossPoints} pts
          </span>
        </div>
      </div>

      {/* Group selector tabs if applicable */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2">
          {groups.map((grp) => (
            <button
              key={grp.id}
              onClick={() => setSelectedGroupId(grp.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedGroupId === grp.id
                  ? 'bg-sport-orange text-white shadow-glow-orange'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {grp.name}
            </button>
          ))}
        </div>
      )}

      {/* Standings Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Pos</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-3 text-center">P</th>
                <th className="py-3 px-3 text-center">W</th>
                {sportConfig.supportsDraw && <th className="py-3 px-3 text-center">D</th>}
                <th className="py-3 px-3 text-center">L</th>
                <th className="py-3 px-3 text-center">{sportConfig.scoreUnit} +</th>
                <th className="py-3 px-3 text-center">{sportConfig.scoreUnit} -</th>
                <th className="py-3 px-3 text-center">Diff</th>
                <th className="py-3 px-4 text-center font-extrabold text-sport-navy bg-orange-50/50">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
              {standings.map((row, idx) => {
                const isLeader = idx === 0;
                const isPlayoffSpot = idx < 2;

                return (
                  <tr
                    key={row.teamId}
                    className={`hover:bg-slate-50/80 transition ${
                      isLeader ? 'bg-orange-50/20' : ''
                    }`}
                  >
                    {/* Position */}
                    <td className="py-3.5 px-4 text-center font-bold">
                      <div className="flex items-center justify-center">
                        {idx === 0 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 font-bold flex items-center justify-center text-[11px]">
                            🥇
                          </span>
                        ) : idx === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-[11px]">
                            🥈
                          </span>
                        ) : idx === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-900/10 text-amber-800 font-bold flex items-center justify-center text-[11px]">
                            🥉
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">{idx + 1}</span>
                        )}
                      </div>
                    </td>

                    {/* Team Name */}
                    <td className="py-3.5 px-4 font-bold text-sport-navy">
                      <div className="flex items-center gap-2.5">
                        <span className="truncate">{row.teamName}</span>
                        {isPlayoffSpot && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] uppercase font-bold">
                            Q
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Played, Won, Draw, Lost */}
                    <td className="py-3.5 px-3 text-center font-mono">{row.played}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-emerald-600 font-bold">
                      {row.won}
                    </td>
                    {sportConfig.supportsDraw && (
                      <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                        {row.draw}
                      </td>
                    )}
                    <td className="py-3.5 px-3 text-center font-mono text-rose-500 font-bold">
                      {row.lost}
                    </td>

                    {/* Scored, Conceded, Diff */}
                    <td className="py-3.5 px-3 text-center font-mono text-slate-600">{row.scored}</td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-600">{row.conceded}</td>
                    <td className="py-3.5 px-3 text-center font-mono font-bold">
                      <span className={row.difference > 0 ? 'text-emerald-600' : row.difference < 0 ? 'text-rose-500' : 'text-slate-400'}>
                        {row.difference > 0 ? `+${row.difference}` : row.difference}
                      </span>
                    </td>

                    {/* Points */}
                    <td className="py-3.5 px-4 text-center font-black text-sm text-sport-orange bg-orange-50/50 font-mono">
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
