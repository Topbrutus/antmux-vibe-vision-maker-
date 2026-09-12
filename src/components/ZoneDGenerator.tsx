import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Radio,
  Sparkles,
  Sliders,
  ChevronDown,
  RotateCw,
  Hash,
  Activity,
  Layers
} from 'lucide-react';
import { ChannelConfig, PresetName, WaveformType } from '../types/vectorScope';

interface ZoneDGeneratorProps {
  configX: ChannelConfig;
  configY: ChannelConfig;
  onConfigChangeX: (cfg: Partial<ChannelConfig>) => void;
  onConfigChangeY: (cfg: Partial<ChannelConfig>) => void;
  currentPreset: PresetName;
  onSelectPreset: (preset: PresetName) => void;
  isRatioLocked: boolean;
  onToggleRatioLock: () => void;
  frequencyRatio: number;
  onRatioChange: (ratio: number) => void;
  roseK: number;
  onRoseKChange: (k: number) => void;
}

const PRESETS: Array<{ id: PresetName; label: string; desc: string }> = [
  { id: 'Circle', label: 'Cercle', desc: 'X=cos(wt), Y=sin(wt)' },
  { id: 'Ellipse', label: 'Ellipse', desc: 'X=a·cos(wt), Y=b·sin(wt)' },
  { id: 'Line', label: 'Ligne 45°', desc: 'X=cos(wt), Y=cos(wt)' },
  { id: 'Lissajous', label: 'Lissajous', desc: 'Ratio 3:2, Phase 45°' },
  { id: 'Spiral', label: 'Spirale', desc: 'Archimède modulée' },
  { id: 'Rose', label: 'Rose (k param)', desc: 'r = cos(kθ)' },
  { id: 'Rose Three', label: 'Rose 3', desc: 'k = 3 (3 pétales)' },
  { id: 'Rose Five', label: 'Rose 5', desc: 'k = 5 (5 pétales)' },
  { id: 'Rose Seven', label: 'Rose 7', desc: 'k = 7 (7 pétales)' },
  { id: 'Rose Nine', label: 'Rose 9', desc: 'k = 9 (9 pétales)' },
  { id: 'Genesis Mandala', label: 'Genesis Mandala', desc: 'Harmoniques résonantes' },
  { id: 'Custom XY', label: 'Custom XY', desc: 'Paramètres manuels libres' },
];

const WAVEFORMS: Array<{ id: WaveformType; label: string }> = [
  { id: 'sine', label: 'Sinus' },
  { id: 'cosine', label: 'Cosinus' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'square', label: 'Carré' },
  { id: 'sawtooth_up', label: 'Scie Montante' },
  { id: 'sawtooth_down', label: 'Scie Descendante' },
  { id: 'noise', label: 'Bruit Blanc' },
  { id: 'custom', label: 'Table Harmonics' },
];

