import React, { useState } from 'react';
import { soundEffects } from '../../engines/audioEngine';
import { Users, Shuffle, Copy, Check, Sparkles, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

const SAMPLE_PLAYERS = `Aarav Sharma
Rohan Deshmukh
Prathamesh Patil
Siddharth Rao
Neil D'Souza
Kabeer Kulkarni
Vikram Joshi
Aditya Nair
Tanmay Gaikwad
Sahil Kadam
Devendra Shinde
Arman Merchant
Karan Mehra
Omkar Jadhav
Harsh Vardhan
Suraj Thorat`;

export const RandomTeamGeneratorTool: React.FC = () => {
  const [playerInput, setPlayerInput] = useState(SAMPLE_PLAYERS);
  const [splitMode, setSplitMode] = useState<'BY_TEAMS' | 'BY_SIZE'>('BY_TEAMS');
  const [targetNumber, setTargetNumber] = useState<number>(4);
  const [generatedTeams, setGeneratedTeams] = useState<
    { name: string; color: string; players: string[] }[]
  >([]);
  const [copied, setCopied] = useState(false);

  const colors = ['#f97316', '#2563eb', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#eab308', '#ec4899'];

  const handleGenerate = () => {
    const rawNames = playerInput
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (rawNames.length === 0) return;

    // True Fisher-Yates random shuffle
    const shuffled = [...rawNames];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let teamCount = targetNumber;
    if (splitMode === 'BY_SIZE') {
      teamCount = Math.max(1, Math.ceil(shuffled.length / targetNumber));
    }

    const teams: { name: string; color: string; players: string[] }[] = Array.from(
      { length: teamCount },
      (_, i) => ({
        name: `Team ${String.fromCharCode(65 + i)}`,
        color: colors[i % colors.length],
        players: [],
      })
    );

    shuffled.forEach((p, idx) => {
      teams[idx % teamCount].players.push(p);
    });

    setGeneratedTeams(teams);
    soundEffects.playCelebration();
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  const handleCopyRosters = () => {
    if (generatedTeams.length === 0) return;

    let text = '🏆 RANDOM BALANCED TEAM ROSTERS:\n\n';
    generatedTeams.forEach((team) => {
      text += `--- ${team.name} (${team.players.length} Players) ---\n`;
      team.players.forEach((p, i) => {
        text += `${i + 1}. ${p}\n`;
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    soundEffects.playWhistle();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
        <h3 className="text-xl font-black text-sport-navy flex items-center justify-center gap-2">
          👥 Match-Day Random Team Generator
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Instant fair-play random team distribution engine for scrimmages, training camps & pickup games
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Input Console */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Player Pool (1 Name Per Line)
            </label>
            <textarea
              rows={8}
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              className="w-full text-xs font-medium p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Distribution Mode
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSplitMode('BY_TEAMS')}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  splitMode === 'BY_TEAMS'
                    ? 'border-sport-orange bg-orange-50 text-sport-orange'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                # of Teams
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('BY_SIZE')}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  splitMode === 'BY_SIZE'
                    ? 'border-sport-orange bg-orange-50 text-sport-orange'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Players / Team
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mt-2 mb-1">
                {splitMode === 'BY_TEAMS' ? 'Number of Teams:' : 'Target Players Per Team:'}
              </label>
              <input
                type="number"
                min={2}
                max={16}
                value={targetNumber}
                onChange={(e) => setTargetNumber(Math.max(2, Number(e.target.value)))}
                className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            className="w-full py-3 bg-sport-orange hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-glow-orange transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Shuffle className="w-4 h-4" />
            Shuffle & Form Teams
          </button>
        </div>

        {/* Right 2 Cols: Formed Teams View */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Formed Rosters ({generatedTeams.length} Teams)
            </h4>

            {generatedTeams.length > 0 && (
              <button
                onClick={handleCopyRosters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sport-navy hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Rosters!' : 'Copy Rosters'}
              </button>
            )}
          </div>

          {generatedTeams.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              Click "Shuffle & Form Teams" to automatically generate balanced squads.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {generatedTeams.map((team, idx) => (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 font-bold text-sport-navy text-sm">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                      <span>{team.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 font-bold">
                      {team.players.length} Players
                    </span>
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {team.players.map((p, pIdx) => (
                      <li key={pIdx} className="flex items-center gap-2 font-medium">
                        <span className="w-4 text-slate-400 font-mono text-[10px]">{pIdx + 1}.</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
