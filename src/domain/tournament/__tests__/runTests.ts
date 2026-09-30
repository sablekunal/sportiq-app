const assert = {
  strictEqual: (a: any, b: any, msg?: string) => { if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`); },
  deepStrictEqual: (a: any, b: any, msg?: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || 'Deep equality failed'); }
};
import { generateKnockout } from '../fixtures/knockout';
import { generateRoundRobin } from '../fixtures/roundRobin';
import { processMatchResult } from '../results/processResult';
import { calculateStandings } from '../results/calculateStandings';
import { DomainMatch, TournamentRules } from '../models/types';
import { Team } from '../../../types';

const rules: TournamentRules = { allowDraws: false };

function runTests() {
  console.log('Running Domain Tests...\n');

  // Test 0: Round Robin Generation (4, 5, and 6 teams)
  try {
    // 4 teams -> 6 matches. Every pair must occur exactly once. No team plays itself.
    const teams4 = ['T1', 'T2', 'T3', 'T4'];
    const matches4 = generateRoundRobin('tour-rr4', 'stage-1', teams4);
    assert.strictEqual(matches4.length, 6, '4 teams should have 6 matches');
    
    const pairs4 = new Set<string>();
    const counts4: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0 };
    for (const m of matches4) {
      assert.strictEqual(m.participantA.type, 'TEAM');
      assert.strictEqual(m.participantB.type, 'TEAM');
      const a = (m.participantA as any).teamId;
      const b = (m.participantB as any).teamId;
      assert.strictEqual(a !== b, true, 'No team plays itself');
      counts4[a]++;
      counts4[b]++;
      const pairKey = [a, b].sort().join(' vs ');
      assert.strictEqual(pairs4.has(pairKey), false, `Pair ${pairKey} played more than once`);
      pairs4.add(pairKey);
    }
    assert.strictEqual(pairs4.size, 6, 'All 6 distinct pairs must play exactly once');
    teams4.forEach(t => assert.strictEqual(counts4[t], 3, `Each team in 4-team RR must play 3 matches`));

    // 5 teams -> 10 matches. Each team must play 4 matches.
    const teams5 = ['T1', 'T2', 'T3', 'T4', 'T5'];
    const matches5 = generateRoundRobin('tour-rr5', 'stage-1', teams5);
    assert.strictEqual(matches5.length, 10, '5 teams should have 10 matches');
    
    const pairs5 = new Set<string>();
    const counts5: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
    for (const m of matches5) {
      assert.strictEqual(m.participantA.type, 'TEAM');
      assert.strictEqual(m.participantB.type, 'TEAM');
      const a = (m.participantA as any).teamId;
      const b = (m.participantB as any).teamId;
      assert.strictEqual(a !== b, true, 'No team plays itself');
      counts5[a]++;
      counts5[b]++;
      const pairKey = [a, b].sort().join(' vs ');
      assert.strictEqual(pairs5.has(pairKey), false, `Pair ${pairKey} played more than once`);
      pairs5.add(pairKey);
    }
    assert.strictEqual(pairs5.size, 10, 'All 10 distinct pairs must play exactly once');
    teams5.forEach(t => assert.strictEqual(counts5[t], 4, `Each team in 5-team RR must play 4 matches`));

    // 6 teams -> 15 matches. Each team must play 5 matches.
    const teams6 = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
    const matches6 = generateRoundRobin('tour-rr6', 'stage-1', teams6);
    assert.strictEqual(matches6.length, 15, '6 teams should have 15 matches');
    
    const pairs6 = new Set<string>();
    const counts6: Record<string, number> = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0, T6: 0 };
    for (const m of matches6) {
      assert.strictEqual(m.participantA.type, 'TEAM');
      assert.strictEqual(m.participantB.type, 'TEAM');
      const a = (m.participantA as any).teamId;
      const b = (m.participantB as any).teamId;
      assert.strictEqual(a !== b, true, 'No team plays itself');
      counts6[a]++;
      counts6[b]++;
      const pairKey = [a, b].sort().join(' vs ');
      assert.strictEqual(pairs6.has(pairKey), false, `Pair ${pairKey} played more than once`);
      pairs6.add(pairKey);
    }
    assert.strictEqual(pairs6.size, 15, 'All 15 distinct pairs must play exactly once');
    teams6.forEach(t => assert.strictEqual(counts6[t], 5, `Each team in 6-team RR must play 5 matches`));

    console.log('✅ Test 0: Round Robin Generation (4, 5, and 6 teams) passed.');
  } catch (err: any) {
    console.error('❌ Test 0 failed:', err.message);
  }

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

  // Test 5: Standings Derivation & Status Isolation
  try {
    const teams: Team[] = [
      { id: 'T1', name: 'Team 1', shortName: 'T1', players: [] },
      { id: 'T2', name: 'Team 2', shortName: 'T2', players: [] },
      { id: 'T3', name: 'Team 3', shortName: 'T3', players: [] },
      { id: 'T4', name: 'Team 4', shortName: 'T4', players: [] },
    ];

    const matches: DomainMatch[] = [
      // Match 1: T1 (3) vs T2 (1) - COMPLETED (T1 win, T2 loss)
      {
        id: 'm1', tournamentId: 'tour-st', stageId: 's1', round: 1, position: 0,
        participantA: { type: 'TEAM', teamId: 'T1' },
        participantB: { type: 'TEAM', teamId: 'T2' },
        scoreA: 3, scoreB: 1, status: 'COMPLETED',
        winnerId: 'T1', loserId: 'T2', dependencies: []
      },
      // Match 2: T3 (2) vs T4 (2) - COMPLETED DRAW
      {
        id: 'm2', tournamentId: 'tour-st', stageId: 's1', round: 1, position: 1,
        participantA: { type: 'TEAM', teamId: 'T3' },
        participantB: { type: 'TEAM', teamId: 'T4' },
        scoreA: 2, scoreB: 2, status: 'COMPLETED',
        winnerId: null, loserId: null, dependencies: []
      },
      // Match 3: T1 (10) vs T3 (5) - LIVE (must NOT affect standings)
      {
        id: 'm3', tournamentId: 'tour-st', stageId: 's1', round: 2, position: 0,
        participantA: { type: 'TEAM', teamId: 'T1' },
        participantB: { type: 'TEAM', teamId: 'T3' },
        scoreA: 10, scoreB: 5, status: 'LIVE',
        winnerId: null, loserId: null, dependencies: []
      },
      // Match 4: T2 (0) vs T4 (0) - SCHEDULED (must NOT affect standings)
      {
        id: 'm4', tournamentId: 'tour-st', stageId: 's1', round: 2, position: 1,
        participantA: { type: 'TEAM', teamId: 'T2' },
        participantB: { type: 'TEAM', teamId: 'T4' },
        scoreA: 0, scoreB: 0, status: 'SCHEDULED',
        winnerId: null, loserId: null, dependencies: []
      }
    ];

    const standingsRules: TournamentRules = {
      allowDraws: true,
      pointsForWin: 3,
      pointsForDraw: 1,
      pointsForLoss: 0,
    };

    const standings = calculateStandings(matches, teams, standingsRules);
    const stMap = new Map(standings.map(s => [s.teamId, s]));

    // T1: 1 match played, 1 won, 0 draw, 0 lost, scored 3, conceded 1, diff +2, pts 3
    const st1 = stMap.get('T1')!;
    assert.strictEqual(st1.played, 1, 'T1 played should be 1 (LIVE match ignored)');
    assert.strictEqual(st1.won, 1, 'T1 won should be 1');
    assert.strictEqual(st1.draw, 0, 'T1 draw should be 0');
    assert.strictEqual(st1.lost, 0, 'T1 lost should be 0');
    assert.strictEqual(st1.scored, 3, 'T1 scored should be 3');
    assert.strictEqual(st1.conceded, 1, 'T1 conceded should be 1');
    assert.strictEqual(st1.difference, 2, 'T1 difference should be 2');
    assert.strictEqual(st1.points, 3, 'T1 points should be 3');

    // T2: 1 match played, 0 won, 0 draw, 1 lost, scored 1, conceded 3, diff -2, pts 0
    const st2 = stMap.get('T2')!;
    assert.strictEqual(st2.played, 1, 'T2 played should be 1 (SCHEDULED match ignored)');
    assert.strictEqual(st2.won, 0, 'T2 won should be 0');
    assert.strictEqual(st2.draw, 0, 'T2 draw should be 0');
    assert.strictEqual(st2.lost, 1, 'T2 lost should be 1');
    assert.strictEqual(st2.scored, 1, 'T2 scored should be 1');
    assert.strictEqual(st2.conceded, 3, 'T2 conceded should be 3');
    assert.strictEqual(st2.difference, -2, 'T2 difference should be -2');
    assert.strictEqual(st2.points, 0, 'T2 points should be 0');

    // T3: 1 match played, 0 won, 1 draw, 0 lost, scored 2, conceded 2, diff 0, pts 1
    const st3 = stMap.get('T3')!;
    assert.strictEqual(st3.played, 1, 'T3 played should be 1 (LIVE match ignored)');
    assert.strictEqual(st3.won, 0, 'T3 won should be 0');
    assert.strictEqual(st3.draw, 1, 'T3 draw should be 1');
    assert.strictEqual(st3.lost, 0, 'T3 lost should be 0');
    assert.strictEqual(st3.scored, 2, 'T3 scored should be 2');
    assert.strictEqual(st3.conceded, 2, 'T3 conceded should be 2');
    assert.strictEqual(st3.difference, 0, 'T3 difference should be 0');
    assert.strictEqual(st3.points, 1, 'T3 points should be 1');

    // T4: 1 match played, 0 won, 1 draw, 0 lost, scored 2, conceded 2, diff 0, pts 1
    const st4 = stMap.get('T4')!;
    assert.strictEqual(st4.played, 1, 'T4 played should be 1 (SCHEDULED match ignored)');
    assert.strictEqual(st4.won, 0, 'T4 won should be 0');
    assert.strictEqual(st4.draw, 1, 'T4 draw should be 1');
    assert.strictEqual(st4.lost, 0, 'T4 lost should be 0');
    assert.strictEqual(st4.scored, 2, 'T4 scored should be 2');
    assert.strictEqual(st4.conceded, 2, 'T4 conceded should be 2');
    assert.strictEqual(st4.difference, 0, 'T4 difference should be 0');
    assert.strictEqual(st4.points, 1, 'T4 points should be 1');

    console.log('✅ Test 5: Standings Derivation & Status Isolation passed.');
  } catch (err: any) {
    console.error('❌ Test 5 failed:', err.message);
  }
}

runTests();
