const assert = {
  strictEqual: (a: any, b: any, msg?: string) => { if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`); },
  deepStrictEqual: (a: any, b: any, msg?: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || 'Deep equality failed'); }
};
import { generateKnockout } from '../fixtures/knockout';
import { processMatchResult } from '../results/processResult';
import { TournamentRules } from '../models/types';

const rules: TournamentRules = { allowDraws: false };

function runTests() {
  console.log('Running Domain Tests...\n');

  // Test 1: Basic 8 Teams Knockout
  try {
    const teams = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];
    let matches = generateKnockout('tour1', 'stage1', teams);
    
    assert.strictEqual(matches.length, 7, '8 teams should have 7 matches');
    assert.strictEqual(matches.filter(m => m.round === 1).length, 4, 'Round 1 should have 4 matches');
    assert.strictEqual(matches.filter(m => m.round === 2).length, 2, 'Round 2 should have 2 matches');
    assert.strictEqual(matches.filter(m => m.round === 3).length, 1, 'Round 3 should have 1 match');

    // Complete QF 1
    let res = processMatchResult(matches, 'm-stage1-r1-p0', { scoreA: 2, scoreB: 1 }, rules);
    matches = res.updatedMatches;
    const qf1 = matches.find(m => m.id === 'm-stage1-r1-p0');
    assert.strictEqual(qf1?.status, 'COMPLETED');
    assert.strictEqual(qf1?.winnerId, 'T1');

    // Verify SF 1 has T1
    const sf1 = matches.find(m => m.id === 'm-stage1-r2-p0');
    assert.strictEqual(sf1?.participantA.type, 'TEAM');
    if (sf1?.participantA.type === 'TEAM') {
      assert.strictEqual(sf1.participantA.teamId, 'T1');
    }

    console.log('✅ Test 1: 8 Teams Knockout passed.');
  } catch (err: any) {
    console.error('❌ Test 1 failed:', err.message);
  }

  // Test 2: 6 Teams (Non-power-of-two, 2 Byes)
  try {
    const teams = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    let matches = generateKnockout('tour2', 'stage1', teams);
    
    // Bracket size 8 -> 7 matches total. 
    // Round 1 has 4 matches, 2 of which should be BYEs
    assert.strictEqual(matches.length, 7);
    const round1 = matches.filter(m => m.round === 1);
    const byes = round1.filter(m => m.participantB.type === 'BYE');
    assert.strictEqual(byes.length, 2, 'Should generate exactly 2 byes for 6 teams');
    
    // Byes should be automatically completed and propagated to round 2
    for (const byeMatch of byes) {
      assert.strictEqual(byeMatch.status, 'BYE_ADVANCEMENT');
    }

    // Verify propagation
    const sf1 = matches.find(m => m.id === 'm-stage1-r2-p0'); // First SF match
    // Because byes are placed at the start, T1 and T2 should be propagated to SF1
    assert.strictEqual(sf1?.participantA.type, 'TEAM');
    assert.strictEqual(sf1?.participantB.type, 'TEAM');

    console.log('✅ Test 2: 6 Teams (Byes) passed.');
  } catch (err: any) {
    console.error('❌ Test 2 failed:', err.message);
  }

  // Test 3: Idempotency
  try {
    const teams = ['T1', 'T2'];
    let matches = generateKnockout('tour3', 'stage1', teams);
    
    // Submit result
    let res = processMatchResult(matches, 'm-stage1-r1-p0', { scoreA: 2, scoreB: 1 }, rules);
    matches = res.updatedMatches;
    
    // Submit same result again
    let res2 = processMatchResult(matches, 'm-stage1-r1-p0', { scoreA: 2, scoreB: 1 }, rules);
    
    assert.deepStrictEqual(res.updatedMatches, res2.updatedMatches, 'Idempotency failed: matches changed on second submit');
    console.log('✅ Test 3: Idempotency passed.');
  } catch (err: any) {
    console.error('❌ Test 3 failed:', err.message);
  }

  // Test 4: Loser Dependency
  try {
    const matches = [
      {
        id: 'm-sf1', tournamentId: 'tour1', stageId: 'stage1',
        participantA: { type: 'TEAM', teamId: 'T1' },
        participantB: { type: 'TEAM', teamId: 'T2' },
        scoreA: 0, scoreB: 0, status: 'SCHEDULED',
        winnerId: null, loserId: null
      },
      {
        id: 'm-3rd-place', tournamentId: 'tour1', stageId: 'stage1',
        participantA: { type: 'TBD' },
        participantB: { type: 'TBD' },
        scoreA: 0, scoreB: 0, status: 'SCHEDULED',
        winnerId: null, loserId: null,
        dependencies: [{ sourceMatchId: 'm-sf1', outcome: 'LOSER', targetSlot: 'A' }]
      }
    ];

    const res = processMatchResult(matches as any, 'm-sf1', { scoreA: 2, scoreB: 1 }, rules);
    const m3rd = res.updatedMatches.find(m => m.id === 'm-3rd-place');
    
    // T1 won, so T2 is the loser and should go to m-3rd-place slot A
    assert.strictEqual(m3rd?.participantA.type, 'TEAM');
    if (m3rd?.participantA.type === 'TEAM') {
      assert.strictEqual(m3rd.participantA.teamId, 'T2');
    }

    console.log('✅ Test 4: Loser Dependency passed.');
  } catch (err: any) {
    console.error('❌ Test 4 failed:', err.message);
  }
}

runTests();
