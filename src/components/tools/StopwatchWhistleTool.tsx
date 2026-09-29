import React, { useState, useEffect } from 'react';
import { soundEffects } from '../../engines/audioEngine';
import { Play, Pause, RotateCcw, Volume2, Plus, Clock, Bell } from 'lucide-react';

interface Lap {
  id: string;
  time: string;
  label: string;
}

export const StopwatchWhistleTool: React.FC = () => {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [direction, setDirection] = useState<'UP' | 'DOWN'>('UP');
  const [initialDuration, setInitialDuration] = useState(45 * 60); // 45 mins default
  const [laps, setLaps] = useState<Lap[]>([]);

  // Presets
  const presets = [
    { label: 'Football Half (45m)', time: 45 * 60, dir: 'UP' as const },
    { label: 'Kabaddi Half (20m)', time: 20 * 60, dir: 'DOWN' as const },
    { label: 'Basketball Qtr (12m)', time: 12 * 60, dir: 'DOWN' as const },
    { label: 'Basketball Qtr (10m)', time: 10 * 60, dir: 'DOWN' as const },
    { label: 'Continuous Count-Up', time: 0, dir: 'UP' as const },
  ];

  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (direction === 'DOWN') {
            if (prev <= 1) {
              soundEffects.playBuzzer();
              setIsRunning(false);
              return 0;
            }
            return prev - 1;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, direction]);

  const formatDisplay = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleApplyPreset = (p: (typeof presets)[0]) => {
    setIsRunning(false);
    setDirection(p.dir);
    setInitialDuration(p.time);
    setSeconds(p.dir === 'DOWN' ? p.time : 0);
  };

  const handleToggleTimer = () => {
    setIsRunning(!isRunning);
    soundEffects.playWhistle();
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(direction === 'DOWN' ? initialDuration : 0);
    setLaps([]);
  };

  const handleRecordLap = () => {
    setLaps((prev) => [
      {
        id: `lap-${Date.now()}`,
        time: formatDisplay(seconds),
        label: `Stoppage / Event #${prev.length + 1}`,
      },
      ...prev,
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
        <h3 className="text-xl font-black text-sport-navy flex items-center justify-center gap-2">
          ⏱️ Match Stopwatch & Referee Whistle
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Precision countdown/countup timer with Web Audio synthesized referee whistle & buzzer
        </p>

        {/* Presets */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(p)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stadium Clock Canvas */}
      <div className="bg-gradient-to-br from-sport-midnight via-slate-900 to-sport-navy text-white p-8 sm:p-12 rounded-3xl border border-slate-800 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sport-orange/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Big Athletic Digital Clock */}
        <div className="py-6">
          <div className="text-7xl sm:text-9xl font-black tracking-tight font-mono text-white text-shadow-lg">
            {formatDisplay(seconds)}
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-sport-orange mt-2">
            {direction === 'DOWN' ? 'Countdown Mode' : 'Elapsed Match Time'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          <button
            onClick={handleToggleTimer}
            className={`px-8 py-4 rounded-2xl text-sm font-black transition flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-sport-orange hover:bg-orange-600 text-white shadow-glow-orange'
            }`}
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isRunning ? 'PAUSE TIMER' : 'START TIMER'}
          </button>

          <button
            onClick={() => soundEffects.playWhistle()}
            className="px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sport-orange border border-slate-700 font-black text-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Volume2 className="w-5 h-5" />
            BLOW WHISTLE
          </button>

          <button
            onClick={handleRecordLap}
            className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition cursor-pointer"
            title="Mark Lap / Stoppage"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            onClick={handleReset}
            className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Laps & Stoppage Times */}
      {laps.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-sport-navy mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sport-orange" />
            Logged Stoppage & Event Timestamps
          </h4>
          <div className="space-y-2">
            {laps.map((lap) => (
              <div
                key={lap.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
              >
                <span className="font-bold text-sport-navy">{lap.label}</span>
                <span className="font-mono font-bold text-sport-orange">{lap.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
