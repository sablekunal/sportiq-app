import { DomainMatch, MatchDependency, MatchParticipant } from '../models/types';
import { propagateOutcomes } from '../results/processResult';

export function generateKnockout(
  tournamentId: string,
  stageId: string,
  teamIds: string[]
): DomainMatch[] {
  const numTeams = teamIds.length;
  if (numTeams < 2) return [];

  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numTeams)));
  const totalRounds = Math.log2(bracketSize);
  const byes = bracketSize - numTeams;

  const matchesMap = new Map<string, DomainMatch>();
  
  const currentRoundMatchCount = bracketSize / 2;
  let teamIdx = 0;
  let byesLeft = byes;

  // Generate Round 1 Matches
  for (let i = 0; i < currentRoundMatchCount; i++) {
    let participantA: MatchParticipant = { type: 'TBD' };
    let participantB: MatchParticipant = { type: 'TBD' };

    if (teamIdx < numTeams) {
      participantA = { type: 'TEAM', teamId: teamIds[teamIdx++] };
    }

    if (byesLeft > 0) {
      participantB = { type: 'BYE' };
      byesLeft--;
    } else if (teamIdx < numTeams) {
      participantB = { type: 'TEAM', teamId: teamIds[teamIdx++] };
    }

    const isByeMatch = participantB.type === 'BYE';
    const matchId = `m-${stageId}-r1-p${i}`;
    
    matchesMap.set(matchId, {
      id: matchId,
      tournamentId,
      stageId,
      round: 1,
      position: i,
      participantA,
      participantB,
      dependencies: [],
      scoreA: 0,
      scoreB: 0,
      status: isByeMatch ? 'BYE_ADVANCEMENT' : 'SCHEDULED',
      winnerId: isByeMatch && participantA.type === 'TEAM' ? participantA.teamId : null,
      loserId: null
    });
  }

  // Generate Subsequent Rounds
  let previousRoundCount = currentRoundMatchCount;
  for (let r = 2; r <= totalRounds; r++) {
    const roundMatchCount = previousRoundCount / 2;
    for (let i = 0; i < roundMatchCount; i++) {
      const sourceMatchAId = `m-${stageId}-r${r - 1}-p${i * 2}`;
      const sourceMatchBId = `m-${stageId}-r${r - 1}-p${i * 2 + 1}`;
      
      const dependencies: MatchDependency[] = [
        { sourceMatchId: sourceMatchAId, outcome: 'WINNER', targetSlot: 'A' },
        { sourceMatchId: sourceMatchBId, outcome: 'WINNER', targetSlot: 'B' }
      ];

      const matchId = `m-${stageId}-r${r}-p${i}`;
      matchesMap.set(matchId, {
        id: matchId,
        tournamentId,
        stageId,
        round: r,
        position: i,
        participantA: { type: 'TBD' },
        participantB: { type: 'TBD' },
        dependencies,
        scoreA: 0,
        scoreB: 0,
        status: 'SCHEDULED',
        winnerId: null,
        loserId: null
      });
    }
    previousRoundCount = roundMatchCount;
  }

  // Propagate all initial byes to resolve Round 2 dependencies immediately
  for (const match of matchesMap.values()) {
    if (match.status === 'BYE_ADVANCEMENT' || match.status === 'COMPLETED') {
      propagateOutcomes(matchesMap, match.id);
    }
  }

  return Array.from(matchesMap.values());
}
