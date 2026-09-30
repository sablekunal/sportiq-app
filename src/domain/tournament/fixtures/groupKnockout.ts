import { DomainMatch, MatchDependency, MatchParticipant } from '../models/types';

/**
 * The authoritative canonical pairings for a 4-team group.
 * Matches 1-3: Position 1 plays Positions 2, 3, 4
 * Matches 4-5: Position 2 plays Positions 3, 4
 * Match 6:     Position 3 plays Position 4
 */
export const FOUR_TEAM_GROUP_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 2], // Match 1: Position 1 vs Position 2
  [1, 3], // Match 2: Position 1 vs Position 3
  [1, 4], // Match 3: Position 1 vs Position 4
  [2, 3], // Match 4: Position 2 vs Position 3
  [2, 4], // Match 5: Position 2 vs Position 4
  [3, 4], // Match 6: Position 3 vs Position 4
];

export interface GroupFixtureOptions {
  tournamentId: string;
  stageId?: string;
  groupId: string; // "A", "B", "C", "D"
  positions?: (string | null | undefined)[]; // Optional teamId for positions 1, 2, 3, 4
  startingFixtureNumber?: number; // 1-based global fixture sequence
}

/**
 * Generates the authoritative 6 fixtures for a single 4-team group
 * in the exact required sequence:
 *   1. P1 vs P2 (Group-M1)
 *   2. P1 vs P3 (Group-M2)
 *   3. P1 vs P4 (Group-M3)
 *   4. P2 vs P3 (Group-M4)
 *   5. P2 vs P4 (Group-M5)
 *   6. P3 vs P4 (Group-M6)
 */
export function generateOrdered4TeamGroupFixtures({
  tournamentId,
  stageId = 'group-stage',
  groupId,
  positions = [],
  startingFixtureNumber = 1,
}: GroupFixtureOptions): DomainMatch[] {
  const matches: DomainMatch[] = [];

  for (let i = 0; i < FOUR_TEAM_GROUP_PAIRS.length; i++) {
    const [posA, posB] = FOUR_TEAM_GROUP_PAIRS[i];
    const matchNumber = i + 1; // 1 to 6
    const matchCode = `${groupId}-M${matchNumber}`;
    const matchId = `m-${stageId}-${groupId}-m${matchNumber}`;

    const teamIdA = positions[posA - 1];
    const teamIdB = positions[posB - 1];

    const participantA: MatchParticipant = teamIdA
      ? { type: 'TEAM', teamId: teamIdA }
      : { type: 'TBD', label: `${groupId}${posA}` };

    const participantB: MatchParticipant = teamIdB
      ? { type: 'TEAM', teamId: teamIdB }
      : { type: 'TBD', label: `${groupId}${posB}` };

    matches.push({
      id: matchId,
      tournamentId,
      stageId,
      groupId,
      round: matchNumber,
      position: i,
      fixtureNumber: startingFixtureNumber + i,
      matchCode,
      groupPositionA: posA,
      groupPositionB: posB,
      roundName: `Group ${groupId}`,
      participantA,
      participantB,
      dependencies: [],
      scoreA: 0,
      scoreB: 0,
      status: 'SCHEDULED',
      winnerId: null,
      loserId: null,
    });
  }

  return matches;
}

export interface FourGroupTournamentOptions {
  tournamentId: string;
  stageId?: string;
  groupAssignments?: Record<string, (string | null | undefined)[]>; // e.g. { A: [id1, id2, id3, id4], B: [...] }
}

/**
 * Generates the complete 27-match authoritative St. Xavier's tournament:
 * - 24 Group Stage matches:
 *     Group A: A-M1 to A-M6 (Fixtures 1-6)
 *     Group B: B-M1 to B-M6 (Fixtures 7-12)
 *     Group C: C-M1 to C-M6 (Fixtures 13-18)
 *     Group D: D-M1 to D-M6 (Fixtures 19-24)
 * - 2 Semifinal matches:
 *     SF 1: Winner Group A vs Winner Group B (Fixture 25, SF-M1)
 *     SF 2: Winner Group C vs Winner Group D (Fixture 26, SF-M2)
 * - 1 Final match:
 *     Final: Winner SF1 vs Winner SF2 (Fixture 27, F-M1)
 */
