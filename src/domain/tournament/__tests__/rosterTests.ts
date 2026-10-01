import {
  THROWBALL_ROSTER_RULES,
  validateTeamRoster,
  getRosterStatus,
  canModifyRoster,
  canRemoveOrReplacePlayer,
} from '../roster/rosterRules';
import {
  createDefaultLineup,
  validateMatchLineup,
} from '../roster/lineupValidation';
import { calculateTournamentReadiness } from '../operations/readiness';
import { Player, Team, Match, Tournament } from '../../../types';
import { DomainMatch } from '../models/types';

const assert = {
  strictEqual: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`);
  },
  notStrictEqual: (a: any, b: any, msg?: string) => {
    if (a === b) throw new Error(msg || `Expected values to differ, got ${a}`);
  },
};

export function runMilestone7RosterTests() {
  console.log('Running Milestone 7: Dynamic Team Registration & Roster Lifecycle Tests...\n');

  const makePlayer = (id: string, name: string, jerseyNumber: number, extra: Partial<Player> = {}): Player => ({
    id,
    name,
    jerseyNumber,
    role: 'Court Player',
    ...extra,
  });

  const createSquad = (count: number, prefix: string): Player[] => {
    return Array.from({ length: count }, (_, i) =>
      makePlayer(
        `${prefix}-p${i + 1}`,
        `Player ${i + 1}`,
        i + 1,
        i === 0 ? { isCaptain: true } : {}
      )
    );
  };

  const createDummyTeam = (playerCount: number, id: string = 'team-1', isLocked = false): Team => ({
    id,
    name: `Team ${id}`,
    shortName: id.slice(0, 4).toUpperCase(),
    players: createSquad(playerCount, id),
    isRosterLocked: isLocked,
    rosterStatus: getRosterStatus(createSquad(playerCount, id), isLocked),
  });

  // 1. Team with 6 players remains valid during setup.
  try {
    const team6 = createDummyTeam(6, 'team-6');
    const res = validateTeamRoster(team6, THROWBALL_ROSTER_RULES, { isSetup: true });
    assert.strictEqual(res.isValid, true, '6 players should be valid during setup');
    assert.strictEqual(res.status, 'INCOMPLETE', 'Status must be INCOMPLETE');
    assert.strictEqual(res.isComplete, false);
    assert.strictEqual(res.warnings.length > 0, true, 'Should provide an informational warning');
    console.log('✅ Test 1: Team with 6 players remains valid during setup passed.');
  } catch (err: any) {
    console.error('❌ Test 1 failed:', err.message);
    throw err;
  }

  // 2. Team with 7 players remains editable.
  try {
    const team7 = createDummyTeam(7, 'team-7');
    const res = validateTeamRoster(team7, THROWBALL_ROSTER_RULES, { isSetup: true });
    assert.strictEqual(res.isValid, true, '7 players should be valid during setup');
    assert.strictEqual(res.status, 'INCOMPLETE');
    const canEdit = canModifyRoster(team7);
    assert.strictEqual(canEdit.allowed, true, 'Incomplete team must remain editable');
    console.log('✅ Test 2: Team with 7 players remains editable passed.');
  } catch (err: any) {
    console.error('❌ Test 2 failed:', err.message);
    throw err;
  }

  // 3. Team with 8 players becomes complete.
  try {
    const team8 = createDummyTeam(8, 'team-8');
    const res = validateTeamRoster(team8, THROWBALL_ROSTER_RULES, { isSetup: true });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.status, 'COMPLETE');
    assert.strictEqual(res.isComplete, true);
    assert.strictEqual(res.warnings.length, 0);
    console.log('✅ Test 3: Team with 8 players becomes complete passed.');
  } catch (err: any) {
    console.error('❌ Test 3 failed:', err.message);
    throw err;
  }

  // 4. Publication blocks incomplete roster.
  try {
    const team7 = createDummyTeam(7, 'team-incomplete');
    const pubValidation = validateTeamRoster(team7, THROWBALL_ROSTER_RULES, { isPublishing: true });
    assert.strictEqual(pubValidation.isValid, false, 'Publication must block incomplete roster');
    assert.strictEqual(pubValidation.errors.some((e) => e.includes('exactly 8 registered players')), true);

    // Also check via tournament readiness in publish mode
    const fakeTournament: Tournament = {
      id: 't-test',
      slug: 't-test',
      name: 'Test Tournament',
      sport: 'throwball',
      format: 'GROUP_KNOCKOUT',
      status: 'DRAFT',
      description: '',
      location: 'Pune',
      startDate: '2026-10-04',
      endDate: '2026-10-04',
      organizerName: 'SXY',
      ownerId: 'owner-1',
      visibility: 'PRIVATE',
      teams: [team7],
      groups: [],
      fixtures: [],
      venues: [],
      rules: { winPoints: 2, drawPoints: 0, lossPoints: 0, matchDurationMinutes: 45, periodsCount: 3, tieBreakers: [] },
      budget: [],
      auditLogs: [],
    };
    const readiness = calculateTournamentReadiness(fakeTournament, [], { context: 'publish' });
    assert.strictEqual(readiness.canPublish, false, 'canPublish must be false for incomplete roster');
    assert.strictEqual(
      readiness.errors.some((e) => e.includes('Exactly 8 players are required before competition publication')),
      true
    );
    console.log('✅ Test 4: Publication blocks incomplete roster passed.');
  } catch (err: any) {
    console.error('❌ Test 4 failed:', err.message);
    throw err;
  }

  // 5. Player can be added before roster lock.
  try {
    const team6 = createDummyTeam(6, 'team-add');
    const newPlayer = makePlayer('new-p7', 'Seventh Player', 77);
    const updatedTeam: Team = {
      ...team6,
      players: [...team6.players, newPlayer],
    };
    assert.strictEqual(updatedTeam.players.length, 7);
    const res = validateTeamRoster(updatedTeam, THROWBALL_ROSTER_RULES, { isSetup: true });
    assert.strictEqual(res.isValid, true);
    console.log('✅ Test 5: Player can be added before roster lock passed.');
  } catch (err: any) {
    console.error('❌ Test 5 failed:', err.message);
    throw err;
  }

  // 6. Player can be edited before roster lock.
  try {
    const team8 = createDummyTeam(8, 'team-edit');
    const targetPlayer = team8.players[2];
    const editedPlayer: Player = { ...targetPlayer, name: 'Renamed Player', jerseyNumber: 42 };
    const updatedPlayers = team8.players.map((p) => (p.id === targetPlayer.id ? editedPlayer : p));
    const updatedTeam: Team = { ...team8, players: updatedPlayers };

    const res = validateTeamRoster(updatedTeam, THROWBALL_ROSTER_RULES);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(updatedTeam.players.find((p) => p.id === targetPlayer.id)?.name, 'Renamed Player');
    console.log('✅ Test 6: Player can be edited before roster lock passed.');
  } catch (err: any) {
    console.error('❌ Test 6 failed:', err.message);
    throw err;
  }

  // 7. Player can be removed/replaced before roster lock.
  try {
    const team8 = createDummyTeam(8, 'team-remove');
    const removeId = team8.players[7].id;
    const canRemove = canRemoveOrReplacePlayer(team8, removeId, []);
    assert.strictEqual(canRemove.allowed, true);

    const updatedPlayers = team8.players.filter((p) => p.id !== removeId);
    assert.strictEqual(updatedPlayers.length, 7);
    console.log('✅ Test 7: Player can be removed/replaced before roster lock passed.');
  } catch (err: any) {
    console.error('❌ Test 7 failed:', err.message);
    throw err;
  }

  // 8. Historical player data remains intact.
  try {
    const team8 = createDummyTeam(8, 'team-hist');
    const player1Id = team8.players[0].id;
    const matchLineup = createDefaultLineup('m-hist-1', team8);

    // Simulate match that is LIVE
    const liveMatch: Partial<DomainMatch> = {
      id: 'm-hist-1',
      status: 'LIVE',
      participantA: { type: 'TEAM', teamId: team8.id },
      participantB: { type: 'TEAM', teamId: 'other-team' },
      lineupA: matchLineup,
    };

    const removalCheck = canRemoveOrReplacePlayer(team8, player1Id, [liveMatch as DomainMatch]);
    assert.strictEqual(removalCheck.allowed, false, 'Historical player in live/completed match cannot be deleted');
    assert.strictEqual(removalCheck.reason?.includes('historical match'), true);

    // Lineup snapshot retains historical properties even if original player object were changed
    const snapshot = Array.isArray(matchLineup.snapshots)
      ? matchLineup.snapshots.find((s) => s.id === player1Id)
      : (matchLineup.snapshots as any)[player1Id];
    assert.strictEqual(Boolean(snapshot), true);
    assert.strictEqual(snapshot.name, 'Player 1');
    assert.strictEqual(snapshot.jerseyNumber, 1);
    console.log('✅ Test 8: Historical player data remains intact passed.');
  } catch (err: any) {
    console.error('❌ Test 8 failed:', err.message);
    throw err;
  }

  // 9. Roster lock prevents destructive changes.
  try {
    const lockedTeam = createDummyTeam(8, 'team-locked', true);
    assert.strictEqual(lockedTeam.rosterStatus, 'LOCKED');

    const canModify = canModifyRoster(lockedTeam);
    assert.strictEqual(canModify.allowed, false);
    assert.strictEqual(canModify.reason?.includes('locked'), true);

    const canRemove = canRemoveOrReplacePlayer(lockedTeam, lockedTeam.players[0].id);
    assert.strictEqual(canRemove.allowed, false);
    console.log('✅ Test 9: Roster lock prevents destructive changes passed.');
  } catch (err: any) {
    console.error('❌ Test 9 failed:', err.message);
    throw err;
  }

  // 10. Match lineup remains independent from permanent roster.
  try {
    const team8 = createDummyTeam(8, 'team-indep');
    const lineup = createDefaultLineup('match-1', team8);

    // Change lineup starters vs subs
    const alteredLineup = {
      ...lineup,
      startingPlayerIds: [
        team8.players[2].id,
        team8.players[3].id,
        team8.players[4].id,
        team8.players[5].id,
        team8.players[6].id,
        team8.players[7].id,
      ],
      substitutePlayerIds: [team8.players[0].id, team8.players[1].id],
    };

    const lineupValidation = validateMatchLineup(alteredLineup, team8, THROWBALL_ROSTER_RULES);
    assert.strictEqual(lineupValidation.isValid, true);

    // Permanent team roster remains untouched
    assert.strictEqual(team8.players.length, 8);
    assert.strictEqual(team8.players[0].id, 'team-indep-p1');
    console.log('✅ Test 10: Match lineup remains independent from permanent roster passed.');
  } catch (err: any) {
    console.error('❌ Test 10 failed:', err.message);
    throw err;
  }

  // 11. 6 starters + 2 available substitutes can be represented.
  try {
    const team8 = createDummyTeam(8, 'team-lineup');
    const lineup = createDefaultLineup('match-rep', team8);

    assert.strictEqual(lineup.startingPlayerIds.length, 6);
    assert.strictEqual(lineup.substitutePlayerIds.length, 2);

    const result = validateMatchLineup(lineup, team8, THROWBALL_ROSTER_RULES);
    assert.strictEqual(result.isValid, true);
    console.log('✅ Test 11: 6 starters + 2 available substitutes can be represented passed.');
  } catch (err: any) {
    console.error('❌ Test 11 failed:', err.message);
    throw err;
  }

  console.log('\n🎉 All 11 Milestone 7 Roster Tests passed successfully!\n');
}
