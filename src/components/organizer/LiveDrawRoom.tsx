import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Team } from '../../types';
import { Sparkles, Play, RotateCcw, CheckCircle2, Shuffle, Trophy, Lock } from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';


const GROUPS = ['A', 'B', 'C', 'D'] as const;

export const LiveDrawRoom: React.FC = () => {
  const {
    activeTournament,
    updateTournamentStatus,
    generateTournamentFixtures,
    assignGroupPosition,
    isGroupLocked,
  } = useTournament();

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawnTeam, setCurrentDrawnTeam] = useState<Team | null>(null);

  if (!activeTournament) return null;

  const isGroupKnockout = activeTournament.format === 'GROUP_KNOCKOUT';
  const teams = activeTournament.teams || [];

  // Helper to find team assigned to a specific group slot
  const getAssignedTeam = (groupId: string, position: number): Team | null => {
    const group = activeTournament.groups?.find((g) => g.id === groupId);
    const teamId = group?.teamIds?.[position - 1];
    if (!teamId) return null;
    return teams.find((t) => t.id === teamId) || null;
  };

  // Find all assigned team IDs across all groups
  const assignedTeamIds = new Set<string>();
  if (isGroupKnockout) {
    activeTournament.groups?.forEach((g) => {
      g.teamIds?.forEach((id) => {
        if (id) assignedTeamIds.add(id);
      });
    });
  }

  // Undrawn teams pool
  const remainingPool = teams.filter((t) => !assignedTeamIds.has(t.id));

  // Count assigned slots
  const totalSlots = isGroupKnockout ? 16 : Math.max(teams.length, 8);
  const filledCount = isGroupKnockout
    ? assignedTeamIds.size
    : teams.length - remainingPool.length;
  const isCompleted = isGroupKnockout ? filledCount === 16 || (filledCount === teams.length && remainingPool.length === 0) : remainingPool.length === 0;

  // Find the next empty group slot (A1..A4, B1..B4, C1..C4, D1..D4)
  const getNextEmptySlot = (): { groupId: string; position: number } | null => {
    for (const g of GROUPS) {
      for (let pos = 1; pos <= 4; pos++) {
        if (!getAssignedTeam(g, pos)) {
          return { groupId: g, position: pos };
        }
      }
    }
    return null;
  };

  // Draw Next Single Team with animation
  const handleDrawNext = async () => {
    if (remainingPool.length === 0 || isDrawing || isGroupLocked) return;

    const nextSlot = getNextEmptySlot();
    if (!nextSlot) return;

    setIsDrawing(true);
    let counter = 0;
    const interval = setInterval(async () => {
      soundEffects.playTick();
      const randomIdx = Math.floor(Math.random() * remainingPool.length);
      setCurrentDrawnTeam(remainingPool[randomIdx]);
      counter++;

      if (counter > 10) {
        clearInterval(interval);
        const finalTeam = remainingPool[randomIdx];

        try {
          await assignGroupPosition(activeTournament.id, nextSlot.groupId, nextSlot.position, finalTeam.id);
          soundEffects.playCelebration();

          if (remainingPool.length <= 1) {
            updateTournamentStatus(activeTournament.id, 'DRAW_COMPLETED');
          }
        } catch (err: any) {
          alert(err.message || 'Error assigning group slot');
        } finally {
          setIsDrawing(false);
        }
      }
    }, 90);
  };

  // Instant Auto-Draw All
  const handleAutoDrawAll = async () => {
    if (isGroupLocked) return;

    const shuffled = [...remainingPool].sort(() => Math.random() - 0.5);
    let poolIdx = 0;

    for (const g of GROUPS) {
      for (let pos = 1; pos <= 4; pos++) {
        if (!getAssignedTeam(g, pos) && poolIdx < shuffled.length) {
          const team = shuffled[poolIdx++];
          await assignGroupPosition(activeTournament.id, g, pos, team.id);
        }
      }
    }

    setCurrentDrawnTeam(null);
    updateTournamentStatus(activeTournament.id, 'DRAW_COMPLETED');
    soundEffects.playCelebration();
  };

  // Reset Draw
  const handleResetDraw = async () => {
    if (isGroupLocked) {
      alert('Cannot reset draw: competition has already begun.');
      return;
    }
    if (!window.confirm('Reset all group slot assignments?')) return;

    for (const g of GROUPS) {
      for (let pos = 1; pos <= 4; pos++) {
        await assignGroupPosition(activeTournament.id, g, pos, null);
      }
    }
    setCurrentDrawnTeam(null);
  };

  return (
    <div className="space-y-6">
      {/* Draw Room Header */}
      <div className="bg-gradient-to-r from-sport-navy via-slate-900 to-sport-midnight text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sport-orange animate-ping"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-sport-orange">
              Live Tournament Draw Studio
            </span>
          </div>
          <h3 className="text-xl font-black">Official Live Seed & Slot Draw</h3>
          <p className="text-xs text-slate-300">
            Fair play random selection engine broadcasting slot assignments in real time
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetDraw}
            disabled={isGroupLocked || filledCount === 0}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={handleAutoDrawAll}
            disabled={remainingPool.length === 0 || isGroupLocked}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Auto Draw All
          </button>

          <button
            onClick={handleDrawNext}
            disabled={isDrawing || remainingPool.length === 0 || isGroupLocked}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-sport-orange hover:bg-orange-600 text-white shadow-glow-orange transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            {isDrawing ? 'Shuffling Bowl...' : `Draw Next Team (${remainingPool.length} Left)`}
          </button>
        </div>
      </div>

      {/* Lock Guard Banner if competition has started */}
      {isGroupLocked && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-700 text-xs">
          <div className="flex items-center gap-2.5 font-bold">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Group position assignments are locked because competition has already started.</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-100 font-extrabold">
            Locked
          </span>
        </div>
      )}

      {/* Main Draw Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Live Drawing Chamber & Pool */}
        <div className="lg:col-span-1 space-y-4">
          {/* Chamber */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
              Official Draw Wheel
            </div>

            <div className="relative w-48 h-48 mx-auto mb-6">
              {/* Needle */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-8 bg-sport-orange z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' }}></div>
              
              {/* Wheel */}
              <div 
                className={`w-full h-full rounded-full border-8 border-slate-900 shadow-[0_0_25px_rgba(0,0,0,0.15)] overflow-hidden ${isDrawing ? 'animate-[spin_0.3s_linear_infinite]' : 'transition-transform duration-1000'}`}
                style={{
                  background: remainingPool.length > 0 
                    ? `conic-gradient(${remainingPool.map((t, i, arr) => `${t.color || '#cbd5e1'} ${i * (100/arr.length)}% ${(i+1) * (100/arr.length)}%`).join(', ')})`
                    : currentDrawnTeam ? currentDrawnTeam.color : '#1e293b'
                }}
              />

              {/* Hub */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-slate-900 rounded-full border-4 border-slate-800 flex items-center justify-center z-10 shadow-xl">
                <div className="w-4 h-4 bg-sport-orange rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="min-h-[90px] flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-slate-900 to-sport-midnight border border-slate-800 relative overflow-hidden">
              {currentDrawnTeam ? (
                <div className={`transition-all transform ${isDrawing ? 'scale-90 opacity-40' : 'scale-100 animate-fadeIn'}`}>
                  <div className="text-sm font-extrabold text-white mb-1 flex items-center gap-2 justify-center">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentDrawnTeam.color || '#f97316' }}></span>
                    {currentDrawnTeam.name}
                  </div>
                  <div className="text-[10px] text-sport-orange font-mono uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-full inline-block">
                    Selected Team
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-xs font-semibold">
                  Click "Draw Next Team" to spin the wheel!
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-600 font-semibold px-2">
              <span>Remaining in Bowl:</span>
              <span className="font-mono text-sport-orange font-bold">{remainingPool.length} Teams</span>
            </div>
          </div>

          {/* Undrawn Teams Pool */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Lottery Pool
            </div>
            <div className="flex flex-wrap gap-2">
              {remainingPool.map((team) => (
                <span
                  key={team.id}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: team.color || '#f97316' }}
                  />
                  {team.shortName}
                </span>
              ))}
              {remainingPool.length === 0 && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All teams drawn!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Slot Assignment Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-sport-navy flex items-center gap-2">
                <Trophy className="w-4 h-4 text-sport-orange" />
                {isGroupKnockout ? '4 Groups × 4 Position Slots' : 'Tournament Bracket Slots'}
              </h4>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {filledCount} / {totalSlots} Assigned
              </span>
            </div>

            {/* 4 Groups Layout for GROUP_KNOCKOUT */}
            {isGroupKnockout ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {GROUPS.map((groupId) => (
                  <div key={groupId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 text-xs font-extrabold text-sport-navy">
                      <span>Group {groupId}</span>
                      <span className="font-mono text-[10px] text-slate-400">Slots {groupId}1 - {groupId}4</span>
                    </div>

                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((pos) => {
                        const team = getAssignedTeam(groupId, pos);
                        const slotCode = `${groupId}${pos}`;

                        return (
                          <div
                            key={pos}
                            className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                              team
                                ? 'border-emerald-300 bg-white ring-1 ring-emerald-400/20'
                                : 'border-dashed border-slate-300 bg-white/70'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-mono font-black text-xs flex items-center justify-center shrink-0">
                                {slotCode}
                              </span>

                              {team ? (
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-sport-navy truncate">{team.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">Seed #{team.seed}</div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Empty ({slotCode})</span>
                              )}
                            </div>

                            {/* Dropdown to assign or re-assign */}
                            {!isGroupLocked ? (
                              <select
                                value={team?.id || ''}
                                onChange={(e) => {
                                  const val = e.target.value || null;
                                  assignGroupPosition(activeTournament.id, groupId, pos, val);
                                }}
                                className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg px-2 py-1 outline-none max-w-[110px] truncate cursor-pointer"
                              >
                                <option value="">Empty</option>
                                {teams.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              team && (
                                <div
                                  className="w-6 h-6 rounded-md text-white font-black text-[10px] flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: team.color || '#f97316' }}
                                >
                                  {team.shortName}
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback generic slots for non-group tournaments */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teams.map((team, idx) => (
                  <div
                    key={team.id || idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 font-mono font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div className="text-xs font-bold text-sport-navy">{team.name}</div>
                    </div>
                    <div
                      className="w-7 h-7 rounded-lg text-white font-bold text-[10px] flex items-center justify-center"
                      style={{ backgroundColor: team.color || '#f97316' }}
                    >
                      {team.shortName}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* If draw finished, show generate fixtures CTA */}
            {isCompleted && (
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between bg-orange-50/70 p-4 rounded-xl border border-orange-200">
                <div>
                  <div className="text-xs font-bold text-sport-navy">Group Draw Successfully Finalized!</div>
                  <div className="text-[11px] text-slate-600">
                    Generate the official 24 group matches and 3 playoff matches.
                  </div>
                </div>
                <button
                  onClick={() => generateTournamentFixtures(activeTournament.id)}
                  className="px-4 py-2 bg-sport-orange hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-glow-orange transition cursor-pointer"
                >
                  Generate Fixtures →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