export function generateFourGroupTournament({
  tournamentId,
  stageId = 'st-xaviers',
  groupAssignments = {},
}: FourGroupTournamentOptions): DomainMatch[] {
  const allMatches: DomainMatch[] = [];
  const groups = ['A', 'B', 'C', 'D'] as const;

  // 1. Generate Group Stage (24 matches)
  groups.forEach((groupId, groupIdx) => {
    const groupMatches = generateOrdered4TeamGroupFixtures({
      tournamentId,
      stageId,
      groupId,
      positions: groupAssignments[groupId] || [],
      startingFixtureNumber: groupIdx * 6 + 1,
    });
    allMatches.push(...groupMatches);
  });

  // 2. Semifinal 1: Winner Group A vs Winner Group B
  const sf1Id = `m-${stageId}-sf-m1`;
  const sf1Deps: MatchDependency[] = [
    { sourceGroupId: 'A', rank: 1, targetSlot: 'A' },
    { sourceGroupId: 'B', rank: 1, targetSlot: 'B' },
  ];
  allMatches.push({
    id: sf1Id,
    tournamentId,
    stageId,
    round: 1,
    position: 0,
    fixtureNumber: 25,
    matchCode: 'SF-M1',
    roundName: 'Semi-final 1',
    participantA: { type: 'TBD', label: 'Winner Group A' },
    participantB: { type: 'TBD', label: 'Winner Group B' },
    dependencies: sf1Deps,
    scoreA: 0,
    scoreB: 0,
    status: 'SCHEDULED',
    winnerId: null,
    loserId: null,
  });

  // 3. Semifinal 2: Winner Group C vs Winner Group D
  const sf2Id = `m-${stageId}-sf-m2`;
  const sf2Deps: MatchDependency[] = [
    { sourceGroupId: 'C', rank: 1, targetSlot: 'A' },
    { sourceGroupId: 'D', rank: 1, targetSlot: 'B' },
  ];
  allMatches.push({
    id: sf2Id,
    tournamentId,
    stageId,
    round: 1,
    position: 1,
    fixtureNumber: 26,
    matchCode: 'SF-M2',
    roundName: 'Semi-final 2',
    participantA: { type: 'TBD', label: 'Winner Group C' },
    participantB: { type: 'TBD', label: 'Winner Group D' },
    dependencies: sf2Deps,
    scoreA: 0,
    scoreB: 0,
    status: 'SCHEDULED',
    winnerId: null,
    loserId: null,
  });

  // 4. Final: Winner Semi-final 1 vs Winner Semi-final 2
  const finalId = `m-${stageId}-f-m1`;
  const finalDeps: MatchDependency[] = [
    { sourceMatchId: sf1Id, outcome: 'WINNER', targetSlot: 'A' },
    { sourceMatchId: sf2Id, outcome: 'WINNER', targetSlot: 'B' },
  ];
  allMatches.push({
    id: finalId,
    tournamentId,
    stageId,
    round: 2,
    position: 0,
    fixtureNumber: 27,
    matchCode: 'F-M1',
    roundName: 'Final',
    participantA: { type: 'TBD', label: 'Winner Semi-final 1' },
    participantB: { type: 'TBD', label: 'Winner Semi-final 2' },
    dependencies: finalDeps,
    scoreA: 0,
    scoreB: 0,
    status: 'SCHEDULED',
    winnerId: null,
    loserId: null,
  });

  return allMatches;
}

/**
 * Checks whether competition in group stage has started.
 * Once any group match is LIVE, COMPLETED, or has scores, assignments are strictly locked.
 */
export function isGroupAssignmentLocked(matches: DomainMatch[]): boolean {
  return matches.some(
    (m) =>
      Boolean(m.groupId) &&
      (m.status === 'LIVE' || m.status === 'COMPLETED' || m.scoreA > 0 || m.scoreB > 0)
  );
}

/**
 * Re-assigns or updates a team at a specific position slot in a group
 * without altering fixture order, IDs, or other matches.
 * Guards against modification once group competition has commenced.
 */
export function assignTeamToGroupPosition(
  matches: DomainMatch[],
  groupId: string,
  position: number,
  teamId: string | null
): DomainMatch[] {
  if (isGroupAssignmentLocked(matches)) {
    throw new Error('Cannot modify group assignments: competition has already begun.');
  }

  // Find if teamId is currently assigned to a different position in this group
  let oldPosition: number | null = null;
  if (teamId) {
    for (const m of matches) {
      if (m.groupId === groupId) {
        if (m.participantA.type === 'TEAM' && m.participantA.teamId === teamId && m.groupPositionA !== position) {
          oldPosition = m.groupPositionA ?? null;
          break;
        }
        if (m.participantB.type === 'TEAM' && m.participantB.teamId === teamId && m.groupPositionB !== position) {
          oldPosition = m.groupPositionB ?? null;
          break;
        }
      }
    }
  }

  return matches.map((match) => {
    if (match.groupId !== groupId) return match;

    let updatedA = match.participantA;
    let updatedB = match.participantB;

    // Vacate old position if moving team from another slot in same group
    if (oldPosition !== null) {
      if (match.groupPositionA === oldPosition) {
        updatedA = { type: 'TBD', label: `${groupId}${oldPosition}` };
      }
      if (match.groupPositionB === oldPosition) {
        updatedB = { type: 'TBD', label: `${groupId}${oldPosition}` };
      }
    }

    if (match.groupPositionA === position) {
      updatedA = teamId
        ? { type: 'TEAM', teamId }
        : { type: 'TBD', label: `${groupId}${position}` };
    }

    if (match.groupPositionB === position) {
      updatedB = teamId
        ? { type: 'TEAM', teamId }
        : { type: 'TBD', label: `${groupId}${position}` };
    }

    return {
      ...match,
      participantA: updatedA,
      participantB: updatedB,
    };
  });
}

/**
 * Bulk updates group position assignments across all groups.
 */
export function applyGroupAssignments(
  matches: DomainMatch[],
  assignments: Record<string, (string | null | undefined)[]>
): DomainMatch[] {
  let updated = [...matches];
  for (const [groupId, positions] of Object.entries(assignments)) {
    positions.forEach((teamId, idx) => {
      const positionNumber = idx + 1;
      updated = assignTeamToGroupPosition(updated, groupId, positionNumber, teamId || null);
    });
  }
  return updated;
}
