import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Team, Player } from '../../types';
import { Users, Plus, Trash2, Shield, UserPlus, Sparkles, Check, Hash } from 'lucide-react';
import { soundEffects } from '../../engines/audioEngine';

export const TeamsManagement: React.FC = () => {
  const { activeTournament, addTeamToTournament, removeTeamFromTournament } = useTournament();

  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState('#f97316');
  const [seed, setSeed] = useState(activeTournament ? activeTournament.teams.length + 1 : 1);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Selected team for player roster editing
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    activeTournament?.teams[0]?.id || null
  );

  // New Player Form State
  const [playerName, setPlayerName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState(10);
  const [playerRole, setPlayerRole] = useState('Forward');

  if (!activeTournament) return null;

  const teams = activeTournament.teams;
  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];

  const handleAddTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    addTeamToTournament(activeTournament.id, {
      name: teamName,
      shortName: shortName || teamName.slice(0, 3).toUpperCase(),
      color,
      seed: Number(seed),
      groupId: selectedGroupId || undefined,
      players: [
        { id: `p-${Date.now()}-1`, name: 'Captain Player', jerseyNumber: 10, role: 'Captain' },
      ],
    });

    setTeamName('');
    setShortName('');
    setIsAddingTeam(false);
    soundEffects.playCelebration();
  };

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !currentTeam) return;

    const newPlayer: Player = {
      id: `p-${Date.now()}`,
      name: playerName,
      jerseyNumber: Number(jerseyNumber),
      role: playerRole,
    };

    currentTeam.players.push(newPlayer);
    setPlayerName('');
    soundEffects.playWhistle();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-sport-navy flex items-center gap-2">
            <Users className="w-5 h-5 text-sport-orange" />
            Tournament Teams & Player Rosters
          </h3>
          <p className="text-xs text-slate-500">
            Manage seeded squads, rosters, captains, and group allocations ({teams.length} Teams Registered)
          </p>
        </div>

        {teams.length < 16 && (
          <button
            onClick={() => setIsAddingTeam(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sport-orange hover:bg-orange-600 text-white font-bold text-xs shadow-glow-orange transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Team
          </button>
        )}
      </div>

      {/* Add Team Modal */}
      {isAddingTeam && (
        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-sport-orange/30 shadow-md animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-sport-navy">Register New Team</h4>
            <button
              onClick={() => setIsAddingTeam(false)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAddTeamSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Team Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pune City FC"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Short Code (3-4 Letters)
              </label>
              <input
                type="text"
                placeholder="PUN"
                maxLength={4}
                value={shortName}
                onChange={(e) => setShortName(e.target.value.toUpperCase())}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange bg-white"
              />
            </div>

            {/* Colors picker */}
            <div className="sm:col-span-4 flex flex-wrap items-center justify-between pt-2 gap-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Jersey Color:</span>
                {[
                  '#f97316', '#2563eb', '#10b981', '#8b5cf6', '#ef4444', '#eab308', '#06b6d4', '#0f172a',
                  '#ec4899', '#14b8a6', '#6366f1', '#f43f5e', '#84cc16', '#d946ef', '#64748b', '#1e3a8a'
                ].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition cursor-pointer ${
                        color === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  )
                )}
              </div>

              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-sport-orange text-white rounded-lg shadow-sm hover:bg-orange-600 cursor-pointer"
              >
                Confirm Registration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Layout: Left Team Cards List, Right Roster Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-1 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Teams Registry ({teams.length})
          </div>

          {teams.map((team) => {
            const isSelected = (currentTeam?.id === team.id);
            return (
              <div
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`p-3.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'border-sport-orange bg-orange-50/60 ring-2 ring-sport-orange/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-sm"
                    style={{ backgroundColor: team.color || '#f97316' }}
                  >
                    {team.shortName}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-sport-navy">{team.name}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      <span className="font-mono">Seed #{team.seed || '-'}</span>
                      <span>•</span>
                      <span>{team.players.length} Players</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTeamFromTournament(activeTournament.id, team.id);
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

        {/* Selected Team Roster Management */}
        <div className="lg:col-span-2">
          {currentTeam ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              {/* Team Profile Banner */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
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
                      Seed #{currentTeam.seed || 'Unseeded'} • Registered Squad
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  {currentTeam.players.length} Roster Members
                </span>
              </div>

              {/* Add Player Input */}
              <form onSubmit={handleAddPlayer} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px]">
                  <input
                    type="text"
                    required
                    placeholder="Player Full Name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-sport-orange"
                  />
                </div>

                <div className="w-20">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    placeholder="Jersey #"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-sport-orange text-center"
                  />
                </div>

                <div className="w-32">
                  <input
                    type="text"
                    placeholder="Role (e.g. Striker)"
                    value={playerRole}
                    onChange={(e) => setPlayerRole(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-sport-orange"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-sport-navy hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Player
                </button>
              </form>

              {/* Roster Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Jersey</th>
                      <th className="py-2.5 px-3">Player Name</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {currentTeam.players.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-sport-orange">
                          #{p.jerseyNumber ?? idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-sport-navy">{p.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-[11px]">
                            {p.role || 'Player'}
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
              Select or add a team to manage its roster.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
