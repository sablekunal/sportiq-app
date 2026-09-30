import { Venue, Match, Team } from '../../../types';
import { DomainMatch } from '../models/types';
import { MatchSchedule, ScheduleConflict } from './types';

/**
 * Converts "HH:mm" 24-hour time to total minutes since midnight.
 * Returns null if invalid.
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

/**
 * Validates a match schedule object.
 * Enforces:
 * - If provided, date must be a valid non-empty string.
 * - If provided, startTime and endTime must follow "HH:mm" (24-hour) format.
 * - If both startTime and endTime are provided, startTime must be strictly before endTime.
 */
export function validateMatchSchedule(schedule: MatchSchedule): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (schedule.date !== undefined && schedule.date !== '') {
    if (!schedule.date.match(/^\d{4}-\d{2}-\d{2}$/) || isNaN(Date.parse(schedule.date))) {
      errors.push(`Invalid date format "${schedule.date}". Expected YYYY-MM-DD.`);
    }
  }

  const startMinutes = schedule.startTime ? parseTimeToMinutes(schedule.startTime) : null;
  const endMinutes = schedule.endTime ? parseTimeToMinutes(schedule.endTime) : null;

  if (schedule.startTime && startMinutes === null) {
    errors.push(`Invalid start time "${schedule.startTime}". Expected HH:mm in 24-hour format.`);
  }

  if (schedule.endTime && endMinutes === null) {
    errors.push(`Invalid end time "${schedule.endTime}". Expected HH:mm in 24-hour format.`);
  }

  if (startMinutes !== null && endMinutes !== null) {
    if (startMinutes >= endMinutes) {
      errors.push(`Start time (${schedule.startTime}) must be strictly before end time (${schedule.endTime}).`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Checks whether two time intervals on the same day overlap.
 * Uses half-open interval semantics: [startA, endA) and [startB, endB).
 */
export function isIntervalOverlapping(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

interface NormalizedScheduleMatch {
  id: string;
  matchCode?: string;
  roundName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  startMinutes?: number | null;
  endMinutes?: number | null;
  venueId?: string;
  teamIds: string[];
}

/**
 * Extracts and normalizes schedule data from either a DomainMatch or legacy Match.
 */
function normalizeMatchForConflict(
  m: Match | DomainMatch,
  teams: Team[]
): NormalizedScheduleMatch {
  const anyM = m as any;

  // Extract date and times
  let date: string | undefined = anyM.schedule?.date || anyM.date;
  let startTime: string | undefined = anyM.schedule?.startTime || anyM.startTime;
  let endTime: string | undefined = anyM.schedule?.endTime || anyM.endTime;

  if (!date && anyM.scheduledAt) {
    const parts = anyM.scheduledAt.trim().split(' ');
    if (parts[0] && parts[0].includes('-')) date = parts[0];
    if (parts[1] && parts[1].includes(':')) startTime = parts[1];
  }

  const venueId: string | undefined = anyM.schedule?.venueId || anyM.venueId;

  // Extract resolved team IDs
  const teamIds: string[] = [];

  // DomainMatch style
  if (anyM.participantA?.type === 'TEAM' && anyM.participantA.teamId) {
    teamIds.push(anyM.participantA.teamId);
  }
  if (anyM.participantB?.type === 'TEAM' && anyM.participantB.teamId) {
    teamIds.push(anyM.participantB.teamId);
  }

  // Legacy Match style
  if (anyM.homeTeamId && !teamIds.includes(anyM.homeTeamId)) {
    teamIds.push(anyM.homeTeamId);
  }
  if (anyM.awayTeamId && !teamIds.includes(anyM.awayTeamId)) {
    teamIds.push(anyM.awayTeamId);
  }

  const startMinutes = parseTimeToMinutes(startTime);
  // If end time is missing but start time is present, assume 30 minutes for overlap check window
  const endMinutes = parseTimeToMinutes(endTime) ?? (startMinutes !== null ? startMinutes + 30 : null);

  return {
    id: m.id,
    matchCode: anyM.matchCode || anyM.fixtureNumber ? `#${anyM.fixtureNumber}` : m.id,
    roundName: anyM.roundName,
    date,
    startTime,
    endTime: endTime || (startMinutes !== null && endMinutes !== null ? `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}` : undefined),
    startMinutes,
    endMinutes,
    venueId,
    teamIds,
  };
}

/**
 * Detects domain-level scheduling conflicts across all fixtures.
 * Checks for:
 * 1. Court Conflicts: Same court occupied during overlapping times on the same date.
 * 2. Team Overlaps: The same team scheduled for multiple matches during overlapping times on the same date.
 *
 * Simultaneous matches on DIFFERENT courts with DIFFERENT teams are NOT conflicts.
 */
export function detectScheduleConflicts(
  matches: (Match | DomainMatch)[],
  venues: Venue[] = [],
  teams: Team[] = []
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  const venueNameMap = new Map<string, string>(
    venues.map((v) => [v.id, v.name])
  );
  const teamNameMap = new Map<string, string>(
    teams.map((t) => [t.id, t.name])
  );

  const normalized = matches.map((m) => normalizeMatchForConflict(m, teams));

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const mA = normalized[i];
      const mB = normalized[j];

      // Must both have a date and matching dates to conflict
      if (!mA.date || !mB.date || mA.date !== mB.date) continue;

      // Must both have valid time ranges
      if (
        mA.startMinutes === null ||
        mA.endMinutes === null ||
        mB.startMinutes === null ||
        mB.endMinutes === null ||
        mA.startMinutes === undefined ||
        mA.endMinutes === undefined ||
        mB.startMinutes === undefined ||
        mB.endMinutes === undefined
      ) {
        continue;
      }

      // Check if time intervals overlap
      const overlaps = isIntervalOverlapping(
        mA.startMinutes,
        mA.endMinutes,
        mB.startMinutes,
        mB.endMinutes
      );

      if (!overlaps) continue;

      // 1. Court Conflict Check: Same venue/court scheduled simultaneously
      if (mA.venueId && mB.venueId && mA.venueId === mB.venueId) {
        const courtName = venueNameMap.get(mA.venueId) || `Court ${mA.venueId}`;
        conflicts.push({
          type: 'COURT_OVERLAP',
          matchIdA: mA.id,
          matchIdB: mB.id,
          matchCodeA: mA.matchCode,
          matchCodeB: mB.matchCode,
          date: mA.date,
          startTimeA: mA.startTime || '',
          endTimeA: mA.endTime || '',
          startTimeB: mB.startTime || '',
          endTimeB: mB.endTime || '',
          venueId: mA.venueId,
          venueName: courtName,
          description: `${courtName} is already occupied on ${mA.date} by ${mA.matchCode} (${mA.startTime}–${mA.endTime}) during ${mB.matchCode} (${mB.startTime}–${mB.endTime}).`,
        });
      }

      // 2. Team Conflict Check: Same resolved team scheduled in two places simultaneously
      const commonTeams = mA.teamIds.filter((tid) => mB.teamIds.includes(tid));
      for (const commonTeamId of commonTeams) {
        const teamName = teamNameMap.get(commonTeamId) || `Team (${commonTeamId})`;
        conflicts.push({
          type: 'TEAM_OVERLAP',
          matchIdA: mA.id,
          matchIdB: mB.id,
          matchCodeA: mA.matchCode,
          matchCodeB: mB.matchCode,
          date: mA.date,
          startTimeA: mA.startTime || '',
          endTimeA: mA.endTime || '',
          startTimeB: mB.startTime || '',
          endTimeB: mB.endTime || '',
          teamId: commonTeamId,
          teamName,
          description: `${teamName} is scheduled for overlapping matches on ${mA.date}: ${mA.matchCode} (${mA.startTime}–${mA.endTime}) and ${mB.matchCode} (${mB.startTime}–${mB.endTime}).`,
        });
      }
    }
  }

  return conflicts;
}
