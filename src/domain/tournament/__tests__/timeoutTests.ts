import { recordTimeout } from '../scoring/throwballScoringEngine';
import { DomainMatch } from '../models/types';

const assert = {
  strictEqual: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`);
  },
};

export function runMilestone7TimeoutTests() {
  console.log('Running Milestone 7: Timeout Engine Tests...\n');

  const createBaseMatch = (status: any = 'LIVE'): DomainMatch => ({
    id: 'm-to-1',
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
    status,
    winnerId: null,
    loserId: null,
    currentSet: 1,
    substitutions: [],
    timeouts: [],
  });

  // 1. Two timeouts allowed per team per set.
  try {
    let match = createBaseMatch();
    const to1 = recordTimeout(match, { setNumber: 1, teamId: 'team-A' });
    assert.strictEqual(to1.errors.length, 0);
    match = to1.match;

    const to2 = recordTimeout(match, { setNumber: 1, teamId: 'team-A' });
    assert.strictEqual(to2.errors.length, 0);
    match = to2.match;

    assert.strictEqual(match.timeouts?.filter((t) => t.setNumber === 1 && t.teamId === 'team-A').length, 2);
    console.log('✅ Test 1: Two timeouts allowed per team per set passed.');
  } catch (err: any) {
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }

  // 2. Third timeout rejected.
  try {
    let match = createBaseMatch();
    match = recordTimeout(match, { setNumber: 1, teamId: 'team-A' }).match;
    match = recordTimeout(match, { setNumber: 1, teamId: 'team-A' }).match;

    const to3 = recordTimeout(match, { setNumber: 1, teamId: 'team-A' });
    assert.strictEqual(to3.errors.length > 0, true);
    assert.strictEqual(to3.errors.some((e) => e.includes('Timeout limit reached')), true);
    console.log('✅ Test 2: Third timeout rejected passed.');
  } catch (err: any) {
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }

  // 3. Timeout count resets next set.
  try {
    let match = createBaseMatch();
    // Use 2 timeouts in Set 1
    match = recordTimeout(match, { setNumber: 1, teamId: 'team-A' }).match;
    match = recordTimeout(match, { setNumber: 1, teamId: 'team-A' }).match;

    // Set 2 should allow 2 fresh timeouts
    const set2To1 = recordTimeout(match, { setNumber: 2, teamId: 'team-A' });
    assert.strictEqual(set2To1.errors.length, 0, 'Timeout must reset for Set 2');
    match = set2To1.match;

    const set2To2 = recordTimeout(match, { setNumber: 2, teamId: 'team-A' });
    assert.strictEqual(set2To2.errors.length, 0);
    match = set2To2.match;

    assert.strictEqual(match.timeouts?.filter((t) => t.setNumber === 2 && t.teamId === 'team-A').length, 2);
    console.log('✅ Test 3: Timeout count resets next set passed.');
  } catch (err: any) {
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }

  // 4. Timeout assigned to correct team.
  try {
    let match = createBaseMatch();
    match = recordTimeout(match, { setNumber: 1, teamId: 'team-A' }).match;
    match = recordTimeout(match, { setNumber: 1, teamId: 'team-B' }).match;

    assert.strictEqual(match.timeouts?.filter((t) => t.teamId === 'team-A').length, 1);
    assert.strictEqual(match.timeouts?.filter((t) => t.teamId === 'team-B').length, 1);

    // Team B can still call a second timeout in Set 1
    const toB2 = recordTimeout(match, { setNumber: 1, teamId: 'team-B' });
    assert.strictEqual(toB2.errors.length, 0);
    console.log('✅ Test 4: Timeout assigned to correct team passed.');
  } catch (err: any) {
    console.error('❌ Test 4 failed:', err.message);
    throw err;
  }

  // 5. Timeout event preserved.
  try {
    const match = createBaseMatch();
    const res = recordTimeout(match, {
      setNumber: 1,
      teamId: 'team-A',
      id: 'to-fixed-1',
      timestamp: '2026-10-04T10:00:00Z',
    });
    assert.strictEqual(res.event.id, 'to-fixed-1');
    assert.strictEqual(res.event.durationMinutes, 3);
    assert.strictEqual(res.event.timestamp, '2026-10-04T10:00:00Z');
    assert.strictEqual(res.match.timeouts?.[0].id, 'to-fixed-1');
    console.log('✅ Test 5: Timeout event preserved passed.');
  } catch (err: any) {
    console.error('❌ Test 5 failed:', err.message);
    throw err;
  }

  console.log('\n🎉 All 5 Milestone 7 Timeout Tests passed successfully!\n');
}
