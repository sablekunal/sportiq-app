export type SportType = 'football' | 'cricket' | 'volleyball' | 'basketball' | 'badminton' | 'kabaddi' | 'throwball';

export type TournamentFormat = 'KNOCKOUT' | 'DOUBLE_KNOCKOUT' | 'GROUP_KNOCKOUT' | 'ROUND_ROBIN';

export type TournamentStatus =
  | 'DRAFT'
  | 'PUBLISHED'
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

export type PlayerStatus = 'ACTIVE' | 'REPLACED' | 'WITHDRAWN';

export type RosterStatus = 'INCOMPLETE' | 'COMPLETE' | 'LOCKED';

export interface SetScore {
  setNumber: number;
  scoreA: number;
  scoreB: number;
  winnerId?: string | null;
  status: 'NOT_STARTED' | 'LIVE' | 'COMPLETED';
}

export interface SubstitutionEvent {
  id: string;
  matchId: string;
  setNumber: number;
  teamId: string;
  outgoingPlayerId: string;
  incomingPlayerId: string;
  reason: 'NORMAL' | 'INJURY';
  timestamp: string;
}

export interface TimeoutEvent {
  id: string;
  matchId: string;
  setNumber: number;
  teamId: string;
  durationMinutes: number; // 3 minutes per Throwball rule
  timestamp: string;
}

export interface PlayerLineupSnapshot {
  id: string;
  name: string;
  jerseyNumber: number;
  role?: string;
  isCaptain?: boolean;
}

export interface MatchLineup {
  matchId: string;
  teamId: string;
  startingPlayerIds: string[];     // exactly 6 for Throwball
  substitutePlayerIds: string[];   // exactly 2 for Throwball
  snapshots?: PlayerLineupSnapshot[] | Record<string, PlayerLineupSnapshot>; // Frozen historical player snapshot
  isLocked?: boolean;
  updatedAt?: string;
}

export interface Player {
  id: string;
  name: string;
  jerseyNumber?: number;
  role?: string; // e.g. "Striker", "Captain", "Court Player"
  photoUrl?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  isCaptain?: boolean;
  status?: PlayerStatus;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  color?: string;
  institution?: string; // e.g. Parish or College Name
  captainId?: string;
  captainName?: string;
  isCaptainPlaying?: boolean;
  seed?: number;
  groupId?: string;
  players: Player[];
  rosterStatus?: RosterStatus;
  isRosterLocked?: boolean;
}

export interface MatchSchedule {
  date?: string;
  startTime?: string;
  endTime?: string;
  venueId?: string;
}

export interface Venue {
  id: string;
  name: string;
  location?: string;
  capacity?: number;
  type?: 'COURT' | 'VENUE';
  order?: number;
  active?: boolean;
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
  fixtureNumber?: number; // Canonical competition sequence (1..N)
  matchCode?: string;     // Local match number (e.g. "A-M1", "B-M3", "SF-M1", "F-M1")
  groupPositionA?: number; // 1-based position in group (1..4)
  groupPositionB?: number; // 1-based position in group (1..4)
  homePlaceholder?: string; // TBD label e.g. "A1", "Winner Group A"
  awayPlaceholder?: string; // TBD label e.g. "A2", "Winner Group B"
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
  date?: string;
  startTime?: string;
  endTime?: string;
  schedule?: MatchSchedule;
  status: MatchStatus;
  events: MatchEvent[];
  lineupHome?: MatchLineup;
  lineupAway?: MatchLineup;
  sets?: SetScore[];
  substitutions?: SubstitutionEvent[];
  timeouts?: TimeoutEvent[];
  servingTeamId?: string | null;
  currentSet?: number; // 1, 2, 3
  setsWonA?: number;
  setsWonB?: number;
  tossWinnerId?: string | null;
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
  // Extended throwball stats
  setsWon?: number;
  setsLost?: number;
  setDifference?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  pointDifference?: number;
  rank?: number;
  qualified?: boolean;
  isTied?: boolean;
  tieBreakReason?: string;
}

export interface TournamentRules {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  matchDurationMinutes: number;
  periodsCount: number;
  tieBreakers: string[]; // ['goal_diff', 'head_to_head', 'goals_scored']
  allowDraws?: boolean;
  pointsForWin?: number;
  pointsForDraw?: number;
  pointsForLoss?: number;
  
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
  ownerId?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  teams: Team[];
  groups: TournamentGroup[];
  fixtures: Match[];
  venues: Venue[];
  rules: TournamentRules;
  budget: BudgetItem[];
  auditLogs: AuditLog[];
  isLiveDrawActive?: boolean;
  liveSpin?: {
    teamId: string;
    groupId: string;
    position: number;
    timestamp: number;
  };
}

export interface UserProfile {
  uid: string;
  phoneNumber: string;
  displayName: string;
  organization?: string;
  role: 'ORGANIZER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

