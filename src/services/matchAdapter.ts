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

  const getPlaceholder = (participant: MatchParticipant): string | undefined => {
    if (participant.type === 'TBD') return participant.label;
    if (participant.type === 'BYE') return 'BYE';
    return undefined;
  };

  let roundName = domainMatch.roundName || `Round ${domainMatch.round}`;
  if (domainMatch.groupId) {
    roundName = `Group ${domainMatch.groupId} - ${domainMatch.matchCode || `M${domainMatch.round}`}`;
  } else if (domainMatch.matchCode === 'SF-M1') {
    roundName = 'Semi-final 1';
  } else if (domainMatch.matchCode === 'SF-M2') {
    roundName = 'Semi-final 2';
  } else if (domainMatch.matchCode === 'F-M1' || domainMatch.roundName === 'Final') {
    roundName = 'Championship Final 🏆';
  }

  const stage = domainMatch.groupId
    ? 'GROUP'
    : domainMatch.matchCode === 'F-M1' || domainMatch.roundName === 'Final'
    ? 'FINAL'
    : 'KNOCKOUT';

    const date = domainMatch.date || domainMatch.schedule?.date;
    const startTime = domainMatch.startTime || domainMatch.schedule?.startTime;
    const endTime = domainMatch.endTime || domainMatch.schedule?.endTime;
    const venueId = domainMatch.venueId || domainMatch.schedule?.venueId;
    const schedule = domainMatch.schedule || (date || startTime || endTime || venueId ? { date, startTime, endTime, venueId } : undefined);

    return {
      id: domainMatch.id,
      tournamentId: domainMatch.tournamentId,
      round: domainMatch.round,
      roundName,
      position: domainMatch.position,
      fixtureNumber: domainMatch.fixtureNumber,
      matchCode: domainMatch.matchCode,
      groupPositionA: domainMatch.groupPositionA,
      groupPositionB: domainMatch.groupPositionB,
      homePlaceholder: getPlaceholder(domainMatch.participantA),
      awayPlaceholder: getPlaceholder(domainMatch.participantB),
      stage,
      groupId: domainMatch.groupId,
      homeTeamId: getTeamId(domainMatch.participantA),
      awayTeamId: getTeamId(domainMatch.participantB),
      homeScore: domainMatch.scoreA,
      awayScore: domainMatch.scoreB,
      score: {
        homeScore: domainMatch.scoreA,
        awayScore: domainMatch.scoreB,
        period: domainMatch.status === 'COMPLETED' ? 'Full Time' : domainMatch.currentSet ? `Set ${domainMatch.currentSet}` : undefined,
        homeDetails: { setsWon: domainMatch.setsWonA, sets: domainMatch.sets },
        awayDetails: { setsWon: domainMatch.setsWonB, sets: domainMatch.sets },
      },
      sets: domainMatch.sets,
      substitutions: domainMatch.substitutions,
      timeouts: domainMatch.timeouts,
      servingTeamId: domainMatch.servingTeamId,
      currentSet: domainMatch.currentSet,
      setsWonA: domainMatch.setsWonA,
      setsWonB: domainMatch.setsWonB,
      tossWinnerId: domainMatch.tossWinnerId,
      winnerId: domainMatch.winnerId,
      loserNextMatchId: null, // Unsupported currently
      nextMatchId: null, // Legacy tracking, ignored because Domain dependencies drive the logic
      scheduledAt: (date && startTime) ? `${date}T${startTime}` : (domainMatch.scheduledAt || new Date().toISOString()),
      date,
      startTime,
      endTime,
      venueId,
      schedule,
      status: (
        domainMatch.status === 'BYE_ADVANCEMENT' ? 'COMPLETED' : 
        domainMatch.status === 'SCHEDULED' ? 'UPCOMING' : 
        domainMatch.status === 'HALFTIME' ? 'LIVE' :
        domainMatch.status
      ) as any,
      events: [], // Events not mapped purely from DomainMatch yet
      lineupHome: domainMatch.lineupA,
      lineupAway: domainMatch.lineupB,
    };
  }
