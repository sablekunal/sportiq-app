import React, { useState, useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { SPORT_CONFIGS } from '../../engines/sportEngine';
import { Match, MatchEvent, Player, PlayerLineupSnapshot, SetScore } from '../../types';
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
  Users,
  Lock,
  Clock,
  ArrowLeftRight,
  AlertCircle,
  Timer,
  Check,
  X,
  MapPin,
} from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';
import { MatchLineupModal } from './MatchLineupModal';
import { isLineupLocked } from '../../domain/tournament/roster/lineupValidation';

export const LiveScoringStudio: React.FC = () => {
  const {
    activeTournament,
    activeMatch,
    setActiveMatchId,
    recordMatchEvent,
    updateMatchScore,
    updateMatchSets,
    recordMatchSubstitution,
    recordMatchTimeout,
    completeMatch,
    domainMatches,
  } = useTournament();

  const [selectedAction, setSelectedAction] = useState<string>('Point');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [customCommentary, setCustomCommentary] = useState<string>('');
  const [isLineupModalOpen, setIsLineupModalOpen] = useState(false);

  // Substitution Modal State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subTeamId, setSubTeamId] = useState<string>('');
  const [outgoingPlayerId, setOutgoingPlayerId] = useState<string>('');
  const [incomingPlayerId, setIncomingPlayerId] = useState<string>('');
  const [subReason, setSubReason] = useState<'NORMAL' | 'INJURY'>('NORMAL');
  const [subError, setSubError] = useState<string | null>(null);

  const currentMatch = activeMatch || activeTournament?.fixtures[0] || null;

  // Normalized Sets Array (Ensures at least Set 1 is present)
  const currentSets: SetScore[] = useMemo(() => {
    if (!currentMatch) return [{ setNumber: 1, scoreA: 0, scoreB: 0, status: 'LIVE' }];
    if (currentMatch.sets && currentMatch.sets.length > 0) {
      return currentMatch.sets;
    }
    return [{ setNumber: 1, scoreA: currentMatch.homeScore || 0, scoreB: currentMatch.awayScore || 0, status: 'LIVE' }];
  }, [currentMatch?.sets, currentMatch?.homeScore, currentMatch?.awayScore, currentMatch]);

  // Determine Active Set (Live set, or highest completed set, or set 1)
  const activeLiveSet = currentSets.find((s) => s.status === 'LIVE') || currentSets[currentSets.length - 1] || currentSets[0];
  const [activeSetNum, setActiveSetNum] = useState<number>(activeLiveSet?.setNumber || 1);

  if (!activeTournament) return null;

  const isSetPointReached = (scoreA: number, scoreB: number) => {
    // 25-25 draw
    if (scoreA === 25 && scoreB === 25) return true;
    // Hard cap at 25 points
    if (scoreA === 25 || scoreB === 25) return true;
    
    // Normal 15 points, must win by 2
    if (scoreA >= 15 || scoreB >= 15) {
      if (Math.abs(scoreA - scoreB) >= 2) return true;
    }
    
    return false;
  };

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

  const locked = isLineupLocked(currentMatch.status);

  // Keep activeSetNum in sync if sets list changes
  const activeSet = currentSets.find((s) => s.setNumber === activeSetNum) || activeLiveSet;

  // Derived sets won
  const setsWonA = currentMatch.setsWonA ?? currentSets.filter((s) => s.status === 'COMPLETED' && s.winnerId === currentMatch.homeTeamId).length;
  const setsWonB = currentMatch.setsWonB ?? currentSets.filter((s) => s.status === 'COMPLETED' && s.winnerId === currentMatch.awayTeamId).length;

  const isMatchComplete = currentMatch.status === 'COMPLETED';
  const hasMatchWinner = setsWonA >= 2 || setsWonB >= 2;
  const matchWinnerTeam = setsWonA >= 2 ? homeTeam : setsWonB >= 2 ? awayTeam : null;

  // Timeouts for the active set (Rule: 2 timeouts per team per set, 3 min each)
  const timeoutsThisSet = (currentMatch.timeouts || []).filter((t) => t.setNumber === activeSet.setNumber);
  const timeoutsHomeCount = timeoutsThisSet.filter((t) => t.teamId === currentMatch.homeTeamId).length;
  const timeoutsAwayCount = timeoutsThisSet.filter((t) => t.teamId === currentMatch.awayTeamId).length;

  // Substitutions for the active set (Rule: max 3 per team per set, 1 at a time)
  const subsThisSet = (currentMatch.substitutions || []).filter((s) => s.setNumber === activeSet.setNumber);
  const subsHomeCount = subsThisSet.filter((s) => s.teamId === currentMatch.homeTeamId).length;
  const subsAwayCount = subsThisSet.filter((s) => s.teamId === currentMatch.awayTeamId).length;

  // Helper to resolve player info
  const getPlayerDisplay = (playerId: string, team?: typeof homeTeam, isHome?: boolean) => {
    const lineup = isHome ? currentMatch.lineupHome : currentMatch.lineupAway;
    let snap: PlayerLineupSnapshot | undefined;
    if (Array.isArray(lineup?.snapshots)) {
      snap = lineup.snapshots.find((s) => s.id === playerId);
    } else if (lineup?.snapshots && typeof lineup.snapshots === 'object') {
      snap = (lineup.snapshots as Record<string, PlayerLineupSnapshot>)[playerId];
    }
    if (snap) return snap;
    const p = team?.players.find((item) => item.id === playerId);
    if (p) return p;
    return { id: playerId, name: `Player (${playerId.slice(-4)})`, jerseyNumber: 0 };
  };

  // Point scoring for Throwball
  const handleScorePoint = async (team: 'HOME' | 'AWAY', actionLabel?: string) => {
    if (isMatchComplete) return;

    // Throwball Set Winning Rules: First to 15 points wins (No deuce)
    const thresholdA = 15;
    const thresholdB = 15;

    if (activeSet.scoreA >= thresholdA || activeSet.scoreB >= thresholdB) {
      alert(`Set ${activeSet.setNumber} is already won! Please conclude the set using the 'End Set' controls.`);
      return;
    }

    const action = actionLabel || selectedAction;
    const scoringTeam = team === 'HOME' ? homeTeam : awayTeam;
    const teamId = team === 'HOME' ? currentMatch.homeTeamId : currentMatch.awayTeamId;

    const newScoreA = team === 'HOME' ? activeSet.scoreA + 1 : activeSet.scoreA;
    const newScoreB = team === 'AWAY' ? activeSet.scoreB + 1 : activeSet.scoreB;

    const updatedSets = currentSets.map((s) => {
      if (s.setNumber === activeSet.setNumber) {
        return {
          ...s,
          scoreA: newScoreA,
          scoreB: newScoreB,
          status: 'LIVE' as const,
        };
      }
      return s;
    });

    await updateMatchSets(currentMatch.id, updatedSets, activeSet.setNumber, teamId);


    // Log commentary event
    const playerText = selectedPlayer ? `by ${selectedPlayer}` : '';
    const desc = customCommentary.trim()
      ? customCommentary.trim()
      : `Set ${activeSet.setNumber} (${newScoreA}-${newScoreB}): Point to ${scoringTeam?.name || 'Team'} — ${action} ${playerText}`.trim();

    recordMatchEvent(currentMatch.id, {
      eventType: 'POINT',
      teamId: teamId || '',
      playerName: selectedPlayer || undefined,
      minute: currentMatch.events.length + 1,
      description: desc,
    });

    setCustomCommentary('');
  };

  const handleScoreAdjust = async (team: 'HOME' | 'AWAY', delta: number) => {
    if (isMatchComplete) return;

    const newScoreA = team === 'HOME' ? Math.max(0, activeSet.scoreA + delta) : activeSet.scoreA;
    const newScoreB = team === 'AWAY' ? Math.max(0, activeSet.scoreB + delta) : activeSet.scoreB;

    const updatedSets = currentSets.map((s) => {
      if (s.setNumber === activeSet.setNumber) {
        return {
          ...s,
          scoreA: newScoreA,
          scoreB: newScoreB,
        };
      }
      return s;
    });

    await updateMatchSets(currentMatch.id, updatedSets, activeSet.setNumber);
  };

  // Conclude the current set
  const handleConcludeSet = async () => {
    const isDraw = activeSet.scoreA === 25 && activeSet.scoreB === 25;

    if (!isDraw && activeSet.scoreA === activeSet.scoreB) {
      alert('Set cannot conclude in a tie. One team must win the set by 2 points (or reach 25).');
      return;
    }

    const setWinnerId = isDraw ? 'DRAW' : (activeSet.scoreA > activeSet.scoreB ? currentMatch.homeTeamId : currentMatch.awayTeamId);

    if (!setWinnerId && !isDraw) {
      alert('Valid set winner could not be resolved.');
      return;
    }

    const updatedSets: SetScore[] = currentSets.map((s) => {
      if (s.setNumber === activeSet.setNumber) {
        return {
          ...s,
          winnerId: setWinnerId,
          status: 'COMPLETED' as const,
        };
      }
      return s;
    });

    // Check if a team has now won 2 sets
    const updatedSetsWonA = updatedSets.filter((s) => s.status === 'COMPLETED' && s.winnerId === currentMatch.homeTeamId).length;
    const updatedSetsWonB = updatedSets.filter((s) => s.status === 'COMPLETED' && s.winnerId === currentMatch.awayTeamId).length;

    if (updatedSetsWonA >= 2 || updatedSetsWonB >= 2 || updatedSets.length >= 3) {
      // Match won! (2-0 or 2-1) or all 3 sets completed
      await updateMatchSets(currentMatch.id, updatedSets, activeSet.setNumber);
      soundEffects.playCelebration();
      return;
    }

    // Otherwise, create/activate the next set if fewer than 3 sets
    if (updatedSets.length < 3) {
      const nextSetNumber = updatedSets.length + 1;
      const nextSet: SetScore = {
        setNumber: nextSetNumber,
        scoreA: 0,
        scoreB: 0,
        status: 'LIVE',
      };
      const finalSets = [...updatedSets, nextSet];
      await updateMatchSets(currentMatch.id, finalSets, nextSetNumber);
      setActiveSetNum(nextSetNumber);
  
    } else {
      await updateMatchSets(currentMatch.id, updatedSets, activeSet.setNumber);
    }
  };

  // Call official timeout (2 timeouts per team per set, 3 min each)
  const handleCallTimeout = async (teamId: string, teamName: string) => {
    if (isMatchComplete) return;

    try {
      await recordMatchTimeout(currentMatch.id, {
        setNumber: activeSet.setNumber,
        teamId,
      });

      recordMatchEvent(currentMatch.id, {
        eventType: 'TIMEOUT',
        teamId,
        minute: currentMatch.events.length + 1,
        description: `Official 3-Minute Timeout called by ${teamName} in Set ${activeSet.setNumber}`,
      });

  
    } catch (err: any) {
      alert(err.message || 'Could not record timeout.');
    }
  };

  // Open substitution modal for a team
  const handleOpenSubModal = (teamId: string) => {
    setSubTeamId(teamId);
    setOutgoingPlayerId('');
    setIncomingPlayerId('');
    setSubReason('NORMAL');
    setSubError(null);
    setIsSubModalOpen(true);
  };

  // Submit substitution
  const handleConfirmSubstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError(null);

    if (!outgoingPlayerId || !incomingPlayerId) {
      setSubError('Both outgoing and incoming players must be selected.');
      return;
    }

    if (outgoingPlayerId === incomingPlayerId) {
      setSubError('Outgoing and incoming player must be distinct.');
      return;
    }

    try {
      await recordMatchSubstitution(currentMatch.id, {
        setNumber: activeSet.setNumber,
        teamId: subTeamId,
        outgoingPlayerId,
        incomingPlayerId,
        reason: subReason,
      });

      const team = subTeamId === currentMatch.homeTeamId ? homeTeam : awayTeam;
      const outP = getPlayerDisplay(outgoingPlayerId, team, subTeamId === currentMatch.homeTeamId);
      const inP = getPlayerDisplay(incomingPlayerId, team, subTeamId === currentMatch.homeTeamId);

      recordMatchEvent(currentMatch.id, {
        eventType: 'SUBSTITUTION',
        teamId: subTeamId,
        minute: currentMatch.events.length + 1,
        description: `Substitution (${subReason}) for ${team?.name || 'Team'}: ${inP.name} (#${inP.jerseyNumber}) in for ${outP.name} (#${outP.jerseyNumber}) in Set ${activeSet.setNumber}`,
      });

  
      setIsSubModalOpen(false);
    } catch (err: any) {
      setSubError(err.message || 'Substitution rejected.');
    }
  };

  // Complete match and advance winner
  const handleEndMatch = () => {
    if (!hasMatchWinner) {
      alert('Cannot conclude match: One team must reach 2 set wins in best-of-3 format.');
      return;
    }

    const winnerName = setsWonA >= 2 ? homeTeam?.name : awayTeam?.name;
    const finalScoreA = setsWonA;
    const finalScoreB = setsWonB;

    if (window.confirm(`Confirm match conclusion? Winner: ${winnerName} (${finalScoreA} - ${finalScoreB} in sets). Standings and bracket qualifiers will update automatically.`)) {
      completeMatch(currentMatch.id, {
        scoreA: finalScoreA,
        scoreB: finalScoreB,
        sets: currentSets,
      });
      soundEffects.playCelebration();
    }
  };

  const actionTags = [
    { label: 'Smash / Kill', icon: '💥' },
    { label: 'Service Ace', icon: '🎯' },
    { label: 'Service Fault', icon: '⚠️' },
    { label: 'Touch Out', icon: '🖐️' },
    { label: 'Block Point', icon: '🛡️' },
    { label: 'Line Fault', icon: '🚫' },
    { label: 'Unforced Error', icon: '❌' },
  ];

  const handlePostCommentary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommentary.trim()) return;

    recordMatchEvent(currentMatch.id, {
      eventType: 'COMMENTARY',
      teamId: currentMatch.homeTeamId || '',
      minute: currentMatch.events.length + 1,
      description: customCommentary.trim(),
    });

    setCustomCommentary('');
  };

  return (
    <div className="space-y-6">
      {/* Top Fixture Switcher Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-wider text-sport-navy">
            Throwball Live Scoring Studio (Best of 3 Sets • 15 Pts)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 font-semibold">Active Fixture:</label>
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
                  {m.matchCode ? `[${m.matchCode}] ` : ''}{m.roundName}: {h?.shortName || 'TBD'} vs {a?.shortName || 'TBD'} ({m.status})
                </option>
              );
            })}
          </select>

          <button
            onClick={() => setIsLineupModalOpen(true)}
            className="px-3 py-1.5 bg-sport-navy hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Users className="w-3.5 h-3.5 text-sport-orange" />
            <span>Lineups (6+2)</span>
          </button>
        </div>
      </div>

      {/* Main Score Console */}
      <div className="bg-gradient-to-br from-sport-midnight via-slate-900 to-sport-navy text-white p-5 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-sport-orange/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Status Bar: Set Selector & Audio Whistle */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className={`text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                isMatchComplete
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isMatchComplete ? 'bg-slate-400' : 'bg-red-500'}`}></span>
              {isMatchComplete ? 'MATCH CONCLUDED' : currentMatch.status}
            </span>

            {/* Set Tabs (Best of 3 Sets) */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {currentSets.map((s) => (
                <button
                  key={s.setNumber}
                  onClick={() => setActiveSetNum(s.setNumber)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeSet.setNumber === s.setNumber
                      ? 'bg-sport-orange text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Set {s.setNumber}</span>
                  {s.status === 'COMPLETED' ? (
                    <span className="text-[10px] font-mono text-emerald-300">
                      ({s.scoreA}-{s.scoreB})
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono opacity-80">
                      ({s.scoreA}-{s.scoreB})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Overall Match Sets Won Display */}
            <div className="bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-bold flex items-center gap-2">
              <span className="text-slate-400">Sets Won:</span>
              <span className="font-mono text-amber-300 font-extrabold">
                {homeTeam?.shortName || 'H'} {setsWonA} — {setsWonB} {awayTeam?.shortName || 'A'}
              </span>
            </div>

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
                disabled={isMatchComplete || activeSet.status === 'COMPLETED'}
                onClick={() => handleScoreAdjust('HOME', -1)}
                title="Undo point"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-400 hover:text-white font-bold transition flex items-center justify-center cursor-pointer text-sm"
              >
                -1
              </button>
              <button
                disabled={isMatchComplete || activeSet.status === 'COMPLETED'}
                onClick={() => handleScorePoint('HOME')}
                className="px-5 py-2.5 rounded-xl bg-sport-orange hover:bg-orange-600 disabled:opacity-40 text-white font-extrabold transition flex items-center justify-center shadow-glow-orange cursor-pointer text-xs sm:text-sm active:scale-95"
              >
                +1 Point {homeTeam?.shortName}
              </button>
            </div>

            {/* Home Timeouts & Subs for this Set */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 pt-1">
              <button
                disabled={isMatchComplete || timeoutsHomeCount >= 2}
                onClick={() => handleCallTimeout(currentMatch.homeTeamId || '', homeTeam?.name || 'Home')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                  timeoutsHomeCount >= 2
                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 cursor-pointer'
                }`}
                title="2 timeouts per set (3 mins each)"
              >
                <Timer className="w-3 h-3" />
                <span>Timeout ({timeoutsHomeCount}/2)</span>
              </button>

              <button
                disabled={isMatchComplete || subsHomeCount >= 3}
                onClick={() => handleOpenSubModal(currentMatch.homeTeamId || '')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                  subsHomeCount >= 3
                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-blue-300 border-slate-700 cursor-pointer'
                }`}
                title="Max 3 substitutions per set"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Sub ({subsHomeCount}/3)</span>
              </button>
            </div>
          </div>

          {/* Large Center Scorecard */}
          <div className="md:col-span-1 text-center">
            <div className="inline-block bg-slate-950/95 px-6 py-4 rounded-3xl border border-slate-700/80 shadow-2xl">
              <div className="text-5xl sm:text-6xl font-black text-amber-300 tracking-tight font-mono">
                {activeSet.scoreA} : {activeSet.scoreB}
              </div>
              <div className="text-[11px] font-extrabold text-sport-orange uppercase tracking-wider mt-1">
                SET {activeSet.setNumber} {activeSet.status === 'COMPLETED' ? '(DONE)' : '(15 PTS)'}
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
                disabled={isMatchComplete || activeSet.status === 'COMPLETED'}
                onClick={() => handleScorePoint('AWAY')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-extrabold transition flex items-center justify-center shadow-lg cursor-pointer text-xs sm:text-sm active:scale-95"
              >
                +1 Point {awayTeam?.shortName}
              </button>
              <button
                disabled={isMatchComplete || activeSet.status === 'COMPLETED'}
                onClick={() => handleScoreAdjust('AWAY', -1)}
                title="Undo point"
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-400 hover:text-white font-bold transition flex items-center justify-center cursor-pointer text-sm"
              >
                -1
              </button>
            </div>

            {/* Away Timeouts & Subs for this Set */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                disabled={isMatchComplete || timeoutsAwayCount >= 2}
                onClick={() => handleCallTimeout(currentMatch.awayTeamId || '', awayTeam?.name || 'Away')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                  timeoutsAwayCount >= 2
                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 cursor-pointer'
                }`}
                title="2 timeouts per set (3 mins each)"
              >
                <Timer className="w-3 h-3" />
                <span>Timeout ({timeoutsAwayCount}/2)</span>
              </button>

              <button
                disabled={isMatchComplete || subsAwayCount >= 3}
                onClick={() => handleOpenSubModal(currentMatch.awayTeamId || '')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                  subsAwayCount >= 3
                    ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-blue-300 border-slate-700 cursor-pointer'
                }`}
                title="Max 3 substitutions per set"
              >
                <ArrowLeftRight className="w-3 h-3" />
                <span>Sub ({subsAwayCount}/3)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Set Point & Conclude Set Action Bar */}
        {activeSet.status === 'LIVE' && isSetPointReached(activeSet.scoreA, activeSet.scoreB) && (
          <div className="relative z-10 my-3 p-3.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>
                {activeSet.scoreA === 25 && activeSet.scoreB === 25 ? (
                  <strong className="text-white">25-25 Limit Reached! Set Drawn.</strong>
                ) : (
                  <>
                    Set Point Reached! Winner:{' '}
                    <strong className="text-white">
                      {activeSet.scoreA > activeSet.scoreB ? homeTeam?.name : awayTeam?.name} ({activeSet.scoreA}–{activeSet.scoreB})
                    </strong>
                  </>
                )}
              </span>
            </div>

            <button
              onClick={handleConcludeSet}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95"
            >
              Conclude Set {activeSet.setNumber} →
            </button>
          </div>
        )}

        {/* Ball-By-Ball Point Tagging Bar */}
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

          {/* Player Attribution */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-400 font-semibold">Attribute to Player (Optional):</span>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="bg-slate-900 text-xs font-bold text-white px-3 py-1.5 rounded-xl border border-slate-700 outline-none cursor-pointer max-w-xs"
            >
              <option value="">No player tagged</option>
              {currentMatch.lineupHome?.startingPlayerIds ? (
                <optgroup label={`${homeTeam?.name || 'Home'} — Starting 6`}>
                  {currentMatch.lineupHome.startingPlayerIds.map((id) => {
                    const p = getPlayerDisplay(id, homeTeam, true);
                    return (
                      <option key={p.id} value={`${p.name} (#${p.jerseyNumber})`}>
                        #{p.jerseyNumber} {p.name}
                      </option>
                    );
                  })}
                </optgroup>
              ) : (
                <optgroup label={`${homeTeam?.name || 'Home'} Squad`}>
                  {homeTeam?.players.map((p) => (
                    <option key={p.id} value={`${p.name} (#${p.jerseyNumber})`}>
                      #{p.jerseyNumber} {p.name}
                    </option>
                  ))}
                </optgroup>
              )}

              {currentMatch.lineupAway?.startingPlayerIds ? (
                <optgroup label={`${awayTeam?.name || 'Away'} — Starting 6`}>
                  {currentMatch.lineupAway.startingPlayerIds.map((id) => {
                    const p = getPlayerDisplay(id, awayTeam, false);
                    return (
                      <option key={p.id} value={`${p.name} (#${p.jerseyNumber})`}>
                        #{p.jerseyNumber} {p.name}
                      </option>
                    );
                  })}
                </optgroup>
              ) : (
                <optgroup label={`${awayTeam?.name || 'Away'} Squad`}>
                  {awayTeam?.players.map((p) => (
                    <option key={p.id} value={`${p.name} (#${p.jerseyNumber})`}>
                      #{p.jerseyNumber} {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
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
        {!isMatchComplete && (
          <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              {hasMatchWinner ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Match ready to finalize: {matchWinnerTeam?.name} has won 2 sets!
                </span>
              ) : (
                <span>Best of 3 sets: First team to reach 2 set wins claims the match.</span>
              )}
            </div>

            <button
              onClick={handleEndMatch}
              disabled={!hasMatchWinner}
              className={`px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-2 active:scale-95 ${
                hasMatchWinner
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Conclude Match & Advance Winner</span>
            </button>
          </div>
        )}
      </div>

      {/* Official Match Lineups Section (Starting 6 + 2 Substitutes) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-sport-navy flex items-center gap-2">
              <Users className="w-4 h-4 text-sport-orange" />
              Official Match Lineups (6 on Court + 2 Substitutes)
              {locked && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" /> Locked ({currentMatch.status})
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500">
              Match-specific lineup configuration: Starting 6 and 2 available substitutes
            </p>
          </div>

          <button
            onClick={() => setIsLineupModalOpen(true)}
            className="px-4 py-2 bg-sport-orange hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-glow-orange active:scale-95"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{locked ? 'View Lineup Sheets' : 'Configure Match Lineup'}</span>
          </button>
        </div>

        {/* Side-by-Side Lineup Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Home Team Lineup */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-sport-navy flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: homeTeam?.color || '#f97316' }}
                />
                {homeTeam?.name || 'Home Team'} Lineup
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {currentMatch.lineupHome ? '✓ 6+2 Registered' : 'Pending Lineup'}
              </span>
            </div>

            {currentMatch.lineupHome ? (
              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                    Starting 6 (On Court):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentMatch.lineupHome.startingPlayerIds.map((id) => {
                      const p = getPlayerDisplay(id, homeTeam, true);
                      return (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]"
                        >
                          #{p.jerseyNumber} {p.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">
                    Substitutes (2 on Bench):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentMatch.lineupHome.substitutePlayerIds.map((id) => {
                      const p = getPlayerDisplay(id, homeTeam, true);
                      return (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-semibold text-[11px]"
                        >
                          #{p.jerseyNumber} {p.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 italic">
                Lineup not yet selected. Click 'Configure Match Lineup' to select the starting 6 and 2 substitutes.
              </div>
            )}
          </div>

          {/* Away Team Lineup */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-sport-navy flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: awayTeam?.color || '#2563eb' }}
                />
                {awayTeam?.name || 'Away Team'} Lineup
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {currentMatch.lineupAway ? '✓ 6+2 Registered' : 'Pending Lineup'}
              </span>
            </div>

            {currentMatch.lineupAway ? (
              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                    Starting 6 (On Court):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentMatch.lineupAway.startingPlayerIds.map((id) => {
                      const p = getPlayerDisplay(id, awayTeam, false);
                      return (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]"
                        >
                          #{p.jerseyNumber} {p.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">
                    Substitutes (2 on Bench):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentMatch.lineupAway.substitutePlayerIds.map((id) => {
                      const p = getPlayerDisplay(id, awayTeam, false);
                      return (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-semibold text-[11px]"
                        >
                          #{p.jerseyNumber} {p.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 italic">
                Lineup not yet selected. Click 'Configure Match Lineup' to select the starting 6 and 2 substitutes.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cricbuzz-Style Live Commentary Log Stream */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-sport-navy flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              Live Commentary & Event Feed ({currentMatch.events.length} Updates)
            </h4>
            <p className="text-xs text-slate-500">
              Real-time point, timeout, and substitution events broadcasted to spectators
            </p>
          </div>

          <form onSubmit={handlePostCommentary} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={customCommentary}
              onChange={(e) => setCustomCommentary(e.target.value)}
              placeholder="Add commentary note..."
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
            No points or events logged yet. Use the point buttons above to begin the live feed.
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

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                    evt.eventType === 'TIMEOUT'
                      ? 'bg-amber-100 text-amber-800'
                      : evt.eventType === 'SUBSTITUTION'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {evt.eventType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Lineup Selection Modal */}
      <MatchLineupModal
        match={currentMatch}
        isOpen={isLineupModalOpen}
        onClose={() => setIsLineupModalOpen(false)}
      />

      {/* Official Throwball Substitution Modal */}
      {isSubModalOpen && (() => {
        const isHome = subTeamId === currentMatch.homeTeamId;
        const team = isHome ? homeTeam : awayTeam;
        const lineup = isHome ? currentMatch.lineupHome : currentMatch.lineupAway;
        const starters = lineup?.startingPlayerIds || team?.players.slice(0, 6).map((p) => p.id) || [];
        const subs = lineup?.substitutePlayerIds || team?.players.slice(6, 8).map((p) => p.id) || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: team?.color || '#f97316' }}
                  >
                    {team?.shortName}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-sport-navy">
                      Record Substitution — Set {activeSet.setNumber}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Official Throwball Rule: Max 3 per set, 1 at a time
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSubModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {subError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{subError}</span>
                </div>
              )}

              <form onSubmit={handleConfirmSubstitution} className="space-y-4 text-xs">
                {/* Outgoing Player */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Outgoing Player (Court) *
                  </label>
                  <select
                    required
                    value={outgoingPlayerId}
                    onChange={(e) => setOutgoingPlayerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 outline-none focus:border-sport-orange"
                  >
                    <option value="">Select outgoing player...</option>
                    {starters.map((id) => {
                      const p = getPlayerDisplay(id, team, isHome);
                      return (
                        <option key={p.id} value={p.id}>
                          #{p.jerseyNumber} {p.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Incoming Player */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Incoming Player (Bench Substitute) *
                  </label>
                  <select
                    required
                    value={incomingPlayerId}
                    onChange={(e) => setIncomingPlayerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 outline-none focus:border-sport-orange"
                  >
                    <option value="">Select substitute...</option>
                    {subs.map((id) => {
                      const p = getPlayerDisplay(id, team, isHome);
                      return (
                        <option key={p.id} value={p.id}>
                          #{p.jerseyNumber} {p.name} (Sub)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Substitution Reason (Confirmed Rule)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSubReason('NORMAL')}
                      className={`p-2.5 rounded-xl border font-bold text-center transition cursor-pointer ${
                        subReason === 'NORMAL'
                          ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      NORMAL (Turn to Serve)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubReason('INJURY')}
                      className={`p-2.5 rounded-xl border font-bold text-center transition cursor-pointer ${
                        subReason === 'INJURY'
                          ? 'bg-rose-50 border-rose-600 text-rose-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      INJURY (Exception)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSubModalOpen(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-sport-orange hover:bg-orange-600 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer active:scale-95"
                  >
                    Confirm Substitution
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
