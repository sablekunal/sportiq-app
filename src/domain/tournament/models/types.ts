import { MatchLineup, MatchSchedule } from '../../../types';

export type MatchParticipant =
  | { type: 'TEAM'; teamId: string }
  | { type: 'TBD'; label?: string }
  | { type: 'BYE' };

export interface MatchDependency {
  sourceMatchId?: string;
  outcome?: 'WINNER' | 'LOSER';
  sourceGroupId?: string;
  rank?: number;
  targetSlot: 'A' | 'B';
}

export interface DomainMatch {
  id: string;
  tournamentId: string;
  stageId: string;
  groupId?: string;

  round: number;
  position: number;

  fixtureNumber?: number; // Canonical competition sequence (1..N)
  matchCode?: string;     // Local match number (e.g. "A-M1", "B-M3", "SF-M1", "F-M1")
  groupPositionA?: number; // 1-based position in group (1..4)
  groupPositionB?: number; // 1-based position in group (1..4)
  roundName?: string;

  participantA: MatchParticipant;
  participantB: MatchParticipant;

  dependencies: MatchDependency[];

  scoreA: number;
  scoreB: number;

  status: 'SCHEDULED' | 'LIVE' | 'HALFTIME' | 'COMPLETED' | 'CANCELLED' | 'BYE_ADVANCEMENT';

  winnerId: string | null;
  loserId: string | null;

  scheduledAt?: string;
  venueId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  schedule?: MatchSchedule;

  lineupA?: MatchLineup;
  lineupB?: MatchLineup;
}

export interface MatchResult {
  scoreA: number;
  scoreB: number;
  // If the sport has additional details, they would go here, 
  // but for the engine, scores are enough to determine the winner based on rules.
}

export interface TournamentRules {
  allowDraws: boolean;
  winPoints?: number;
  drawPoints?: number;
  lossPoints?: number;
  pointsForWin?: number;
  pointsForDraw?: number;
  pointsForLoss?: number;
  tieBreakers?: string[];
}

