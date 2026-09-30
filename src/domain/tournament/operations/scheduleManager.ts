import { Match, Venue } from '../../../types';
import { DomainMatch } from '../models/types';
import { parseTimeToMinutes } from './conflicts';

/**
 * Returns the "Next Match" or current live match from a list of fixtures.
 * Priority:
 * 1. Match currently with status 'LIVE'.
 * 2. Earliest scheduled upcoming match (chronologically by date and startTime).
 * 3. First upcoming match by canonical fixture number.
 */
export function getNextScheduledMatch(
  matches: (Match | DomainMatch)[],
  referenceDateStr?: string // e.g. "2026-10-12"
): (Match | DomainMatch) | null {
  if (!matches || matches.length === 0) return null;

  // 1. If any match is currently LIVE, it is the primary focus
  const liveMatch = matches.find((m) => m.status === 'LIVE');
  if (liveMatch) return liveMatch;

  // 2. Filter candidate matches (UPCOMING or SCHEDULED)
  const upcomingMatches = matches.filter(
    (m) => m.status === 'UPCOMING' || m.status === 'SCHEDULED'
  );

  if (upcomingMatches.length === 0) return null;

  // 3. Find matches with valid date & startTime
  const scheduledUpcoming = upcomingMatches.filter((m) => {
    const anyM = m as any;
    const date = anyM.schedule?.date || anyM.date || anyM.scheduledAt?.split(' ')[0];
    const time = anyM.schedule?.startTime || anyM.startTime || anyM.scheduledAt?.split(' ')[1];
    return date && time;
  });

  if (scheduledUpcoming.length > 0) {
    // Sort chronologically
    scheduledUpcoming.sort((a, b) => {
      const anyA = a as any;
      const anyB = b as any;
      const dateA = anyA.schedule?.date || anyA.date || anyA.scheduledAt?.split(' ')[0] || '';
      const dateB = anyB.schedule?.date || anyB.date || anyB.scheduledAt?.split(' ')[1] || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const timeA = parseTimeToMinutes(anyA.schedule?.startTime || anyA.startTime || anyA.scheduledAt?.split(' ')[1]) || 0;
      const timeB = parseTimeToMinutes(anyB.schedule?.startTime || anyB.startTime || anyB.scheduledAt?.split(' ')[1]) || 0;
      if (timeA !== timeB) return timeA - timeB;

      return (anyA.fixtureNumber ?? anyA.position ?? 0) - (anyB.fixtureNumber ?? anyB.position ?? 0);
    });

    return scheduledUpcoming[0];
  }

  // 4. Fallback to earliest fixture number
  const sortedByNum = [...upcomingMatches].sort(
    (a, b) => ((a as any).fixtureNumber ?? a.position ?? 0) - ((b as any).fixtureNumber ?? b.position ?? 0)
  );

  return sortedByNum[0];
}

/**
 * Organizes matches into a court-by-court matrix for a selected date.
 */
export function groupMatchesByCourtForDate(
  matches: (Match | DomainMatch)[],
  selectedDate: string,
  venues: Venue[]
): {
  venue: Venue;
  matches: (Match | DomainMatch)[];
}[] {
  const result: { venue: Venue; matches: (Match | DomainMatch)[] }[] = [];

  for (const v of venues) {
    const courtMatches = matches.filter((m) => {
      const anyM = m as any;
      const date = anyM.schedule?.date || anyM.date || anyM.scheduledAt?.split(' ')[0];
      const venueId = anyM.schedule?.venueId || anyM.venueId;
      return date === selectedDate && venueId === v.id;
    });

    // Sort court matches chronologically by startTime
    courtMatches.sort((a, b) => {
      const anyA = a as any;
      const anyB = b as any;
      const timeA = parseTimeToMinutes(anyA.schedule?.startTime || anyA.startTime || anyA.scheduledAt?.split(' ')[1]) || 0;
      const timeB = parseTimeToMinutes(anyB.schedule?.startTime || anyB.startTime || anyB.scheduledAt?.split(' ')[1]) || 0;
      return timeA - timeB;
    });

    result.push({
      venue: v,
      matches: courtMatches,
    });
  }

  return result;
}

/**
 * Extracts all unique scheduled dates from matches, sorted chronologically.
 */
export function getUniqueScheduledDates(matches: (Match | DomainMatch)[]): string[] {
  const dates = new Set<string>();
  for (const m of matches) {
    const anyM = m as any;
    const date = anyM.schedule?.date || anyM.date || anyM.scheduledAt?.split(' ')[0];
    if (date && date.includes('-')) {
      dates.add(date);
    }
  }
  return Array.from(dates).sort();
}
