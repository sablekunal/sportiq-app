import React, { useState, useRef } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { SportType, TournamentFormat } from '../../types';
import { SPORT_CONFIGS } from '../../engines/sportEngine';
import { initialTeamsData } from '../../data/initialTeams';
import { X, Trophy, MapPin, Calendar, Users, CheckCircle2, ChevronRight, ChevronLeft, LayoutGrid, Crosshair, Shield, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Parse an uploaded Excel file into team objects
const parseExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const headerKey = Object.keys(rows[0] || {})[0] || '';
        const colKeys = ['__EMPTY', '__EMPTY_1', '__EMPTY_2', '__EMPTY_3', '__EMPTY_4', '__EMPTY_5', '__EMPTY_6', '__EMPTY_7'];

        const attributes = ['Team Name', 'Institution / Parish Name', 'Captain Name', 'Contact Number',
          'Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6', 'Player 7', 'Player 8'];

        const rawTeams: any[] = [];
        let currentTeamOffset = 0;

        for (let i = 0; i < rows.length; i++) {
          const rowType = (rows[i] as any)[headerKey]?.toString().trim();
          if (!rowType) continue;

          if (rowType === 'Team Name' || rowType === 'Team Name ') {
            colKeys.forEach((k, idx) => {
              if (!rawTeams[currentTeamOffset + idx]) rawTeams[currentTeamOffset + idx] = {};
              if ((rows[i] as any)[k]) rawTeams[currentTeamOffset + idx]['Team Name'] = (rows[i] as any)[k];
            });
          } else if (rowType.startsWith('Institution') || rowType.startsWith('Parish')) {
            colKeys.forEach((k, idx) => {
              if ((rows[i] as any)[k]) rawTeams[currentTeamOffset + idx] = rawTeams[currentTeamOffset + idx] || {};
              if ((rows[i] as any)[k]) rawTeams[currentTeamOffset + idx]['Institution'] = (rows[i] as any)[k];
            });
          } else if (rowType === 'Captain Name' || rowType === 'Captain Name ') {
            colKeys.forEach((k, idx) => {
              rawTeams[currentTeamOffset + idx] = rawTeams[currentTeamOffset + idx] || {};
              if ((rows[i] as any)[k]) rawTeams[currentTeamOffset + idx]['Captain Name'] = (rows[i] as any)[k];
            });
          } else if (rowType.startsWith('Player')) {
            colKeys.forEach((k, idx) => {
              rawTeams[currentTeamOffset + idx] = rawTeams[currentTeamOffset + idx] || {};
              if (!rawTeams[currentTeamOffset + idx]['Players']) rawTeams[currentTeamOffset + idx]['Players'] = [];
              if ((rows[i] as any)[k]) {
                rawTeams[currentTeamOffset + idx]['Players'].push((rows[i] as any)[k]);
              }
            });
            if (rowType === 'Player 8') {
              currentTeamOffset += 8;
            }
          }
        }

        const colors = [
          '#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1',
          '#FFB300', '#D81B60', '#3949AB', '#00897B', '#7CB342', '#F4511E',
          '#5E35B1', '#039BE5', '#C0CA33', '#6D4C41'
        ];

        const structuredTeams = rawTeams
          .filter(rt => rt && rt['Team Name'])
          .map((rt, idx) => {
            const teamName = rt['Team Name']?.toString().trim();
            const shortName = teamName.slice(0, 3).toUpperCase();
            const institution = rt['Institution']?.toString().trim() || '';
            const captainName = rt['Captain Name']?.toString().trim() || '';
            const playersList: string[] = rt['Players'] || [];

            // Check if captain is in the players list
            const captainInList = playersList.some(p =>
              p?.toLowerCase().trim() === captainName.toLowerCase()
            );
            const isCaptainPlaying = captainInList;

            // Build players array
            const players = playersList.map((p, i) => ({
              id: `p-${Date.now()}-${idx}-${i}`,
              name: p.trim(),
              jerseyNumber: i + 1,
              role: p.trim().toLowerCase() === captainName.toLowerCase() ? 'Captain (C)' : 'Court Player',
              isCaptain: p.trim().toLowerCase() === captainName.toLowerCase(),
            }));

            // If captain is not in player list but we have a captain name, add as external
            const captainPlayer = players.find(p => p.isCaptain);

            return {
              id: `team-${Date.now()}-${idx + 1}`,
              name: teamName,
              shortName,
              institution,
              captainName,
              isCaptainPlaying,
              captainId: captainPlayer?.id || null,
              seed: idx + 1,
              color: colors[idx % colors.length],
              players,
              rosterStatus: players.length >= 8 ? 'COMPLETE' : 'INCOMPLETE',
              isRosterLocked: false,
            };
          });

        resolve(structuredTeams);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const CreateTournamentModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { createTournament } = useTournament();

  const [step, setStep] = useState(1);

  // Step 1: Basics
  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportType>('throwball');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [organizerName, setOrganizerName] = useState('');

  // Step 2: Format
  const [format, setFormat] = useState<TournamentFormat>('GROUP_KNOCKOUT');

  // Step 3: Structure
  const [numTeams, setNumTeams] = useState<number>(16);
  const [numGroups, setNumGroups] = useState<number>(4);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState<number>(1);
  const [headToHead, setHeadToHead] = useState<'SINGLE' | 'DOUBLE'>('SINGLE');

  // Step 4: Teams
  const [teamGenMode, setTeamGenMode] = useState<'AUTO' | 'CUSTOM' | 'EXCEL'>('AUTO');
  const [teamNamesInput, setTeamNamesInput] = useState('');
  const [excelTeams, setExcelTeams] = useState<any[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSportSelect = (selectedSport: SportType) => {
    setSport(selectedSport);
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 4));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const teams = await parseExcelFile(file);
      setExcelTeams(teams);
      setExcelFileName(file.name);
      setNumTeams(teams.length);
    } catch (err) {
      alert('Failed to parse Excel file. Please check the format.');
      console.error(err);
    }
  };

  // Compute preview teams based on mode
  const getPreviewTeamNames = (): string[] => {
    if (teamGenMode === 'EXCEL' && excelTeams.length > 0) {
      return excelTeams.map(t => t.name);
    }
    if (teamGenMode === 'CUSTOM' && teamNamesInput.trim()) {
      return teamNamesInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    }
    return Array.from({ length: numTeams }, (_, i) => `${sport.charAt(0).toUpperCase() + sport.slice(1)} Squad ${i + 1}`);
  };

  const previewTeams = getPreviewTeamNames();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalTeams: any[] = [];
    const colors = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#FFB300', '#D81B60',
      '#3949AB', '#00897B', '#7CB342', '#F4511E', '#5E35B1', '#039BE5', '#C0CA33', '#6D4C41'];

    if (teamGenMode === 'EXCEL' && excelTeams.length > 0) {
      // Use the uploaded & parsed teams directly (already have unique IDs from parse time)
      finalTeams = excelTeams.map((t, i) => ({
        ...t,
        id: `team-${Date.now()}-${i + 1}`,
        seed: i + 1,
        players: t.players.map((p: any, j: number) => ({
          ...p,
          id: `p-${Date.now()}-${i}-${j}`,
        })),
        captainId: null, // will be set below
      }));
      // Re-link captainId
      finalTeams = finalTeams.map((t: any) => {
        const cap = t.players.find((p: any) => p.isCaptain);
        return { ...t, captainId: cap?.id || null };
      });
    } else if (teamGenMode === 'CUSTOM' && teamNamesInput.trim()) {
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
        captainId: null,
        captainName: null,
        isCaptainPlaying: false,
        institution: '',
        isRosterLocked: false,
        rosterStatus: 'INCOMPLETE',
        players: [],
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
        isCaptainPlaying: true,
        institution: '',
        isRosterLocked: false,
        rosterStatus: 'INCOMPLETE',
        players: [
          { id: `p-${i}-1`, name: `Player ${i + 1}-A`, jerseyNumber: 10, role: 'Captain', isCaptain: true },
          { id: `p-${i}-2`, name: `Player ${i + 1}-B`, jerseyNumber: 7, role: 'Court Player', isCaptain: false },
        ],
      }));
    }

    const actualTeamCount = finalTeams.length;
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
        numberOfTeams: actualTeamCount,
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
            <div className={`w-12 h-0.5 mx-2 -mt-5 ${step > s.num ? 'bg-sport-orange' : 'bg-slate-300'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const sportOptions: { type: SportType; name: string; icon: string; desc: string }[] = [
    { type: 'throwball', name: 'Throwball', icon: '🤾', desc: '7-a-side net sport' },
    { type: 'football', name: 'Football', icon: '⚽', desc: '11-a-side pitch sport' },
    { type: 'cricket', name: 'Cricket', icon: '🏏', desc: 'T20/ODI Format' },
    { type: 'volleyball', name: 'Volleyball', icon: '🏐', desc: '6-a-side net sport' },
    { type: 'basketball', name: 'Basketball', icon: '🏀', desc: '5-a-side court sport' },
    { type: 'badminton', name: 'Badminton', icon: '🏸', desc: 'Racquet sport' },
    { type: 'kabaddi', name: 'Kabaddi', icon: '💪', desc: 'Contact team sport' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-8 py-5 bg-gradient-to-r from-sport-navy to-sport-midnight text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-sport-orange" />
            <div>
              <h2 className="text-lg font-black">Create New Tournament</h2>
              <p className="text-[11px] text-blue-200 font-medium">
                Set up a professional competition in 4 simple steps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {renderStepper()}

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* ─── Step 1: Basics ─────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6 max-w-xl mx-auto animate-fadeIn">
              <h3 className="text-lg font-bold text-sport-navy mb-4">Sport & Tournament Basics</h3>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {sportOptions.map((s) => (
                  <button
                    key={s.type}
                    onClick={() => handleSportSelect(s.type)}
                    className={`p-3 rounded-xl border-2 text-center transition cursor-pointer ${
                      sport === s.type
                        ? 'border-sport-navy bg-blue-50/50 ring-2 ring-blue-100'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="text-xl">{s.icon}</div>
                    <div className="text-[11px] font-bold text-sport-navy mt-1">{s.name}</div>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Tournament Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SXY Throwball Tournament 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-sport-navy"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      <MapPin className="w-3 h-3 inline mr-1" />Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. St. Xaviers Church Ground"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-sport-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Organizer</label>
                    <input
                      type="text"
                      placeholder="e.g. SXY Sports Committee"
                      value={organizerName}
                      onChange={(e) => setOrganizerName(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-sport-navy"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-sport-navy"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-sport-navy"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 2: Format ─────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6 max-w-xl mx-auto animate-fadeIn">
              <h3 className="text-lg font-bold text-sport-navy mb-4">Tournament Format</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { val: 'GROUP_KNOCKOUT' as TournamentFormat, title: 'League + Knockout', icon: <LayoutGrid className="w-5 h-5" />, desc: 'Round-robin groups → knockout bracket' },
                  { val: 'KNOCKOUT' as TournamentFormat, title: 'Single Elimination', icon: <Crosshair className="w-5 h-5" />, desc: 'Win or go home format' },
                  { val: 'ROUND_ROBIN' as TournamentFormat, title: 'Round Robin', icon: <Shield className="w-5 h-5" />, desc: 'Everyone plays everyone' },
                ].map((f) => (
                  <button
                    key={f.val}
                    onClick={() => setFormat(f.val)}
                    className={`p-5 rounded-2xl border-2 text-left transition cursor-pointer ${
                      format === f.val
                        ? 'border-sport-navy bg-blue-50/30 ring-2 ring-blue-100'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="text-sport-navy mb-2">{f.icon}</div>
                    <div className="font-bold text-sm text-sport-navy">{f.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 3: Structure ─────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6 max-w-xl mx-auto animate-fadeIn">
              <h3 className="text-lg font-bold text-sport-navy mb-4">Tournament Structure</h3>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-3">
                  <Users className="w-3 h-3 inline mr-1" />Number of Teams
                </label>
                <input
                  type="number"
                  min={4}
                  max={64}
                  value={numTeams}
                  onChange={(e) => setNumTeams(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-sport-navy"
                />
              </div>

              {format === 'GROUP_KNOCKOUT' && (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-3">Number of Groups</label>
                    <input
                      type="number"
                      min={2}
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

          {/* ─── Step 4: Review & Finalize ────────────────── */}
          {step === 4 && (
            <div className="space-y-8 max-w-4xl mx-auto animate-fadeIn">
              <h3 className="text-lg font-bold text-sport-navy mb-2">Review & Finalize</h3>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-bold uppercase text-slate-700">Participating Teams ({teamGenMode === 'EXCEL' && excelTeams.length > 0 ? excelTeams.length : numTeams})</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTeamGenMode('AUTO')} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${teamGenMode === 'AUTO' ? 'bg-sport-navy text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Auto-Generate</button>
                    <button onClick={() => setTeamGenMode('CUSTOM')} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${teamGenMode === 'CUSTOM' ? 'bg-sport-navy text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Custom Names</button>
                    <button onClick={() => setTeamGenMode('EXCEL')} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${teamGenMode === 'EXCEL' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-200'}`}>Upload Excel File</button>
                  </div>
                </div>

                {teamGenMode === 'EXCEL' ? (
                  <div className="space-y-4">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                    
                    {excelTeams.length === 0 ? (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-8 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer flex flex-col items-center gap-3"
                      >
                        <Upload className="w-8 h-8 text-emerald-600" />
                        <div className="text-sm font-bold text-emerald-700">Click to select Excel file from your device</div>
                        <div className="text-[11px] text-emerald-500">Supports .xlsx, .xls, .csv formats</div>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-bold text-emerald-700">{excelFileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{excelTeams.length} Teams loaded</span>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="text-xs font-bold text-slate-500 hover:text-slate-700 underline cursor-pointer"
                            >
                              Change file
                            </button>
                          </div>
                        </div>
                        
                        <div className="max-h-40 overflow-y-auto space-y-1 bg-white rounded-xl border border-slate-200 p-3">
                          {excelTeams.map((team, i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50 text-xs">
                              <span className="w-5 h-5 rounded-md text-white font-bold text-[9px] flex items-center justify-center" style={{ backgroundColor: team.color }}>{i + 1}</span>
                              <span className="font-bold text-sport-navy">{team.name}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-500">{team.institution || '—'}</span>
                              <span className="ml-auto text-[10px] text-slate-400 font-mono">{team.players.length} players</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : teamGenMode === 'CUSTOM' ? (
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
                    {Array.from({ length: Math.min(numGroups, 4) }).map((_, i) => {
                      const teamsPerGroup = Math.ceil(previewTeams.length / numGroups);
                      const groupTeams = previewTeams.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
                      
                      return (
                        <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-bold text-sport-navy">
                            GROUP {String.fromCharCode(65 + i)}
                          </div>
                          <div className="p-2 space-y-1">
                            {groupTeams.map((teamName, j) => (
                              <div key={j} className="px-3 py-2 bg-slate-50/50 rounded-lg text-xs text-slate-700 border border-slate-100 font-semibold">
                                {teamName}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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
