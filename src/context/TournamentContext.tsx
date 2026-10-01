import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  Tournament,
  Match,
  Team,
  BudgetItem,
  TournamentStatus,
  MatchEvent,
  AuditLog,
  MatchLineup,
  PlayerLineupSnapshot,
  Venue,
  SetScore,
  SubstitutionEvent,
  TimeoutEvent,
} from '../types';
import { INITIAL_VENUES, createThrowballDemoTournament } from '../services/mockData';
import { advanceWinnerInBracket, generateKnockoutFixtures, generateRoundRobinFixtures, generateGroupKnockoutFixtures } from '../engines/tournamentEngine';
import { soundEffects } from '../engines/audioEngine';
import confetti from 'canvas-confetti';

import { MatchRepository } from '../repositories/matchRepository';
import { DomainMatch, MatchResult, TournamentRules } from '../domain/tournament/models/types';
import { generateKnockout } from '../domain/tournament/fixtures/knockout';
import { generateRoundRobin } from '../domain/tournament/fixtures/roundRobin';
import {
  generateFourGroupTournament,
  assignTeamToGroupPosition,
  isGroupAssignmentLocked,
} from '../domain/tournament/fixtures/groupKnockout';
import { processMatchResult } from '../domain/tournament/results/processResult';
import { adaptDomainMatchToLegacy } from '../services/matchAdapter';
import { SPORT_CONFIGS } from '../engines/sportEngine';

import { RosterRules, THROWBALL_ROSTER_RULES, validateTeamRoster } from '../domain/tournament/roster/rosterRules';
import {
  validateMatchLineup,
  createDefaultLineup,
  isLineupLocked,
} from '../domain/tournament/roster/lineupValidation';
import { recordSubstitution, recordTimeout } from '../domain/tournament/scoring/throwballScoringEngine';

import { MatchSchedule, ScheduleConflict, TournamentReadinessResult } from '../domain/tournament/operations/types';
import { detectScheduleConflicts, validateMatchSchedule } from '../domain/tournament/operations/conflicts';
import { calculateTournamentReadiness } from '../domain/tournament/operations/readiness';

export type AppViewMode = 'organizer' | 'public' | 'tools';
export type OrganizerTab =
  | 'overview'
  | 'teams'
  | 'setup'
  | 'draw'
  | 'fixtures'
  | 'schedule'
  | 'scoring'
  | 'standings'
  | 'bracket'
  | 'budget'
  | 'share'
  | 'settings';

export type ToolsTab =
  | 'coin-toss'
  | 'picker-wheel'
  | 'random-teams'
  | 'stopwatch'
  | 'scoreboard';

interface TournamentContextType {
  tournaments: Tournament[];
  activeTournament: Tournament | null;
  activeMatch: Match | null;
  viewMode: AppViewMode;
  organizerTab: OrganizerTab;
  toolsTab: ToolsTab;
  publicSlug: string | null;
  setViewMode: (mode: AppViewMode) => void;
  setOrganizerTab: (tab: OrganizerTab) => void;
  setToolsTab: (tab: ToolsTab) => void;
  setActiveTournamentId: (id: string) => void;
  setActiveMatchId: (id: string | null) => void;
  setPublicSlug: (slug: string | null) => void;
  createTournament: (tournament: Partial<Tournament>) => void;
  deleteTournament: (tournamentId: string) => void;
  loadThrowballDemo: () => void;
  clearAllData: () => void;
  updateTournamentStatus: (tournamentId: string, status: TournamentStatus) => void;
  addTeamToTournament: (tournamentId: string, team: Partial<Team>) => void;
  updateTeamInTournament: (tournamentId: string, teamId: string, teamData: Partial<Team>) => void;
  removeTeamFromTournament: (tournamentId: string, teamId: string) => void;
  generateTournamentFixtures: (tournamentId: string) => void;
  recordMatchEvent: (matchId: string, event: Omit<MatchEvent, 'id' | 'timestamp'>) => void;
  updateMatchScore: (matchId: string, homeScore: number, awayScore: number, period?: string) => void;
  updateMatchSets: (matchId: string, sets: SetScore[], currentSet?: number, servingTeamId?: string | null) => Promise<void>;
  recordMatchSubstitution: (matchId: string, sub: { setNumber: number; teamId: string; outgoingPlayerId: string; incomingPlayerId: string; reason: 'NORMAL' | 'INJURY' }) => Promise<void>;
  recordMatchTimeout: (matchId: string, timeout: { setNumber: number; teamId: string }) => Promise<void>;
  completeMatch: (matchId: string, result: { scoreA: number; scoreB: number; sets?: SetScore[] }) => void;
  lockTeamRoster: (tournamentId: string, teamId: string) => Promise<void>;
  addBudgetItem: (tournamentId: string, item: Omit<BudgetItem, 'id'>) => void;
  deleteBudgetItem: (tournamentId: string, itemId: string) => void;
  assignGroupPosition: (tournamentId: string, groupId: string, position: number, teamId: string | null) => Promise<void>;
  isGroupLocked: boolean;
  saveMatchLineup: (matchId: string, teamId: string, lineup: { startingPlayerIds: string[]; substitutePlayerIds: string[] }) => Promise<void>;
  autoFillMatchLineup: (matchId: string, teamId: string) => Promise<void>;
  updateMatchSchedule: (matchId: string, schedule: MatchSchedule) => Promise<void>;
  addVenue: (tournamentId: string, venue: Omit<Venue, 'id'>) => Promise<void>;
  updateVenue: (tournamentId: string, venueId: string, data: Partial<Venue>) => Promise<void>;
  deleteVenue: (tournamentId: string, venueId: string) => Promise<void>;
  publishTournament: (tournamentId: string) => Promise<{ success: boolean; errors: string[]; warnings: string[] }>;
  unpublishTournament: (tournamentId: string) => Promise<void>;
  readiness: TournamentReadinessResult;
  scheduleConflicts: ScheduleConflict[];
  domainMatches: DomainMatch[];
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const tournamentsRef = useRef<Tournament[]>([]);

