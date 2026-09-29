import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Tournament,
  Match,
  Team,
  BudgetItem,
  TournamentStatus,
  MatchEvent,
  AuditLog,
} from '../types';
import { INITIAL_VENUES, createThrowballDemoTournament } from '../services/mockData';
import { advanceWinnerInBracket, generateKnockoutFixtures, generateRoundRobinFixtures, generateGroupKnockoutFixtures } from '../engines/tournamentEngine';
import { soundEffects } from '../engines/audioEngine';
import confetti from 'canvas-confetti';

export type AppViewMode = 'organizer' | 'public' | 'tools';
export type OrganizerTab =
  | 'overview'
  | 'teams'
  | 'setup'
  | 'draw'
  | 'fixtures'
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
  removeTeamFromTournament: (tournamentId: string, teamId: string) => void;
  generateTournamentFixtures: (tournamentId: string) => void;
  recordMatchEvent: (matchId: string, event: Omit<MatchEvent, 'id' | 'timestamp'>) => void;
  updateMatchScore: (matchId: string, homeScore: number, awayScore: number, period?: string) => void;
  completeMatch: (matchId: string, winnerId: string) => void;
  addBudgetItem: (tournamentId: string, item: Omit<BudgetItem, 'id'>) => void;
  deleteBudgetItem: (tournamentId: string, itemId: string) => void;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const tournamentsRef = useRef<Tournament[]>([]);

  const [activeTournamentId, setActiveTournamentIdState] = useState<string>('');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<AppViewMode>('organizer');
  const [organizerTab, setOrganizerTab] = useState<OrganizerTab>('overview');
  const [toolsTab, setToolsTab] = useState<ToolsTab>('coin-toss');
  const [publicSlug, setPublicSlug] = useState<string | null>(null);

  useEffect(() => {
    tournamentsRef.current = tournaments;
  }, [tournaments]);

  // Sync with Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tournaments'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Tournament);
      setTournaments(data);
    });
    return () => unsubscribe();
  }, []);

  // Keep active tournament in sync
  useEffect(() => {
    if (tournaments.length > 0) {
      if (!activeTournamentId || !tournaments.some((t) => t.id === activeTournamentId)) {
        setActiveTournamentId(tournaments[0].id);
      }
    }
  }, [tournaments, activeTournamentId]);

  const activeTournament = tournaments.find((t) => t.id === activeTournamentId) || tournaments[0] || null;
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
      visibility: 'PUBLIC',
      venues: INITIAL_VENUES,
      teams: data.teams || [],
      groups: [],
      rules: data.rules || {
        winPoints: 2,
        drawPoints: 0,
        lossPoints: 0,
        matchDurationMinutes: 45,
        periodsCount: 3,
        tieBreakers: ['points', 'difference', 'scored'],
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
      localStorage.removeItem('sportiq_tournaments_v1');
      localStorage.removeItem('sportiq_tournaments_v2');
      localStorage.removeItem('sportiq_tournaments_v3');
      
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
      groupId: teamData.groupId,
      players: teamData.players || [],
    };

    updateTournamentDoc(tournamentId, (t) => {
      return {
        ...t,
        status: t.status === 'DRAFT' ? 'TEAMS_ADDED' : t.status,
        teams: [...t.teams, newTeam],
      };
    });
  };

  const removeTeamFromTournament = (tournamentId: string, teamId: string) => {
    updateTournamentDoc(tournamentId, (t) => {
      return {
        ...t,
        teams: t.teams.filter((item) => item.id !== teamId),
      };
    });
  };

  const generateTournamentFixtures = (tournamentId: string) => {
    updateTournamentDoc(tournamentId, (t) => {
      let generated: Match[] = [];
      if (t.format === 'KNOCKOUT') {
        generated = generateKnockoutFixtures(t.id, t.teams, t.startDate, t.venues[0]?.id);
      } else if (t.format === 'ROUND_ROBIN') {
        generated = generateRoundRobinFixtures(t.id, t.teams, t.startDate, t.venues[0]?.id);
      } else if (t.format === 'GROUP_KNOCKOUT') {
        generated = generateGroupKnockoutFixtures(t.id, t.teams, t.groups, t.startDate, t.venues[0]?.id);
      } else {
        generated = generateKnockoutFixtures(t.id, t.teams, t.startDate, t.venues[0]?.id);
      }

      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: 'FIXTURES_GENERATED',
        user: 'Tournament Engine',
        details: `Generated ${generated.length} fixtures for format ${t.format}`,
      };

      return {
        ...t,
        fixtures: generated,
        status: 'FIXTURES_GENERATED',
        auditLogs: [newLog, ...t.auditLogs],
      };
    });
    soundEffects.playCelebration();
  };

  const recordMatchEvent = (matchId: string, eventData: Omit<MatchEvent, 'id' | 'timestamp'>) => {
    const event: MatchEvent = {
      ...eventData,
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
    };

    const tIndex = tournamentsRef.current.findIndex(t => t.fixtures.some(m => m.id === matchId));
    if (tIndex === -1) return;
    const tournamentId = tournamentsRef.current[tIndex].id;

    updateTournamentDoc(tournamentId, (t) => {
      const matchIndex = t.fixtures.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return t;

      const currentMatch = t.fixtures[matchIndex];
      const isHome = currentMatch.homeTeamId === event.teamId;

      let newHomeScore = currentMatch.homeScore;
      let newAwayScore = currentMatch.awayScore;

      // Auto point increment based on event type
      if (
        event.eventType === 'GOAL' ||
        event.eventType === 'PENALTY_GOAL' ||
        event.eventType === 'POINT' ||
        event.eventType === 'TOUCH_POINT' ||
        event.eventType === 'SPIKE_KILL' ||
        event.eventType === 'ACE' ||
        event.eventType === 'ACE_SERVICE' ||
        event.eventType === 'JUMP_THROW' ||
        event.eventType === 'TOUCH_OUT' ||
        event.eventType === 'SMASH_WINNER'
      ) {
        if (isHome) newHomeScore += 1;
        else newAwayScore += 1;
      } else if (
        event.eventType === 'CATCH_DROP' ||
        event.eventType === 'DOUBLE_TOUCH' ||
        event.eventType === 'NET_TOUCH' ||
        event.eventType === 'UNFORCED_ERROR' ||
        event.eventType === 'OPPONENT_ERROR'
      ) {
        if (isHome) newAwayScore += 1;
        else newHomeScore += 1;
      } else if (event.eventType === 'SINGLE' || event.eventType === 'WIDE' || event.eventType === 'NO_BALL') {
        if (isHome) newHomeScore += 1;
        else newAwayScore += 1;
      } else if (event.eventType === 'TWO_POINTER' || event.eventType === 'DOUBLE' || event.eventType === 'SUPER_TACKLE') {
        if (isHome) newHomeScore += 2;
        else newAwayScore += 2;
      } else if (event.eventType === 'THREE_POINTER' || event.eventType === 'SUPER_RAID') {
        if (isHome) newHomeScore += 3;
        else newAwayScore += 3;
      } else if (event.eventType === 'FOUR') {
        if (isHome) newHomeScore += 4;
        else newAwayScore += 4;
      } else if (event.eventType === 'SIX') {
        if (isHome) newHomeScore += 6;
        else newAwayScore += 6;
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

    // Audio cue
    if (['GOAL', 'SIX', 'FOUR', 'SUPER_RAID', 'THREE_POINTER', 'JUMP_THROW', 'ACE_SERVICE'].includes(eventData.eventType)) {
      soundEffects.playCelebration();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    } else {
      soundEffects.playWhistle();
    }
  };

  const updateMatchScore = (matchId: string, homeScore: number, awayScore: number, period?: string) => {
    const tIndex = tournamentsRef.current.findIndex(t => t.fixtures.some(m => m.id === matchId));
    if (tIndex === -1) return;
    const tournamentId = tournamentsRef.current[tIndex].id;

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

  const completeMatch = (matchId: string, winnerId: string) => {
    const tIndex = tournamentsRef.current.findIndex(t => t.fixtures.some(m => m.id === matchId));
    if (tIndex === -1) return;
    const tournamentId = tournamentsRef.current[tIndex].id;

    updateTournamentDoc(tournamentId, (t) => {
      const matchIndex = t.fixtures.findIndex((m) => m.id === matchId);
      if (matchIndex === -1) return t;

      const currentMatch = t.fixtures[matchIndex];
      const completedMatch: Match = {
        ...currentMatch,
        status: 'COMPLETED',
        winnerId,
        score: {
          ...currentMatch.score,
          period: 'Full Time',
        },
      };

      let newFixtures = [...t.fixtures];
      newFixtures[matchIndex] = completedMatch;

      // Auto-advance winner in bracket tree
      if (completedMatch.nextMatchId) {
        newFixtures = advanceWinnerInBracket(newFixtures, completedMatch.id, winnerId);
      }

      const winnerTeam = t.teams.find((tm) => tm.id === winnerId);
      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: 'MATCH_COMPLETED',
        user: 'Official Scorer',
        details: `Match ${currentMatch.roundName} finished. Winner: ${winnerTeam?.name || winnerId}`,
      };

      return {
        ...t,
        fixtures: newFixtures,
        auditLogs: [newLog, ...t.auditLogs],
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
        removeTeamFromTournament,
        generateTournamentFixtures,
        recordMatchEvent,
        updateMatchScore,
        completeMatch,
        addBudgetItem,
        deleteBudgetItem,
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
