import { collection, doc, setDoc, getDocs, onSnapshot, writeBatch, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { DomainMatch } from '../domain/tournament/models/types';

export class MatchRepository {
  /**
   * Retrieves all matches for a tournament using a single fetch.
   */
  static async getMatches(tournamentId: string): Promise<DomainMatch[]> {
    const matchesRef = collection(db, 'tournaments', tournamentId, 'matches');
    const snapshot = await getDocs(matchesRef);
    return snapshot.docs.map(doc => doc.data() as DomainMatch);
  }

  /**
   * Creates an array of matches (e.g. after generating a bracket).
   * Uses batched writes to ensure all matches are created atomically.
   */
  static async createMatches(tournamentId: string, matches: DomainMatch[]): Promise<void> {
    const batch = writeBatch(db);
    
    matches.forEach(match => {
      const matchRef = doc(db, 'tournaments', tournamentId, 'matches', match.id);
      batch.set(matchRef, match);
    });

    await batch.commit();
  }

  /**
   * Subscribes to realtime updates of all matches for a given tournament.
   * Ensures UI updates immediately when matches are processed.
   */
  static subscribeToMatches(tournamentId: string, callback: (matches: DomainMatch[]) => void): () => void {
    const matchesRef = collection(db, 'tournaments', tournamentId, 'matches');
    return onSnapshot(matchesRef, (snapshot) => {
      const matches = snapshot.docs.map(doc => doc.data() as DomainMatch);
      callback(matches);
    });
  }

  /**
   * Updates schedule information for a match without modifying fixture ID, fixture number,
   * participants, scores, lineups, or bracket progression.
   */
  static async updateSchedule(
    tournamentId: string,
    matchId: string,
    schedule: { date?: string; startTime?: string; endTime?: string; venueId?: string }
  ): Promise<void> {
    const matchRef = doc(db, 'tournaments', tournamentId, 'matches', matchId);
    const scheduledAt = schedule.date && schedule.startTime ? `${schedule.date}T${schedule.startTime}` : null;
    await updateDoc(matchRef, {
      date: schedule.date ?? null,
      startTime: schedule.startTime ?? null,
      endTime: schedule.endTime ?? null,
      venueId: schedule.venueId ?? null,
      scheduledAt: scheduledAt,
      schedule: {
        date: schedule.date ?? '',
        startTime: schedule.startTime ?? '',
        endTime: schedule.endTime ?? '',
        venueId: schedule.venueId ?? '',
      },
    });
  }

  /**
   * Completes a match using a Firestore transaction to prevent concurrent 
   * completion of the same match.
   */
  static async completeMatchTransaction(
    tournamentId: string,
    matchId: string,
    result: { scoreA: number, scoreB: number },
    rules: any,
    processResultFn: (allMatches: DomainMatch[], targetMatchId: string, result: any, rules: any) => { updatedMatches: DomainMatch[], errors: string[] }
  ): Promise<void> {
    const matchesRef = collection(db, 'tournaments', tournamentId, 'matches');
    
    // 1. Pre-fetch all matches outside the transaction to build the exact dependency chain
    const snapshot = await getDocs(matchesRef);
    const prefetchMatches = snapshot.docs.map(d => d.data() as DomainMatch);
    
    // Determine the minimal write-set by running the domain logic in memory first
    const { updatedMatches: prefetchUpdated } = processResultFn(prefetchMatches, matchId, result, rules);
    
    // Identify which matches actually need to be modified (the target match + downstream dependencies)
    const writeSetIds = prefetchUpdated
      .filter(newMatch => {
        const oldMatch = prefetchMatches.find(m => m.id === newMatch.id);
        return JSON.stringify(newMatch) !== JSON.stringify(oldMatch);
      })
      .map(m => m.id);

    // Always include the target match in the lock-set just in case
    if (!writeSetIds.includes(matchId)) {
      writeSetIds.push(matchId);
    }

    // 2. Execute the transaction reading ONLY the required documents
    await runTransaction(db, async (transaction: any) => {
      const lockSetMatches: DomainMatch[] = [];
      
      // Transactionally read only the affected documents
      for (const id of writeSetIds) {
        const docRef = doc(db, 'tournaments', tournamentId, 'matches', id);
        const docSnap = await transaction.get(docRef);
        if (docSnap.exists()) {
          lockSetMatches.push(docSnap.data() as DomainMatch);
        }
      }

      // Merge transactional reads with prefetch to form a complete graph for the domain engine
      const transactionalAllMatches = prefetchMatches.map(m => {
        const lockedMatch = lockSetMatches.find(locked => locked.id === m.id);
        return lockedMatch || m;
      });

      const targetMatch = transactionalAllMatches.find(m => m.id === matchId);
      if (!targetMatch) {
        throw new Error('Match not found.');
      }

      // Idempotency check inside transaction
      if (targetMatch.status === 'COMPLETED' || targetMatch.status === 'BYE_ADVANCEMENT') {
        throw new Error('Match is already completed.');
      }

      // 3. Re-run domain logic with locked data
      const { updatedMatches, errors } = processResultFn(transactionalAllMatches, matchId, result, rules);
      if (errors.length > 0) {
        throw new Error(`Domain validation failed: ${errors.join(', ')}`);
      }

      // 4. Write back only changed matches
      const changedMatches = updatedMatches.filter(newMatch => {
        const oldMatch = transactionalAllMatches.find(m => m.id === newMatch.id);
        return JSON.stringify(newMatch) !== JSON.stringify(oldMatch);
      });

      changedMatches.forEach(match => {
        const matchRef = doc(db, 'tournaments', tournamentId, 'matches', match.id);
        transaction.set(matchRef, match, { merge: true });
      });
    });
  }
}
