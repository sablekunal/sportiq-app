import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { SportType, TournamentFormat } from '../../types';
import { SPORT_CONFIGS } from '../../engines/sportEngine';
import { X, Trophy, MapPin, Calendar, Users, CheckCircle2, ChevronRight, ChevronLeft, LayoutGrid, Crosshair, Shield } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTournamentModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createTournament } = useTournament();

  const [step, setStep] = useState(1);

  // Step 1: Basics
  const [name, setName] = useState('All-India Open Throwball Championship 2026');
  const [sport, setSport] = useState<SportType>('throwball');
  const [location, setLocation] = useState('Kanteerava Indoor Stadium, Bangalore');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [organizerName, setOrganizerName] = useState('Throwball Federation & Sports Club');

  // Step 2: Format
  const [format, setFormat] = useState<TournamentFormat>('GROUP_KNOCKOUT');

  // Step 3: Structure
  const [numTeams, setNumTeams] = useState<number>(16);
  const [numGroups, setNumGroups] = useState<number>(4);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState<number>(2);
  const [headToHead, setHeadToHead] = useState<'SINGLE' | 'DOUBLE'>('SINGLE');

  // Step 4: Teams
  const [useCustomNames, setUseCustomNames] = useState(false);
  const [teamNamesInput, setTeamNamesInput] = useState('');

  if (!isOpen) return null;

  const handleSportSelect = (selectedSport: SportType) => {
    setSport(selectedSport);
    if (selectedSport === 'throwball') {
      setName('All-India Open Throwball Championship 2026');
      setLocation('Kanteerava Indoor Stadium, Bangalore');
    } else if (selectedSport === 'football') {
      setName('Champions League Trophy 2026');
      setLocation('Balewadi Stadium, Pune');
    } else if (selectedSport === 'cricket') {
      setName('Super T20 Cup 2026');
      setLocation('Gymkhana Grounds, Mumbai');
    }
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 4));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

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
        ],
      }));
    } else {
      finalTeams = Array.from({ length: numTeams }, (_, i) => ({
        id: `team-${Date.now()}-${i + 1}`,
        name: `${sport.charAt(0).toUpperCase() + sport.slice(1)} Squad ${i + 1}`,
        shortName: `SQ${i + 1}`,
        seed: i + 1,
        color: colors[i % colors.length],
        captainId: `p-${i}-1`,
        captainName: `Player ${i + 1}-A`,
        players: [
          { id: `p-${i}-1`, name: `Player ${i + 1}-A`, jerseyNumber: 10, role: 'Captain', isCaptain: true },
          { id: `p-${i}-2`, name: `Player ${i + 1}-B`, jerseyNumber: 7, role: 'Court Player', isCaptain: false },
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
      description: '',
      teams: finalTeams,
      rules: {
        winPoints: config.defaultWinPoints,
        drawPoints: config.defaultDrawPoints,
        lossPoints: config.defaultLossPoints,
        matchDurationMinutes: config.defaultDurationMinutes,
        periodsCount: config.defaultPeriods.length,
        tieBreakers: ['points', 'difference', 'scored'],
        numberOfTeams: numTeams,
        numberOfGroups: format === 'GROUP_KNOCKOUT' ? numGroups : undefined,
        qualifiersPerGroup: format === 'GROUP_KNOCKOUT' ? qualifiersPerGroup : undefined,
        headToHead: headToHead
      },
    });

    onClose();
  };

  const renderStepper = () => (
    <div className="flex items-center justify-center gap-4 py-6 bg-slate-50 border-b border-slate-200">
      {[
        { num: 1, label: 'Basics' },
        { num: 2, label: 'Format' },
        { num: 3, label: 'Structure' },
        { num: 4, label: 'Review' },
      ].map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s.num
                  ? 'bg-sport-navy text-white ring-4 ring-blue-100'
                  : step > s.num
                  ? 'bg-sport-orange text-white'
                  : 'bg-white text-slate-400 border border-slate-300'
              }`}
            >
              {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                step >= s.num ? 'text-sport-navy' : 'text-slate-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < 3 && (
            <div
              className={`w-16 h-0.5 mx-4 mt-[-15px] ${
                step > s.num + 0.5 ? 'bg-sport-orange' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sport-navy/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-sport-navy p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold tracking-wide">Create Tournament</h2>
          </div>
        </div>

        {renderStepper()}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8">
          {step === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Select Sport
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.keys(SPORT_CONFIGS) as SportType[]).map((sType) => {
                    const s = SPORT_CONFIGS[sType];
                    const isSelected = sport === sType;
                    return (
                      <button
                        key={sType}
                        type="button"
                        onClick={() => handleSportSelect(sType)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition cursor-pointer ${
                          isSelected
                            ? 'border-sport-orange bg-orange-50 text-sport-navy font-bold ring-2 ring-sport-orange/20'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <span className="text-3xl">{s.icon}</span>
                        <span className="text-xs font-bold">{s.displayName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Tournament Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs font-medium px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Start
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> End
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 max-w-2xl mx-auto animate-fadeIn">
              <h3 className="text-lg font-bold text-sport-navy mb-4">Select Tournament Format</h3>
              {[
                {
                  id: 'GROUP_KNOCKOUT' as TournamentFormat,
                  title: 'Groups + Knockout',
                  desc: 'Teams split into groups, play within their group, then advance to knockouts.',
                  icon: <LayoutGrid className="w-5 h-5" />
                },
                {
                  id: 'KNOCKOUT' as TournamentFormat,
                  title: 'Knockout',
                  desc: 'Lose once, you\'re eliminated.',
                  icon: <Crosshair className="w-5 h-5" />
                },
                {
                  id: 'DOUBLE_KNOCKOUT' as TournamentFormat,
                  title: 'Double Knockout',
                  desc: 'Lose twice before you\'re eliminated.',
                  icon: <Shield className="w-5 h-5" />
                },
                {
                  id: 'ROUND_ROBIN' as TournamentFormat,
                  title: 'Round Robin (League)',
                  desc: 'Every team plays each other; standings determine winner.',
                  icon: <Users className="w-5 h-5" />
                }
              ].map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id)}
                  className={`w-full flex items-start gap-4 p-5 rounded-2xl border-2 transition text-left cursor-pointer ${
                    format === fmt.id
                      ? 'border-sport-navy bg-blue-50/50'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${format === fmt.id ? 'bg-sport-navy text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {fmt.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-sport-navy">{fmt.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{fmt.desc}</p>
                  </div>
                  {format === fmt.id && <CheckCircle2 className="w-5 h-5 text-sport-navy" />}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 max-w-3xl mx-auto animate-fadeIn">
              <h3 className="text-lg font-bold text-sport-navy mb-4">Structure</h3>
              
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-3">Number of teams</label>
                <input
                  type="number"
                  min={2}
                  max={128}
                  value={numTeams}
                  onChange={(e) => setNumTeams(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-sport-navy"
                />
                <p className="text-[11px] text-slate-400 mt-2">Minimum 2, Maximum 128.</p>
              </div>

              {format === 'GROUP_KNOCKOUT' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-3">Number of groups</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={numGroups}
                      onChange={(e) => setNumGroups(Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-sport-navy"
                    />
                    <p className="text-[11px] text-slate-400 mt-2">Minimum 1, maximum 8. Each group needs at least 2 teams.</p>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-3">Qualifiers per group</label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={qualifiersPerGroup}
                      onChange={(e) => setQualifiersPerGroup(Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-sport-navy"
                    />
                    <p className="text-[11px] text-slate-400 mt-2">Maximum 4 per group. Knockout: {numGroups * qualifiersPerGroup} qualifiers.</p>
                  </div>
                </div>
              )}

              {(format === 'GROUP_KNOCKOUT' || format === 'ROUND_ROBIN') && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-3">Head-to-head (Group Stage)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setHeadToHead('SINGLE')}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                        headToHead === 'SINGLE' ? 'border-sport-navy bg-blue-50/30' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="font-bold text-sm text-sport-navy">Single</div>
                      <div className="text-[11px] text-slate-500 mt-1">Each pair plays once.</div>
                    </button>
                    <button
                      onClick={() => setHeadToHead('DOUBLE')}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                        headToHead === 'DOUBLE' ? 'border-sport-navy bg-blue-50/30' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="font-bold text-sm text-sport-navy">Double</div>
                      <div className="text-[11px] text-slate-500 mt-1">Each pair plays twice.</div>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3">How many times each pair of teams meets in the group stage.</p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 max-w-4xl mx-auto animate-fadeIn">
              <h3 className="text-lg font-bold text-sport-navy mb-2">Review & Finalize</h3>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-bold uppercase text-slate-700">Participating Teams ({numTeams})</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setUseCustomNames(false)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${!useCustomNames ? 'bg-sport-navy text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Auto-Generate</button>
                    <button onClick={() => setUseCustomNames(true)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${useCustomNames ? 'bg-sport-navy text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Custom Names</button>
                  </div>
                </div>
                {useCustomNames ? (
                  <textarea
                    rows={6}
                    value={teamNamesInput}
                    onChange={(e) => setTeamNamesInput(e.target.value)}
                    placeholder="Enter team names, one per line..."
                    className="w-full text-sm font-mono p-4 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-navy bg-white"
                  />
                ) : (
                  <div className="text-sm text-slate-500 bg-white p-4 rounded-xl border border-slate-200">
                    {numTeams} teams will be auto-generated as "{sport.charAt(0).toUpperCase() + sport.slice(1)} Squad 1", "{sport.charAt(0).toUpperCase() + sport.slice(1)} Squad 2", etc.
                  </div>
                )}
              </div>

              {format === 'GROUP_KNOCKOUT' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-slate-500">Groups Preview</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: Math.min(numGroups, 4) }).map((_, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-bold text-sport-navy">
                          GROUP {String.fromCharCode(65 + i)}
                        </div>
                        <div className="p-2 space-y-1">
                          {Array.from({ length: Math.ceil(numTeams / numGroups) }).map((_, j) => (
                            <div key={j} className="px-3 py-2 bg-slate-50/50 rounded-lg text-xs text-slate-600 border border-slate-100 font-medium">
                              Team {String.fromCharCode(65 + i)}{j + 1}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {numGroups > 4 && (
                      <div className="flex items-center justify-center p-4 text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                        + {numGroups - 4} more groups
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-slate-200 bg-white flex items-center justify-between rounded-b-3xl">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition flex items-center gap-2 cursor-pointer"
          >
            {step === 1 ? <X className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-8 py-2.5 text-sm font-bold bg-sport-navy hover:bg-blue-900 text-white rounded-xl shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-8 py-2.5 text-sm font-bold bg-sport-orange hover:bg-orange-600 text-white rounded-xl shadow-glow-orange transition active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Apply & Launch
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
