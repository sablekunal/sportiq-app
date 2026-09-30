import React, { useState, useEffect } from 'react';
import { Tournament, Match } from '../../types';
import { SPORT_CONFIGS } from '../../engines/sportEngine';
import { calculateSportStandings } from '../../engines/sportEngine';
import {
  Trophy,
  Clock,
  Maximize2,
  Minimize2,
  X,
  Radio,
  MapPin,
  Calendar,
  Sparkles,
  ChevronRight,
  Shield,
} from 'lucide-react';

interface StadiumBigScreenProps {
  tournament: Tournament;
  onExit: () => void;
}

export const StadiumBigScreenView: React.FC<StadiumBigScreenProps> = ({
  tournament,
  onExit,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);

  const sportConfig = SPORT_CONFIGS[tournament.sport] || SPORT_CONFIGS.football;
  const teams = tournament.teams;
  const fixtures = tournament.fixtures;
  const liveMatches = fixtures.filter((m) => m.status === 'LIVE');
  const standings = calculateSportStandings(tournament.sport, teams, fixtures);
  const upcomingMatches = fixtures.filter((m) => m.status === 'UPCOMING');
  const completedMatches = fixtures.filter((m) => m.status === 'COMPLETED');

  // Clock ticker for stadium display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through multiple live matches if available
  useEffect(() => {
    if (liveMatches.length <= 1) return;
    const interval = setInterval(() => {
      setSelectedMatchIndex((prev) => (prev + 1) % liveMatches.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [liveMatches.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const activeLiveMatch =
    liveMatches.length > 0
      ? liveMatches[selectedMatchIndex % liveMatches.length]
      : upcomingMatches[0] || completedMatches[completedMatches.length - 1];

  const homeTeam = teams.find((t) => t.id === activeLiveMatch?.homeTeamId);
  const awayTeam = teams.find((t) => t.id === activeLiveMatch?.awayTeamId);

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between selection:bg-sport-orange selection:text-white p-4 sm:p-6 lg:p-8 3xl:p-12 overflow-x-hidden">
      {/* Stadium Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-2xl shadow-glow-orange shrink-0">
            {sportConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-sport-orange uppercase">
                STADIUM ARENA DISPLAY
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                LIVE BROADCAST
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl 3xl:text-4xl font-black tracking-tight text-white">
              {tournament.name}
            </h1>
            <p className="text-xs 3xl:text-sm text-slate-400 flex items-center gap-3 mt-0.5">
              <span>📍 {tournament.location}</span>
              <span>•</span>
              <span className="capitalize">{sportConfig.displayName} Championship</span>
            </p>
          </div>
        </div>

        {/* Live Clock & Action Controls */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-2xl text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3 text-sport-orange" />
              Arena Time
            </div>
            <div className="text-lg sm:text-xl font-mono font-black text-amber-300 tracking-wider">
              {currentTime}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={onExit}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-red-500/20 text-slate-200 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Standard View</span>
          </button>
        </div>
      </header>

      {/* Main Stadium Scoreboard Centerpiece */}
      <main className="my-6 space-y-6 flex-1 flex flex-col justify-center">
        {activeLiveMatch ? (
          <div className="bg-gradient-to-br from-slate-900/90 via-sport-midnight to-slate-950 p-6 sm:p-8 lg:p-10 3xl:p-14 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-sport-orange/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Match Header Badge */}
            <div className="flex items-center justify-between text-xs sm:text-sm font-black uppercase tracking-wider text-slate-400 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <span className="text-red-400 font-bold">
                  {activeLiveMatch.status === 'LIVE' ? 'FEATURED MATCH IN PROGRESS' : 'SPOTLIGHT MATCH'}
                </span>
              </div>
              <div className="px-3 py-1 rounded-full bg-slate-800 text-sport-orange border border-slate-700">
                {activeLiveMatch.roundName}
              </div>
            </div>

            {/* Stadium Score Arena */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-10">
              {/* Home Team */}
              <div className="flex flex-col items-center md:items-end text-center md:text-right">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 3xl:w-28 3xl:h-28 rounded-3xl flex items-center justify-center font-black text-2xl sm:text-3xl 3xl:text-4xl text-white shadow-xl mb-3"
                  style={{ backgroundColor: homeTeam?.color || '#f97316' }}
                >
                  {homeTeam?.shortName || 'HOM'}
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl 3xl:text-5xl font-black text-white tracking-tight">
                  {homeTeam?.name || 'Home Team'}
                </h2>
                <div className="text-xs sm:text-sm text-slate-400 font-semibold mt-1">
                  Seed #{homeTeam?.seed || 'Unseeded'}
                </div>
              </div>

              {/* Massive Score Numerals */}
              <div className="flex flex-col items-center px-6 py-4 rounded-3xl bg-slate-950/80 border border-slate-800 shadow-inner">
                <div className="flex items-center gap-4 sm:gap-6 font-mono font-black text-5xl sm:text-7xl lg:text-8xl 3xl:text-9xl text-amber-300 drop-shadow">
                  <span>{activeLiveMatch.homeScore}</span>
                  <span className="text-slate-600">:</span>
                  <span>{activeLiveMatch.awayScore}</span>
                </div>
                <div className="mt-2 px-4 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs sm:text-sm font-bold uppercase tracking-wider animate-pulse">
                  {activeLiveMatch.score.period || activeLiveMatch.status}
                </div>
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 3xl:w-28 3xl:h-28 rounded-3xl flex items-center justify-center font-black text-2xl sm:text-3xl 3xl:text-4xl text-white shadow-xl mb-3"
                  style={{ backgroundColor: awayTeam?.color || '#3b82f6' }}
                >
                  {awayTeam?.shortName || 'AWY'}
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl 3xl:text-5xl font-black text-white tracking-tight">
                  {awayTeam?.name || 'Away Team'}
                </h2>
                <div className="text-xs sm:text-sm text-slate-400 font-semibold mt-1">
                  Seed #{awayTeam?.seed || 'Unseeded'}
                </div>
              </div>
            </div>

            {/* Recent Match Events Ticker */}
            {activeLiveMatch.events.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Latest Highlights:
                </span>
                {activeLiveMatch.events.slice(-3).map((evt) => (
                  <span
                    key={evt.id}
                    className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-center gap-1.5"
                  >
                    <span className="font-mono font-bold text-sport-orange">{evt.minute}'</span>
                    <span className="font-bold text-white">{evt.playerName}</span>
                    <span className="text-slate-400">({evt.description})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/60 p-12 rounded-3xl border border-slate-800 text-center">
            <Trophy className="w-16 h-16 text-sport-orange mx-auto mb-3" />
            <h3 className="text-2xl font-black text-white">All Fixtures Concluded</h3>
            <p className="text-sm text-slate-400 mt-1">
              Check the official standings and championship leaderboard below.
            </p>
          </div>
        )}

        {/* Stadium Dual-Deck: Standings & Upcoming Matches */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deck 1: Live Leaderboard Top Standings */}
          <div className="bg-slate-900/70 p-5 3xl:p-8 rounded-3xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base 3xl:text-xl font-black text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-sport-orange" />
                Tournament Standings Leaderboard
              </h3>
              <span className="text-xs font-bold text-slate-400">
                Sorted by Points & Difference
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs 3xl:text-sm">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-black text-[10px] 3xl:text-xs tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-2 text-center">P</th>
                    <th className="py-2.5 px-2 text-center">W</th>
                    <th className="py-2.5 px-2 text-center">L</th>
                    <th className="py-2.5 px-2 text-center">Diff</th>
                    <th className="py-2.5 px-3 text-center text-sport-orange font-black">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold">
                  {standings.slice(0, 6).map((st, idx) => (
                    <tr key={st.teamId} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white truncate max-w-[180px]">
                        {st.teamName}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">{st.played}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-emerald-400 font-bold">{st.won}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-rose-400">{st.lost}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">{st.difference}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-amber-300 text-sm 3xl:text-base">
                        {st.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deck 2: Next Up Arena Fixtures */}
          <div className="bg-slate-900/70 p-5 3xl:p-8 rounded-3xl border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base 3xl:text-xl font-black text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sport-orange" />
                Next Matches On Deck
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {fixtures.length} Total Fixtures
              </span>
            </div>

            <div className="space-y-3">
              {(upcomingMatches.length > 0 ? upcomingMatches.slice(0, 4) : completedMatches.slice(-4)).map(
                (m) => {
                  const h = teams.find((t) => t.id === m.homeTeamId);
                  const a = teams.find((t) => t.id === m.awayTeamId);

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs 3xl:text-sm font-bold"
                    >
                      <span className="text-slate-400 text-[11px] w-28 truncate">{m.roundName}</span>
                      <div className="flex items-center gap-3 flex-1 justify-center">
                        <span className="text-white truncate">{h?.name || 'TBD'}</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-sport-orange font-mono font-black">
                          {m.status === 'COMPLETED' ? `${m.homeScore} : ${m.awayScore}` : 'VS'}
                        </span>
                        <span className="text-white truncate">{a?.name || 'TBD'}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          m.status === 'LIVE'
                            ? 'bg-red-500 text-white animate-pulse'
                            : m.status === 'COMPLETED'
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Stadium Bottom Ticker */}
      <footer className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-sport-orange" />
          <span className="text-slate-400 font-bold">SportIQ Stadium Engine</span>
          <span>•</span>
          <span>Dynamic Multi-Device Presentation Mode</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 font-semibold">
          <span>{teams.length} Teams Registered</span>
          <span>•</span>
          <span>{tournament.venues.map((v) => v.name).join(', ') || 'Main Arena'}</span>
        </div>
      </footer>
    </div>
  );
};
