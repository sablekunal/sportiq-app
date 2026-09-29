import React, { useState } from 'react';
import { soundEffects } from '../../engines/audioEngine';
import { RotateCcw, Volume2, Trophy, Undo2, Plus, Minus } from 'lucide-react';
import confetti from 'canvas-confetti';

export const ScoreboardClickerTool: React.FC = () => {
  const [teamAName, setTeamAName] = useState('Home Team');
  const [teamBName, setTeamBName] = useState('Away Team');
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [setA, setSetA] = useState(0);
  const [setB, setSetB] = useState(0);
  const [period, setPeriod] = useState(1);
  const [history, setHistory] = useState<{ a: number; b: number; setA: number; setB: number }[]>([]);

  const handleScore = (team: 'A' | 'B', delta: number) => {
    // Record history for undo
    setHistory((prev) => [{ a: scoreA, b: scoreB, setA, setB }, ...prev.slice(0, 10)]);

    if (team === 'A') {
      const newScore = Math.max(0, scoreA + delta);
      setScoreA(newScore);
    } else {
      const newScore = Math.max(0, scoreB + delta);
      setScoreB(newScore);
    }

    soundEffects.playWhistle();
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[0];
    setScoreA(last.a);
    setScoreB(last.b);
    setSetA(last.setA);
    setSetB(last.setB);
    setHistory(history.slice(1));
    soundEffects.playTick();
  };

  const handleReset = () => {
    setScoreA(0);
    setScoreB(0);
    setSetA(0);
    setSetB(0);
    setPeriod(1);
    setHistory([]);
  };

  const handleWinSet = (team: 'A' | 'B') => {
    if (team === 'A') setSetA((prev) => prev + 1);
    else setSetB((prev) => prev + 1);
    setScoreA(0);
    setScoreB(0);
    soundEffects.playCelebration();
    confetti({ particleCount: 50, spread: 60 });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
        <h3 className="text-xl font-black text-sport-navy flex items-center justify-center gap-2">
          🔢 Multi-Sport Tactile Scoreboard Clicker
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Touch-friendly giant digital clicker scoreboard for field referees, scorers, and table officials
        </p>

        {/* Team Customizer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 max-w-md mx-auto">
          <input
            type="text"
            value={teamAName}
            onChange={(e) => setTeamAName(e.target.value)}
            className="text-xs font-bold text-center px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange"
          />
          <input
            type="text"
            value={teamBName}
            onChange={(e) => setTeamBName(e.target.value)}
            className="text-xs font-bold text-center px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange"
          />
        </div>
      </div>

      {/* Main Big Scoreboard Panel */}
      <div className="bg-gradient-to-br from-sport-midnight via-slate-900 to-sport-navy text-white p-6 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Top Controls: Period / Set tracker */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Period / Half:</span>
            <span className="font-black text-sport-orange font-mono text-base px-2 py-0.5 rounded bg-slate-800">
              #{period}
            </span>
            <button
              onClick={() => setPeriod((p) => p + 1)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Huge Dual Score Clickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 items-center">
          {/* Team A */}
          <div className="bg-slate-950/80 p-6 rounded-3xl border border-slate-800 text-center space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-white truncate">{teamAName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-sport-orange font-bold font-mono">
                Sets: {setA}
              </span>
            </div>

            <div
              onClick={() => handleScore('A', 1)}
              className="py-8 bg-slate-900 rounded-2xl border border-slate-800 hover:border-sport-orange/50 transition cursor-pointer select-none active:scale-95 shadow-inner"
            >
              <div className="text-7xl sm:text-8xl font-black font-mono text-sport-orange">
                {scoreA}
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Tap to +1</div>
            </div>

            {/* Quick +/- score increments */}
            <div className="flex items-center justify-center gap-2">
              {[-1, 1, 2, 3, 4, 6].map((pts) => (
                <button
                  key={pts}
                  onClick={() => handleScore('A', pts)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition active:scale-95"
                >
                  {pts > 0 ? `+${pts}` : pts}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleWinSet('A')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Award Set / Game to {teamAName}
            </button>
          </div>

          {/* Team B */}
          <div className="bg-slate-950/80 p-6 rounded-3xl border border-slate-800 text-center space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-white truncate">{teamBName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold font-mono">
                Sets: {setB}
              </span>
            </div>

            <div
              onClick={() => handleScore('B', 1)}
              className="py-8 bg-slate-900 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition cursor-pointer select-none active:scale-95 shadow-inner"
            >
              <div className="text-7xl sm:text-8xl font-black font-mono text-blue-400">
                {scoreB}
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Tap to +1</div>
            </div>

            {/* Quick +/- score increments */}
            <div className="flex items-center justify-center gap-2">
              {[-1, 1, 2, 3, 4, 6].map((pts) => (
                <button
                  key={pts}
                  onClick={() => handleScore('B', pts)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition active:scale-95"
                >
                  {pts > 0 ? `+${pts}` : pts}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleWinSet('B')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Award Set / Game to {teamBName}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
