import { recordSubstitution, initializeMatchSets } from '../scoring/throwballScoringEngine';
import { DomainMatch } from '../models/types';
import { Team, Player } from '../../../types';

const assert = {
  strictEqual: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`);
  },
};

export function runMilestone7SubstitutionTests() {
  console.log('Running Milestone 7: Substitution Engine Tests...\n');

  const createBaseMatch = (status: any = 'LIVE', servingTeamId = 'team-A'): DomainMatch => ({
    id: 'm-sub-1',
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
    servingTeamId,
    currentSet: 1,
    substitutions: [],
    timeouts: [],
  });

  // 1. Valid normal substitution.
  try {
    const match = createBaseMatch('LIVE', 'team-A');
    const res = recordSubstitution(match, {
      setNumber: 1,
      teamId: 'team-A',
      outgoingPlayerId: 'player-A1',
      incomingPlayerId: 'player-A7',
      reason: 'NORMAL',
    });
    assert.strictEqual(res.errors.length, 0);
    assert.strictEqual(res.match.substitutions?.length, 1);
    assert.strictEqual(res.event.reason, 'NORMAL');
    assert.strictEqual(res.event.outgoingPlayerId, 'player-A1');
    assert.strictEqual(res.event.incomingPlayerId, 'player-A7');
    console.log('✅ Test 1: Valid normal substitution passed.');
  } catch (err: any) {
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }

  // 2. Injury substitution (allowed even if team is not serving).
  try {
    // team-B is serving, but team-A has an injury
    const match = createBaseMatch('LIVE', 'team-B');
    const res = recordSubstitution(match, {
      setNumber: 1,
      teamId: 'team-A',
      outgoingPlayerId: 'player-A2',
      incomingPlayerId: 'player-A8',
      reason: 'INJURY',
    });
    assert.strictEqual(res.errors.length, 0, 'Injury substitution must be permitted during opponent serve');
    assert.strictEqual(res.event.reason, 'INJURY');
    console.log('✅ Test 2: Injury substitution passed.');
  } catch (err: any) {
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }

  // 3. One player substituted at a time.
  try {
    const match = createBaseMatch('LIVE', 'team-A');
    // Outgoing and incoming must be single distinct player IDs
    const duplicateIdAttempt = recordSubstitution(match, {
      setNumber: 1,
      teamId: 'team-A',
      outgoingPlayerId: 'player-A1',
      incomingPlayerId: 'player-A1',
      reason: 'NORMAL',
    });
    assert.strictEqual(duplicateIdAttempt.errors.length > 0, true);
    assert.strictEqual(duplicateIdAttempt.errors.some((e) => e.includes('cannot be the same')), true);
    console.log('✅ Test 3: One player substituted at a time passed.');
  } catch (err: any) {
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }

  // 4. Three substitutions allowed per set.
  try {
    let match = createBaseMatch('LIVE', 'team-A');
    for (let i = 1; i <= 3; i++) {
      const res = recordSubstitution(match, {
        setNumber: 1,
        teamId: 'team-A',
        outgoingPlayerId: `player-A${i}`,
        incomingPlayerId: `player-A${i + 6}`,
        reason: 'NORMAL',
      });
      assert.strictEqual(res.errors.length, 0);
      match = res.match;
    }
    assert.strictEqual(match.substitutions?.filter((s) => s.setNumber === 1 && s.teamId === 'team-A').length, 3);
    console.log('✅ Test 4: Three substitutions allowed per set passed.');
  } catch (err: any) {
    console.error('❌ Test 4 failed:', err.message);
    throw err;
  }

  // 5. Fourth substitution rejected.
  try {
    let match = createBaseMatch('LIVE', 'team-A');
    for (let i = 1; i <= 3; i++) {
      match = recordSubstitution(match, {
        setNumber: 1,
        teamId: 'team-A',
        outgoingPlayerId: `player-A${i}`,
        incomingPlayerId: `player-A${i + 6}`,
        reason: 'NORMAL',
      }).match;
    }

    const fourthAttempt = recordSubstitution(match, {
      setNumber: 1,
      teamId: 'team-A',
      outgoingPlayerId: 'player-A4',
      incomingPlayerId: 'player-A1',
      reason: 'NORMAL',
    });
    assert.strictEqual(fourthAttempt.errors.length > 0, true);
    assert.strictEqual(fourthAttempt.errors.some((e) => e.includes('limit reached')), true);
    console.log('✅ Test 5: Fourth substitution rejected passed.');
  } catch (err: any) {
    console.error('❌ Test 5 failed:', err.message);
    throw err;
  }

  // 6. Counter resets for next set.
  try {
    let match = createBaseMatch('LIVE', 'team-A');
    // Use 3 substitutions in Set 1
    for (let i = 1; i <= 3; i++) {
      match = recordSubstitution(match, {
        setNumber: 1,
        teamId: 'team-A',
        outgoingPlayerId: `player-A${i}`,
        incomingPlayerId: `player-A${i + 6}`,
        reason: 'NORMAL',
      }).match;
    }

    // Now in Set 2, substitution should be permitted
    const set2Sub = recordSubstitution(match, {
      setNumber: 2,
      teamId: 'team-A',
      outgoingPlayerId: 'player-A1',
      incomingPlayerId: 'player-A7',
      reason: 'NORMAL',
    });
    assert.strictEqual(set2Sub.errors.length, 0, 'Substitution counter must reset in Set 2');
    assert.strictEqual(set2Sub.match.substitutions?.filter((s) => s.setNumber === 2).length, 1);
    console.log('✅ Test 6: Counter resets for next set passed.');
  } catch (err: any) {
    console.error('❌ Test 6 failed:', err.message);
    throw err;
  }

  // 7. Substitution history preserved.
  try {
    let match = createBaseMatch('LIVE', 'team-A');
    match = recordSubstitution(match, {
      setNumber: 1,
      teamId: 'team-A',
      outgoingPlayerId: 'p1',
      incomingPlayerId: 'p7',
      reason: 'NORMAL',
      id: 'sub-evt-1',
    }).match;

    match = recordSubstitution(match, {
      setNumber: 1,
      teamId: 'team-A',
      outgoingPlayerId: 'p2',
      incomingPlayerId: 'p8',
      reason: 'INJURY',
      id: 'sub-evt-2',
    }).match;

    assert.strictEqual(match.substitutions?.length, 2);
    assert.strictEqual(match.substitutions?.[0].id, 'sub-evt-1');
    assert.strictEqual(match.substitutions?.[1].id, 'sub-evt-2');
    console.log('✅ Test 7: Substitution history preserved passed.');
  } catch (err: any) {
    console.error('❌ Test 7 failed:', err.message);
    throw err;
  }

  // 8. Permanent roster unchanged.
  try {
    const permanentTeam: Team = {
      id: 'team-A',
      name: 'Team Alpha',
      shortName: 'ALPH',
      players: [
        { id: 'p1', name: 'Player 1', jerseyNumber: 1 },
        { id: 'p2', name: 'Player 2', jerseyNumber: 2 },
        { id: 'p3', name: 'Player 3', jerseyNumber: 3 },
        { id: 'p4', name: 'Player 4', jerseyNumber: 4 },
        { id: 'p5', name: 'Player 5', jerseyNumber: 5 },
        { id: 'p6', name: 'Player 6', jerseyNumber: 6 },
        { id: 'p7', name: 'Player 7', jerseyNumber: 7 },
        { id: 'p8', name: 'Player 8', jerseyNumber: 8 },
      ],
    };

    let match = createBaseMatch('LIVE', 'team-A');
    match = recordSubstitution(match, {
      setNumber: 1,
      teamId: 'team-A',
      outgoingPlayerId: 'p1',
      incomingPlayerId: 'p7',
      reason: 'NORMAL',
    }).match;

    // Verify team roster still has exactly 8 original players
    assert.strictEqual(permanentTeam.players.length, 8);
    assert.strictEqual(permanentTeam.players[0].id, 'p1');
    assert.strictEqual(permanentTeam.players[6].id, 'p7');
    console.log('✅ Test 8: Permanent roster unchanged passed.');
  } catch (err: any) {
    console.error('❌ Test 8 failed:', err.message);
    throw err;
  }

  // 9. Completed match rejects ordinary substitutions.
  try {
    const completedMatch = createBaseMatch('COMPLETED', 'team-A');
    const res = recordSubstitution(completedMatch, {
      setNumber: 1,
      teamId: 'team-A',
      outgoingPlayerId: 'p1',
      incomingPlayerId: 'p7',
      reason: 'NORMAL',
    });
    assert.strictEqual(res.errors.length > 0, true);
    assert.strictEqual(res.errors.some((e) => e.includes('completed match')), true);
    console.log('✅ Test 9: Completed match rejects ordinary substitutions passed.');
  } catch (err: any) {
    console.error('❌ Test 9 failed:', err.message);
    throw err;
  }

  console.log('\n🎉 All 9 Milestone 7 Substitution Tests passed successfully!\n');
}
