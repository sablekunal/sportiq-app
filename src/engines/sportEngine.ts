import { SportType, Match, Standing, Team } from '../types';
import { RosterRules, THROWBALL_ROSTER_RULES } from '../domain/tournament/roster/rosterRules';

export interface SportEventDefinition {
  type: string;
  label: string;
  pointsAwarded?: { home?: number; away?: number };
  icon: string;
  color: string;
}

export interface SportConfig {
  name: string;
  displayName: string;
  icon: string;
  defaultPeriods: string[];
  defaultDurationMinutes: number;
  scoreUnit: string; // 'Goals', 'Runs', 'Sets', 'Points'
  allowedEvents: SportEventDefinition[];
  defaultWinPoints: number;
  defaultDrawPoints: number;
  defaultLossPoints: number;
  supportsDraw: boolean;
  rosterRules?: RosterRules;
}

export const SPORT_CONFIGS: Record<SportType, SportConfig> = {
  football: {
    name: 'football',
    displayName: 'Football / Soccer',
    icon: '⚽',
    defaultPeriods: ['1st Half', '2nd Half', 'Extra Time', 'Penalties'],
    defaultDurationMinutes: 90,
    scoreUnit: 'Goals',
    supportsDraw: true,
    defaultWinPoints: 3,
    defaultDrawPoints: 1,
    defaultLossPoints: 0,
    allowedEvents: [
      { type: 'GOAL', label: 'Goal ⚽', icon: '⚽', color: 'bg-emerald-500' },
      { type: 'ASSIST', label: 'Assist 👟', icon: '👟', color: 'bg-blue-500' },
      { type: 'YELLOW_CARD', label: 'Yellow Card 🟨', icon: '🟨', color: 'bg-amber-400' },
      { type: 'RED_CARD', label: 'Red Card 🟥', icon: '🟥', color: 'bg-red-600' },
      { type: 'PENALTY_GOAL', label: 'Penalty Goal 🥅', icon: '🥅', color: 'bg-purple-600' },
      { type: 'OWN_GOAL', label: 'Own Goal 🔄', icon: '🔄', color: 'bg-orange-500' },
    ],
  },
  cricket: {
    name: 'cricket',
    displayName: 'Cricket (T20 / Limited Overs)',
    icon: '🏏',
    defaultPeriods: ['1st Innings', '2nd Innings', 'Super Over'],
    defaultDurationMinutes: 180,
    scoreUnit: 'Runs',
    supportsDraw: false,
    defaultWinPoints: 2,
    defaultDrawPoints: 1,
    defaultLossPoints: 0,
    allowedEvents: [
      { type: 'DOT_BALL', label: 'Dot Ball (0)', icon: '⚪', color: 'bg-slate-400' },
      { type: 'SINGLE', label: 'Single (1 run)', icon: '1️⃣', color: 'bg-sky-500' },
      { type: 'DOUBLE', label: 'Two (2 runs)', icon: '2️⃣', color: 'bg-sky-600' },
      { type: 'FOUR', label: 'Boundary Four (4) 🏏', icon: '4️⃣', color: 'bg-amber-500' },
      { type: 'SIX', label: 'Maximum Six (6) 🚀', icon: '6️⃣', color: 'bg-rose-500' },
      { type: 'WICKET', label: 'Wicket Fallen ☝️', icon: '☝️', color: 'bg-red-600' },
      { type: 'WIDE', label: 'Wide Extra (+1)', icon: '↔️', color: 'bg-indigo-500' },
      { type: 'NO_BALL', label: 'No Ball (+1)', icon: '🚫', color: 'bg-red-500' },
    ],
  },
  volleyball: {
    name: 'volleyball',
    displayName: 'Volleyball',
    icon: '🏐',
    defaultPeriods: ['Set 1', 'Set 2', 'Set 3', 'Set 4', 'Decider Set 5'],
    defaultDurationMinutes: 60,
    scoreUnit: 'Sets / Points',
    supportsDraw: false,
    defaultWinPoints: 3,
    defaultDrawPoints: 0,
    defaultLossPoints: 0,
    allowedEvents: [
      { type: 'SPIKE_KILL', label: 'Spike Kill 💥', icon: '💥', color: 'bg-emerald-500' },
      { type: 'BLOCK_POINT', label: 'Block Point 🧱', icon: '🧱', color: 'bg-blue-600' },
      { type: 'ACE', label: 'Service Ace 🎯', icon: '🎯', color: 'bg-amber-500' },
      { type: 'OPPONENT_ERROR', label: 'Opponent Error ❌', icon: '❌', color: 'bg-slate-500' },
      { type: 'TIMEOUT', label: 'Timeout Called ⏱️', icon: '⏱️', color: 'bg-yellow-500' },
    ],
  },
  basketball: {
    name: 'basketball',
    displayName: 'Basketball',
    icon: '🏀',
    defaultPeriods: ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4', 'Overtime'],
    defaultDurationMinutes: 48,
    scoreUnit: 'Points',
    supportsDraw: false,
    defaultWinPoints: 2,
    defaultDrawPoints: 0,
    defaultLossPoints: 1,
    allowedEvents: [
      { type: 'TWO_POINTER', label: '2-Point Field Goal 🏀', icon: '2️⃣', color: 'bg-orange-500' },
      { type: 'THREE_POINTER', label: '3-Point Jumper 🎯', icon: '3️⃣', color: 'bg-emerald-500' },
      { type: 'FREE_THROW', label: 'Free Throw (1 Pt) 🗑️', icon: '1️⃣', color: 'bg-blue-500' },
      { type: 'FOUL', label: 'Personal Foul 🛑', icon: '🛑', color: 'bg-red-500' },
      { type: 'TIMEOUT', label: 'Timeout ⏸️', icon: '⏸️', color: 'bg-slate-600' },
    ],
  },
  badminton: {
    name: 'badminton',
    displayName: 'Badminton',
    icon: '🏸',
    defaultPeriods: ['Game 1', 'Game 2', 'Deciding Game 3'],
    defaultDurationMinutes: 45,
    scoreUnit: 'Games / Points',
    supportsDraw: false,
    defaultWinPoints: 2,
    defaultDrawPoints: 0,
    defaultLossPoints: 0,
    allowedEvents: [
      { type: 'SMASH_WINNER', label: 'Smash Winner ⚡', icon: '⚡', color: 'bg-emerald-500' },
      { type: 'DROP_SHOT', label: 'Deceptive Drop 💧', icon: '💧', color: 'bg-blue-500' },
      { type: 'UNFORCED_ERROR', label: 'Unforced Error 🛑', icon: '🛑', color: 'bg-rose-500' },
      { type: 'CHALLENGE', label: 'Hawkeye Challenge 👁️', icon: '👁️', color: 'bg-purple-600' },
    ],
  },
  kabaddi: {
    name: 'kabaddi',
    displayName: 'Kabaddi',
    icon: '🤼',
    defaultPeriods: ['1st Half (20m)', '2nd Half (20m)', 'Extra Time'],
    defaultDurationMinutes: 40,
    scoreUnit: 'Points',
    supportsDraw: true,
    defaultWinPoints: 5,
    defaultDrawPoints: 3,
    defaultLossPoints: 1,
    allowedEvents: [
      { type: 'TOUCH_POINT', label: 'Touch Point (Raid) 🏃', icon: '🏃', color: 'bg-emerald-500' },
      { type: 'BONUS_POINT', label: 'Bonus Point ⭐', icon: '⭐', color: 'bg-amber-400' },
      { type: 'SUPER_RAID', label: 'Super Raid (3+ Pts) 💥', icon: '💥', color: 'bg-orange-600' },
      { type: 'TACKLE_POINT', label: 'Catch / Tackle 🛡️', icon: '🛡️', color: 'bg-blue-600' },
      { type: 'SUPER_TACKLE', label: 'Super Tackle (+2) 🧱', icon: '🧱', color: 'bg-purple-600' },
      { type: 'ALL_OUT', label: 'ALL OUT (+2 bonus) 🚨', icon: '🚨', color: 'bg-red-600' },
    ],
  },
  throwball: {
    name: 'throwball',
    displayName: 'Throwball',
    icon: '🤾',
    defaultPeriods: ['Set 1 (25 pts)', 'Set 2 (25 pts)', 'Deciding Set 3 (15 pts)'],
    defaultDurationMinutes: 45,
    scoreUnit: 'Sets / Points',
    supportsDraw: false,
    defaultWinPoints: 1,
    defaultDrawPoints: 0,
    defaultLossPoints: 0,
    allowedEvents: [
      { type: 'POINT', label: 'Point Scored 🎯', icon: '🎯', color: 'bg-emerald-500' },
      { type: 'ACE_SERVICE', label: 'Service Ace 🚀', icon: '🚀', color: 'bg-blue-600' },
      { type: 'JUMP_THROW', label: 'Jump Throw Kill ⚡', icon: '⚡', color: 'bg-orange-500' },
      { type: 'CATCH_DROP', label: 'Catching Drop / Error ❌', icon: '❌', color: 'bg-rose-500' },
      { type: 'TOUCH_OUT', label: 'Touch Out 🛑', icon: '🛑', color: 'bg-amber-500' },
      { type: 'DOUBLE_TOUCH', label: 'Double Touch Fault ⚠️', icon: '⚠️', color: 'bg-red-500' },
      { type: 'NET_TOUCH', label: 'Net Touch 🕸️', icon: '🕸️', color: 'bg-purple-500' },
      { type: 'TIMEOUT', label: 'Timeout ⏱️', icon: '⏱️', color: 'bg-slate-600' },
    ],
    rosterRules: THROWBALL_ROSTER_RULES,
  },
};

