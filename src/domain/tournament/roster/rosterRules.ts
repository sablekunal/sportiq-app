import type { Player, Team, Match, RosterStatus, PlayerStatus } from '../../../types';
import { DomainMatch } from '../models/types';

export type { RosterStatus, PlayerStatus };

export interface RosterRules {
  rosterSize: number;         // 8 for Throwball
  startingPlayers: number;    // 6 for Throwball
  substitutePlayers: number;  // 2 for Throwball
  minCatholics?: number;      // 3 compulsory for SXY Throwball 2026
}

export const THROWBALL_ROSTER_RULES: RosterRules = {
  rosterSize: 8,
  startingPlayers: 6,
  substitutePlayers: 2,
  minCatholics: 3,
};

export interface ValidateRosterOptions {
  isSetup?: boolean;
  isPublishing?: boolean;
  isLocked?: boolean;
}

export interface RosterValidationResult {
  valid: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  status: RosterStatus;
  isComplete: boolean;
}

/**
 * Derives the explicit lifecycle state of a team roster:
 * - INCOMPLETE: fewer than 8 players (organizer can continue editing roster)
 * - COMPLETE: exactly 8 players (ready for lock/publication)
 * - LOCKED: roster finalized / match started (destructive edits blocked)
 */
export function getRosterStatus(
  teamOrPlayers: { players?: Player[]; isRosterLocked?: boolean; rosterStatus?: RosterStatus } | Player[],
  isLocked?: boolean
): RosterStatus {
  const players = Array.isArray(teamOrPlayers) ? teamOrPlayers : teamOrPlayers.players || [];
  const locked = Boolean(
    isLocked ||
    (!Array.isArray(teamOrPlayers) && (teamOrPlayers.isRosterLocked || teamOrPlayers.rosterStatus === 'LOCKED'))
  );

  if (locked) return 'LOCKED';
  if (players.length === THROWBALL_ROSTER_RULES.rosterSize) return 'COMPLETE';
  return 'INCOMPLETE';
}

/**
 * Validates a team roster against Throwball rules.
 *
 * During setup (isSetup: true):
 * - Teams with 6/8 or 7/8 players remain valid entities (status: INCOMPLETE, with warnings).
 * - Teams with 8/8 players are COMPLETE and READY.
 *
 * For publication (default / isPublishing: true):
 * - Exactly 8 registered players required (6/8 or 7/8 produces an ERROR).
 *
 * In all cases enforces:
 * - Each player has a valid non-empty name
 * - Valid positive jersey number (1-99)
 * - Unique jersey numbers within team
 * - Unique player IDs within team
 * - At most 1 captain and at most 1 vice-captain
 * - A player cannot be both captain and vice-captain
 */
