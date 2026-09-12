import React from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Sparkles,
  Zap,
  RotateCcw,
  ShieldAlert,
  Activity
} from 'lucide-react';
import {
  OctaSystemState,
  TuningMode,
  PresetName,
  OctaMixerChannel
} from '../types/vectorScope';

interface OctaMixerPanelProps {
  state: OctaSystemState;
  onUpdateTuningMode: (mode: TuningMode) => void;
  onUpdateMasterFreq: (freq: number) => void;
  onUpdateMixer: (channel: 'L' | 'R', updates: Partial<OctaMixerChannel>) => void;
  onUpdateAutoNormalize: (enabled: boolean) => void;
  onApplyPreset: (preset: PresetName) => void;
  onResetToZero?: () => void;
  telemetryX?: { rms: number; peak: number };
  telemetryY?: { rms: number; peak: number };
}

export const OctaMixerPanel: React.FC<OctaMixerPanelProps> = ({
  state,
  onUpdateTuningMode,
  onUpdateMasterFreq,
  onUpdateMixer,
  onUpdateAutoNormalize,
  onApplyPreset,
  onResetToZero,
  telemetryX,
  telemetryY,
}) => {
  const { tuningMode, masterFrequency, mixerLeft, mixerRight, autoNormalize, generators } = state;

  return (
    <div className="bg-[#050b18] border border-cyan-900/50 rounded-xl p-4 shadow-xl space-y-4">
      {/* Top Header: Tuning Master + Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        {/* Tuning Mode & Master F0 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#030712] border border-slate-800 p-1 rounded-lg">
            <button
              id="btn-mode-locked"
              onClick={() => onUpdateTuningMode('LOCKED')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                tuningMode === 'LOCKED'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,245,212,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>LOCKED MODE</span>
            </button>
            <button
              id="btn-mode-free"
              onClick={() => onUpdateTuningMode('FREE')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                tuningMode === 'FREE'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>FREE MODE</span>
            </button>
          </div>

          {/* Master F0 Control (in Locked Mode) */}
          <div className="flex items-center gap-2 bg-[#030712] border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] font-mono text-slate-400 font-bold">
              FRÉQ MASTER f0 :
            </span>
            <input
              type="range"
              min="20"
              max="880"
              step="1"
              value={masterFrequency}
              onChange={(e) => onUpdateMasterFreq(parseFloat(e.target.value))}
              disabled={tuningMode === 'FREE'}
              className="w-28 sm:w-36 accent-cyan-400 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer disabled:opacity-30"
            />
            <input
              type="number"
              min="1"
              max="20000"
              value={masterFrequency}
              onChange={(e) => onUpdateMasterFreq(Math.max(1, parseFloat(e.target.value) || 1))}
              disabled={tuningMode === 'FREE'}
              className="w-16 bg-[#060c18] border border-slate-700 text-cyan-300 text-xs font-mono px-1 py-0.5 rounded text-right disabled:opacity-30"
            />
            <span className="text-xs font-mono text-slate-400">Hz</span>

            {/* Quick Freq Selectors */}
            <div className="hidden lg:flex items-center gap-1 ml-1">
              {[55, 110, 220, 432, 440].map((f) => (
                <button
                  key={f}
                  onClick={() => onUpdateMasterFreq(f)}
                  disabled={tuningMode === 'FREE'}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    masterFrequency === f
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-bold'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Limiter / Soft-clip Auto-Normalize Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-mono text-slate-300 cursor-pointer bg-[#030712] border border-slate-800 px-2.5 py-1.5 rounded-lg hover:border-slate-700">
            <input
              type="checkbox"
              checked={autoNormalize}
              onChange={(e) => onUpdateAutoNormalize(e.target.checked)}
              className="accent-cyan-400 rounded"
            />
            <span className="text-[11px] font-bold">Auto-Limiteur Anti-Saturation</span>
          </label>
        </div>
      </div>

      {/* Flagship Preset: QUARTER-TONE MANDALA & Geometric Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#040914] border border-cyan-950 p-2.5 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            PRESETS QUART DE TON & GÉOMÉTRIE XY :
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* SPECIAL PRESET: QUARTER-TONE MANDALA */}
          <button
            id="preset-quarter-tone-mandala"
            onClick={() => onApplyPreset('Quarter-Tone Mandala')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-cyan-500/30 text-amber-300 border border-amber-500/60 rounded-lg text-xs font-mono font-black tracking-wide shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all transform hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>QUARTER-TONE MANDALA</span>
          </button>

          <button
            id="preset-microtonal-beats"
            onClick={() => onApplyPreset('Microtonal Beats')}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded text-xs font-mono"
          >
            Battements Microtonaux
          </button>

          <button
            id="preset-octa-lissajous"
            onClick={() => onApplyPreset('Octa-Lissajous')}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded text-xs font-mono"
          >
            Octa-Lissajous (8 Gens)
          </button>

          <button
            id="preset-sacred-lotus"
            onClick={() => onApplyPreset('Sacred Lotus 8-Gen')}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded text-xs font-mono"
          >
            Lotus Sacré 8-Gen
          </button>

          <button
            id="preset-harmonic-star"
            onClick={() => onApplyPreset('Harmonic Star')}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono"
          >
            Étoile Harmonique
          </button>

          {onResetToZero && (
            <button
              id="preset-reset-zero"
              onClick={onResetToZero}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/70 rounded text-xs font-mono font-bold transition-colors ml-auto"
              title="Remettre tous les générateurs et mixeurs à zéro"
            >
              <RotateCcw className="w-3 h-3 text-rose-400" />
              <span>Reset à Zéro</span>
            </button>
          )}
        </div>
      </div>

      {/* Dual Mixer Bar: LEFT MIXER (X) & RIGHT MIXER (Y) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT MIXER (produces X = L1 + L2 + L3 + L4) */}
        <div className="bg-[#030712] border border-cyan-900/60 rounded-lg p-3">
          <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f5d4]" />
              <span className="text-xs font-mono font-black text-cyan-300">
                MIXER LEFT → AXE X
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                [X = L1 + L2 + L3 + L4]
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdateMixer('L', { mute: !mixerLeft.mute })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  mixerLeft.mute
                    ? 'bg-red-900/50 text-red-300 border border-red-500'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {mixerLeft.mute ? 'MUTED' : 'MUTE X'}
              </button>

              <button
                onClick={() => onUpdateMixer('L', { invertPhase: !mixerLeft.invertPhase })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  mixerLeft.invertPhase
                    ? 'bg-purple-900 text-purple-300 border border-purple-500'
                    : 'bg-slate-800 text-slate-400'
                }`}
                title="Inversion de phase globale X"
              >
                Ø {mixerLeft.invertPhase ? '-180°' : '0°'}
              </button>
            </div>
          </div>

          {/* Generator contribution meters (L1..L4) */}
          <div className="grid grid-cols-4 gap-2 mb-3 text-center font-mono text-[10px]">
            {(['L1', 'L2', 'L3', 'L4'] as const).map((id) => {
              const g = generators[id];
              return (
                <div
                  key={id}
                  className={`p-1.5 rounded border ${
                    g.enabled && !g.mute
                      ? 'bg-[#060e1e] border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-900/40 border-slate-800 text-slate-600'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{id}</span>
                    <span className="text-[8px] text-slate-400">{g.quarterToneOffset > 0 ? `+${g.quarterToneOffset}` : g.quarterToneOffset}qt</span>
                  </div>
                  <div className="text-[9px] text-slate-300 mt-0.5">
                    {Math.round(g.amplitude * 100)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Master Left Gain & Level meter */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400 font-bold whitespace-nowrap">
              GAIN MASTER X :
            </span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={mixerLeft.gain}
              onChange={(e) => onUpdateMixer('L', { gain: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono text-cyan-300 font-bold w-12 text-right">
              {(mixerLeft.gain * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* RIGHT MIXER (produces Y = R1 + R2 + R3 + R4) */}
        <div className="bg-[#030712] border border-amber-900/60 rounded-lg p-3">
          <div className="flex items-center justify-between border-b border-amber-900/40 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              <span className="text-xs font-mono font-black text-amber-300">
                MIXER RIGHT → AXE Y
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                [Y = R1 + R2 + R3 + R4]
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdateMixer('R', { mute: !mixerRight.mute })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  mixerRight.mute
                    ? 'bg-red-900/50 text-red-300 border border-red-500'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {mixerRight.mute ? 'MUTED' : 'MUTE Y'}
              </button>

              <button
                onClick={() => onUpdateMixer('R', { invertPhase: !mixerRight.invertPhase })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  mixerRight.invertPhase
                    ? 'bg-purple-900 text-purple-300 border border-purple-500'
                    : 'bg-slate-800 text-slate-400'
                }`}
                title="Inversion de phase globale Y"
              >
                Ø {mixerRight.invertPhase ? '-180°' : '0°'}
              </button>
            </div>
          </div>

          {/* Generator contribution meters (R1..R4) */}
          <div className="grid grid-cols-4 gap-2 mb-3 text-center font-mono text-[10px]">
            {(['R1', 'R2', 'R3', 'R4'] as const).map((id) => {
              const g = generators[id];
              return (
                <div
                  key={id}
                  className={`p-1.5 rounded border ${
                    g.enabled && !g.mute
                      ? 'bg-[#181106] border-amber-500/40 text-amber-300'
                      : 'bg-slate-900/40 border-slate-800 text-slate-600'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{id}</span>
                    <span className="text-[8px] text-slate-400">{g.quarterToneOffset > 0 ? `+${g.quarterToneOffset}` : g.quarterToneOffset}qt</span>
                  </div>
                  <div className="text-[9px] text-slate-300 mt-0.5">
                    {Math.round(g.amplitude * 100)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Master Right Gain & Level meter */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400 font-bold whitespace-nowrap">
              GAIN MASTER Y :
            </span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={mixerRight.gain}
              onChange={(e) => onUpdateMixer('R', { gain: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono text-amber-300 font-bold w-12 text-right">
              {(mixerRight.gain * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
