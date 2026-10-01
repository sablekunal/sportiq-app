import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Team } from '../../types';
import { Sparkles, Play, RotateCcw, CheckCircle2, Shuffle, Trophy, Lock } from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';

const GROUPS = ['A', 'B', 'C', 'D'] as const;

// 16 highly distinct, easily recognizable colors
const WHEEL_COLORS = [
  '#E53935', // Red
  '#1E88E5', // Blue
  '#43A047', // Green
  '#FB8C00', // Orange
  '#8E24AA', // Purple
  '#00ACC1', // Cyan
  '#FFB300', // Amber
  '#D81B60', // Pink
  '#3949AB', // Indigo
  '#00897B', // Teal
  '#7CB342', // Light Green
  '#F4511E', // Deep Orange
  '#5E35B1', // Deep Purple
  '#039BE5', // Light Blue
  '#C0CA33', // Lime
  '#6D4C41', // Brown
];

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentAngleRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const wheelTeamsRef = useRef<Team[]>([]);

  const isGroupKnockout = activeTournament?.format === 'GROUP_KNOCKOUT';
  const teams = activeTournament?.teams || [];

  const assignedTeamIds = new Set<string>();
  if (isGroupKnockout && activeTournament?.groups) {
    activeTournament.groups.forEach((g) => {
      g.teamIds?.forEach((id) => {
        if (id) assignedTeamIds.add(id);
      });
    });
  }
  const remainingPool = teams.filter((t) => !assignedTeamIds.has(t.id));

  // Keep wheelTeamsRef in sync (only update when NOT drawing)
  useEffect(() => {
    if (!isDrawing) {
      wheelTeamsRef.current = remainingPool;
      drawWheel(currentAngleRef.current);
    }
  }, [remainingPool.length, isDrawing]);

  if (!activeTournament) return null;

  const getAssignedTeam = (groupId: string, position: number): Team | null => {
    const group = activeTournament.groups?.find((g) => g.id === groupId);
    const teamId = group?.teamIds?.[position - 1];
    if (!teamId) return null;
    return teams.find((t) => t.id === teamId) || null;
  };

  const totalSlots = isGroupKnockout ? 16 : Math.max(teams.length, 8);
  const filledCount = isGroupKnockout
    ? assignedTeamIds.size
    : teams.length - remainingPool.length;
  const isCompleted = isGroupKnockout ? filledCount === 16 || (filledCount === teams.length && remainingPool.length === 0) : remainingPool.length === 0;

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

  // ─── Canvas Drawing ───────────────────────────────────────────────────
  const drawWheel = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 360;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 6;
    const slices = wheelTeamsRef.current;
    const n = slices.length;

    ctx.clearRect(0, 0, size, size);

    if (n === 0) {
      // Empty wheel
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 6;
      ctx.stroke();
      return;
    }

    const sliceAngle = (Math.PI * 2) / n;

    for (let i = 0; i < n; i++) {
      const startAngle = angle + i * sliceAngle - Math.PI / 2;
      const endAngle = startAngle + sliceAngle;

      // Slice
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();

      // Border between slices
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      const midAngle = startAngle + sliceAngle / 2;
      const labelR = radius * 0.65;
      const lx = cx + Math.cos(midAngle) * labelR;
      const ly = cy + Math.sin(midAngle) * labelR;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${n > 12 ? 10 : 12}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      const label = slices[i].shortName || slices[i].name.slice(0, 4);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Hub
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f97316';
    ctx.fill();
  }, []);

  // ─── Physics-based Spin Animation ─────────────────────────────────────
  const handleDrawNext = async () => {
    if (remainingPool.length === 0 || isDrawing || isGroupLocked) return;

    const nextSlot = getNextEmptySlot();
    if (!nextSlot) return;

    setIsDrawing(true);
    setCurrentDrawnTeam(null);

    const randomIdx = Math.floor(Math.random() * remainingPool.length);
    const finalTeam = remainingPool[randomIdx];

    const n = remainingPool.length;
    const sliceAngle = (Math.PI * 2) / n;

    // Target: the needle is at the top (- PI/2). We want randomIdx's slice center at the top.
    // The center of slice i in the wheel is at angle + i * sliceAngle - PI/2.
    // We need: currentAngle + randomIdx * sliceAngle ≡ 0 (mod 2π) so the slice ends up at - PI/2.
    const targetSliceCenter = randomIdx * sliceAngle + sliceAngle / 2;
    // We want the final angle such that targetSliceCenter + finalAngle = full rotations (ends at top)
    const baseTarget = (Math.PI * 2) - targetSliceCenter;
    // Add 5 full rotations for drama
    const totalSpin = baseTarget + Math.PI * 2 * 5;

    const startAngle = currentAngleRef.current;
    const startTime = performance.now();
    const duration = 5000; // 5 seconds

    // Easing: cubic ease-out for natural physics deceleration
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      const currentAngle = startAngle + totalSpin * eased;
      currentAngleRef.current = currentAngle;
      drawWheel(currentAngle);

      // Tick sounds (decreasing frequency as it slows)
      if (progress < 0.85 && elapsed % 150 < 20) {
        soundEffects.playTick();
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Done spinning
        currentAngleRef.current = startAngle + totalSpin;
        drawWheel(currentAngleRef.current);
        setCurrentDrawnTeam(finalTeam);

        (async () => {
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
        })();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  // ─── Auto Draw All ────────────────────────────────────────────────────
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

  // ─── Reset ────────────────────────────────────────────────────────────
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
    currentAngleRef.current = 0;
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Initial draw
  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [drawWheel]);

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
            {isDrawing ? 'Spinning...' : `Draw Next Team (${remainingPool.length} Left)`}
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
        {/* Left Col: Spin Wheel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Official Draw Wheel
            </div>

            {/* Wheel Container */}
            <div className="relative w-[360px] h-[360px] mx-auto mb-6">
              {/* Needle (top-center, pointing down) */}
              <div 
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-10 z-20" 
                style={{ 
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)', 
                  background: 'linear-gradient(180deg, #f97316, #ea580c)',
                  filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.4))' 
                }}
              />

              {/* Canvas Wheel */}
              <canvas
                ref={canvasRef}
                className="w-full h-full rounded-full"
                style={{ display: 'block' }}
              />
            </div>

            {/* Result Display */}
            <div className="min-h-[80px] flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-slate-900 to-sport-midnight border border-slate-800 relative overflow-hidden">
              {currentDrawnTeam ? (
                <div className="animate-fadeIn">
                  <div className="text-base font-extrabold text-white mb-1 flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: WHEEL_COLORS[teams.indexOf(currentDrawnTeam) % WHEEL_COLORS.length] }}></span>
                    {currentDrawnTeam.name}
                  </div>
                  <div className="text-[10px] text-sport-orange font-mono uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full inline-block font-bold">
                    ✓ Selected Team
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-xs font-semibold">
                  {isDrawing ? (
                    <span className="animate-pulse">🎰 Spinning the wheel...</span>
                  ) : (
                    'Click "Draw Next Team" to spin the wheel!'
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-600 font-semibold px-2">
              <span>Remaining in Pool:</span>
              <span className="font-mono text-sport-orange font-bold">{remainingPool.length} Teams</span>
            </div>
          </div>

          {/* Undrawn Teams Pool */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Lottery Pool
            </div>
            <div className="flex flex-wrap gap-2">
              {remainingPool.map((team, idx) => (
                <span
                  key={team.id}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: WHEEL_COLORS[teams.indexOf(team) % WHEEL_COLORS.length] }}
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
