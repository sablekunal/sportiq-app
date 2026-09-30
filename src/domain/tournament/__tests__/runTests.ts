const assert = {
  strictEqual: (a: any, b: any, msg?: string) => { if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`); },
  deepStrictEqual: (a: any, b: any, msg?: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || 'Deep equality failed'); }
};
import { generateKnockout } from '../fixtures/knockout';
import { generateRoundRobin } from '../fixtures/roundRobin';
import {
  generateOrdered4TeamGroupFixtures,
  generateFourGroupTournament,
  assignTeamToGroupPosition,
  applyGroupAssignments,
} from '../fixtures/groupKnockout';
import { processMatchResult } from '../results/processResult';
import { calculateStandings } from '../results/calculateStandings';
import { DomainMatch, TournamentRules, MatchParticipant } from '../models/types';
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

  // Helper to extract participant label or teamId
  const getParticipantLabel = (p: MatchParticipant): string => {
    if (p.type === 'TEAM') return p.teamId;
    if (p.type === 'TBD') return p.label || 'TBD';
    return 'BYE';
  };

  const toMatchPair = (match: DomainMatch, expectedA: string, expectedB: string) => {
    const a = getParticipantLabel(match.participantA);
    const b = getParticipantLabel(match.participantB);
    assert.strictEqual(
      a,
      expectedA,
      `Match ${match.matchCode}: Expected participant A to be '${expectedA}', got '${a}'`
    );
    assert.strictEqual(
      b,
      expectedB,
      `Match ${match.matchCode}: Expected participant B to be '${expectedB}', got '${b}'`
    );
  };

  // Test 6: Authoritative Fixture Ordering for Groups A, B, C, D
  try {
    const allMatches = generateFourGroupTournament({ tournamentId: 'st-xaviers-tour' });
    const groupA = allMatches.filter((m) => m.groupId === 'A');
    const groupB = allMatches.filter((m) => m.groupId === 'B');
    const groupC = allMatches.filter((m) => m.groupId === 'C');
    const groupD = allMatches.filter((m) => m.groupId === 'D');

    // Group A Invariant: A1 vs A2, A1 vs A3, A1 vs A4, A2 vs A3, A2 vs A4, A3 vs A4
    assert.strictEqual(groupA.length, 6, 'Group A must have exactly 6 matches');
    toMatchPair(groupA[0], 'A1', 'A2');
    toMatchPair(groupA[1], 'A1', 'A3');
    toMatchPair(groupA[2], 'A1', 'A4');
    toMatchPair(groupA[3], 'A2', 'A3');
    toMatchPair(groupA[4], 'A2', 'A4');
    toMatchPair(groupA[5], 'A3', 'A4');

    // Group B Invariant: B1 vs B2, B1 vs B3, B1 vs B4, B2 vs B3, B2 vs B4, B3 vs B4
    assert.strictEqual(groupB.length, 6, 'Group B must have exactly 6 matches');
    toMatchPair(groupB[0], 'B1', 'B2');
    toMatchPair(groupB[1], 'B1', 'B3');
    toMatchPair(groupB[2], 'B1', 'B4');
    toMatchPair(groupB[3], 'B2', 'B3');
    toMatchPair(groupB[4], 'B2', 'B4');
    toMatchPair(groupB[5], 'B3', 'B4');

    // Group C Invariant: C1 vs C2, C1 vs C3, C1 vs C4, C2 vs C3, C2 vs C4, C3 vs C4
    assert.strictEqual(groupC.length, 6, 'Group C must have exactly 6 matches');
    toMatchPair(groupC[0], 'C1', 'C2');
    toMatchPair(groupC[1], 'C1', 'C3');
    toMatchPair(groupC[2], 'C1', 'C4');
    toMatchPair(groupC[3], 'C2', 'C3');
    toMatchPair(groupC[4], 'C2', 'C4');
    toMatchPair(groupC[5], 'C3', 'C4');

    // Group D Invariant: D1 vs D2, D1 vs D3, D1 vs D4, D2 vs D3, D2 vs D4, D3 vs D4
    assert.strictEqual(groupD.length, 6, 'Group D must have exactly 6 matches');
    toMatchPair(groupD[0], 'D1', 'D2');
    toMatchPair(groupD[1], 'D1', 'D3');
    toMatchPair(groupD[2], 'D1', 'D4');
    toMatchPair(groupD[3], 'D2', 'D3');
    toMatchPair(groupD[4], 'D2', 'D4');
    toMatchPair(groupD[5], 'D3', 'D4');

    console.log('✅ Test 6: Authoritative Fixture Ordering for Groups A, B, C, D passed.');
  } catch (err: any) {
    console.error('❌ Test 6 failed:', err.message);
  }

  // Test 7: Local Match Numbering & Canonical Sequence (27 Total Matches)
  try {
    const allMatches = generateFourGroupTournament({ tournamentId: 'st-xaviers-tour' });
    assert.strictEqual(allMatches.length, 27, 'Total matches must be exactly 27 (24 group + 2 semi + 1 final)');

    // Verify 1..27 fixture numbers are strictly sequential
    allMatches.forEach((m, idx) => {
      assert.strictEqual(m.fixtureNumber, idx + 1, `Match ${m.id} fixtureNumber should be ${idx + 1}`);
    });

    // Verify local match codes in Group A
    const expectedCodesA = ['A-M1', 'A-M2', 'A-M3', 'A-M4', 'A-M5', 'A-M6'];
    const groupA = allMatches.filter((m) => m.groupId === 'A');
    groupA.forEach((m, idx) => assert.strictEqual(m.matchCode, expectedCodesA[idx]));

    // Verify local match codes in Group B
    const expectedCodesB = ['B-M1', 'B-M2', 'B-M3', 'B-M4', 'B-M5', 'B-M6'];
    const groupB = allMatches.filter((m) => m.groupId === 'B');
    groupB.forEach((m, idx) => assert.strictEqual(m.matchCode, expectedCodesB[idx]));

    // Verify local match codes in Group C
    const expectedCodesC = ['C-M1', 'C-M2', 'C-M3', 'C-M4', 'C-M5', 'C-M6'];
    const groupC = allMatches.filter((m) => m.groupId === 'C');
    groupC.forEach((m, idx) => assert.strictEqual(m.matchCode, expectedCodesC[idx]));

    // Verify local match codes in Group D
    const expectedCodesD = ['D-M1', 'D-M2', 'D-M3', 'D-M4', 'D-M5', 'D-M6'];
    const groupD = allMatches.filter((m) => m.groupId === 'D');
    groupD.forEach((m, idx) => assert.strictEqual(m.matchCode, expectedCodesD[idx]));

    // Verify Knockout local codes
    assert.strictEqual(allMatches[24].matchCode, 'SF-M1', 'Semi-final 1 code must be SF-M1');
    assert.strictEqual(allMatches[25].matchCode, 'SF-M2', 'Semi-final 2 code must be SF-M2');
    assert.strictEqual(allMatches[26].matchCode, 'F-M1', 'Final code must be F-M1');

    console.log('✅ Test 7: Local Match Numbering & Canonical Sequence passed.');
  } catch (err: any) {
    console.error('❌ Test 7 failed:', err.message);
  }

  // Test 8: Knockout Qualification Mapping & Advancement
  try {
    let allMatches = generateFourGroupTournament({ tournamentId: 'st-xaviers-tour' });
    const sf1 = allMatches.find((m) => m.matchCode === 'SF-M1')!;
    const sf2 = allMatches.find((m) => m.matchCode === 'SF-M2')!;
    const finalMatch = allMatches.find((m) => m.matchCode === 'F-M1')!;

    // Assert initial TBD labels
    toMatchPair(sf1, 'Winner Group A', 'Winner Group B');
    toMatchPair(sf2, 'Winner Group C', 'Winner Group D');
    toMatchPair(finalMatch, 'Winner Semi-final 1', 'Winner Semi-final 2');

    // Assert dependency linkages
    assert.deepStrictEqual(sf1.dependencies, [
      { sourceGroupId: 'A', rank: 1, targetSlot: 'A' },
      { sourceGroupId: 'B', rank: 1, targetSlot: 'B' },
    ]);
    assert.deepStrictEqual(sf2.dependencies, [
      { sourceGroupId: 'C', rank: 1, targetSlot: 'A' },
      { sourceGroupId: 'D', rank: 1, targetSlot: 'B' },
    ]);
    assert.deepStrictEqual(finalMatch.dependencies, [
      { sourceMatchId: sf1.id, outcome: 'WINNER', targetSlot: 'A' },
      { sourceMatchId: sf2.id, outcome: 'WINNER', targetSlot: 'B' },
    ]);

    // Simulate group winners qualifying for SF1 and SF2
    sf1.participantA = { type: 'TEAM', teamId: 'Team_A_Winner' };
    sf1.participantB = { type: 'TEAM', teamId: 'Team_B_Winner' };
    sf2.participantA = { type: 'TEAM', teamId: 'Team_C_Winner' };
    sf2.participantB = { type: 'TEAM', teamId: 'Team_D_Winner' };

    // Play SF 1: Team_A_Winner defeats Team_B_Winner
    const sf1Res = processMatchResult(allMatches, sf1.id, { scoreA: 25, scoreB: 20 }, rules);
    allMatches = sf1Res.updatedMatches;

    // Verify Final participant A is automatically resolved to Team_A_Winner
    const updatedFinal1 = allMatches.find((m) => m.matchCode === 'F-M1')!;
    assert.strictEqual(updatedFinal1.participantA.type, 'TEAM');
    if (updatedFinal1.participantA.type === 'TEAM') {
      assert.strictEqual(updatedFinal1.participantA.teamId, 'Team_A_Winner');
    }

    // Play SF 2: Team_D_Winner defeats Team_C_Winner
    const sf2Res = processMatchResult(allMatches, sf2.id, { scoreA: 19, scoreB: 25 }, rules);
    allMatches = sf2Res.updatedMatches;

    // Verify Final participant B is automatically resolved to Team_D_Winner
    const updatedFinal2 = allMatches.find((m) => m.matchCode === 'F-M1')!;
    assert.strictEqual(updatedFinal2.participantB.type, 'TEAM');
    if (updatedFinal2.participantB.type === 'TEAM') {
      assert.strictEqual(updatedFinal2.participantB.teamId, 'Team_D_Winner');
    }

    console.log('✅ Test 8: Knockout Qualification Mapping & Advancement passed.');
  } catch (err: any) {
    console.error('❌ Test 8 failed:', err.message);
  }

  // Test 9: Determinism Invariant
  try {
    const config = {
      tournamentId: 'tour-det-1',
      stageId: 'st-xaviers',
      groupAssignments: {
        A: ['A1_id', 'A2_id', 'A3_id', 'A4_id'],
        B: ['B1_id', 'B2_id', 'B3_id', 'B4_id'],
        C: ['C1_id', 'C2_id', 'C3_id', 'C4_id'],
        D: ['D1_id', 'D2_id', 'D3_id', 'D4_id'],
      },
    };

    const run1 = generateFourGroupTournament(config);
    const run2 = generateFourGroupTournament(config);

    assert.strictEqual(run1.length, run2.length, 'Length must be identical');
    assert.deepStrictEqual(run1, run2, 'Two generations from the same tournament configuration must produce identical results');

    console.log('✅ Test 9: Determinism Invariant passed.');
  } catch (err: any) {
    console.error('❌ Test 9 failed:', err.message);
  }

  // Test 10: Position vs Team Identity Independence
  try {
    // Generate tournament with empty or default slots
    let matches = generateFourGroupTournament({ tournamentId: 'tour-positions' });

    // Initially Group A Match 1 is A1 vs A2
    const m1Initial = matches.find((m) => m.matchCode === 'A-M1')!;
    toMatchPair(m1Initial, 'A1', 'A2');

    // Organizer assigns "Team X" to Position A1
    matches = assignTeamToGroupPosition(matches, 'A', 1, 'Team_X');

    // Verify Group A fixtures resolve:
    // Match 1 (P1 vs P2): Team_X vs A2
    // Match 2 (P1 vs P3): Team_X vs A3
    // Match 3 (P1 vs P4): Team_X vs A4
    // Match 4 (P2 vs P3): A2 vs A3 (untouched)
    // Match 5 (P2 vs P4): A2 vs A4 (untouched)
    // Match 6 (P3 vs P4): A3 vs A4 (untouched)
    const m1 = matches.find((m) => m.matchCode === 'A-M1')!;
    const m2 = matches.find((m) => m.matchCode === 'A-M2')!;
    const m3 = matches.find((m) => m.matchCode === 'A-M3')!;
    const m4 = matches.find((m) => m.matchCode === 'A-M4')!;
    const m5 = matches.find((m) => m.matchCode === 'A-M5')!;
    const m6 = matches.find((m) => m.matchCode === 'A-M6')!;

    toMatchPair(m1, 'Team_X', 'A2');
    toMatchPair(m2, 'Team_X', 'A3');
    toMatchPair(m3, 'Team_X', 'A4');
    toMatchPair(m4, 'A2', 'A3');
    toMatchPair(m5, 'A2', 'A4');
    toMatchPair(m6, 'A3', 'A4');

    // Re-assign Position A1 to "Team Z"
    matches = assignTeamToGroupPosition(matches, 'A', 1, 'Team_Z');
    const m1Reassigned = matches.find((m) => m.matchCode === 'A-M1')!;
    toMatchPair(m1Reassigned, 'Team_Z', 'A2');

    // Unassign Position A1 (null)
    matches = assignTeamToGroupPosition(matches, 'A', 1, null);
    const m1Unassigned = matches.find((m) => m.matchCode === 'A-M1')!;
    toMatchPair(m1Unassigned, 'A1', 'A2');

    console.log('✅ Test 10: Position vs Team Identity Independence passed.');
  } catch (err: any) {
    console.error('❌ Test 10 failed:', err.message);
  }
}

runTests();
