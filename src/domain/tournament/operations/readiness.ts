import { Tournament, Match, Team } from '../../../types';
import { DomainMatch } from '../models/types';
import { THROWBALL_ROSTER_RULES, validateTeamRoster } from '../roster/rosterRules';
import { detectScheduleConflicts } from './conflicts';
import { ReadinessItem, ReadinessSeverity, TournamentReadinessResult } from './types';

/**
 * Pure domain function to evaluate tournament operational readiness.
 * Categorically distinguishes READY, WARNING, and ERROR without numeric scoring.
 *
 * Known St. Xavier's Throwball competition invariants:
 * - 16 Teams required (ERROR if not 16)
 * - 8 Players per team required (ERROR if not 8)
 * - 4 Groups with 4 teams each (ERROR if unassigned)
 * - 27 Total Fixtures (24 group + 2 SF + 1 Final) (ERROR if not 27)
 * - Fixture scheduling (date/time/court) produces WARNINGS so configuration is not blocked prematurely.
 */
export function calculateTournamentReadiness(
  tournament: Tournament,
  matches?: (Match | DomainMatch)[]
): TournamentReadinessResult {
  const items: ReadinessItem[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const effectiveMatches = matches || tournament.fixtures || [];
  const teams = tournament.teams || [];

  // 1. Organizer Ownership
  if (tournament.ownerId) {
    items.push({
      id: 'organizer_auth',
      label: 'Organizer Authentication & Ownership',
      category: 'CONFIG',
      status: 'READY',
      message: 'Tournament is assigned to an authenticated organizer.',
    });
  } else {
    items.push({
      id: 'organizer_auth',
      label: 'Organizer Authentication & Ownership',
      category: 'CONFIG',
      status: 'WARNING',
      message: 'Tournament has no assigned owner ID (guest/demo session).',
    });
    warnings.push('Tournament has no assigned owner ID.');
  }

  // 2. Team Count: Exactly 16 teams required
  if (teams.length === 16) {
    items.push({
      id: 'team_count',
      label: '16 Competition Teams Registered',
      category: 'TEAMS',
      status: 'READY',
      message: 'All 16 required competition teams are registered.',
    });
  } else {
    const msg = `Expected 16 teams for St. Xavier's competition, but found ${teams.length}.`;
    items.push({
      id: 'team_count',
      label: '16 Competition Teams Registered',
      category: 'TEAMS',
      status: 'ERROR',
      message: msg,
    });
    errors.push(msg);
  }

  // 3. Team Rosters: Exactly 8 players per team
  const teamsWithInvalidRoster: { name: string; count: number; errs: string[] }[] = [];
  for (const team of teams) {
    const rosterValidation = validateTeamRoster(team, THROWBALL_ROSTER_RULES);
    if (!rosterValidation.isValid) {
      teamsWithInvalidRoster.push({
        name: team.name,
        count: team.players?.length || 0,
        errs: rosterValidation.errors,
      });
    }
  }

  if (teams.length > 0 && teamsWithInvalidRoster.length === 0) {
    items.push({
      id: 'team_rosters',
      label: 'Regulation 8-Player Rosters',
      category: 'ROSTERS',
      status: 'READY',
      message: 'All registered teams have exactly 8 valid players (6 starters + 2 substitutes).',
    });
  } else {
    const invalidCount = teamsWithInvalidRoster.length;
    const msg = `${invalidCount} team(s) do not have a valid 8-player roster.`;
    items.push({
      id: 'team_rosters',
      label: 'Regulation 8-Player Rosters',
      category: 'ROSTERS',
      status: 'ERROR',
      message: msg,
      details: teamsWithInvalidRoster.map((t) => `${t.name} (${t.count}/8 players)`).join(', '),
    });
    errors.push(msg);
  }

  // 4. Group Assignment: 4 Groups with 4 Teams Each
  const groups = tournament.groups || [];
  let unassignedCount = 0;
  const groupSizes: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };

  if (groups.length >= 4) {
    groups.forEach((g) => {
      const assigned = (g.teamIds || []).filter((id) => id && id.trim() !== '');
      groupSizes[g.id] = assigned.length;
    });
    unassignedCount = Object.values(groupSizes).reduce((acc, count) => acc + (4 - count), 0);
  } else {
    // Check teams' groupId
    teams.forEach((tm) => {
      if (tm.groupId && groupSizes[tm.groupId] !== undefined) {
        groupSizes[tm.groupId]++;
      }
    });
    unassignedCount = 16 - Object.values(groupSizes).reduce((acc, c) => acc + c, 0);
  }

  const isGroupConfigValid =
    groups.length >= 4 &&
    groupSizes['A'] === 4 &&
    groupSizes['B'] === 4 &&
    groupSizes['C'] === 4 &&
    groupSizes['D'] === 4;

  if (isGroupConfigValid) {
    items.push({
      id: 'group_assignment',
      label: 'Group Assignments (4 Groups × 4 Teams)',
      category: 'GROUPS',
      status: 'READY',
      message: 'All 16 teams assigned to canonical group slots (A1–D4).',
    });
  } else {
    const msg = `Group configuration incomplete (${unassignedCount} slot(s) vacant). 4 groups of 4 required.`;
    items.push({
      id: 'group_assignment',
      label: 'Group Assignments (4 Groups × 4 Teams)',
      category: 'GROUPS',
      status: 'ERROR',
      message: msg,
    });
    errors.push(msg);
  }

  // 5. Fixture Generation: Exactly 27 fixtures
  if (effectiveMatches.length === 27) {
    items.push({
      id: 'fixtures_generated',
      label: '27 Competition Fixtures Generated',
      category: 'FIXTURES',
      status: 'READY',
      message: '24 group matches, 2 semifinals, and 1 final are generated.',
    });
  } else {
    const msg =
      effectiveMatches.length === 0
        ? 'No fixtures generated yet. Generate fixtures from the Fixtures tab.'
        : `Expected 27 fixtures, but found ${effectiveMatches.length}.`;
    items.push({
      id: 'fixtures_generated',
      label: '27 Competition Fixtures Generated',
      category: 'FIXTURES',
      status: 'ERROR',
      message: msg,
    });
    errors.push(msg);
  }

  // 6. Match Scheduling (Date & Start Time) -> Warning only
  const unscheduledMatches = effectiveMatches.filter((m) => {
    const anyM = m as any;
    const date = anyM.schedule?.date || anyM.date || anyM.scheduledAt?.split(' ')[0];
    const time = anyM.schedule?.startTime || anyM.startTime || anyM.scheduledAt?.split(' ')[1];
    return !date || !time;
  });

  if (effectiveMatches.length > 0 && unscheduledMatches.length === 0) {
    items.push({
      id: 'schedule_readiness',
      label: 'Match Timetable Scheduled',
      category: 'SCHEDULE',
      status: 'READY',
      message: 'All 27 fixtures have scheduled dates and start times.',
    });
  } else if (effectiveMatches.length > 0) {
    const msg = `${unscheduledMatches.length} fixture(s) have no scheduled date/time.`;
    items.push({
      id: 'schedule_readiness',
      label: 'Match Timetable Scheduled',
      category: 'SCHEDULE',
      status: 'WARNING',
      message: msg,
    });
    warnings.push(msg);
  }

  // 7. Venue / Court Assignment -> Warning only
  const matchesWithoutCourt = effectiveMatches.filter((m) => {
    const anyM = m as any;
    return !anyM.schedule?.venueId && !anyM.venueId;
  });

  if (effectiveMatches.length > 0 && matchesWithoutCourt.length === 0) {
    items.push({
      id: 'court_assignment',
      label: 'Courts / Venues Assigned',
      category: 'VENUES',
      status: 'READY',
      message: 'All 27 fixtures have been assigned to courts.',
    });
  } else if (effectiveMatches.length > 0) {
    const msg = `${matchesWithoutCourt.length} fixture(s) have no court assigned.`;
    items.push({
      id: 'court_assignment',
      label: 'Courts / Venues Assigned',
      category: 'VENUES',
      status: 'WARNING',
      message: msg,
    });
    warnings.push(msg);
  }

  // 8. Schedule Conflicts -> Warning only
  const conflicts = detectScheduleConflicts(effectiveMatches, tournament.venues, teams);
  if (conflicts.length === 0) {
    items.push({
      id: 'schedule_conflicts',
      label: 'Schedule Conflict Verification',
      category: 'SCHEDULE',
      status: 'READY',
      message: 'No court overlaps or simultaneous team matches detected.',
    });
  } else {
    const msg = `${conflicts.length} scheduling conflict(s) detected.`;
    items.push({
      id: 'schedule_conflicts',
      label: 'Schedule Conflict Verification',
      category: 'SCHEDULE',
      status: 'WARNING',
      message: msg,
      details: conflicts.map((c) => c.description).join(' | '),
    });
    warnings.push(msg);
  }

  // Determine overall status
  const hasErrors = items.some((item) => item.status === 'ERROR');
  const hasWarnings = items.some((item) => item.status === 'WARNING');

  let overallStatus: ReadinessSeverity = 'READY';
  if (hasErrors) {
    overallStatus = 'ERROR';
  } else if (hasWarnings) {
    overallStatus = 'WARNING';
  }

  return {
    status: overallStatus,
    canPublish: !hasErrors,
    items,
    errors,
    warnings,
  };
}
