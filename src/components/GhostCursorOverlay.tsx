import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MousePointer2 } from 'lucide-react';

export interface GhostCursorProps {
  isVisible: boolean;
  xRatio: number; // 0..1
  yRatio: number; // 0..1
  label: string;
  isClicking: boolean;
  timeLeftSec: number;
}

export const GhostCursorOverlay: React.FC<GhostCursorProps> = ({
  isVisible,
  xRatio,
  yRatio,
  label,
  isClicking,
  timeLeftSec,
}) => {
  if (!isVisible) return null;

  const leftPercent = Math.max(2, Math.min(98, xRatio * 100));
  const topPercent = Math.max(2, Math.min(98, yRatio * 100));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
      {/* Floating Status Banner */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-[#020617]/95 border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,245,212,0.4)] px-4 py-2 rounded-full flex items-center gap-3 backdrop-blur-md">
        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span className="text-xs font-mono font-black text-cyan-300 tracking-wide uppercase">
            IA EN ACTION AUTONOME :
          </span>
          <span className="text-xs font-mono text-slate-200 font-bold">{label}</span>
        </div>
        <div className="bg-cyan-950/80 border border-cyan-500/50 px-2 py-0.5 rounded text-[11px] font-mono text-cyan-300 font-black">
          {Math.floor(timeLeftSec / 60)}:{(timeLeftSec % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Autonomous Wandering Ghost Cursor */}
      <motion.div
        className="absolute"
        initial={{ left: '50%', top: '50%' }}
        animate={{
          left: `${leftPercent}%`,
          top: `${topPercent}%`,
        }}
        transition={{
          type: 'spring',
          damping: 24,
          stiffness: 120,
          mass: 0.6,
        }}
        style={{ transform: 'translate(-8px, -8px)' }}
      >
        {/* Glow halo */}
        <div className={`absolute -inset-4 rounded-full transition-all duration-300 ${
          isClicking
            ? 'bg-amber-400/40 shadow-[0_0_35px_#f59e0b] scale-150'
            : 'bg-cyan-500/25 shadow-[0_0_25px_#00f5d4] scale-100'
        }`} />

        {/* Pointer Icon */}
        <div className="relative flex items-center gap-1.5">
          <MousePointer2
            className={`w-7 h-7 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] transition-transform duration-150 ${
              isClicking
                ? 'text-amber-300 fill-amber-400 scale-90 rotate-[-12deg]'
                : 'text-cyan-300 fill-cyan-400 rotate-0'
            }`}
          />

          {/* Action pill attached to cursor */}
          <div className="bg-[#040915]/95 border border-cyan-400/80 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold text-cyan-200 shadow-xl whitespace-nowrap">
            {isClicking ? '⚡ ACTION : ' : '👀 RECHERCHE : '}
            <span className={isClicking ? 'text-amber-300' : 'text-slate-200'}>
              {label}
            </span>
          </div>
        </div>

        {/* Pulse ripple on click */}
        <AnimatePresence>
          {isClicking && (
            <motion.div
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 3.0, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute top-2 left-2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-400/30"
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
