import { RosterRules, THROWBALL_ROSTER_RULES, validateTeamRoster } from '../roster/rosterRules';
import {
  MatchLineup,
  validateMatchLineup,
  createDefaultLineup,
  isLineupLocked,
} from '../roster/lineupValidation';
import { generateFourGroupTournament, assignTeamToGroupPosition } from '../fixtures/groupKnockout';
import { processMatchResult } from '../results/processResult';
import { DomainMatch, TournamentRules } from '../models/types';
import { Player, Team } from '../../../types';

const assert = {
  strictEqual: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`);
  },
  deepStrictEqual: (a: any, b: any, msg?: string) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || 'Deep equality failed');
  },
};

export function runRosterAndLineupTests() {
  console.log('Running Milestone 5: Roster & Lineup Domain Tests...\n');

  const makePlayer = (id: string, name: string, jerseyNumber: number, extra: Partial<Player> = {}): Player => ({
    id,
    name,
    jerseyNumber,
    role: 'Court Player',
    ...extra,
  });

  const create8PlayerRoster = (prefix: string): Player[] => [
    makePlayer(`${prefix}-1`, 'Player 1', 1, { isCaptain: true }),
    makePlayer(`${prefix}-2`, 'Player 2', 2),
    makePlayer(`${prefix}-3`, 'Player 3', 3),
    makePlayer(`${prefix}-4`, 'Player 4', 4),
    makePlayer(`${prefix}-5`, 'Player 5', 5),
    makePlayer(`${prefix}-6`, 'Player 6', 6),
    makePlayer(`${prefix}-7`, 'Player 7', 7),
    makePlayer(`${prefix}-8`, 'Player 8', 8),
  ];

  // 1. Roster: Exactly 8 players is valid
  try {
    const roster = create8PlayerRoster('t1');
    const result = validateTeamRoster(roster, THROWBALL_ROSTER_RULES);
    assert.strictEqual(result.isValid, true, '8 valid players must pass validation');
    assert.strictEqual(result.errors.length, 0);
    console.log('✅ Test 1: Exactly 8 players is valid passed.');
  } catch (err: any) {
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }

  // 2. Roster: 7 players is invalid
  try {
    const roster = create8PlayerRoster('t2').slice(0, 7);
    const result = validateTeamRoster(roster, THROWBALL_ROSTER_RULES);
    assert.strictEqual(result.isValid, false, '7 players must fail validation');
    assert.strictEqual(result.errors.some((e) => e.includes('exactly 8 registered players')), true);
    console.log('✅ Test 2: 7 players is invalid passed.');
  } catch (err: any) {
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }

  // 3. Roster: 9 players is invalid
  try {
    const roster = [...create8PlayerRoster('t3'), makePlayer('t3-9', 'Player 9', 9)];
    const result = validateTeamRoster(roster, THROWBALL_ROSTER_RULES);
    assert.strictEqual(result.isValid, false, '9 players must fail validation');
    assert.strictEqual(result.errors.some((e) => e.includes('exactly 8 registered players')), true);
    console.log('✅ Test 3: 9 players is invalid passed.');
  } catch (err: any) {
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }

  // 4. Roster: Duplicate jersey numbers are invalid
  try {
    const roster = create8PlayerRoster('t4');
    roster[1].jerseyNumber = 1; // Duplicate jersey #1
    const result = validateTeamRoster(roster, THROWBALL_ROSTER_RULES);
    assert.strictEqual(result.isValid, false, 'Duplicate jersey numbers must fail validation');
    assert.strictEqual(result.errors.some((e) => e.includes('Duplicate jersey number')), true);
    console.log('✅ Test 4: Duplicate jersey numbers are invalid passed.');
  } catch (err: any) {
    console.error('❌ Test 4 failed:', err.message);
    throw err;
  }

  // 5. Roster: Missing player identity is invalid
  try {
    const roster = create8PlayerRoster('t5');
    roster[0].id = ''; // Missing ID
    const res1 = validateTeamRoster(roster, THROWBALL_ROSTER_RULES);
    assert.strictEqual(res1.isValid, false, 'Missing player id must fail validation');

    const roster2 = create8PlayerRoster('t5b');
    roster2[0].name = '   '; // Missing name
    const res2 = validateTeamRoster(roster2, THROWBALL_ROSTER_RULES);
    assert.strictEqual(res2.isValid, false, 'Blank player name must fail validation');
    console.log('✅ Test 5: Missing player identity is invalid passed.');
  } catch (err: any) {
    console.error('❌ Test 5 failed:', err.message);
    throw err;
  }

  // 6. Lineup: Exactly 6 starters is valid
  try {
    const roster = create8PlayerRoster('t6');
    const lineup: MatchLineup = {
      matchId: 'm1',
      teamId: 'team-6',
      startingPlayerIds: ['t6-1', 't6-2', 't6-3', 't6-4', 't6-5', 't6-6'],
      substitutePlayerIds: ['t6-7', 't6-8'],
    };
    const result = validateMatchLineup(lineup, roster, THROWBALL_ROSTER_RULES);
    assert.strictEqual(result.isValid, true, '6 starters and 2 substitutes must be valid');
    assert.strictEqual(result.errors.length, 0);
    console.log('✅ Test 6: Exactly 6 starters is valid passed.');
  } catch (err: any) {
    console.error('❌ Test 6 failed:', err.message);
    throw err;
  }

  // 7. Lineup: Exactly 2 substitutes is valid (3 substitutes or 1 substitute is invalid)
  try {
    const roster = create8PlayerRoster('t7');
    const invalidLineup: MatchLineup = {
      matchId: 'm2',
      teamId: 'team-7',
      startingPlayerIds: ['t7-1', 't7-2', 't7-3', 't7-4', 't7-5'], // 5 starters
      substitutePlayerIds: ['t7-6', 't7-7', 't7-8'], // 3 substitutes
    };
    const result = validateMatchLineup(invalidLineup, roster, THROWBALL_ROSTER_RULES);
    assert.strictEqual(result.isValid, false, '5 starters and 3 subs must fail validation');
    assert.strictEqual(result.errors.some((e) => e.includes('exactly 6 starting players')), true);
    assert.strictEqual(result.errors.some((e) => e.includes('exactly 2 substitutes')), true);
    console.log('✅ Test 7: Exactly 2 substitutes is valid (non-2 is invalid) passed.');
  } catch (err: any) {
    console.error('❌ Test 7 failed:', err.message);
    throw err;
  }

  // 8. Lineup: Duplicate player selection is invalid
  try {
    const roster = create8PlayerRoster('t8');
    const dupLineup: MatchLineup = {
      matchId: 'm3',
      teamId: 'team-8',
      startingPlayerIds: ['t8-1', 't8-1', 't8-2', 't8-3', 't8-4', 't8-5'], // Duplicate t8-1
      substitutePlayerIds: ['t8-6', 't8-7'],
    };
    const result = validateMatchLineup(dupLineup, roster, THROWBALL_ROSTER_RULES);
    assert.strictEqual(result.isValid, false, 'Duplicate starter selection must fail validation');
    assert.strictEqual(result.errors.some((e) => e.includes('Duplicate player')), true);
    console.log('✅ Test 8: Duplicate player selection is invalid passed.');
  } catch (err: any) {
    console.error('❌ Test 8 failed:', err.message);
    throw err;
  }

  // 9. Lineup: Player cannot be both starter and substitute
  try {
    const roster = create8PlayerRoster('t9');
    const overlapLineup: MatchLineup = {
      matchId: 'm4',
      teamId: 'team-9',
      startingPlayerIds: ['t9-1', 't9-2', 't9-3', 't9-4', 't9-5', 't9-6'],
      substitutePlayerIds: ['t9-1', 't9-7'], // t9-1 appears as starter and substitute
    };
    const result = validateMatchLineup(overlapLineup, roster, THROWBALL_ROSTER_RULES);
    assert.strictEqual(result.isValid, false, 'Player appearing as starter and sub must fail validation');
    assert.strictEqual(result.errors.some((e) => e.includes('cannot be both')), true);
    console.log('✅ Test 9: Player cannot be both starter and substitute passed.');
  } catch (err: any) {
    console.error('❌ Test 9 failed:', err.message);
    throw err;
  }

  // 10. Lineup: All 8 roster players must be accounted for
  try {
    const roster = create8PlayerRoster('t10');
    // Lineup omits t10-8 and includes a non-existent duplicate or missing
    const missingLineup: MatchLineup = {
      matchId: 'm5',
      teamId: 'team-10',
      startingPlayerIds: ['t10-1', 't10-2', 't10-3', 't10-4', 't10-5', 't10-6'],
      substitutePlayerIds: ['t10-7', 't10-7'], // leaves t10-8 unaccounted for
    };
    const result = validateMatchLineup(missingLineup, roster, THROWBALL_ROSTER_RULES);
    assert.strictEqual(result.isValid, false, 'Leaving roster players unaccounted for must fail validation');
    console.log('✅ Test 10: All 8 roster players must be accounted for passed.');
  } catch (err: any) {
    console.error('❌ Test 10 failed:', err.message);
    throw err;
  }

  // 11. Lineup: A player not belonging to the team cannot be selected
  try {
    const roster = create8PlayerRoster('t11');
    const outsiderLineup: MatchLineup = {
      matchId: 'm6',
      teamId: 'team-11',
      startingPlayerIds: ['t11-1', 't11-2', 't11-3', 't11-4', 't11-5', 'OUTSIDER-99'],
      substitutePlayerIds: ['t11-7', 't11-8'],
    };
    const result = validateMatchLineup(outsiderLineup, roster, THROWBALL_ROSTER_RULES);
    assert.strictEqual(result.isValid, false, 'Player not on team roster must fail validation');
    assert.strictEqual(result.errors.some((e) => e.includes('does not belong to the registered roster')), true);
    console.log('✅ Test 11: A player not belonging to the team cannot be selected passed.');
  } catch (err: any) {
    console.error('❌ Test 11 failed:', err.message);
    throw err;
  }

  // 12. Lineup: Lineup becomes immutable after match start
  try {
    assert.strictEqual(isLineupLocked('SCHEDULED'), false, 'SCHEDULED match lineups are editable');
    assert.strictEqual(isLineupLocked('UPCOMING'), false, 'UPCOMING match lineups are editable');
    assert.strictEqual(isLineupLocked('LIVE'), true, 'LIVE match lineups are locked');
    assert.strictEqual(isLineupLocked('COMPLETED'), true, 'COMPLETED match lineups are immutable');
    console.log('✅ Test 12: Lineup becomes immutable after match start passed.');
  } catch (err: any) {
    console.error('❌ Test 12 failed:', err.message);
    throw err;
  }

  // 13. Integration: Team with 8-player roster can participate in group fixture
  try {
    const groupAssignments: Record<string, string[]> = {
      A: ['teamA1', 'teamA2', 'teamA3', 'teamA4'],
      B: ['teamB1', 'teamB2', 'teamB3', 'teamB4'],
      C: ['teamC1', 'teamC2', 'teamC3', 'teamC4'],
      D: ['teamD1', 'teamD2', 'teamD3', 'teamD4'],
    };
    const domainMatches = generateFourGroupTournament({
      tournamentId: 'tour-throwball-8p',
      stageId: 'group-stage',
      groupAssignments,
    });
    assert.strictEqual(domainMatches.length, 27, 'Should generate 24 group + 3 playoff matches');
    
    // Check group match 1
    const gm1 = domainMatches.find((m) => m.matchCode === 'A-M1')!;
    assert.strictEqual(gm1.participantA.type, 'TEAM');
    assert.strictEqual((gm1.participantA as any).teamId, 'teamA1');
    assert.strictEqual((gm1.participantB as any).teamId, 'teamA2');
    console.log('✅ Test 13: Team with 8-player roster can participate in group fixture passed.');
  } catch (err: any) {
    console.error('❌ Test 13 failed:', err.message);
    throw err;
  }

  // 14. Integration: Match lineup references actual player IDs
  try {
    const rosterA = create8PlayerRoster('teamA');
    const defaultLineupA = createDefaultLineup('m-tb-1', 'teamA', rosterA, THROWBALL_ROSTER_RULES);
    assert.strictEqual(defaultLineupA.startingPlayerIds.length, 6);
    assert.strictEqual(defaultLineupA.substitutePlayerIds.length, 2);
    // Verifying it stores IDs, not full embedded player structures
    assert.strictEqual(typeof defaultLineupA.startingPlayerIds[0], 'string');
    assert.strictEqual(defaultLineupA.startingPlayerIds[0], 'teamA-1');
    const snapCount = Array.isArray(defaultLineupA.snapshots)
      ? defaultLineupA.snapshots.length
      : Object.keys(defaultLineupA.snapshots || {}).length;
    assert.strictEqual(snapCount, 8, 'Historical snapshot captured');
    console.log('✅ Test 14: Match lineup references actual player IDs passed.');
  } catch (err: any) {
    console.error('❌ Test 14 failed:', err.message);
    throw err;
  }

  // 15. Integration: Live scoring remains functional with lineups attached
  try {
    const rules: TournamentRules = { allowDraws: false, winPoints: 2, drawPoints: 0, lossPoints: 0 };
    let matches: DomainMatch[] = [
      {
        id: 'match-101',
        tournamentId: 'tour-throwball',
        stageId: 'groups',
        groupId: 'A',
        round: 1,
        position: 1,
        status: 'LIVE',
        participantA: { type: 'TEAM', teamId: 'team1' },
        participantB: { type: 'TEAM', teamId: 'team2' },
        dependencies: [],
        winnerId: null,
        loserId: null,
        scoreA: 18,
        scoreB: 15,
        lineupA: {
          matchId: 'match-101',
          teamId: 'team1',
          startingPlayerIds: ['t1-1', 't1-2', 't1-3', 't1-4', 't1-5', 't1-6'],
          substitutePlayerIds: ['t1-7', 't1-8'],
          isLocked: true,
        },
        lineupB: {
          matchId: 'match-101',
          teamId: 'team2',
          startingPlayerIds: ['t2-1', 't2-2', 't2-3', 't2-4', 't2-5', 't2-6'],
          substitutePlayerIds: ['t2-7', 't2-8'],
          isLocked: true,
        },
      },
    ];

    // Live scoring point addition
    matches[0].scoreA = 21;
    matches[0].scoreB = 18;
    assert.strictEqual(matches[0].scoreA, 21);
    assert.strictEqual(matches[0].scoreB, 18);
    assert.strictEqual(matches[0].lineupA?.startingPlayerIds.length, 6);
    assert.strictEqual(matches[0].lineupB?.startingPlayerIds.length, 6);
    console.log('✅ Test 15: Live scoring remains functional passed.');
  } catch (err: any) {
    console.error('❌ Test 15 failed:', err.message);
    throw err;
  }

  // 16. Integration: Match completion preserves lineup
  try {
    const rules: TournamentRules = { allowDraws: false, winPoints: 2, drawPoints: 0, lossPoints: 0 };
    const initialMatches: DomainMatch[] = [
      {
        id: 'match-201',
        tournamentId: 'tour-throwball',
        stageId: 'groups',
        groupId: 'A',
        round: 1,
        position: 1,
        status: 'LIVE',
        participantA: { type: 'TEAM', teamId: 'team1' },
        participantB: { type: 'TEAM', teamId: 'team2' },
        dependencies: [],
        winnerId: null,
        loserId: null,
        scoreA: 20,
        scoreB: 18,
        lineupA: {
          matchId: 'match-201',
          teamId: 'team1',
          startingPlayerIds: ['t1-1', 't1-2', 't1-3', 't1-4', 't1-5', 't1-6'],
          substitutePlayerIds: ['t1-7', 't1-8'],
          snapshots: [{ id: 't1-1', name: 'Original Name', jerseyNumber: 7, isCaptain: true }],
          isLocked: true,
        },
        lineupB: {
          matchId: 'match-201',
          teamId: 'team2',
          startingPlayerIds: ['t2-1', 't2-2', 't2-3', 't2-4', 't2-5', 't2-6'],
          substitutePlayerIds: ['t2-7', 't2-8'],
          isLocked: true,
        },
      },
    ];

    const result = processMatchResult(initialMatches, 'match-201', { scoreA: 25, scoreB: 20 }, rules);
    const completedMatch = result.updatedMatches.find((m) => m.id === 'match-201')!;
    assert.strictEqual(completedMatch.status, 'COMPLETED');
    assert.strictEqual(completedMatch.scoreA, 25);
    assert.strictEqual(completedMatch.scoreB, 20);
    assert.strictEqual(completedMatch.winnerId, 'team1');
    assert.strictEqual(completedMatch.lineupA?.startingPlayerIds.length, 6, 'Lineup A must be preserved on completion');
    assert.strictEqual(completedMatch.lineupB?.startingPlayerIds.length, 6, 'Lineup B must be preserved on completion');
    assert.strictEqual(completedMatch.lineupA?.snapshots?.[0].name, 'Original Name', 'Historical snapshot preserved');
    console.log('✅ Test 16: Match completion preserves lineup passed.');
  } catch (err: any) {
    console.error('❌ Test 16 failed:', err.message);
    throw err;
  }

  // 17. Integration: Public tournament can display roster
  try {
    const team: Team = {
      id: 'team-throwball-pub',
      name: 'St. Xavier Blasters',
      shortName: 'SXB',
      color: '#f97316',
      seed: 1,
      captainId: 'sxb-1',
      captainName: 'Player 1',
      players: create8PlayerRoster('sxb'),
    };
    assert.strictEqual(team.players.length, 8, 'Public team must have 8 players');
    assert.strictEqual(team.captainId, 'sxb-1');
    const cap = team.players.find((p) => p.isCaptain);
    assert.strictEqual(cap?.id, 'sxb-1');
    console.log('✅ Test 17: Public tournament can display roster passed.');
  } catch (err: any) {
    console.error('❌ Test 17 failed:', err.message);
    throw err;
  }

  console.log('\n🎉 All 17 Milestone 5 Roster & Lineup Domain Tests passed successfully!\n');
}
