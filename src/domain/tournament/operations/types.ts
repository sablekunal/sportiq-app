import { Venue, Match, Team, Tournament } from '../../../types';
import { DomainMatch } from '../models/types';

export interface MatchSchedule {
  date?: string;        // "YYYY-MM-DD"
  startTime?: string;   // "HH:mm" (24-hour)
  endTime?: string;     // "HH:mm" (24-hour)
  venueId?: string;     // Reference to Venue / Court ID
}

export interface TournamentVenue {
  id: string;
  name: string;
  location?: string;
  type?: 'COURT' | 'VENUE';
  order: number;
  active: boolean;
}

export type ConflictType = 'COURT_OVERLAP' | 'TEAM_OVERLAP';

export interface ScheduleConflict {
  type: ConflictType;
  matchIdA: string;
  matchIdB: string;
  matchCodeA?: string;
  matchCodeB?: string;
  date: string;
  startTimeA: string;
  endTimeA: string;
  startTimeB: string;
  endTimeB: string;
  venueId?: string;
  venueName?: string;
  teamId?: string;
  teamName?: string;
  description: string;
}

export type ReadinessSeverity = 'READY' | 'WARNING' | 'ERROR';

export interface ReadinessItem {
  id: string;
  label: string;
  status: ReadinessSeverity;
  category: 'CONFIG' | 'TEAMS' | 'ROSTERS' | 'GROUPS' | 'FIXTURES' | 'SCHEDULE' | 'VENUES';
  message?: string;
  details?: string;
}

export interface TournamentReadinessResult {
  status: ReadinessSeverity; // Overall status: 'READY' | 'WARNING' | 'ERROR'
  canPublish: boolean;       // False if ANY item is 'ERROR'
  items: ReadinessItem[];
  errors: string[];
  warnings: string[];
}
