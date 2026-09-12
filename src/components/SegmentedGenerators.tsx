import React, { useState } from 'react';
import {
  Layers,
  Sliders,
  Scissors,
  Sparkles,
  Activity,
  Volume2,
  CheckCircle,
  RotateCw,
  Hash,
  ArrowRightLeft
} from 'lucide-react';
import {
  SegmentedChannel,
  GeneratorSegmentConfig,
  WaveformType,
  ScopeDisplaySettings
} from '../types/vectorScope';
import { evalWaveform, computeSegmentedSample } from '../services/mathEngine';

interface SegmentedGeneratorsProps {
  segmentedX: SegmentedChannel;
  segmentedY: SegmentedChannel;
  onSegmentedXChange: (newVal: SegmentedChannel) => void;
  onSegmentedYChange: (newVal: SegmentedChannel) => void;
  isActiveInAudio: boolean;
  onToggleActiveInAudio: () => void;
}

const WAVEFORM_OPTIONS: Array<{ id: WaveformType; label: string }> = [
  { id: 'sine', label: 'Sinus' },
  { id: 'cosine', label: 'Cosinus' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'square', label: 'Carré' },
  { id: 'sawtooth_up', label: 'Scie ↗' },
  { id: 'sawtooth_down', label: 'Scie ↘' },
  { id: 'noise', label: 'Bruit' },
];

