import React, { useState, useRef, useEffect } from 'react';
import { soundEffects } from '../../engines/audioEngine';
import { RotateCcw, Sparkles, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const DEFAULT_ITEMS = [
  'Team Alpha',
  'Team Beta',
  'Team Gamma',
  'Team Delta',
  'Team Echo',
  'Team Falcon',
  'Team Genesis',
  'Team Horizon',
];

const SLICE_COLORS = [
  '#f97316',
  '#2563eb',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#eab308',
  '#06b6d4',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
];

export const PickerWheelTool: React.FC = () => {
  const [items, setItems] = useState<string[]>(DEFAULT_ITEMS);
  const [newItem, setNewItem] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;

    ctx.clearRect(0, 0, width, height);

    if (items.length === 0) return;

    const sliceAngle = (2 * Math.PI) / items.length;

    // Draw slices
    items.forEach((item, idx) => {
      const startAngle = angle + idx * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = SLICE_COLORS[idx % SLICE_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(item, radius - 20, 5);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Center text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('SPIN', centerX, centerY + 3);
  };

  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [items]);

  const handleSpin = () => {
    if (isSpinning || items.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    const spinDuration = 3500;
    const startTime = performance.now();
    const initialSpeed = 25 + Math.random() * 15; // Initial rotational velocity
    let lastTickAngle = currentAngleRef.current;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      // Ease-out cubic deceleration curve
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentSpeed = initialSpeed * (1 - easeOut);

      currentAngleRef.current += (currentSpeed * Math.PI) / 180;

      // Play tick sound every slice
      const sliceSize = (2 * Math.PI) / items.length;
      if (Math.abs(currentAngleRef.current - lastTickAngle) >= sliceSize) {
        soundEffects.playTick();
        lastTickAngle = currentAngleRef.current;
      }

      drawWheel(currentAngleRef.current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Calculate winning slice (pointer is at top 3PI/2 or right 0)
        // In our canvas, pointer is at the right (0 rad)
        const normalizedAngle = (currentAngleRef.current % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const winningIndex = Math.floor(
          ((2 * Math.PI - normalizedAngle) % (2 * Math.PI)) / sliceSize
        );
        const selected = items[winningIndex % items.length];

        setWinner(selected);
        setIsSpinning(false);
        soundEffects.playCelebration();
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setItems([...items, newItem.trim()]);
    setNewItem('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
        <h3 className="text-xl font-black text-sport-navy flex items-center justify-center gap-2">
          🎡 Match-Day Picker Wheel
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Spinning decision wheel for choosing teams, penalty kicks, captains, or lucky draw prizes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Wheel Canvas Container */}
        <div className="md:col-span-2 bg-gradient-to-br from-sport-midnight via-slate-900 to-sport-navy p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
          {/* Top Pointer Indicator */}
          <div className="relative mb-2 z-20">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-sport-orange drop-shadow-md"></div>
          </div>

          <canvas
            ref={canvasRef}
            width={380}
            height={380}
            className="cursor-pointer max-w-full"
            onClick={handleSpin}
          />

          <button
            onClick={handleSpin}
            disabled={isSpinning || items.length === 0}
            className="mt-6 px-8 py-3 rounded-full bg-sport-orange hover:bg-orange-600 text-white font-extrabold text-sm shadow-glow-orange transition cursor-pointer active:scale-95 disabled:opacity-40"
          >
            {isSpinning ? 'Wheel Spinning...' : 'SPIN WHEEL!'}
          </button>

          {/* Winner Announcement Banner */}
          {winner && (
            <div className="mt-6 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center animate-fadeIn">
              <span className="text-xs font-bold uppercase tracking-wider text-sport-orange block">
                Selected Outcome
              </span>
              <h4 className="text-2xl font-black text-white mt-1">🎯 {winner}</h4>
            </div>
          )}
        </div>

        {/* Options List / Customizer */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Wheel Options ({items.length})
            </h4>
            <button
              onClick={() => setItems(DEFAULT_ITEMS)}
              className="text-[11px] text-sport-orange font-bold hover:underline cursor-pointer"
            >
              Reset Defaults
            </button>
          </div>

          <form onSubmit={handleAddItem} className="flex gap-2">
            <input
              type="text"
              placeholder="Add item..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className="flex-1 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-sport-orange"
            />
            <button
              type="submit"
              className="p-2 bg-sport-orange text-white rounded-xl shadow-sm hover:bg-orange-600 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs font-semibold text-sport-navy"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length] }}
                  />
                  <span>{item}</span>
                </div>
                <button
                  onClick={() => handleRemoveItem(idx)}
                  className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
