import { DomainMatch } from '../models/types';
import { SetScore, SubstitutionEvent, TimeoutEvent } from '../../../types';

export const THROWBALL_SCORING_RULES = {
  maxSets: 3,
  setsToWin: 2,
  pointsPerSet: 15,
  maxTimeoutsPerTeamPerSet: 2,
  timeoutDurationMinutes: 3,
  maxSubstitutionsPerTeamPerSet: 3,
};

export interface ScoreValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SetCompletionResult {
  match: DomainMatch;
  set: SetScore;
  isMatchCompleted: boolean;
  winnerId?: string;
  loserId?: string;
}

/**
 * Validates a single set score according to official Throwball rules:
 * - 15 rally points per set.
 * - Negative scores rejected.
 * - Both teams cannot win the same set.
 * - Completed set must have a valid winner who reached at least 15 points and scored higher than the opponent.
 * - (No deuce rule invented: first team to reach 15 points wins).
 */
export function validateSetScore(
  set: SetScore,
  participantATeamId?: string | null,
  participantBTeamId?: string | null
): ScoreValidationResult {
  const errors: string[] = [];

  if (set.scoreA < 0 || set.scoreB < 0) {
    errors.push(`Set ${set.setNumber} has negative score: ${set.scoreA} - ${set.scoreB}.`);
  }

  if (set.status === 'COMPLETED') {
    if (set.scoreA === set.scoreB) {
      errors.push(`Set ${set.setNumber} cannot be completed with a tie: ${set.scoreA} - ${set.scoreB}.`);
    }

    const maxScore = Math.max(set.scoreA, set.scoreB);
    if (maxScore < THROWBALL_SCORING_RULES.pointsPerSet) {
      errors.push(
        `Set ${set.setNumber} completed before reaching target 15 rally points (${set.scoreA} - ${set.scoreB}).`
      );
    }

    if (!set.winnerId) {
      errors.push(`Set ${set.setNumber} marked completed without a valid winner ID.`);
    } else if (participantATeamId && participantBTeamId) {
      if (set.scoreA > set.scoreB && set.winnerId !== participantATeamId) {
        errors.push(`Set ${set.setNumber} winner does not match higher score (${participantATeamId} scored ${set.scoreA}).`);
      } else if (set.scoreB > set.scoreA && set.winnerId !== participantBTeamId) {
        errors.push(`Set ${set.setNumber} winner does not match higher score (${participantBTeamId} scored ${set.scoreB}).`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates match set progression and completion:
 * - Max 3 sets.
 * - First team to win 2 sets wins match.
 * - Third set cannot be played after 2-0.
 * - Match cannot be completed while both teams have fewer than 2 set wins.
 * - Actual entered set scores are preserved.
 */
export function validateMatchSets(
  sets: SetScore[],
  participantATeamId: string,
  participantBTeamId: string
): {
  valid: boolean;
  errors: string[];
  setsWonA: number;
  setsWonB: number;
  winnerId?: string;
  loserId?: string;
} {
  const errors: string[] = [];
  if (sets.length > THROWBALL_SCORING_RULES.maxSets) {
    errors.push(`Match cannot contain more than ${THROWBALL_SCORING_RULES.maxSets} sets (got ${sets.length}).`);
  }

  let setsWonA = 0;
  let setsWonB = 0;

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    const validation = validateSetScore(s, participantATeamId, participantBTeamId);
    if (!validation.valid) {
      errors.push(...validation.errors);
    }

    if (s.status === 'COMPLETED') {
      if (s.winnerId === participantATeamId) {
        setsWonA++;
      } else if (s.winnerId === participantBTeamId) {
        setsWonB++;
      }
    }

    // Check if 3rd set exists after 2-0
    if (i >= 2 && sets[0].status === 'COMPLETED' && sets[1].status === 'COMPLETED') {
      const firstTwoWonA = (sets[0].winnerId === participantATeamId ? 1 : 0) + (sets[1].winnerId === participantATeamId ? 1 : 0);
      const firstTwoWonB = (sets[0].winnerId === participantBTeamId ? 1 : 0) + (sets[1].winnerId === participantBTeamId ? 1 : 0);
      if (firstTwoWonA === 2 || firstTwoWonB === 2) {
        errors.push('Third set cannot be played after a 2-0 match completion.');
      }
    }
  }

  let winnerId: string | undefined;
  let loserId: string | undefined;

  if (setsWonA === THROWBALL_SCORING_RULES.setsToWin) {
    winnerId = participantATeamId;
    loserId = participantBTeamId;
  } else if (setsWonB === THROWBALL_SCORING_RULES.setsToWin) {
    winnerId = participantBTeamId;
    loserId = participantATeamId;
  }

  return {
    valid: errors.length === 0,
    errors,
    setsWonA,
    setsWonB,
    winnerId,
    loserId,
  };
}

/**
 * Initializes default sets on a match if not already present.
 */
export function initializeMatchSets(match: DomainMatch): DomainMatch {
  if (match.sets && match.sets.length > 0) return match;

  const initialSet: SetScore = {
    setNumber: 1,
    scoreA: 0,
    scoreB: 0,
    status: match.status === 'LIVE' ? 'LIVE' : 'NOT_STARTED',
  };

  return {
    ...match,
    sets: [initialSet],
    currentSet: 1,
    setsWonA: 0,
    setsWonB: 0,
    substitutions: match.substitutions || [],
    timeouts: match.timeouts || [],
  };
}

/**
 * Increments live score for a specific team in the current live set.
 * Automatically checks for set completion at 15 points, and match completion at 2 sets won.
 */
export function recordPoint(
  match: DomainMatch,
  scoringSide: 'A' | 'B'
): { match: DomainMatch; setCompleted?: SetScore; matchCompleted: boolean; errors: string[] } {
  if (match.status === 'COMPLETED' || match.status === 'BYE_ADVANCEMENT') {
    return { match, matchCompleted: true, errors: ['Cannot record point: match is already completed.'] };
  }

  const teamAId = match.participantA.type === 'TEAM' ? match.participantA.teamId : null;
  const teamBId = match.participantB.type === 'TEAM' ? match.participantB.teamId : null;

  if (!teamAId || !teamBId) {
    return { match, matchCompleted: false, errors: ['Participants are not fully resolved teams.'] };
  }

  const sets: SetScore[] = match.sets && match.sets.length > 0
    ? match.sets.map((s) => ({ ...s }))
    : [
        {
          setNumber: 1,
          scoreA: 0,
          scoreB: 0,
          status: 'LIVE',
        },
      ];

  const currentSetNum = match.currentSet || 1;
  let activeSetIndex = sets.findIndex((s) => s.setNumber === currentSetNum);

  if (activeSetIndex === -1) {
    sets.push({
      setNumber: currentSetNum,
      scoreA: 0,
      scoreB: 0,
      status: 'LIVE',
    });
    activeSetIndex = sets.length - 1;
  }

  const activeSet = sets[activeSetIndex];
  if (activeSet.status === 'COMPLETED') {
    return { match, matchCompleted: false, errors: [`Set ${currentSetNum} is already completed.`] };
  }

  activeSet.status = 'LIVE';

  if (scoringSide === 'A') {
    activeSet.scoreA += 1;
  } else {
    activeSet.scoreB += 1;
  }

  let setCompleted: SetScore | undefined;
  let isMatchCompleted = false;
  let nextSetNum = currentSetNum;

  // Check if set is won (15 points reached and > opponent)
  const isSetWonA = activeSet.scoreA >= THROWBALL_SCORING_RULES.pointsPerSet && activeSet.scoreA > activeSet.scoreB;
  const isSetWonB = activeSet.scoreB >= THROWBALL_SCORING_RULES.pointsPerSet && activeSet.scoreB > activeSet.scoreA;

  let setsWonA = sets.filter((s, idx) => idx !== activeSetIndex && s.status === 'COMPLETED' && s.winnerId === teamAId).length;
  let setsWonB = sets.filter((s, idx) => idx !== activeSetIndex && s.status === 'COMPLETED' && s.winnerId === teamBId).length;

  if (isSetWonA) {
    activeSet.status = 'COMPLETED';
    activeSet.winnerId = teamAId;
    setsWonA++;
    setCompleted = { ...activeSet };
  } else if (isSetWonB) {
    activeSet.status = 'COMPLETED';
    activeSet.winnerId = teamBId;
    setsWonB++;
    setCompleted = { ...activeSet };
  }

  let winnerId: string | null = null;
  let loserId: string | null = null;
  let newStatus: DomainMatch['status'] = match.status === 'SCHEDULED' ? 'LIVE' : match.status;

  if (setsWonA === THROWBALL_SCORING_RULES.setsToWin) {
    isMatchCompleted = true;
    newStatus = 'COMPLETED';
    winnerId = teamAId;
    loserId = teamBId;
  } else if (setsWonB === THROWBALL_SCORING_RULES.setsToWin) {
    isMatchCompleted = true;
    newStatus = 'COMPLETED';
    winnerId = teamBId;
    loserId = teamAId;
  } else if (setCompleted) {
    // Advance to next set if match not complete
    nextSetNum = currentSetNum + 1;
    if (nextSetNum <= THROWBALL_SCORING_RULES.maxSets && !sets.some((s) => s.setNumber === nextSetNum)) {
      sets.push({
        setNumber: nextSetNum,
        scoreA: 0,
        scoreB: 0,
        status: 'LIVE',
      });
    }
  }

  const updatedMatch: DomainMatch = {
    ...match,
    status: newStatus as any,
    sets,
    currentSet: nextSetNum,
    setsWonA,
    setsWonB,
    scoreA: setsWonA,
    scoreB: setsWonB,
    winnerId: winnerId || match.winnerId,
    loserId: loserId || match.loserId,
  };

  return {
    match: updatedMatch,
    setCompleted,
    matchCompleted: isMatchCompleted,
    errors: [],
  };
}

/**
 * Manually adjusts score for the active live set (e.g. correcting a referee mistake).
 * Does not allow negative scores.
 */
export function adjustLiveScore(
  match: DomainMatch,
  side: 'A' | 'B',
  delta: number
): { match: DomainMatch; errors: string[] } {
  if (match.status === 'COMPLETED' || match.status === 'BYE_ADVANCEMENT') {
    return { match, errors: ['Cannot adjust score: match is completed.'] };
  }

  const sets: SetScore[] = (match.sets || []).map((s) => ({ ...s }));
  const currentSetNum = match.currentSet || 1;
  const activeSet = sets.find((s) => s.setNumber === currentSetNum);

  if (!activeSet) {
    return { match, errors: [`Set ${currentSetNum} not found.`] };
  }

  if (activeSet.status === 'COMPLETED') {
    return { match, errors: [`Cannot adjust score on completed Set ${currentSetNum}.`] };
  }

  if (side === 'A') {
    const newScore = activeSet.scoreA + delta;
    if (newScore < 0) return { match, errors: ['Score cannot be negative.'] };
    activeSet.scoreA = newScore;
  } else {
    const newScore = activeSet.scoreB + delta;
    if (newScore < 0) return { match, errors: ['Score cannot be negative.'] };
    activeSet.scoreB = newScore;
  }

  return {
    match: {
      ...match,
      sets,
    },
    errors: [],
  };
}

/**
 * Completes a Throwball match with authoritative set scores.
 * Enforces best of 3, 15 rally points, winner won 2 sets.
 */
export function completeThrowballMatchWithSets(
  match: DomainMatch,
  sets: SetScore[]
): { match: DomainMatch; winnerId: string; loserId: string; errors: string[] } {
  const teamAId = match.participantA.type === 'TEAM' ? match.participantA.teamId : null;
  const teamBId = match.participantB.type === 'TEAM' ? match.participantB.teamId : null;

  if (!teamAId || !teamBId) {
    return {
      match,
      winnerId: '',
      loserId: '',
      errors: ['Cannot complete match: participants are not fully resolved teams.'],
    };
  }

  const validation = validateMatchSets(sets, teamAId, teamBId);
  if (!validation.valid || !validation.winnerId || !validation.loserId) {
    return {
      match,
      winnerId: '',
      loserId: '',
      errors: validation.errors.length > 0 ? validation.errors : ['Match has no winning team.'],
    };
  }

  const updatedMatch: DomainMatch = {
    ...match,
    status: 'COMPLETED',
    sets,
    setsWonA: validation.setsWonA,
    setsWonB: validation.setsWonB,
    scoreA: validation.setsWonA,
    scoreB: validation.setsWonB,
    winnerId: validation.winnerId,
    loserId: validation.loserId,
  };

  return {
    match: updatedMatch,
    winnerId: validation.winnerId,
    loserId: validation.loserId,
    errors: [],
  };
}

/**
 * Records a substitution in compliance with authoritative Throwball rules:
 * - One player substituted at a time.
 * - Allowed when it is that team's turn to serve, except in case of injury.
 * - Maximum 3 substitutions per team per set.
 * - 4th substitution in the same set MUST BE REJECTED.
 * - Substitution count resets for the next set.
 * - Does NOT alter permanent team roster.
 */
export function recordSubstitution(
  match: DomainMatch,
  sub: {
    setNumber: number;
    teamId: string;
    outgoingPlayerId: string;
    incomingPlayerId: string;
    reason: 'NORMAL' | 'INJURY';
    id?: string;
    timestamp?: string;
  }
): { match: DomainMatch; event: SubstitutionEvent; errors: string[] } {
  const errors: string[] = [];

  if (match.status === 'COMPLETED' || match.status === 'BYE_ADVANCEMENT') {
    errors.push('Cannot perform substitution on a completed match.');
  }

  const substitutions = match.substitutions || [];
  const subsInCurrentSet = substitutions.filter(
    (s) => s.setNumber === sub.setNumber && s.teamId === sub.teamId
  );

  if (subsInCurrentSet.length >= THROWBALL_SCORING_RULES.maxSubstitutionsPerTeamPerSet) {
    errors.push(
      `Substitution limit reached: maximum ${THROWBALL_SCORING_RULES.maxSubstitutionsPerTeamPerSet} substitutions allowed per team per set.`
    );
  }

  // Service turn check: if NORMAL substitution and servingTeamId is set, must be team's turn to serve
  if (sub.reason === 'NORMAL' && match.servingTeamId && match.servingTeamId !== sub.teamId) {
    errors.push('Normal substitution is only allowed when it is that team’s turn to serve (injury is the only exception).');
  }

  // Outgoing must differ from incoming
  if (sub.outgoingPlayerId === sub.incomingPlayerId) {
    errors.push('Outgoing player and incoming player cannot be the same.');
  }

  if (errors.length > 0) {
    return {
      match,
      event: {} as SubstitutionEvent,
      errors,
    };
  }

  const event: SubstitutionEvent = {
    id: sub.id || `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    matchId: match.id,
    setNumber: sub.setNumber,
    teamId: sub.teamId,
    outgoingPlayerId: sub.outgoingPlayerId,
    incomingPlayerId: sub.incomingPlayerId,
    reason: sub.reason,
    timestamp: sub.timestamp || new Date().toISOString(),
  };

  const updatedMatch: DomainMatch = {
    ...match,
    substitutions: [...substitutions, event],
  };

  return {
    match: updatedMatch,
    event,
    errors: [],
  };
}

/**
 * Records a timeout in compliance with authoritative Throwball rules:
 * - 2 timeouts per team per set.
 * - Each timeout is 3 minutes.
 * - 3rd timeout in the same set MUST BE REJECTED.
 * - Timeout count resets for the next set.
 * - Unused timeouts do not carry over between sets.
 */
export function recordTimeout(
  match: DomainMatch,
  timeout: {
    setNumber: number;
    teamId: string;
    id?: string;
    timestamp?: string;
  }
): { match: DomainMatch; event: TimeoutEvent; errors: string[] } {
  const errors: string[] = [];

  if (match.status === 'COMPLETED' || match.status === 'BYE_ADVANCEMENT') {
    errors.push('Cannot call timeout on a completed match.');
  }

  const timeouts = match.timeouts || [];
  const timeoutsInCurrentSet = timeouts.filter(
    (t) => t.setNumber === timeout.setNumber && t.teamId === timeout.teamId
  );

  if (timeoutsInCurrentSet.length >= THROWBALL_SCORING_RULES.maxTimeoutsPerTeamPerSet) {
    errors.push(
      `Timeout limit reached: maximum ${THROWBALL_SCORING_RULES.maxTimeoutsPerTeamPerSet} timeouts allowed per team per set.`
    );
  }

  if (errors.length > 0) {
    return {
      match,
      event: {} as TimeoutEvent,
      errors,
    };
  }

  const event: TimeoutEvent = {
    id: timeout.id || `to-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    matchId: match.id,
    setNumber: timeout.setNumber,
    teamId: timeout.teamId,
    durationMinutes: THROWBALL_SCORING_RULES.timeoutDurationMinutes,
    timestamp: timeout.timestamp || new Date().toISOString(),
  };

  const updatedMatch: DomainMatch = {
    ...match,
    timeouts: [...timeouts, event],
  };

  return {
    match: updatedMatch,
    event,
    errors: [],
  };
}
