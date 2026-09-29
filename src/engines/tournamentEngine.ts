import { Match, Team, TournamentFormat, TournamentGroup, MatchScore } from '../types';

function createEmptyScore(): MatchScore {
  return {
    homeScore: 0,
    awayScore: 0,
  };
}

/**
 * Generates single-elimination knockout bracket with auto-advancing nextMatchId
 */
export function generateKnockoutFixtures(
  tournamentId: string,
  teams: Team[],
  startDate: string,
  venueId?: string
): Match[] {
  const matches: Match[] = [];
  const teamCount = teams.length;

  // Determine closest power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(teamCount, 2))));
  const totalRounds = Math.log2(bracketSize);

  // Round names mapping
  const getRoundName = (roundNum: number, total: number) => {
    const fromFinal = total - roundNum;
    if (fromFinal === 0) return 'Grand Final';
    if (fromFinal === 1) return 'Semi Finals';
    if (fromFinal === 2) return 'Quarter Finals';
    if (fromFinal === 3) return 'Round of 16';
    if (fromFinal === 4) return 'Round of 32';
    return `Round ${roundNum}`;
  };

  // Generate matches round by round from Finals backwards to wire up nextMatchId
  const roundMatches: Record<number, Match[]> = {};

  for (let r = totalRounds; r >= 1; r--) {
    const matchesInRound = Math.pow(2, totalRounds - r);
    roundMatches[r] = [];

    for (let pos = 1; pos <= matchesInRound; pos++) {
      const matchId = `m-${tournamentId}-r${r}-p${pos}`;
      const roundName = getRoundName(r, totalRounds);

      // Find the parent match in the next round (if not the final)
      let nextMatchId: string | null = null;
      if (r < totalRounds) {
        const nextPos = Math.ceil(pos / 2);
        nextMatchId = `m-${tournamentId}-r${r + 1}-p${nextPos}`;
      }

      const match: Match = {
        id: matchId,
        tournamentId,
        round: r,
        roundName,
        position: pos,
        stage: r === totalRounds ? 'FINAL' : 'KNOCKOUT',
        homeTeamId: null,
        awayTeamId: null,
        homeScore: 0,
        awayScore: 0,
        score: createEmptyScore(),
        winnerId: null,
        nextMatchId,
        scheduledAt: startDate,
        venueId,
        status: 'UPCOMING',
        events: [],
      };

      roundMatches[r].push(match);
    }
  }

  // Populate Round 1 with teams based on seeding
  const round1Matches = roundMatches[1];
  const sortedTeams = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));

  for (let i = 0; i < round1Matches.length; i++) {
    const match = round1Matches[i];
    const homeTeam = sortedTeams[i * 2] || null;
    const awayTeam = sortedTeams[i * 2 + 1] || null;

    match.homeTeamId = homeTeam ? homeTeam.id : null;
    match.awayTeamId = awayTeam ? awayTeam.id : null;

    // Handle byes if team is missing
    if (homeTeam && !awayTeam && round1Matches.length > 1) {
      match.winnerId = homeTeam.id;
      match.status = 'COMPLETED';
    }
  }

  // Flatten matches in chronological order
  for (let r = 1; r <= totalRounds; r++) {
    matches.push(...roundMatches[r]);
  }

  return matches;
}

/**
 * Generates Round Robin fixtures (all teams play against each other)
 */
export function generateRoundRobinFixtures(
  tournamentId: string,
  teams: Team[],
  startDate: string,
  venueId?: string
): Match[] {
  const matches: Match[] = [];
  const teamList = [...teams];

  // If odd number of teams, add a dummy bye
  if (teamList.length % 2 !== 0) {
    teamList.push({ id: '__bye__', name: 'BYE', shortName: 'BYE', players: [] });
  }

  const n = teamList.length;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;

  let matchIndex = 1;

  for (let round = 1; round <= totalRounds; round++) {
    for (let i = 0; i < matchesPerRound; i++) {
      const home = teamList[i];
      const away = teamList[n - 1 - i];

      // Skip bye match
      if (home.id === '__bye__' || away.id === '__bye__') {
        continue;
      }

      matches.push({
        id: `rr-${tournamentId}-r${round}-m${matchIndex++}`,
        tournamentId,
        round,
        roundName: `Matchday ${round}`,
        position: matchIndex,
        stage: 'GROUP',
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore: 0,
        awayScore: 0,
        score: createEmptyScore(),
        winnerId: null,
        scheduledAt: startDate,
        venueId,
        status: 'UPCOMING',
        events: [],
      });
    }

    // Rotate teams array keeping teamList[0] fixed
    const last = teamList.pop()!;
    teamList.splice(1, 0, last);
  }

  return matches;
}

