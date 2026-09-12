import React, { useState } from 'react';
import { Compass, Sparkles, Zap, RotateCw, Play, Info } from 'lucide-react';
import { ChannelConfig } from '../types/vectorScope';

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

  const updateParam = (key: keyof VortexParams, val: number) => {
    const updated = { ...params, [key]: val };
    setParams(updated);
    onApplyVortexToScope(updated);
  };

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-5 font-mono text-xs text-slate-300 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-sm tracking-wide">
              VORTEX DESIGNER — TRANSFORMATIONS GÉOMÉTRIQUES VECTORIELLES
            </h2>
            <p className="text-[11px] text-slate-400">
              Modulation radiale continue, spirales polaires et morphing harmonique vers rosette
            </p>
          </div>
        </div>

        <button
          onClick={() => onApplyVortexToScope(params)}
          className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all text-xs"
        >
          <Zap className="w-3.5 h-3.5 fill-current" /> ACTIVER SUR LE SCOPE X/Y
        </button>
      </div>

      {/* Scientific Notice */}
      <div className="bg-[#060c18] border border-cyan-500/20 p-3 rounded-xl flex items-start gap-3">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-cyan-300">AVIS SCIENTIFIQUE :</strong> Le terme « vortex » désigne
          ici exclusivement une transformation géométrique plane en coordonnées polaires et une trajectoire
          audio stéréo X/Y synchronisée. Il s'agit d'une cartographie purement mathématique de phases et de fréquences.
        </p>
      </div>

      {/* Mathematical Equations Card */}
      <div className="bg-[#040810] p-3.5 rounded-xl border border-[#162a4a] space-y-2">
        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
          ÉQUATIONS MATHÉMATIQUES EN COURS D'EXÉCUTION :
        </span>
        <div className="bg-[#070e1c] p-3 rounded-lg border border-[#122036] font-mono text-[11px] text-cyan-200 space-y-1">
          <div>
            r(θ) = [ (1 - α) · r_spiral(θ) + α · |cos({params.kPetals}θ)| ] · [ 1 + {params.radialModDepth.toFixed(2)} · sin({params.radialModFreq}θ) ]
          </div>
          <div className="text-slate-400 text-[10px]">
            X(t) = r(θ) · cos(2π·{params.baseFreq}·t + {params.phaseDrift}°·t)
          </div>
          <div className="text-slate-400 text-[10px]">
            Y(t) = r(θ) · sin(2π·{params.baseFreq}·t + {params.phaseDrift}°·t)
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
