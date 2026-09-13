import React, { useState, useEffect, useRef } from 'react';
import { Compass, Sparkles, Zap, RotateCw, Play, Info, Activity, Sliders, CheckCircle2 } from 'lucide-react';
import { ChannelConfig } from '../types/vectorScope';
import { generateVortexPoints } from '../services/mathEngine';

interface VortexDesignerProps {
  onApplyVortexToScope: (vortexParams: VortexParams) => void;
}

export interface VortexParams {
  baseFreq: number;
  decaySpiral: number;
  radialModDepth: number;
  radialModFreq: number;
  phaseDrift: number;
  rotationRate: number;
  mandalaMorph: number;
  kPetals: number;
}

const VORTEX_PRESETS: Array<{ name: string; desc: string; params: VortexParams }> = [
  {
    name: 'Vortex Cosmique Standard',
    desc: 'Spirale logarithmique avec 5 ondulations radiales',
    params: { baseFreq: 220, decaySpiral: 0.35, radialModDepth: 0.25, radialModFreq: 6, phaseDrift: 15, rotationRate: 0.5, mandalaMorph: 0.4, kPetals: 5 }
  },
  {
    name: 'Rosette Harmonique 8 Pétales',
    desc: 'Morphing symétrique en étoile de fleurs',
    params: { baseFreq: 440, decaySpiral: 0.1, radialModDepth: 0.45, radialModFreq: 8, phaseDrift: 0, rotationRate: 0.8, mandalaMorph: 0.85, kPetals: 8 }
  },
  {
    name: 'Spirale d\'Archimède Pure',
    desc: 'Enroulement polaire régulier à dérive continue',
    params: { baseFreq: 150, decaySpiral: 0.7, radialModDepth: 0.05, radialModFreq: 4, phaseDrift: 30, rotationRate: 0.3, mandalaMorph: 0.1, kPetals: 3 }
  },
  {
    name: 'Onde Électromagnétique Radiale',
    desc: 'Modulation ultra-rapide à 12 ripples',
    params: { baseFreq: 330, decaySpiral: 0.25, radialModDepth: 0.6, radialModFreq: 12, phaseDrift: 45, rotationRate: 1.2, mandalaMorph: 0.5, kPetals: 6 }
  }
];

