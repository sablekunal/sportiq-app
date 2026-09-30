import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
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

import { MatchRepository } from '../repositories/matchRepository';
import { DomainMatch, MatchResult, TournamentRules } from '../domain/tournament/models/types';
import { generateKnockout } from '../domain/tournament/fixtures/knockout';
import { processMatchResult } from '../domain/tournament/results/processResult';
import { adaptDomainMatchToLegacy } from '../services/matchAdapter';

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
  completeMatch: (matchId: string, result: { scoreA: number, scoreB: number }) => void;
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

  // New state for normalized domain matches
  const [domainMatches, setDomainMatches] = useState<DomainMatch[]>([]);

  useEffect(() => {
    tournamentsRef.current = tournaments;
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
      return { ...t, fixtures: domainMatches.map(adaptDomainMatchToLegacy) };
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

  const removeTeamFromTournament = (tournamentId: string, teamId: string) => {
    updateTournamentDoc(tournamentId, (t) => {
      return {
        ...t,
        teams: t.teams.filter((item) => item.id !== teamId),
      };
    });
  };

  const generateTournamentFixtures = async (tournamentId: string) => {
    const t = tournamentsRef.current.find(x => x.id === tournamentId);
    if (!t) return;

    let generatedLegacy: Match[] = [];

    if (t.format === 'KNOCKOUT') {
      // NEW DOMAIN ENGINE PATH
      const generatedDomain = generateKnockout(t.id, 'playoffs', t.teams.map(team => team.id));
      await MatchRepository.createMatches(t.id, generatedDomain);
      
      updateTournamentDoc(tournamentId, (tour) => {
        const newLog: AuditLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'FIXTURES_GENERATED',
          user: 'Tournament Engine',
          details: `Generated ${generatedDomain.length} domain matches for format ${tour.format}`,
        };
        // We no longer write to tour.fixtures for Knockout! The subcollection handles it.
        return {
          ...tour,
          status: 'FIXTURES_GENERATED',
          auditLogs: [newLog, ...tour.auditLogs],
        };
      });
      soundEffects.playCelebration();
      return; // Exit early, handled by subcollection
    } else if (t.format === 'ROUND_ROBIN') {
      generatedLegacy = generateRoundRobinFixtures(t.id, t.teams, t.startDate, t.venues[0]?.id);
    } else if (t.format === 'GROUP_KNOCKOUT') {
      generatedLegacy = generateGroupKnockoutFixtures(t.id, t.teams, t.groups, t.startDate, t.venues[0]?.id);
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

  const completeMatch = async (matchId: string, result: { scoreA: number, scoreB: number }) => {
    if (!activeTournament) return;
    const tournamentId = activeTournament.id;

    // Is it a normalized DomainMatch?
    const isDomainMatch = domainMatches.some(m => m.id === matchId);

    if (isDomainMatch) {
      const domainRules: TournamentRules = { allowDraws: false };
      
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