  const [activeTournamentId, setActiveTournamentIdState] = useState<string>('');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  const getInitialViewMode = (): AppViewMode => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'organizer' || mode === 'admin') return 'organizer';
      if (mode === 'tools') return 'tools';
    }
    return 'public'; // Default to public spectator view on main screen
  };

  const [viewMode, setViewMode] = useState<AppViewMode>(getInitialViewMode);
  const [organizerTab, setOrganizerTab] = useState<OrganizerTab>('overview');
  const [toolsTab, setToolsTab] = useState<ToolsTab>('coin-toss');
  const [publicSlug, setPublicSlug] = useState<string | null>(null);

  // New state for normalized domain matches
  const [domainMatches, setDomainMatches] = useState<DomainMatch[]>([]);

  useEffect(() => {
    tournamentsRef.current = tournaments;
    if (typeof window !== 'undefined' && tournaments.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('t');
      const tourId = params.get('id');
      if (slug) {
        const found = tournaments.find((t) => t.slug === slug);
        if (found) setActiveTournamentIdState(found.id);
      } else if (tourId) {
        const found = tournaments.find((t) => t.id === tourId);
        if (found) setActiveTournamentIdState(found.id);
      }
    }
  }, [tournaments]);

  // Sync with Firestore (Legacy + Non-Match data)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          id: doc.id,
          name: d.name || 'Untitled',
          sport: d.sport || 'football',
          format: d.format || 'KNOCKOUT',
          status: d.status || 'DRAFT',
          teams: d.teams || [],
          fixtures: d.fixtures || [],
          groups: d.groups || [],
          budget: d.budget || [],
          auditLogs: d.auditLogs || [],
          venues: d.venues || [],
        } as Tournament;
      });
      setTournaments(data);
    });
    return () => unsubscribe();
  }, []);

  // Sync with Firestore Normalized Matches (Milestone 2)
  useEffect(() => {
    if (!activeTournamentId) {
      setDomainMatches([]);
      return;
    }
    const unsub = MatchRepository.subscribeToMatches(activeTournamentId, (matches) => {
      setDomainMatches(matches);
    });
    return () => unsub();
  }, [activeTournamentId]);

  // Keep active tournament in sync
  useEffect(() => {
    if (tournaments.length > 0) {
      if (!activeTournamentId || !tournaments.some((t) => t.id === activeTournamentId)) {
        setActiveTournamentId(tournaments[0].id);
      }
    }
  }, [tournaments, activeTournamentId]);

  // Combine Legacy Tournament Document with Normalized Domain Matches
  const activeTournament = useMemo(() => {
    const t = tournaments.find((t) => t.id === activeTournamentId) || tournaments[0] || null;
    if (t && domainMatches.length > 0) {
      // Sort fixtures strictly by canonical fixtureNumber so UI and Firestore never scramble the sequence
      const sortedMatches = [...domainMatches].sort(
        (a, b) => (a.fixtureNumber ?? a.position) - (b.fixtureNumber ?? b.position)
      );
      return { ...t, fixtures: sortedMatches.map(adaptDomainMatchToLegacy) };
    }
    return t;
  }, [tournaments, activeTournamentId, domainMatches]);

  const activeMatch = activeTournament?.fixtures.find((m) => m.id === activeMatchId) || null;

  const setActiveTournamentId = (id: string) => {
    setActiveTournamentIdState(id);
    const tour = tournaments.find((t) => t.id === id);
    if (tour && tour.fixtures.length > 0) {
      const live = tour.fixtures.find((m) => m.status === 'LIVE');
      setActiveMatchId(live ? live.id : tour.fixtures[0].id);
    } else {
      setActiveMatchId(null);
    }
  };

  const updateTournamentDoc = async (tournamentId: string, updater: (t: Tournament) => Tournament) => {
    const t = tournamentsRef.current.find(x => x.id === tournamentId);
    if (!t) return;

    if (t.ownerId && (!auth.currentUser || t.ownerId !== auth.currentUser.uid)) {
      console.warn("Permission denied: You do not own this tournament.");
      return;
    }

    const updated = updater(t);
    try {
      await setDoc(doc(db, 'tournaments', tournamentId), updated);
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  const createTournament = async (data: Partial<Tournament>) => {
    const id = `t-${Date.now()}`;
    const slug = data.slug || (data.name ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `tour-${Date.now()}`);
    const sportConfig = SPORT_CONFIGS[data.sport || 'throwball'] || SPORT_CONFIGS.football;
    const newTournament: Tournament = {
      id,
      slug,
      name: data.name || 'Untitled Tournament',
      sport: data.sport || 'throwball',
      format: data.format || 'KNOCKOUT',
      status: 'DRAFT',
      description: data.description || '',
      location: data.location || 'Main Arena',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date().toISOString().split('T')[0],
      organizerName: data.organizerName || 'Tournament Organizer',
      ownerId: auth.currentUser?.uid || undefined,
      visibility: 'PUBLIC',
      venues: INITIAL_VENUES,
      teams: data.teams || [],
      groups: [],
      rules: data.rules || {
        winPoints: sportConfig.defaultWinPoints,
        drawPoints: sportConfig.defaultDrawPoints,
        lossPoints: sportConfig.defaultLossPoints,
        pointsForWin: sportConfig.defaultWinPoints,
        pointsForDraw: sportConfig.defaultDrawPoints,
        pointsForLoss: sportConfig.defaultLossPoints,
        matchDurationMinutes: sportConfig.defaultDurationMinutes,
        periodsCount: sportConfig.defaultPeriods.length,
        tieBreakers: ['points', 'difference', 'scored'],
        allowDraws: sportConfig.supportsDraw,
      },
      budget: [],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'CREATE_TOURNAMENT',
          user: 'Organizer',
          details: `Created ${data.sport} tournament "${data.name}"`,
        },
      ],
      fixtures: [],
    };

    try {
      await setDoc(doc(db, 'tournaments', id), newTournament);
      setActiveTournamentId(id);
      setOrganizerTab('teams');
      soundEffects.playCelebration();
    } catch (error) {
      console.error("Error creating tournament", error);
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    const t = tournamentsRef.current.find(x => x.id === tournamentId);
    if (t?.ownerId && (!auth.currentUser || t.ownerId !== auth.currentUser.uid)) {
      console.warn("Permission denied: You do not own this tournament.");
      return;
    }

    try {
      await deleteDoc(doc(db, 'tournaments', tournamentId));
      const remaining = tournamentsRef.current.filter((t) => t.id !== tournamentId);
      if (remaining.length > 0) {
        setActiveTournamentId(remaining[0].id);
      } else {
        setActiveTournamentIdState('');
        setActiveMatchId(null);
      }
      soundEffects.playWhistle();
    } catch (error) {
      console.error("Error deleting tournament", error);
    }
  };

  const loadThrowballDemo = async () => {
    try {
      const demo = createThrowballDemoTournament();
      await setDoc(doc(db, 'tournaments', demo.id), demo);
      setActiveTournamentId(demo.id);
      soundEffects.playCelebration();
      confetti({ particleCount: 70, spread: 70 });
    } catch (error) {
      console.error("Error loading demo", error);
    }
  };

  const clearAllData = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'tournaments'));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      
      setActiveTournamentIdState('');
      setActiveMatchId(null);
      soundEffects.playWhistle();
    } catch (error) {
      console.error("Error clearing data", error);
    }
  };

  const updateTournamentStatus = (tournamentId: string, status: TournamentStatus) => {
    updateTournamentDoc(tournamentId, (t) => {
      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: 'STATUS_CHANGE',
        user: 'Organizer',
        details: `Tournament status updated from ${t.status} to ${status}`,
      };
      return { ...t, status, auditLogs: [newLog, ...t.auditLogs] };
    });
  };

  const addTeamToTournament = (tournamentId: string, teamData: Partial<Team>) => {
    const teamId = `team-${Date.now()}`;
    const newTeam: Team = {
      id: teamId,
      name: teamData.name || `Team ${teamId.slice(-3)}`,
      shortName: teamData.shortName || teamData.name?.slice(0, 3).toUpperCase() || 'TM',
      color: teamData.color || '#f97316',
      seed: teamData.seed || 1,
      players: teamData.players || [],
    };
    if (teamData.groupId) {
      newTeam.groupId = teamData.groupId;
    }

    updateTournamentDoc(tournamentId, (t) => {
      return {
        ...t,
        status: t.status === 'DRAFT' ? 'TEAMS_ADDED' : t.status,
        teams: [...t.teams, newTeam],
      };
    });
  };

  const updateTeamInTournament = (tournamentId: string, teamId: string, teamData: Partial<Team>) => {
    updateTournamentDoc(tournamentId, (t) => {
      const teamIdx = t.teams.findIndex((tm) => tm.id === teamId);
      if (teamIdx === -1) return t;

      const existingTeam = t.teams[teamIdx];

      // Check if team has played any live or completed matches
      const hasPlayedMatches = (domainMatches.length > 0 ? domainMatches : t.fixtures).some((m) => {
        const teamInA = (m as any).participantA?.teamId === teamId || (m as any).homeTeamId === teamId;
        const teamInB = (m as any).participantB?.teamId === teamId || (m as any).awayTeamId === teamId;
        const played = m.status === 'LIVE' || m.status === 'COMPLETED';
        return (teamInA || teamInB) && played;
      });

      // If team has played matches, prevent destructive player deletions
      if (hasPlayedMatches && teamData.players) {
        const existingPlayerIds = new Set(existingTeam.players.map((p) => p.id));
        const newPlayerIds = new Set(teamData.players.map((p) => p.id));
        for (const oldId of existingPlayerIds) {
          if (!newPlayerIds.has(oldId)) {
            console.warn(`Cannot delete player ${oldId}: team has active or completed competition matches.`);
            return t; // Abort destructive change
          }
        }
      }

      const updatedTeam: Team = {
        ...existingTeam,
        ...teamData,
      };

      const newTeams = [...t.teams];
      newTeams[teamIdx] = updatedTeam;
      return {
        ...t,
        teams: newTeams,
      };
    });
  };

  const removeTeamFromTournament = (tournamentId: string, teamId: string) => {
    updateTournamentDoc(tournamentId, (t) => {
      // Check if team has played any matches
      const hasPlayedMatches = (domainMatches.length > 0 ? domainMatches : t.fixtures).some((m) => {
        const teamInA = (m as any).participantA?.teamId === teamId || (m as any).homeTeamId === teamId;
        const teamInB = (m as any).participantB?.teamId === teamId || (m as any).awayTeamId === teamId;
        const played = m.status === 'LIVE' || m.status === 'COMPLETED';
        return (teamInA || teamInB) && played;
      });

      if (hasPlayedMatches) {
        console.warn(`Cannot delete team ${teamId}: team has active or completed competition matches.`);
        return t;
      }

      return {
        ...t,
        teams: t.teams.filter((item) => item.id !== teamId),
      };
    });
  };

  const generateTournamentFixtures = async (tournamentId: string) => {
    const t = tournamentsRef.current.find(x => x.id === tournamentId);
    if (!t) return;

    if (t.ownerId && (!auth.currentUser || t.ownerId !== auth.currentUser.uid)) {
      console.warn("Permission denied: You do not own this tournament.");
      return;
    }

    let generatedLegacy: Match[] = [];

    if (t.format === 'KNOCKOUT' || t.format === 'ROUND_ROBIN' || t.format === 'GROUP_KNOCKOUT') {
      // NEW DOMAIN ENGINE PATH
      let generatedDomain: any[] = [];
      if (t.format === 'KNOCKOUT') {
        generatedDomain = generateKnockout(t.id, 'playoffs', t.teams.map(team => team.id));
      } else if (t.format === 'ROUND_ROBIN') {
        generatedDomain = generateRoundRobin(t.id, 'league', t.teams.map(team => team.id));
      } else if (t.format === 'GROUP_KNOCKOUT') {
        const groupAssignments: Record<string, string[]> = { A: [], B: [], C: [], D: [] };
        if (t.groups && t.groups.length > 0) {
          t.groups.forEach((g, idx) => {
            const letter = String.fromCharCode(65 + idx);
            groupAssignments[letter] = g.teamIds || [];
          });
        } else {
          t.teams.forEach((tm, idx) => {
            const letter = tm.groupId || String.fromCharCode(65 + Math.floor(idx / 4));
            if (!groupAssignments[letter]) groupAssignments[letter] = [];
            groupAssignments[letter].push(tm.id);
          });
        }
        generatedDomain = generateFourGroupTournament({
          tournamentId: t.id,
          stageId: 'st-xaviers',
          groupAssignments,
        });
      }

      await MatchRepository.createMatches(t.id, generatedDomain);
      
      updateTournamentDoc(tournamentId, (tour) => {
        const newLog: AuditLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'FIXTURES_GENERATED',
          user: 'Tournament Engine',
          details: `Generated ${generatedDomain.length} domain matches for format ${tour.format}`,
        };
        // We no longer write to tour.fixtures for domain formats! The subcollection handles it.
        return {
          ...tour,
          status: 'FIXTURES_GENERATED',
          auditLogs: [newLog, ...tour.auditLogs],
        };
      });
      soundEffects.playCelebration();
      return; // Exit early, handled by subcollection
    } else {
      generatedLegacy = generateKnockoutFixtures(t.id, t.teams, t.startDate, t.venues[0]?.id);
    }

    // LEGACY PATH
    updateTournamentDoc(tournamentId, (tour) => {
      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: 'FIXTURES_GENERATED',
        user: 'Tournament Engine',
        details: `Generated ${generatedLegacy.length} fixtures for format ${tour.format}`,
      };
      return {
        ...tour,
        fixtures: generatedLegacy,
        status: 'FIXTURES_GENERATED',
        auditLogs: [newLog, ...tour.auditLogs],
      };
    });
    soundEffects.playCelebration();
  };

  const recordMatchEvent = async (matchId: string, eventData: Omit<MatchEvent, 'id' | 'timestamp'>) => {
    const event: MatchEvent = {
      ...eventData,
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
    };

    if (!activeTournament) return;
    const tournamentId = activeTournament.id;

    if (activeTournament.ownerId && (!auth.currentUser || activeTournament.ownerId !== auth.currentUser.uid)) {
      console.warn("Permission denied: You do not own this tournament.");
      return;
    }

    if (domainMatches.some(m => m.id === matchId)) {
      // NEW DOMAIN ENGINE PATH
      const matchRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
      // We can use a transaction or just updateDoc for events, but arrayUnion requires fetching unless we just use updateDoc with arrayUnion
      const { arrayUnion, increment } = await import('firebase/firestore');
      
      const isHome = domainMatches.find(m => m.id === matchId)?.participantA.type === 'TEAM' && 
        (domainMatches.find(m => m.id === matchId)?.participantA as any).teamId === event.teamId;

      const updates: any = {
        events: arrayUnion(event),
        status: 'LIVE'
      };

      if (['GOAL', 'POINT'].includes(event.eventType)) {
        if (isHome) updates.scoreA = increment(1);
        else updates.scoreB = increment(1);
      }
      
      await updateDoc(matchRef, updates);
      return;
    }

    // LEGACY PATH
    updateTournamentDoc(tournamentId, (t) => {
      const matchIndex = t.fixtures.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return t;

      const currentMatch = t.fixtures[matchIndex];
      const isHome = currentMatch.homeTeamId === event.teamId;

      let newHomeScore = currentMatch.homeScore;
      let newAwayScore = currentMatch.awayScore;

      if (['GOAL', 'POINT'].includes(event.eventType)) {
        if (isHome) newHomeScore += 1;
        else newAwayScore += 1;
      }

      const updatedMatch: Match = {
        ...currentMatch,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        status: 'LIVE',
        score: {
          ...currentMatch.score,
          homeScore: newHomeScore,
          awayScore: newAwayScore,
        },
        events: [event, ...currentMatch.events],
      };

      const newFixtures = [...t.fixtures];
      newFixtures[matchIndex] = updatedMatch;
      return { ...t, fixtures: newFixtures };
    });
  };

  const updateMatchScore = async (matchId: string, homeScore: number, awayScore: number, period?: string) => {
    if (!activeTournament) return;
    const tournamentId = activeTournament.id;

    if (activeTournament.ownerId && (!auth.currentUser || activeTournament.ownerId !== auth.currentUser.uid)) {
      console.warn("Permission denied: You do not own this tournament.");
      return;
    }

    if (domainMatches.some(m => m.id === matchId)) {
      // NEW DOMAIN ENGINE PATH
      const matchRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
      await updateDoc(matchRef, {
        scoreA: homeScore,
        scoreB: awayScore,
        status: 'LIVE', // Can use period as status or separate field later
      });
      return;
    }

    // LEGACY PATH
    updateTournamentDoc(tournamentId, (t) => {
      const matchIndex = t.fixtures.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return t;

      const currentMatch = t.fixtures[matchIndex];
      const updatedMatch: Match = {
        ...currentMatch,
        homeScore,
        awayScore,
        status: 'LIVE',
        score: {
          ...currentMatch.score,
          homeScore,
          awayScore,
          period: period || currentMatch.score.period,
        },
      };

      const newFixtures = [...t.fixtures];
      newFixtures[matchIndex] = updatedMatch;
      return { ...t, fixtures: newFixtures };
    });
  };

  const updateMatchSets = async (matchId: string, sets: SetScore[], currentSet?: number, servingTeamId?: string | null) => {
    if (!activeTournament) return;
    const tournamentId = activeTournament.id;

    const targetMatch = domainMatches.find((m) => m.id === matchId);
    const teamAId = targetMatch?.participantA.type === 'TEAM'
      ? (targetMatch.participantA as any).teamId
      : activeTournament.fixtures.find((m) => m.id === matchId)?.homeTeamId;

    const setsWonA = sets.filter((s) => s.status === 'COMPLETED' && s.winnerId === teamAId).length;
    const setsWonB = sets.filter((s) => s.status === 'COMPLETED' && s.winnerId && s.winnerId !== teamAId).length;

    if (domainMatches.some((m) => m.id === matchId)) {
      await MatchRepository.updateLiveMatchSets(tournamentId, matchId, {
        sets,
        currentSet: currentSet || 1,
        servingTeamId: servingTeamId ?? null,
        scoreA: setsWonA,
        scoreB: setsWonB,
        setsWonA,
        setsWonB,
        status: 'LIVE',
      });
      return;
    }

    // Legacy fallback
    updateTournamentDoc(tournamentId, (t) => {
      const idx = t.fixtures.findIndex((m) => m.id === matchId);
      if (idx === -1) return t;
      const cur = t.fixtures[idx];
      const updated: Match = {
        ...cur,
        sets,
        currentSet: currentSet || 1,
        servingTeamId: servingTeamId ?? null,
        setsWonA,
        setsWonB,
        homeScore: setsWonA,
        awayScore: setsWonB,
        status: 'LIVE',
      };
      const fixtures = [...t.fixtures];
      fixtures[idx] = updated;
      return { ...t, fixtures };
    });
  };

  const recordMatchSubstitution = async (
    matchId: string,
    sub: {
      setNumber: number;
      teamId: string;
      outgoingPlayerId: string;
      incomingPlayerId: string;
      reason: 'NORMAL' | 'INJURY';
    }
  ) => {
    if (!activeTournament) return;
    const tournamentId = activeTournament.id;

    const domainMatch = domainMatches.find((m) => m.id === matchId);
    if (domainMatch) {
      const res = recordSubstitution(domainMatch, sub);
      if (res.errors.length > 0) {
        throw new Error(res.errors.join(', '));
      }
      await MatchRepository.updateLiveMatchSets(tournamentId, matchId, {
        substitutions: res.match.substitutions,
      });
      return;
    }

    // Legacy fallback
    updateTournamentDoc(tournamentId, (t) => {
      const idx = t.fixtures.findIndex((m) => m.id === matchId);
      if (idx === -1) return t;
      const cur = t.fixtures[idx];
      const newSub: SubstitutionEvent = {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        matchId,
        setNumber: sub.setNumber,
        teamId: sub.teamId,
        outgoingPlayerId: sub.outgoingPlayerId,
        incomingPlayerId: sub.incomingPlayerId,
        reason: sub.reason,
        timestamp: new Date().toISOString(),
      };
      const substitutions = [...(cur.substitutions || []), newSub];
      const fixtures = [...t.fixtures];
      fixtures[idx] = { ...cur, substitutions };
      return { ...t, fixtures };
    });
  };

  const recordMatchTimeout = async (
    matchId: string,
    timeout: {
      setNumber: number;
      teamId: string;
    }
  ) => {
    if (!activeTournament) return;
    const tournamentId = activeTournament.id;

    const domainMatch = domainMatches.find((m) => m.id === matchId);
    if (domainMatch) {
      const res = recordTimeout(domainMatch, timeout);
      if (res.errors.length > 0) {
        throw new Error(res.errors.join(', '));
      }
      await MatchRepository.updateLiveMatchSets(tournamentId, matchId, {
        timeouts: res.match.timeouts,
      });
      return;
    }

    // Legacy fallback
    updateTournamentDoc(tournamentId, (t) => {
      const idx = t.fixtures.findIndex((m) => m.id === matchId);
      if (idx === -1) return t;
      const cur = t.fixtures[idx];
      const newTo: TimeoutEvent = {
        id: `to-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        matchId,
        setNumber: timeout.setNumber,
        teamId: timeout.teamId,
        durationMinutes: 3,
        timestamp: new Date().toISOString(),
      };
      const timeouts = [...(cur.timeouts || []), newTo];
      const fixtures = [...t.fixtures];
      fixtures[idx] = { ...cur, timeouts };
      return { ...t, fixtures };
    });
  };

  const lockTeamRoster = async (tournamentId: string, teamId: string) => {
    await updateTournamentDoc(tournamentId, (t) => {
      const teams = t.teams.map((team) => {
        if (team.id === teamId) {
          return {
            ...team,
            isRosterLocked: true,
            rosterStatus: 'LOCKED' as const,
          };
        }
        return team;
      });
      return { ...t, teams };
    });
  };

  const completeMatch = async (matchId: string, result: { scoreA: number; scoreB: number; sets?: SetScore[] }) => {
    if (!activeTournament) return;
    const tournamentId = activeTournament.id;

    if (activeTournament.ownerId && (!auth.currentUser || activeTournament.ownerId !== auth.currentUser.uid)) {
      console.warn("Permission denied: You do not own this tournament.");
      return;
    }

    // Is it a normalized DomainMatch?
    const isDomainMatch = domainMatches.some(m => m.id === matchId);

    if (isDomainMatch) {
      const domainRules: TournamentRules = { 
        allowDraws: Boolean(activeTournament.rules?.allowDraws),
        winPoints: activeTournament.rules?.winPoints ?? activeTournament.rules?.pointsForWin ?? 0,
        drawPoints: activeTournament.rules?.drawPoints ?? activeTournament.rules?.pointsForDraw ?? 0,
        lossPoints: activeTournament.rules?.lossPoints ?? activeTournament.rules?.pointsForLoss ?? 0,
        tieBreakers: activeTournament.rules?.tieBreakers,
      };
      
      try {
        await MatchRepository.completeMatchTransaction(
          tournamentId,
          matchId,
          result,
          domainRules,
          processMatchResult
        );
        soundEffects.playCelebration();
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      } catch (err) {
        console.error("Domain Error completing match:", err);
      }
      return;
    }

    // LEGACY FLOW
    updateTournamentDoc(tournamentId, (t) => {
      const matchIndex = t.fixtures.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return t;

      const currentMatch = t.fixtures[matchIndex];
      
      let winnerId = null;
      if (result.scoreA > result.scoreB) winnerId = currentMatch.homeTeamId;
      else if (result.scoreB > result.scoreA) winnerId = currentMatch.awayTeamId;

      const completedMatch: Match = {
        ...currentMatch,
        status: 'COMPLETED',
        winnerId,
        score: {
          ...currentMatch.score,
          homeScore: result.scoreA,
          awayScore: result.scoreB,
          period: 'Full Time',
        },
        sets: result.sets || currentMatch.sets,
      };

      let newFixtures = [...t.fixtures];
      newFixtures[matchIndex] = completedMatch;

      if (completedMatch.nextMatchId && winnerId) {
        newFixtures = advanceWinnerInBracket(newFixtures, completedMatch.id, winnerId);
      }

      return {
        ...t,
        fixtures: newFixtures,
      };
    });

    soundEffects.playCelebration();
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
  };

  const addBudgetItem = (tournamentId: string, itemData: Omit<BudgetItem, 'id'>) => {
    const newItem: BudgetItem = {
      ...itemData,
      id: `b-${Date.now()}`,
    };
    updateTournamentDoc(tournamentId, (t) => {
      return { ...t, budget: [...t.budget, newItem] };
    });
  };

  const deleteBudgetItem = (tournamentId: string, itemId: string) => {
    updateTournamentDoc(tournamentId, (t) => {
      return { ...t, budget: t.budget.filter((b) => b.id !== itemId) };
    });
  };

  const isGroupLocked = useMemo(() => {
    return isGroupAssignmentLocked(domainMatches);
  }, [domainMatches]);

  const assignGroupPosition = async (
    tournamentId: string,
    groupId: string,
    position: number,
    teamId: string | null
  ) => {
    const tour = tournamentsRef.current.find(x => x.id === tournamentId);
    if (tour?.ownerId && (!auth.currentUser || tour.ownerId !== auth.currentUser.uid)) {
      throw new Error("Permission denied: You do not own this tournament.");
    }

    if (isGroupAssignmentLocked(domainMatches)) {
      throw new Error('Cannot modify group assignments: competition has already begun.');
    }

    // 1. If matches already generated in normalized subcollection, update affected matches atomically
    if (domainMatches.length > 0) {
      const updatedMatches = assignTeamToGroupPosition(domainMatches, groupId, position, teamId);
      const affectedMatches = updatedMatches.filter((m) => {
        const old = domainMatches.find((x) => x.id === m.id);
        return old && (
          JSON.stringify(old.participantA) !== JSON.stringify(m.participantA) ||
          JSON.stringify(old.participantB) !== JSON.stringify(m.participantB)
        );
      });

      if (affectedMatches.length > 0) {
        const batch = writeBatch(db);
        affectedMatches.forEach((m) => {
          const ref = doc(db, 'tournaments', tournamentId, 'matches', m.id);
          batch.update(ref, {
            participantA: m.participantA,
            participantB: m.participantB,
          });
        });
        await batch.commit();
      }
    }

    // 2. Persist group position and team groupId in authoritative tournament document
    await updateTournamentDoc(tournamentId, (t) => {
      const existingGroups = t.groups || [];
      let targetGroup = existingGroups.find((g) => g.id === groupId);
      if (!targetGroup) {
        targetGroup = {
          id: groupId,
          name: `Group ${groupId}`,
          order: groupId.charCodeAt(0) - 64,
          teamIds: [],
        };
      }

      const newTeamIds = [...(targetGroup.teamIds || [])];
      while (newTeamIds.length < 4) newTeamIds.push('');

      // If team was already placed in another position in this group, vacate old position
      if (teamId) {
        const oldIdx = newTeamIds.findIndex((id, idx) => id === teamId && idx !== position - 1);
        if (oldIdx !== -1) {
          newTeamIds[oldIdx] = '';
        }
      }

      newTeamIds[position - 1] = teamId || '';

      const updatedGroups = existingGroups.some((g) => g.id === groupId)
        ? existingGroups.map((g) => (g.id === groupId ? { ...g, teamIds: newTeamIds } : g))
        : [...existingGroups, { ...targetGroup, teamIds: newTeamIds }];

      const updatedTeams = t.teams.map((tm) => {
        if (tm.id === teamId) {
          return { ...tm, groupId };
        }
        return tm;
      });

      return {
        ...t,
        groups: updatedGroups,
        teams: updatedTeams,
      };
    });
  };

  const saveMatchLineup = async (
    matchId: string,
    teamId: string,
    lineup: { startingPlayerIds: string[]; substitutePlayerIds: string[] }
  ) => {
    if (!activeTournament) return;
    const tournamentId = activeTournament.id;

    if (activeTournament.ownerId && (!auth.currentUser || activeTournament.ownerId !== auth.currentUser.uid)) {
      console.warn("Permission denied: You do not own this tournament.");
      return;
    }

    const team = activeTournament.teams.find((tm) => tm.id === teamId);
    if (!team) {
      throw new Error(`Team ${teamId} not found in tournament.`);
    }

    const sportConfig = SPORT_CONFIGS[activeTournament.sport];
    const rules = sportConfig?.rosterRules || THROWBALL_ROSTER_RULES;

    // Check domain matches first
    const domainMatch = domainMatches.find((m) => m.id === matchId);
    if (domainMatch) {
      if (isLineupLocked(domainMatch.status)) {
        throw new Error(`Match ${matchId} is ${domainMatch.status}. Lineups are locked and cannot be modified.`);
      }

      const matchLineup: MatchLineup = {
        matchId,
        teamId,
        startingPlayerIds: lineup.startingPlayerIds,
        substitutePlayerIds: lineup.substitutePlayerIds,
        snapshots: team.players.map((p) => ({
          id: p.id,
          name: p.name,
          jerseyNumber: p.jerseyNumber,
          isCaptain: p.isCaptain,
          isViceCaptain: p.isViceCaptain,
        })),
        isLocked: false,
      };

      const validation = validateMatchLineup(matchLineup, team.players, rules);
      if (!validation.isValid) {
        throw new Error(`Invalid match lineup: ${validation.errors.join(', ')}`);
      }

      const matchRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
      const isTeamA = domainMatch.participantA.type === 'TEAM' && domainMatch.participantA.teamId === teamId;
      const isTeamB = domainMatch.participantB.type === 'TEAM' && domainMatch.participantB.teamId === teamId;

      if (!isTeamA && !isTeamB) {
        throw new Error(`Team ${teamId} is not a participant in match ${matchId}.`);
      }

      if (isTeamA) {
        await updateDoc(matchRef, { lineupA: matchLineup });
      } else {
        await updateDoc(matchRef, { lineupB: matchLineup });
      }
      return;
    }

    // Legacy match path
    const legacyMatch = activeTournament.fixtures.find((m) => m.id === matchId);
    if (legacyMatch) {
      if (isLineupLocked(legacyMatch.status)) {
        throw new Error(`Match ${matchId} is ${legacyMatch.status}. Lineups are locked and cannot be modified.`);
      }

      const matchLineup: MatchLineup = {
        matchId,
        teamId,
        startingPlayerIds: lineup.startingPlayerIds,
        substitutePlayerIds: lineup.substitutePlayerIds,
        snapshots: team.players.map((p) => ({
          id: p.id,
          name: p.name,
          jerseyNumber: p.jerseyNumber,
          isCaptain: p.isCaptain,
          isViceCaptain: p.isViceCaptain,
        })),
        isLocked: false,
      };

      const validation = validateMatchLineup(matchLineup, team.players, rules);
      if (!validation.isValid) {
        throw new Error(`Invalid match lineup: ${validation.errors.join(', ')}`);
      }

      const isHome = legacyMatch.homeTeamId === teamId;
      const isAway = legacyMatch.awayTeamId === teamId;
      if (!isHome && !isAway) {
        throw new Error(`Team ${teamId} is not a participant in match ${matchId}.`);
      }

      updateTournamentDoc(tournamentId, (t) => {
        const idx = t.fixtures.findIndex((m) => m.id === matchId);
        if (idx === -1) return t;
        const cur = t.fixtures[idx];
        const updated: Match = {
          ...cur,
          lineupHome: isHome ? matchLineup : cur.lineupHome,
          lineupAway: isAway ? matchLineup : cur.lineupAway,
        };
        const newFixtures = [...t.fixtures];
        newFixtures[idx] = updated;
        return { ...t, fixtures: newFixtures };
      });
    }
  };

  const autoFillMatchLineup = async (matchId: string, teamId: string) => {
    if (!activeTournament) return;
    const team = activeTournament.teams.find((tm) => tm.id === teamId);
    if (!team) throw new Error(`Team ${teamId} not found.`);

    const sportConfig = SPORT_CONFIGS[activeTournament.sport];
    const rules = sportConfig?.rosterRules || THROWBALL_ROSTER_RULES;

    const defaultLineup = createDefaultLineup(matchId, teamId, team.players, rules);
    await saveMatchLineup(matchId, teamId, {
      startingPlayerIds: defaultLineup.startingPlayerIds,
      substitutePlayerIds: defaultLineup.substitutePlayerIds,
    });
  };

  const scheduleConflicts = useMemo(() => {
    if (!activeTournament) return [];
    const matchesToUse = domainMatches.length > 0 ? domainMatches : activeTournament.fixtures;
    return detectScheduleConflicts(matchesToUse, activeTournament.venues, activeTournament.teams);
  }, [activeTournament, domainMatches]);

  const readiness = useMemo(() => {
    if (!activeTournament) {
      return {
        status: 'WARNING' as const,
        canPublish: false,
        items: [],
        errors: ['No active tournament selected.'],
        warnings: [],
      };
    }
    const matchesToUse = domainMatches.length > 0 ? domainMatches : activeTournament.fixtures;
    return calculateTournamentReadiness(activeTournament, matchesToUse, {
      context: activeTournament.status === 'PUBLISHED' ? 'publish' : 'setup',
    });
  }, [activeTournament, domainMatches]);

  const updateMatchSchedule = async (matchId: string, schedule: MatchSchedule) => {
    if (!activeTournament) return;

    // Check lock state: LIVE or COMPLETED matches cannot be normally rescheduled
    const targetDomainMatch = domainMatches.find((m) => m.id === matchId);
    const targetLegacyMatch = activeTournament.fixtures.find((m) => m.id === matchId);

    const status = targetDomainMatch?.status || targetLegacyMatch?.status;
    if (status === 'LIVE' || status === 'HALFTIME') {
      throw new Error(`Match ${matchId} is currently LIVE. Match schedule is locked and cannot be edited.`);
    }
    if (status === 'COMPLETED' || status === 'BYE_ADVANCEMENT') {
      throw new Error(`Match ${matchId} is COMPLETED. Historical match schedule cannot be edited.`);
    }

    const validation = validateMatchSchedule(schedule);
    if (!validation.isValid) {
      throw new Error(`Invalid schedule: ${validation.errors.join(', ')}`);
    }

    // 1. Update normalized matches if present
    if (domainMatches.length > 0 && targetDomainMatch) {
      await MatchRepository.updateSchedule(activeTournament.id, matchId, schedule);
    }

    // 2. Update legacy fixtures on tournament document
    await updateTournamentDoc(activeTournament.id, (t) => {
      const idx = t.fixtures.findIndex((m) => m.id === matchId);
      if (idx === -1) return t;
      const cur = t.fixtures[idx];
      const scheduledAt = schedule.date && schedule.startTime ? `${schedule.date}T${schedule.startTime}` : cur.scheduledAt;
      const updated: Match = {
        ...cur,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        venueId: schedule.venueId,
        scheduledAt,
        schedule,
      };
      const newFixtures = [...t.fixtures];
      newFixtures[idx] = updated;
      return { ...t, fixtures: newFixtures };
    });
  };

  const addVenue = async (tournamentId: string, venueData: Omit<Venue, 'id'>) => {
    const newVenue: Venue = {
      ...venueData,
      id: `v-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      active: venueData.active !== undefined ? venueData.active : true,
      type: venueData.type || 'COURT',
      order: venueData.order ?? 0,
    };
    await updateTournamentDoc(tournamentId, (t) => ({
      ...t,
      venues: [...(t.venues || []), newVenue],
    }));
  };

  const updateVenue = async (tournamentId: string, venueId: string, data: Partial<Venue>) => {
    await updateTournamentDoc(tournamentId, (t) => ({
      ...t,
      venues: (t.venues || []).map((v) => (v.id === venueId ? { ...v, ...data } : v)),
    }));
  };

  const deleteVenue = async (tournamentId: string, venueId: string) => {
    await updateTournamentDoc(tournamentId, (t) => ({
      ...t,
      venues: (t.venues || []).filter((v) => v.id !== venueId),
    }));
  };

  const publishTournament = async (tournamentId: string) => {
    const t = tournamentsRef.current.find((x) => x.id === tournamentId) || activeTournament;
    if (!t) return { success: false, errors: ['Tournament not found'], warnings: [] };

    const matchesToUse = domainMatches.length > 0 ? domainMatches : t.fixtures;
    const readinessResult = calculateTournamentReadiness(t, matchesToUse, { context: 'publish' });

    if (!readinessResult.canPublish) {
      return {
        success: false,
        errors: readinessResult.errors,
        warnings: readinessResult.warnings,
      };
    }

    await updateTournamentDoc(tournamentId, (tour) => ({
      ...tour,
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    }));

    return {
      success: true,
      errors: [],
      warnings: readinessResult.warnings,
    };
  };

  const unpublishTournament = async (tournamentId: string) => {
    await updateTournamentDoc(tournamentId, (tour) => ({
      ...tour,
      status: 'DRAFT',
      visibility: 'PRIVATE',
    }));
  };

  return (
    <TournamentContext.Provider
      value={{
        tournaments,
        activeTournament,
        activeMatch,
        viewMode,
        organizerTab,
        toolsTab,
        publicSlug,
        setViewMode,
        setOrganizerTab,
        setToolsTab,
        setActiveTournamentId,
        setActiveMatchId,
        setPublicSlug,
        createTournament,
        deleteTournament,
        loadThrowballDemo,
        clearAllData,
        updateTournamentStatus,
        addTeamToTournament,
        updateTeamInTournament,
        removeTeamFromTournament,
        generateTournamentFixtures,
        recordMatchEvent,
        updateMatchScore,
        updateMatchSets,
        recordMatchSubstitution,
        recordMatchTimeout,
        completeMatch,
        lockTeamRoster,
        addBudgetItem,
        deleteBudgetItem,
        assignGroupPosition,
        isGroupLocked,
        saveMatchLineup,
        autoFillMatchLineup,
        updateMatchSchedule,
        addVenue,
        updateVenue,
        deleteVenue,
        publishTournament,
        unpublishTournament,
        readiness,
        scheduleConflicts,
        domainMatches,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
};
