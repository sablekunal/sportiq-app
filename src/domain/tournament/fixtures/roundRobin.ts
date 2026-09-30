import { DomainMatch } from '../models/types';

/**
 * Generates a standard Round Robin fixture list for a given set of teams.
 * Uses the circle method to generate rounds.
 */
export function generateRoundRobin(
  tournamentId: string,
  stageId: string,
  teamIds: string[],
  groupId?: string
): DomainMatch[] {
  if (teamIds.length < 2) {
    throw new Error('At least 2 teams are required for a round robin.');
  }

  // If odd number of teams, add a BYE team
  const participants = [...teamIds];
  if (participants.length % 2 !== 0) {
    participants.push('BYE');
  }

  const numTeams = participants.length;
  const numRounds = numTeams - 1;
  const halfSize = numTeams / 2;

  const matches: DomainMatch[] = [];

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < halfSize; i++) {
      const home = participants[i];
      const away = participants[numTeams - 1 - i];

      // If one of the participants is 'BYE', we don't generate a domain match for it.
      // In Round Robin, a bye just means the team rests that round. We don't need to track BYE_ADVANCEMENT
      // because there is no dependency chain in a Round Robin format.
      if (home !== 'BYE' && away !== 'BYE') {
        const isHomeFirst = round % 2 === 0 ? true : i !== 0; // Alternate home/away for the fixed team (index 0)
        
        matches.push({
          id: `m-${stageId}-${groupId ? groupId + '-' : ''}r${round + 1}-p${i}`,
          tournamentId,
          stageId,
          groupId,
          round: round + 1,
          position: i,
          participantA: { type: 'TEAM', teamId: isHomeFirst ? home : away },
          participantB: { type: 'TEAM', teamId: isHomeFirst ? away : home },
          scoreA: 0,
          scoreB: 0,
          status: 'SCHEDULED',
          winnerId: null,
          loserId: null,
          dependencies: []
        });
      }
    }

    // Rotate array: keep index 0 fixed, rotate the rest clockwise
    participants.splice(1, 0, participants.pop() as string);
  }

  return matches;
}
