import React, { useState, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Match, Team, Player } from '../../types';
import { THROWBALL_ROSTER_RULES } from '../../domain/tournament/roster/rosterRules';
import { isLineupLocked } from '../../domain/tournament/roster/lineupValidation';
import {
  Users,
  Shield,
  Star,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  Save,
  X,
} from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';

interface MatchLineupModalProps {
  match: Match;
  isOpen: boolean;
  onClose: () => void;
}

export const MatchLineupModal: React.FC<MatchLineupModalProps> = ({
  match,
  isOpen,
  onClose,
}) => {
  const { activeTournament, saveMatchLineup, autoFillMatchLineup } = useTournament();

  const [activeTeamTab, setActiveTeamTab] = useState<'HOME' | 'AWAY'>('HOME');
  const [selectedStartersHome, setSelectedStartersHome] = useState<string[]>([]);
  const [selectedSubsHome, setSelectedSubsHome] = useState<string[]>([]);
  const [selectedStartersAway, setSelectedStartersAway] = useState<string[]>([]);
  const [selectedSubsAway, setSelectedSubsAway] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const homeTeam = activeTournament?.teams.find((t) => t.id === match.homeTeamId);
  const awayTeam = activeTournament?.teams.find((t) => t.id === match.awayTeamId);

  const locked = isLineupLocked(match.status);

  // Sync state with match data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (match.lineupHome) {
      setSelectedStartersHome(match.lineupHome.startingPlayerIds || []);
      setSelectedSubsHome(match.lineupHome.substitutePlayerIds || []);
    } else if (homeTeam && homeTeam.players.length === 8) {
      setSelectedStartersHome(homeTeam.players.slice(0, 6).map((p) => p.id));
      setSelectedSubsHome(homeTeam.players.slice(6, 8).map((p) => p.id));
    } else {
      setSelectedStartersHome([]);
      setSelectedSubsHome([]);
    }

    if (match.lineupAway) {
      setSelectedStartersAway(match.lineupAway.startingPlayerIds || []);
      setSelectedSubsAway(match.lineupAway.substitutePlayerIds || []);
    } else if (awayTeam && awayTeam.players.length === 8) {
      setSelectedStartersAway(awayTeam.players.slice(0, 6).map((p) => p.id));
      setSelectedSubsAway(awayTeam.players.slice(6, 8).map((p) => p.id));
    } else {
      setSelectedStartersAway([]);
      setSelectedSubsAway([]);
    }

    setErrorMsg(null);
    setSuccessMsg(null);
  }, [isOpen, match, homeTeam, awayTeam]);

  if (!isOpen || !activeTournament) return null;

  const currentTeam = activeTeamTab === 'HOME' ? homeTeam : awayTeam;
  const currentStarters = activeTeamTab === 'HOME' ? selectedStartersHome : selectedStartersAway;
  const currentSubs = activeTeamTab === 'HOME' ? selectedSubsHome : selectedSubsAway;

  const setStarters = (ids: string[]) => {
    if (activeTeamTab === 'HOME') setSelectedStartersHome(ids);
    else setSelectedStartersAway(ids);
  };

  const setSubs = (ids: string[]) => {
    if (activeTeamTab === 'HOME') setSelectedSubsHome(ids);
    else setSelectedSubsAway(ids);
  };

  const handleToggleStarter = (playerId: string) => {
    if (locked) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const isAlreadyStarter = currentStarters.includes(playerId);

    if (isAlreadyStarter) {
      // Toggle off starter -> move to subs if space, or remove
      setStarters(currentStarters.filter((id) => id !== playerId));
      if (!currentSubs.includes(playerId)) {
        setSubs([...currentSubs, playerId]);
      }
    } else {
      // Toggle on starter
      if (currentStarters.length >= 6) {
        setErrorMsg('Starting lineup already has 6 players. Uncheck a starter first.');
        return;
      }
      setStarters([...currentStarters, playerId]);
      setSubs(currentSubs.filter((id) => id !== playerId));
    }
  };

  const handleToggleSub = (playerId: string) => {
    if (locked) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const isAlreadySub = currentSubs.includes(playerId);

    if (isAlreadySub) {
      setSubs(currentSubs.filter((id) => id !== playerId));
      if (!currentStarters.includes(playerId) && currentStarters.length < 6) {
        setStarters([...currentStarters, playerId]);
      }
    } else {
      if (currentSubs.length >= 2) {
        setErrorMsg('Substitutes bench already has 2 players. Uncheck a substitute first.');
        return;
      }
      setSubs([...currentSubs, playerId]);
      setStarters(currentStarters.filter((id) => id !== playerId));
    }
  };

  const handleAutoFill = () => {
    if (locked || !currentTeam) return;
    if (currentTeam.players.length !== 8) {
      setErrorMsg(`Cannot auto-fill: ${currentTeam.name} has ${currentTeam.players.length} players, but 8 are required.`);
      return;
    }
    const starters = currentTeam.players.slice(0, 6).map((p) => p.id);
    const subs = currentTeam.players.slice(6, 8).map((p) => p.id);
    setStarters(starters);
    setSubs(subs);
    setErrorMsg(null);

  };

  const handleSaveLineup = async () => {
    if (locked || !currentTeam) return;

    if (currentStarters.length !== 6 || currentSubs.length !== 2) {
      setErrorMsg('Lineup must have exactly 6 starters and 2 substitutes.');
      return;
    }

    try {
      await saveMatchLineup(match.id, currentTeam.id, {
        startingPlayerIds: currentStarters,
        substitutePlayerIds: currentSubs,
      });
      setSuccessMsg(`Match lineup saved for ${currentTeam.name}.`);
      soundEffects.playCelebration();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save lineup.');
    }
  };

  const isCurrentLineupValid = currentStarters.length === 6 && currentSubs.length === 2;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-sport-navy text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sport-orange/20 text-sport-orange border border-sport-orange/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Official Match Lineup Selection
                {locked && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" /> Locked ({match.status})
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {match.roundName || 'Match'} • 6 Starters + 2 Substitutes Requirement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => {
              setActiveTeamTab('HOME');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTeamTab === 'HOME'
                ? 'border-b-2 border-sport-orange text-sport-navy bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: homeTeam?.color || '#f97316' }}
            />
            <span>{homeTeam?.name || 'Home Team'}</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100">
              {match.lineupHome ? '✓ Lineup Set' : 'Pending'}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTeamTab('AWAY');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTeamTab === 'AWAY'
                ? 'border-b-2 border-sport-orange text-sport-navy bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: awayTeam?.color || '#2563eb' }}
            />
            <span>{awayTeam?.name || 'Away Team'}</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100">
              {match.lineupAway ? '✓ Lineup Set' : 'Pending'}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Status Banners */}
          {locked ? (
            <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-2xl flex items-center gap-2.5 text-xs text-slate-700">
              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Match is {match.status}.</strong> Starting and substitute lineups are locked to preserve historical record integrity.
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-orange-50 border border-orange-200 rounded-2xl text-xs">
              <div className="flex items-center gap-2 text-sport-navy">
                <Sparkles className="w-4 h-4 text-sport-orange shrink-0" />
                <span>
                  Select <strong>6 Starters</strong> on court and <strong>2 Substitutes</strong> on the bench.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAutoFill}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-orange-100 border border-orange-300 text-sport-orange font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Fill 6+2</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Lineup Count Indicators */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-3 rounded-2xl border text-center transition ${
                currentStarters.length === 6
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider">Starting 6 (On Court)</div>
              <div className="text-xl font-black mt-0.5">{currentStarters.length} / 6</div>
            </div>

            <div
              className={`p-3 rounded-2xl border text-center transition ${
                currentSubs.length === 2
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider">Substitutes (Bench)</div>
              <div className="text-xl font-black mt-0.5">{currentSubs.length} / 2</div>
            </div>
          </div>

          {/* Players Roster Table */}
          {currentTeam ? (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Jersey</th>
                    <th className="py-2.5 px-3">Player Name</th>
                    <th className="py-2.5 px-3 text-center">Starting 6</th>
                    <th className="py-2.5 px-3 text-center">Substitute</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentTeam.players.map((p) => {
                    const isStarter = currentStarters.includes(p.id);
                    const isSub = currentSubs.includes(p.id);
                    const isCap = p.isCaptain || currentTeam.captainId === p.id;

                    return (
                      <tr
                        key={p.id}
                        className={`transition ${
                          isStarter
                            ? 'bg-emerald-50/40'
                            : isSub
                            ? 'bg-blue-50/40'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-black text-sport-orange">
                          #{p.jerseyNumber}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-sport-navy flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {isCap && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-100 text-amber-800 border border-amber-300">
                              CAP
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => handleToggleStarter(p.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                              isStarter
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            } ${locked ? 'cursor-not-allowed opacity-80' : ''}`}
                          >
                            {isStarter ? '✓ Starter' : 'Select'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => handleToggleSub(p.id)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                              isSub
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            } ${locked ? 'cursor-not-allowed opacity-80' : ''}`}
                          >
                            {isSub ? '✓ Sub' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs">
              No team selected or team not found.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isCurrentLineupValid ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Ready to Save (6 + 2 valid)
              </span>
            ) : (
              <span className="text-amber-600 font-semibold">
                Selection requirement: 6 starters + 2 substitutes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Close
            </button>
            {!locked && (
              <button
                disabled={!isCurrentLineupValid}
                onClick={handleSaveLineup}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                  isCurrentLineupValid
                    ? 'bg-sport-orange hover:bg-orange-600 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Lineup</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
