import React from 'react';
import { useTournament, ToolsTab } from '../../context/TournamentContext';
import { CoinTossTool } from './CoinTossTool';
import { PickerWheelTool } from './PickerWheelTool';
import { RandomTeamGeneratorTool } from './RandomTeamGeneratorTool';
import { StopwatchWhistleTool } from './StopwatchWhistleTool';
import { ScoreboardClickerTool } from './ScoreboardClickerTool';
import { Wrench, Sparkles } from 'lucide-react';

export const MatchDayTools: React.FC = () => {
  const { toolsTab, setToolsTab } = useTournament();

  const toolTabs: { id: ToolsTab; label: string; icon: string }[] = [
    { id: 'coin-toss', label: 'Coin Toss (3D)', icon: '🪙' },
    { id: 'picker-wheel', label: 'Picker Wheel', icon: '🎡' },
    { id: 'random-teams', label: 'Random Teams', icon: '👥' },
    { id: 'stopwatch', label: 'Stopwatch & Whistle', icon: '⏱️' },
    { id: 'scoreboard', label: 'Scoreboard Clicker', icon: '🔢' },
  ];

  return (
    <div className="space-y-6">
      {/* Tools Top Nav */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-100 text-sport-orange flex items-center justify-center">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-sport-navy">Match-Day Utilities Suite</h3>
            <p className="text-[11px] text-slate-500">
              Stand-alone tools for referees, organizers, field marshals, and team managers
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {toolTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setToolsTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                toolsTab === tab.id
                  ? 'bg-sport-navy text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Tool Panel */}
      <div>
        {toolsTab === 'coin-toss' && <CoinTossTool />}
        {toolsTab === 'picker-wheel' && <PickerWheelTool />}
        {toolsTab === 'random-teams' && <RandomTeamGeneratorTool />}
        {toolsTab === 'stopwatch' && <StopwatchWhistleTool />}
        {toolsTab === 'scoreboard' && <ScoreboardClickerTool />}
      </div>
    </div>
  );
};
