import React, { useState, useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { useAuth } from '../../auth/AuthContext';
import { useDevice } from '../../hooks/useDevice';
import { SPORT_CONFIGS, calculateSportStandings } from '../../engines/sportEngine';
import { calculateAllFourGroupStandings } from '../../domain/tournament/results/throwballStandings';
import { Match } from '../../types';
import {
  Trophy,
  Calendar,
  BarChart3,
  GitBranch,
  Users,
  MapPin,
  Clock,
  Radio,
  Share2,
  Copy,
  Check,
  QrCode,
  X,
  ChevronRight,
  Shield,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getNextScheduledMatch } from '../../domain/tournament/operations/scheduleManager';

type PublicTab = 'overview' | 'fixtures' | 'standings' | 'bracket' | 'teams' | 'draw';

export const PublicTournamentPortal: React.FC = () => {
  const { activeTournament, setViewMode, tournaments, setActiveTournamentId } = useTournament();
  const { isAuthenticated, profile } = useAuth();
  const device = useDevice();
  const [activeTab, setActiveTab] = useState<PublicTab>('overview');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [standingsView, setStandingsView] = useState<'table' | 'cards'>('table');
  const [matchModalTab, setMatchModalTab] = useState<'commentary' | 'lineups'>('commentary');
  const [publicStageFilter, setPublicStageFilter] = useState<'ALL' | 'A' | 'B' | 'C' | 'D' | 'KNOCKOUT'>('ALL');
  const [standingsGroupFilter, setStandingsGroupFilter] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');

  const venueMap = React.useMemo(
    () => new Map((activeTournament?.venues || []).map((v) => [v.id, v])),
    [activeTournament?.venues]
  );

  const nextMatch = React.useMemo(() => {
    if (!activeTournament?.fixtures || activeTournament.fixtures.length === 0) return null;
    return getNextScheduledMatch(activeTournament.fixtures) as Match | null;
  }, [activeTournament?.fixtures]);

  const sportConfig = SPORT_CONFIGS[activeTournament?.sport || 'football'] || SPORT_CONFIGS.football;
  const teams = activeTournament?.teams || [];
  const fixtures = activeTournament?.fixtures || [];
  const liveMatches = fixtures.filter((m) => m.status === 'LIVE');
  const fourGroupStandings = useMemo(() => {
    return calculateAllFourGroupStandings(fixtures, teams);
  }, [fixtures, teams]);
  const standings = calculateSportStandings(
    activeTournament?.sport || 'football',
    teams,
    fixtures,
    standingsGroupFilter === 'ALL' ? undefined : standingsGroupFilter
  );

  if (!activeTournament) {
    return (
      <div className="min-h-screen bg-sport-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 text-sport-orange flex items-center justify-center text-3xl mb-4">
          🏆
        </div>
        <h3 className="text-xl font-bold text-sport-navy">No Public Tournament Published Yet</h3>
        <p className="text-xs text-slate-500 mt-2 max-w-sm mb-6">
          Create or select a tournament in the Organizer Command Hub to publish live brackets and scores for spectators.
        </p>
        <button
          onClick={() => setViewMode('organizer')}
          className="px-6 py-2.5 bg-sport-orange text-white text-xs font-bold rounded-xl shadow-glow-orange cursor-pointer"
        >
          Open Organizer Hub →
        </button>
      </div>
    );
  }

  const publicUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-sport-surface pb-safe pb-16">
      {/* Spectator Top Header */}
      <div className="bg-sport-midnight border-b border-slate-800 text-white px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[2200px] mx-auto flex items-center justify-between gap-2">
          {/* Brand & Tournament Switcher */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-sport-orange text-white text-xs shrink-0">
              {sportConfig.icon}
            </span>
            <div className="min-w-0">
              <div className="text-[9px] xs:text-[10px] font-bold uppercase tracking-wider text-sport-orange truncate">
                Spectator Fan Hub
              </div>
              {tournaments.length > 1 ? (
                <div className="relative">
                  <select
                    value={activeTournament.id}
                    onChange={(e) => setActiveTournamentId(e.target.value)}
                    className="bg-transparent text-xs sm:text-sm font-extrabold text-white outline-none cursor-pointer pr-4 appearance-none max-w-[130px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm truncate"
                  >
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 text-[9px]">▼</span>
                </div>
              ) : (
                <div className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm">
                  {activeTournament.name}
                </div>
              )}
            </div>
          </div>

          {/* Action Bar: Responsive on small phones, tablets, laptops, big displays */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* QR Code */}
            <button
              onClick={() => setShowQRModal(true)}
              title="Show QR Code"
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-sport-orange" />
              <span className="hidden sm:inline">QR</span>
            </button>

            {/* Share */}
            <button
              onClick={handleCopyLink}
              title="Share Tournament Link"
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>

            {/* Organizer Access Guard / Link */}
            <button
              onClick={() => setViewMode('organizer')}
              title={isAuthenticated ? 'Organizer Command Hub' : 'Organizer Login'}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-sport-orange hover:bg-orange-600 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isAuthenticated
                  ? (device.isSmallMobile ? 'Hub' : 'Organizer Hub →')
                  : (device.isSmallMobile ? 'Login' : 'Organizer Login')}
              </span>
            </button>
          </div>
        </div>
      </div>
      {/* Draft Mode Notice Banner */}
      {activeTournament.status === 'DRAFT' && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-200 px-4 py-2.5 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>Draft Mode — This tournament schedule has not been officially published yet by the organizer.</span>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-sport-navy via-slate-900 to-sport-midnight text-white pt-6 sm:pt-8 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[2200px] mx-auto relative z-10 text-center sm:text-left flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-sport-orange text-white uppercase tracking-wider">
                {activeTournament.sport} Championship
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                {activeTournament.format.replace('_', ' ')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-500/30">
                ● Live Broadcast
              </span>
            </div>

            <h1 className="text-2xl xs:text-3xl sm:text-4xl 2xl:text-5xl 3xl:text-6xl font-black tracking-tight">
              {activeTournament.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sport-orange" />
                {activeTournament.location}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sport-orange" />
                {activeTournament.startDate} to {activeTournament.endDate}
              </span>
            </p>
          </div>

          {/* Tournament Trophy Badge */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-glow-orange mx-auto sm:mx-0 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-sport-midnight rounded-[22px] flex items-center justify-center text-3xl sm:text-4xl">
              🏆
            </div>
          </div>
        </div>
      </div>

      {/* Live Match Broadcast Banner or Next Match Section */}
      {liveMatches.length > 0 ? (
        <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[2200px] mx-auto -mt-6 px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-red-400">
            <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                <span>MATCHDAY LIVE NOW</span>
              </div>
              <div className="flex items-center gap-3">
                {(() => {
                  const lm = liveMatches[0];
                  const setsWonA = lm.homeScore || 0;
                  const setsWonB = lm.awayScore || 0;
                  return (
                    <span className="bg-black/20 px-2.5 py-1 rounded-md text-[10px] text-amber-300 tracking-widest border border-white/10 shadow-sm">
                      SETS: {setsWonA} - {setsWonB}
                    </span>
                  );
                })()}
                <span>{liveMatches[0].roundName}</span>
              </div>
            </div>

            {(() => {
              const lm = liveMatches[0];
              const h = teams.find((t) => t.id === lm.homeTeamId);
              const a = teams.find((t) => t.id === lm.awayTeamId);
              const court = lm.schedule?.venueId || lm.venueId ? venueMap.get(lm.schedule?.venueId || lm.venueId!) : null;

              const currentSets = lm.sets || [];
              const activeSet = currentSets.find((s) => s.status === 'LIVE') || currentSets[currentSets.length - 1] || { setNumber: 1, scoreA: 0, scoreB: 0 };

              return (
                <div
                  onClick={() => setSelectedMatch(lm)}
                  className="bg-black/30 backdrop-blur-md p-3 sm:p-4 rounded-xl flex items-center justify-between gap-2 sm:gap-4 cursor-pointer hover:bg-black/40 transition"
                >
                  <div className="flex-1 text-right font-black text-sm xs:text-base sm:text-xl truncate">
                    {h?.name || 'TBD'}
                  </div>

                  <div className="px-3 xs:px-5 py-1.5 rounded-xl bg-sport-midnight border border-white/20 text-center font-mono font-black text-xl xs:text-2xl sm:text-3xl text-yellow-300 shadow-inner shrink-0">
                    {activeSet.scoreA} : {activeSet.scoreB}
                    <div className="text-[9px] xs:text-[10px] font-sans font-bold text-red-200 uppercase tracking-wider">
                      {court ? `${court.name} • ` : ''}SET {activeSet.setNumber}
                    </div>
                  </div>

                  <div className="flex-1 text-left font-black text-sm xs:text-base sm:text-xl truncate">
                    {a?.name || 'TBD'}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : nextMatch ? (
        <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[2200px] mx-auto -mt-6 px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="bg-gradient-to-r from-slate-900 via-sport-navy to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-700/80">
            <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-slate-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sport-orange" />
                <span className="text-sport-orange font-black">NEXT MATCH</span>
              </div>
              <span className="font-mono text-slate-400">
                {nextMatch.matchCode || `#${nextMatch.fixtureNumber ?? nextMatch.position}`} • {nextMatch.roundName}
              </span>
            </div>

            {(() => {
              const h = teams.find((t) => t.id === nextMatch.homeTeamId);
              const a = teams.find((t) => t.id === nextMatch.awayTeamId);
              const court = nextMatch.schedule?.venueId || nextMatch.venueId ? venueMap.get(nextMatch.schedule?.venueId || nextMatch.venueId!) : null;
              const date = nextMatch.schedule?.date || nextMatch.date;
              const time = nextMatch.schedule?.startTime || nextMatch.startTime;
              const endTime = nextMatch.schedule?.endTime || nextMatch.endTime;

              return (
                <div
                  onClick={() => setSelectedMatch(nextMatch)}
                  className="bg-white/5 backdrop-blur-md p-3 sm:p-4 rounded-xl flex items-center justify-between gap-2 sm:gap-4 cursor-pointer hover:bg-white/10 transition border border-white/10"
                >
                  <div className="flex-1 text-right font-black text-sm xs:text-base sm:text-lg truncate">
                    {h?.name || nextMatch.homePlaceholder || 'TBD'}
                  </div>

                  <div className="px-4 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-center shrink-0">
                    <div className="text-xs font-mono font-bold text-amber-400">
                      {time ? `${time}${endTime ? ` – ${endTime}` : ''}` : 'Scheduled Soon'}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      {court ? court.name : (date || 'Upcoming')}
                    </div>
                  </div>

                  <div className="flex-1 text-left font-black text-sm xs:text-base sm:text-lg truncate">
                    {a?.name || nextMatch.awayPlaceholder || 'TBD'}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}

      {/* Public Tab Navigation Bar */}
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar touch-scroll">
          {[
            { id: 'overview' as PublicTab, label: 'Overview', icon: <Trophy className="w-4 h-4" /> },
            { id: 'fixtures' as PublicTab, label: 'Fixtures & Scores', icon: <Calendar className="w-4 h-4" /> },
            { id: 'standings' as PublicTab, label: 'Standings', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'bracket' as PublicTab, label: 'Bracket', icon: <GitBranch className="w-4 h-4" /> },
            { id: 'teams' as PublicTab, label: 'Teams & Rosters', icon: <Users className="w-4 h-4" /> },
            ...(activeTournament.format === 'GROUP_KNOCKOUT' ? [{ id: 'draw' as PublicTab, label: 'Draw Results', icon: <Radio className="w-4 h-4" /> }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-sport-navy text-white shadow-md'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[2200px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* 1. Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* About Tournament */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-sport-navy mb-2">About This Tournament</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeTournament.description ||
                    'Welcome to the official public spectator tournament portal. Follow live matches, browse current standings, and inspect the tournament knockout bracket.'}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Sport</span>
                    <span className="font-bold text-sport-navy capitalize">
                      {sportConfig.displayName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Format</span>
                    <span className="font-bold text-sport-navy">
                      {activeTournament.format.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Participating Teams
                    </span>
                    <span className="font-bold text-sport-navy">{teams.length} Teams</span>
                  </div>
                </div>
              </div>

              {/* Recent Results Preview */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-sport-navy">Recent Matches & Results</h3>
                  <button
                    onClick={() => setActiveTab('fixtures')}
                    className="text-xs font-bold text-sport-orange hover:underline cursor-pointer"
                  >
                    View All →
                  </button>
                </div>

                <div className="space-y-3">
                  {fixtures.slice(0, 4).map((m) => {
                    const h = teams.find((t) => t.id === m.homeTeamId);
                    const a = teams.find((t) => t.id === m.awayTeamId);

                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMatch(m)}
                        className="p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition flex items-center justify-between gap-3 cursor-pointer text-xs"
                      >
                        <span className="text-slate-400 font-medium text-[11px] w-24 truncate">
                          {m.roundName}
                        </span>

                        <div className="flex-1 flex flex-col items-center justify-center font-bold text-sport-navy">
                          <div className="flex items-center justify-center gap-3">
                            <span className="truncate">{h?.name || 'TBD'}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-black text-sport-orange">
                              {m.homeScore} : {m.awayScore}
                            </span>
                            <span className="truncate">{a?.name || 'TBD'}</span>
                          </div>
                          {m.sets && m.sets.length > 0 && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex flex-wrap items-center justify-center gap-1.5">
                              {m.sets.map((s) => (
                                <span key={s.setNumber} className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-700">
                                  S{s.setNumber}: {s.scoreA}–{s.scoreB}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            m.status === 'LIVE'
                              ? 'bg-red-500 text-white animate-pulse'
                              : m.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Venue and Quick Standings Preview */}
            <div className="space-y-6">
              {/* Venue Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sport-orange" />
                  Official Venues
                </h4>

                <div className="space-y-3">
                  {activeTournament.venues.map((venue) => (
                    <div key={venue.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="font-bold text-sport-navy">{venue.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{venue.location}</div>
                      {venue.capacity && (
                        <div className="text-[10px] text-sport-orange font-medium mt-1">
                          Capacity: {venue.capacity.toLocaleString()} spectators
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Group Leaders Preview (Groups A, B, C, D) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Group Leaders (Qualifiers)
                  </h4>
                  <button
                    onClick={() => setActiveTab('standings')}
                    className="text-xs text-sport-orange font-bold hover:underline cursor-pointer"
                  >
                    Full Standings →
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {(['A', 'B', 'C', 'D'] as const).map((grpKey) => {
                    const leader = fourGroupStandings[grpKey]?.[0];
                    if (!leader) return null;
                    return (
                      <div
                        key={grpKey}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center gap-2 font-bold text-sport-navy">
                          <span className="w-5 h-5 rounded-md bg-sport-navy text-white text-[10px] font-black flex items-center justify-center">
                            {grpKey}
                          </span>
                          <span className="truncate max-w-[130px]">{leader.teamName}</span>
                          {leader.played > 0 && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-extrabold">
                              Q
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-black text-sport-orange text-xs">
                          {leader.won}W • {leader.points} PTS
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Fixtures Tab */}
        {activeTab === 'fixtures' && (() => {
          // Strict canonical sorting by fixtureNumber so spectators see identical order
          const sortedFixtures = [...fixtures].sort(
            (a, b) => (a.fixtureNumber ?? a.position) - (b.fixtureNumber ?? b.position)
          );

          const displayedFixtures = sortedFixtures.filter((m) => {
            if (publicStageFilter === 'ALL') return true;
            if (publicStageFilter === 'KNOCKOUT') return m.stage === 'KNOCKOUT' || m.stage === 'FINAL' || !m.groupId;
            return m.groupId === publicStageFilter;
          });

          return (
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-sport-navy">Competition Fixtures & Results</h3>
                  <p className="text-xs text-slate-500">Official tournament competition sequence ({fixtures.length} Matches)</p>
                </div>

                {/* Stage Filters */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {(
                    [
                      { id: 'ALL', label: 'All' },
                      { id: 'A', label: 'Group A' },
                      { id: 'B', label: 'Group B' },
                      { id: 'C', label: 'Group C' },
                      { id: 'D', label: 'Group D' },
                      { id: 'KNOCKOUT', label: 'Playoffs' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setPublicStageFilter(st.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        publicStageFilter === st.id
                          ? 'bg-sport-navy text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {displayedFixtures.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No matches found for the selected stage.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayedFixtures.map((m) => {
                    const h = teams.find((t) => t.id === m.homeTeamId);
                    const a = teams.find((t) => t.id === m.awayTeamId);
                    const homeName = h?.name || m.homePlaceholder || 'TBD';
                    const awayName = a?.name || m.awayPlaceholder || 'TBD';
                    const court = m.schedule?.venueId || m.venueId ? venueMap.get(m.schedule?.venueId || m.venueId!) : null;
                    const date = m.schedule?.date || m.date;
                    const time = m.schedule?.startTime || m.startTime;
                    const endTime = m.schedule?.endTime || m.endTime;

                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMatch(m)}
                        className="p-4 rounded-xl border border-slate-200 hover:border-sport-orange transition cursor-pointer shadow-sm hover:shadow"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                          <div className="flex items-center gap-1.5">
                            {m.matchCode && (
                              <span className="font-mono font-black px-1.5 py-0.5 rounded bg-orange-100 text-sport-orange text-[10px]">
                                {m.matchCode}
                              </span>
                            )}
                            {m.fixtureNumber && (
                              <span className="font-mono text-slate-400 font-bold text-[10px]">
                                #{m.fixtureNumber}
                              </span>
                            )}
                            <span className="font-semibold text-slate-700 truncate">{m.roundName}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === 'LIVE'
                                ? 'bg-red-500 text-white animate-pulse'
                                : m.status === 'COMPLETED'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {m.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-2 text-xs font-bold text-sport-navy gap-2">
                          <span className="truncate flex-1">{homeName}</span>
                          <span className="px-3 py-1 rounded-lg bg-slate-100 font-mono font-black text-sport-orange text-sm shrink-0">
                            {m.homeScore} : {m.awayScore}
                          </span>
                          <span className="truncate flex-1 text-right">{awayName}</span>
                        </div>

                        {/* Set-by-Set scores */}
                        {m.sets && m.sets.length > 0 && (
                          <div className="flex flex-wrap items-center justify-center gap-1.5 pb-2">
                            {m.sets.map((s) => (
                              <span
                                key={s.setNumber}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200/60"
                              >
                                Set {s.setNumber}: {s.scoreA}–{s.scoreB}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Court & Schedule details */}
                        <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] flex items-center justify-between text-slate-500">
                          <div className="flex items-center gap-2">
                            {court && (
                              <span className="inline-flex items-center gap-1 font-bold text-sport-orange">
                                <MapPin className="w-3 h-3" />
                                {court.name}
                              </span>
                            )}
                            {(date || time) && (
                              <span className="font-mono text-slate-600">
                                {date ? `${date} ` : ''}{time ? `${time}${endTime ? `–${endTime}` : ''}` : ''}
                              </span>
                            )}
                            {!court && !date && !time && (
                              <span className="text-slate-400 italic">Schedule TBD</span>
                            )}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-sport-orange" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* 3. Standings Tab */}
        {activeTab === 'standings' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-sport-navy">Official Tournament Standings</h3>
                <p className="text-xs text-slate-500">
                  Derived from match set results • Deterministic tie-break hierarchy (W → SD → PD → PF → H2H)
                </p>
              </div>

              {/* Group Selector and View Switcher */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                  {(
                    [
                      { id: 'ALL', label: 'All 4 Groups' },
                      { id: 'A', label: 'Group A' },
                      { id: 'B', label: 'Group B' },
                      { id: 'C', label: 'Group C' },
                      { id: 'D', label: 'Group D' },
                    ] as const
                  ).map((grp) => (
                    <button
                      key={grp.id}
                      onClick={() => setStandingsGroupFilter(grp.id)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        standingsGroupFilter === grp.id
                          ? 'bg-sport-navy text-white shadow-sm'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      {grp.label}
                    </button>
                  ))}
                </div>

                {/* View Switcher: Card View vs Table View */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                  <button
                    onClick={() => setStandingsView('table')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      standingsView === 'table' ? 'bg-white text-sport-navy shadow-sm' : 'hover:text-slate-900'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table View</span>
                  </button>
                  <button
                    onClick={() => setStandingsView('cards')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      standingsView === 'cards' ? 'bg-white text-sport-navy shadow-sm' : 'hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards View</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Render Groups (All or Filtered) */}
            {((standingsGroupFilter === 'ALL' ? ['A', 'B', 'C', 'D'] : [standingsGroupFilter]) as Array<'A' | 'B' | 'C' | 'D'>).map((grpKey) => {
              const grpRows = fourGroupStandings[grpKey] || [];
              const sfTarget = grpKey === 'A' || grpKey === 'B' ? 'Semifinal 1 (SF1)' : 'Semifinal 2 (SF2)';

              return (
                <div key={grpKey} className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-sport-orange text-white text-xs font-black flex items-center justify-center">
                        {grpKey}
                      </span>
                      <h4 className="font-extrabold text-sm text-sport-navy">GROUP {grpKey}</h4>
                      <span className="text-[11px] text-slate-500">
                        • Winner qualifies for <strong className="text-sport-orange">{sfTarget}</strong>
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500">
                      {grpRows.reduce((a, b) => a + b.played, 0) / 2} / 6 Matches Played
                    </span>
                  </div>

                  {standingsView === 'cards' ? (
                    /* Cards View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {grpRows.map((row, idx) => (
                        <div
                          key={row.teamId}
                          className={`p-4 rounded-xl border transition shadow-xs ${
                            idx === 0
                              ? 'border-orange-300 bg-orange-50/30'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                #{idx + 1}
                              </span>
                              <h5 className="font-extrabold text-xs text-sport-navy truncate max-w-[130px]">
                                {row.teamName}
                              </h5>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-sport-navy text-sport-orange font-mono font-black text-xs">
                              {row.points} PTS
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-1 text-center text-xs mt-3 pt-2 border-t border-slate-100 font-mono">
                            <div>
                              <span className="text-[9px] text-slate-400 font-sans block">P / W</span>
                              <span className="font-bold text-slate-800">{row.played}/{row.won}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-sans block">SETS</span>
                              <span className="font-bold text-slate-700">{row.setsWon}-{row.setsLost}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-sans block">SD</span>
                              <span className={`font-bold ${row.setDifference > 0 ? 'text-emerald-600' : row.setDifference < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                {row.setDifference > 0 ? `+${row.setDifference}` : row.setDifference}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 font-sans block">PD</span>
                              <span className={`font-bold ${row.pointDifference > 0 ? 'text-emerald-600' : row.pointDifference < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                {row.pointDifference > 0 ? `+${row.pointDifference}` : row.pointDifference}
                              </span>
                            </div>
                          </div>

                          {row.qualified && row.played > 0 && (
                            <div className="mt-2 text-center text-[10px] font-black text-emerald-700 bg-emerald-100 py-0.5 rounded">
                              ✓ Rank #1 Qualifier ({sfTarget})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Table View */
                    <div className="overflow-x-auto touch-scroll">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[10px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">Pos</th>
                            <th className="py-2.5 px-3">Team</th>
                            <th className="py-2.5 px-2.5 text-center" title="Played">P</th>
                            <th className="py-2.5 px-2.5 text-center text-emerald-700" title="Won">W</th>
                            <th className="py-2.5 px-2.5 text-center text-rose-600" title="Lost">L</th>
                            <th className="py-2.5 px-2.5 text-center" title="Sets Won">SW</th>
                            <th className="py-2.5 px-2.5 text-center" title="Sets Lost">SL</th>
                            <th className="py-2.5 px-2.5 text-center font-bold" title="Set Difference">SD</th>
                            <th className="py-2.5 px-2.5 text-center" title="Points For">PF</th>
                            <th className="py-2.5 px-2.5 text-center" title="Points Against">PA</th>
                            <th className="py-2.5 px-2.5 text-center font-bold" title="Point Difference">PD</th>
                            <th className="py-2.5 px-3 text-center font-black text-sport-navy bg-orange-50/50">PTS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                          {grpRows.map((row, idx) => (
                            <tr
                              key={row.teamId}
                              className={`hover:bg-slate-50/80 transition ${
                                idx === 0 ? 'bg-orange-50/20' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center font-bold">
                                {idx === 0 ? (
                                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-black inline-flex items-center justify-center text-[11px]">
                                    1
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono">{idx + 1}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-sport-navy">
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{row.teamName}</span>
                                  {row.qualified && row.played > 0 && (
                                    <span
                                      className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] uppercase font-black"
                                      title={`Qualifies for ${sfTarget}`}
                                    >
                                      Q
                                    </span>
                                  )}
                                  {row.isTied && (
                                    <span
                                      className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] uppercase font-black"
                                      title={row.tieBreakReason || 'Tie'}
                                    >
                                      TIED
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono">{row.played}</td>
                              <td className="py-2.5 px-2.5 text-center font-mono text-emerald-600 font-bold">{row.won}</td>
                              <td className="py-2.5 px-2.5 text-center font-mono text-rose-500 font-bold">{row.lost}</td>
                              <td className="py-2.5 px-2.5 text-center font-mono text-slate-700">{row.setsWon}</td>
                              <td className="py-2.5 px-2.5 text-center font-mono text-slate-500">{row.setsLost}</td>
                              <td className="py-2.5 px-2.5 text-center font-mono font-black">
                                <span className={row.setDifference > 0 ? 'text-emerald-600' : row.setDifference < 0 ? 'text-rose-600' : 'text-slate-400'}>
                                  {row.setDifference > 0 ? `+${row.setDifference}` : row.setDifference}
                                </span>
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono text-slate-600">{row.pointsFor}</td>
                              <td className="py-2.5 px-2.5 text-center font-mono text-slate-500">{row.pointsAgainst}</td>
                              <td className="py-2.5 px-2.5 text-center font-mono font-bold">
                                <span className={row.pointDifference > 0 ? 'text-emerald-600' : row.pointDifference < 0 ? 'text-rose-600' : 'text-slate-400'}>
                                  {row.pointDifference > 0 ? `+${row.pointDifference}` : row.pointDifference}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-black text-sport-orange bg-orange-50/40">
                                {row.points}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Bracket Tab */}
        {activeTab === 'bracket' && (
          <div className="bg-slate-900 p-4 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-6">
              <h3 className="text-base font-bold text-white">Playoff Bracket</h3>
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium sm:hidden">
                <span>👈 Swipe horizontally to view rounds 👉</span>
              </span>
            </div>
            <div className="overflow-x-auto touch-scroll pb-4 no-scrollbar">
              <div className="flex items-center gap-8 sm:gap-12 min-w-[650px]">
                {[1, 2, 3].map((r) => {
                  const roundMatches = fixtures.filter(
                    (m) => (m.stage === 'KNOCKOUT' || m.stage === 'FINAL') && m.round === r
                  );
                  if (roundMatches.length === 0) return null;

                  return (
                    <div key={r} className="flex-1 space-y-6">
                      <div className="text-center pb-2 border-b border-slate-800 text-xs font-black uppercase text-sport-orange">
                        {roundMatches[0]?.roundName || `Round ${r}`}
                      </div>
                      {roundMatches.map((m) => {
                        const h = teams.find((t) => t.id === m.homeTeamId);
                        const a = teams.find((t) => t.id === m.awayTeamId);

                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedMatch(m)}
                            className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-sport-orange transition cursor-pointer text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pb-1 border-b border-slate-900">
                              <span className="font-bold text-sport-orange">{m.matchCode || `Match #${m.fixtureNumber}`}</span>
                              <span>{m.status}</span>
                            </div>
                            <div className="flex items-center justify-between font-semibold text-slate-300">
                              <span className="truncate">{h?.name || m.homePlaceholder || 'TBD'}</span>
                              <span className="font-mono text-white">{m.homeScore}</span>
                            </div>
                            <div className="flex items-center justify-between font-semibold text-slate-300">
                              <span className="truncate">{a?.name || m.awayPlaceholder || 'TBD'}</span>
                              <span className="font-mono text-white">{m.awayScore}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 5. Teams & Rosters Tab */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4k:grid-cols-6 gap-4">
            {teams.map((team) => (
              <div key={team.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-sm"
                    style={{ backgroundColor: team.color || '#f97316' }}
                  >
                    {team.shortName}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-sport-navy">{team.name}</h4>
                    <p className="text-[11px] text-slate-500">Seed #{team.seed || '-'}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Roster ({team.players.length}/8 Registered)
                    </span>
                    {team.players.length === 8 && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        ✓ Full Roster
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs">
                    {team.players.map((p, i) => {
                      const isCap = p.isCaptain || team.captainId === p.id;

                      return (
                        <div key={p.id || i} className="flex items-center justify-between text-slate-700 py-0.5">
                          <span className="flex items-center gap-1.5 font-medium truncate">
                            <span>{p.name}</span>
                            {isCap && (
                              <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1 rounded">
                                CAP
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-sport-orange font-mono font-black">
                            #{p.jerseyNumber ?? i + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 6. Draw Results Tab */}
        {activeTab === 'draw' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-lg font-bold text-sport-navy mb-4">Official Draw Results</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-4 font-bold text-slate-600 uppercase text-xs">Draw Order</th>
                    <th className="py-3 px-4 font-bold text-slate-600 uppercase text-xs">Team</th>
                    <th className="py-3 px-4 font-bold text-slate-600 uppercase text-xs">Assigned Group</th>
                    <th className="py-3 px-4 font-bold text-slate-600 uppercase text-xs">Position</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const drawList = [];
                    // Simulated chronological order: A1, B1, C1, D1, A2, B2...
                    if (activeTournament?.groups) {
                      for (let pos = 1; pos <= 4; pos++) {
                        for (const g of ['A', 'B', 'C', 'D']) {
                          const group = activeTournament.groups.find(gr => gr.id === g);
                          if (group && group.teamIds && group.teamIds[pos - 1]) {
                            const teamId = group.teamIds[pos - 1];
                            const team = teams.find(t => t.id === teamId);
                            if (team) {
                              drawList.push({
                                teamName: team.name,
                                shortName: team.shortName,
                                color: team.color,
                                group: group.name,
                                position: `${g}${pos}`
                              });
                            }
                          }
                        }
                      }
                    }
                    
                    if (drawList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                            Live draw has not been conducted yet.
                          </td>
                        </tr>
                      );
                    }
                    
                    return drawList.map((draw, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">#{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-sport-navy flex items-center gap-3">
                          <span 
                            className="w-6 h-6 rounded flex items-center justify-center text-white text-[9px] font-black"
                            style={{ backgroundColor: draw.color || '#f97316' }}
                          >
                            {draw.shortName || 'T'}
                          </span>
                          {draw.teamName}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{draw.group}</td>
                        <td className="py-3 px-4 font-mono font-black text-sport-orange">{draw.position}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Match Details Modal (Cricbuzz Style Match Center) */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedMatch.status === 'LIVE'
                      ? 'bg-red-500 text-white animate-pulse'
                      : selectedMatch.status === 'COMPLETED'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {selectedMatch.status}
                </span>
                <span className="text-xs font-bold text-slate-500">{selectedMatch.roundName}</span>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-slate-400 hover:text-slate-800 p-1 cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scorecard Header (Cricbuzz Style) */}
            {(() => {
              const h = teams.find((t) => t.id === selectedMatch.homeTeamId);
              const a = teams.find((t) => t.id === selectedMatch.awayTeamId);

              return (
                <div className="py-4 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-3 text-center">
                    {/* Home Team */}
                    <div className="flex-1 flex flex-col items-center">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-sm mb-1.5"
                        style={{ backgroundColor: h?.color || '#f97316' }}
                      >
                        {h?.shortName || 'HOM'}
                      </div>
                      <div className="font-black text-sm sm:text-base text-sport-navy truncate max-w-[120px] sm:max-w-[150px]">
                        {h?.name || 'TBD'}
                      </div>
                    </div>

                    {/* Score Numerals */}
                    <div className="px-4 py-2 rounded-2xl bg-sport-midnight border border-slate-800 text-center shrink-0 shadow-inner">
                      <div className="text-3xl sm:text-4xl font-mono font-black text-amber-300">
                        {selectedMatch.homeScore} : {selectedMatch.awayScore}
                      </div>
                      <div className="text-[10px] font-bold text-sport-orange uppercase tracking-wider mt-0.5">
                        {selectedMatch.score.period || 'In Progress'}
                      </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 flex flex-col items-center">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-sm mb-1.5"
                        style={{ backgroundColor: a?.color || '#2563eb' }}
                      >
                        {a?.shortName || 'AWY'}
                      </div>
                      <div className="font-black text-sm sm:text-base text-sport-navy truncate max-w-[120px] sm:max-w-[150px]">
                        {a?.name || 'TBD'}
                      </div>
                    </div>
                  </div>

                  {/* Set-by-Set Score Breakdown */}
                  {selectedMatch.sets && selectedMatch.sets.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      {selectedMatch.sets.map((s) => (
                        <div
                          key={s.setNumber}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-center"
                        >
                          <div className="text-[9px] uppercase font-bold text-slate-400">Set {s.setNumber}</div>
                          <div className="font-black text-sport-navy text-sm">
                            {s.scoreA} — {s.scoreB}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Subtabs (Commentary vs Lineups) */}
            <div className="flex items-center gap-2 pt-3 border-b border-slate-100 text-xs font-bold">
              <button
                onClick={() => setMatchModalTab('commentary')}
                className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  matchModalTab === 'commentary'
                    ? 'border-sport-orange text-sport-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Live Commentary & Points ({selectedMatch.events.length})</span>
              </button>
              <button
                onClick={() => setMatchModalTab('lineups')}
                className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  matchModalTab === 'lineups'
                    ? 'border-sport-orange text-sport-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Squad Lineups</span>
              </button>
            </div>

            {/* Tab 1: Ball-by-ball Commentary Feed */}
            {matchModalTab === 'commentary' && (
              <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 max-h-80 pr-1">
                {selectedMatch.events.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No points or commentary recorded for this match yet.
                  </div>
                ) : (
                  selectedMatch.events.slice().reverse().map((evt, idx) => (
                    <div
                      key={evt.id || idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start gap-2.5"
                    >
                      <span className="font-mono font-black text-sport-orange text-[10px] px-1.5 py-0.5 rounded bg-orange-100/70 shrink-0 mt-0.5">
                        #{selectedMatch.events.length - idx}
                      </span>
                      <div className="flex-1 leading-relaxed text-slate-800">
                        {evt.description}
                        {evt.playerName && (
                          <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            Player: {evt.playerName}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 uppercase shrink-0">
                        {evt.eventType}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Squad Lineups (Starting 6 + 2 Substitutes per Match) */}
            {matchModalTab === 'lineups' && (() => {
              const h = teams.find((t) => t.id === selectedMatch.homeTeamId);
              const a = teams.find((t) => t.id === selectedMatch.awayTeamId);

              const resolvePlayer = (id: string, team?: typeof h, lineup?: typeof selectedMatch.lineupHome) => {
                let snap: any;
                if (Array.isArray(lineup?.snapshots)) {
                  snap = lineup.snapshots.find((s) => s.id === id);
                } else if (lineup?.snapshots && typeof lineup.snapshots === 'object') {
                  snap = (lineup.snapshots as any)[id];
                }
                if (snap) return snap;
                const p = team?.players.find((item) => item.id === id);
                if (p) return p;
                return { id, name: 'Player', jerseyNumber: 0 };
              };

              const renderTeamLineup = (team?: typeof h, lineup?: typeof selectedMatch.lineupHome, isHome?: boolean) => {
                if (lineup && lineup.startingPlayerIds && lineup.startingPlayerIds.length > 0) {
                  return (
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 mb-1 flex items-center justify-between">
                          <span>Starting 6 (On Field)</span>
                          <span className="font-mono text-emerald-600">6 Players</span>
                        </div>
                        <div className="space-y-1">
                          {lineup.startingPlayerIds.map((id) => {
                            const p = resolvePlayer(id, team, lineup);
                            return (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px]"
                              >
                                <span className="font-bold text-slate-800 truncate flex items-center gap-1">
                                  <span>{p.name}</span>
                                  {p.isCaptain && <span className="text-[8px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-black">C</span>}
                                </span>
                                <span className={`font-mono font-black text-xs ${isHome ? 'text-sport-orange' : 'text-blue-600'}`}>
                                  #{p.jerseyNumber}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-blue-700 mb-1 flex items-center justify-between">
                          <span>Substitutes (Bench)</span>
                          <span className="font-mono text-blue-600">2 Players</span>
                        </div>
                        <div className="space-y-1">
                          {lineup.substitutePlayerIds.map((id) => {
                            const p = resolvePlayer(id, team, lineup);
                            return (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px]"
                              >
                                <span className="font-medium text-slate-700 truncate flex items-center gap-1">
                                  <span>{p.name}</span>
                                  {p.isCaptain && <span className="text-[8px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-black">C</span>}
                                </span>
                                <span className={`font-mono font-black text-xs ${isHome ? 'text-sport-orange' : 'text-blue-600'}`}>
                                  #{p.jerseyNumber}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Fallback: Show registered roster with pending notice
                return (
                  <div className="space-y-2">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500 italic">
                      Match starting 6 + 2 substitutes will be confirmed before match. Showing registered roster:
                    </div>
                    <div className="space-y-1">
                      {team?.players.map((p, i) => (
                        <div
                          key={p.id || i}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 text-[11px]"
                        >
                          <span className="font-medium text-slate-800 truncate">{p.name}</span>
                          <span className={`font-mono font-bold ${isHome ? 'text-sport-orange' : 'text-blue-600'}`}>
                            #{p.jerseyNumber ?? i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              };

              return (
                <div className="flex-1 overflow-y-auto pt-3 grid grid-cols-2 gap-4 max-h-80 text-xs">
                  {/* Home Team Squad */}
                  <div className="space-y-2">
                    <div className="font-bold text-sport-navy flex items-center justify-between pb-1 border-b border-slate-100">
                      <span className="truncate">{h?.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {selectedMatch.lineupHome ? '✓ 6+2 Set' : 'Roster'}
                      </span>
                    </div>
                    {renderTeamLineup(h, selectedMatch.lineupHome, true)}
                  </div>

                  {/* Away Team Squad */}
                  <div className="space-y-2">
                    <div className="font-bold text-sport-navy flex items-center justify-between pb-1 border-b border-slate-100">
                      <span className="truncate">{a?.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {selectedMatch.lineupAway ? '✓ 6+2 Set' : 'Roster'}
                      </span>
                    </div>
                    {renderTeamLineup(a, selectedMatch.lineupAway, false)}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-200">
            <h4 className="text-base font-bold text-sport-navy mb-1">{activeTournament.name}</h4>
            <p className="text-xs text-slate-500 mb-4">Scan with any phone to open live spectator page</p>

            <div className="p-4 bg-slate-50 rounded-2xl inline-block border border-slate-200 mb-4">
              <QRCodeSVG value={publicUrl} size={180} level="H" includeMargin={true} />
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 bg-sport-navy text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
