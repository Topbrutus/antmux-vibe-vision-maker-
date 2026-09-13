import React, { useState, useEffect, useRef } from 'react';
import {
  Move,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Sparkles,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp,
  Pin,
  PinOff,
  Crosshair,
  Compass,
  Square,
  Check,
  Activity,
  BarChart2,
  Radio,
  Waves,
  X,
  Lock,
  Unlock
} from 'lucide-react';
import { ZoneCOscilloscope } from './ZoneCOscilloscope';
import { ScopeDisplaySettings, AppMode } from '../types/vectorScope';

export type SnapPosition =
  | 'top_right'
  | 'top_left'
  | 'bottom_right'
  | 'bottom_left'
  | 'center_right'
  | 'free';

export type VisualizerViewMode = 'vector_crt' | 'spectral_dual' | 'spectrogram' | 'correlation';

interface SnappableScopeWindowProps {
  points: Array<[number, number]>;
  settings: ScopeDisplaySettings;
  onSettingsChange: (settings: Partial<ScopeDisplaySettings>) => void;
  freqDataX?: Uint8Array;
  freqDataY?: Uint8Array;
  rawTimeDataX?: Float32Array;
  rawTimeDataY?: Float32Array;
  sampleRate?: number;
  presetName?: string;
  isPaused: boolean;
  onTogglePause: () => void;
  currentLabel?: string;
  timecodeText?: string;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onNavigateToSource?: (mode: AppMode) => void;
  defaultSnap?: SnapPosition;
  onClose?: () => void;
  className?: string;
}

const SNAP_MARGIN = 20;

