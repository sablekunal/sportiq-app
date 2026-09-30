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

