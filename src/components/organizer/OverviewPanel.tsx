import React from 'react';
import { useTournament } from '../../context/TournamentContext';
import { SPORT_CONFIGS } from '../../engines/sportEngine';
import {
  Users,
  Calendar,
  Radio,
  Play,
  Share2,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  AlertTriangle,
  AlertCircle,
  Globe,
  Lock,
  Clock,
} from 'lucide-react';

export const OverviewPanel: React.FC = () => {
  const {
    activeTournament,
    setOrganizerTab,
    setViewMode,
    generateTournamentFixtures,
    setActiveMatchId,
    readiness,
    publishTournament,
    unpublishTournament,
    updateTournamentSettings,
  } = useTournament();

  const [isPublishing, setIsPublishing] = React.useState(false);
  const [publishFeedback, setPublishFeedback] = React.useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [logoUrl, setLogoUrl] = React.useState(activeTournament?.logoUrl || '');
  const [bannerUrl, setBannerUrl] = React.useState(activeTournament?.bannerUrl || '');
  const [isSavingBranding, setIsSavingBranding] = React.useState(false);

  React.useEffect(() => {
    if (activeTournament) {
      setLogoUrl(activeTournament.logoUrl || '');
      setBannerUrl(activeTournament.bannerUrl || '');
    }
  }, [activeTournament?.logoUrl, activeTournament?.bannerUrl]);

  if (!activeTournament) return null;

  const sportConfig = SPORT_CONFIGS[activeTournament.sport] || SPORT_CONFIGS.football;
  const teams = activeTournament.teams;
  const fixtures = activeTournament.fixtures;
  const liveMatches = fixtures.filter((m) => m.status === 'LIVE');
  const completedMatches = fixtures.filter((m) => m.status === 'COMPLETED');
  const upcomingMatches = fixtures.filter((m) => m.status === 'UPCOMING');

  return (
    <div className="space-y-6">
      {/* 4 Metric Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Teams Metric */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Registered Teams</span>
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-sport-orange flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sport-navy">{teams.length} Teams</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{teams.filter((t) => t.seed).length} Seeded</span>
            <button
              onClick={() => setOrganizerTab('teams')}
              className="text-sport-orange font-bold hover:underline cursor-pointer"
            >
              Manage →
            </button>
          </div>
        </div>

        {/* Matches Metric */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Fixtures Progress</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sport-navy">
            {completedMatches.length} / {fixtures.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{upcomingMatches.length} Pending</span>
            <button
              onClick={() => setOrganizerTab('fixtures')}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Schedule →
            </button>
          </div>
        </div>

        {/* Live Matches Telemetry */}
        <div
          className={`p-5 rounded-2xl border transition ${
            liveMatches.length > 0
              ? 'bg-red-50/80 border-red-200 ring-2 ring-red-500/20 shadow-md'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Scorer</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                liveMatches.length > 0
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sport-navy">
            {liveMatches.length} Active {liveMatches.length === 1 ? 'Match' : 'Matches'}
          </div>
          <div className="text-[11px] mt-1 flex items-center justify-between">
            <span className={liveMatches.length > 0 ? 'text-red-600 font-semibold' : 'text-slate-500'}>
              {liveMatches.length > 0 ? 'Scoring Desk Active' : 'No active game'}
            </span>
            <button
              onClick={() => {
                if (liveMatches[0]) setActiveMatchId(liveMatches[0].id);
                setOrganizerTab('scoring');
              }}
              className="text-red-600 font-bold hover:underline cursor-pointer"
            >
              Open Desk →
            </button>
          </div>
        </div>

        {/* Draw & Matchmaking Metric */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Matchmaking & Draw</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-sport-navy">
            {activeTournament.status === 'DRAFT' || activeTournament.status === 'TEAMS_ADDED'
              ? 'Draw Pending'
              : 'Pots Drawn'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{teams.length >= 2 ? `${teams.length} Teams Ready` : 'Add Teams First'}</span>
            <button
              onClick={() => setOrganizerTab('draw')}
              className="text-purple-600 font-bold hover:underline cursor-pointer"
            >
              Draw Room →
            </button>
          </div>
        </div>
      </div>

      {/* Tournament Readiness & Publishing Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-sport-navy mt-0.5">
              Tournament Publishing
            </h3>
            <p className="text-xs text-slate-500">
              Publish your tournament to make it visible to participants.
            </p>
          </div>

          {/* Publishing Controls */}
          <div className="flex items-center gap-2">
            {activeTournament.status === 'PUBLISHED' ? (
              <>
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  Published & Live
                </span>
                <button
                  disabled={isPublishing}
                  onClick={async () => {
                    setIsPublishing(true);
                    await unpublishTournament(activeTournament.id);
                    setPublishFeedback({ type: 'success', msg: 'Tournament unpublished (status: DRAFT).' });
                    setIsPublishing(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-300 transition cursor-pointer"
                >
                  Unpublish
                </button>
              </>
            ) : (
              <button
                disabled={isPublishing}
                onClick={async () => {
                  setIsPublishing(true);
                  setPublishFeedback(null);
                  const res = await publishTournament(activeTournament.id);
                  if (!res.success) {
                    setPublishFeedback({ type: 'error', msg: `Publish failed: ${res.errors.join(', ')}` });
                  } else if (res.warnings.length > 0) {
                    setPublishFeedback({ type: 'success', msg: `Published with ${res.warnings.length} warning(s).` });
                  } else {
                    setPublishFeedback({ type: 'success', msg: 'Tournament published successfully!' });
                  }
                  setIsPublishing(false);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer active:scale-95 bg-sport-orange hover:bg-orange-600 text-white shadow-glow-orange`}
              >
                <Globe className="w-4 h-4" />
                {isPublishing ? 'Publishing...' : 'Publish Tournament'}
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {publishFeedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              publishFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {publishFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{publishFeedback.msg}</span>
          </div>
        )}


      </div>

      {/* Tournament Branding & Settings Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <h3 className="text-sm font-bold text-sport-navy border-b border-slate-100 pb-2">
          Tournament Branding
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Logo URL (Optional)</label>
            <input
              type="text"
              placeholder="e.g. https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-sport-navy"
            />
            <p className="text-[10px] text-slate-400 mt-1">Replaces the trophy icon in public view.</p>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Banner URL (Optional)</label>
            <input
              type="text"
              placeholder="e.g. https://example.com/banner.jpg"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-sport-navy"
            />
            <p className="text-[10px] text-slate-400 mt-1">Custom background for the public header.</p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            disabled={isSavingBranding || (logoUrl === (activeTournament.logoUrl || '') && bannerUrl === (activeTournament.bannerUrl || ''))}
            onClick={async () => {
              setIsSavingBranding(true);
              if (activeTournament) {
                await updateTournamentSettings(activeTournament.id, { logoUrl, bannerUrl });
                // Show temporary success feedback?
                setTimeout(() => setIsSavingBranding(false), 500);
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
              (logoUrl !== (activeTournament.logoUrl || '') || bannerUrl !== (activeTournament.bannerUrl || ''))
                ? 'bg-sport-orange hover:bg-orange-600 text-white shadow-glow-orange'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {isSavingBranding ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </div>

      {/* Main Grid: Quick Action Workflows & Live Match Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Games or Draw Launch */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Match Spotlight Card */}
          {liveMatches.length > 0 ? (
            <div className="bg-gradient-to-br from-slate-900 to-sport-midnight text-white p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  <span className="text-xs font-black tracking-wider uppercase text-red-400">
                    Live Scoreboard Broadcast
                  </span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-slate-300">
                  {liveMatches[0].roundName}
                </span>
              </div>

              {/* Match Teams & Score Banner */}
              {(() => {
                const liveMatch = liveMatches[0];
                const homeTeam = teams.find((t) => t.id === liveMatch.homeTeamId);
                const awayTeam = teams.find((t) => t.id === liveMatch.awayTeamId);

                return (
                  <div className="bg-slate-800/80 backdrop-blur-md p-6 rounded-xl border border-slate-700/80">
                    <div className="flex items-center justify-between gap-4">
                      {/* Home */}
                      <div className="flex-1 text-center sm:text-right">
                        <div className="text-lg sm:text-xl font-black text-white">
                          {homeTeam?.name || 'TBD'}
                        </div>
                        <div className="text-xs text-slate-400">{homeTeam?.shortName}</div>
                      </div>

                      {/* Score Badge */}
                      <div className="px-6 py-2 rounded-2xl bg-sport-midnight border border-slate-700 text-center shadow-inner">
                        <div className="text-3xl sm:text-4xl font-black text-sport-orange tracking-tight">
                          {liveMatch.homeScore} : {liveMatch.awayScore}
                        </div>
                        <div className="text-[11px] font-bold text-red-400 mt-0.5">
                          {liveMatch.score.period || 'In Progress'} • {liveMatch.score.timeElapsed || 'Live'}
                        </div>
                      </div>

                      {/* Away */}
                      <div className="flex-1 text-center sm:text-left">
                        <div className="text-lg sm:text-xl font-black text-white">
                          {awayTeam?.name || 'TBD'}
                        </div>
                        <div className="text-xs text-slate-400">{awayTeam?.shortName}</div>
                      </div>
                    </div>

                    {/* Latest Events ticker */}
                    {liveMatch.events.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
                        <span className="font-semibold text-sport-orange">Latest Event:</span>
                        <span className="truncate max-w-[280px]">
                          {liveMatch.events[0].playerName
                            ? `${liveMatch.events[0].playerName} (${liveMatch.events[0].eventType})`
                            : liveMatch.events[0].description}
                        </span>
                        <button
                          onClick={() => {
                            setActiveMatchId(liveMatch.id);
                            setOrganizerTab('scoring');
                          }}
                          className="px-3 py-1 rounded-lg bg-sport-orange hover:bg-orange-600 text-white font-bold text-xs transition cursor-pointer"
                        >
                          Control Scorer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : null}

          {/* Fixtures Quick Preview */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-sport-navy flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sport-orange" />
                Fixtures Timeline
              </h3>
              <button
                onClick={() => setOrganizerTab('fixtures')}
                className="text-xs font-bold text-sport-orange hover:underline cursor-pointer"
              >
                View All ({fixtures.length}) →
              </button>
            </div>

            {fixtures.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No fixtures generated yet. Click "Generate Fixtures" to schedule tournament matches.
              </div>
            ) : (
              <div className="space-y-2.5">
                {fixtures.slice(0, 4).map((match) => {
                  const home = teams.find((t) => t.id === match.homeTeamId);
                  const away = teams.find((t) => t.id === match.awayTeamId);

                  return (
                    <div
                      key={match.id}
                      onClick={() => {
                        setActiveMatchId(match.id);
                        setOrganizerTab('scoring');
                      }}
                      className="p-3 rounded-xl border border-slate-100 hover:border-sport-orange/40 hover:bg-slate-50 transition flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            match.status === 'LIVE'
                              ? 'bg-red-500 text-white animate-pulse'
                              : match.status === 'COMPLETED'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {match.status}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {match.roundName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-bold text-sport-navy">
                        <span>{home?.name || 'TBD'}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-sport-orange">
                          {match.homeScore} - {match.awayScore}
                        </span>
                        <span>{away?.name || 'TBD'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Audit Logs & Public Sharing card */}
        <div className="space-y-6">
          {/* Public Sharing card */}
          <div className="bg-gradient-to-br from-sport-navy to-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sport-orange mb-1">
              Public Spectator URL
            </h4>
            <p className="text-xs text-slate-300 mb-3">
              Spectators and players can access live scores & brackets without logging in.
            </p>

            <div className="bg-slate-800/90 px-3 py-2 rounded-xl text-xs font-mono text-slate-300 border border-slate-700 truncate mb-3">
              https://sportiq.app/t/{activeTournament.slug}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('public')}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-sport-orange hover:bg-orange-600 text-white text-center transition cursor-pointer"
              >
                Launch Public View
              </button>
              <button
                onClick={() => setOrganizerTab('share')}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition cursor-pointer"
              >
                QR Code
              </button>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
              <span>Security & Audit Trails</span>
              <span className="text-[10px] text-slate-400 font-mono">Immutable</span>
            </h4>

            <div className="space-y-3">
              {activeTournament.auditLogs.map((log) => (
                <div key={log.id} className="text-xs border-l-2 border-sport-orange pl-3 py-0.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-600">{log.action}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <div className="text-slate-800 font-medium text-[11px] mt-0.5">
                    {log.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
