import React, { useState, useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Match, Venue } from '../../types';
import { MatchSchedule, ScheduleConflict } from '../../domain/tournament/operations/types';
import { detectScheduleConflicts, validateMatchSchedule } from '../../domain/tournament/operations/conflicts';
import { printFixtures } from '../../utils/printUtils';
import {
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Edit3,
  Plus,
  Trash2,
  Columns,
  List,
  Filter,
  AlertCircle,
  X,
  Save,
  Radio,
  Layers,
  Sparkles,
} from 'lucide-react';

export const ScheduleManager: React.FC = () => {
  const {
    activeTournament,
    updateMatchSchedule,
    addVenue,
    updateVenue,
    deleteVenue,
    scheduleConflicts,
  } = useTournament();

  const [viewMode, setViewMode] = useState<'list' | 'court'>('list');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [venueModalOpen, setVenueModalOpen] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');

  // Form state for match schedule modal
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formVenueId, setFormVenueId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fixtures = activeTournament?.fixtures || [];
  const venues = activeTournament?.venues || [];
  const teams = activeTournament?.teams || [];

  // Team lookup map
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const venueMap = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);

  // Extract all unique dates from scheduled fixtures
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    for (const m of fixtures) {
      const d = m.schedule?.date || m.date || (m.scheduledAt && m.scheduledAt.includes('T') ? m.scheduledAt.split('T')[0] : null);
      if (d && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dates.add(d);
      }
    }
    return Array.from(dates).sort();
  }, [fixtures]);

  // Set default selected date if empty
  const activeSelectedDate = selectedDate || (uniqueDates.length > 0 ? uniqueDates[0] : activeTournament.startDate || '');

  // Open modal with current match values
  const handleOpenEdit = (match: Match) => {
    setEditingMatch(match);
    const d = match.schedule?.date || match.date || (match.scheduledAt && match.scheduledAt.includes('T') ? match.scheduledAt.split('T')[0] : activeTournament.startDate || '');
    const st = match.schedule?.startTime || match.startTime || '';
    const et = match.schedule?.endTime || match.endTime || '';
    const vid = match.schedule?.venueId || match.venueId || '';

    setFormDate(d);
    setFormStartTime(st);
    setFormEndTime(et);
    setFormVenueId(vid);
    setFormError(null);
  };

  // Live conflict preview for the match currently being edited in modal
  const modalLiveConflicts = useMemo(() => {
    if (!editingMatch) return [];
    if (!formDate || !formStartTime) return [];

    // Synthesize preview match
    const previewMatch: Match = {
      ...editingMatch,
      schedule: {
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        venueId: formVenueId,
      },
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      venueId: formVenueId,
    };

    // Filter out the match itself from existing matches and insert the preview
    const otherMatches = fixtures.filter((m) => m.id !== editingMatch.id);
    const allForCheck = [...otherMatches, previewMatch];

    return detectScheduleConflicts(allForCheck, venues, teams).filter(
      (c) => c.matchIdA === editingMatch.id || c.matchIdB === editingMatch.id
    );
  }, [editingMatch, formDate, formStartTime, formEndTime, formVenueId, fixtures, venues, teams]);

  if (!activeTournament) return null;

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    const scheduleData: MatchSchedule = {
      date: formDate || undefined,
      startTime: formStartTime || undefined,
      endTime: formEndTime || undefined,
      venueId: formVenueId || undefined,
    };

    const validation = validateMatchSchedule(scheduleData);
    if (!validation.isValid) {
      setFormError(validation.errors.join(' '));
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await updateMatchSchedule(editingMatch.id, scheduleData);
      setEditingMatch(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearSchedule = async () => {
    if (!editingMatch) return;
    if (!window.confirm(`Clear schedule for match ${editingMatch.matchCode || editingMatch.id}?`)) return;

    setIsSaving(true);
    try {
      await updateMatchSchedule(editingMatch.id, {
        date: undefined,
        startTime: undefined,
        endTime: undefined,
        venueId: undefined,
      });
      setEditingMatch(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to clear schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueName.trim()) return;
    await addVenue(activeTournament.id, {
      name: newVenueName.trim(),
      type: 'COURT',
      active: true,
      order: venues.length + 1,
    });
    setNewVenueName('');
  };

  const sortedFixtures = useMemo(() => {
    const getMatchTime = (m: Match) => {
      const d = m.schedule?.date || m.date;
      const t = m.schedule?.startTime || m.startTime;
      if (!d && !t) return Number.MAX_SAFE_INTEGER;
      const time = new Date(`${d || '2099-12-31'}T${t || '23:59'}`).getTime();
      return isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
    };

    return [...fixtures].sort((a, b) => {
      const timeA = getMatchTime(a);
      const timeB = getMatchTime(b);
      if (timeA !== timeB) return timeA - timeB;
      return (a.fixtureNumber ?? a.position) - (b.fixtureNumber ?? b.position);
    });
  }, [fixtures]);

  const handlePrintSchedule = () => {
    printFixtures(sortedFixtures, teams);
  };

  // Metrics calculation
  const totalFixtures = fixtures.length;
  const scheduledCount = fixtures.filter(
    (m) => (m.schedule?.date || m.date) && (m.schedule?.startTime || m.startTime)
  ).length;
  const unscheduledCount = totalFixtures - scheduledCount;
  const noCourtCount = fixtures.filter((m) => !(m.schedule?.venueId || m.venueId)).length;

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-sport-navy tracking-tight">
              Tournament Operations & Schedule
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Canonical 27 Fixtures
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Assign dates, times, and courts without altering fixture identities, seeds, or bracket rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintSchedule}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            Print Schedule
          </button>
        </div>
      </div>

      {/* Readiness & Conflict Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Scheduled Progress */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Scheduled Fixtures</div>
            <div className="text-xl font-black text-sport-navy mt-0.5">
              {scheduledCount} <span className="text-xs font-bold text-slate-400">/ {totalFixtures}</span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            scheduledCount === totalFixtures ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Unscheduled Warning */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Missing Date/Time</div>
            <div className="text-xl font-black text-amber-600 mt-0.5">{unscheduledCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>



        {/* Metric 4: Conflict Status */}
        <div className={`p-4 rounded-xl border shadow-sm flex items-center justify-between ${
          scheduleConflicts.length > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Schedule Conflicts</div>
            <div className={`text-xl font-black mt-0.5 ${scheduleConflicts.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {scheduleConflicts.length} Detected
            </div>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            scheduleConflicts.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
          }`}>
            {scheduleConflicts.length > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Global Conflict Warnings Alert Box */}
      {scheduleConflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 font-black text-sm">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Scheduling Conflicts Detected ({scheduleConflicts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {scheduleConflicts.map((c, idx) => (
              <div key={idx} className="bg-white/80 p-2.5 rounded-xl border border-rose-200/80 shadow-xs flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase shrink-0 mt-0.5">
                  {c.type === 'COURT_OVERLAP' ? 'Court Conflict' : 'Team Overlap'}
                </span>
                <span className="text-slate-700 font-medium leading-relaxed">{c.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: LIST VIEW
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Fixture</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Matchup</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time Window</th>

                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sortedFixtures.map((m) => {
                  const home = m.homeTeamId ? teamMap.get(m.homeTeamId) : null;
                  const away = m.awayTeamId ? teamMap.get(m.awayTeamId) : null;
                  const venue = m.schedule?.venueId || m.venueId ? venueMap.get(m.schedule?.venueId || m.venueId!) : null;

                  const dateStr = m.schedule?.date || m.date || (m.scheduledAt && m.scheduledAt.includes('T') ? m.scheduledAt.split('T')[0] : null);
                  const startTimeStr = m.schedule?.startTime || m.startTime || '';
                  const endTimeStr = m.schedule?.endTime || m.endTime || '';

                  const isLive = m.status === 'LIVE';
                  const isCompleted = m.status === 'COMPLETED' || m.status === 'WALKOVER';
                  const isLocked = isLive || isCompleted;

                  // Check if this fixture is involved in a conflict
                  const hasConflict = scheduleConflicts.some(
                    (c) => c.matchIdA === m.id || c.matchIdB === m.id
                  );

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50/70 transition ${
                        hasConflict ? 'bg-rose-50/40' : ''
                      }`}
                    >
                      {/* Fixture Code & Canonical Sequence Number */}
                      <td className="py-3 px-4 font-mono font-bold text-sport-navy">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-extrabold text-[11px] border border-slate-200">
                            {m.matchCode || `#${m.fixtureNumber ?? m.position}`}
                          </span>
                          {hasConflict && (
                            <span title="Conflict Detected" className="text-rose-500">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-slate-600 font-semibold">
                          {m.groupId ? `Group ${m.groupId}` : m.roundName}
                        </span>
                      </td>

                      {/* Matchup */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <span className={home ? 'text-slate-900' : 'text-slate-400 italic'}>
                            {home ? home.name : (m.homePlaceholder || 'TBD')}
                          </span>
                          <span className="text-slate-400 font-normal text-[10px]">vs</span>
                          <span className={away ? 'text-slate-900' : 'text-slate-400 italic'}>
                            {away ? away.name : (m.awayPlaceholder || 'TBD')}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4">
                        {dateStr ? (
                          <span className="font-semibold text-slate-800">{dateStr}</span>
                        ) : (
                          <span className="text-amber-500 text-[11px] font-semibold italic">Unscheduled</span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-4">
                        {startTimeStr ? (
                          <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {startTimeStr} {endTimeStr ? `– ${endTimeStr}` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">—</span>
                        )}
                      </td>



                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isLive
                              ? 'bg-red-500 text-white animate-pulse'
                              : isCompleted
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        {isLocked ? (
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
                            title="Schedule locked during live/completed match"
                          >
                            <Lock className="w-3 h-3" />
                            Locked
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-sport-orange text-white shadow-xs transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            Schedule
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* ─────────────────────────────────────────────────────────────
          MATCH SCHEDULING EDITOR MODAL
      ───────────────────────────────────────────────────────────── */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-sport-navy to-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-white/20 border border-white/20">
                    {editingMatch.matchCode || `#${editingMatch.fixtureNumber ?? editingMatch.position}`}
                  </span>
                  <h3 className="font-extrabold text-base">Match Scheduling Editor</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {editingMatch.groupId ? `Group ${editingMatch.groupId}` : editingMatch.roundName}
                </p>
              </div>

              <button
                onClick={() => setEditingMatch(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Participants Banner */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-sport-navy">
              <span>{editingMatch.homeTeamId ? teamMap.get(editingMatch.homeTeamId)?.name : (editingMatch.homePlaceholder || 'TBD')}</span>
              <span className="text-slate-400 uppercase font-black text-[10px]">VS</span>
              <span>{editingMatch.awayTeamId ? teamMap.get(editingMatch.awayTeamId)?.name : (editingMatch.awayPlaceholder || 'TBD')}</span>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSchedule} className="p-5 space-y-4">
              {/* Lock Warning if LIVE or COMPLETED or WALKOVER */}
              {(editingMatch.status === 'LIVE' || editingMatch.status === 'COMPLETED' || editingMatch.status === 'WALKOVER') && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Schedule is Locked.</span>
                    <p className="mt-0.5 text-[11px] text-amber-700">
                      Match status is <strong className="uppercase">{editingMatch.status}</strong>. Normal schedule editing is locked once a match starts or completes.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Live Conflict Preview Alert */}
              {modalLiveConflicts.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Conflict Warning</span>
                  </div>
                  {modalLiveConflicts.map((c, i) => (
                    <div key={i} className="text-[11px] leading-relaxed text-slate-700">
                      • {c.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Date Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Match Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    disabled={editingMatch.status === 'LIVE' || editingMatch.status === 'COMPLETED' || editingMatch.status === 'WALKOVER'}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sport-orange disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Time Inputs: Start & End */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Time (24h)
                  </label>
                  <input
                    type="time"
                    disabled={editingMatch.status === 'LIVE' || editingMatch.status === 'COMPLETED' || editingMatch.status === 'WALKOVER'}
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sport-orange disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Time (24h)
                  </label>
                  <input
                    type="time"
                    disabled={editingMatch.status === 'LIVE' || editingMatch.status === 'COMPLETED' || editingMatch.status === 'WALKOVER'}
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sport-orange disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>



              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={editingMatch.status === 'LIVE' || editingMatch.status === 'COMPLETED' || editingMatch.status === 'WALKOVER' || isSaving}
                  onClick={handleClearSchedule}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear Schedule
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMatch(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={editingMatch.status === 'LIVE' || editingMatch.status === 'COMPLETED' || editingMatch.status === 'WALKOVER' || isSaving}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-sport-orange hover:bg-orange-600 text-white shadow-glow-orange transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Saving...' : 'Save Schedule'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          COURT / VENUE MANAGEMENT MODAL
      ───────────────────────────────────────────────────────────── */}
      {venueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Court & Venue Management</h3>
                <p className="text-xs text-slate-400 mt-0.5">Configure court names and venues</p>
              </div>
              <button
                onClick={() => setVenueModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Existing Courts List */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Configured Courts ({venues.length})</label>
                {venues.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No courts added yet.</p>
                ) : (
                  venues.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-sport-orange" />
                        <span>{v.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete court "${v.name}"?`)) {
                            deleteVenue(activeTournament.id, v.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                        title="Delete court"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Court Form */}
              <form onSubmit={handleAddVenueSubmit} className="pt-3 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">Add New Court</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Court 3, Main Court, Ground A"
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sport-orange"
                  />
                  <button
                    type="submit"
                    disabled={!newVenueName.trim()}
                    className="px-4 py-2 bg-sport-orange hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
