import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Maximize2,
  Minimize2,
  Move,
  Camera,
  RotateCw,
  Sun,
  Grid,
  Eye,
  Sliders,
  Sparkles,
  ExternalLink,
  Dock,
  Volume2
} from 'lucide-react';
import { ScopeDisplaySettings, FloatingWindowState } from '../types/vectorScope';
import { exportPointsToSvg, exportPointsToCsv } from '../services/mathEngine';
import { triggerBlobDownload, triggerTextDownload } from '../services/exportUtils';

interface FloatingScopeWindowProps {
  points: Array<[number, number]>;
  settings: ScopeDisplaySettings;
  onSettingsChange: (updates: Partial<ScopeDisplaySettings>) => void;
  floatingState: FloatingWindowState;
  onFloatingStateChange: (updates: Partial<FloatingWindowState>) => void;
  presetName: string;
  sourceLabel?: string;
}

export const FloatingScopeWindow: React.FC<FloatingScopeWindowProps> = ({
  points,
  settings,
  onSettingsChange,
  floatingState,
  onFloatingStateChange,
  presetName,
  sourceLabel = 'SIGNAL STEREO LIVE',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, origX: 0, origY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, origW: 0, origH: 0 });

  const [fps, setFps] = useState(60);
  const [showHud, setShowHud] = useState(true);
  const [isFrozen, setIsFrozen] = useState(false);
  const frozenPointsRef = useRef<Array<[number, number]>>([]);

  // Dragging logic
  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (floatingState.isFullscreen) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: floatingState.x,
      origY: floatingState.y,
    };
    e.preventDefault();
  };

  // Resizing logic
  const handleMouseDownResize = (e: React.MouseEvent) => {
    if (floatingState.isFullscreen) return;
    isResizingRef.current = true;
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origW: floatingState.width,
      origH: floatingState.height,
    };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        onFloatingStateChange({
          x: Math.max(0, Math.min(window.innerWidth - 200, dragStartRef.current.origX + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 150, dragStartRef.current.origY + dy)),
        });
      } else if (isResizingRef.current) {
        const dw = e.clientX - resizeStartRef.current.x;
        const dh = e.clientY - resizeStartRef.current.y;
        onFloatingStateChange({
          width: Math.max(340, Math.min(window.innerWidth - 40, resizeStartRef.current.origW + dw)),
          height: Math.max(340, Math.min(window.innerHeight - 40, resizeStartRef.current.origH + dh)),
        });
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [floatingState, onFloatingStateChange]);

  // Freeze toggle
  const handleToggleFreeze = () => {
    if (!isFrozen) {
      frozenPointsRef.current = [...points];
      setIsFrozen(true);
    } else {
      setIsFrozen(false);
    }
  };

  // Real-time Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2 + settings.centerX * (w * 0.4);
    const cy = h / 2 - settings.centerY * (h * 0.4);

    // Pick Theme Color
    let beamColorHex = '#00f5d4'; // Lotus Cyan
    let beamGlowHex = 'rgba(0, 245, 212, 0.45)';
    if (settings.colorTheme === 'green_crt') {
      beamColorHex = '#22c55e';
      beamGlowHex = 'rgba(34, 197, 94, 0.45)';
    } else if (settings.colorTheme === 'gold_amber') {
      beamColorHex = '#f59e0b';
      beamGlowHex = 'rgba(245, 158, 11, 0.45)';
    } else if (settings.colorTheme === 'arctic_white') {
      beamColorHex = '#f8fafc';
      beamGlowHex = 'rgba(248, 250, 252, 0.45)';
    }

    // Phosphor Decay / Accumulation handling
    if (settings.mode === 'accumulation') {
      ctx.fillStyle = 'rgba(3, 7, 18, 0.015)';
      ctx.fillRect(0, 0, w, h);
    } else {
      const alpha = Math.max(0.04, 1 - settings.persistence);
      ctx.fillStyle = `rgba(3, 7, 18, ${alpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Reticle & Graticule
    if (settings.showGrid) {
      const baseRadius = Math.min(w, h) * 0.42 * settings.zoom;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);

      // Polar Rings
      for (let rFrac of [0.25, 0.5, 0.75, 1.0]) {
        ctx.strokeStyle = rFrac === 1.0 ? 'rgba(56, 189, 248, 0.28)' : 'rgba(56, 189, 248, 0.12)';
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * rFrac, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Radial Rays
      for (let deg = 0; deg < 360; deg += 30) {
        const rad = (deg * Math.PI) / 180;
        ctx.strokeStyle = deg % 90 === 0 ? 'rgba(56, 189, 248, 0.22)' : 'rgba(56, 189, 248, 0.08)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(rad) * baseRadius, cy + Math.sin(rad) * baseRadius);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Cartesian Axes
    if (settings.showAxes) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // Tick marks on axes
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      const tickSpacing = (Math.min(w, h) * 0.42 * settings.zoom) / 4;
      for (let t = -4; t <= 4; t++) {
        if (t === 0) continue;
        const tx = cx + t * tickSpacing;
        const ty = cy + t * tickSpacing;
        ctx.beginPath();
        ctx.moveTo(tx, cy - 4);
        ctx.lineTo(tx, cy + 4);
        ctx.moveTo(cx - 4, ty);
        ctx.lineTo(cx + 4, ty);
        ctx.stroke();
      }
    }

    // Active Points
    const activePoints = isFrozen ? frozenPointsRef.current : points;
    if (activePoints.length > 1) {
      const scale = Math.min(w, h) * 0.42 * settings.zoom;
      const rotRad = (settings.rotation * Math.PI) / 180;
      const cosR = Math.cos(rotRad);
      const sinR = Math.sin(rotRad);

      const transformed: Array<[number, number]> = [];
      for (let i = 0; i < activePoints.length; i++) {
        const [rawX, rawY] = activePoints[i];
        const rx = rawX * cosR - rawY * sinR;
        const ry = rawX * sinR + rawY * cosR;
        const sx = cx + rx * scale;
        const sy = cy - ry * scale; // Invert Y for cartesian
        transformed.push([sx, sy]);
      }

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Pass 1: Phosphor Bloom Glow
      ctx.strokeStyle = beamGlowHex;
      ctx.lineWidth = settings.thickness * 2.8 * settings.brightness;
      ctx.beginPath();
      ctx.moveTo(transformed[0][0], transformed[0][1]);
      for (let i = 1; i < transformed.length; i++) {
        ctx.lineTo(transformed[i][0], transformed[i][1]);
      }
      ctx.stroke();

      // Pass 2: High Intensity Sharp Beam Core
      ctx.strokeStyle = beamColorHex;
      ctx.lineWidth = Math.max(1, settings.thickness * settings.brightness);
      ctx.beginPath();
      ctx.moveTo(transformed[0][0], transformed[0][1]);
      for (let i = 1; i < transformed.length; i++) {
        ctx.lineTo(transformed[i][0], transformed[i][1]);
      }
      ctx.stroke();

      ctx.restore();
    }
  }, [points, settings, isFrozen]);

  // Snapshot PNG
  const handleSavePng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) triggerBlobDownload(blob, `GENESIS_SCOPE_${presetName.replace(/\s+/g, '_')}_${Date.now()}.png`);
    });
  };

  const handleExportSvg = () => {
    const svgStr = exportPointsToSvg(points, 900, 900, settings.colorTheme === 'gold_amber' ? '#f59e0b' : '#00f5d4');
    triggerTextDownload(svgStr, `GENESIS_VECTOR_${presetName.replace(/\s+/g, '_')}.svg`, 'image/svg+xml');
  };

  const handleExportCsv = () => {
    const csvStr = exportPointsToCsv(points);
    triggerTextDownload(csvStr, `GENESIS_VECTOR_${presetName.replace(/\s+/g, '_')}.csv`, 'text/csv');
  };

  // Compute container styling based on floating state
  const isFloating = floatingState.isFloating;
  const isFullscreen = floatingState.isFullscreen;

  let containerStyle: React.CSSProperties = {};
  if (isFullscreen) {
    containerStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      borderRadius: 0,
    };
  } else if (isFloating) {
    containerStyle = {
      position: 'fixed',
      top: `${floatingState.y}px`,
      left: `${floatingState.x}px`,
      width: `${floatingState.width}px`,
      height: `${floatingState.height}px`,
      zIndex: 1000,
      boxShadow: '0 25px 60px -15px rgba(0, 245, 212, 0.25), 0 0 30px rgba(0,0,0,0.8)',
    };
  } else {
    containerStyle = {
      width: '100%',
      height: 'auto',
      aspectRatio: '1 / 1',
    };
  }

  const canvasWidth = isFullscreen ? window.innerWidth : isFloating ? floatingState.width - 24 : 600;
  const canvasHeight = isFullscreen ? window.innerHeight - 80 : isFloating ? floatingState.height - 84 : 600;

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={`bg-[#050b14] border border-[#14284b] rounded-xl flex flex-col overflow-hidden font-mono select-none transition-all duration-75 ${
        isFloating ? 'ring-1 ring-cyan-500/30' : ''
      }`}
    >
      {/* Scope Window Titlebar / Drag Handle */}
      <div
        onMouseDown={handleMouseDownHeader}
        className={`px-3 py-2 bg-[#081326] border-b border-[#14284b] flex items-center justify-between gap-2 ${
          isFloating ? 'cursor-move' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {isFloating && <Move className="w-3.5 h-3.5 text-cyan-400" />}
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-cyan-300 tracking-wider">
            OSCILLOSCOPE X/Y
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
            {sourceLabel}
          </span>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleFreeze}
            title={isFrozen ? 'Reprendre live' : 'Geler la trace (Freeze)'}
            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
              isFrozen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:text-cyan-300'
            }`}
          >
            {isFrozen ? 'GELÉ' : 'FREEZE'}
          </button>

          <button
            onClick={() => setShowHud(!showHud)}
            title="Afficher/Masquer le HUD"
            className={`p-1 rounded border ${
              showHud ? 'bg-cyan-950 text-cyan-300 border-cyan-800' : 'bg-slate-800/60 text-slate-400 border-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Color theme cycles */}
          <button
            onClick={() => {
              const themes: ScopeDisplaySettings['colorTheme'][] = [
                'cyan_phosphor',
                'green_crt',
                'gold_amber',
                'arctic_white',
              ];
              const nextIdx = (themes.indexOf(settings.colorTheme) + 1) % themes.length;
              onSettingsChange({ colorTheme: themes[nextIdx] });
            }}
            title="Changer thème phosphore (Cyan / Vert / Or / Blanc)"
            className="p-1 rounded bg-slate-800/60 text-slate-300 border border-slate-700 hover:text-cyan-300"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Float / Dock toggle */}
          <button
            onClick={() => onFloatingStateChange({ isFloating: !isFloating, isFullscreen: false })}
            title={isFloating ? 'Ré-ancrer la fenêtre' : 'Détacher en fenêtre flottante déplaçable'}
            className="p-1 rounded bg-slate-800/60 text-slate-300 border border-slate-700 hover:text-cyan-300"
          >
            {isFloating ? <Dock className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => onFloatingStateChange({ isFullscreen: !isFullscreen })}
            title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
            className="p-1 rounded bg-slate-800/60 text-slate-300 border border-slate-700 hover:text-cyan-300"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 bg-[#030712] flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full h-full block object-contain"
        />

        {/* HUD Info Overlay */}
        {showHud && (
          <>
            <div className="absolute top-2 left-2 pointer-events-none flex flex-col gap-1 text-[10px] text-cyan-400/80 bg-slate-950/70 p-2 rounded border border-cyan-900/40 backdrop-blur-sm">
              <span className="font-bold text-cyan-300">PRESET : {presetName}</span>
              <span>POINTS : {points.length} VECTEURS</span>
              <span>ZOOM : {(settings.zoom * 100).toFixed(0)}%</span>
              <span>ROTATION : {settings.rotation}°</span>
              <span>RÉMANENCE : {(settings.persistence * 100).toFixed(0)}%</span>
            </div>

            <div className="absolute top-2 right-2 pointer-events-none text-right flex flex-col gap-1 text-[10px] text-cyan-400/80 bg-slate-950/70 p-2 rounded border border-cyan-900/40 backdrop-blur-sm">
              <span className="font-bold text-amber-400">CH1 / X = GAUCHE</span>
              <span className="font-bold text-cyan-300">CH2 / Y = DROIT</span>
              <span>THÈME : {settings.colorTheme.toUpperCase()}</span>
            </div>
          </>
        )}

        {/* Floating Quick Controls Bar at Bottom */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between gap-2 p-1.5 bg-slate-950/80 border border-cyan-950/60 rounded-lg backdrop-blur-md text-[11px]">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-slate-400">
              <span>Zoom</span>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.05"
                value={settings.zoom}
                onChange={(e) => onSettingsChange({ zoom: parseFloat(e.target.value) })}
                className="w-16 accent-cyan-400 h-1 bg-slate-800 rounded"
              />
            </label>

            <label className="flex items-center gap-1.5 text-slate-400">
              <span>Persistance</span>
              <input
                type="range"
                min="0.1"
                max="0.96"
                step="0.02"
                value={settings.persistence}
                onChange={(e) => onSettingsChange({ persistence: parseFloat(e.target.value) })}
                className="w-16 accent-cyan-400 h-1 bg-slate-800 rounded"
              />
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSavePng}
              title="Capture d'écran PNG haute résolution"
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center gap-1"
            >
              <Camera className="w-3 h-3" />
              <span>PNG</span>
            </button>
            <button
              onClick={handleExportSvg}
              title="Export Vectoriel SVG infini"
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300"
            >
              SVG
            </button>
            <button
              onClick={handleExportCsv}
              title="Export Numérique CSV"
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              CSV
            </button>
          </div>
        </div>

        {/* Resizing Handle for Floating Mode */}
        {isFloating && !isFullscreen && (
          <div
            onMouseDown={handleMouseDownResize}
            title="Redimensionner la fenêtre"
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center text-cyan-500/70 hover:text-cyan-300"
          >
            ◢
          </div>
        )}
      </div>
    </div>
  );
};
