import { generateFourGroupTournament } from '../fixtures/groupKnockout';
import { processMatchResult } from '../results/processResult';
import { calculateAllFourGroupStandings } from '../results/throwballStandings';
import { validateTeamRoster, THROWBALL_ROSTER_RULES } from '../roster/rosterRules';
import { DomainMatch, TournamentRules } from '../models/types';
import { Team, Player, SetScore } from '../../../types';

const assert = {
  strictEqual: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`);
  },
  deepStrictEqual: (a: any, b: any, msg?: string) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || 'Deep equality failed');
  },
};

const tournamentRules: TournamentRules = {
  allowDraws: false,
  winPoints: 2,
  lossPoints: 0,
};

export function runMilestone7FullSimulationTests() {
  console.log('Running Milestone 7: Deterministic Full 27-Fixture Throwball End-to-End Simulation...\n');

  // 1. Create 16 teams with 8 finalized players each
  const createPlayer = (id: string, name: string, jersey: number, isCap = false): Player => ({
    id,
    name,
    jerseyNumber: jersey,
    role: isCap ? 'Captain (C)' : 'Court Player',
    isCaptain: isCap,
  });

  const allTeams: Team[] = [];
  const groupAssignments: Record<'A' | 'B' | 'C' | 'D', string[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
  };

  const groups: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
  for (const grp of groups) {
    for (let pos = 1; pos <= 4; pos++) {
      const teamId = `team-${grp}${pos}`;
      const players: Player[] = [];
      for (let p = 1; p <= 8; p++) {
        players.push(
          createPlayer(
            `${teamId}-p${p}`,
            `${grp}${pos} Player ${p}`,
            p,
            p === 1
          )
        );
      }
      const team: Team = {
        id: teamId,
        name: `Group ${grp} Team ${pos}`,
        shortName: `${grp}${pos}`,
        groupId: grp,
        players,
        captainId: players[0].id,
        rosterStatus: 'COMPLETE',
        isRosterLocked: true,
      };

      // Verify each roster passes 8-player Throwball validation
      const rosterCheck = validateTeamRoster(team, THROWBALL_ROSTER_RULES);
      assert.strictEqual(rosterCheck.isValid, true, `Team ${teamId} must be valid`);
      assert.strictEqual(rosterCheck.isComplete, true);

      allTeams.push(team);
      groupAssignments[grp].push(teamId);
    }
  }

  assert.strictEqual(allTeams.length, 16, 'Must have exactly 16 registered teams');

  // 2. Generate canonical 27 fixtures
  let matches = generateFourGroupTournament({
    tournamentId: 'sxy-throwball-2026',
    stageId: 'sxy-stage',
    groupAssignments,
  });

  assert.strictEqual(matches.length, 27, 'Total fixtures must be 27');
  const initialFixtureIds = matches.map((m) => m.id);

  // 3. Play all 24 group matches with realistic best-of-3 Throwball sets (to 15 points)
  // Let team 1 of each group win all their matches 2-0:
  // Position 1 vs 2, 1 vs 3, 1 vs 4
  // Position 2 vs 3, 2 vs 4
  // Position 3 vs 4

  for (const grp of groups) {
    const t1 = `team-${grp}1`;
    const t2 = `team-${grp}2`;
    const t3 = `team-${grp}3`;
    const t4 = `team-${grp}4`;

    const groupFixtures = [
      // M1: 1 vs 2 -> 1 wins 2-0 (15-11, 15-9)
      { code: `${grp}-M1`, teamA: t1, teamB: t2, sets: [
        { setNumber: 1, scoreA: 15, scoreB: 11, winnerId: t1, status: 'COMPLETED' as const },
        { setNumber: 2, scoreA: 15, scoreB: 9, winnerId: t1, status: 'COMPLETED' as const },
      ]},
      // M2: 1 vs 3 -> 1 wins 2-0 (15-10, 15-8)
      { code: `${grp}-M2`, teamA: t1, teamB: t3, sets: [
        { setNumber: 1, scoreA: 15, scoreB: 10, winnerId: t1, status: 'COMPLETED' as const },
        { setNumber: 2, scoreA: 15, scoreB: 8, winnerId: t1, status: 'COMPLETED' as const },
      ]},
      // M3: 1 vs 4 -> 1 wins 2-0 (15-7, 15-12)
      { code: `${grp}-M3`, teamA: t1, teamB: t4, sets: [
        { setNumber: 1, scoreA: 15, scoreB: 7, winnerId: t1, status: 'COMPLETED' as const },
        { setNumber: 2, scoreA: 15, scoreB: 12, winnerId: t1, status: 'COMPLETED' as const },
      ]},
      // M4: 2 vs 3 -> 2 wins 2-1 (15-12, 13-15, 15-10)
      { code: `${grp}-M4`, teamA: t2, teamB: t3, sets: [
        { setNumber: 1, scoreA: 15, scoreB: 12, winnerId: t2, status: 'COMPLETED' as const },
        { setNumber: 2, scoreA: 13, scoreB: 15, winnerId: t3, status: 'COMPLETED' as const },
        { setNumber: 3, scoreA: 15, scoreB: 10, winnerId: t2, status: 'COMPLETED' as const },
      ]},
      // M5: 2 vs 4 -> 2 wins 2-0 (15-11, 15-13)
      { code: `${grp}-M5`, teamA: t2, teamB: t4, sets: [
        { setNumber: 1, scoreA: 15, scoreB: 11, winnerId: t2, status: 'COMPLETED' as const },
        { setNumber: 2, scoreA: 15, scoreB: 13, winnerId: t2, status: 'COMPLETED' as const },
      ]},
      // M6: 3 vs 4 -> 3 wins 2-0 (15-10, 15-8)
      { code: `${grp}-M6`, teamA: t3, teamB: t4, sets: [
        { setNumber: 1, scoreA: 15, scoreB: 10, winnerId: t3, status: 'COMPLETED' as const },
        { setNumber: 2, scoreA: 15, scoreB: 8, winnerId: t3, status: 'COMPLETED' as const },
      ]},
    ];

    for (const fixture of groupFixtures) {
      const targetMatch = matches.find((m) => m.matchCode === fixture.code)!;
      assert.strictEqual(Boolean(targetMatch), true, `Fixture ${fixture.code} must exist`);

      const setsWonA = fixture.sets.filter((s) => s.winnerId === fixture.teamA).length;
      const setsWonB = fixture.sets.filter((s) => s.winnerId === fixture.teamB).length;

      const result = processMatchResult(
        matches,
        targetMatch.id,
        {
          scoreA: setsWonA,
          scoreB: setsWonB,
          sets: fixture.sets,
        },
        tournamentRules
      );

      assert.strictEqual(result.errors.length, 0);
      matches = result.updatedMatches;

      // Verify actual set scores are preserved in the match object
      const updated = matches.find((m) => m.id === targetMatch.id)!;
      assert.strictEqual(updated.status, 'COMPLETED');
      assert.strictEqual(updated.sets?.length, fixture.sets.length);
      assert.strictEqual(updated.sets?.[0].scoreA, fixture.sets[0].scoreA);
      assert.strictEqual(updated.sets?.[0].scoreB, fixture.sets[0].scoreB);
    }
  }

  // 4. Verify derived standings for all 4 groups
  const standings = calculateAllFourGroupStandings(matches, allTeams);
  for (const grp of groups) {
    const grpStandings = standings[grp];
    assert.strictEqual(grpStandings.length, 4);

    // Position 1 team should have 3 wins, 6 sets won, 0 lost (+6 SD)
    const leader = grpStandings[0];
    assert.strictEqual(leader.teamId, `team-${grp}1`);
    assert.strictEqual(leader.won, 3);
    assert.strictEqual(leader.lost, 0);
    assert.strictEqual(leader.setsWon, 6);
    assert.strictEqual(leader.setsLost, 0);
    assert.strictEqual(leader.setDifference, 6);
    assert.strictEqual(leader.rank, 1);
    assert.strictEqual(leader.qualified, true, `Group ${grp} leader must qualify`);

    // 2nd place team should have 2 wins, 1 loss
    assert.strictEqual(grpStandings[1].teamId, `team-${grp}2`);
    assert.strictEqual(grpStandings[1].won, 2);
    assert.strictEqual(grpStandings[1].lost, 1);
    assert.strictEqual(grpStandings[1].rank, 2);
    assert.strictEqual(grpStandings[1].qualified, false);

    // 3rd place team should have 1 win, 2 losses
    assert.strictEqual(grpStandings[2].teamId, `team-${grp}3`);
    assert.strictEqual(grpStandings[2].won, 1);
    assert.strictEqual(grpStandings[2].lost, 2);

    // 4th place team should have 0 wins, 3 losses
    assert.strictEqual(grpStandings[3].teamId, `team-${grp}4`);
    assert.strictEqual(grpStandings[3].won, 0);
    assert.strictEqual(grpStandings[3].lost, 3);
  }

  // 5. Verify Semifinal participants resolved automatically from group winners:
  // SF1 (Fixture 25): Winner Group A (team-A1) vs Winner Group B (team-B1)
  const sf1 = matches.find((m) => m.matchCode === 'SF-M1')!;
  assert.strictEqual(sf1.fixtureNumber, 25);
  assert.strictEqual(sf1.participantA.type, 'TEAM');
  assert.strictEqual((sf1.participantA as any).teamId, 'team-A1');
  assert.strictEqual(sf1.participantB.type, 'TEAM');
  assert.strictEqual((sf1.participantB as any).teamId, 'team-B1');

  // SF2 (Fixture 26): Winner Group C (team-C1) vs Winner Group D (team-D1)
  const sf2 = matches.find((m) => m.matchCode === 'SF-M2')!;
  assert.strictEqual(sf2.fixtureNumber, 26);
  assert.strictEqual(sf2.participantA.type, 'TEAM');
  assert.strictEqual((sf2.participantA as any).teamId, 'team-C1');
  assert.strictEqual(sf2.participantB.type, 'TEAM');
  assert.strictEqual((sf2.participantB as any).teamId, 'team-D1');

  // Final (Fixture 27) remains TBD before semifinals
  let finalMatch = matches.find((m) => m.matchCode === 'F-M1')!;
  assert.strictEqual(finalMatch.fixtureNumber, 27);
  assert.strictEqual(finalMatch.participantA.type, 'TBD');
  assert.strictEqual(finalMatch.participantB.type, 'TBD');

  // 6. Complete Semifinal 1: team-A1 defeats team-B1 (2-1 sets: 15-13, 12-15, 15-11)
  const sf1Sets: SetScore[] = [
    { setNumber: 1, scoreA: 15, scoreB: 13, winnerId: 'team-A1', status: 'COMPLETED' },
    { setNumber: 2, scoreA: 12, scoreB: 15, winnerId: 'team-B1', status: 'COMPLETED' },
    { setNumber: 3, scoreA: 15, scoreB: 11, winnerId: 'team-A1', status: 'COMPLETED' },
  ];
  matches = processMatchResult(matches, sf1.id, { scoreA: 2, scoreB: 1, sets: sf1Sets }, tournamentRules).updatedMatches;

  finalMatch = matches.find((m) => m.matchCode === 'F-M1')!;
  assert.strictEqual(finalMatch.participantA.type, 'TEAM');
  assert.strictEqual((finalMatch.participantA as any).teamId, 'team-A1');
  assert.strictEqual(finalMatch.participantB.type, 'TBD');

  // 7. Complete Semifinal 2: team-D1 defeats team-C1 (2-0 sets: 15-12, 15-10)
  const sf2Sets: SetScore[] = [
    { setNumber: 1, scoreA: 12, scoreB: 15, winnerId: 'team-D1', status: 'COMPLETED' },
    { setNumber: 2, scoreA: 10, scoreB: 15, winnerId: 'team-D1', status: 'COMPLETED' },
  ];
  matches = processMatchResult(matches, sf2.id, { scoreA: 0, scoreB: 2, sets: sf2Sets }, tournamentRules).updatedMatches;

  finalMatch = matches.find((m) => m.matchCode === 'F-M1')!;
  assert.strictEqual(finalMatch.participantB.type, 'TEAM');
  assert.strictEqual((finalMatch.participantB as any).teamId, 'team-D1');

  // 8. Complete Championship Final: team-A1 vs team-D1 (team-A1 wins 2-1: 15-10, 13-15, 15-12)
  const finalSets: SetScore[] = [
    { setNumber: 1, scoreA: 15, scoreB: 10, winnerId: 'team-A1', status: 'COMPLETED' },
    { setNumber: 2, scoreA: 13, scoreB: 15, winnerId: 'team-D1', status: 'COMPLETED' },
    { setNumber: 3, scoreA: 15, scoreB: 12, winnerId: 'team-A1', status: 'COMPLETED' },
  ];
  matches = processMatchResult(matches, finalMatch.id, { scoreA: 2, scoreB: 1, sets: finalSets }, tournamentRules).updatedMatches;

  const finishedFinal = matches.find((m) => m.matchCode === 'F-M1')!;
  assert.strictEqual(finishedFinal.status, 'COMPLETED');
  assert.strictEqual(finishedFinal.winnerId, 'team-A1');
  assert.strictEqual(finishedFinal.loserId, 'team-D1');

  // 9. Comprehensive Tournament Invariants Verification:
  // - All 27 fixture identities remain stable
  assert.strictEqual(matches.length, 27);
  assert.deepStrictEqual(matches.map((m) => m.id), initialFixtureIds);

  // - All 27 fixtures are COMPLETED
  assert.strictEqual(matches.every((m) => m.status === 'COMPLETED'), true);

  // - Actual set scores are preserved in ALL 27 matches
  assert.strictEqual(
    matches.every((m) => m.sets && m.sets.length >= 2 && m.sets.every((s) => s.status === 'COMPLETED')),
    true,
    'Every fixture must preserve actual completed set scores'
  );

  // - No duplicate advancement or corrupt dependency mappings
  assert.strictEqual(matches.filter((m) => m.matchCode === 'SF-M1').length, 1);
  assert.strictEqual(matches.filter((m) => m.matchCode === 'SF-M2').length, 1);
  assert.strictEqual(matches.filter((m) => m.matchCode === 'F-M1').length, 1);

  console.log('✅ Milestone 7: Full 27-Fixture Throwball End-to-End Simulation passed successfully!\n');
}
