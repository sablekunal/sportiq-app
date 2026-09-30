import { Player, Team } from '../../../types';

export interface RosterRules {
  rosterSize: number;         // 8 for Throwball
  startingPlayers: number;    // 6 for Throwball
  substitutePlayers: number;  // 2 for Throwball
}

export const THROWBALL_ROSTER_RULES: RosterRules = {
  rosterSize: 8,
  startingPlayers: 6,
  substitutePlayers: 2,
};

export interface RosterValidationResult {
  valid: boolean;
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a team roster against the sport's roster rules.
 * Enforces:
 * - Exactly rosterSize players (e.g. 8 for Throwball)
 * - Each player has a valid non-empty name
 * - Each player has a valid positive jersey number (1-99)
 * - Unique jersey numbers within the team
 * - Unique player IDs within the team
 * - At most 1 captain and at most 1 vice-captain
 * - A player cannot be both captain and vice-captain
 */
export function validateTeamRoster(
  teamOrPlayers:
    | { id?: string; name?: string; players: Player[]; captainId?: string; viceCaptainId?: string }
    | Player[],
  rules: RosterRules = THROWBALL_ROSTER_RULES
): RosterValidationResult {
  const errors: string[] = [];

  const players: Player[] = Array.isArray(teamOrPlayers)
    ? teamOrPlayers
    : teamOrPlayers?.players || [];

  const captainId = Array.isArray(teamOrPlayers) ? undefined : teamOrPlayers?.captainId;
  const viceCaptainId = Array.isArray(teamOrPlayers) ? undefined : teamOrPlayers?.viceCaptainId;

  if (players.length !== rules.rosterSize) {
    errors.push(
      `Team roster must have exactly ${rules.rosterSize} registered players (got ${players.length}).`
    );
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

  return {
    valid: errors.length === 0,
    isValid: errors.length === 0,
    errors,
  };
}
