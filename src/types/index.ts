export type SportType = 'football' | 'cricket' | 'volleyball' | 'basketball' | 'badminton' | 'kabaddi' | 'throwball';

export type TournamentFormat = 'KNOCKOUT' | 'DOUBLE_KNOCKOUT' | 'GROUP_KNOCKOUT' | 'ROUND_ROBIN';

export type TournamentStatus =
  | 'DRAFT'
  | 'REGISTRATION'
  | 'TEAMS_ADDED'
  | 'FORMAT_SELECTED'
  | 'DRAW_PENDING'
  | 'DRAW_COMPLETED'
  | 'FIXTURES_GENERATED'
  | 'TOURNAMENT_LIVE'
  | 'FINAL'
  | 'COMPLETED'
  | 'ARCHIVED';

export type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

export interface Player {
  id: string;
  name: string;
  jerseyNumber?: number;
  role?: string; // e.g. "Striker", "Captain", "All-Rounder", "Raider"
  photoUrl?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  color?: string;
  captainId?: string;
  seed?: number;
  groupId?: string;
  players: Player[];
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  capacity?: number;
}

export interface MatchScore {
  homeScore: number;
  awayScore: number;
  homeDetails?: Record<string, any>; // e.g. football: halves, cricket: overs & wickets, sets: [25, 21]
  awayDetails?: Record<string, any>;
  period?: string; // "1st Half", "2nd Half", "Set 1", "Q3", "Innings 1", "Extra Time"
  timeElapsed?: string; // "45:00", "Over 14.2"
}

export interface MatchEvent {
  id: string;
  timestamp: string;
  eventType: string; // 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'WICKET' | 'FOUR' | 'SIX' | 'POINT' | 'RAID_POINT' | 'TACKLE'
  teamId: string;
  playerId?: string;
  playerName?: string;
  minute?: number;
  description: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  roundName: string; // "Round of 16", "Quarter Final", "Semi Final", "Final", "Group Match"
  position: number;
  stage: 'GROUP' | 'KNOCKOUT' | 'WINNERS_BRACKET' | 'LOSERS_BRACKET' | 'FINAL';
  groupId?: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number;
  awayScore: number;
  homeDetails?: Record<string, any>;
  awayDetails?: Record<string, any>;
  score: MatchScore;
  winnerId: string | null;
  nextMatchId?: string | null;
  loserNextMatchId?: string | null; // For double elimination
  scheduledAt: string;
  venueId?: string;
  status: MatchStatus;
  events: MatchEvent[];
}

export interface TournamentGroup {
  id: string;
  name: string; // "Group A", "Group B"
  order: number;
  teamIds: string[];
}

export interface Standing {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  scored: number; // Goals for, runs scored, sets won
  conceded: number; // Goals against, runs conceded, sets lost
  difference: number; // Goal difference, NRR, set difference
  groupId?: string;
}

export interface TournamentRules {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  matchDurationMinutes: number;
  periodsCount: number;
  tieBreakers: string[]; // ['goal_diff', 'head_to_head', 'goals_scored']
  
  // Structure configuration
  numberOfTeams?: number;
  numberOfGroups?: number;
  qualifiersPerGroup?: number;
  headToHead?: 'SINGLE' | 'DOUBLE';
}

export interface BudgetItem {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  status: 'PENDING' | 'RECEIVED' | 'PAID';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  sport: SportType;
  format: TournamentFormat;
  status: TournamentStatus;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  location: string;
  startDate: string;
  endDate: string;
  organizerName: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  teams: Team[];
  groups: TournamentGroup[];
  fixtures: Match[];
  venues: Venue[];
  rules: TournamentRules;
  budget: BudgetItem[];
  auditLogs: AuditLog[];
}
