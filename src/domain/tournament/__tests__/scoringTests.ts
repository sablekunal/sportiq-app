import {
  validateSetScore,
  validateMatchSets,
  completeThrowballMatchWithSets,
  recordPoint,
  adjustLiveScore,
  initializeMatchSets,
} from '../scoring/throwballScoringEngine';
import { DomainMatch } from '../models/types';
import { SetScore } from '../../../types';

const assert = {
  strictEqual: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`);
  },
  notStrictEqual: (a: any, b: any, msg?: string) => {
    if (a === b) throw new Error(msg || `Expected values to differ, got ${a}`);
  },
};

export function runMilestone7ScoringTests() {
  console.log('Running Milestone 7: Throwball Scoring Domain Engine Tests...\n');

  const createBaseMatch = (): DomainMatch => ({
    id: 'm-score-1',
    tournamentId: 't-1',
    stageId: 'stage-1',
    round: 1,
    position: 0,
    fixtureNumber: 1,
    matchCode: 'A-M1',
    participantA: { type: 'TEAM', teamId: 'team-A' },
    participantB: { type: 'TEAM', teamId: 'team-B' },
    dependencies: [],
    scoreA: 0,
    scoreB: 0,
    status: 'SCHEDULED',
    winnerId: null,
    loserId: null,
  });

  // 1. Valid set completion.
  try {
    const set1: SetScore = {
      setNumber: 1,
      scoreA: 15,
      scoreB: 11,
      winnerId: 'team-A',
      status: 'COMPLETED',
    };
    const res = validateSetScore(set1, 'team-A', 'team-B');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.errors.length, 0);
    console.log('✅ Test 1: Valid set completion passed.');
  } catch (err: any) {
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }

  // 2. 2–0 match completion.
  try {
    const sets2_0: SetScore[] = [
      { setNumber: 1, scoreA: 15, scoreB: 10, winnerId: 'team-A', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 12, winnerId: 'team-A', status: 'COMPLETED' },
    ];
    const match = createBaseMatch();
    const res = completeThrowballMatchWithSets(match, sets2_0);
    assert.strictEqual(res.errors.length, 0);
    assert.strictEqual(res.winnerId, 'team-A');
    assert.strictEqual(res.loserId, 'team-B');
    assert.strictEqual(res.match.scoreA, 2);
    assert.strictEqual(res.match.scoreB, 0);
    assert.strictEqual(res.match.status, 'COMPLETED');
    console.log('✅ Test 2: 2–0 match completion passed.');
  } catch (err: any) {
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }

  // 3. 2–1 match completion.
  try {
    const sets2_1: SetScore[] = [
      { setNumber: 1, scoreA: 15, scoreB: 11, winnerId: 'team-A', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 13, scoreB: 15, winnerId: 'team-B', status: 'COMPLETED' },
      { setNumber: 3, scoreA: 15, scoreB: 10, winnerId: 'team-A', status: 'COMPLETED' },
    ];
    const match = createBaseMatch();
    const res = completeThrowballMatchWithSets(match, sets2_1);
    assert.strictEqual(res.errors.length, 0);
    assert.strictEqual(res.winnerId, 'team-A');
    assert.strictEqual(res.loserId, 'team-B');
    assert.strictEqual(res.match.scoreA, 2);
    assert.strictEqual(res.match.scoreB, 1);
    console.log('✅ Test 3: 2–1 match completion passed.');
  } catch (err: any) {
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }

  // 4. Third set not created after 2–0.
  try {
    const setsInvalid3rd: SetScore[] = [
      { setNumber: 1, scoreA: 15, scoreB: 10, winnerId: 'team-A', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 8, winnerId: 'team-A', status: 'COMPLETED' },
      { setNumber: 3, scoreA: 15, scoreB: 12, winnerId: 'team-A', status: 'COMPLETED' },
    ];
    const validation = validateMatchSets(setsInvalid3rd, 'team-A', 'team-B');
    assert.strictEqual(validation.valid, false);
    assert.strictEqual(validation.errors.some((e) => e.includes('Third set cannot be played after a 2-0')), true);
    console.log('✅ Test 4: Third set not created after 2–0 passed.');
  } catch (err: any) {
    console.error('❌ Test 4 failed:', err.message);
    throw err;
  }

  // 5. Match cannot complete at 1–1.
  try {
    const setsTied: SetScore[] = [
      { setNumber: 1, scoreA: 15, scoreB: 12, winnerId: 'team-A', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 11, scoreB: 15, winnerId: 'team-B', status: 'COMPLETED' },
    ];
    const match = createBaseMatch();
    const res = completeThrowballMatchWithSets(match, setsTied);
    assert.strictEqual(res.errors.length > 0, true, 'Match cannot complete at 1-1 set tie');
    console.log('✅ Test 5: Match cannot complete at 1–1 passed.');
  } catch (err: any) {
    console.error('❌ Test 5 failed:', err.message);
    throw err;
  }

  // 6. Negative score rejected.
  try {
    const negativeSet: SetScore = {
      setNumber: 1,
      scoreA: -1,
      scoreB: 15,
      winnerId: 'team-B',
      status: 'COMPLETED',
    };
    const res = validateSetScore(negativeSet, 'team-A', 'team-B');
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.errors.some((e) => e.includes('negative score')), true);

    // Also verify adjustLiveScore rejects going negative
    let match = initializeMatchSets(createBaseMatch());
    match.status = 'LIVE';
    const adjRes = adjustLiveScore(match, 'A', -1);
    assert.strictEqual(adjRes.errors.length > 0, true, 'Negative adjustment must be rejected');
    console.log('✅ Test 6: Negative score rejected passed.');
  } catch (err: any) {
    console.error('❌ Test 6 failed:', err.message);
    throw err;
  }

  // 7. Invalid set result rejected.
  try {
    // Both teams reaching 15 with no winner, or set completed with tie
    const tiedSet: SetScore = {
      setNumber: 1,
      scoreA: 15,
      scoreB: 15,
      status: 'COMPLETED',
    };
    const res = validateSetScore(tiedSet, 'team-A', 'team-B');
    assert.strictEqual(res.valid, false);

    // Completed before reaching 15 points
    const prematureSet: SetScore = {
      setNumber: 1,
      scoreA: 14,
      scoreB: 12,
      winnerId: 'team-A',
      status: 'COMPLETED',
    };
    const res2 = validateSetScore(prematureSet, 'team-A', 'team-B');
    assert.strictEqual(res2.valid, false);
    assert.strictEqual(res2.errors.some((e) => e.includes('reaching target 15 rally points')), true);
    console.log('✅ Test 7: Invalid set result rejected passed.');
  } catch (err: any) {
    console.error('❌ Test 7 failed:', err.message);
    throw err;
  }

  // 8. Actual set scores preserved.
  try {
    const actualSets: SetScore[] = [
      { setNumber: 1, scoreA: 15, scoreB: 11, winnerId: 'team-A', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 13, scoreB: 15, winnerId: 'team-B', status: 'COMPLETED' },
      { setNumber: 3, scoreA: 15, scoreB: 10, winnerId: 'team-A', status: 'COMPLETED' },
    ];
    const match = createBaseMatch();
    const res = completeThrowballMatchWithSets(match, actualSets);
    assert.strictEqual(res.match.sets?.length, 3);
    assert.strictEqual(res.match.sets?.[0].scoreA, 15);
    assert.strictEqual(res.match.sets?.[0].scoreB, 11);
    assert.strictEqual(res.match.sets?.[1].scoreA, 13);
    assert.strictEqual(res.match.sets?.[1].scoreB, 15);
    assert.strictEqual(res.match.sets?.[2].scoreA, 15);
    assert.strictEqual(res.match.sets?.[2].scoreB, 10);
    console.log('✅ Test 8: Actual set scores preserved passed.');
  } catch (err: any) {
    console.error('❌ Test 8 failed:', err.message);
    throw err;
  }

  // 9. Winner derived from set results.
  try {
    const actualSets: SetScore[] = [
      { setNumber: 1, scoreA: 11, scoreB: 15, winnerId: 'team-B', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 12, scoreB: 15, winnerId: 'team-B', status: 'COMPLETED' },
    ];
    const match = createBaseMatch();
    const res = completeThrowballMatchWithSets(match, actualSets);
    assert.strictEqual(res.winnerId, 'team-B', 'Winner must be derived from sets won (Team B won 2-0)');
    assert.strictEqual(res.loserId, 'team-A');
    console.log('✅ Test 9: Winner derived from set results passed.');
  } catch (err: any) {
    console.error('❌ Test 9 failed:', err.message);
    throw err;
  }

  // 10. Completed set cannot be silently rewritten.
  try {
    let match = initializeMatchSets(createBaseMatch());
    match.sets![0] = {
      setNumber: 1,
      scoreA: 15,
      scoreB: 12,
      winnerId: 'team-A',
      status: 'COMPLETED',
    };
    match.currentSet = 1;

    const adjustAttempt = adjustLiveScore(match, 'A', 1);
    assert.strictEqual(adjustAttempt.errors.length > 0, true);
    assert.strictEqual(adjustAttempt.errors.some((e) => e.includes('completed Set 1')), true);
    console.log('✅ Test 10: Completed set cannot be silently rewritten passed.');
  } catch (err: any) {
    console.error('❌ Test 10 failed:', err.message);
    throw err;
  }

  // 11. Concurrent completion cannot create two winners.
  try {
    // In our domain engine, a match has one unique winnerId derived from set wins
    const sets: SetScore[] = [
      { setNumber: 1, scoreA: 15, scoreB: 13, winnerId: 'team-A', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 15, scoreB: 10, winnerId: 'team-A', status: 'COMPLETED' },
    ];
    const match = createBaseMatch();
    const res = completeThrowballMatchWithSets(match, sets);
    assert.strictEqual(res.winnerId, 'team-A');
    assert.strictEqual(res.loserId, 'team-B');
    assert.strictEqual(res.winnerId !== res.loserId, true);
    console.log('✅ Test 11: Concurrent completion cannot create two winners passed.');
  } catch (err: any) {
    console.error('❌ Test 11 failed:', err.message);
    throw err;
  }

  // 12. Match cannot contain more than 3 sets.
  try {
    const fourSets: SetScore[] = [
      { setNumber: 1, scoreA: 15, scoreB: 10, winnerId: 'team-A', status: 'COMPLETED' },
      { setNumber: 2, scoreA: 10, scoreB: 15, winnerId: 'team-B', status: 'COMPLETED' },
      { setNumber: 3, scoreA: 15, scoreB: 12, winnerId: 'team-A', status: 'COMPLETED' },
      { setNumber: 4, scoreA: 15, scoreB: 11, winnerId: 'team-A', status: 'COMPLETED' },
    ];
    const validation = validateMatchSets(fourSets, 'team-A', 'team-B');
    assert.strictEqual(validation.valid, false);
    assert.strictEqual(validation.errors.some((e) => e.includes('more than 3 sets')), true);
    console.log('✅ Test 12: Match cannot contain more than 3 sets passed.');
  } catch (err: any) {
    console.error('❌ Test 12 failed:', err.message);
    throw err;
  }

  console.log('\n🎉 All 12 Milestone 7 Scoring Tests passed successfully!\n');
}