/**
 * Generates Group + Knockout tournament fixtures
 */
export function generateGroupKnockoutFixtures(
  tournamentId: string,
  teams: Team[],
  groups: TournamentGroup[],
  startDate: string,
  venueId?: string
): Match[] {
  const allMatches: Match[] = [];

  // 1. Group Stage Matches
  groups.forEach((group) => {
    const groupTeams = teams.filter((t) => group.teamIds.includes(t.id));
    const groupFixtures = generateRoundRobinFixtures(
      `${tournamentId}-${group.id}`,
      groupTeams,
      startDate,
      venueId
    );

    groupFixtures.forEach((m) => {
      m.roundName = `${group.name} - ${m.roundName}`;
      m.stage = 'GROUP';
      allMatches.push(m);
    });
  });

  // 2. Knockout Playoff Stage (e.g. Semis & Final for top 2 from each group)
  const playoffMatches: Match[] = [
    {
      id: `ko-${tournamentId}-semi-1`,
      tournamentId,
      round: 1,
      roundName: 'Semi Final 1 (Winner A vs Runner-up B)',
      position: 1,
      stage: 'KNOCKOUT',
      homeTeamId: null,
      awayTeamId: null,
      homeScore: 0,
      awayScore: 0,
      score: createEmptyScore(),
      winnerId: null,
      nextMatchId: `ko-${tournamentId}-final`,
      scheduledAt: startDate,
      venueId,
      status: 'UPCOMING',
      events: [],
    },
    {
      id: `ko-${tournamentId}-semi-2`,
      tournamentId,
      round: 1,
      roundName: 'Semi Final 2 (Winner B vs Runner-up A)',
      position: 2,
      stage: 'KNOCKOUT',
      homeTeamId: null,
      awayTeamId: null,
      homeScore: 0,
      awayScore: 0,
      score: createEmptyScore(),
      winnerId: null,
      nextMatchId: `ko-${tournamentId}-final`,
      scheduledAt: startDate,
      venueId,
      status: 'UPCOMING',
      events: [],
    },
    {
      id: `ko-${tournamentId}-final`,
      tournamentId,
      round: 2,
      roundName: 'Championship Final 🏆',
      position: 1,
      stage: 'FINAL',
      homeTeamId: null,
      awayTeamId: null,
      homeScore: 0,
      awayScore: 0,
      score: createEmptyScore(),
      winnerId: null,
      scheduledAt: startDate,
      venueId,
      status: 'UPCOMING',
      events: [],
    },
  ];

  allMatches.push(...playoffMatches);
  return allMatches;
}

/**
 * Advances winner to the linked nextMatchId in the bracket tree
 */
export function advanceWinnerInBracket(
  matches: Match[],
  completedMatchId: string,
  winnerId: string
): Match[] {
  const updatedMatches = [...matches];
  const completedMatch = updatedMatches.find((m) => m.id === completedMatchId);

  if (!completedMatch || !completedMatch.nextMatchId) {
    return updatedMatches;
  }

  const nextMatchIndex = updatedMatches.findIndex((m) => m.id === completedMatch.nextMatchId);
  if (nextMatchIndex === -1) return updatedMatches;

  const nextMatch = { ...updatedMatches[nextMatchIndex] };

  // Assign to homeTeamId if empty or matches completed match position, otherwise awayTeamId
  if (!nextMatch.homeTeamId || (completedMatch.position % 2 === 1)) {
    nextMatch.homeTeamId = winnerId;
  } else {
    nextMatch.awayTeamId = winnerId;
  }

  updatedMatches[nextMatchIndex] = nextMatch;
  return updatedMatches;
}
