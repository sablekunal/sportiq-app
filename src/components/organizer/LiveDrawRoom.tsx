import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Team } from '../../types';
import { Sparkles, Play, RotateCcw, CheckCircle2, Shuffle, Trophy } from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';
import confetti from 'canvas-confetti';

export const LiveDrawRoom: React.FC = () => {
  const { activeTournament, updateTournamentStatus, generateTournamentFixtures } = useTournament();

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawnTeam, setCurrentDrawnTeam] = useState<Team | null>(null);
  const [assignedSlots, setAssignedSlots] = useState<{ slot: number; team: Team | null }[]>(() => {
    const teams = activeTournament?.teams || [];
    return Array.from({ length: Math.max(teams.length, 8) }, (_, i) => ({
      slot: i + 1,
      team: null,
    }));
  });

  const [remainingPool, setRemainingPool] = useState<Team[]>(activeTournament?.teams || []);

  if (!activeTournament) return null;

  const totalSlots = assignedSlots.length;
  const filledCount = assignedSlots.filter((s) => s.team !== null).length;
  const isCompleted = filledCount === remainingPool.length + filledCount && remainingPool.length === 0;

  // Draw Next Single Team with animation
  const handleDrawNext = () => {
    if (remainingPool.length === 0 || isDrawing) return;

    setIsDrawing(true);
    let counter = 0;
    const interval = setInterval(() => {
      soundEffects.playTick();
      const randomIdx = Math.floor(Math.random() * remainingPool.length);
      setCurrentDrawnTeam(remainingPool[randomIdx]);
      counter++;

      if (counter > 12) {
        clearInterval(interval);
        const finalTeam = remainingPool[randomIdx];
        const nextSlotIndex = assignedSlots.findIndex((s) => s.team === null);

        if (nextSlotIndex !== -1) {
          const newSlots = [...assignedSlots];
          newSlots[nextSlotIndex] = { ...newSlots[nextSlotIndex], team: finalTeam };
          setAssignedSlots(newSlots);

          const newPool = remainingPool.filter((t) => t.id !== finalTeam.id);
          setRemainingPool(newPool);

          soundEffects.playCelebration();
          confetti({ particleCount: 35, spread: 50 });

          if (newPool.length === 0) {
            updateTournamentStatus(activeTournament.id, 'DRAW_COMPLETED');
          }
        }
        setIsDrawing(false);
      }
    }, 90);
  };

  // Instant Auto-Draw All
  const handleAutoDrawAll = () => {
    const shuffled = [...activeTournament.teams].sort(() => Math.random() - 0.5);
    const newSlots = assignedSlots.map((s, idx) => ({
      slot: s.slot,
      team: shuffled[idx] || null,
    }));

    setAssignedSlots(newSlots);
    setRemainingPool([]);
    setCurrentDrawnTeam(null);
    updateTournamentStatus(activeTournament.id, 'DRAW_COMPLETED');
    soundEffects.playCelebration();
    confetti({ particleCount: 80, spread: 70 });
  };

  // Reset Draw
  const handleResetDraw = () => {
    setAssignedSlots(
      Array.from({ length: Math.max(activeTournament.teams.length, 8) }, (_, i) => ({
        slot: i + 1,
        team: null,
      }))
    );
    setRemainingPool(activeTournament.teams);
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
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={handleAutoDrawAll}
            disabled={remainingPool.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Auto Draw All
          </button>

          <button
            onClick={handleDrawNext}
            disabled={isDrawing || remainingPool.length === 0}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-sport-orange hover:bg-orange-600 text-white shadow-glow-orange transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            {isDrawing ? 'Shuffling Bowl...' : `Draw Next Team (${remainingPool.length} Left)`}
          </button>
        </div>
      </div>

      {/* Main Draw Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Live Drawing Chamber & Pool */}
        <div className="lg:col-span-1 space-y-4">
          {/* Chamber */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Draw Spotlight Chamber
            </div>

            <div className="h-44 flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-sport-midnight border border-slate-800 relative overflow-hidden">
              {currentDrawnTeam ? (
                <div className={`transition-all transform ${isDrawing ? 'scale-90 opacity-80' : 'scale-105'}`}>
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-lg font-black shadow-glow-orange mb-3"
                    style={{ backgroundColor: currentDrawnTeam.color || '#f97316' }}
                  >
                    {currentDrawnTeam.shortName}
                  </div>
                  <div className="text-base font-extrabold text-white">{currentDrawnTeam.name}</div>
                  <div className="text-xs text-sport-orange font-mono">Seed #{currentDrawnTeam.seed || '-'}</div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs">
                  <div className="text-4xl mb-2 animate-bounce">🎱</div>
                  Click "Draw Next Team" to reveal the lottery selection!
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
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-sport-navy flex items-center gap-2">
                <Trophy className="w-4 h-4 text-sport-orange" />
                Tournament Bracket & Group Slots
              </h4>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {filledCount} / {totalSlots} Assigned
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assignedSlots.map((slotItem) => (
                <div
                  key={slotItem.slot}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    slotItem.team
                      ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-400/20'
                      : 'border-dashed border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 font-mono font-bold text-xs flex items-center justify-center">
                      #{slotItem.slot}
                    </span>

                    {slotItem.team ? (
                      <div>
                        <div className="text-xs font-bold text-sport-navy">{slotItem.team.name}</div>
                        <div className="text-[10px] text-slate-500">Seed {slotItem.team.seed}</div>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 italic">
                        Empty Slot (Awaiting Draw)
                      </span>
                    )}
                  </div>

                  {slotItem.team && (
                    <div
                      className="w-7 h-7 rounded-lg text-white font-bold text-[10px] flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: slotItem.team.color || '#f97316' }}
                    >
                      {slotItem.team.shortName}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* If draw finished, show generate fixtures CTA */}
            {isCompleted && (
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between bg-orange-50/70 p-4 rounded-xl border border-orange-200">
                <div>
                  <div className="text-xs font-bold text-sport-navy">Draw Successfully Finalized!</div>
                  <div className="text-[11px] text-slate-600">
                    Generate the knockout or league bracket now with this seeded sequence.
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