export function validateTeamRoster(
  teamOrPlayers:
    | { id?: string; name?: string; players: Player[]; captainId?: string; viceCaptainId?: string; isRosterLocked?: boolean; rosterStatus?: RosterStatus }
    | Player[],
  rules: RosterRules = THROWBALL_ROSTER_RULES,
  options?: ValidateRosterOptions
): RosterValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const players: Player[] = Array.isArray(teamOrPlayers)
    ? teamOrPlayers
    : teamOrPlayers?.players || [];

  const captainId = Array.isArray(teamOrPlayers) ? undefined : teamOrPlayers?.captainId;
  const viceCaptainId = Array.isArray(teamOrPlayers) ? undefined : teamOrPlayers?.viceCaptainId;
  const teamName = Array.isArray(teamOrPlayers) ? 'Team' : teamOrPlayers?.name || 'Team';

  const status = getRosterStatus(teamOrPlayers, options?.isLocked);
  const isSetup = Boolean(options?.isSetup);

  // Roster size validation
  if (isSetup) {
    if (players.length > rules.rosterSize) {
      errors.push(`Team roster cannot exceed ${rules.rosterSize} registered players (got ${players.length}).`);
    } else if (players.length < rules.rosterSize) {
      warnings.push(
        `${teamName} has ${players.length}/${rules.rosterSize} registered players (roster incomplete during setup).`
      );
    }
  } else {
    // Publication / strict mode requires exactly rosterSize (8)
    if (players.length !== rules.rosterSize) {
      errors.push(
        `Team roster must have exactly ${rules.rosterSize} registered players (got ${players.length}).`
      );
    }
  }

  const seenIds = new Set<string>();
  const seenJerseys = new Set<number>();
  let captainCount = 0;
  let viceCaptainCount = 0;

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const playerNum = i + 1;

    // Validate ID
    if (!p.id || !p.id.trim()) {
      errors.push(`Player #${playerNum} is missing a unique ID.`);
    } else if (seenIds.has(p.id)) {
      errors.push(`Duplicate player ID found: "${p.id}".`);
    } else {
      seenIds.add(p.id);
    }

    // Validate Name
    if (!p.name || !p.name.trim()) {
      errors.push(`Player #${playerNum} is missing a name.`);
    }

    // Validate Jersey Number
    if (p.jerseyNumber === undefined || p.jerseyNumber === null || Number.isNaN(p.jerseyNumber)) {
      errors.push(`Player "${p.name || `#${playerNum}`}" is missing a jersey number.`);
    } else if (p.jerseyNumber < 1 || p.jerseyNumber > 99) {
      errors.push(`Jersey number for "${p.name || `#${playerNum}`}" must be between 1 and 99.`);
    } else if (seenJerseys.has(p.jerseyNumber)) {
      errors.push(`Duplicate jersey number #${p.jerseyNumber} on "${p.name || `#${playerNum}`}".`);
    } else {
      seenJerseys.add(p.jerseyNumber);
    }

    // Captain / Vice-Captain flags
    const isCap = p.isCaptain || p.role?.includes('Captain (C)') || (captainId && captainId === p.id);
    const isVc = p.isViceCaptain || p.role?.includes('Vice-Captain (VC)') || (viceCaptainId && viceCaptainId === p.id);

    if (isCap) captainCount++;
    if (isVc) viceCaptainCount++;
    if (isCap && isVc) {
      errors.push(`Player "${p.name}" cannot be both Captain and Vice-Captain.`);
    }
  }

  if (captainCount > 1) {
    errors.push(`Team has ${captainCount} captains. At most 1 captain is allowed.`);
  }
  if (viceCaptainCount > 1) {
    errors.push(`Team has ${viceCaptainCount} vice-captains. At most 1 vice-captain is allowed.`);
  }

  const isValid = errors.length === 0;

  return {
    valid: isValid,
    isValid,
    errors,
    warnings,
    status,
    isComplete: players.length === rules.rosterSize,
  };
}

/**
 * Checks whether destructive roster edits are allowed on a team.
 * Locked rosters or teams with active/completed matches cannot be destructively altered.
 */
export function canModifyRoster(
  team: Team,
  matches: (Match | DomainMatch)[] = []
): { allowed: boolean; reason?: string } {
  if (team.isRosterLocked || team.rosterStatus === 'LOCKED') {
    return { allowed: false, reason: 'Roster is locked. Destructive edits are blocked.' };
  }

  const hasActiveMatch = matches.some((m) => {
    const anyM = m as any;
    const isTeam =
      anyM.homeTeamId === team.id ||
      anyM.awayTeamId === team.id ||
      (anyM.participantA?.type === 'TEAM' && anyM.participantA.teamId === team.id) ||
      (anyM.participantB?.type === 'TEAM' && anyM.participantB.teamId === team.id);
    return isTeam && (m.status === 'LIVE' || m.status === 'COMPLETED' || m.status === 'HALFTIME');
  });

  if (hasActiveMatch) {
    return {
      allowed: false,
      reason: 'Team has active or completed matches. Destructive edits to roster are blocked.',
    };
  }

  return { allowed: true };
}

/**
 * Checks whether a player can be safely removed or replaced without corrupting historical match records.
 * A player who has appeared in any LIVE or COMPLETED match lineup cannot be deleted.
 */
export function canRemoveOrReplacePlayer(
  team: Team,
  playerId: string,
  matches: (Match | DomainMatch)[] = []
): { allowed: boolean; reason?: string } {
  if (team.isRosterLocked || team.rosterStatus === 'LOCKED') {
    return { allowed: false, reason: 'Roster is locked. Destructive edits are blocked.' };
  }

  for (const m of matches) {
    if (m.status !== 'LIVE' && m.status !== 'COMPLETED' && m.status !== 'HALFTIME') continue;
    const anyM = m as any;
    const isTeamA = anyM.homeTeamId === team.id || (anyM.participantA?.type === 'TEAM' && anyM.participantA.teamId === team.id);
    const isTeamB = anyM.awayTeamId === team.id || (anyM.participantB?.type === 'TEAM' && anyM.participantB.teamId === team.id);
    const lineup = isTeamA ? (anyM.lineupHome || anyM.lineupA) : isTeamB ? (anyM.lineupAway || anyM.lineupB) : null;
    if (!lineup) continue;

    const starterIds: string[] = lineup.startingPlayerIds || [];
    const subIds: string[] = lineup.substitutePlayerIds || [];

    if (starterIds.includes(playerId) || subIds.includes(playerId)) {
      return {
        allowed: false,
        reason: `Player has appeared in historical match ${anyM.matchCode || anyM.fixtureNumber || anyM.id}. Historical records must be preserved.`,
      };
    }
  }

  return { allowed: true };
}
