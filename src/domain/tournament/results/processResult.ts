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
  propagateOutcomes(matchesMap, match.id, rules);

  return {
    updatedMatches: Array.from(matchesMap.values()),
    errors: [],
  };
}

export interface GroupStandingSummary {
  teamId: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  scored: number;
  conceded: number;
  difference: number;
  points: number;
}

/**
 * Computes group standings from normalized domain matches.
 * Matches must be COMPLETED to count.
 */
export function computeGroupStandings(
  groupMatches: DomainMatch[],
  rules?: TournamentRules
): GroupStandingSummary[] {
  const map = new Map<string, GroupStandingSummary>();

  const getOrCreate = (teamId: string) => {
    let s = map.get(teamId);
    if (!s) {
      s = { teamId, played: 0, won: 0, draw: 0, lost: 0, scored: 0, conceded: 0, difference: 0, points: 0 };
      map.set(teamId, s);
    }
    return s;
  };

  const winPoints = rules?.pointsForWin ?? rules?.winPoints ?? 2;
  const drawPoints = rules?.pointsForDraw ?? rules?.drawPoints ?? 1;
  const lossPoints = rules?.pointsForLoss ?? rules?.lossPoints ?? 0;
  const allowDraws = Boolean(rules?.allowDraws);

  for (const m of groupMatches) {
    if (m.status !== 'COMPLETED' && m.status !== 'BYE_ADVANCEMENT') continue;
    if (m.participantA.type !== 'TEAM' || m.participantB.type !== 'TEAM') continue;

    const teamA = m.participantA.teamId;
    const teamB = m.participantB.teamId;

    const stA = getOrCreate(teamA);
    const stB = getOrCreate(teamB);

    stA.played += 1;
    stB.played += 1;

    stA.scored += m.scoreA;
    stA.conceded += m.scoreB;
    stB.scored += m.scoreB;
    stB.conceded += m.scoreA;

    if (m.winnerId === teamA) {
      stA.won += 1;
      stA.points += winPoints;
      stB.lost += 1;
      stB.points += lossPoints;
    } else if (m.winnerId === teamB) {
      stB.won += 1;
      stB.points += winPoints;
      stA.lost += 1;
      stA.points += lossPoints;
    } else if (allowDraws) {
      stA.draw += 1;
      stB.draw += 1;
      stA.points += drawPoints;
      stB.points += drawPoints;
    }
  }

  const list = Array.from(map.values());
  list.forEach((s) => {
    s.difference = s.scored - s.conceded;
  });

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.difference !== a.difference) return b.difference - a.difference;
    return b.scored - a.scored;
  });

  return list;
}

/**
 * Automatically propagates outcomes of a resolved match to any matches that depend on it.
 * This function modifies the matches inside the matchesMap directly.
 */
export function propagateOutcomes(
  matchesMap: Map<string, DomainMatch>,
  sourceMatchId: string,
  rules?: TournamentRules
) {
  const sourceMatch = matchesMap.get(sourceMatchId);
  if (!sourceMatch || (sourceMatch.status !== 'COMPLETED' && sourceMatch.status !== 'BYE_ADVANCEMENT')) return;

  // 1. Direct match dependency propagation (e.g. Semifinal -> Final)
  for (const match of matchesMap.values()) {
    let updated = false;
    for (const dep of (match.dependencies || [])) {
      if (dep.sourceMatchId === sourceMatchId) {
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
    
    // Auto-advance if counterpart is a BYE
    if (updated && match.status !== 'COMPLETED' && match.status !== 'BYE_ADVANCEMENT') {
      if (match.participantA.type === 'TEAM' && match.participantB.type === 'BYE') {
        match.status = 'BYE_ADVANCEMENT';
        match.winnerId = match.participantA.teamId;
        propagateOutcomes(matchesMap, match.id, rules);
      } else if (match.participantB.type === 'TEAM' && match.participantA.type === 'BYE') {
        match.status = 'BYE_ADVANCEMENT';
        match.winnerId = match.participantB.teamId;
        propagateOutcomes(matchesMap, match.id, rules);
      }
    }
  }

  // 2. Group qualification propagation (e.g. Group A winner -> SF1 slot A)
  // CRITICAL REQUIREMENT: A group winner is resolved ONLY when all matches of that group are COMPLETED.
  if (sourceMatch.groupId) {
    const groupMatches = Array.from(matchesMap.values()).filter(
      (m) => m.groupId === sourceMatch.groupId
    );

    // Group must be completely finished (e.g. 6 matches for 4-team group) before resolving qualifiers
    const isGroupComplete =
      groupMatches.length >= 6 &&
      groupMatches.every((m) => m.status === 'COMPLETED' || m.status === 'BYE_ADVANCEMENT');

    if (isGroupComplete) {
      const standings = computeGroupStandings(groupMatches, rules);

      for (const match of matchesMap.values()) {
        let updated = false;
        for (const dep of (match.dependencies || [])) {
          if (dep.sourceGroupId === sourceMatch.groupId && dep.rank !== undefined) {
            const qualifyingTeam = standings[dep.rank - 1];
            if (qualifyingTeam) {
              const resolvedParticipant: MatchParticipant = {
                type: 'TEAM',
                teamId: qualifyingTeam.teamId,
              };
              if (dep.targetSlot === 'A') {
                match.participantA = resolvedParticipant;
              } else {
                match.participantB = resolvedParticipant;
              }
              updated = true;
            }
          }
        }

        if (updated && match.status !== 'COMPLETED' && match.status !== 'BYE_ADVANCEMENT') {
          if (match.participantA.type === 'TEAM' && match.participantB.type === 'BYE') {
            match.status = 'BYE_ADVANCEMENT';
            match.winnerId = match.participantA.teamId;
            propagateOutcomes(matchesMap, match.id, rules);
          } else if (match.participantB.type === 'TEAM' && match.participantA.type === 'BYE') {
            match.status = 'BYE_ADVANCEMENT';
            match.winnerId = match.participantB.teamId;
            propagateOutcomes(matchesMap, match.id, rules);
          }
        }
      }
    }
  }
}
