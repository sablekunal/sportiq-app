import { Player, Team } from '../../../types';
import { RosterRules, THROWBALL_ROSTER_RULES } from './rosterRules';

export interface PlayerLineupSnapshot {
  id: string;
  name: string;
  jerseyNumber: number;
  role?: string;
  isCaptain?: boolean;
}

export interface MatchLineup {
  matchId: string;
  teamId: string;
  startingPlayerIds: string[];     // exactly 6 for Throwball
  substitutePlayerIds: string[];   // exactly 2 for Throwball
  snapshots?: PlayerLineupSnapshot[] | Record<string, PlayerLineupSnapshot>; // Historical frozen snapshot
  isLocked?: boolean;
  updatedAt?: string;
}

export interface LineupValidationResult {
  valid: boolean;
  isValid: boolean;
  errors: string[];
}

/**
 * Checks whether a match lineup is locked.
 * Once a match is LIVE or COMPLETED, the starting lineup is permanently immutable.
 */
export function isLineupLocked(matchStatus: string): boolean {
  return matchStatus === 'LIVE' || matchStatus === 'HALFTIME' || matchStatus === 'COMPLETED' || matchStatus === 'BYE_ADVANCEMENT';
}

/**
 * Validates a match lineup for a specific team.
 * Enforces:
 * 1. Match status must not be locked (if checking an update/save).
 * 2. Exactly `startingPlayers` (6 for Throwball).
 * 3. Exactly `substitutePlayers` (2 for Throwball).
 * 4. No duplicate player IDs within starting lineup.
 * 5. No duplicate player IDs within substitutes.
 * 6. Disjoint sets: A player cannot be both a starter and a substitute.
 * 7. Boundary: Every player ID in the lineup must belong to the team's registered roster.
 * 8. Completeness: All registered roster players must be accounted for (6 starters + 2 substitutes = 8).
 */
export function validateMatchLineup(
  lineup: MatchLineup,
  teamOrPlayers: Team | Player[] | { id?: string; name?: string; players: Player[] },
  rules: RosterRules = THROWBALL_ROSTER_RULES,
  matchStatus?: string
): LineupValidationResult {
  const errors: string[] = [];

  // Lock invariant
  if (matchStatus && isLineupLocked(matchStatus)) {
    errors.push('Lineup is locked: cannot modify lineups after the match has started or completed.');
  }

  const { startingPlayerIds, substitutePlayerIds } = lineup;

  // Starters count
  if (!startingPlayerIds || startingPlayerIds.length !== rules.startingPlayers) {
    errors.push(
      `Starting lineup must have exactly ${rules.startingPlayers} starting players (got ${startingPlayerIds?.length || 0}).`
    );
  }

  // Substitutes count
  if (!substitutePlayerIds || substitutePlayerIds.length !== rules.substitutePlayers) {
    errors.push(
      `Substitutes must have exactly ${rules.substitutePlayers} substitutes (got ${substitutePlayerIds?.length || 0}).`
    );
  }

  const players: Player[] = Array.isArray(teamOrPlayers)
    ? teamOrPlayers
    : (teamOrPlayers as any)?.players || [];
  const teamName = Array.isArray(teamOrPlayers) ? 'the team' : (teamOrPlayers as any)?.name || 'the team';

  const registeredMap = new Map<string, Player>(
    players.map((p) => [p.id, p])
  );

  const starterSet = new Set<string>();
  const subSet = new Set<string>();

  // Check starters
  (startingPlayerIds || []).forEach((pid) => {
    if (starterSet.has(pid)) {
      errors.push(`Duplicate player ID in starting lineup: "${pid}".`);
    }
    starterSet.add(pid);

    if (!registeredMap.has(pid)) {
      errors.push(`Player ID "${pid}" does not belong to the registered roster of ${teamName}.`);
    }
  });

  // Check substitutes
  (substitutePlayerIds || []).forEach((pid) => {
    if (subSet.has(pid)) {
      errors.push(`Duplicate player ID in substitutes: "${pid}".`);
    }
    subSet.add(pid);

    if (!registeredMap.has(pid)) {
      errors.push(`Player ID "${pid}" does not belong to the registered roster of ${teamName}.`);
    }

    if (starterSet.has(pid)) {
      errors.push(`Player ID "${pid}" cannot be both a starter and a substitute.`);
    }
  });

  // Check total accounted for
  const totalAccounted = starterSet.size + subSet.size;
  if (totalAccounted !== rules.rosterSize && registeredMap.size === rules.rosterSize) {
    errors.push(
      `All ${rules.rosterSize} registered players must be accounted for (${starterSet.size} starters + ${subSet.size} substitutes = ${totalAccounted}).`
    );
  }

  return {
    valid: errors.length === 0,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates an initial or auto-filled lineup from the team's registered roster.
 * Selects the first `startingPlayers` as starters, and the remaining `substitutePlayers` as substitutes.
 * Automatically snapshots player identities for historical integrity.
 */
export function createDefaultLineup(
  matchId: string,
  teamOrId: Team | string,
  playersOrRules?: Player[] | RosterRules,
  maybeRules?: RosterRules
): MatchLineup {
  let teamId: string;
  let players: Player[] = [];
  let rules: RosterRules = THROWBALL_ROSTER_RULES;
  let captainId: string | undefined;

  if (typeof teamOrId === 'string') {
    teamId = teamOrId;
    players = Array.isArray(playersOrRules) ? playersOrRules : [];
    rules = maybeRules || THROWBALL_ROSTER_RULES;
  } else {
    teamId = teamOrId.id;
    players = teamOrId.players || [];
    rules = (playersOrRules as RosterRules) || THROWBALL_ROSTER_RULES;
    captainId = teamOrId.captainId;
  }

  const starters = players.slice(0, rules.startingPlayers).map((p) => p.id);
  const substitutes = players
    .slice(rules.startingPlayers, rules.startingPlayers + rules.substitutePlayers)
    .map((p) => p.id);

  const snapshots: PlayerLineupSnapshot[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    jerseyNumber: p.jerseyNumber ?? 0,
    role: p.role,
    isCaptain: p.isCaptain || p.role?.includes('Captain (C)') || (captainId === p.id),
  }));

  return {
    matchId,
    teamId,
    startingPlayerIds: starters,
    substitutePlayerIds: substitutes,
    snapshots,
    isLocked: false,
    updatedAt: new Date().toISOString(),
  };
}
