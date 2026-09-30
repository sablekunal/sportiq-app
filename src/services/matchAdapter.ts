import { DomainMatch, MatchParticipant } from '../domain/tournament/models/types';
import { Match } from '../types';

/**
 * Converts a normalized DomainMatch to the legacy Match object expected by the UI.
 * This ensures backwards compatibility without rewriting all UI components immediately.
 */
export function adaptDomainMatchToLegacy(domainMatch: DomainMatch): Match {
  const getTeamId = (participant: MatchParticipant): string | null => {
    if (participant.type === 'TEAM') return participant.teamId;
    return null; // TBD, BYE, or DEPENDENCY
  };

  let roundName = `Round ${domainMatch.round}`;
  // For knockout brackets, a heuristic for round names based on dependencies/rounds could go here.
  // For now, we fallback to a generic name to prevent crashes.

  return {
    id: domainMatch.id,
    tournamentId: domainMatch.tournamentId,
    round: domainMatch.round,
    roundName: roundName,
    position: domainMatch.position,
    stage: domainMatch.groupId ? 'GROUP' : 'KNOCKOUT',
    groupId: domainMatch.groupId,
    homeTeamId: getTeamId(domainMatch.participantA),
    awayTeamId: getTeamId(domainMatch.participantB),
    homeScore: domainMatch.scoreA,
    awayScore: domainMatch.scoreB,
    score: {
      homeScore: domainMatch.scoreA,
      awayScore: domainMatch.scoreB,
      period: domainMatch.status === 'COMPLETED' ? 'Full Time' : undefined
    },
    winnerId: domainMatch.winnerId,
    loserNextMatchId: null, // Unsupported currently
    nextMatchId: null, // Legacy tracking, ignored because Domain dependencies drive the logic
    scheduledAt: domainMatch.scheduledAt || new Date().toISOString(),
    venueId: domainMatch.venueId,
    status: (
      domainMatch.status === 'BYE_ADVANCEMENT' ? 'COMPLETED' : 
      domainMatch.status === 'SCHEDULED' ? 'UPCOMING' : 
      domainMatch.status === 'HALFTIME' ? 'LIVE' :
      domainMatch.status
    ) as any,
    events: [], // Events not mapped purely from DomainMatch yet
  };
}
