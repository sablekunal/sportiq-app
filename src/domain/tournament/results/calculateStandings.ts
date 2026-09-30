import { DomainMatch, TournamentRules } from '../models/types';
import { Standing, Team } from '../../../types';

/**
 * Derives standings from a set of matches purely in-memory.
 */
export function calculateStandings(
  matches: DomainMatch[],
  teams: Team[],
  rules: TournamentRules
): Standing[] {
  const standingsMap = new Map<string, Standing>();

  // Initialize standings for all teams
  teams.forEach(team => {
    standingsMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      teamLogo: team.logoUrl,
      played: 0,
      won: 0,
      draw: 0,
      lost: 0,
      points: 0,
      scored: 0,
      conceded: 0,
      difference: 0,
      groupId: team.groupId,
    });
  });

  const winPoints = rules.winPoints ?? 3;
  const drawPoints = rules.drawPoints ?? 1;
  const lossPoints = rules.lossPoints ?? 0;

  // Process completed matches
  for (const match of matches) {
    if (match.status !== 'COMPLETED' && match.status !== 'BYE_ADVANCEMENT') continue;

    // Determine teams
    const teamA = match.participantA.type === 'TEAM' ? match.participantA.teamId : null;
    const teamB = match.participantB.type === 'TEAM' ? match.participantB.teamId : null;

    if (teamA && standingsMap.has(teamA)) {
      const st = standingsMap.get(teamA)!;
      if (match.status === 'COMPLETED') {
        st.played += 1;
        st.scored += match.scoreA;
        st.conceded += match.scoreB;
        if (match.winnerId === teamA) {
          st.won += 1;
          st.points += winPoints;
        } else if (match.loserId === teamA) {
          st.lost += 1;
          st.points += lossPoints;
        } else if (rules.allowDraws && match.winnerId === null && match.loserId === null) {
          st.draw += 1;
          st.points += drawPoints;
        }
      }
    }

    if (teamB && standingsMap.has(teamB)) {
      const st = standingsMap.get(teamB)!;
      if (match.status === 'COMPLETED') {
        st.played += 1;
        st.scored += match.scoreB;
        st.conceded += match.scoreA;
        if (match.winnerId === teamB) {
          st.won += 1;
          st.points += winPoints;
        } else if (match.loserId === teamB) {
          st.lost += 1;
          st.points += lossPoints;
        } else if (rules.allowDraws && match.winnerId === null && match.loserId === null) {
          st.draw += 1;
          st.points += drawPoints;
        }
      }
    }
  }

  // Final calculation of differences and sorting
  const standings = Array.from(standingsMap.values());
  standings.forEach(st => {
    st.difference = st.scored - st.conceded;
  });

  // Sort by rules.tieBreakers
  // Default simple sort: points -> difference -> scored
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.difference !== a.difference) return b.difference - a.difference;
    return b.scored - a.scored;
  });

  return standings;
}
