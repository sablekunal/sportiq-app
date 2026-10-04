import { DomainMatch, MatchResult, TournamentRules, MatchParticipant } from '../models/types';

export interface ProcessResultOutput {
  updatedMatches: DomainMatch[];
  errors: string[];
}

/**
 * Validates a match result, determines the outcome, marks the match COMPLETED,
 * preserves actual set scores, and recursively resolves downstream dependencies.
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

  if (
    match.status === 'COMPLETED' &&
    match.scoreA === result.scoreA &&
    match.scoreB === result.scoreB &&
    (!result.sets || JSON.stringify(match.sets) === JSON.stringify(result.sets))
  ) {
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

  if (result.isWalkover && result.winnerId) {
    winnerId = result.winnerId;
    loserId = match.participantA.type === 'TEAM' && match.participantA.teamId === winnerId
      ? (match.participantB.type === 'TEAM' ? match.participantB.teamId : null)
      : (match.participantA.type === 'TEAM' ? match.participantA.teamId : null);
  } else if (result.scoreA > result.scoreB) {
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
  if (result.sets) {
    match.sets = result.sets;
    // Derive sets won if applicable
    const teamAId = match.participantA.type === 'TEAM' ? match.participantA.teamId : null;
    const teamBId = match.participantB.type === 'TEAM' ? match.participantB.teamId : null;
    if (teamAId && teamBId) {
      match.setsWonA = result.sets.filter((s) => s.status === 'COMPLETED' && (s.winnerId === teamAId || s.scoreA > s.scoreB)).length;
      match.setsWonB = result.sets.filter((s) => s.status === 'COMPLETED' && (s.winnerId === teamBId || s.scoreB > s.scoreA)).length;
    }
  }
  match.status = result.isWalkover ? 'WALKOVER' : 'COMPLETED';
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
  setsWon: number;
  setsLost: number;
  setDifference: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  isTied?: boolean;
}

/**
 * Computes group standings from normalized domain matches using the deterministic 6-tier tie-breaking policy.
 * Matches must be COMPLETED or BYE_ADVANCEMENT to count.
 *
 * Deterministic Hierarchy:
 * 1. MATCH WINS
 * 2. SET DIFFERENCE (SW - SL)
 * 3. POINT DIFFERENCE (PF - PA)
 * 4. POINTS FOR (PF)
 * 5. HEAD-TO-HEAD (completed direct encounter between tied teams)
 * 6. DETERMINISTIC NON-SPORTING FALLBACK (teamId stable sort, never random)
 */
export function computeGroupStandings(
  groupMatches: DomainMatch[],
  rules?: TournamentRules
): GroupStandingSummary[] {
  const map = new Map<string, GroupStandingSummary>();

  const getOrCreate = (teamId: string) => {
    let s = map.get(teamId);
    if (!s) {
      s = {
        teamId,
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
        scored: 0,
        conceded: 0,
        difference: 0,
        points: 0,
        setsWon: 0,
        setsLost: 0,
        setDifference: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifference: 0,
        isTied: false,
      };
      map.set(teamId, s);
    }
    return s;
  };

  const winPoints = rules?.pointsForWin ?? rules?.winPoints ?? 2;
  const drawPoints = rules?.pointsForDraw ?? rules?.drawPoints ?? 1;
  const lossPoints = rules?.pointsForLoss ?? rules?.lossPoints ?? 0;
  const allowDraws = Boolean(rules?.allowDraws);

  const completedMatches = groupMatches.filter(
    (m) =>
      (m.status === 'COMPLETED' || m.status === 'BYE_ADVANCEMENT' || m.status === 'WALKOVER') &&
      m.participantA.type === 'TEAM' &&
      m.participantB.type === 'TEAM'
  );

  for (const m of completedMatches) {
    const teamA = (m.participantA as { type: 'TEAM'; teamId: string }).teamId;
    const teamB = (m.participantB as { type: 'TEAM'; teamId: string }).teamId;

    const stA = getOrCreate(teamA);
    const stB = getOrCreate(teamB);

    stA.played += 1;
    stB.played += 1;

    // Match outcome
    if (m.status === 'WALKOVER') {
      if (m.winnerId === teamA) {
        stA.won += 1;
        stA.points += 2;
        stB.lost += 1;
        stB.points += 0;
      } else if (m.winnerId === teamB) {
        stB.won += 1;
        stB.points += 2;
        stA.lost += 1;
        stA.points += 0;
      }
    } else {
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

    // Set & point breakdown
    if (m.sets && m.sets.length > 0) {
      for (const set of m.sets) {
        if (set.status !== 'COMPLETED') continue;

        stA.pointsFor += set.scoreA;
        stA.pointsAgainst += set.scoreB;
        stB.pointsFor += set.scoreB;
        stB.pointsAgainst += set.scoreA;

        if (set.winnerId === teamA || set.scoreA > set.scoreB) {
          stA.setsWon += 1;
          stB.setsLost += 1;
        } else if (set.winnerId === teamB || set.scoreB > set.scoreA) {
          stB.setsWon += 1;
          stA.setsLost += 1;
        }
      }
    } else {
      // Direct scores (legacy or point-based matches)
      stA.scored += m.scoreA;
      stA.conceded += m.scoreB;
      stB.scored += m.scoreB;
      stB.conceded += m.scoreA;

      stA.setsWon += m.scoreA;
      stA.setsLost += m.scoreB;
      stB.setsWon += m.scoreB;
      stB.setsLost += m.scoreA;

      stA.pointsFor += m.scoreA;
      stA.pointsAgainst += m.scoreB;
      stB.pointsFor += m.scoreB;
      stB.pointsAgainst += m.scoreA;
    }
  }

  const list = Array.from(map.values());
  list.forEach((s) => {
    s.difference = s.scored - s.conceded;
    s.setDifference = s.setsWon - s.setsLost;
    s.pointDifference = s.pointsFor - s.pointsAgainst;
  });

  // Apply deterministic 6-tier tie-breaking policy
  list.sort((a, b) => {
    // 1. MATCH WINS
    if (b.won !== a.won) return b.won - a.won;

    // 2. SET DIFFERENCE
    if (b.setDifference !== a.setDifference) return b.setDifference - a.setDifference;

    // 3. POINT DIFFERENCE
    if (b.pointDifference !== a.pointDifference) return b.pointDifference - a.pointDifference;

    // 4. POINTS FOR
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;

    // 5. HEAD-TO-HEAD
    const directMatch = completedMatches.find((m) => {
      const pA = (m.participantA as any).teamId;
      const pB = (m.participantB as any).teamId;
      return (pA === a.teamId && pB === b.teamId) || (pA === b.teamId && pB === a.teamId);
    });

    if (directMatch && directMatch.winnerId) {
      if (directMatch.winnerId === a.teamId) return -1;
      if (directMatch.winnerId === b.teamId) return 1;
    }

    // 6. DETERMINISTIC FALLBACK (never random)
    return a.teamId.localeCompare(b.teamId);
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
  if (!sourceMatch || (sourceMatch.status !== 'COMPLETED' && sourceMatch.status !== 'BYE_ADVANCEMENT' && sourceMatch.status !== 'WALKOVER')) return;

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

    // Group must be completely finished before resolving qualifiers
    const isGroupComplete =
      groupMatches.length > 0 &&
      groupMatches.every((m) => m.status === 'COMPLETED' || m.status === 'BYE_ADVANCEMENT' || m.status === 'WALKOVER');

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
