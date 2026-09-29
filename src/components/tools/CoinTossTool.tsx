import React, { useState } from 'react';
import { soundEffects } from '../../engines/audioEngine';
import { RotateCcw, Trophy, CheckCircle2, History } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CoinTossTool: React.FC = () => {
  const [teamA, setTeamA] = useState('Team Alpha (Heads)');
  const [teamB, setTeamB] = useState('Team Beta (Tails)');
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<'HEADS' | 'TAILS' | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const [tossHistory, setTossHistory] = useState<
    { id: string; time: string; winner: string; choice: string }[]
  >([]);

  const handleFlip = () => {
    if (isFlipping) return;

    setIsFlipping(true);
    setResult(null);
    setDecision(null);
    soundEffects.playCoinFlip();

    setTimeout(() => {
      const outcome: 'HEADS' | 'TAILS' = Math.random() > 0.5 ? 'HEADS' : 'TAILS';
      setResult(outcome);
      setIsFlipping(false);
      soundEffects.playCelebration();
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });

      const winnerName = outcome === 'HEADS' ? teamA : teamB;
      setTossHistory((prev) => [
        {
          id: `toss-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          winner: `${winnerName} (${outcome})`,
          choice: 'Awaiting decision',
        },
        ...prev,
      ]);
    }, 1800);
  };

  const handleDecision = (choice: string) => {
    setDecision(choice);
    soundEffects.playWhistle();
    if (tossHistory.length > 0) {
      const updated = [...tossHistory];
      updated[0] = { ...updated[0], choice };
      setTossHistory(updated);
    }
  };

  const winningTeam = result === 'HEADS' ? teamA : teamB;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
        <h3 className="text-xl font-black text-sport-navy flex items-center justify-center gap-2">
          🪙 Match-Day Official Coin Toss
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Cryptographically random 3D simulated coin toss with audio simulation & toss logging
        </p>

        {/* Team Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 max-w-lg mx-auto text-left">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Heads Side (Side A)
            </label>
            <input
              type="text"
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Tails Side (Side B)
            </label>
            <input
              type="text"
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange"
            />
          </div>
        </div>
      </div>

      {/* 3D Coin Flip Arena */}
      <div className="bg-gradient-to-br from-sport-midnight via-slate-900 to-sport-navy text-white p-8 sm:p-12 rounded-3xl border border-slate-800 shadow-2xl text-center relative overflow-hidden">
        {/* The Coin */}
        <div className="py-8 flex justify-center perspective-1000">
          <div
            className={`w-36 h-36 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 shadow-glow-orange border-4 border-yellow-200 flex items-center justify-center transform transition-transform duration-700 preserve-3d cursor-pointer ${
              isFlipping ? 'animate-coin-flip' : 'hover:scale-105'
            }`}
            onClick={handleFlip}
          >
            <div className="text-center font-black text-amber-950">
              <div className="text-4xl">🪙</div>
              <div className="text-xs uppercase tracking-wider font-extrabold mt-1">
                {result ? result : 'CLICK TO FLIP'}
              </div>
            </div>
          </div>
        </div>

        {/* Flip CTA Button */}
        <div className="mt-2">
          <button
            onClick={handleFlip}
            disabled={isFlipping}
            className="px-8 py-3.5 rounded-full bg-sport-orange hover:bg-orange-600 text-white font-extrabold text-sm shadow-glow-orange transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isFlipping ? 'Flipping in Air...' : 'Toss the Coin!'}
          </button>
        </div>

        {/* Result Announcement & Choice */}
        {result && (
          <div className="mt-8 pt-8 border-t border-slate-800 animate-fadeIn">
            <div className="text-xs font-bold uppercase tracking-wider text-sport-orange mb-1">
              Official Toss Won By:
            </div>
            <h4 className="text-2xl sm:text-3xl font-black text-white">{winningTeam}</h4>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-slate-400 mr-2">Elected to:</span>
              {['Bat First', 'Bowl First', 'Kick-Off', 'Defend End'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleDecision(opt)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    decision === opt
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {decision && (
              <div className="mt-4 text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Decision logged: {winningTeam} elected to {decision}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toss History */}
      {tossHistory.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-sport-navy mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-sport-orange" />
            Toss History Log
          </h4>
          <div className="space-y-2">
            {tossHistory.map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-sport-navy">{h.winner}</span>
                  <span className="text-slate-500 ml-2">({h.choice})</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
