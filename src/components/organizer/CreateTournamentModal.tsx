import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { SportType, TournamentFormat } from '../../types';
import { SPORT_CONFIGS } from '../../engines/sportEngine';
import { X, Trophy, MapPin, Calendar, Users, Sliders, CheckCircle2, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTournamentModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createTournament } = useTournament();

  const [name, setName] = useState('All-India Open Throwball Championship 2026');
  const [sport, setSport] = useState<SportType>('throwball');
  const [format, setFormat] = useState<TournamentFormat>('KNOCKOUT');
  const [location, setLocation] = useState('Kanteerava Indoor Stadium, Bangalore');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [organizerName, setOrganizerName] = useState('Throwball Federation & Sports Club');
  const [description, setDescription] = useState('');
  const [teamNamesInput, setTeamNamesInput] = useState(
    'Bangalore Blasters\nHyderabad Hawks\nChennai Strikers\nPune Pioneers'
  );
  const [useCustomNames, setUseCustomNames] = useState(true);
  const [teamCount, setTeamCount] = useState<number>(4);

  if (!isOpen) return null;

  const handleSportSelect = (selectedSport: SportType) => {
    setSport(selectedSport);
    if (selectedSport === 'throwball') {
      setName('All-India Open Throwball Championship 2026');
      setLocation('Kanteerava Indoor Stadium, Bangalore');
      setTeamNamesInput('Bangalore Blasters\nHyderabad Hawks\nChennai Strikers\nPune Pioneers');
    } else if (selectedSport === 'football') {
      setName('Champions League Trophy 2026');
      setLocation('Balewadi Stadium, Pune');
      setTeamNamesInput('Thunder FC\nGladiators FC\nLightning United\nStrikers SC');
    } else if (selectedSport === 'cricket') {
      setName('Super T20 Cup 2026');
      setLocation('Gymkhana Grounds, Mumbai');
      setTeamNamesInput('Mumbai Titans\nDelhi Daredevils\nKolkata Kings\nChennai Superstars');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalTeams: any[] = [];
    const colors = ['#f97316', '#2563eb', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#eab308', '#ec4899'];

    if (useCustomNames && teamNamesInput.trim()) {
      const parsedLines = teamNamesInput
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      finalTeams = parsedLines.map((teamName, i) => ({
        id: `team-${Date.now()}-${i + 1}`,
        name: teamName,
        shortName: teamName.slice(0, 3).toUpperCase(),
        seed: i + 1,
        color: colors[i % colors.length],
        players: [
          { id: `p-${i}-1`, name: `${teamName} Captain`, jerseyNumber: 7, role: 'Captain' },
          { id: `p-${i}-2`, name: `${teamName} Player 2`, jerseyNumber: 10, role: 'Player' },
          { id: `p-${i}-3`, name: `${teamName} Player 3`, jerseyNumber: 4, role: 'Player' },
        ],
      }));
    } else {
      finalTeams = Array.from({ length: teamCount }, (_, i) => ({
        id: `team-${Date.now()}-${i + 1}`,
        name: `${sport.charAt(0).toUpperCase() + sport.slice(1)} Squad ${i + 1}`,
        shortName: `SQ${i + 1}`,
        seed: i + 1,
        color: colors[i % colors.length],
        players: [
          { id: `p-${i}-1`, name: `Player ${i + 1}-A`, jerseyNumber: 10, role: 'Captain' },
          { id: `p-${i}-2`, name: `Player ${i + 1}-B`, jerseyNumber: 7, role: 'Vice Captain' },
        ],
      }));
    }

    const config = SPORT_CONFIGS[sport];

    createTournament({
      name,
      sport,
      format,
      location,
      startDate,
      endDate,
      organizerName,
      description,
      teams: finalTeams,
      rules: {
        winPoints: config.defaultWinPoints,
        drawPoints: config.defaultDrawPoints,
        lossPoints: config.defaultLossPoints,
        matchDurationMinutes: config.defaultDurationMinutes,
        periodsCount: config.defaultPeriods.length,
        tieBreakers: ['points', 'difference', 'scored'],
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-sport-navy to-sport-midnight p-6 text-white flex items-center justify-between sticky top-0 z-10 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sport-orange/20 border border-sport-orange/40 flex items-center justify-center text-sport-orange">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Create New Tournament</h2>
              <p className="text-xs text-slate-300">
                Setup sport engine, format, and registered teams
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Sport Selection (Sport Abstraction Layer) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center justify-between">
              <span>Select Sport (Sport Engine)</span>
              <span className="text-[11px] text-sport-orange font-normal">7 Supported Sports</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(Object.keys(SPORT_CONFIGS) as SportType[]).map((sType) => {
                const s = SPORT_CONFIGS[sType];
                const isSelected = sport === sType;
                return (
                  <button
                    key={sType}
                    type="button"
                    onClick={() => handleSportSelect(sType)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-sport-orange bg-orange-50 text-sport-navy font-bold ring-2 ring-sport-orange/30 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate leading-tight">{s.displayName.split(' ')[0]}</div>
                      <div className="text-[10px] text-slate-500 truncate">{s.scoreUnit}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tournament Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Tournament Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. National Open Throwball Championship 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sport-orange/30 focus:border-sport-orange transition"
            />
          </div>

          {/* Format */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Tournament Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  id: 'KNOCKOUT' as TournamentFormat,
                  title: 'Single Elimination (Knockout)',
                  desc: 'Binary bracket progression with auto-advancement',
                  icon: '⚡',
                },
                {
                  id: 'ROUND_ROBIN' as TournamentFormat,
                  title: 'Round Robin (League)',
                  desc: 'Every team plays each other; standings determine winner',
                  icon: '🔄',
                },
                {
                  id: 'GROUP_KNOCKOUT' as TournamentFormat,
                  title: 'Group Stage + Knockout',
                  desc: 'Groups A/B round-robin followed by playoff bracket',
                  icon: '🏆',
                },
                {
                  id: 'DOUBLE_KNOCKOUT' as TournamentFormat,
                  title: 'Double Elimination',
                  desc: 'Winners bracket and Losers bracket second chance',
                  icon: '⚔️',
                },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setFormat(fmt.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex gap-3 ${
                    format === fmt.id
                      ? 'border-sport-orange bg-orange-50 ring-2 ring-sport-orange/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-xl">{fmt.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-sport-navy">{fmt.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{fmt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Location & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sport-orange" />
                Venue Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sport-orange" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sport-orange" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-sport-orange"
              />
            </div>
          </div>

          {/* Teams Entry (Custom Names or Quick Count) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sport-orange" />
                Participating Teams
              </label>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setUseCustomNames(true)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    useCustomNames ? 'bg-sport-navy text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Custom Names
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomNames(false)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    !useCustomNames ? 'bg-sport-navy text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Quick Slot Count
                </button>
              </div>
            </div>

            {useCustomNames ? (
              <div>
                <textarea
                  rows={4}
                  value={teamNamesInput}
                  onChange={(e) => setTeamNamesInput(e.target.value)}
                  placeholder="Enter team names, one per line..."
                  className="w-full text-xs font-mono font-medium p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange bg-white"
                />
                <span className="text-[10px] text-slate-500">
                  {teamNamesInput.split('\n').filter((l) => l.trim().length > 0).length} teams entered
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {[2, 4, 8, 16].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setTeamCount(count)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      teamCount === count
                        ? 'bg-sport-orange text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {count} Teams
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Submit buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-glow-orange transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Launch Tournament
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
