import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX, Mic, CheckCircle2, Sliders, Waves, Power, Lock, Unlock } from 'lucide-react';
import {
  OctaGeneratorConfig,
  TuningMode,
  WaveformType,
  ZoneKey
} from '../types/vectorScope';
import { computeQuarterToneFreq, getQuarterToneLabel, evalWaveform } from '../services/mathEngine';

interface OctaGeneratorCardProps {
  config: OctaGeneratorConfig;
  tuningMode: TuningMode;
  masterFrequency: number;
  onUpdate: (updates: Partial<OctaGeneratorConfig>) => void;
  accent: 'cyan' | 'amber';
}

export const OctaGeneratorCard: React.FC<OctaGeneratorCardProps> = ({
  config,
  tuningMode,
  masterFrequency,
  onUpdate,
  accent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const baseF = tuningMode === 'LOCKED' ? masterFrequency : config.baseFrequency;
  const effectiveFreq = computeQuarterToneFreq(baseF, config.quarterToneOffset);
  const quarterToneLabel = getQuarterToneLabel(config.quarterToneOffset);

  // Mini live wave preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, w, h);

    // Center line
    ctx.strokeStyle = '#0e1c2e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (!config.enabled || config.mute) {
      // Muted line
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      return;
    }

    // Draw single cycle of current waveform
    ctx.strokeStyle = accent === 'cyan' ? '#00f5d4' : '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();

    const cycles = 2;
    for (let x = 0; x < w; x++) {
      const phase = (x / w) * cycles * 2 * Math.PI + (config.phase * Math.PI) / 180;
      const raw = evalWaveform(config.waveform, phase, config.customHarmonics);
      const val = (raw * config.amplitude * config.polarity + config.offset) * config.gain;
      const y = (0.5 - val * 0.42) * h;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [config, accent]);

  const badgeColor =
    accent === 'cyan'
      ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-400'
      : 'bg-amber-950/70 border-amber-500/40 text-amber-400';

  const glowBorder =
    config.enabled && !config.mute
      ? accent === 'cyan'
        ? 'border-cyan-900/60 shadow-[0_0_12px_rgba(0,245,212,0.06)]'
        : 'border-amber-900/60 shadow-[0_0_12px_rgba(245,158,11,0.06)]'
      : 'border-slate-800/80 opacity-60';

  return (
    <div
      id={`zone-${config.zoneKey.toLowerCase()}-${config.id.toLowerCase()}`}
      className={`bg-[#070e1c] border rounded-lg p-3 transition-all ${glowBorder}`}
    >
      {/* Top Header: Zone Badge + Generator Name + Controls */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border tracking-wider ${badgeColor}`}
          >
            ZONE {config.zoneKey}
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-100 font-mono tracking-wide">
                {config.id}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {config.channel === 'L' ? '• CANAL GAUCHE (X)' : '• CANAL DROIT (Y)'}
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500">
              {config.name}
            </span>
          </div>
        </div>

        {/* Buttons: ON/OFF, MUTE, SOLO, POLARITY */}
        <div className="flex items-center gap-1">
          <button
            id={`btn-power-${config.id}`}
            onClick={() => onUpdate({ enabled: !config.enabled })}
            title={config.enabled ? 'Désactiver oscillateur' : 'Activer oscillateur'}
            className={`p-1 rounded text-xs transition-colors ${
              config.enabled
                ? accent === 'cyan'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>

          <button
            id={`btn-mute-${config.id}`}
            onClick={() => onUpdate({ mute: !config.mute })}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
              config.mute
                ? 'bg-red-900/40 text-red-300 border border-red-500/60'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            {config.mute ? <VolumeX className="w-3 h-3 inline" /> : 'M'}
          </button>

          <button
            id={`btn-solo-${config.id}`}
            onClick={() => onUpdate({ solo: !config.solo })}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
              config.solo
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            S
          </button>

          <button
            id={`btn-polarity-${config.id}`}
            onClick={() => onUpdate({ polarity: config.polarity === 1 ? -1 : 1 })}
            title="Inverser la polarité (+ / -)"
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
              config.polarity === -1
                ? 'bg-purple-900/50 text-purple-300 border border-purple-500/50'
                : 'bg-slate-800/80 text-slate-400'
            }`}
          >
            {config.polarity === 1 ? '+1' : '-1'}
          </button>
        </div>
      </div>

      {/* Grid: Left = Wave & Freq & Quarters / Right = Sliders & Mini Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left Column: Waveform, Frequency & Quarter-Tone */}
        <div className="space-y-2.5">
          {/* Waveform Selector */}
          <div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
              <span>FORME D'ONDE</span>
              <span className="text-slate-500 capitalize">{config.waveform.replace('_', ' ')}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  ['sine', 'Sin'],
                  ['cosine', 'Cos'],
                  ['triangle', 'Tri'],
                  ['square', 'Car'],
                  ['sawtooth_up', 'Scie ↑'],
                  ['sawtooth_down', 'Scie ↓'],
                  ['custom', 'Table'],
                ] as const
              ).map(([wf, label]) => (
                <button
                  key={wf}
                  id={`btn-wave-${config.id}-${wf}`}
                  onClick={() => onUpdate({ waveform: wf as WaveformType })}
                  className={`px-1.5 py-1 text-[10px] font-mono rounded transition-colors ${
                    config.waveform === wf
                      ? accent === 'cyan'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Base Frequency Control */}
          <div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
              <span className="flex items-center gap-1">
                {tuningMode === 'LOCKED' ? (
                  <>
                    <Lock className="w-2.5 h-2.5 text-cyan-400" />
                    <span>FRÉQUENCE CENTRALE (LOCKED)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-2.5 h-2.5 text-amber-400" />
                    <span>FRÉQUENCE DE BASE f0 (FREE)</span>
                  </>
                )}
              </span>
              <span className="font-mono text-slate-200">{baseF.toFixed(1)} Hz</span>
            </div>
            {tuningMode === 'FREE' ? (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="20"
                  max="1200"
                  step="0.5"
                  value={config.baseFrequency}
                  onChange={(e) => onUpdate({ baseFrequency: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
                />
                <input
                  type="number"
                  min="1"
                  max="20000"
                  value={config.baseFrequency}
                  onChange={(e) => onUpdate({ baseFrequency: Math.max(1, parseFloat(e.target.value) || 1) })}
                  className="w-16 bg-[#040810] border border-slate-700 text-slate-200 text-[10px] font-mono px-1 py-0.5 rounded text-right"
                />
              </div>
            ) : (
              <div className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/20 border border-cyan-900/40 px-2 py-1 rounded flex justify-between">
                <span>Pilote Master : {masterFrequency} Hz</span>
                <span>Mode Synchro</span>
              </div>
            )}
          </div>

          {/* QUARTER-TONE OFFSET (-24 to +24) */}
          <div className="bg-[#040812] border border-slate-800/80 rounded p-2">
            <div className="flex justify-between items-center text-[10px] font-mono mb-1">
              <span className="text-slate-300 font-bold flex items-center gap-1">
                <Sliders className="w-3 h-3 text-cyan-400" />
                QUART DE TON (n)
              </span>
              <span
                className={`font-mono font-bold px-1.5 py-0.2 rounded text-[11px] ${
                  config.quarterToneOffset === 0
                    ? 'text-slate-400'
                    : config.quarterToneOffset > 0
                    ? 'text-emerald-400 bg-emerald-950/40'
                    : 'text-sky-400 bg-sky-950/40'
                }`}
              >
                {config.quarterToneOffset > 0 ? `+${config.quarterToneOffset}` : config.quarterToneOffset}
              </span>
            </div>

            {/* Slider -24 .. +24 */}
            <input
              id={`slider-quarter-${config.id}`}
              type="range"
              min="-24"
              max="24"
              step="1"
              value={config.quarterToneOffset}
              onChange={(e) => onUpdate({ quarterToneOffset: parseInt(e.target.value, 10) })}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer mb-2"
            />

            {/* Step buttons & calculation display */}
            <div className="flex items-center justify-between gap-1 text-[9px] font-mono mb-1.5">
              <div className="flex gap-1">
                <button
                  onClick={() => onUpdate({ quarterToneOffset: Math.max(-24, config.quarterToneOffset - 1) })}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  -1 qt
                </button>
                <button
                  onClick={() => onUpdate({ quarterToneOffset: 0 })}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                >
                  0
                </button>
                <button
                  onClick={() => onUpdate({ quarterToneOffset: Math.min(24, config.quarterToneOffset + 1) })}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  +1 qt
                </button>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => onUpdate({ quarterToneOffset: config.quarterToneOffset + 2 })}
                  title="+1 demi-ton (+100 cents)"
                  className="px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 rounded text-[8px]"
                >
                  +½ ton
                </button>
                <button
                  onClick={() => onUpdate({ quarterToneOffset: config.quarterToneOffset - 2 })}
                  title="-1 demi-ton (-100 cents)"
                  className="px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 rounded text-[8px]"
                >
                  -½ ton
                </button>
              </div>
            </div>

            {/* Effective Frequency Result Display */}
            <div className="flex items-center justify-between text-[10px] font-mono bg-[#060c18] px-2 py-1 rounded border border-slate-800">
              <span className="text-slate-400">{quarterToneLabel}</span>
              <span className="text-cyan-300 font-bold">
                f = {effectiveFreq.toFixed(2)} Hz
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Amplitude, Gain, Phase, Offset, Modulation & Wave Preview */}
        <div className="space-y-2.5">
          {/* Amplitude & Gain Sliders */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                <span>AMPLITUDE</span>
                <span className="text-slate-200">{Math.round(config.amplitude * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={config.amplitude}
                onChange={(e) => onUpdate({ amplitude: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                <span>GAIN</span>
                <span className="text-slate-200">{config.gain.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={config.gain}
                onChange={(e) => onUpdate({ gain: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Phase & DC Offset */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                <span>PHASE</span>
                <span className="text-slate-200">{Math.round(config.phase)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={config.phase}
                onChange={(e) => onUpdate({ phase: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-1">
                {[0, 45, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => onUpdate({ phase: deg })}
                    className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                      Math.round(config.phase) === deg
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                <span>OFFSET DC</span>
                <span className="text-slate-200">{config.offset.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.02"
                value={config.offset}
                onChange={(e) => onUpdate({ offset: parseFloat(e.target.value) })}
                className="w-full accent-purple-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
              />
              <button
                onClick={() => onUpdate({ offset: 0 })}
                className="text-[8px] font-mono text-slate-500 hover:text-slate-300 block mt-1"
              >
                Reset DC 0.0
              </button>
            </div>
          </div>

          {/* Modulation FM (Depth & Rate) */}
          <div className="bg-[#040810] border border-slate-800/80 rounded p-1.5">
            <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
              <span>MODULATION FM</span>
              <span>{Math.round(config.fmDepth * 100)}% @ {config.fmRate} Hz</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={config.fmDepth}
                onChange={(e) => onUpdate({ fmDepth: parseFloat(e.target.value) })}
                className="w-full accent-pink-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
              />
              <input
                type="range"
                min="0.1"
                max="30"
                step="0.5"
                value={config.fmRate}
                onChange={(e) => onUpdate({ fmRate: parseFloat(e.target.value) })}
                className="w-full accent-pink-400 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Mini Waveform Canvas */}
          <div className="bg-[#030712] border border-slate-800 rounded overflow-hidden h-14 relative flex items-center justify-center">
            <canvas ref={canvasRef} width={280} height={56} className="w-full h-full block" />
            <span className="absolute top-1 right-2 text-[8px] font-mono text-slate-500 uppercase">
              Oscillogramme {config.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
