import React, { useState, useEffect, useRef } from 'react';
import {
  Type,
  ArrowRight,
  ArrowLeft,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Activity,
  Repeat,
  Compass
} from 'lucide-react';
import { VectorTextConfig } from '../types/vectorScope';
import { generateTextVectorPoints } from '../services/vectorFont';

interface VectorTextLabProps {
  onSendToOscilloscope: (points: Array<[number, number]>, text: string) => void;
  isActiveInScope: boolean;
}

export const VectorTextLab: React.FC<VectorTextLabProps> = ({
  onSendToOscilloscope,
  isActiveInScope,
}) => {
  const [config, setConfig] = useState<VectorTextConfig>({
    text: 'GENESIS LAB',
    scrollDirection: 'right_to_left',
    speed: 1.2,
    scale: 0.65,
    startOffset: 1.5,
    endOffset: -1.5,
    loop: true,
    letterSpacing: 0.85,
    mode: 'scroll',
    isActiveInScope: false,
  });

  const [currentScrollX, setCurrentScrollX] = useState(1.5);
  const [isPlaying, setIsPlaying] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  // Text animation loop
  useEffect(() => {
    const loop = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (isPlaying && config.mode === 'scroll') {
        setCurrentScrollX((prev) => {
          let next = prev;
          if (config.scrollDirection === 'right_to_left') {
            next -= config.speed * dt * 0.8;
            if (next < config.endOffset) {
              next = config.loop ? config.startOffset : config.endOffset;
            }
          } else {
            next += config.speed * dt * 0.8;
            if (next > config.startOffset) {
              next = config.loop ? config.endOffset : config.startOffset;
            }
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, config.mode, config.scrollDirection, config.speed, config.loop, config.startOffset, config.endOffset]);

  // Compute live points for current frame
  const scrollRange = Math.abs(config.startOffset - config.endOffset) || 1;
  const progress = Math.max(0, Math.min(1, (config.startOffset - currentScrollX) / scrollRange));
  const currentPoints = generateTextVectorPoints({
    text: config.text,
    scrollProgress: config.mode === 'scroll' ? progress : 0.5,
    scrollDirection: config.scrollDirection,
    scale: config.scale,
    letterSpacing: config.letterSpacing,
  });

  // Push to scope if currently active in scope
  useEffect(() => {
    if (isActiveInScope && currentPoints.length > 0) {
      onSendToOscilloscope(currentPoints, `TEXTE: ${config.text}`);
    }
  }, [currentScrollX, isActiveInScope, config.text]);

  // Render on preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Reticle
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (currentPoints.length > 1) {
      const cx = w / 2;
      const cy = h / 2;
      const scale = w * 0.42;

      ctx.save();
      // Glow beam
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx + currentPoints[0][0] * scale, cy - currentPoints[0][1] * scale);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(cx + currentPoints[i][0] * scale, cy - currentPoints[i][1] * scale);
      }
      ctx.stroke();

      // Sharp beam
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx + currentPoints[0][0] * scale, cy - currentPoints[0][1] * scale);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(cx + currentPoints[i][0] * scale, cy - currentPoints[i][1] * scale);
      }
      ctx.stroke();

      ctx.restore();
    }
  }, [currentPoints]);

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-xl p-4 font-mono text-xs text-slate-300 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14233c] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
            <Type className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              GÉNÉRATEUR DE TEXTE VECTORIEL ANIMÉ
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/40 text-cyan-400">
                POLICE VECTORIELLE HERSHEY / STROKE
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Défilement horizontal paramétrable, vitesse, taille, marges début/fin et tracé laser par déflexion audio XY.
            </p>
          </div>
        </div>

        {/* Live Audio Injection */}
        <button
          onClick={() => onSendToOscilloscope(currentPoints, `TEXTE: ${config.text}`)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${
            isActiveInScope
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
              : 'bg-slate-800/80 text-cyan-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isActiveInScope ? 'EN COURS DANS OSCILLOSCOPE' : "DIFFUSER DANS L'OSCILLOSCOPE"}</span>
        </button>
      </div>

      {/* Text Input and Direction Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#060c18] p-3 rounded-lg border border-[#14233c]">
        {/* Text Input */}
        <div className="md:col-span-5 flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Texte :</span>
          <input
            type="text"
            value={config.text}
            onChange={(e) => setConfig({ ...config, text: e.target.value.toUpperCase() })}
            placeholder="ENTREZ VOTRE TEXTE..."
            className="flex-1 bg-[#0a1324] border border-cyan-800/50 rounded px-2.5 py-1 text-cyan-300 font-bold uppercase tracking-wider text-xs"
          />
        </div>

        {/* Direction Toggle */}
        <div className="md:col-span-4 flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Direction :</span>
          <button
            onClick={() => setConfig({ ...config, scrollDirection: 'right_to_left' })}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border flex items-center gap-1 transition-colors ${
              config.scrollDirection === 'right_to_left'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Droite → Gauche</span>
          </button>
          <button
            onClick={() => setConfig({ ...config, scrollDirection: 'left_to_right' })}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border flex items-center gap-1 transition-colors ${
              config.scrollDirection === 'left_to_right'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <ArrowRight className="w-3 h-3" />
            <span>Gauche → Droite</span>
          </button>
        </div>

        {/* Mode Selector */}
        <div className="md:col-span-3 flex items-center justify-end gap-2">
          <span className="text-[11px] text-slate-400">Mode :</span>
          <select
            value={config.mode}
            onChange={(e) => setConfig({ ...config, mode: e.target.value as any })}
            className="bg-[#0a1324] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
          >
            <option value="scroll">Défilement continu</option>
            <option value="static">Statique centré</option>
          </select>
        </div>
      </div>

      {/* Speed, Scale, Margins Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#081326] p-3 rounded-lg border border-[#14284b]">
        {/* Speed */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Vitesse de défilement :</span>
            <span className="text-cyan-300 font-bold">{config.speed.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="4.0"
            step="0.1"
            value={config.speed}
            onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
          />
        </div>

        {/* Scale */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Taille / Échelle :</span>
            <span className="text-cyan-300 font-bold">{config.scale.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.4"
            step="0.05"
            value={config.scale}
            onChange={(e) => setConfig({ ...config, scale: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
          />
        </div>

        {/* Start / End Offset */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Zone Début / Fin :</span>
            <span className="text-cyan-300 font-bold">±{config.startOffset.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="2.5"
            step="0.1"
            value={config.startOffset}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setConfig({ ...config, startOffset: val, endOffset: -val });
            }}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
          />
        </div>

        {/* Transport Actions */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1 rounded font-bold border flex items-center gap-1.5 transition-colors ${
              isPlaying ? 'bg-amber-950/80 text-amber-300 border-amber-700' : 'bg-cyan-950 text-cyan-300 border-cyan-800'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={() => setCurrentScrollX(config.startOffset)}
            title="Rembobiner au début"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={config.loop}
              onChange={(e) => setConfig({ ...config, loop: e.target.checked })}
              className="accent-cyan-400 rounded"
            />
            <span>Boucle</span>
          </label>
        </div>
      </div>

      {/* Canvas Beam Preview */}
      <div className="bg-[#050b14] border border-[#14233c] rounded-lg p-3 flex flex-col items-center">
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-1 mb-2">
          <span className="text-[11px] text-cyan-400 font-bold">APERÇU OSCILLOSCOPE FAISCEAU STROKE</span>
          <span className="text-[10px] text-slate-500">
            {currentPoints.length} NOEUDS VECTEURS • POSITION X : {currentScrollX.toFixed(2)}
          </span>
        </div>
        <div className="w-full h-56 bg-[#030712] border border-slate-800 rounded flex items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} width={640} height={220} className="w-full h-full block" />
        </div>
      </div>
    </div>
  );
};
