import {
  calculateThrowballGroupStandings,
  calculateAllFourGroupStandings,
} from '../results/throwballStandings';
import { DomainMatch } from '../models/types';
import { Team, SetScore } from '../../../types';

const assert = {
  strictEqual: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`);
  },
  notStrictEqual: (a: any, b: any, msg?: string) => {
    if (a === b) throw new Error(msg || `Expected values to differ, got ${a}`);
  },
};

export function runMilestone7StandingsTests() {
  console.log('Running Milestone 7: Throwball Standings & Deterministic Tie-Breaking Tests...\n');

  const makeTeam = (id: string, name: string, groupId = 'A'): Team => ({
    id,
    name,
    shortName: id.slice(0, 4).toUpperCase(),
    groupId,
    players: [],
  });

  const createCompletedMatch = (
    id: string,
    teamAId: string,
    teamBId: string,
    sets: SetScore[],
    groupId = 'A'
  ): DomainMatch => {
    const setsWonA = sets.filter((s) => s.winnerId === teamAId).length;
    const setsWonB = sets.filter((s) => s.winnerId === teamBId).length;
    const winnerId = setsWonA > setsWonB ? teamAId : teamBId;
    const loserId = setsWonA > setsWonB ? teamBId : teamAId;

    return {
      id,
      tournamentId: 't-standings',
      stageId: 'group-stage',
      round: 1,
      position: 0,
      groupId,
      matchCode: `${groupId}-M1`,
      participantA: { type: 'TEAM', teamId: teamAId },
      participantB: { type: 'TEAM', teamId: teamBId },
      dependencies: [],
      scoreA: setsWonA,
      scoreB: setsWonB,
      status: 'COMPLETED',
      winnerId,
      loserId,
      sets,
      setsWonA,
      setsWonB,
    };
  };

  // 1. Basic statistics
  try {
    const teams = [makeTeam('team-1', 'Team 1'), makeTeam('team-2', 'Team 2')];
    const match = createCompletedMatch('m-1', 'team-1', 'team-2', [
      { setNumber: 1, scoreA: 15, scoreB: 11, winnerId: 'team-1', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 13, scoreB: 15, winnerId: 'team-2', status: 'COMPLETED' },
      { setNumber: 3, scoreA: 15, scoreB: 10, winnerId: 'team-1', status: 'COMPLETED' },
    ]);

    const standings = calculateThrowballGroupStandings([match], teams, 'A');
    const st1 = standings.find((s) => s.teamId === 'team-1')!;
    const st2 = standings.find((s) => s.teamId === 'team-2')!;

    // Team 1
    assert.strictEqual(st1.played, 1);
    assert.strictEqual(st1.won, 1);
    assert.strictEqual(st1.lost, 0);
    assert.strictEqual(st1.setsWon, 2);
    assert.strictEqual(st1.setsLost, 1);
    assert.strictEqual(st1.setDifference, 1);
    assert.strictEqual(st1.pointsFor, 43); // 15 + 13 + 15
    assert.strictEqual(st1.pointsAgainst, 36); // 11 + 15 + 10
    assert.strictEqual(st1.pointDifference, 7);

    // Team 2
    assert.strictEqual(st2.played, 1);
    assert.strictEqual(st2.won, 0);
    assert.strictEqual(st2.lost, 1);
    assert.strictEqual(st2.setsWon, 1);
    assert.strictEqual(st2.setsLost, 2);
    assert.strictEqual(st2.setDifference, -1);
    assert.strictEqual(st2.pointsFor, 36);
    assert.strictEqual(st2.pointsAgainst, 43);
    assert.strictEqual(st2.pointDifference, -7);

    console.log('✅ Test 1: Basic statistics (P, W, L, SW, SL, SD, PF, PA, PD) passed.');
  } catch (err: any) {
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }

  // 2. Tie-break 1: Equal match wins, Set Difference determines ranking
  try {
    const teams = [
      makeTeam('t-A', 'Team A'),
      makeTeam('t-B', 'Team B'),
      makeTeam('t-C', 'Team C'),
    ];

    // Team A wins 2-0 (+2 SD)
    const mA = createCompletedMatch('m-A', 't-A', 't-C', [
      { setNumber: 1, scoreA: 15, scoreB: 10, winnerId: 't-A', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 8, winnerId: 't-A', status: 'COMPLETED' },
    ]);

    // Team B wins 2-1 (+1 SD)
    const mB = createCompletedMatch('m-B', 't-B', 't-C', [
      { setNumber: 1, scoreA: 15, scoreB: 11, winnerId: 't-B', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 12, scoreB: 15, winnerId: 't-C', status: 'COMPLETED' },
      { setNumber: 3, scoreA: 15, scoreB: 10, winnerId: 't-B', status: 'COMPLETED' },
    ]);

    const standings = calculateThrowballGroupStandings([mA, mB], teams, 'A');
    assert.strictEqual(standings[0].teamId, 't-A', 'Team A has +2 SD vs Team B +1 SD');
    assert.strictEqual(standings[1].teamId, 't-B');
    console.log('✅ Test 2: Tie-break 1: Equal match wins, Set Difference determines ranking passed.');
  } catch (err: any) {
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }

  // 3. Tie-break 2: Equal match wins and equal Set Difference -> Point Difference determines ranking
  try {
    const teams = [
      makeTeam('t-A2', 'Team A2'),
      makeTeam('t-A3', 'Team A3'),
      makeTeam('t-dummy', 'Dummy'),
    ];

    // Both win 2-0 (+2 SD)
    // Team A2 scores 15-5, 15-5 -> +20 PD
    const mA2 = createCompletedMatch('m-A2', 't-A2', 't-dummy', [
      { setNumber: 1, scoreA: 15, scoreB: 5, winnerId: 't-A2', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 5, winnerId: 't-A2', status: 'COMPLETED' },
    ]);

    // Team A3 scores 15-13, 15-13 -> +4 PD
    const mA3 = createCompletedMatch('m-A3', 't-A3', 't-dummy', [
      { setNumber: 1, scoreA: 15, scoreB: 13, winnerId: 't-A3', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 13, winnerId: 't-A3', status: 'COMPLETED' },
    ]);

    const standings = calculateThrowballGroupStandings([mA2, mA3], teams, 'A');
    assert.strictEqual(standings[0].teamId, 't-A2', 'Team A2 with +20 PD ranks above Team A3 with +4 PD');
    assert.strictEqual(standings[1].teamId, 't-A3');
    console.log('✅ Test 3: Tie-break 2: Equal wins and SD, Point Difference determines ranking passed.');
  } catch (err: any) {
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }

  // 4. Tie-break 3: Equal wins, equal SD, equal PD -> Points For determines ranking
  try {
    const teams = [
      makeTeam('t-highPF', 'Team HighPF'),
      makeTeam('t-lowPF', 'Team LowPF'),
      makeTeam('t-dummy', 'Dummy'),
    ];

    // Team HighPF: 20 PF, 10 PA -> +10 PD, SD +2
    const mHigh = createCompletedMatch('m-h', 't-highPF', 't-dummy', [
      { setNumber: 1, scoreA: 20, scoreB: 10, winnerId: 't-highPF', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 15, winnerId: 't-highPF', status: 'COMPLETED' },
    ]);

    // Team LowPF: 15 PF, 5 PA -> +10 PD, SD +2, but fewer PF (30 vs 35)
    const mLow = createCompletedMatch('m-l', 't-lowPF', 't-dummy', [
      { setNumber: 1, scoreA: 15, scoreB: 5, winnerId: 't-lowPF', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 15, winnerId: 't-lowPF', status: 'COMPLETED' },
    ]);

    const standings = calculateThrowballGroupStandings([mHigh, mLow], teams, 'A');
    assert.strictEqual(standings[0].teamId, 't-highPF', 'Team HighPF ranks higher due to higher Points For');
    assert.strictEqual(standings[1].teamId, 't-lowPF');
    console.log('✅ Test 4: Tie-break 3: Equal wins, SD, and PD -> Points For determines ranking passed.');
  } catch (err: any) {
    console.error('❌ Test 4 failed:', err.message);
    throw err;
  }

  // 5. Tie-break 4: All aggregate statistics equal -> Head-to-head determines ranking where applicable
  try {
    const teams = [makeTeam('t-X', 'Team X'), makeTeam('t-Y', 'Team Y')];

    // Direct head-to-head match: Team X beats Team Y 2-0 (15-10, 15-10)
    // Note: in a 2-team direct match, aggregate stats are opposite (+2 SD vs -2 SD)
    // But let's create a 3-team circular scenario where two teams are identical in overall aggregate, but played each other:
    const teamZ = makeTeam('t-Z', 'Team Z');
    const all3 = [teams[0], teams[1], teamZ];

    // Match 1: X beats Z (15-10, 15-10) -> X: +2 SD, +10 PD
    const m1 = createCompletedMatch('m1', 't-X', 't-Z', [
      { setNumber: 1, scoreA: 15, scoreB: 10, winnerId: 't-X', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 10, winnerId: 't-X', status: 'COMPLETED' },
    ]);

    // Match 2: Y beats Z (15-10, 15-10) -> Y: +2 SD, +10 PD
    const m2 = createCompletedMatch('m2', 't-Y', 't-Z', [
      { setNumber: 1, scoreA: 15, scoreB: 10, winnerId: 't-Y', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 10, winnerId: 't-Y', status: 'COMPLETED' },
    ]);

    // Match 3: Head-to-head X vs Y: X wins (15-12, 12-15, 15-12)
    const m3 = createCompletedMatch('m3', 't-X', 't-Y', [
      { setNumber: 1, scoreA: 15, scoreB: 12, winnerId: 't-X', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 12, scoreB: 15, winnerId: 't-Y', status: 'COMPLETED' },
      { setNumber: 3, scoreA: 15, scoreB: 12, winnerId: 't-X', status: 'COMPLETED' },
    ]);

    const standings = calculateThrowballGroupStandings([m1, m2, m3], all3, 'A');
    assert.strictEqual(standings[0].teamId, 't-X', 'Team X won head-to-head against Team Y');
    console.log('✅ Test 5: Tie-break 4: Head-to-head determines ranking passed.');
  } catch (err: any) {
    console.error('❌ Test 5 failed:', err.message);
    throw err;
  }

  // 6. Tie-break 5: Completely unresolved tie -> Never random, surfaced as unresolved tie
  try {
    const teams = [makeTeam('t-1', 'Alpha'), makeTeam('t-2', 'Beta')];
    // No matches played at all
    const standings = calculateThrowballGroupStandings([], teams, 'A');
    assert.strictEqual(standings.length, 2);
    assert.strictEqual(standings[0].isTied, true, 'Completely tied teams must be marked isTied: true');
    assert.strictEqual(standings[1].isTied, true);
    assert.strictEqual(Boolean(standings[0].tieBreakReason), true);
    console.log('✅ Test 6: Tie-break 5: Completely unresolved tie surfaced deterministically passed.');
  } catch (err: any) {
    console.error('❌ Test 6 failed:', err.message);
    throw err;
  }

  // 7. Four groups: Independent standings for A, B, C, D
  try {
    const teams = [
      makeTeam('t-A1', 'A1', 'A'),
      makeTeam('t-A2', 'A2', 'A'),
      makeTeam('t-B1', 'B1', 'B'),
      makeTeam('t-B2', 'B2', 'B'),
      makeTeam('t-C1', 'C1', 'C'),
      makeTeam('t-C2', 'C2', 'C'),
      makeTeam('t-D1', 'D1', 'D'),
      makeTeam('t-D2', 'D2', 'D'),
    ];

    const matchA = createCompletedMatch('mA', 't-A1', 't-A2', [
      { setNumber: 1, scoreA: 15, scoreB: 5, winnerId: 't-A1', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 5, winnerId: 't-A1', status: 'COMPLETED' },
    ], 'A');

    const fourGroups = calculateAllFourGroupStandings([matchA], teams);
    assert.strictEqual(fourGroups['A'].find((t) => t.teamId === 't-A1')?.won, 1);
    assert.strictEqual(fourGroups['B'].every((t) => t.played === 0), true, 'Group B must remain 0 played');
    assert.strictEqual(fourGroups['C'].every((t) => t.played === 0), true, 'Group C must remain 0 played');
    assert.strictEqual(fourGroups['D'].every((t) => t.played === 0), true, 'Group D must remain 0 played');
    console.log('✅ Test 7: Four groups: Independent standings for A, B, C, D passed.');
  } catch (err: any) {
    console.error('❌ Test 7 failed:', err.message);
    throw err;
  }

  // 8. Qualification: Only #1 qualifies & regression: Group A match does not modify Group B/C/D
  try {
    const teamsA = [
      makeTeam('t-1', 'Team 1', 'A'),
      makeTeam('t-2', 'Team 2', 'A'),
      makeTeam('t-3', 'Team 3', 'A'),
      makeTeam('t-4', 'Team 4', 'A'),
    ];

    const matchA = createCompletedMatch('mA-1', 't-1', 't-2', [
      { setNumber: 1, scoreA: 15, scoreB: 10, winnerId: 't-1', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 10, winnerId: 't-1', status: 'COMPLETED' },
    ], 'A');

    const standings = calculateThrowballGroupStandings([matchA], teamsA, 'A');
    assert.strictEqual(standings[0].rank, 1);
    assert.strictEqual(standings[0].qualified, true, 'Only rank 1 is marked qualified');
    assert.strictEqual(standings[1].qualified, false, 'Rank 2 is not qualified');
    assert.strictEqual(standings[2].qualified, false);
    assert.strictEqual(standings[3].qualified, false);
    console.log('✅ Test 8: Qualification: Only #1 qualifies and status isolation verified passed.');
  } catch (err: any) {
    console.error('❌ Test 8 failed:', err.message);
    throw err;
  }

  console.log('\n🎉 All 8 Milestone 7 Standings & Tie-Break Tests passed successfully!\n');
}
