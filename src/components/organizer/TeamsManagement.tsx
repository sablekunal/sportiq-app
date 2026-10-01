import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Team, Player } from '../../types';
import {
  Users,
  Plus,
  Trash2,
  Shield,
  UserPlus,
  Sparkles,
  Check,
  Hash,
  Info,
  Award,
  Crown,
  AlertCircle,
  Edit2,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';
import {
  THROWBALL_ROSTER_RULES,
  validateTeamRoster,
  getRosterStatus,
  canRemoveOrReplacePlayer,
} from '../../domain/tournament/roster/rosterRules';
import type { RosterStatus } from '../../types';
import { initialTeamsData } from '../../data/initialTeams';

export const TeamsManagement: React.FC = () => {
  const {
    activeTournament,
    addTeamToTournament,
    updateTeamInTournament,
    removeTeamFromTournament,
    lockTeamRoster,
    domainMatches,
  } = useTournament();

  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState('#f97316');
  const [seed, setSeed] = useState(activeTournament ? activeTournament.teams.length + 1 : 1);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [withRegulationSquad, setWithRegulationSquad] = useState(true);
  const [newTeamInstitution, setNewTeamInstitution] = useState('');
  const [newTeamIsCaptainPlaying, setNewTeamIsCaptainPlaying] = useState(true);
  const [newTeamCaptainName, setNewTeamCaptainName] = useState('');

  // Selected team for player roster editing
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    activeTournament?.teams[0]?.id || null
  );

  // New Player Form State
  const [playerName, setPlayerName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState<number>(7);
  const [isNewCaptain, setIsNewCaptain] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Inline Player Edit State
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editJerseyNumber, setEditJerseyNumber] = useState<number>(1);
  const [editIsCaptain, setEditIsCaptain] = useState(false);

  // Team Profile Edit State
  const [isEditingTeamProfile, setIsEditingTeamProfile] = useState(false);
  const [editInstitution, setEditInstitution] = useState('');
  const [editIsCaptainPlaying, setEditIsCaptainPlaying] = useState(true);
  const [editExternalCaptain, setEditExternalCaptain] = useState('');
  if (!activeTournament) return null;

  const teams = activeTournament.teams;
  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];

  const hasPlayedMatches = (teamId: string): boolean => {
    if (!activeTournament) return false;
    return activeTournament.fixtures.some(
      (m) =>
        (m.homeTeamId === teamId || m.awayTeamId === teamId) &&
        (m.status === 'LIVE' || m.status === 'COMPLETED')
    );
  };

  const isCurrentTeamLocked = false; // user requested to remove the finalize lock

  // Helper to generate a regulation 12-player squad (6 starters + 6 substitutes spec)
  const generateRegulation12Squad = (teamShort: string): Player[] => {
    const timestamp = Date.now();
    return [
      { id: `p-${timestamp}-1`, name: `${teamShort} Captain`, jerseyNumber: 10, role: 'Captain (C)', isCaptain: true },
      { id: `p-${timestamp}-2`, name: `${teamShort} Player 2`, jerseyNumber: 7, role: 'Court Player' },
      { id: `p-${timestamp}-3`, name: `${teamShort} Setter`, jerseyNumber: 9, role: 'Court Player' },
      { id: `p-${timestamp}-4`, name: `${teamShort} Center`, jerseyNumber: 5, role: 'Court Player' },
      { id: `p-${timestamp}-5`, name: `${teamShort} Left Wing`, jerseyNumber: 2, role: 'Court Player' },
      { id: `p-${timestamp}-6`, name: `${teamShort} Right Wing`, jerseyNumber: 4, role: 'Court Player' },
      { id: `p-${timestamp}-7`, name: `${teamShort} Defender 1`, jerseyNumber: 8, role: 'Court Player' },
      { id: `p-${timestamp}-8`, name: `${teamShort} Defender 2`, jerseyNumber: 11, role: 'Court Player' },
      { id: `p-${timestamp}-9`, name: `${teamShort} Sub 1`, jerseyNumber: 12, role: 'Court Player' },
      { id: `p-${timestamp}-10`, name: `${teamShort} Sub 2`, jerseyNumber: 14, role: 'Court Player' },
      { id: `p-${timestamp}-11`, name: `${teamShort} Sub 3`, jerseyNumber: 16, role: 'Court Player' },
      { id: `p-${timestamp}-12`, name: `${teamShort} Sub 4`, jerseyNumber: 18, role: 'Court Player' },
    ];
  };

  const handleAddTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    const code = (shortName || teamName.slice(0, 3)).toUpperCase().trim().slice(0, 4);

    const squadPlayers = withRegulationSquad
      ? generateRegulation12Squad(code)
      : [
          {
            id: `p-${Date.now()}-1`,
            name: `${code} Captain`,
            jerseyNumber: 10,
            role: 'Captain (C)',
            isCaptain: true,
          },
        ];

    const initialStatus: RosterStatus = squadPlayers.length === 12 ? 'COMPLETE' : 'INCOMPLETE';
    const capPlayer = squadPlayers.find((p) => p.isCaptain);

    addTeamToTournament(activeTournament.id, {
      name: teamName.trim(),
      shortName: code,
      color,
      seed: Number(seed),
      groupId: selectedGroupId || undefined,
      players: squadPlayers,
      rosterStatus: initialStatus,
      isRosterLocked: false,
      captainId: newTeamIsCaptainPlaying ? capPlayer?.id : undefined,
      captainName: newTeamIsCaptainPlaying ? capPlayer?.name : newTeamCaptainName.trim(),
      isCaptainPlaying: newTeamIsCaptainPlaying,
      institution: newTeamInstitution.trim(),
    });

    setTeamName('');
    setShortName('');
    setNewTeamInstitution('');
    setNewTeamCaptainName('');
    setNewTeamIsCaptainPlaying(true);
    setIsAddingTeam(false);
    soundEffects.playCelebration();
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    setPlayerError(null);
    if (!playerName.trim() || !currentTeam || !activeTournament) return;

    if (currentTeam.players.length >= 12) {
      setPlayerError('Throwball competition limit reached: maximum 12 registered players allowed per team.');
      return;
    }

    const num = Number(jerseyNumber);
    if (num < 1 || num > 99) {
      setPlayerError('Jersey number must be between 1 and 99.');
      return;
    }

    if (currentTeam.players.some((p) => p.jerseyNumber === num)) {
      setPlayerError(`Jersey #${num} is already worn by another player on ${currentTeam.name}.`);
      return;
    }

    const shouldBeCaptain = isNewCaptain || currentTeam.players.length === 0;
    const newPlayer: Player = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: playerName.trim(),
      jerseyNumber: num,
      role: shouldBeCaptain ? 'Captain (C)' : 'Court Player',
      isCaptain: shouldBeCaptain,
    };

    let updatedPlayers: Player[];
    let newCaptainId = currentTeam.captainId;
    let newCaptainName = currentTeam.captainName;

    if (shouldBeCaptain) {
      newCaptainId = newPlayer.id;
      newCaptainName = newPlayer.name;
      updatedPlayers = [
        ...currentTeam.players.map((p) => ({
          ...p,
          isCaptain: false,
          role: p.role === 'Captain (C)' ? 'Court Player' : (p.role || 'Court Player'),
        })),
        newPlayer,
      ];
    } else {
      updatedPlayers = [...currentTeam.players, newPlayer];
    }

    const newStatus: RosterStatus = (updatedPlayers.length >= 6 && updatedPlayers.length <= 12) ? 'COMPLETE' : 'INCOMPLETE';
    updateTeamInTournament(activeTournament.id, currentTeam.id, {
      players: updatedPlayers,
      rosterStatus: newStatus,
      captainId: newCaptainId || null,
      captainName: newCaptainName || null,
    });

    setPlayerName('');
    setIsNewCaptain(false);
    setJerseyNumber((prev) => (prev < 99 ? prev + 1 : 1));

  };

  const handleRemovePlayer = (playerId: string) => {
    if (!currentTeam || !activeTournament) return;
    if (isCurrentTeamLocked) {
      alert('Cannot remove player: this team roster is locked or has active/completed competition matches.');
      return;
    }

    const allMatches = domainMatches.length > 0 ? domainMatches : activeTournament.fixtures;
    const check = canRemoveOrReplacePlayer(currentTeam, playerId, allMatches);
    if (!check.allowed) {
      alert(`Cannot remove player: ${check.reason}`);
      return;
    }

    const updatedPlayers = currentTeam.players.filter((item) => item.id !== playerId);
    const newStatus: RosterStatus = (updatedPlayers.length >= 6 && updatedPlayers.length <= 12) ? 'COMPLETE' : 'INCOMPLETE';
    const remainingCap = updatedPlayers.find((p) => p.isCaptain && p.id !== playerId);

    updateTeamInTournament(activeTournament.id, currentTeam.id, {
      players: updatedPlayers,
      isRosterLocked: false,
      rosterStatus: newStatus,
      captainId: (currentTeam.captainId === playerId ? remainingCap?.id : currentTeam.captainId) || null,
      captainName: (currentTeam.captainId === playerId ? remainingCap?.name : currentTeam.captainName) || null,
    });

  };

  const handleStartEditPlayer = (p: Player) => {
    setEditingPlayerId(p.id);
    setEditPlayerName(p.name);
    setEditJerseyNumber(p.jerseyNumber ?? 1);
    setEditIsCaptain(Boolean(p.isCaptain || currentTeam?.captainId === p.id));
    setPlayerError(null);
  };

  const handleSavePlayerEdit = (playerId: string) => {
    if (!currentTeam || !activeTournament) return;
    if (!editPlayerName.trim()) {
      setPlayerError('Player name cannot be empty.');
      return;
    }
    const num = Number(editJerseyNumber);
    if (num < 1 || num > 99) {
      setPlayerError('Jersey number must be between 1 and 99.');
      return;
    }
    const duplicate = currentTeam.players.some(
      (p) => p.id !== playerId && p.jerseyNumber === num
    );
    if (duplicate) {
      setPlayerError(`Jersey #${num} is already used by another player on this team.`);
      return;
    }

    let newCaptainId = currentTeam.captainId;
    let newCaptainName = currentTeam.captainName;

    if (editIsCaptain) {
      newCaptainId = playerId;
      newCaptainName = editPlayerName.trim();
    } else if (currentTeam.captainId === playerId) {
      newCaptainId = null as any;
      newCaptainName = null as any;
    }

    const updatedPlayers = currentTeam.players.map((p) => {
      if (p.id === playerId) {
        return {
          ...p,
          name: editPlayerName.trim(),
          jerseyNumber: num,
          isCaptain: editIsCaptain,
          role: editIsCaptain ? 'Captain (C)' : 'Court Player',
        };
      }
      if (editIsCaptain && (p.isCaptain || p.id === currentTeam.captainId)) {
        return {
          ...p,
          isCaptain: false,
          role: 'Court Player',
        };
      }
      return p;
    });

    updateTeamInTournament(activeTournament.id, currentTeam.id, {
      players: updatedPlayers,
      captainId: newCaptainId || null,
      captainName: newCaptainName || null,
    });
    setEditingPlayerId(null);
    setPlayerError(null);
  };

  const handleToggleCaptain = (playerId: string) => {
    if (!currentTeam || !activeTournament) return;
    const isCurrentlyCap = currentTeam.captainId === playerId || currentTeam.players.find(p => p.id === playerId)?.isCaptain;
    const newCaptainId = isCurrentlyCap ? undefined : playerId;
    const capPlayer = currentTeam.players.find(p => p.id === newCaptainId);

    const updatedPlayers = currentTeam.players.map((p) => ({
      ...p,
      isCaptain: p.id === newCaptainId,
      role: p.id === newCaptainId ? 'Captain (C)' : 'Court Player',
    }));

    updateTeamInTournament(activeTournament.id, currentTeam.id, {
      captainId: newCaptainId || null,
      captainName: capPlayer ? capPlayer.name : null,
      players: updatedPlayers,
    });
  };

  const openTeamEdit = () => {
    if (!currentTeam) return;
    setEditInstitution(currentTeam.institution || '');
    setEditIsCaptainPlaying(currentTeam.isCaptainPlaying !== false);
    setEditExternalCaptain(currentTeam.isCaptainPlaying === false ? currentTeam.captainName || '' : '');
    setIsEditingTeamProfile(true);
  };

  const saveTeamEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam) return;
    
    updateTeamInTournament(activeTournament.id, currentTeam.id, {
      institution: editInstitution.trim(),
      isCaptainPlaying: editIsCaptainPlaying,
      captainName: editIsCaptainPlaying ? (currentTeam.players.find(p => p.id === currentTeam.captainId)?.name || null) : editExternalCaptain.trim(),
      captainId: editIsCaptainPlaying ? (currentTeam.captainId || null) : null,
    });
    setIsEditingTeamProfile(false);
  };

  const handlePopulateSquad = (team: Team) => {
    if (isCurrentTeamLocked) {
      alert('Cannot modify squad: this team has active or completed competition matches.');
      return;
    }
    if (
      team.players.length > 0 &&
      !window.confirm(`Replace current roster for ${team.name} with regulation 12-player squad?`)
    ) {
      return;
    }
    const newPlayers = generateRegulation12Squad(team.shortName);
    const capPlayer = newPlayers.find((p) => p.isCaptain);
    updateTeamInTournament(activeTournament.id, team.id, {
      players: newPlayers,
      captainId: capPlayer?.id || null,
      captainName: capPlayer?.name || null,
      rosterStatus: 'COMPLETE',
    });
    soundEffects.playCelebration();
  };

  // Validation report for current team
  const currentValidation = currentTeam
    ? validateTeamRoster(currentTeam.players, THROWBALL_ROSTER_RULES)
    : { isValid: false, errors: [] };

  return (
    <div className="space-y-6">


      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-sport-navy flex items-center gap-2">
            <Users className="w-5 h-5 text-sport-orange" />
            Tournament Teams & Squad Rosters
          </h3>
          <p className="text-xs text-slate-500">
            Dynamic team registration: Add, edit, remove players. Teams reach 12 players to finalize ({teams.length} Teams Registered)
          </p>
        </div>

        {teams.length < 16 && (
          <button
            onClick={() => setIsAddingTeam(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sport-orange hover:bg-orange-600 text-white font-bold text-xs shadow-glow-orange transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Team</span>
          </button>
        )}
      </div>

      {/* Add Team Modal */}
      {isAddingTeam && (
        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-sport-orange/30 shadow-md animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-sport-navy">Register New Tournament Team</h4>
            <button
              onClick={() => setIsAddingTeam(false)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAddTeamSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Team Full Name * (3 - 25 characters)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bangalore Thunderbolts"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  3-Letter Code * (e.g. BLR)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="BLR"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value.toUpperCase())}
                  className="w-full text-xs font-bold font-mono px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange bg-white uppercase text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Jersey Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer bg-white"
                  />
                  <span className="text-xs font-mono font-bold text-slate-600">{color}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Institution / Parish
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. St. Peter's Church"
                    value={newTeamInstitution}
                    onChange={(e) => setNewTeamInstitution(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Captain Configuration
                  </label>
                  <select
                    value={newTeamIsCaptainPlaying ? 'yes' : 'no'}
                    onChange={(e) => setNewTeamIsCaptainPlaying(e.target.value === 'yes')}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange bg-white mb-2 cursor-pointer"
                  >
                    <option value="yes">Captain plays in team (Select from Roster)</option>
                    <option value="no">External Captain / Manager</option>
                  </select>
                  {!newTeamIsCaptainPlaying && (
                    <input
                      type="text"
                      placeholder="Enter Captain Name"
                      value={newTeamCaptainName}
                      onChange={(e) => setNewTeamCaptainName(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange bg-white"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Regulation 8-Player Squad Auto-Populate Checkbox */}
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-sport-navy">
                <input
                  type="checkbox"
                  checked={withRegulationSquad}
                  onChange={(e) => setWithRegulationSquad(e.target.checked)}
                  className="rounded text-sport-orange focus:ring-sport-orange w-4 h-4 cursor-pointer"
                />
                <span>Auto-generate Regulation 12-Player Squad (6 starters + 6 substitutes spec with unique jerseys)</span>
              </label>
              <span className="text-[10px] uppercase font-black text-sport-orange px-2 py-0.5 rounded bg-orange-100">
                Recommended
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingTeam(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-sport-orange hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-glow-orange cursor-pointer transition active:scale-95"
              >
                Register Team
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Grid: Teams List & Selected Team Roster Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List (Left Deck) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            <span>Registered Teams ({teams.length})</span>
            <span>Roster Status</span>
          </div>

          {teams.map((team) => {
            const isSelected = currentTeam?.id === team.id;
            const validation = validateTeamRoster(team.players, THROWBALL_ROSTER_RULES);
            const teamLocked = false; // User requested to remove the finalize lock from teams
            const rosterStatus = getRosterStatus(team);

            return (
              <div
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'border-sport-orange bg-orange-50/50 shadow-md ring-1 ring-sport-orange'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-sm"
                    style={{ backgroundColor: team.color || '#f97316' }}
                  >
                    {team.shortName}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-sport-navy flex items-center gap-1.5">
                      {team.name}
                      {teamLocked && (
                        <span title="Roster finalized / locked">
                          <Lock className="w-3 h-3 text-purple-600" />
                        </span>
                      )}
                    </h4>
                    <div className="text-[11px] text-slate-500 flex flex-col gap-0.5 mt-0.5">
                      <div className="flex items-center gap-2">
                        <span>Seed #{team.seed || '-'}</span>
                        <span>•</span>
                        {rosterStatus === 'LOCKED' ? (
                          <span className="text-purple-700 font-extrabold flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-purple-50 border border-purple-200">
                            <Lock className="w-2.5 h-2.5" /> LOCKED (12/12)
                          </span>
                        ) : rosterStatus === 'COMPLETE' ? (
                          <span className="text-emerald-700 font-extrabold text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200">
                            COMPLETE (12/12)
                          </span>
                        ) : (
                          <span className="text-amber-700 font-extrabold text-[10px] px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200">
                            INCOMPLETE ({team.players.length}/12)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-600 flex items-center gap-1">
                        <span className="text-slate-400">Captain:</span>
                        <strong className="text-amber-800 font-semibold truncate">
                          {team.captainName || team.players.find((p) => p.isCaptain || team.captainId === p.id)?.name || 'Not assigned'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={teamLocked}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (teamLocked) {
                        alert('Cannot delete team: roster is locked or matches have been played.');
                        return;
                      }
                      if (window.confirm(`Delete team "${team.name}"?`)) {
                        removeTeamFromTournament(activeTournament.id, team.id);
                      }
                    }}
                    className={`p-1.5 rounded-lg transition ${
                      teamLocked
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer'
                    }`}
                    title={teamLocked ? 'Locked (roster finalized)' : 'Remove Team'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Team Roster Management (Right Deck) */}
        <div className="lg:col-span-2">
          {currentTeam ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              {/* Team Profile Banner */}
              {isEditingTeamProfile ? (
                <form onSubmit={saveTeamEdit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2">Edit Team Details</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Institution / Parish</label>
                      <input
                        type="text"
                        value={editInstitution}
                        onChange={(e) => setEditInstitution(e.target.value)}
                        placeholder="e.g. St. Peter's Church"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-sport-orange focus:ring-1 focus:ring-sport-orange outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-200 pt-3">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Team Captain Configuration</label>
                    <div className="flex items-center gap-4 mb-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          checked={editIsCaptainPlaying}
                          onChange={() => setEditIsCaptainPlaying(true)}
                          className="w-4 h-4 text-sport-orange focus:ring-sport-orange"
                        />
                        <span className="font-semibold text-slate-700">Captain is in the team roster</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          checked={!editIsCaptainPlaying}
                          onChange={() => setEditIsCaptainPlaying(false)}
                          className="w-4 h-4 text-sport-orange focus:ring-sport-orange"
                        />
                        <span className="font-semibold text-slate-700">Captain is external (Manager)</span>
                      </label>
                    </div>

                    {!editIsCaptainPlaying ? (
                      <div>
                        <input
                          type="text"
                          value={editExternalCaptain}
                          onChange={(e) => setEditExternalCaptain(e.target.value)}
                          placeholder="Enter External Captain Name"
                          className="w-full sm:w-1/2 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-sport-orange focus:ring-1 focus:ring-sport-orange outline-none"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 bg-amber-50 p-2 rounded-lg border border-amber-100">
                        Select the captain directly from the <strong>Roster table</strong> below using the "Captain" checkboxes.
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingTeamProfile(false)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-sport-navy hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Save Details
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md"
                    style={{ backgroundColor: currentTeam.color || '#f97316' }}
                  >
                    {currentTeam.shortName}
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-sport-navy flex items-center gap-2">
                      {currentTeam.name}
                      {isCurrentTeamLocked && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-purple-600" /> Roster Finalized (Locked)
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                      <span>Code: <strong className="font-mono text-sport-orange">{currentTeam.shortName}</strong></span>
                      <span>•</span>
                      <span>Seed #{currentTeam.seed || 'Unseeded'}</span>
                      <span>•</span>
                      <span>
                        Captain:{' '}
                        <strong className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                          ★ {currentTeam.captainName || currentTeam.players.find((p) => p.isCaptain || currentTeam.captainId === p.id)?.name || 'Not Designated'}
                        </strong>
                      </span>
                      {currentTeam.institution && (
                        <>
                          <span>•</span>
                          <span>From: <strong className="text-sport-navy">{currentTeam.institution}</strong></span>
                        </>
                      )}
                      <span>•</span>
                      <span>Status: <strong className="text-sport-navy">{getRosterStatus(currentTeam)}</strong></span>
                    </p>
                  </div>
                </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={openTeamEdit}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      title="Edit Team Details (Institution, Captain)"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  <button
                    disabled={isCurrentTeamLocked}
                    onClick={() => handlePopulateSquad(currentTeam)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isCurrentTeamLocked
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                    }`}
                    title="Load standard 12-player Throwball roster"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sport-orange" />
                    <span>Load 12-Player Preset</span>
                  </button>

                  <span
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 ${
                      currentValidation.isValid
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {currentValidation.isValid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{currentTeam.players.length} / 12 (Min 6 met)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>{currentTeam.players.length} / 12 (Min 6 Req)</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
              )}

              {/* Roster Status & Validation Messages */}
              {!currentValidation.isValid && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Roster Requirement Notice:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] pl-1 space-y-0.5 text-amber-700">
                    {currentValidation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error banner if local form conflict */}
              {playerError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{playerError}</span>
                </div>
              )}

              {/* Add Individual Player Input */}
              {currentTeam.players.length < 12 && !isCurrentTeamLocked && (
                <form
                  onSubmit={handleAddPlayer}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3"
                >
                  <div className="flex-1 min-w-[160px]">
                    <input
                      type="text"
                      required
                      placeholder="Player Name (e.g. Ananya Hegde)"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-sport-orange"
                    />
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      placeholder="Jersey #"
                      value={jerseyNumber}
                      onChange={(e) => setJerseyNumber(Number(e.target.value))}
                      className="w-full text-xs font-black font-mono px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-sport-orange text-center"
                    />
                  </div>

                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg px-3 py-2 cursor-pointer hover:border-amber-400 select-none">
                    <input
                      type="checkbox"
                      checked={isNewCaptain}
                      onChange={(e) => setIsNewCaptain(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <span className="flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-600" />
                      <span>Set as Captain</span>
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-sport-navy hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Player</span>
                  </button>
                </form>
              )}

              {/* Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Jersey #</th>
                      <th className="py-2.5 px-3">Player Full Name</th>
                      <th className="py-2.5 px-3 text-center">Captain (Select)</th>
                      <th className="py-2.5 px-3 text-center">Match Eligibility</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {currentTeam.players.map((p, idx) => {
                      const isEditing = editingPlayerId === p.id;
                      const isCap = p.isCaptain || currentTeam.captainId === p.id;

                      return (
                        <tr key={p.id || idx} className={`hover:bg-slate-50/80 transition ${isCap ? 'bg-amber-50/25' : ''}`}>
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={editJerseyNumber}
                                onChange={(e) => setEditJerseyNumber(Number(e.target.value))}
                                className="w-16 font-mono font-black text-sport-orange text-xs px-2 py-1 border rounded bg-white"
                              />
                            ) : (
                              <span className="font-mono font-black text-sport-orange text-sm">
                                #{p.jerseyNumber ?? idx + 1}
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editPlayerName}
                                onChange={(e) => setEditPlayerName(e.target.value)}
                                className="w-full text-xs font-bold text-sport-navy px-2 py-1 border rounded bg-white"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sport-navy">{p.name}</span>
                                {isCap && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                                    <Crown className="w-2.5 h-2.5 text-amber-600 inline" /> CAP
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {isEditing ? (
                              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                <input
                                  type="checkbox"
                                  checked={editIsCaptain}
                                  onChange={(e) => setEditIsCaptain(e.target.checked)}
                                  className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                                />
                                <span>Captain</span>
                              </label>
                            ) : (
                              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`captain-select-${currentTeam.id}`}
                                  checked={isCap}
                                  disabled={isCurrentTeamLocked}
                                  onChange={() => handleToggleCaptain(p.id)}
                                  className="w-4 h-4 text-amber-500 focus:ring-amber-400 cursor-pointer"
                                  title="Select as Team Captain"
                                />
                                <span
                                  className={`px-2.5 py-1 rounded text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1 ${
                                    isCap
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {isCap ? (
                                    <>
                                      <Crown className="w-3 h-3 inline" />
                                      <span>CAPTAIN</span>
                                    </>
                                  ) : (
                                    <span>Make Captain</span>
                                  )}
                                </span>
                              </label>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Registered (Eligible for 6+2 Lineup)
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSavePlayerEdit(p.id)}
                                    className="text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-emerald-50 cursor-pointer"
                                    title="Save changes"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingPlayerId(null)}
                                    className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 cursor-pointer"
                                    title="Cancel"
                                  >
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartEditPlayer(p)}
                                    className="text-slate-400 hover:text-sport-navy p-1 rounded hover:bg-slate-100 transition cursor-pointer"
                                    title="Edit Player"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    disabled={isCurrentTeamLocked}
                                    onClick={() => handleRemovePlayer(p.id)}
                                    className={`p-1 transition rounded ${
                                      isCurrentTeamLocked
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer'
                                    }`}
                                    title={isCurrentTeamLocked ? 'Locked (matches played)' : 'Remove Player'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              Select or register a team to manage its roster.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