export const ZoneDGenerator: React.FC<ZoneDGeneratorProps> = ({
  configX,
  configY,
  onConfigChangeX,
  onConfigChangeY,
  currentPreset,
  onSelectPreset,
  isRatioLocked,
  onToggleRatioLock,
  frequencyRatio,
  onRatioChange,
  roseK,
  onRoseKChange,
}) => {
  const [showHarmonicsX, setShowHarmonicsX] = useState(false);
  const [showHarmonicsY, setShowHarmonicsY] = useState(false);

  const handleRatioSelect = (num: number, den: number) => {
    const ratio = num / den;
    onRatioChange(ratio);
    if (isRatioLocked) {
      onConfigChangeY({ frequency: parseFloat((configX.frequency * ratio).toFixed(2)) });
    }
  };

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-xl p-4 font-mono text-xs text-slate-300 shadow-md flex flex-col gap-4">
      {/* Title and Preset Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14233c] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-bold flex items-center justify-center text-xs">
            D
          </span>
          <div>
            <h2 className="font-bold text-slate-100 tracking-wide text-sm">
              ZONE D — GÉNÉRATEUR VECTORIEL AUDIO
            </h2>
            <p className="text-[10px] text-cyan-400">
              Synthétiseur double oscillateur temps réel indépendant X & Y
            </p>
          </div>
        </div>

        {/* Ratio Lock Indicator */}
        <div className="flex items-center gap-2 bg-[#060c18] px-2.5 py-1.5 rounded-lg border border-[#162744]">
          <button
            onClick={onToggleRatioLock}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
              isRatioLocked
                ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/30'
                : 'bg-[#101d34] text-slate-400 hover:text-slate-200'
            }`}
          >
            {isRatioLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isRatioLocked ? 'RATIO VERROUILLÉ' : 'DÉVERROUILLÉ'}</span>
          </button>

          <span className="text-slate-500 text-[10px]">Ratio Y/X :</span>
          <span className="text-cyan-300 font-bold text-[11px]">{frequencyRatio.toFixed(3)}</span>
        </div>
      </div>

      {/* Preset Selector Grid */}
      <div>
        <span className="text-[10px] text-slate-500 block mb-1.5 uppercase font-bold tracking-wider">
          PRESETS GÉOMÉTRIQUES & MATHÉMATIQUES :
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
          {PRESETS.map((p) => {
            const isSelected = currentPreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPreset(p.id)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10 font-bold'
                    : 'bg-[#060c18] border-[#14233c] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <div className="text-[11px] truncate">{p.label}</div>
                <div className="text-[9px] text-slate-500 truncate">{p.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rose Parameter Modifier if a Rose preset is active */}
      {currentPreset.startsWith('Rose') && (
        <div className="bg-[#060c18] p-3 rounded-lg border border-amber-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-amber-300">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold text-[11px]">Paramètre Rose : r(θ) = cos(k · θ)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[10px]">Valeur de k :</span>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={roseK}
              onChange={(e) => onRoseKChange(parseFloat(e.target.value))}
              className="w-28 accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <span className="text-amber-400 font-bold w-8 text-center">{roseK}</span>
            <div className="flex gap-1">
              {[2, 3, 4, 5, 7, 9].map((k) => (
                <button
                  key={k}
                  onClick={() => onRoseKChange(k)}
                  className={`px-1.5 py-0.5 text-[9px] rounded ${
                    roseK === k ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-[#101d34] text-slate-400'
                  }`}
                >
                  k={k}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Frequency Ratios Quick Presets */}
      <div className="flex flex-wrap items-center gap-2 bg-[#060c18] p-2.5 rounded-lg border border-[#14233c] text-[11px]">
        <span className="text-slate-500 uppercase text-[10px]">Ratios Harmoniques X:Y :</span>
        {[
          { label: '1:1', num: 1, den: 1 },
          { label: '1:2', num: 2, den: 1 },
          { label: '2:3', num: 3, den: 2 },
          { label: '3:4', num: 4, den: 3 },
          { label: '3:5', num: 5, den: 3 },
          { label: '4:5', num: 5, den: 4 },
          { label: '5:6', num: 6, den: 5 },
          { label: '1:3', num: 3, den: 1 },
          { label: '1:4', num: 4, den: 1 },
          { label: '1:5', num: 5, den: 1 },
        ].map((r) => (
          <button
            key={r.label}
            onClick={() => handleRatioSelect(r.num, r.den)}
            className="px-2 py-0.5 bg-[#101d34] hover:bg-[#1a3055] text-slate-300 hover:text-cyan-300 rounded border border-[#162744] text-[10px]"
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Dual Generator Columns: Left (X) vs Right (Y) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT / X GENERATOR */}
        <div className="bg-[#060c18] p-3.5 rounded-lg border border-cyan-500/20 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#14233c] pb-2">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
              <Radio className="w-3.5 h-3.5" /> CANAL GAUCHE / X (Axe Horizontal)
            </span>
            <button
              onClick={() => onConfigChangeX({ polarity: configX.polarity === 1 ? -1 : 1 })}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                configX.polarity === -1
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                  : 'bg-[#101d34] text-slate-400 border-[#1a3055]'
              }`}
            >
              POLARITÉ: {configX.polarity === 1 ? '+1' : '-1 (INV)'}
            </button>
          </div>

          {/* Waveform Selector */}
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">FORME D'ONDE X :</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px]">
              {WAVEFORMS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => onConfigChangeX({ waveform: w.id })}
                  className={`px-2 py-1 rounded text-center truncate transition-colors ${
                    configX.waveform === w.id
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-[#0f1d33] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Harmonics editor if custom */}
          {configX.waveform === 'custom' && (
            <div className="bg-[#0a1426] p-2 rounded border border-cyan-500/30 space-y-1.5">
              <span className="text-[10px] text-cyan-400 block font-bold">8 Harmoniques Custom X :</span>
              <div className="grid grid-cols-8 gap-1">
                {configX.customHarmonics.map((h, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={h}
                      onChange={(e) => {
                        const newH = [...configX.customHarmonics];
                        newH[i] = parseFloat(e.target.value);
                        onConfigChangeX({ customHarmonics: newH });
                      }}
                      className="h-14 w-1 accent-cyan-400 cursor-pointer"
                      style={{ writingMode: 'vertical-lr' as any, direction: 'rtl' }}
                    />
                    <span className="text-[8px] text-slate-400 mt-1">H{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amplitude & DC Offset */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Amplitude :</span>
                <span className="text-cyan-300 font-bold">{(configX.amplitude * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={configX.amplitude}
                onChange={(e) => onConfigChangeX({ amplitude: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Offset DC :</span>
                <span className="text-slate-300">{configX.offset.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={configX.offset}
                onChange={(e) => onConfigChangeX({ offset: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* FM Modulation Depth & Rate */}
          <div className="border-t border-[#14233c] pt-2 space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Modulation FM X (Profondeur / Taux) :</span>
              <span className="text-cyan-400 font-bold">
                {(configX.fmDepth * 100).toFixed(0)}% @ {configX.fmRate} Hz
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={configX.fmDepth}
                onChange={(e) => onConfigChangeX({ fmDepth: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
                title="Profondeur FM"
              />
              <input
                type="range"
                min="0.5"
                max="50"
                step="0.5"
                value={configX.fmRate}
                onChange={(e) => onConfigChangeX({ fmRate: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
                title="Fréquence FM"
              />
            </div>
          </div>
        </div>

        {/* RIGHT / Y GENERATOR */}
        <div className="bg-[#060c18] p-3.5 rounded-lg border border-amber-500/20 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#14233c] pb-2">
            <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
              <Radio className="w-3.5 h-3.5" /> CANAL DROIT / Y (Axe Vertical)
            </span>
            <button
              onClick={() => onConfigChangeY({ polarity: configY.polarity === 1 ? -1 : 1 })}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                configY.polarity === -1
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-[#101d34] text-slate-400 border-[#1a3055]'
              }`}
            >
              POLARITÉ: {configY.polarity === 1 ? '+1' : '-1 (INV)'}
            </button>
          </div>

          {/* Waveform Selector */}
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">FORME D'ONDE Y :</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px]">
              {WAVEFORMS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => onConfigChangeY({ waveform: w.id })}
                  className={`px-2 py-1 rounded text-center truncate transition-colors ${
                    configY.waveform === w.id
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-[#0f1d33] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Harmonics editor if custom */}
          {configY.waveform === 'custom' && (
            <div className="bg-[#0a1426] p-2 rounded border border-amber-500/30 space-y-1.5">
              <span className="text-[10px] text-amber-400 block font-bold">8 Harmoniques Custom Y :</span>
              <div className="grid grid-cols-8 gap-1">
                {configY.customHarmonics.map((h, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={h}
                      onChange={(e) => {
                        const newH = [...configY.customHarmonics];
                        newH[i] = parseFloat(e.target.value);
                        onConfigChangeY({ customHarmonics: newH });
                      }}
                      className="h-14 w-1 accent-amber-400 cursor-pointer"
                      style={{ writingMode: 'vertical-lr' as any, direction: 'rtl' }}
                    />
                    <span className="text-[8px] text-slate-400 mt-1">H{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amplitude & DC Offset */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Amplitude :</span>
                <span className="text-amber-300 font-bold">{(configY.amplitude * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={configY.amplitude}
                onChange={(e) => onConfigChangeY({ amplitude: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Offset DC :</span>
                <span className="text-slate-300">{configY.offset.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={configY.offset}
                onChange={(e) => onConfigChangeY({ offset: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* FM Modulation Depth & Rate */}
          <div className="border-t border-[#14233c] pt-2 space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Modulation FM Y (Profondeur / Taux) :</span>
              <span className="text-amber-400 font-bold">
                {(configY.fmDepth * 100).toFixed(0)}% @ {configY.fmRate} Hz
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={configY.fmDepth}
                onChange={(e) => onConfigChangeY({ fmDepth: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 h-1 bg-slate-800 rounded cursor-pointer"
                title="Profondeur FM"
              />
              <input
                type="range"
                min="0.5"
                max="50"
                step="0.5"
                value={configY.fmRate}
                onChange={(e) => onConfigChangeY({ fmRate: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 h-1 bg-slate-800 rounded cursor-pointer"
                title="Fréquence FM"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
