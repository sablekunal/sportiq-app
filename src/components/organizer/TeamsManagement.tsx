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
  AlertCircle,
} from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';

export const TeamsManagement: React.FC = () => {
  const { activeTournament, addTeamToTournament, removeTeamFromTournament } = useTournament();

  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState('#f97316');
  const [seed, setSeed] = useState(activeTournament ? activeTournament.teams.length + 1 : 1);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [withRegulationSquad, setWithRegulationSquad] = useState(true);

  // Selected team for player roster editing
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    activeTournament?.teams[0]?.id || null
  );

  // New Player Form State
  const [playerName, setPlayerName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState<number>(7);
  const [playerRole, setPlayerRole] = useState('Attacker / Smasher');
  const [playerError, setPlayerError] = useState<string | null>(null);

  if (!activeTournament) return null;

  const teams = activeTournament.teams;
  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];

  // Helper to generate a regulation 12-player squad (7 on court + 5 bench substitutes)
  const generateRegulation12Squad = (teamShort: string): Player[] => {
    return [
      { id: `p-${Date.now()}-1`, name: 'Team Captain', jerseyNumber: 10, role: 'Captain (C)' },
      { id: `p-${Date.now()}-2`, name: 'Lead Smasher', jerseyNumber: 7, role: 'Attacker / Smasher' },
      { id: `p-${Date.now()}-3`, name: 'Left Attacker', jerseyNumber: 9, role: 'Attacker / Smasher' },
      { id: `p-${Date.now()}-4`, name: 'Main Center', jerseyNumber: 5, role: 'Center / Setter' },
      { id: `p-${Date.now()}-5`, name: 'Secondary Center', jerseyNumber: 8, role: 'Center / Setter' },
      { id: `p-${Date.now()}-6`, name: 'Left Defender', jerseyNumber: 2, role: 'Defender' },
      { id: `p-${Date.now()}-7`, name: 'Right Defender', jerseyNumber: 4, role: 'Defender' },
      // 5 Regulation Substitutes
      { id: `p-${Date.now()}-8`, name: 'Sub Attacker', jerseyNumber: 1, role: 'Substitute' },
      { id: `p-${Date.now()}-9`, name: 'Sub Defender', jerseyNumber: 3, role: 'Substitute' },
      { id: `p-${Date.now()}-10`, name: 'Sub Center', jerseyNumber: 6, role: 'Substitute' },
      { id: `p-${Date.now()}-11`, name: 'Reserve Player 1', jerseyNumber: 11, role: 'Substitute' },
      { id: `p-${Date.now()}-12`, name: 'Reserve Player 2', jerseyNumber: 12, role: 'Substitute' },
    ];
  };

  const handleAddTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    const code = (shortName || teamName.slice(0, 3)).toUpperCase().trim().slice(0, 4);

    const squadPlayers = withRegulationSquad
      ? generateRegulation12Squad(code)
      : [
          { id: `p-${Date.now()}-1`, name: 'Captain Player', jerseyNumber: 10, role: 'Captain (C)' },
        ];

    addTeamToTournament(activeTournament.id, {
      name: teamName.trim(),
      shortName: code,
      color,
      seed: Number(seed),
      groupId: selectedGroupId || undefined,
      players: squadPlayers,
    });

    setTeamName('');
    setShortName('');
    setIsAddingTeam(false);
    soundEffects.playCelebration();
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    setPlayerError(null);
    if (!playerName.trim() || !currentTeam) return;

    // Validate jersey number uniqueness within team
    const num = Number(jerseyNumber);
    if (num < 1 || num > 99) {
      setPlayerError('Jersey number must be between 1 and 99.');
      return;
    }

    if (currentTeam.players.some((p) => p.jerseyNumber === num)) {
      setPlayerError(`Jersey #${num} is already worn by another player on ${currentTeam.name}.`);
      return;
    }

    const newPlayer: Player = {
      id: `p-${Date.now()}`,
      name: playerName.trim(),
      jerseyNumber: num,
      role: playerRole,
    };

    currentTeam.players.push(newPlayer);
    setPlayerName('');
    setJerseyNumber((prev) => (prev < 99 ? prev + 1 : 1));
    soundEffects.playWhistle();
  };

  const handlePopulateSquad = (team: Team) => {
    if (
      team.players.length >= 7 &&
      !window.confirm(`Replace existing roster with regulation 12-player squad?`)
    ) {
      return;
    }
    team.players = generateRegulation12Squad(team.shortName);
    soundEffects.playCelebration();
  };

  return (
    <div className="space-y-6">
      {/* Official Tournament Regulation Specifications Card */}
      <div className="bg-gradient-to-r from-slate-900 via-sport-navy to-sport-midnight text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-sport-orange/20 text-sport-orange border border-sport-orange/30 shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-2 flex-1">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              Official Tournament Team & Roster Standard Specification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1 text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-sport-orange block uppercase text-[10px]">
                  1. Squad Size
                </span>
                <span className="font-semibold text-white">12 to 14 Players</span>
                <p className="text-[11px] text-slate-400 mt-0.5">7 playing on court + 5 to 7 bench substitutes</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-sport-orange block uppercase text-[10px]">
                  2. Team Name & Code
                </span>
                <span className="font-semibold text-white">Full Name + 3-4 Letter Code</span>
                <p className="text-[11px] text-slate-400 mt-0.5">e.g. "Bangalore Thunderbolts" (BLR)</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-sport-orange block uppercase text-[10px]">
                  3. Player Names & Roles
                </span>
                <span className="font-semibold text-white">First & Last Name</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Captain (C), Vice-Captain, Smasher, Center, Defender</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-bold text-sport-orange block uppercase text-[10px]">
                  4. Jersey Numbers
                </span>
                <span className="font-semibold text-white">#1 to #99 (Unique)</span>
                <p className="text-[11px] text-slate-400 mt-0.5">No duplicate jersey numbers within same squad</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-sport-navy flex items-center gap-2">
            <Users className="w-5 h-5 text-sport-orange" />
            Tournament Teams & Squad Rosters
          </h3>
          <p className="text-xs text-slate-500">
            Manage squads, jersey numbers, and team matchmaking ({teams.length} Teams Registered)
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
            </div>

            {/* Regulation Squad Auto-Populate Checkbox */}
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-sport-navy">
                <input
                  type="checkbox"
                  checked={withRegulationSquad}
                  onChange={(e) => setWithRegulationSquad(e.target.checked)}
                  className="rounded text-sport-orange focus:ring-sport-orange w-4 h-4 cursor-pointer"
                />
                <span>Auto-generate Regulation 12-Player Squad (7 on court + 5 substitutes with Jersey #1 to #12)</span>
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
            <span>Roster Size</span>
          </div>

          {teams.map((team) => {
            const isSelected = (currentTeam?.id === team.id);
            const isRegulationReady = team.players.length >= 7;

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
                    <h4 className="text-sm font-bold text-sport-navy">{team.name}</h4>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Seed #{team.seed || '-'}</span>
                      <span>•</span>
                      <span className={isRegulationReady ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                        {team.players.length} Players {isRegulationReady ? '(Regulation Ready)' : '(Need 7+)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete team "${team.name}"?`)) {
                        removeTeamFromTournament(activeTournament.id, team.id);
                      }
                    }}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    title="Remove Team"
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
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md"
                    style={{ backgroundColor: currentTeam.color || '#f97316' }}
                  >
                    {currentTeam.shortName}
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-sport-navy">{currentTeam.name}</h4>
                    <p className="text-xs text-slate-500">
                      Code: <strong className="font-mono text-sport-orange">{currentTeam.shortName}</strong> • Seed #{currentTeam.seed || 'Unseeded'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePopulateSquad(currentTeam)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Load standard 12-player Throwball roster"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sport-orange" />
                    <span>Load 12-Player Squad Preset</span>
                  </button>

                  <span className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-sport-navy text-white">
                    {currentTeam.players.length} Players
                  </span>
                </div>
              </div>

              {/* Error banner if jersey conflict */}
              {playerError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{playerError}</span>
                </div>
              )}

              {/* Add Individual Player Input */}
              <form onSubmit={handleAddPlayer} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px]">
                  <input
                    type="text"
                    required
                    placeholder="Player Name (e.g. Kunal Sable)"
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

                <div className="w-44">
                  <select
                    value={playerRole}
                    onChange={(e) => setPlayerRole(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-sport-orange cursor-pointer"
                  >
                    <option value="Captain (C)">Captain (C)</option>
                    <option value="Vice-Captain (VC)">Vice-Captain (VC)</option>
                    <option value="Attacker / Smasher">Attacker / Smasher</option>
                    <option value="Center / Setter">Center / Setter</option>
                    <option value="Defender">Defender</option>
                    <option value="Substitute">Substitute</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-sport-navy hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Player</span>
                </button>
              </form>

              {/* Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Jersey #</th>
                      <th className="py-2.5 px-3">Player Full Name</th>
                      <th className="py-2.5 px-3">Court Role</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {currentTeam.players.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-mono font-black text-sport-orange text-sm">
                          #{p.jerseyNumber ?? idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-sport-navy">{p.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                              p.role.includes('Captain')
                                ? 'bg-amber-100 text-amber-800 font-bold'
                                : p.role.includes('Attacker')
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {p.role || 'Player'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              idx < 7 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {idx < 7 ? 'On Court (Playing 7)' : 'Substitute Bench'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              currentTeam.players = currentTeam.players.filter((item) => item.id !== p.id);
                              soundEffects.playWhistle();
                            }}
                            className="text-slate-400 hover:text-red-500 p-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
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
