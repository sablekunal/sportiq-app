import React, { useState, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { SPORT_CONFIGS } from '../../engines/sportEngine';
import { Match, MatchEvent } from '../../types';
import {
  Radio,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  Volume2,
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

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1st Half');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<string>('GOAL');
  const [targetTeamId, setTargetTeamId] = useState<string>('');
  const [selectedPlayerName, setSelectedPlayerName] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  if (!activeTournament) return null;

  const sportConfig = SPORT_CONFIGS[activeTournament.sport] || SPORT_CONFIGS.football;
  const currentMatch = activeMatch || activeTournament.fixtures[0] || null;

  // Timer effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

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

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
    soundEffects.playWhistle();
  };

  const handleOpenEventModal = (eventType: string, defaultTeamId?: string) => {
    setSelectedEventType(eventType);
    setTargetTeamId(defaultTeamId || currentMatch.homeTeamId || '');
    setSelectedPlayerName('');
    setEventDescription('');
    setEventModalOpen(true);
  };

  const handleRecordEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeamId) return;

    recordMatchEvent(currentMatch.id, {
      eventType: selectedEventType,
      teamId: targetTeamId,
      playerName: selectedPlayerName || undefined,
      minute: Math.floor(timerSeconds / 60) || 1,
      description:
        eventDescription ||
        `${selectedPlayerName || 'Team'} recorded ${selectedEventType.replace('_', ' ')}`,
    });

    setEventModalOpen(false);
  };

  const handleEndMatch = () => {
    setIsTimerRunning(false);
    completeMatch(currentMatch.id, {
      scoreA: currentMatch.homeScore,
      scoreB: currentMatch.awayScore
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Fixture Switcher Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-sport-navy">
            Official Live Scoring Desk
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 font-semibold">Active Fixture:</label>
          <select
            value={currentMatch.id}
            onChange={(e) => setActiveMatchId(e.target.value)}
            className="bg-slate-50 text-xs font-bold text-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange cursor-pointer"
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

      {/* Main Stadium Scoreboard Canvas */}
      <div className="bg-gradient-to-br from-sport-midnight via-slate-900 to-sport-navy text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Ambient Stadium Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-sport-orange/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Control Bar: Match Period, Whistle, Stopwatch */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {currentMatch.status}
            </span>

            {/* Period Selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-slate-800/90 text-xs font-bold text-slate-200 px-3 py-1 rounded-lg border border-slate-700 cursor-pointer focus:outline-none"
            >
              {sportConfig.defaultPeriods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Stopwatch & Whistle Sound */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => soundEffects.playWhistle()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sport-orange border border-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Blow Referee Whistle (Audio)"
            >
              <Volume2 className="w-4 h-4" />
              Whistle
            </button>

            <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-1.5 rounded-2xl border border-slate-800">
              <Clock className="w-4 h-4 text-sport-orange" />
              <span className="text-lg font-mono font-bold text-white tracking-wider">
                {formatTimer(timerSeconds)}
              </span>
              <button
                onClick={() => {
                  setIsTimerRunning(!isTimerRunning);
                  soundEffects.playWhistle();
                }}
                className={`p-1.5 rounded-lg text-white transition cursor-pointer ${
                  isTimerRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Big Interactive Score Display */}
        <div className="relative z-10 py-8 grid grid-cols-1 md:grid-cols-7 gap-6 items-center">
          {/* Home Team Console */}
          <div className="md:col-span-3 text-center sm:text-right space-y-4">
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {homeTeam?.name || 'TBD'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {homeTeam?.shortName} • {homeTeam?.seed ? `Seed #${homeTeam.seed}` : 'Home'}
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg"
                style={{ backgroundColor: homeTeam?.color || '#f97316' }}
              >
                {homeTeam?.shortName || 'H'}
              </div>
            </div>

            {/* Quick Score Increment */}
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <button
                onClick={() => handleScoreAdjust('HOME', -1)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center cursor-pointer text-sm"
              >
                -1
              </button>
              <button
                onClick={() => handleScoreAdjust('HOME', 1)}
                className="px-4 py-2 rounded-xl bg-sport-orange hover:bg-orange-600 text-white font-bold transition flex items-center justify-center shadow-glow-orange cursor-pointer text-xs"
              >
                +1 {sportConfig.scoreUnit}
              </button>
            </div>
          </div>

          {/* Large Center Score Board */}
          <div className="md:col-span-1 text-center">
            <div className="inline-block bg-slate-950/90 px-6 py-4 rounded-3xl border border-slate-700/80 shadow-2xl">
              <div className="text-5xl sm:text-6xl font-black text-sport-orange tracking-tight font-mono">
                {currentMatch.homeScore} : {currentMatch.awayScore}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-1">
                {selectedPeriod}
              </div>
            </div>
          </div>

          {/* Away Team Console */}
          <div className="md:col-span-3 text-center sm:text-left space-y-4">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg order-last sm:order-first"
                style={{ backgroundColor: awayTeam?.color || '#2563eb' }}
              >
                {awayTeam?.shortName || 'A'}
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {awayTeam?.name || 'TBD'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {awayTeam?.shortName} • {awayTeam?.seed ? `Seed #${awayTeam.seed}` : 'Away'}
                </p>
              </div>
            </div>

            {/* Quick Score Increment */}
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <button
                onClick={() => handleScoreAdjust('AWAY', 1)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center justify-center shadow-lg cursor-pointer text-xs"
              >
                +1 {sportConfig.scoreUnit}
              </button>
              <button
                onClick={() => handleScoreAdjust('AWAY', -1)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center cursor-pointer text-sm"
              >
                -1
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Sport Event Triggers (Sport Abstraction Layer) */}
        <div className="relative z-10 pt-6 border-t border-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Log Match Event ({sportConfig.displayName})</span>
            <span className="text-[11px] text-sport-orange">Fast 1-Click Telemetry</span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {sportConfig.allowedEvents.map((evt) => (
              <button
                key={evt.type}
                onClick={() => handleOpenEventModal(evt.type)}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-2 cursor-pointer hover:border-sport-orange/50 active:scale-95"
              >
                <span>{evt.icon}</span>
                <span>{evt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Complete Match & Advance Winner */}
        {currentMatch.status !== 'COMPLETED' && (
          <div className="relative z-10 mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              When full-time is blown, confirm the match outcome to advance the winner in the bracket.
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleEndMatch}
                className="px-6 py-2.5 rounded-xl bg-sport-orange hover:bg-orange-600 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                Blow Full-Time & Complete Match
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Match Event Log Timeline */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="text-sm font-bold text-sport-navy mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sport-orange" />
          Match Live Event Stream ({currentMatch.events.length} Events Logged)
        </h4>

        {currentMatch.events.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No events logged yet. Use the event action buttons above to record goals, cards, wickets, or points.
          </div>
        ) : (
          <div className="space-y-3">
            {currentMatch.events.map((evt) => {
              const team = activeTournament.teams.find((t) => t.id === evt.teamId);
              return (
                <div
                  key={evt.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-sport-navy text-white font-mono font-bold flex items-center justify-center text-[11px]">
                      {evt.minute}'
                    </span>
                    <div>
                      <div className="font-bold text-sport-navy flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-orange-100 text-sport-orange text-[10px] uppercase">
                          {evt.eventType}
                        </span>
                        <span>{evt.playerName || team?.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{evt.description}</div>
                    </div>
                  </div>

                  {team && (
                    <span
                      className="px-2.5 py-1 rounded-md text-white font-bold text-[10px]"
                      style={{ backgroundColor: team.color || '#f97316' }}
                    >
                      {team.shortName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Event Modal Dialog */}
      {eventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h4 className="text-base font-bold text-sport-navy mb-4">
              Log Event: {selectedEventType.replace('_', ' ')}
            </h4>

            <form onSubmit={handleRecordEventSubmit} className="space-y-4">
              {/* Select Team */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Select Team *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[homeTeam, awayTeam].filter(Boolean).map((t) => (
                    <button
                      key={t!.id}
                      type="button"
                      onClick={() => setTargetTeamId(t!.id)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                        targetTeamId === t!.id
                          ? 'border-sport-orange bg-orange-50 text-sport-orange ring-2 ring-sport-orange/20'
                          : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      {t!.name} ({t!.shortName})
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Name */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Player Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Striker / Jersey #10"
                  value={selectedPlayerName}
                  onChange={(e) => setSelectedPlayerName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange"
                />
              </div>

              {/* Event Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Event Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Top corner header"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-sport-orange hover:bg-orange-600 rounded-lg shadow-sm cursor-pointer"
                >
                  Record Event & Update Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