export const VortexDesigner: React.FC<VortexDesignerProps> = ({ onApplyVortexToScope }) => {
  const [params, setParams] = useState<VortexParams>({
    baseFreq: 220,
    decaySpiral: 0.35,
    radialModDepth: 0.25,
    radialModFreq: 6,
    phaseDrift: 15,
    rotationRate: 0.5,
    mandalaMorph: 0.4,
    kPetals: 5,
  });

  const [activePresetName, setActivePresetName] = useState<string>('Vortex Cosmique Standard');
  const [isLiveAutoSync, setIsLiveAutoSync] = useState<boolean>(true);
  const [justActivated, setJustActivated] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);


  const updateParam = (key: keyof VortexParams, val: number) => {
    const updated = { ...params, [key]: val };
    setParams(updated);
    if (isLiveAutoSync) {
      onApplyVortexToScope(updated);
    }
  };

  const handleApplyPreset = (preset: typeof VORTEX_PRESETS[0]) => {
    setParams(preset.params);
    setActivePresetName(preset.name);
    onApplyVortexToScope(preset.params);
    flashActivated();
  };

  const handleManualActivate = () => {
    onApplyVortexToScope(params);
    flashActivated();
  };

  const flashActivated = () => {
    setJustActivated(true);
    setTimeout(() => setJustActivated(false), 1500);
  };

  // Draw local interactive CRT vector preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let localPhase = 0;

    const render = () => {
      localPhase += params.rotationRate * 0.03;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(cx, cy) * 0.88;

      ctx.fillStyle = '#02050e';
      ctx.fillRect(0, 0, w, h);

      // Polar concentric circles & reticle
      ctx.strokeStyle = '#0e2240';
      ctx.lineWidth = 1;
      for (let r = 0.25; r <= 1.0; r += 0.25) {
        ctx.beginPath();
        ctx.arc(cx, cy, scale * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();

      // Generate points with animated rotation
      const pts = generateVortexPoints(params, 500);

      // Draw phosphorescent glowing vortex trace
      ctx.shadowColor = '#00f5d4';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 2.2;
      ctx.beginPath();

      const rotCos = Math.cos(localPhase);
      const rotSin = Math.sin(localPhase);

      pts.forEach(([px, py], i) => {
        const rx = px * rotCos - py * rotSin;
        const ry = px * rotSin + py * rotCos;
        const sx = cx + rx * scale;
        const sy = cy - ry * scale;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });

      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [params]);

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-5 font-mono text-xs text-slate-300 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-sm tracking-wide flex items-center gap-2">
              <span>VORTEX DESIGNER — TRANSFORMATIONS GÉOMÉTRIQUES VECTORIELLES</span>
              <span className="px-2 py-0.5 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                TEMPS RÉEL X/Y
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Modulation radiale continue, spirales polaires et morphing harmonique vers rosette
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060c18] border border-[#162d54] text-[11px] text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isLiveAutoSync}
              onChange={(e) => setIsLiveAutoSync(e.target.checked)}
              className="accent-cyan-400 rounded"
            />
            <span>Auto-Sync direct</span>
          </label>

          <button
            onClick={handleManualActivate}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all text-xs border ${
              justActivated
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-emerald-500/40 scale-105'
                : 'bg-cyan-500 text-slate-950 border-cyan-300 hover:bg-cyan-400 shadow-cyan-500/20'
            }`}
          >
            {justActivated ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
            <span>{justActivated ? 'ACTIVÉ SUR L\'OSCILLOSCOPE !' : 'ACTIVER SUR LE SCOPE X/Y'}</span>
          </button>
        </div>
      </div>

      {/* Quick Presets Carousel */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
          PRÉRÉGLAGES VORTEX RAPIDES :
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {VORTEX_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activePresetName === p.name
                  ? 'bg-gradient-to-r from-cyan-950/80 to-[#0c2244] border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,245,212,0.15)]'
                  : 'bg-[#060c18] border-[#14233c] text-slate-400 hover:border-cyan-600/50 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-xs text-cyan-300 truncate">{p.name}</div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Visualizer & Equations Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left / Top: Integrated Live CRT Vector Canvas */}
        <div className="lg:col-span-5 bg-[#030611] rounded-2xl p-3 border border-[#142646] flex flex-col items-center justify-between space-y-2">
          <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              TRACE VECTORIELLE POLAIRE (LIVE)
            </span>
            <span className="text-slate-500">500 pts / 60 FPS</span>
          </div>

          <div className="relative w-full aspect-square max-w-[280px]">
            <canvas
              ref={previewCanvasRef}
              width={300}
              height={300}
              className="w-full h-full rounded-xl border border-[#13284d] bg-[#02050e] shadow-inner shadow-cyan-950/50"
            />
          </div>

          <div className="w-full flex items-center justify-between text-[9px] text-slate-400 font-mono px-1">
            <span>Canal X: <strong className="text-cyan-300">{params.baseFreq} Hz</strong></span>
            <span>Rotation: <strong className="text-amber-400">{params.rotationRate.toFixed(1)} tr/s</strong></span>
          </div>
        </div>

        {/* Right: Mathematical Equations & Scientific Explanation */}
        <div className="lg:col-span-7 space-y-3">
          {/* Scientific Notice */}
          <div className="bg-[#060c18] border border-cyan-500/20 p-3 rounded-xl flex items-start gap-3">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-cyan-300">SYNCHRONISATION X/Y :</strong> Le moteur génère un signal en quadrature
              audio stéréophonique alimentant simultanément l'oscilloscope vectoriel en coordonnées polaires r(θ) et la sortie audio.
            </p>
          </div>

          {/* Mathematical Equations Card */}
          <div className="bg-[#040810] p-3.5 rounded-xl border border-[#162a4a] space-y-2">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
              ÉQUATIONS MATHÉMATIQUES VECTORIELLES :
            </span>
            <div className="bg-[#070e1c] p-3 rounded-lg border border-[#122036] font-mono text-[11px] text-cyan-200 space-y-1">
              <div>
                r(θ) = [ (1 - α) · r_spiral(θ) + α · |cos({params.kPetals}θ)| ] · [ 1 + {params.radialModDepth.toFixed(2)} · sin({params.radialModFreq}θ) ]
              </div>
              <div className="text-slate-400 text-[10px]">
                X(t) = r(θ) · cos(2π · {params.baseFreq} · t + {params.phaseDrift}° · t)
              </div>
              <div className="text-slate-400 text-[10px]">
                Y(t) = r(θ) · sin(2π · {params.baseFreq} · t + {params.phaseDrift}° · t)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progressive Design Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Base Frequency */}
        <div className="bg-[#060c18] p-3 rounded-xl border border-[#14233c] space-y-2">
          <div className="flex justify-between text-slate-300">
            <span>1. Fréquence Base :</span>
            <span className="text-cyan-300 font-bold">{params.baseFreq} Hz</span>
          </div>
          <input
            type="range"
            min="40"
            max="880"
            step="5"
            value={params.baseFreq}
            onChange={(e) => updateParam('baseFreq', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* 2. Spiral Decay Factor */}
        <div className="bg-[#060c18] p-3 rounded-xl border border-[#14233c] space-y-2">
          <div className="flex justify-between text-slate-300">
            <span>2. Taux Spirale :</span>
            <span className="text-cyan-300 font-bold">{(params.decaySpiral * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={params.decaySpiral}
            onChange={(e) => updateParam('decaySpiral', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* 3. Radial Modulation Depth */}
        <div className="bg-[#060c18] p-3 rounded-xl border border-[#14233c] space-y-2">
          <div className="flex justify-between text-slate-300">
            <span>3. Ondulations Radiales :</span>
            <span className="text-cyan-300 font-bold">{(params.radialModDepth * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.05"
            value={params.radialModDepth}
            onChange={(e) => updateParam('radialModDepth', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* 4. Ripple Frequency */}
        <div className="bg-[#060c18] p-3 rounded-xl border border-[#14233c] space-y-2">
          <div className="flex justify-between text-slate-300">
            <span>4. Périodes Ripple :</span>
            <span className="text-cyan-300 font-bold">{params.radialModFreq}x</span>
          </div>
          <input
            type="range"
            min="2"
            max="16"
            step="1"
            value={params.radialModFreq}
            onChange={(e) => updateParam('radialModFreq', parseInt(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* 5. Continuous Rotation Rate */}
        <div className="bg-[#060c18] p-3 rounded-xl border border-[#14233c] space-y-2">
          <div className="flex justify-between text-slate-300">
            <span>5. Vitesse Rotation :</span>
            <span className="text-amber-400 font-bold">{params.rotationRate.toFixed(1)} tr/s</span>
          </div>
          <input
            type="range"
            min="0"
            max="4"
            step="0.1"
            value={params.rotationRate}
            onChange={(e) => updateParam('rotationRate', parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* 6. Dynamic Phase Drift */}
        <div className="bg-[#060c18] p-3 rounded-xl border border-[#14233c] space-y-2">
          <div className="flex justify-between text-slate-300">
            <span>6. Dérive Phase :</span>
            <span className="text-amber-400 font-bold">{params.phaseDrift.toFixed(0)}°/s</span>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            step="1"
            value={params.phaseDrift}
            onChange={(e) => updateParam('phaseDrift', parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* 7. Mandala Morph Ratio */}
        <div className="bg-[#060c18] p-3 rounded-xl border border-[#14233c] space-y-2">
          <div className="flex justify-between text-slate-300">
            <span>7. Morphing Rosette :</span>
            <span className="text-cyan-300 font-bold">{(params.mandalaMorph * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={params.mandalaMorph}
            onChange={(e) => updateParam('mandalaMorph', parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* 8. Rosette Petals (k) */}
        <div className="bg-[#060c18] p-3 rounded-xl border border-[#14233c] space-y-2">
          <div className="flex justify-between text-slate-300">
            <span>8. Pétales Rosette :</span>
            <span className="text-cyan-300 font-bold">k = {params.kPetals}</span>
          </div>
          <input
            type="range"
            min="2"
            max="12"
            step="1"
            value={params.kPetals}
            onChange={(e) => updateParam('kPetals', parseInt(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