/**
 * Calculates standings table for a list of teams and matches according to sport rules
 */
export function calculateSportStandings(
  sport: SportType,
  teams: Team[],
  matches: Match[],
  groupId?: string
): Standing[] {
  const config = SPORT_CONFIGS[sport] || SPORT_CONFIGS.football;

  // Filter relevant teams & completed matches
  const targetTeams = groupId
    ? teams.filter((t) => t.groupId === groupId)
    : teams;

  const standingsMap: Record<string, Standing> = {};

  targetTeams.forEach((team) => {
    standingsMap[team.id] = {
      teamId: team.id,
      teamName: team.name,
      teamLogo: team.logoUrl,
      played: 0,
      won: 0,
      draw: 0,
      lost: 0,
      points: 0,
      scored: 0,
      conceded: 0,
      difference: 0,
      groupId: team.groupId,
    };
  });

  const completedMatches = matches.filter(
    (m) =>
      m.status === 'COMPLETED' &&
      m.homeTeamId &&
      m.awayTeamId &&
      standingsMap[m.homeTeamId] &&
      standingsMap[m.awayTeamId]
  );

  completedMatches.forEach((m) => {
    const home = standingsMap[m.homeTeamId!];
    const away = standingsMap[m.awayTeamId!];

    if (!home || !away) return;

    home.played += 1;
    away.played += 1;

    home.scored += m.homeScore;
    home.conceded += m.awayScore;
    away.scored += m.awayScore;
    away.conceded += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won += 1;
      home.points += config.defaultWinPoints;
      away.lost += 1;
      away.points += config.defaultLossPoints;
    } else if (m.awayScore > m.homeScore) {
      away.won += 1;
      away.points += config.defaultWinPoints;
      home.lost += 1;
      home.points += config.defaultLossPoints;
    } else {
      // Draw
      home.draw += 1;
      away.draw += 1;
      home.points += config.defaultDrawPoints;
      away.points += config.defaultDrawPoints;
    }

    home.difference = home.scored - home.conceded;
    away.difference = away.scored - away.conceded;
  });

  // Sort by Points DESC, then Difference DESC, then Scored DESC
  return Object.values(standingsMap).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.difference !== a.difference) return b.difference - a.difference;
    return b.scored - a.scored;
  });
}
