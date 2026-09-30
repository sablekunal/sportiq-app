import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { SPORT_CONFIGS } from '../../engines/sportEngine';
import { Match, MatchEvent } from '../../types';
import {
  Radio,
  Trophy,
  CheckCircle2,
  Sparkles,
  Volume2,
  Send,
  RotateCcw,
  Zap,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';

export const LiveScoringStudio: React.FC = () => {
  const {
    activeTournament,
    activeMatch,
    setActiveMatchId,
    recordMatchEvent,
    updateMatchScore,
    completeMatch,
  } = useTournament();

  const [selectedPeriod, setSelectedPeriod] = useState<string>('Set 1');
  const [selectedAction, setSelectedAction] = useState<string>('Point');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [customCommentary, setCustomCommentary] = useState<string>('');

  if (!activeTournament) return null;

  const sportConfig = SPORT_CONFIGS[activeTournament.sport] || SPORT_CONFIGS.football;
  const currentMatch = activeMatch || activeTournament.fixtures[0] || null;

  if (!currentMatch) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
        <Radio className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-700">No Match Selected for Scoring</h4>
        <p className="text-xs text-slate-500 mt-1">
          Select or generate fixtures to begin recording live match scores.
        </p>
      </div>
    );
  }

  const homeTeam = activeTournament.teams.find((t) => t.id === currentMatch.homeTeamId);
  const awayTeam = activeTournament.teams.find((t) => t.id === currentMatch.awayTeamId);

  // Quick Action Buttons based on Sport (Throwball / Multi-sport)
  const actionTags = [
    { label: 'Smash / Kill', icon: '💥' },
    { label: 'Service Ace', icon: '🎯' },
    { label: 'Service Fault', icon: '⚠️' },
    { label: 'Touch Out', icon: '🖐️' },
    { label: 'Block Point', icon: '🛡️' },
    { label: 'Line Fault', icon: '🚫' },
    { label: 'Unforced Error', icon: '❌' },
  ];

  const handleScorePoint = (team: 'HOME' | 'AWAY', actionLabel?: string) => {
    let newHome = currentMatch.homeScore;
    let newAway = currentMatch.awayScore;
    const action = actionLabel || selectedAction;

    const scoringTeam = team === 'HOME' ? homeTeam : awayTeam;
    const teamId = team === 'HOME' ? currentMatch.homeTeamId : currentMatch.awayTeamId;

    if (team === 'HOME') {
      newHome = newHome + 1;
    } else {
      newAway = newAway + 1;
    }

    // Update live score
    updateMatchScore(currentMatch.id, newHome, newAway, selectedPeriod);
    soundEffects.playWhistle();

    // Log Cricbuzz-style ball-by-ball commentary event
    const playerText = selectedPlayer ? `by ${selectedPlayer}` : '';
    const desc = customCommentary.trim()
      ? customCommentary.trim()
      : `${selectedPeriod} (${newHome}-${newAway}): Point to ${scoringTeam?.name || 'Team'} — ${action} ${playerText}`.trim();

    recordMatchEvent(currentMatch.id, {
      eventType: 'POINT',
      teamId,
      playerName: selectedPlayer || undefined,
      minute: currentMatch.events.length + 1,
      description: desc,
    });

    setCustomCommentary('');
  };

  const handleScoreAdjust = (team: 'HOME' | 'AWAY', delta: number) => {
    let newHome = currentMatch.homeScore;
    let newAway = currentMatch.awayScore;

    if (team === 'HOME') {
      newHome = Math.max(0, newHome + delta);
    } else {
      newAway = Math.max(0, newAway + delta);
    }

    updateMatchScore(currentMatch.id, newHome, newAway, selectedPeriod);
  };

  const handlePostCommentary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommentary.trim()) return;

    recordMatchEvent(currentMatch.id, {
      eventType: 'COMMENTARY',
      teamId: currentMatch.homeTeamId,
      description: `${selectedPeriod}: ${customCommentary.trim()}`,
      minute: currentMatch.events.length + 1,
    });

    setCustomCommentary('');
  };

  const handleEndMatch = () => {
    if (window.confirm(`Confirm full-time outcome: ${homeTeam?.name} (${currentMatch.homeScore}) vs ${awayTeam?.name} (${currentMatch.awayScore})?`)) {
      completeMatch(currentMatch.id, {
        scoreA: currentMatch.homeScore,
        scoreB: currentMatch.awayScore,
      });
      soundEffects.playCelebration();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Fixture Switcher Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-sport-navy">
            Live Match Scorer Desk (Cricbuzz Style)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 font-semibold">Active Match:</label>
          <select
            value={currentMatch.id}
            onChange={(e) => setActiveMatchId(e.target.value)}
            className="bg-slate-50 text-xs font-bold text-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange cursor-pointer max-w-xs truncate"
          >
            {activeTournament.fixtures.map((m) => {
              const h = activeTournament.teams.find((t) => t.id === m.homeTeamId);
              const a = activeTournament.teams.find((t) => t.id === m.awayTeamId);
              return (
                <option key={m.id} value={m.id}>
                  {m.roundName}: {h?.shortName || 'TBD'} vs {a?.shortName || 'TBD'} ({m.status})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Main Cricbuzz-Style Live Score Center */}
      <div className="bg-gradient-to-br from-sport-midnight via-slate-900 to-sport-navy text-white p-5 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-sport-orange/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Status Bar: Live State, Period Selector, Audio Whistle */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {currentMatch.status}
            </span>

            {/* Set / Period Selector */}
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
              {['Set 1', 'Set 2', 'Set 3 (Decider)'].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedPeriod === p
                      ? 'bg-sport-orange text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => soundEffects.playWhistle()}
              className="p-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sport-orange border border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Referee Whistle (Audio)"
            >
              <Volume2 className="w-4 h-4" />
              <span>Whistle</span>
            </button>
          </div>
        </div>

        {/* Big Live Score Arena */}
        <div className="relative z-10 py-6 grid grid-cols-1 md:grid-cols-7 gap-6 items-center">
          {/* Home Team Score Console */}
          <div className="md:col-span-3 text-center sm:text-right space-y-3">
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {homeTeam?.name || 'Home Team'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {homeTeam?.shortName} • {homeTeam?.seed ? `Seed #${homeTeam.seed}` : 'Home'}
                </p>
              </div>
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg"
                style={{ backgroundColor: homeTeam?.color || '#f97316' }}
              >
                {homeTeam?.shortName || 'H'}
              </div>
            </div>

            {/* Home Score Action Buttons */}
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <button
                onClick={() => handleScoreAdjust('HOME', -1)}
                title="Undo point"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold transition flex items-center justify-center cursor-pointer text-sm"
              >
                -1
              </button>
              <button
                onClick={() => handleScorePoint('HOME')}
                className="px-5 py-2.5 rounded-xl bg-sport-orange hover:bg-orange-600 text-white font-extrabold transition flex items-center justify-center shadow-glow-orange cursor-pointer text-xs sm:text-sm active:scale-95"
              >
                +1 Point {homeTeam?.shortName}
              </button>
            </div>
          </div>

          {/* Large Center Scorecard */}
          <div className="md:col-span-1 text-center">
            <div className="inline-block bg-slate-950/95 px-6 py-4 rounded-3xl border border-slate-700/80 shadow-2xl">
              <div className="text-5xl sm:text-6xl font-black text-amber-300 tracking-tight font-mono">
                {currentMatch.homeScore} : {currentMatch.awayScore}
              </div>
              <div className="text-[11px] font-bold text-sport-orange uppercase tracking-wider mt-1">
                {selectedPeriod}
              </div>
            </div>
          </div>

          {/* Away Team Score Console */}
          <div className="md:col-span-3 text-center sm:text-left space-y-3">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg order-last sm:order-first"
                style={{ backgroundColor: awayTeam?.color || '#2563eb' }}
              >
                {awayTeam?.shortName || 'A'}
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {awayTeam?.name || 'Away Team'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {awayTeam?.shortName} • {awayTeam?.seed ? `Seed #${awayTeam.seed}` : 'Away'}
                </p>
              </div>
            </div>

            {/* Away Score Action Buttons */}
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <button
                onClick={() => handleScorePoint('AWAY')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold transition flex items-center justify-center shadow-lg cursor-pointer text-xs sm:text-sm active:scale-95"
              >
                +1 Point {awayTeam?.shortName}
              </button>
              <button
                onClick={() => handleScoreAdjust('AWAY', -1)}
                title="Undo point"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold transition flex items-center justify-center cursor-pointer text-sm"
              >
                -1
              </button>
            </div>
          </div>
        </div>

        {/* Ball-By-Ball Point Tagging Bar (Cricbuzz Tagging) */}
        <div className="relative z-10 pt-5 border-t border-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sport-orange" />
              Quick Action Tag for Next Point
            </span>
            <span className="text-[11px] text-slate-400">
              Active Tag: <strong className="text-sport-orange">{selectedAction}</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {actionTags.map((tag) => (
              <button
                key={tag.label}
                onClick={() => setSelectedAction(tag.label)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                  selectedAction === tag.label
                    ? 'bg-sport-orange text-white border-sport-orange shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
              </button>
            ))}
          </div>

          {/* Player Attribution (Squad Lineup) */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-400 font-semibold">Attribute to Player (Optional):</span>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="bg-slate-900 text-xs font-bold text-white px-3 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer max-w-xs"
            >
              <option value="">No player tagged</option>
              <optgroup label={`${homeTeam?.name || 'Home'} Squad`}>
                {homeTeam?.players.map((p) => (
                  <option key={p.id} value={`${p.name} (#${p.jerseyNumber})`}>
                    #{p.jerseyNumber} {p.name} ({p.role})
                  </option>
                ))}
              </optgroup>
              <optgroup label={`${awayTeam?.name || 'Away'} Squad`}>
                {awayTeam?.players.map((p) => (
                  <option key={p.id} value={`${p.name} (#${p.jerseyNumber})`}>
                    #{p.jerseyNumber} {p.name} ({p.role})
                  </option>
                ))}
              </optgroup>
            </select>

            {selectedPlayer && (
              <button
                onClick={() => setSelectedPlayer('')}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Complete Match & Advance Winner */}
        {currentMatch.status !== 'COMPLETED' && (
          <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              When all sets conclude, mark match complete to automatically update points & bracket.
            </div>

            <button
              onClick={handleEndMatch}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Trophy className="w-4 h-4" />
              <span>Conclude Match & Finalize Score</span>
            </button>
          </div>
        )}
      </div>

      {/* Cricbuzz-Style Live Commentary Log Stream */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-sport-navy flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              Live Commentary & Ball-by-Ball Feed ({currentMatch.events.length} Updates)
            </h4>
            <p className="text-xs text-slate-500">
              Real-time point stream broadcasted live to spectators
            </p>
          </div>

          {/* Quick Custom Commentary Entry Form */}
          <form onSubmit={handlePostCommentary} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={customCommentary}
              onChange={(e) => setCustomCommentary(e.target.value)}
              placeholder="Add commentary note (e.g. Timeout called)..."
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sport-orange w-full sm:w-64"
            />
            <button
              type="submit"
              disabled={!customCommentary.trim()}
              className="px-3 py-1.5 bg-sport-navy hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Send className="w-3 h-3" />
              <span>Post</span>
            </button>
          </form>
        </div>

        {currentMatch.events.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No points or commentary logged yet. Use the point buttons above to begin the live feed.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {currentMatch.events.slice().reverse().map((evt, idx) => (
              <div
                key={evt.id || idx}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3 text-xs hover:bg-slate-100/80 transition"
              >
                <span className="font-mono font-black text-sport-orange px-2 py-0.5 rounded bg-orange-100/80 text-[10px] shrink-0 mt-0.5">
                  #{currentMatch.events.length - idx}
                </span>

                <div className="flex-1">
                  <div className="font-medium text-slate-800 leading-relaxed">
                    {evt.description}
                  </div>
                  {evt.playerName && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Key Player: <span className="font-bold text-sport-navy">{evt.playerName}</span>
                    </div>
                  )}
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase shrink-0">
                  {evt.eventType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
