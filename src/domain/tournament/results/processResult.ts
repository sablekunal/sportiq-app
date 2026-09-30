import { DomainMatch, MatchResult, TournamentRules, MatchParticipant } from '../models/types';

export interface ProcessResultOutput {
  updatedMatches: DomainMatch[];
  errors: string[];
}

/**
 * Validates a match result, determines the outcome, marks the match COMPLETED,
 * and recursively resolves downstream dependencies.
 */
export function processMatchResult(
  allMatches: DomainMatch[],
  matchId: string,
  result: MatchResult,
  rules: TournamentRules
): ProcessResultOutput {
  const matchesMap = new Map<string, DomainMatch>(allMatches.map((m) => [m.id, { ...m }]));
  const match = matchesMap.get(matchId);

  if (!match) {
    return { updatedMatches: allMatches, errors: ['Match not found'] };
  }

  if (match.status === 'COMPLETED' && match.scoreA === result.scoreA && match.scoreB === result.scoreB) {
    // Idempotency: same result submitted again, do nothing.
    return { updatedMatches: allMatches, errors: [] };
  }

  // Validate state
  if (match.participantA.type !== 'TEAM' || match.participantB.type !== 'TEAM') {
    if (match.participantB.type !== 'BYE') {
      return { updatedMatches: allMatches, errors: ['Match participants are not fully resolved.'] };
    }
  }

  // Determine winner/loser
  let winnerId: string | null = null;
  let loserId: string | null = null;

  if (result.scoreA > result.scoreB) {
    winnerId = match.participantA.type === 'TEAM' ? match.participantA.teamId : null;
    loserId = match.participantB.type === 'TEAM' ? match.participantB.teamId : null;
  } else if (result.scoreB > result.scoreA) {
    winnerId = match.participantB.type === 'TEAM' ? match.participantB.teamId : null;
    loserId = match.participantA.type === 'TEAM' ? match.participantA.teamId : null;
  } else {
    if (!rules.allowDraws) {
      return { updatedMatches: allMatches, errors: ['Draws are not allowed by tournament rules.'] };
    }
  }

  // Update match
  match.scoreA = result.scoreA;
  match.scoreB = result.scoreB;
  match.status = 'COMPLETED';
  match.winnerId = winnerId;
  match.loserId = loserId;

  // Propagate to downstream
  propagateOutcomes(matchesMap, match.id);

  return {
    updatedMatches: Array.from(matchesMap.values()),
    errors: [],
  };
}

/**
 * Automatically propagates outcomes of a resolved match to any matches that depend on it.
 * This function modifies the matches inside the matchesMap directly.
 */
export function propagateOutcomes(matchesMap: Map<string, DomainMatch>, sourceMatchId: string) {
  const sourceMatch = matchesMap.get(sourceMatchId);
  if (!sourceMatch || (sourceMatch.status !== 'COMPLETED' && sourceMatch.status !== 'BYE_ADVANCEMENT')) return;

  for (const match of matchesMap.values()) {
    let updated = false;
    for (const dep of (match.dependencies || [])) {
      if (dep.sourceMatchId === sourceMatchId) {
        // Resolve this dependency
        const resolvingTeamId = dep.outcome === 'WINNER' ? sourceMatch.winnerId : sourceMatch.loserId;
        
        if (resolvingTeamId) {
          const resolvedParticipant: MatchParticipant = { type: 'TEAM', teamId: resolvingTeamId };
          if (dep.targetSlot === 'A') {
            match.participantA = resolvedParticipant;
          } else {
            match.participantB = resolvedParticipant;
          }
          updated = true;
        }
      }
    }
    
    // If this match just became fully resolved, and one of them is a BYE, we auto-complete it!
    if (updated && match.status !== 'COMPLETED' && match.status !== 'BYE_ADVANCEMENT') {
      if (
        match.participantA.type === 'TEAM' &&
        match.participantB.type === 'BYE'
      ) {
        match.status = 'BYE_ADVANCEMENT';
        match.winnerId = match.participantA.teamId;
        propagateOutcomes(matchesMap, match.id);
      } else if (
        match.participantB.type === 'TEAM' &&
        match.participantA.type === 'BYE'
      ) {
        match.status = 'BYE_ADVANCEMENT';
        match.winnerId = match.participantB.teamId;
        propagateOutcomes(matchesMap, match.id);
      }
    }
  }
}
