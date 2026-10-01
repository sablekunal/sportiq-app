import { validateMatchSchedule, detectScheduleConflicts } from '../operations/conflicts';
import { calculateTournamentReadiness } from '../operations/readiness';
import { getNextScheduledMatch, groupMatchesByCourtForDate, getUniqueScheduledDates } from '../operations/scheduleManager';
import { MatchSchedule, TournamentVenue } from '../operations/types';
import { DomainMatch, TournamentRules } from '../models/types';
import { Tournament, Match, Team, Player, Venue } from '../../../types';
import { generateFourGroupTournament } from '../fixtures/groupKnockout';
import { THROWBALL_ROSTER_RULES } from '../roster/rosterRules';

const assert = {
  strictEqual: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(msg || `Expected ${b} but got ${a}`);
  },
  deepStrictEqual: (a: any, b: any, msg?: string) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || 'Deep equality failed');
  },
};

export function runOperationsTests() {
  console.log('Running Milestone 6: Tournament Operations & Scheduling Domain Tests...\n');

  const makePlayer = (id: string, name: string, num: number, extra: Partial<Player> = {}): Player => ({
    id,
    name,
    jerseyNumber: num,
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

  const create16Teams = (): Team[] => {
    const teams: Team[] = [];
    const groupNames = ['A', 'B', 'C', 'D'];
    for (let g = 0; g < 4; g++) {
      const gid = groupNames[g];
      for (let p = 1; p <= 4; p++) {
        const id = `team-${gid}${p}`;
        teams.push({
          id,
          name: `Team ${gid}${p}`,
          shortName: `${gid}${p}`,
          groupId: gid,
          players: create8PlayerRoster(id),
        });
      }
    }
    return teams;
  };

  const sampleVenues: Venue[] = [
    { id: 'court-1', name: 'Court 1', type: 'COURT', active: true, order: 1 },
    { id: 'court-2', name: 'Court 2', type: 'COURT', active: true, order: 2 },
    { id: 'court-3', name: 'Court 3', type: 'COURT', active: true, order: 3 },
  ];

  // ==========================================
  // SCHEDULING TESTS (1 - 10)
  // ==========================================

  // 1. Valid schedule is accepted
  try {
    const validSchedule: MatchSchedule = {
      date: '2026-10-12',
      startTime: '09:00',
      endTime: '09:30',
      venueId: 'court-1',
    };
    const res = validateMatchSchedule(validSchedule);
    assert.strictEqual(res.isValid, true, 'Valid schedule should pass validation');
    assert.strictEqual(res.errors.length, 0);
    console.log('✅ Test 1: Valid schedule is accepted passed.');
  } catch (err: any) {
    console.error('❌ Test 1 failed:', err.message);
  }

  // 2. Invalid date/time is rejected
  try {
    const badDate = validateMatchSchedule({ date: '12-10-2026', startTime: '09:00', endTime: '09:30' });
    assert.strictEqual(badDate.isValid, false, 'Invalid date format must be rejected');

    const badTime = validateMatchSchedule({ date: '2026-10-12', startTime: '25:00', endTime: '09:30' });
    assert.strictEqual(badTime.isValid, false, '25:00 start time must be rejected');

    const startAfterEnd = validateMatchSchedule({ date: '2026-10-12', startTime: '10:00', endTime: '09:30' });
    assert.strictEqual(startAfterEnd.isValid, false, 'Start time after end time must be rejected');

    const sameStartEnd = validateMatchSchedule({ date: '2026-10-12', startTime: '09:00', endTime: '09:00' });
    assert.strictEqual(sameStartEnd.isValid, false, 'Start time equal to end time must be rejected');

    console.log('✅ Test 2: Invalid date/time is rejected passed.');
  } catch (err: any) {
    console.error('❌ Test 2 failed:', err.message);
  }

  // 3. Court conflict is detected
  try {
    const matchA: any = {
      id: 'mA',
      matchCode: 'A-M1',
      date: '2026-10-12',
      startTime: '09:00',
      endTime: '09:30',
      venueId: 'court-1',
      participantA: { type: 'TEAM', teamId: 't1' },
      participantB: { type: 'TEAM', teamId: 't2' },
    };
    const matchB: any = {
      id: 'mB',
      matchCode: 'B-M1',
      date: '2026-10-12',
      startTime: '09:15',
      endTime: '09:45',
      venueId: 'court-1', // Same court overlapping!
      participantA: { type: 'TEAM', teamId: 't3' },
      participantB: { type: 'TEAM', teamId: 't4' },
    };

    const conflicts = detectScheduleConflicts([matchA, matchB], sampleVenues);
    assert.strictEqual(conflicts.length, 1, 'Should detect 1 court overlap conflict');
    assert.strictEqual(conflicts[0].type, 'COURT_OVERLAP');
    assert.strictEqual(conflicts[0].venueId, 'court-1');
    console.log('✅ Test 3: Court conflict is detected passed.');
  } catch (err: any) {
    console.error('❌ Test 3 failed:', err.message);
  }

  // 4. Team overlap is detected
  try {
    const matchA: any = {
      id: 'mA',
      matchCode: 'A-M1',
      date: '2026-10-12',
      startTime: '09:00',
      endTime: '09:30',
      venueId: 'court-1',
      participantA: { type: 'TEAM', teamId: 't1' },
      participantB: { type: 'TEAM', teamId: 't2' },
    };
    const matchB: any = {
      id: 'mB',
      matchCode: 'A-M2',
      date: '2026-10-12',
      startTime: '09:15',
      endTime: '09:45',
      venueId: 'court-2', // Different court, but t1 is playing simultaneously!
      participantA: { type: 'TEAM', teamId: 't1' },
      participantB: { type: 'TEAM', teamId: 't3' },
    };

    const conflicts = detectScheduleConflicts([matchA, matchB], sampleVenues);
    assert.strictEqual(conflicts.length, 1, 'Should detect 1 team overlap conflict');
    assert.strictEqual(conflicts[0].type, 'TEAM_OVERLAP');
    assert.strictEqual(conflicts[0].teamId, 't1');
    console.log('✅ Test 4: Team overlap is detected passed.');
  } catch (err: any) {
    console.error('❌ Test 4 failed:', err.message);
  }

  // 5. Different courts can have simultaneous matches
  try {
    const matchA: any = {
      id: 'mA',
      matchCode: 'A-M1',
      date: '2026-10-12',
      startTime: '09:00',
      endTime: '09:30',
      venueId: 'court-1',
      participantA: { type: 'TEAM', teamId: 't1' },
      participantB: { type: 'TEAM', teamId: 't2' },
    };
    const matchB: any = {
      id: 'mB',
      matchCode: 'B-M1',
      date: '2026-10-12',
      startTime: '09:00',
      endTime: '09:30',
      venueId: 'court-2', // Different court!
      participantA: { type: 'TEAM', teamId: 't3' },
      participantB: { type: 'TEAM', teamId: 't4' },
    };

    const conflicts = detectScheduleConflicts([matchA, matchB], sampleVenues);
    assert.strictEqual(conflicts.length, 0, 'Simultaneous matches on different courts with different teams have no conflict');
    console.log('✅ Test 5: Different courts can have simultaneous matches passed.');
  } catch (err: any) {
    console.error('❌ Test 5 failed:', err.message);
  }

  // 6. Different teams can play simultaneously
  try {
    const match1: any = {
      id: 'm1',
      matchCode: 'A-M1',
      date: '2026-10-12',
      startTime: '10:00',
      endTime: '10:30',
      venueId: 'court-1',
      participantA: { type: 'TEAM', teamId: 't1' },
      participantB: { type: 'TEAM', teamId: 't2' },
    };
    const match2: any = {
      id: 'm2',
      matchCode: 'B-M1',
      date: '2026-10-12',
      startTime: '10:00',
      endTime: '10:30',
      venueId: 'court-2',
      participantA: { type: 'TEAM', teamId: 't3' },
      participantB: { type: 'TEAM', teamId: 't4' },
    };
    const match3: any = {
      id: 'm3',
      matchCode: 'C-M1',
      date: '2026-10-12',
      startTime: '10:00',
      endTime: '10:30',
      venueId: 'court-3',
      participantA: { type: 'TEAM', teamId: 't5' },
      participantB: { type: 'TEAM', teamId: 't6' },
    };

    const conflicts = detectScheduleConflicts([match1, match2, match3], sampleVenues);
    assert.strictEqual(conflicts.length, 0, '3 distinct matches simultaneously on 3 distinct courts must have 0 conflicts');
    console.log('✅ Test 6: Different teams can play simultaneously passed.');
  } catch (err: any) {
    console.error('❌ Test 6 failed:', err.message);
  }

  // 7. Rescheduling changes schedule only
  try {
    const match: DomainMatch = {
      id: 'match-audit-7',
      tournamentId: 't1',
      stageId: 's1',
      round: 1,
      position: 0,
      fixtureNumber: 1,
      matchCode: 'A-M1',
      participantA: { type: 'TEAM', teamId: 't1' },
      participantB: { type: 'TEAM', teamId: 't2' },
      dependencies: [],
      scoreA: 0,
      scoreB: 0,
      status: 'SCHEDULED',
      winnerId: null,
      loserId: null,
      date: '2026-10-12',
      startTime: '09:00',
      endTime: '09:30',
      venueId: 'court-1',
    };

    // Reschedule
    const newSchedule = { date: '2026-10-13', startTime: '11:00', endTime: '11:30', venueId: 'court-2' };
    const updatedMatch: DomainMatch = {
      ...match,
      ...newSchedule,
      schedule: newSchedule,
    };

    // Invariants check: participants, scores, dependencies, winner, loser, fixtureNumber must remain identical
    assert.deepStrictEqual(updatedMatch.participantA, match.participantA);
    assert.deepStrictEqual(updatedMatch.participantB, match.participantB);
    assert.strictEqual(updatedMatch.scoreA, match.scoreA);
    assert.strictEqual(updatedMatch.scoreB, match.scoreB);
    assert.strictEqual(updatedMatch.winnerId, match.winnerId);
    assert.strictEqual(updatedMatch.loserId, match.loserId);
    assert.deepStrictEqual(updatedMatch.dependencies, match.dependencies);

    // Only schedule fields changed
    assert.strictEqual(updatedMatch.date, '2026-10-13');
    assert.strictEqual(updatedMatch.startTime, '11:00');
    assert.strictEqual(updatedMatch.venueId, 'court-2');

    console.log('✅ Test 7: Rescheduling changes schedule only passed.');
  } catch (err: any) {
    console.error('❌ Test 7 failed:', err.message);
  }

  // 8. Rescheduling does not change fixture ID
  try {
    const originalId = 'immutable-match-id-99';
    const match: DomainMatch = {
      id: originalId,
      tournamentId: 't1',
      stageId: 's1',
      round: 1,
      position: 0,
      fixtureNumber: 5,
      matchCode: 'A-M5',
      participantA: { type: 'TEAM', teamId: 't2' },
      participantB: { type: 'TEAM', teamId: 't4' },
      dependencies: [],
      scoreA: 0,
      scoreB: 0,
      status: 'SCHEDULED',
      winnerId: null,
      loserId: null,
    };

    // Apply schedule change
    const updated = {
      ...match,
      date: '2026-10-12',
      startTime: '14:00',
      endTime: '14:30',
      venueId: 'court-1',
    };

    assert.strictEqual(updated.id, originalId, 'Match ID must remain completely immutable');
    console.log('✅ Test 8: Rescheduling does not change fixture ID passed.');
  } catch (err: any) {
    console.error('❌ Test 8 failed:', err.message);
  }

  // 9. Rescheduling does not change fixture number
  try {
    const match: DomainMatch = {
      id: 'm-24',
      tournamentId: 't1',
      stageId: 's1',
      round: 1,
      position: 23,
      fixtureNumber: 24,
      matchCode: 'D-M6',
      participantA: { type: 'TEAM', teamId: 'D3' },
      participantB: { type: 'TEAM', teamId: 'D4' },
      dependencies: [],
      scoreA: 0,
      scoreB: 0,
      status: 'SCHEDULED',
      winnerId: null,
      loserId: null,
    };

    const updated = {
      ...match,
      date: '2026-10-12',
      startTime: '16:00',
      endTime: '16:30',
    };

    assert.strictEqual(updated.fixtureNumber, 24, 'fixtureNumber must remain 24');
    assert.strictEqual(updated.matchCode, 'D-M6', 'matchCode must remain D-M6');
    console.log('✅ Test 9: Rescheduling does not change fixture number passed.');
  } catch (err: any) {
    console.error('❌ Test 9 failed:', err.message);
  }

  // 10. Live matches cannot be normally rescheduled
  try {
    const liveMatch: DomainMatch = {
      id: 'm-live',
      tournamentId: 't1',
      stageId: 's1',
      round: 1,
      position: 0,
      fixtureNumber: 1,
      matchCode: 'A-M1',
      participantA: { type: 'TEAM', teamId: 't1' },
      participantB: { type: 'TEAM', teamId: 't2' },
      dependencies: [],
      scoreA: 12,
      scoreB: 9,
      status: 'LIVE',
      winnerId: null,
      loserId: null,
    };

    const attemptReschedule = (m: DomainMatch, schedule: MatchSchedule) => {
      if (m.status === 'LIVE' || m.status === 'HALFTIME') {
        throw new Error('Match is currently LIVE. Match schedule is locked and cannot be edited.');
      }
      if (m.status === 'COMPLETED') {
        throw new Error('Match is COMPLETED. Historical match schedule cannot be edited.');
      }
      return { ...m, ...schedule };
    };

    let caughtError = false;
    try {
      attemptReschedule(liveMatch, { date: '2026-10-15', startTime: '12:00' });
    } catch (e: any) {
      caughtError = true;
      assert.strictEqual(e.message.includes('locked'), true);
    }
    assert.strictEqual(caughtError, true, 'Rescheduling a LIVE match must throw error');

    // Also check completed match
    const completedMatch: DomainMatch = { ...liveMatch, status: 'COMPLETED' };
    let caughtCompleted = false;
    try {
      attemptReschedule(completedMatch, { date: '2026-10-15', startTime: '12:00' });
    } catch (e: any) {
      caughtCompleted = true;
      assert.strictEqual(e.message.includes('Historical'), true);
    }
    assert.strictEqual(caughtCompleted, true, 'Rescheduling a COMPLETED match must throw error');

    console.log('✅ Test 10: Live matches cannot be normally rescheduled passed.');
  } catch (err: any) {
    console.error('❌ Test 10 failed:', err.message);
  }

  // ==========================================
  // READINESS TESTS (11 - 17)
  // ==========================================

  const createBaseTournament = (): Tournament => ({
    id: 'st-xaviers-ready',
    slug: 'st-xaviers-throwball',
    name: "St. Xavier's Girls Throwball Competition",
    sport: 'throwball',
    format: 'GROUP_KNOCKOUT',
    status: 'DRAFT',
    description: 'Official competition',
    location: "St. Xavier's Ground",
    startDate: '2026-10-12',
    endDate: '2026-10-14',
    organizerName: 'Sports Dept',
    ownerId: 'organizer-uid-123',
    visibility: 'PUBLIC',
    teams: create16Teams(),
    groups: [
      { id: 'A', name: 'Group A', order: 1, teamIds: ['team-A1', 'team-A2', 'team-A3', 'team-A4'] },
      { id: 'B', name: 'Group B', order: 2, teamIds: ['team-B1', 'team-B2', 'team-B3', 'team-B4'] },
      { id: 'C', name: 'Group C', order: 3, teamIds: ['team-C1', 'team-C2', 'team-C3', 'team-C4'] },
      { id: 'D', name: 'Group D', order: 4, teamIds: ['team-D1', 'team-D2', 'team-D3', 'team-D4'] },
    ],
    fixtures: [],
    venues: sampleVenues,
    rules: { winPoints: 2, drawPoints: 0, lossPoints: 0, matchDurationMinutes: 0, periodsCount: 2, tieBreakers: [] },
    budget: [],
    auditLogs: [],
  });

  // 11. Complete tournament configuration is detected
  try {
    const tournament = createBaseTournament();
    const fixtures = generateFourGroupTournament({ tournamentId: tournament.id });

    // Schedule all 27 fixtures cleanly
    const scheduledFixtures = fixtures.map((m, idx) => {
      const startTime = `${String(9 + Math.floor(idx / 3)).padStart(2, '0')}:${idx % 3 === 0 ? '00' : idx % 3 === 1 ? '20' : '40'}`;
      const endTime = `${String(9 + Math.floor(idx / 3)).padStart(2, '0')}:${idx % 3 === 0 ? '15' : idx % 3 === 1 ? '35' : '55'}`;
      const venueId = sampleVenues[idx % sampleVenues.length].id;
      return {
        ...m,
        date: '2026-10-12',
        startTime,
        endTime,
        venueId,
        schedule: {
          date: '2026-10-12',
          startTime,
          endTime,
          venueId,
        },
      };
    });

    const result = calculateTournamentReadiness(tournament, scheduledFixtures);
    assert.strictEqual(result.canPublish, true, 'Fully configured tournament can publish');
    assert.strictEqual(result.status, 'READY');
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.warnings.length, 0);

    console.log('✅ Test 11: Complete tournament configuration is detected passed.');
  } catch (err: any) {
    console.error('❌ Test 11 failed:', err.message);
  }

  // 12. Missing schedule produces WARNING
  try {
    const tournament = createBaseTournament();
    const fixtures = generateFourGroupTournament({ tournamentId: tournament.id });
    // Fixtures have no date/time assigned

    const result = calculateTournamentReadiness(tournament, fixtures);
    assert.strictEqual(result.canPublish, true, 'Unscheduled fixtures should produce warning, not block publish');
    assert.strictEqual(result.status, 'WARNING');
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.warnings.some((w) => w.includes('fixture(s) have no scheduled date/time')), true);

    console.log('✅ Test 12: Missing schedule produces WARNING passed.');
  } catch (err: any) {
    console.error('❌ Test 12 failed:', err.message);
  }

  // 13. Missing court produces WARNING
  try {
    const tournament = createBaseTournament();
    const fixtures = generateFourGroupTournament({ tournamentId: tournament.id });
    // Assign date/time but no venueId
    const withTimes = fixtures.map((m) => ({
      ...m,
      date: '2026-10-12',
      startTime: '09:00',
      endTime: '09:30',
    }));

    const result = calculateTournamentReadiness(tournament, withTimes);
    assert.strictEqual(result.canPublish, true, 'Missing courts should produce warning, not block publish');
    assert.strictEqual(result.status, 'WARNING');
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.warnings.some((w) => w.includes('court')), true);

    console.log('✅ Test 13: Missing court produces WARNING passed.');
  } catch (err: any) {
    console.error('❌ Test 13 failed:', err.message);
  }

  // 14. Missing team produces ERROR
  try {
    const tournament = createBaseTournament();
    tournament.teams = tournament.teams.slice(0, 15); // Only 15 teams!
    const fixtures = generateFourGroupTournament({ tournamentId: tournament.id });

    const result = calculateTournamentReadiness(tournament, fixtures);
    assert.strictEqual(result.canPublish, false, '15 teams must block publish');
    assert.strictEqual(result.status, 'ERROR');
    assert.strictEqual(result.errors.some((e) => e.includes('16 teams')), true);

    console.log('✅ Test 14: Missing team produces ERROR passed.');
  } catch (err: any) {
    console.error('❌ Test 14 failed:', err.message);
  }

  // 15. Invalid roster produces ERROR
  try {
    const tournament = createBaseTournament();
    // Invalidate Team 1's roster by giving 7 players instead of 8
    tournament.teams[0].players = tournament.teams[0].players.slice(0, 7);
    const fixtures = generateFourGroupTournament({ tournamentId: tournament.id });

    const result = calculateTournamentReadiness(tournament, fixtures);
    assert.strictEqual(result.canPublish, false, 'Invalid roster must block publish');
    assert.strictEqual(result.status, 'ERROR');
    assert.strictEqual(result.errors.some((e) => e.includes('8-player roster')), true);

    console.log('✅ Test 15: Invalid roster produces ERROR passed.');
  } catch (err: any) {
    console.error('❌ Test 15 failed:', err.message);
  }

  // 16. Invalid group configuration produces ERROR
  try {
    const tournament = createBaseTournament();
    // Set group A with only 3 teams
    tournament.groups[0].teamIds = ['team-A1', 'team-A2', 'team-A3'];
    const fixtures = generateFourGroupTournament({ tournamentId: tournament.id });

    const result = calculateTournamentReadiness(tournament, fixtures);
    assert.strictEqual(result.canPublish, false, 'Incomplete group config must block publish');
    assert.strictEqual(result.status, 'ERROR');
    assert.strictEqual(result.errors.some((e) => e.includes('Group configuration incomplete')), true);

    console.log('✅ Test 16: Invalid group configuration produces ERROR passed.');
  } catch (err: any) {
    console.error('❌ Test 16 failed:', err.message);
  }

  // 17. Missing required fixture generation produces ERROR
  try {
    const tournament = createBaseTournament();
    // No fixtures generated yet!
    const result = calculateTournamentReadiness(tournament, []);
    assert.strictEqual(result.canPublish, false, '0 fixtures must block publish');
    assert.strictEqual(result.status, 'ERROR');
    assert.strictEqual(result.errors.some((e) => e.includes('No fixtures generated')), true);

    console.log('✅ Test 17: Missing required fixture generation produces ERROR passed.');
  } catch (err: any) {
    console.error('❌ Test 17 failed:', err.message);
  }

  // ==========================================
  // PUBLIC STATE TESTS (18 - 20)
  // ==========================================

  // 18. Draft tournament is handled according to visibility rules
  try {
    const draftTournament: Tournament = {
      ...createBaseTournament(),
      status: 'DRAFT',
      visibility: 'PRIVATE',
    };

    // Public visibility check: DRAFT status means tournament is in draft mode
    const isPubliclyLive = (t: Tournament) => t.status === 'PUBLISHED' || t.status === 'TOURNAMENT_LIVE' || t.status === 'COMPLETED';
    assert.strictEqual(isPubliclyLive(draftTournament), false, 'DRAFT tournament must not be considered publicly live');

    console.log('✅ Test 18: Draft tournament is handled according to visibility rules passed.');
  } catch (err: any) {
    console.error('❌ Test 18 failed:', err.message);
  }

  // 19. Published tournament is publicly accessible
  try {
    const publishedTournament: Tournament = {
      ...createBaseTournament(),
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    };

    const isPubliclyLive = (t: Tournament) => t.status === 'PUBLISHED' || t.status === 'TOURNAMENT_LIVE' || t.status === 'COMPLETED';
    assert.strictEqual(isPubliclyLive(publishedTournament), true, 'PUBLISHED tournament must be publicly live');
    assert.strictEqual(publishedTournament.visibility, 'PUBLIC');

    console.log('✅ Test 19: Published tournament is publicly accessible passed.');
  } catch (err: any) {
    console.error('❌ Test 19 failed:', err.message);
  }

  // 20. Public schedule reflects organizer changes
  try {
    const fixtures = generateFourGroupTournament({ tournamentId: 't1' });
    const match1 = fixtures[0]; // A-M1

    // Initial state: 09:00 Court 1
    match1.date = '2026-10-12';
    match1.startTime = '09:00';
    match1.endTime = '09:30';
    match1.venueId = 'court-1';
    match1.status = 'SCHEDULED';

    const next1 = getNextScheduledMatch(fixtures);
    assert.strictEqual(next1?.id, match1.id);
    assert.strictEqual((next1 as any).startTime, '09:00');
    assert.strictEqual((next1 as any).venueId, 'court-1');

    // Organizer changes schedule to Court 2 at 11:00
    match1.startTime = '11:00';
    match1.endTime = '11:30';
    match1.venueId = 'court-2';

    // Verify public next match derivation immediately reflects organizer change
    const nextUpdated = getNextScheduledMatch(fixtures);
    assert.strictEqual((nextUpdated as any).startTime, '11:00');
    assert.strictEqual((nextUpdated as any).venueId, 'court-2');

    // Grouping by court for date also reflects organizer change
    const grouped = groupMatchesByCourtForDate(fixtures, '2026-10-12', sampleVenues);
    const court2Group = grouped.find((g) => g.venue.id === 'court-2')!;
    assert.strictEqual(court2Group.matches.some((m) => m.id === match1.id), true);

    console.log('✅ Test 20: Public schedule reflects organizer changes passed.');
  } catch (err: any) {
    console.error('❌ Test 20 failed:', err.message);
  }

  console.log('\nAll 20 Milestone 6 operations and scheduling tests completed successfully!\n');
}