export const SegmentedGenerators: React.FC<SegmentedGeneratorsProps> = ({
  segmentedX,
  segmentedY,
  onSegmentedXChange,
  onSegmentedYChange,
  isActiveInAudio,
  onToggleActiveInAudio,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'X' | 'Y'>('X');
  const [generatorCount, setGeneratorCount] = useState<'4_GEN' | '8_GEN'>(segmentedX.mode);

  const currentChannel = selectedChannel === 'X' ? segmentedX : segmentedY;
  const updateCurrentChannel = (updates: Partial<SegmentedChannel>) => {
    if (selectedChannel === 'X') {
      onSegmentedXChange({ ...segmentedX, ...updates });
    } else {
      onSegmentedYChange({ ...segmentedY, ...updates });
    }
  };

  // Toggle 4-Gen vs 8-Gen mode
  const handleModeChange = (mode: '4_GEN' | '8_GEN') => {
    setGeneratorCount(mode);

    const makeDefaultSegments = (chName: string, count: number): GeneratorSegmentConfig[] => {
      const segs: GeneratorSegmentConfig[] = [];
      const labels = count === 2 ? ['A', 'B'] : ['1', '2', '3', '4'];
      for (let i = 0; i < labels.length; i++) {
        segs.push({
          id: `${chName}_${labels[i]}`,
          name: `Générateur ${chName}${labels[i]}`,
          enabled: true,
          waveform: i === 0 ? 'sine' : i === 1 ? 'cosine' : i === 2 ? 'triangle' : 'sawtooth_up',
          frequencyRatio: 1.0 + i * 0.5,
          amplitude: 0.8,
          phase: i * 45,
          offset: 0,
          fmDepth: 0,
          fmRate: 5,
        });
      }
      return segs;
    };

    const count = mode === '4_GEN' ? 2 : 4;
    onSegmentedXChange({
      ...segmentedX,
      mode,
      segments: makeDefaultSegments('X', count),
    });
    onSegmentedYChange({
      ...segmentedY,
      mode,
      segments: makeDefaultSegments('Y', count),
    });
  };

  const updateSegment = (segId: string, updates: Partial<GeneratorSegmentConfig>) => {
    const newSegs = currentChannel.segments.map((s) => (s.id === segId ? { ...s, ...updates } : s));
    updateCurrentChannel({ segments: newSegs });
  };

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-xl p-4 font-mono text-xs text-slate-300 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14233c] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              SYNTHÈSE MULTI-GÉNÉRATEURS SEGMENTÉS
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/40 text-cyan-400">
                {generatorCount === '4_GEN' ? '4 GÉNÉRATEURS (XA, XB / YA, YB)' : '8 GÉNÉRATEURS (X1..X4 / Y1..Y4)'}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Découpe de phase par segment, modulation indépendante, split franc ou adouci et fondu croisé (crossfade).
            </p>
          </div>
        </div>

        {/* Action button & mode selector */}
        <div className="flex items-center gap-2">
          {/* Mode switch: 4-Gen vs 8-Gen */}
          <div className="bg-[#060c18] p-1 rounded-lg border border-[#14284b] flex items-center gap-1">
            <button
              onClick={() => handleModeChange('4_GEN')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                generatorCount === '4_GEN' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              4 GÉNÉRATEURS
            </button>
            <button
              onClick={() => handleModeChange('8_GEN')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                generatorCount === '8_GEN' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              8 GÉNÉRATEURS
            </button>
          </div>

          {/* Direct Live Injection Button */}
          <button
            onClick={onToggleActiveInAudio}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${
              isActiveInAudio
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/80 text-cyan-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isActiveInAudio ? 'EN COURS DANS AUDIO/SCOPE' : 'ACTIVER DANS AUDIO/SCOPE'}</span>
          </button>
        </div>
      </div>

      {/* Channel Switcher (X vs Y) and Global Split Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#060c18] p-3 rounded-lg border border-[#14233c]">
        {/* Channel Selection */}
        <div className="md:col-span-4 flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Canal à éditer :</span>
          <button
            onClick={() => setSelectedChannel('X')}
            className={`px-3 py-1 rounded font-bold text-xs border transition-colors ${
              selectedChannel === 'X'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            CANAL X (GAUCHE)
          </button>
          <button
            onClick={() => setSelectedChannel('Y')}
            className={`px-3 py-1 rounded font-bold text-xs border transition-colors ${
              selectedChannel === 'Y'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            CANAL Y (DROIT)
          </button>
        </div>

        {/* Base Frequency */}
        <div className="md:col-span-3 flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Fréq. de base :</span>
          <input
            type="number"
            min="20"
            max="2000"
            step="1"
            value={currentChannel.baseFrequency}
            onChange={(e) => updateCurrentChannel({ baseFrequency: Math.max(1, parseFloat(e.target.value) || 220) })}
            className="w-20 bg-[#0a1324] border border-slate-700 rounded px-2 py-0.5 text-center text-cyan-300 font-bold"
          />
          <span className="text-slate-500">Hz</span>
        </div>

        {/* Split Mode & Crossfade */}
        <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-3">
          {/* Mix mode */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400">Mode :</span>
            <select
              value={currentChannel.mixMode}
              onChange={(e) => updateCurrentChannel({ mixMode: e.target.value as any })}
              className="bg-[#0a1324] border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="segmented">Segmenté (Tranches temporelles)</option>
              <option value="layered">Superposé (Addition multi-harmonique)</option>
            </select>
          </div>

          {/* Split Mode */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-400">Découpe :</span>
            <select
              value={currentChannel.splitMode}
              onChange={(e) => updateCurrentChannel({ splitMode: e.target.value as any })}
              className="bg-[#0a1324] border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold"
            >
              <option value="hard_split">Hard Split (Franche)</option>
              <option value="smooth_split">Smooth Split (Adoucie)</option>
            </select>
          </div>

          {/* Crossfade */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Fondu :</span>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.02"
              value={currentChannel.crossfade}
              onChange={(e) => updateCurrentChannel({ crossfade: parseFloat(e.target.value) })}
              className="w-16 accent-cyan-400 h-1 bg-slate-800 rounded"
            />
            <span className="text-cyan-400 font-mono w-8">{(currentChannel.crossfade * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Generator Segment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {currentChannel.segments.map((seg, idx) => (
          <div
            key={seg.id}
            className={`p-3 rounded-lg border flex flex-col gap-2.5 transition-all ${
              seg.enabled
                ? selectedChannel === 'X'
                  ? 'bg-[#08152c] border-cyan-900/60 shadow-sm'
                  : 'bg-[#1a1408] border-amber-900/60 shadow-sm'
                : 'bg-[#060c18] border-slate-800/60 opacity-60'
            }`}
          >
            {/* Title & Enable checkbox */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className={`font-bold text-xs ${selectedChannel === 'X' ? 'text-cyan-400' : 'text-amber-400'}`}>
                {seg.name}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seg.enabled}
                  onChange={(e) => updateSegment(seg.id, { enabled: e.target.checked })}
                  className="accent-cyan-400 rounded"
                />
                <span className="text-[10px] text-slate-400">{seg.enabled ? 'ACTIF' : 'MUET'}</span>
              </label>
            </div>

            {/* Waveform selection */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Forme d'onde :</label>
              <select
                value={seg.waveform}
                onChange={(e) => updateSegment(seg.id, { waveform: e.target.value as WaveformType })}
                className="w-full bg-[#050b14] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
              >
                {WAVEFORM_OPTIONS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency Ratio */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Ratio Fréq (x base) :</span>
                <span className="text-cyan-300 font-bold">{seg.frequencyRatio.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="8.0"
                step="0.25"
                value={seg.frequencyRatio}
                onChange={(e) => updateSegment(seg.id, { frequencyRatio: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
              />
              <span className="text-[10px] text-slate-500 text-right block">
                = {(currentChannel.baseFrequency * seg.frequencyRatio).toFixed(1)} Hz
              </span>
            </div>

            {/* Amplitude & Phase */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Amplitude :</span>
                  <span className="text-slate-200">{seg.amplitude.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={seg.amplitude}
                  onChange={(e) => updateSegment(seg.id, { amplitude: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Phase :</span>
                  <span className="text-slate-200">{seg.phase}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={seg.phase}
                  onChange={(e) => updateSegment(seg.id, { phase: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
                />
              </div>
            </div>

            {/* DC Offset */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Offset DC :</span>
                <span className="text-slate-200">{seg.offset.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={seg.offset}
                onChange={(e) => updateSegment(seg.id, { offset: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
              />
            </div>

            {/* FM Modulation */}
            <div className="border-t border-slate-800/80 pt-2 space-y-1.5">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Profondeur FM :</span>
                <span className="text-amber-400">{(seg.fmDepth * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={seg.fmDepth}
                onChange={(e) => updateSegment(seg.id, { fmDepth: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 h-1 bg-slate-800 rounded"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
