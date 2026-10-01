import { DomainMatch } from '../models/types';
import { Standing, Team, Match } from '../../../types';

export interface ThrowballTeamStats {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  groupId?: string;
  played: number;
  won: number;
  lost: number;
  draw: number;
  setsWon: number;
  setsLost: number;
  setDifference: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  points: number; // 2 pts per win
  rank: number;
  qualified: boolean;
  isTied: boolean;
  tieBreakReason?: string;
}

function getMatchTeamAId(m: any): string | null {
  if (m.participantA?.type === 'TEAM') return m.participantA.teamId;
  if (m.homeTeamId) return m.homeTeamId;
  return null;
}

function getMatchTeamBId(m: any): string | null {
  if (m.participantB?.type === 'TEAM') return m.participantB.teamId;
  if (m.awayTeamId) return m.awayTeamId;
  return null;
}

/**
 * Calculates Throwball standings for a single group or set of teams.
 * Derives stats purely from completed matches:
 * - Matches Played (P)
 * - Matches Won (W)
 * - Matches Lost (L)
 * - Sets Won (SW)
 * - Sets Lost (SL)
 * - Set Difference (SD = SW - SL)
 * - Points For (PF)
 * - Points Against (PA)
 * - Point Difference (PD = PF - PA)
 * - Points (2 pts per win)
 *
 * Deterministic Tie-Break Hierarchy (Configured SportIQ Policy):
 * 1. MATCH WINS
 * 2. SET DIFFERENCE
 * 3. POINT DIFFERENCE
 * 4. POINTS FOR
 * 5. HEAD-TO-HEAD RESULT (where applicable between tied teams in completed direct group match)
 * 6. DETERMINISTIC NON-SPORTING FALLBACK (never random, flags isTied if completely equal)
 */