export const SnappableScopeWindow: React.FC<SnappableScopeWindowProps> = ({
  points = [],
  settings,
  onSettingsChange,
  freqDataX,
  freqDataY,
  rawTimeDataX,
  rawTimeDataY,
  sampleRate = 48000,
  presetName = 'Visualiseur & Spectrale',
  isPaused,
  onTogglePause,
  currentLabel,
  timecodeText,
  isPlaying,
  onTogglePlay,
  onNavigateToSource,
  defaultSnap = 'top_right',
  onClose,
  className = '',
}) => {
  // Visualizer Mode: Vector CRT vs Dual Spectral FFT vs Spectrogram Waterfall vs Correlation
  const [viewMode, setViewMode] = useState<VisualizerViewMode>(() => {
    try {
      const saved = localStorage.getItem('genesis_snap_scope_viewmode');
      return (saved as VisualizerViewMode) || 'vector_crt';
    } catch {
      return 'vector_crt';
    }
  });

  // Scope size: mini (280px), medium (380px), large (500px), xl (620px)
  const [sizePreset, setSizePreset] = useState<'mini' | 'medium' | 'large' | 'xl'>(() => {
    try {
      const saved = localStorage.getItem('genesis_snap_scope_size');
      return (saved as any) || 'medium';
    } catch {
      return 'medium';
    }
  });

  const getWidthForSize = (sz: 'mini' | 'medium' | 'large' | 'xl') => {
    switch (sz) {
      case 'mini':
        return 290;
      case 'medium':
        return 390;
      case 'large':
        return 510;
      case 'xl':
        return 630;
    }
  };

  const currentWidth = getWidthForSize(sizePreset);

  // Opacity: 1 (100%), 0.85 (85%), 0.65 (65%), 0.45 (45%)
  const [opacityLevel, setOpacityLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('genesis_snap_scope_opacity');
      return saved ? parseFloat(saved) : 0.95;
    } catch {
      return 0.95;
    }
  });

  // Collapsed / Minimized state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Active snap position: 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left' | 'center_right' | 'free'
  const [snapPosition, setSnapPosition] = useState<SnapPosition>(() => {
    try {
      const saved = localStorage.getItem('genesis_snap_scope_pos');
      return (saved as SnapPosition) || defaultSnap;
    } catch {
      return defaultSnap;
    }
  });

  // Coordinates for position
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 20, y: 80 };
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    return {
      x: Math.max(SNAP_MARGIN, w - 420),
      y: 90,
    };
  });

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragHoverSnap, setDragHoverSnap] = useState<SnapPosition | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  }>({ startX: 0, startY: 0, initX: 0, initY: 0 });

  // Canvas refs for spectral views
  const spectralCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spectrogramCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculate coordinates based on snap position
  const calculateSnapCoords = (snap: SnapPosition, width: number, height: number) => {
    if (typeof window === 'undefined') return { x: 20, y: 80 };
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    switch (snap) {
      case 'top_right':
        return { x: winW - width - SNAP_MARGIN, y: 80 };
      case 'top_left':
        return { x: SNAP_MARGIN, y: 80 };
      case 'bottom_right':
        return { x: winW - width - SNAP_MARGIN, y: winH - height - SNAP_MARGIN - 40 };
      case 'bottom_left':
        return { x: SNAP_MARGIN, y: winH - height - SNAP_MARGIN - 40 };
      case 'center_right':
        return { x: winW - width - SNAP_MARGIN, y: Math.max(80, (winH - height) / 2) };
      case 'free':
      default:
        return position;
    }
  };

  // Re-apply snap when size or snap position changes
  useEffect(() => {
    if (snapPosition !== 'free') {
      const estimatedH = isCollapsed ? 60 : currentWidth + 80;
      const coords = calculateSnapCoords(snapPosition, currentWidth, estimatedH);
      setPosition(coords);
    }
  }, [snapPosition, sizePreset, isCollapsed]);

  // Window resize listener
  useEffect(() => {
    const handleResize = () => {
      if (snapPosition !== 'free') {
        const estimatedH = isCollapsed ? 60 : currentWidth + 80;
        const coords = calculateSnapCoords(snapPosition, currentWidth, estimatedH);
        setPosition(coords);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [snapPosition, sizePreset, isCollapsed, currentWidth]);

  // Handle Dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = dragRef.current.initX + dx;
      const newY = dragRef.current.initY + dy;

      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const cardW = currentWidth;
      const cardH = isCollapsed ? 60 : currentWidth + 80;

      // Constrain within bounds
      const boundedX = Math.max(10, Math.min(winW - cardW - 10, newX));
      const boundedY = Math.max(10, Math.min(winH - cardH - 10, newY));

      setPosition({ x: boundedX, y: boundedY });

      // Magnetic snap zone detection
      const SNAP_THRESHOLD = 90;
      let detectedSnap: SnapPosition | null = null;

      if (boundedX > winW - cardW - SNAP_THRESHOLD && boundedY < SNAP_THRESHOLD + 80) {
        detectedSnap = 'top_right';
      } else if (boundedX < SNAP_THRESHOLD && boundedY < SNAP_THRESHOLD + 80) {
        detectedSnap = 'top_left';
      } else if (boundedX > winW - cardW - SNAP_THRESHOLD && boundedY > winH - cardH - SNAP_THRESHOLD - 50) {
        detectedSnap = 'bottom_right';
      } else if (boundedX < SNAP_THRESHOLD && boundedY > winH - cardH - SNAP_THRESHOLD - 50) {
        detectedSnap = 'bottom_left';
      } else if (boundedX > winW - cardW - SNAP_THRESHOLD) {
        detectedSnap = 'center_right';
      }

      setDragHoverSnap(detectedSnap);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      if (dragHoverSnap) {
        setSnapPosition(dragHoverSnap);
        try {
          localStorage.setItem('genesis_snap_scope_pos', dragHoverSnap);
        } catch {}
      } else {
        setSnapPosition('free');
        try {
          localStorage.setItem('genesis_snap_scope_pos', 'free');
        } catch {}
      }
      setDragHoverSnap(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, currentWidth, isCollapsed, dragHoverSnap]);

  const handleSetSnap = (snap: SnapPosition) => {
    setSnapPosition(snap);
    try {
      localStorage.setItem('genesis_snap_scope_pos', snap);
    } catch {}
  };

  const handleToggleUnsnap = () => {
    if (snapPosition === 'free') {
      // Re-snap to top right
      handleSetSnap('top_right');
    } else {
      // Unsnap to free mode
      handleSetSnap('free');
    }
  };

  const handleSetSize = (sz: 'mini' | 'medium' | 'large' | 'xl') => {
    setSizePreset(sz);
    try {
      localStorage.setItem('genesis_snap_scope_size', sz);
    } catch {}
  };

  const handleToggleOpacity = () => {
    const next = opacityLevel >= 0.9 ? 0.75 : opacityLevel >= 0.7 ? 0.55 : opacityLevel >= 0.5 ? 0.4 : 0.95;
    setOpacityLevel(next);
    try {
      localStorage.setItem('genesis_snap_scope_opacity', next.toString());
    } catch {}
  };

  const handleSetViewMode = (mode: VisualizerViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('genesis_snap_scope_viewmode', mode);
    } catch {}
  };

  // Draw Dual Spectral Canvas (FFT X and FFT Y)
  useEffect(() => {
    if (viewMode !== 'spectral_dual' && viewMode !== 'correlation') return;
    const canvas = spectralCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#030814';
    ctx.fillRect(0, 0, w, h);

    // Grid lines & dB levels
    ctx.strokeStyle = '#0e1e38';
    ctx.lineWidth = 1;
    const dbSteps = [-12, -24, -36, -48, -60];
    ctx.font = '9px monospace';
    ctx.fillStyle = '#334e7a';

    dbSteps.forEach((db) => {
      const y = Math.round(((-db) / 70) * h);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.fillText(`${db}dB`, 4, y - 2);
    });

    // Freq Vertical Lines
    const freqMarkers = [100, 500, 1000, 5000, 10000];
    freqMarkers.forEach((f) => {
      const x = Math.round((Math.log10(f / 20) / Math.log10(20000 / 20)) * w);
      if (x > 0 && x < w) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
        ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 2, h - 4);
      }
    });

    // Synthetic fallback if no freqData passed
    const len = freqDataX ? freqDataX.length : 128;
    const dataX = freqDataX || new Uint8Array(len);
    const dataY = freqDataY || new Uint8Array(len);

    // If empty, generate slight activity representation from points
    if (!freqDataX && points.length > 0) {
      for (let i = 0; i < len; i++) {
        const pt = points[i % points.length] || [0, 0];
        dataX[i] = Math.min(255, Math.abs(pt[0]) * 200 + 20);
        dataY[i] = Math.min(255, Math.abs(pt[1]) * 200 + 20);
      }
    }

    // Draw Channel X (Cyan / Left)
    ctx.beginPath();
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 6;

    for (let i = 0; i < len; i++) {
      const val = dataX[i] / 255;
      const x = (i / len) * w;
      const y = h - val * (h - 10);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Channel Y (Amber / Right)
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 6;

    for (let i = 0; i < len; i++) {
      const val = dataY[i] / 255;
      const x = (i / len) * w;
      const y = h - val * (h - 10);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
  }, [freqDataX, freqDataY, points, viewMode]);

  // Draw Spectrogram Waterfall
  useEffect(() => {
    if (viewMode !== 'spectrogram') return;
    const canvas = spectrogramCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Shift previous image down by 2 pixels
    ctx.drawImage(canvas, 0, 0, w, h - 2, 0, 2, w, h - 2);

    const len = freqDataX ? Math.min(128, freqDataX.length) : 64;
    const colWidth = w / len;

    for (let i = 0; i < len; i++) {
      const valX = freqDataX ? freqDataX[i] / 255 : (points[i % points.length]?.[0] || 0) * 0.5 + 0.5;
      const valY = freqDataY ? freqDataY[i] / 255 : (points[i % points.length]?.[1] || 0) * 0.5 + 0.5;

      const r = Math.floor(Math.min(1, valY * 1.2) * 245);
      const g = Math.floor(Math.min(1, valX * 0.8 + valY * 0.5) * 230);
      const b = Math.floor(Math.min(1, valX * 1.4) * 255);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i * colWidth, 0, colWidth + 1, 2);
    }
  }, [freqDataX, freqDataY, points, viewMode]);

  return (
    <>
      {/* Visual Magnetic Snap Target Indicators when dragging */}
      {isDragging && (
        <div className="fixed inset-0 pointer-events-none z-[80]">
          {/* Top Right Snap Target */}
          <div
            className={`absolute top-20 right-5 w-64 h-64 rounded-3xl border-2 border-dashed transition-all flex items-center justify-center ${
              dragHoverSnap === 'top_right'
                ? 'bg-cyan-500/25 border-cyan-400 shadow-[0_0_30px_rgba(0,245,212,0.4)] scale-105'
                : 'bg-cyan-950/20 border-cyan-700/40 opacity-50'
            }`}
          >
            <span className="text-xs font-black text-cyan-300 font-mono">📍 SNAP HAUT-DROITE</span>
          </div>

          {/* Top Left Snap Target */}
          <div
            className={`absolute top-20 left-5 w-64 h-64 rounded-3xl border-2 border-dashed transition-all flex items-center justify-center ${
              dragHoverSnap === 'top_left'
                ? 'bg-cyan-500/25 border-cyan-400 shadow-[0_0_30px_rgba(0,245,212,0.4)] scale-105'
                : 'bg-cyan-950/20 border-cyan-700/40 opacity-50'
            }`}
          >
            <span className="text-xs font-black text-cyan-300 font-mono">📍 SNAP HAUT-GAUCHE</span>
          </div>

          {/* Bottom Right Snap Target */}
          <div
            className={`absolute bottom-16 right-5 w-64 h-64 rounded-3xl border-2 border-dashed transition-all flex items-center justify-center ${
              dragHoverSnap === 'bottom_right'
                ? 'bg-cyan-500/25 border-cyan-400 shadow-[0_0_30px_rgba(0,245,212,0.4)] scale-105'
                : 'bg-cyan-950/20 border-cyan-700/40 opacity-50'
            }`}
          >
            <span className="text-xs font-black text-cyan-300 font-mono">📍 SNAP BAS-DROITE</span>
          </div>

          {/* Bottom Left Snap Target */}
          <div
            className={`absolute bottom-16 left-5 w-64 h-64 rounded-3xl border-2 border-dashed transition-all flex items-center justify-center ${
              dragHoverSnap === 'bottom_left'
                ? 'bg-cyan-500/25 border-cyan-400 shadow-[0_0_30px_rgba(0,245,212,0.4)] scale-105'
                : 'bg-cyan-950/20 border-cyan-700/40 opacity-50'
            }`}
          >
            <span className="text-xs font-black text-cyan-300 font-mono">📍 SNAP BAS-GAUCHE</span>
          </div>
        </div>
      )}

      {/* Floating Snappable / Unsnappable Visualizer Window */}
      <div
        id="snappable-scope-window"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          width: `${currentWidth}px`,
          opacity: opacityLevel,
        }}
        className={`fixed top-0 left-0 z-[85] select-none rounded-3xl bg-[#040810]/98 border-2 ${
          isDragging
            ? 'border-cyan-400 shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_40px_rgba(0,245,212,0.35)] scale-[1.02]'
            : snapPosition === 'free'
            ? 'border-amber-500/60 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.2)]'
            : 'border-[#19325c] shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(0,245,212,0.15)]'
        } backdrop-blur-xl transition-shadow ${className}`}
      >
        {/* Drag Bar & Snap Toolbar */}
        <div
          onPointerDown={handlePointerDown}
          className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#08152e] via-[#0d2247] to-[#08152e] rounded-t-3xl border-b border-[#1c3866] cursor-grab active:cursor-grabbing text-xs font-mono"
        >
          {/* Left Grip Handle & Live Title */}
          <div className="flex items-center gap-2 overflow-hidden">
            <div
              className={`p-1 rounded border transition-colors ${
                snapPosition === 'free'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
              }`}
              title={snapPosition === 'free' ? 'Mode Libre (Désnappé) - Glissez pour déplacer' : 'Mode Aimanté (Snappé)'}
            >
              <Move className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[10px] font-black text-cyan-300 tracking-wider truncate flex items-center gap-1.5">
                <span>{viewMode === 'vector_crt' ? 'OSCILLOSCOPE VECTORIEL' : viewMode === 'spectral_dual' ? 'ANALYSEUR SPECTRAL' : 'SPECTROGRAMME RTA'}</span>
                {timecodeText && (
                  <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50 text-[9px]">
                    {timecodeText}
                  </span>
                )}
              </span>
              {currentLabel && (
                <span className="text-[9px] text-slate-400 truncate">{currentLabel}</span>
              )}
            </div>
          </div>

          {/* Snap / Unsnap Controls & Window Options */}
          <div className="flex items-center gap-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
            {/* Explicit Unsnap / Snap Toggle Button as requested by user */}
            <button
              type="button"
              onClick={handleToggleUnsnap}
              className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1 border transition-all ${
                snapPosition === 'free'
                  ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                  : 'bg-[#040915] text-cyan-300 border-[#1c3866] hover:border-cyan-500'
              }`}
              title={snapPosition === 'free' ? 'DÉSNAPPÉ (Libre) - Cliquez pour snapper' : 'AIMANTÉ (Snappé) - Cliquez pour DÉSNAPPER en mode libre'}
            >
              {snapPosition === 'free' ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              <span>{snapPosition === 'free' ? 'DÉSNAPPÉ' : 'SNAPPÉ'}</span>
            </button>

            {/* Quick Snap Selector */}
            <div className="flex items-center gap-0.5 bg-[#040915] p-0.5 rounded-lg border border-[#162d54]">
              <button
                type="button"
                onClick={() => handleSetSnap('top_left')}
                className={`p-1 rounded text-[9px] font-bold ${
                  snapPosition === 'top_left' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-cyan-300'
                }`}
                title="Snapper en Haut à Gauche"
              >
                ⬉
              </button>
              <button
                type="button"
                onClick={() => handleSetSnap('top_right')}
                className={`p-1 rounded text-[9px] font-bold ${
                  snapPosition === 'top_right' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-cyan-300'
                }`}
                title="Snapper en Haut à Droite"
              >
                ⬈
              </button>
              <button
                type="button"
                onClick={() => handleSetSnap('bottom_left')}
                className={`p-1 rounded text-[9px] font-bold ${
                  snapPosition === 'bottom_left' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-cyan-300'
                }`}
                title="Snapper en Bas à Gauche"
              >
                ⬋
              </button>
              <button
                type="button"
                onClick={() => handleSetSnap('bottom_right')}
                className={`p-1 rounded text-[9px] font-bold ${
                  snapPosition === 'bottom_right' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-cyan-300'
                }`}
                title="Snapper en Bas à Droite"
              >
                ⬊
              </button>
            </div>

            {/* Size Switcher */}
            <div className="flex items-center gap-0.5 bg-[#040915] p-0.5 rounded-lg border border-[#162d54]">
              {(['mini', 'medium', 'large'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleSetSize(sz)}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                    sizePreset === sz
                      ? 'bg-indigo-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Taille ${sz.toUpperCase()}`}
                >
                  {sz[0].toUpperCase()}
                </button>
              ))}
            </div>

            {/* Opacity Cycle Button */}
            <button
              type="button"
              onClick={handleToggleOpacity}
              className="p-1 rounded bg-[#040915] text-slate-300 hover:text-cyan-300 border border-[#162d54] text-[9px]"
              title={`Opacité (${Math.round(opacityLevel * 100)}%) - Cliquez pour alterner la transparence`}
            >
              <Eye className="w-3 h-3" />
            </button>

            {/* Collapse Toggle */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded bg-[#040915] text-slate-300 hover:text-cyan-300 border border-[#162d54]"
              title={isCollapsed ? 'Déplier le visualiseur' : 'Réduire en bandeau'}
            >
              {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>

            {/* Close Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded bg-[#040915] text-slate-400 hover:text-red-400 border border-[#162d54]"
                title="Fermer la fenêtre flottante"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* View Mode Switcher (Vectoriel vs Spectrale Dual vs Spectrogramme) */}
        {!isCollapsed && (
          <div className="px-3 pt-2 flex items-center justify-between border-b border-[#12223d] pb-2 bg-[#030713]">
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => handleSetViewMode('vector_crt')}
                className={`px-2 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all border ${
                  viewMode === 'vector_crt'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-sm'
                    : 'bg-[#060e1c] text-slate-400 border-[#14233c] hover:text-cyan-300'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>OSCILLO XY</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetViewMode('spectral_dual')}
                className={`px-2 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all border ${
                  viewMode === 'spectral_dual'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-[#060e1c] text-slate-400 border-[#14233c] hover:text-amber-300'
                }`}
              >
                <BarChart2 className="w-3 h-3" />
                <span>SPECTRALE FFT</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetViewMode('spectrogram')}
                className={`px-2 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all border ${
                  viewMode === 'spectrogram'
                    ? 'bg-purple-500 text-slate-950 border-purple-300 shadow-sm'
                    : 'bg-[#060e1c] text-slate-400 border-[#14233c] hover:text-purple-300'
                }`}
              >
                <Radio className="w-3 h-3" />
                <span>CASCADE 3D</span>
              </button>
            </div>

            {/* Quick Live Indicators */}
            <div className="flex items-center gap-2 text-[9px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                CH1 (X)
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                CH2 (Y)
              </span>
            </div>
          </div>
        )}

        {/* Visualizer Body (Collapsible) */}
        {!isCollapsed && (
          <div className="p-3 space-y-2">
            {/* View 1: CRT Vector Oscilloscope */}
            {viewMode === 'vector_crt' && (
              <ZoneCOscilloscope
                points={points}
                settings={settings}
                onSettingsChange={onSettingsChange}
                presetName={presetName}
                isPaused={isPaused}
                onTogglePause={onTogglePause}
                onNavigateToSource={onNavigateToSource}
              />
            )}

            {/* View 2: Dual Spectral FFT (CH1 Cyan / CH2 Amber) */}
            {viewMode === 'spectral_dual' && (
              <div className="space-y-2 bg-[#02050c] rounded-2xl p-2 border border-[#142646]">
                <canvas
                  ref={spectralCanvasRef}
                  width={currentWidth - 30}
                  height={Math.round((currentWidth - 30) * 0.6)}
                  className="w-full rounded-xl bg-[#030814] border border-[#0f1f3a] shadow-inner"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
                  <span>Plage : 20 Hz - 20 000 Hz</span>
                  <span>Échelle : Logarithmique / Stéréo FFT</span>
                </div>
              </div>
            )}

            {/* View 3: Spectrogram Waterfall */}
            {viewMode === 'spectrogram' && (
              <div className="space-y-2 bg-[#02050c] rounded-2xl p-2 border border-[#142646]">
                <canvas
                  ref={spectrogramCanvasRef}
                  width={currentWidth - 30}
                  height={Math.round((currentWidth - 30) * 0.6)}
                  className="w-full rounded-xl bg-[#030814] border border-[#0f1f3a] shadow-inner"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
                  <span>Cascade Temporelle (Waterfall)</span>
                  <span className="text-cyan-300">X = Cyan / Y = Ambre</span>
                </div>
              </div>
            )}

            {/* Mini Transport & Info Bar */}
            <div className="flex items-center justify-between px-2 py-1.5 bg-[#02050b] rounded-xl border border-[#12223d] text-[10px] text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                {onTogglePlay && (
                  <button
                    type="button"
                    onClick={onTogglePlay}
                    className={`px-2 py-0.5 rounded font-black flex items-center gap-1 border ${
                      isPlaying
                        ? 'bg-amber-950 text-amber-300 border-amber-600'
                        : 'bg-cyan-950 text-cyan-300 border-cyan-600'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                    <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                  </button>
                )}
                <span className="text-slate-500">Points : <strong className="text-cyan-400">{points.length}</strong></span>
              </div>

              <div className="flex items-center gap-2 text-[9px]">
                <span className="text-slate-500">ÉTAT :</span>
                <span className={snapPosition === 'free' ? 'text-amber-400 font-bold' : 'text-cyan-300 font-bold uppercase'}>
                  {snapPosition === 'free' ? 'LIBRE (DÉSNAPPÉ)' : snapPosition.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
