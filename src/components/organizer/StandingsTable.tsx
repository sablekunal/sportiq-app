import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { SPORT_CONFIGS } from '../../engines/sportEngine';
import { calculateAllFourGroupStandings, ThrowballTeamStats } from '../../domain/tournament/results/throwballStandings';
import { BarChart3, Trophy, Medal, Info, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';

export const StandingsTable: React.FC = () => {
  const { activeTournament, domainMatches } = useTournament();

  // Filter mode: 'ALL' to view Groups A, B, C, D stacked, or specific group
  const [selectedGroupTab, setSelectedGroupTab] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');

  if (!activeTournament) return null;

  const sportConfig = SPORT_CONFIGS[activeTournament.sport] || SPORT_CONFIGS.throwball;
  const matchesToUse = domainMatches.length > 0 ? domainMatches : activeTournament.fixtures;
  const fourGroupStandings = calculateAllFourGroupStandings(matchesToUse, activeTournament.teams);

  const groupsToDisplay: Array<'A' | 'B' | 'C' | 'D'> =
    selectedGroupTab === 'ALL'
      ? ['A', 'B', 'C', 'D']
      : [selectedGroupTab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-sport-navy flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sport-orange" />
            Official Throwball Tournament Standings
          </h3>
          <p className="text-xs text-slate-500">
            Derived automatically from normalized match set scores (Groups A, B, C, D)
          </p>
        </div>

        {/* Tie-break policy info pill */}
        <div className="flex items-center gap-2 text-xs bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl font-medium border border-slate-200">
          <Info className="w-4 h-4 text-sport-orange shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="font-bold text-sport-navy">Deterministic Tie-Break Policy:</span>{' '}
            <span className="text-slate-600">
              1. Wins → 2. Set Diff (SD) → 3. Point Diff (PD) → 4. Points For (PF) → 5. Head-to-Head → 6. Fallback
            </span>
          </div>
        </div>
      </div>

      {/* Group selector tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          {(
            [
              { id: 'ALL', label: 'All 4 Groups' },
              { id: 'A', label: 'Group A' },
              { id: 'B', label: 'Group B' },
              { id: 'C', label: 'Group C' },
              { id: 'D', label: 'Group D' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedGroupTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                selectedGroupTab === tab.id
                  ? 'bg-sport-orange text-white shadow-sm font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
            Q - Qualifies for Semifinal (#1 in group)
          </span>
        </div>
      </div>

      {/* 4 Independent Group Standings Tables */}
      <div className="space-y-6">
        {groupsToDisplay.map((grpKey) => {
          const rows = fourGroupStandings[grpKey] || [];
          const qualifierTarget = grpKey === 'A' || grpKey === 'B' ? 'Semifinal 1 (SF1)' : 'Semifinal 2 (SF2)';

          return (
            <div
              key={grpKey}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Group Table Header */}
              <div className="bg-gradient-to-r from-slate-900 to-sport-navy text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-sport-orange flex items-center justify-center font-black text-sm text-white shadow-sm">
                    {grpKey}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">GROUP {grpKey} STANDINGS</h4>
                    <p className="text-[11px] text-slate-300">
                      Winner qualifies automatically to <strong className="text-amber-300">{qualifierTarget}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 font-mono">
                  {rows.reduce((acc, r) => acc + r.played, 0) / 2} / 6 Matches Played
                </div>
              </div>

              {/* Table Body */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Pos</th>
                      <th className="py-3 px-4 min-w-[160px]">Team</th>
                      <th className="py-3 px-3 text-center" title="Matches Played">P</th>
                      <th className="py-3 px-3 text-center text-emerald-700" title="Matches Won">W</th>
                      <th className="py-3 px-3 text-center text-rose-600" title="Matches Lost">L</th>
                      <th className="py-3 px-3 text-center" title="Sets Won">SW</th>
                      <th className="py-3 px-3 text-center" title="Sets Lost">SL</th>
                      <th className="py-3 px-3 text-center font-bold" title="Set Difference (SW - SL)">SD</th>
                      <th className="py-3 px-3 text-center" title="Points For (Rally Points)">PF</th>
                      <th className="py-3 px-3 text-center" title="Points Against">PA</th>
                      <th className="py-3 px-3 text-center font-bold" title="Point Difference (PF - PA)">PD</th>
                      <th className="py-3 px-4 text-center font-black text-sport-navy bg-orange-50/60">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {rows.map((row, idx) => {
                      const isLeader = idx === 0;
                      const hasPlayed = row.played > 0;

                      return (
                        <tr
                          key={row.teamId}
                          className={`hover:bg-slate-50/80 transition ${
                            isLeader ? 'bg-orange-50/30' : ''
                          }`}
                        >
                          {/* Position */}
                          <td className="py-3 px-4 text-center font-bold">
                            <div className="flex items-center justify-center">
                              {idx === 0 ? (
                                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-xs shadow-xs">
                                  1
                                </span>
                              ) : idx === 1 ? (
                                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                                  2
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono">{idx + 1}</span>
                              )}
                            </div>
                          </td>

                          {/* Team Name & Status */}
                          <td className="py-3 px-4 font-bold text-sport-navy">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{row.teamName}</span>
                              {row.qualified && hasPlayed && (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] uppercase font-black tracking-wider flex items-center gap-1 shadow-xs"
                                  title={`Rank #1 in Group ${grpKey} qualifies for ${qualifierTarget}`}
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>Q - SF</span>
                                </span>
                              )}
                              {row.isTied && (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] uppercase font-black flex items-center gap-1"
                                  title={row.tieBreakReason || 'Completely unresolved tie'}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                  <span>TIED</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Played, Won, Lost */}
                          <td className="py-3 px-3 text-center font-mono">{row.played}</td>
                          <td className="py-3 px-3 text-center font-mono text-emerald-600 font-bold">
                            {row.won}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-rose-500 font-bold">
                            {row.lost}
                          </td>

                          {/* Sets Won, Sets Lost, Set Difference */}
                          <td className="py-3 px-3 text-center font-mono text-slate-700">{row.setsWon}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500">{row.setsLost}</td>
                          <td className="py-3 px-3 text-center font-mono font-black">
                            <span
                              className={
                                row.setDifference > 0
                                  ? 'text-emerald-600'
                                  : row.setDifference < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-400'
                              }
                            >
                              {row.setDifference > 0 ? `+${row.setDifference}` : row.setDifference}
                            </span>
                          </td>

                          {/* Points For, Points Against, Point Difference */}
                          <td className="py-3 px-3 text-center font-mono text-slate-600">{row.pointsFor}</td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500">{row.pointsAgainst}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            <span
                              className={
                                row.pointDifference > 0
                                  ? 'text-emerald-600'
                                  : row.pointDifference < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-400'
                              }
                            >
                              {row.pointDifference > 0 ? `+${row.pointDifference}` : row.pointDifference}
                            </span>
                          </td>

                          {/* Match Points */}
                          <td className="py-3 px-4 text-center font-mono font-black text-sport-orange bg-orange-50/40 text-sm">
                            {row.points}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