export function calculateThrowballGroupStandings(
  groupMatches: (DomainMatch | Match)[],
  teams: Team[],
  groupId?: string
): ThrowballTeamStats[] {
  // 1. Filter teams belonging to this group
  const targetTeams = groupId
    ? teams.filter((t) => t.groupId === groupId)
    : teams;

  const statsMap = new Map<string, ThrowballTeamStats>();

  targetTeams.forEach((t) => {
    statsMap.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      teamLogo: t.logoUrl,
      groupId: t.groupId || groupId,
      played: 0,
      won: 0,
      lost: 0,
      draw: 0,
      setsWon: 0,
      setsLost: 0,
      setDifference: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifference: 0,
      points: 0,
      rank: 0,
      qualified: false,
      isTied: false,
    });
  });

  // 2. Accumulate stats from completed group matches
  const completedMatches = groupMatches.filter(
    (m) =>
      (m.status === 'COMPLETED' || m.status === 'BYE_ADVANCEMENT') &&
      (!groupId || m.groupId === groupId)
  );

  for (const match of completedMatches) {
    const teamA = getMatchTeamAId(match);
    const teamB = getMatchTeamBId(match);

    if (!teamA || !teamB) continue;

    const statsA = statsMap.get(teamA);
    const statsB = statsMap.get(teamB);

    if (!statsA || !statsB) continue;

    statsA.played += 1;
    statsB.played += 1;

    // Match outcome
    if (match.winnerId === teamA) {
      statsA.won += 1;
      statsA.points += 2;
      statsB.lost += 1;
    } else if (match.winnerId === teamB) {
      statsB.won += 1;
      statsB.points += 2;
      statsA.lost += 1;
    }

    // Set & Rally point statistics
    const matchSets = match.sets;
    if (matchSets && matchSets.length > 0) {
      // Detailed set model available
      for (const set of matchSets) {
        if (set.status !== 'COMPLETED') continue;

        statsA.pointsFor += set.scoreA;
        statsA.pointsAgainst += set.scoreB;
        statsB.pointsFor += set.scoreB;
        statsB.pointsAgainst += set.scoreA;

        if (set.winnerId === teamA || set.scoreA > set.scoreB) {
          statsA.setsWon += 1;
          statsB.setsLost += 1;
        } else if (set.winnerId === teamB || set.scoreB > set.scoreA) {
          statsB.setsWon += 1;
          statsA.setsLost += 1;
        }
      }
    } else {
      // Fallback if sets not explicitly populated
      const scoreA = (match as any).scoreA ?? (match as any).homeScore ?? 0;
      const scoreB = (match as any).scoreB ?? (match as any).awayScore ?? 0;
      statsA.setsWon += scoreA;
      statsA.setsLost += scoreB;
      statsB.setsWon += scoreB;
      statsB.setsLost += scoreA;

      statsA.pointsFor += scoreA;
      statsA.pointsAgainst += scoreB;
      statsB.pointsFor += scoreB;
      statsB.pointsAgainst += scoreA;
    }
  }

  // 3. Compute derived differentials
  const list = Array.from(statsMap.values());
  list.forEach((st) => {
    st.setDifference = st.setsWon - st.setsLost;
    st.pointDifference = st.pointsFor - st.pointsAgainst;
  });

  // 4. Deterministic sorting hierarchy
  list.sort((a, b) => {
    // Tier 1: MATCH WINS
    if (b.won !== a.won) {
      return b.won - a.won;
    }

    // Tier 2: SET DIFFERENCE
    if (b.setDifference !== a.setDifference) {
      return b.setDifference - a.setDifference;
    }

    // Tier 3: POINT DIFFERENCE
    if (b.pointDifference !== a.pointDifference) {
      return b.pointDifference - a.pointDifference;
    }

    // Tier 4: POINTS FOR
    if (b.pointsFor !== a.pointsFor) {
      return b.pointsFor - a.pointsFor;
    }

    // Tier 5: HEAD-TO-HEAD (direct encounter between the tied teams in group stage)
    const directMatch = completedMatches.find((m) => {
      const pA = getMatchTeamAId(m);
      const pB = getMatchTeamBId(m);
      return (pA === a.teamId && pB === b.teamId) || (pA === b.teamId && pB === a.teamId);
    });

    if (directMatch && directMatch.winnerId) {
      if (directMatch.winnerId === a.teamId) return -1;
      if (directMatch.winnerId === b.teamId) return 1;
    }

    // Tier 6: Deterministic non-sporting fallback (alphabetical / teamId)
    // NEVER random!
    return a.teamName.localeCompare(b.teamName) || a.teamId.localeCompare(b.teamId);
  });

  // 5. Detect and flag unresolved ties & assign ranks
  for (let i = 0; i < list.length; i++) {
    list[i].rank = i + 1;
    // Group winner (#1) qualifies for Semifinal
    list[i].qualified = i === 0;

    // Check if tied with adjacent team
    if (i > 0) {
      const prev = list[i - 1];
      const isCompletelyTied =
        prev.won === list[i].won &&
        prev.setDifference === list[i].setDifference &&
        prev.pointDifference === list[i].pointDifference &&
        prev.pointsFor === list[i].pointsFor;

      if (isCompletelyTied) {
        // Check if head-to-head was decisive
        const directMatch = completedMatches.find((m) => {
          const pA = getMatchTeamAId(m);
          const pB = getMatchTeamBId(m);
          return (pA === prev.teamId && pB === list[i].teamId) || (pA === list[i].teamId && pB === prev.teamId);
        });

        if (!directMatch || !directMatch.winnerId) {
          prev.isTied = true;
          list[i].isTied = true;
          prev.tieBreakReason = 'Unresolved tie (all criteria equal, no decisive head-to-head)';
          list[i].tieBreakReason = 'Unresolved tie (all criteria equal, no decisive head-to-head)';
        }
      }
    }
  }

  return list;
}

/**
 * Calculates independent standings for all 4 groups (A, B, C, D).
 */
export function calculateAllFourGroupStandings(
  matches: (DomainMatch | Match)[],
  teams: Team[]
): Record<'A' | 'B' | 'C' | 'D', ThrowballTeamStats[]> {
  const groups: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
  const result = {} as Record<'A' | 'B' | 'C' | 'D', ThrowballTeamStats[]>;

  for (const grp of groups) {
    const groupMatches = matches.filter((m) => m.groupId === grp);
    result[grp] = calculateThrowballGroupStandings(groupMatches, teams, grp);
  }

  return result;
}

/**
 * Converts ThrowballTeamStats to the standard Standing interface expected across the application.
 */
export function convertThrowballStatsToStandings(stats: ThrowballTeamStats[]): Standing[] {
  return stats.map((st) => ({
    teamId: st.teamId,
    teamName: st.teamName,
    teamLogo: st.teamLogo,
    played: st.played,
    won: st.won,
    draw: 0,
    lost: st.lost,
    points: st.points,
    scored: st.setsWon,
    conceded: st.setsLost,
    difference: st.setDifference,
    groupId: st.groupId,
    setsWon: st.setsWon,
    setsLost: st.setsLost,
    setDifference: st.setDifference,
    pointsFor: st.pointsFor,
    pointsAgainst: st.pointsAgainst,
    pointDifference: st.pointDifference,
    rank: st.rank,
    qualified: st.qualified,
    isTied: st.isTied,
    tieBreakReason: st.tieBreakReason,
  }));
}
