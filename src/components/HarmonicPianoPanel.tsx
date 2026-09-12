import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Music,
  Play,
  Square,
  Volume2,
  Sliders,
  Sparkles,
  Zap,
  RotateCcw,
  Layers,
  Activity,
  Compass,
  Repeat
} from 'lucide-react';
import { ChannelConfig, PianoKeyData } from '../types/vectorScope';
import { VectorAudioEngine } from '../services/audioEngine';

interface HarmonicPianoPanelProps {
  engine: VectorAudioEngine;
  configX: ChannelConfig;
  configY: ChannelConfig;
  onUpdateConfigX: (cfg: Partial<ChannelConfig>) => void;
  onUpdateConfigY: (cfg: Partial<ChannelConfig>) => void;
  onSelectPresetName: (name: string) => void;
}

// Sacred & Musical signs
const MUSICAL_SIGNS: Record<string, string> = {
  C: '𝄞 ♩',
  'C#': '♯ ♪',
  D: '♫ ♩',
  'D#': '♯ ♫',
  E: '𝄞 ♪',
  F: '𝄢 ♩',
  'F#': '♯ ♩',
  G: '𝄞 ♫',
  'G#': '♯ ♪',
  A: '𝄢 ♩',
  'A#': '♯ ♫',
  B: '𝄞 ♪',
};

const NOTE_COLORS: Record<string, string> = {
  C: '#ef4444',   // Red
  'C#': '#f97316', // Orange-red
  D: '#f59e0b',   // Amber
  'D#': '#eab308', // Yellow
  E: '#84cc16',   // Lime
  F: '#10b981',   // Emerald
  'F#': '#06b6d4', // Cyan
  G: '#0284c7',   // Sky
  'G#': '#3b82f6', // Blue
  A: '#6366f1',   // Indigo
  'A#': '#8b5cf6', // Violet
  B: '#ec4899',   // Pink
};

const SOLFEGGIO_PRESETS = [
  { freq: 174, note: 'UT₁', sign: '𝄢 174Hz', meaning: 'Soulagement & Fondation', color: '#64748b' },
  { freq: 285, note: 'RE₁', sign: '𝄢 285Hz', meaning: 'Régénération & Cognition', color: '#0ea5e9' },
  { freq: 396, note: 'UT', sign: '𝄞 396Hz', meaning: 'Libération & Sérénité', color: '#ef4444' },
  { freq: 417, note: 'RE', sign: '𝄞 417Hz', meaning: 'Dénouement & Transmutation', color: '#f97316' },
  { freq: 528, note: 'MI', sign: '𝄞 528Hz', meaning: 'Miracle & Transformation (Or)', color: '#eab308' },
  { freq: 639, note: 'FA', sign: '𝄞 639Hz', meaning: 'Harmonie & Connexion du Cœur', color: '#10b981' },
  { freq: 741, note: 'SOL', sign: '𝄞 741Hz', meaning: 'Intuition & Expression Claire', color: '#06b6d4' },
  { freq: 852, note: 'LA', sign: '𝄞 852Hz', meaning: 'Ordre Spirituel & Lumière', color: '#6366f1' },
  { freq: 963, note: 'SI', sign: '𝄞 963Hz', meaning: 'Conscience Cosmique / Éveil', color: '#ec4899' },
];

const HARMONIC_INTERVALS = [
  { label: 'Unisson 1:1', ratio: 1.0, desc: 'Cercle / Ligne parfaite' },
  { label: 'Octave 2:1', ratio: 2.0, desc: 'Parabole / Huit symétrique' },
  { label: 'Quinte Juste 3:2', ratio: 1.5, desc: 'Trèfle harmonique à 3 lobes' },
  { label: 'Quarte 4:3', ratio: 4 / 3, desc: 'Rosace à 4 intersections' },
  { label: 'Tierce Maj 5:4', ratio: 1.25, desc: 'Étoile à 5 branches' },
  { label: 'Tierce Min 6:5', ratio: 1.2, desc: 'Harmonie subtile' },
  { label: 'Nombre d’Or φ 1.618', ratio: 1.6180339, desc: 'Spirale d’or perpétuelle' },
  { label: 'Sacré Lotus 8:3', ratio: 8 / 3, desc: 'Mandala octogonal' },
];

export const HarmonicPianoPanel: React.FC<HarmonicPianoPanelProps> = ({
  engine,
  configX,
  configY,
  onUpdateConfigX,
  onUpdateConfigY,
  onSelectPresetName,
}) => {
  const [tuningBase, setTuningBase] = useState<440 | 432 | 528>(432);
  const [currentOctave, setCurrentOctave] = useState<number>(4);
  const [selectedRatioIndex, setSelectedRatioIndex] = useState<number>(2); // 3:2 default
  const [activeNoteName, setActiveNoteName] = useState<string | null>(null);
  const [activeFreq, setActiveFreq] = useState<number>(432);
  const [isPlayingArp, setIsPlayingArp] = useState<boolean>(false);
  const [arpBpm, setArpBpm] = useState<number>(120);
  const [arpMode, setArpMode] = useState<'up' | 'down' | 'solfeggio' | 'fibonacci'>('up');
  const [waveform, setWaveform] = useState<ChannelConfig['waveform']>('sine');
  const [stereoSpread, setStereoSpread] = useState<boolean>(true);

  const arpTimerRef = useRef<number | null>(null);
  const arpStepRef = useRef<number>(0);

  // Note definitions (chromatic scale)
  const semitonesFromA4: Record<string, number> = {
    C: -9,
    'C#': -8,
    D: -7,
    'D#': -6,
    E: -5,
    F: -4,
    'F#': -3,
    G: -2,
    'G#': -1,
    A: 0,
    'A#': 1,
    B: 2,
  };

  const computeFreq = (pitch: string, octave: number): number => {
    const semitone = semitonesFromA4[pitch];
    const n = semitone + (octave - 4) * 12;
    return tuningBase * Math.pow(2, n / 12);
  };

  const keyboardKeyMap: Record<string, { pitch: string; octaveOffset: number }> = {
    a: { pitch: 'C', octaveOffset: 0 },
    w: { pitch: 'C#', octaveOffset: 0 },
    s: { pitch: 'D', octaveOffset: 0 },
    e: { pitch: 'D#', octaveOffset: 0 },
    d: { pitch: 'E', octaveOffset: 0 },
    f: { pitch: 'F', octaveOffset: 0 },
    t: { pitch: 'F#', octaveOffset: 0 },
    g: { pitch: 'G', octaveOffset: 0 },
    y: { pitch: 'G#', octaveOffset: 0 },
    h: { pitch: 'A', octaveOffset: 0 },
    u: { pitch: 'A#', octaveOffset: 0 },
    j: { pitch: 'B', octaveOffset: 0 },
    k: { pitch: 'C', octaveOffset: 1 },
    o: { pitch: 'C#', octaveOffset: 1 },
    l: { pitch: 'D', octaveOffset: 1 },
  };

  // Generate piano keys for 2 consecutive octaves
  const generateKeys = (): PianoKeyData[] => {
    const octaves = [currentOctave, currentOctave + 1];
    const notesOrder = [
      { pitch: 'C', note: 'DO', isBlack: false, keyChar: 'A' },
      { pitch: 'C#', note: 'DO♯', isBlack: true, keyChar: 'W' },
      { pitch: 'D', note: 'RÉ', isBlack: false, keyChar: 'S' },
      { pitch: 'D#', note: 'RÉ♯', isBlack: true, keyChar: 'E' },
      { pitch: 'E', note: 'MI', isBlack: false, keyChar: 'D' },
      { pitch: 'F', note: 'FA', isBlack: false, keyChar: 'F' },
      { pitch: 'F#', note: 'FA♯', isBlack: true, keyChar: 'T' },
      { pitch: 'G', note: 'SOL', isBlack: false, keyChar: 'G' },
      { pitch: 'G#', note: 'SOL♯', isBlack: true, keyChar: 'Y' },
      { pitch: 'A', note: 'LA', isBlack: false, keyChar: 'H' },
      { pitch: 'A#', note: 'LA♯', isBlack: true, keyChar: 'U' },
      { pitch: 'B', note: 'SI', isBlack: false, keyChar: 'J' },
    ];

    const keys: PianoKeyData[] = [];

    octaves.forEach((oct, octIdx) => {
      notesOrder.forEach((n) => {
        const freq = computeFreq(n.pitch, oct);
        const sign = MUSICAL_SIGNS[n.pitch] || '♪';
        const color = NOTE_COLORS[n.pitch] || '#00f5d4';
        const keyboardKey = octIdx === 0 ? n.keyChar : octIdx === 1 && n.pitch === 'C' ? 'K' : undefined;

        keys.push({
          note: n.note,
          pitch: n.pitch,
          octave: oct,
          freq,
          isBlack: n.isBlack,
          keyboardKey,
          musicalSign: sign,
          color,
        });
      });
    });

    return keys;
  };

  const keys = generateKeys();

  // Play a note & apply frequencies to Vector Oscilloscope generators
  const playNote = useCallback(
    (freq: number, noteLabel: string) => {
      setActiveNoteName(noteLabel);
      setActiveFreq(freq);

      const ratio = HARMONIC_INTERVALS[selectedRatioIndex].ratio;
      const freqX = Math.round(freq * 10) / 10;
      const freqY = Math.round(freq * ratio * 10) / 10;

      // Update both Audio Engine and React States
      engine.initAudio();
      engine.updateConfigX({ frequency: freqX, waveform, mute: false });
      engine.updateConfigY({ frequency: freqY, waveform, mute: false });

      onUpdateConfigX({ frequency: freqX, waveform, mute: false });
      onUpdateConfigY({ frequency: freqY, waveform, mute: false });

      onSelectPresetName(`Note ${noteLabel} (${freqX}Hz / ${freqY}Hz)`);
    },
    [engine, selectedRatioIndex, waveform, onUpdateConfigX, onUpdateConfigY, onSelectPresetName]
  );

  // Play Solfeggio direct preset
  const playSolfeggio = (preset: (typeof SOLFEGGIO_PRESETS)[0]) => {
    playNote(preset.freq, `${preset.note} (${preset.freq}Hz)`);
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      const mapped = keyboardKeyMap[key];
      if (mapped) {
        const freq = computeFreq(mapped.pitch, currentOctave + mapped.octaveOffset);
        playNote(freq, `${mapped.pitch}${currentOctave + mapped.octaveOffset}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentOctave, tuningBase, playNote]);

  // Arpeggiator Loop
  useEffect(() => {
    if (!isPlayingArp) {
      if (arpTimerRef.current) {
        clearInterval(arpTimerRef.current);
        arpTimerRef.current = null;
      }
      return;
    }

    const intervalMs = (60 / arpBpm / 2) * 1000; // eighth notes

    arpTimerRef.current = window.setInterval(() => {
      if (arpMode === 'solfeggio') {
        const p = SOLFEGGIO_PRESETS[arpStepRef.current % SOLFEGGIO_PRESETS.length];
        playNote(p.freq, p.note);
        arpStepRef.current++;
      } else if (arpMode === 'fibonacci') {
        const fibScales = [216, 288, 324, 432, 576, 648, 864];
        const f = fibScales[arpStepRef.current % fibScales.length];
        playNote(f, `Fib ${f}Hz`);
        arpStepRef.current++;
      } else if (arpMode === 'up') {
        const whiteKeys = keys.filter((k) => !k.isBlack);
        const k = whiteKeys[arpStepRef.current % whiteKeys.length];
        playNote(k.freq, `${k.note}${k.octave}`);
        arpStepRef.current++;
      } else {
        const whiteKeys = keys.filter((k) => !k.isBlack);
        const k = whiteKeys[(whiteKeys.length - 1 - (arpStepRef.current % whiteKeys.length))];
        playNote(k.freq, `${k.note}${k.octave}`);
        arpStepRef.current++;
      }
    }, intervalMs);

    return () => {
      if (arpTimerRef.current) {
        clearInterval(arpTimerRef.current);
        arpTimerRef.current = null;
      }
    };
  }, [isPlayingArp, arpBpm, arpMode, keys, playNote]);

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-5 font-mono text-xs text-slate-300 shadow-2xl space-y-6 select-none">
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
            <Music className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-amber-300 tracking-wider uppercase">
                CLAVIER PIANO & HARMONIQUES VECTORIELLES
              </h2>
              <span className="px-2 py-0.5 text-[10px] bg-amber-950/80 text-amber-400 border border-amber-500/40 rounded-full font-bold">
                NOTES & SIGNES ÉTABLIS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Jouez les notes chromatiques et fréquences sacrées pour animer instantanément l'oscilloscope en figures de Lissajous.
            </p>
          </div>
        </div>

        {/* Current Active Note Telemetry Badge */}
        <div className="flex items-center gap-3 bg-[#070e1c] border border-amber-500/30 px-3.5 py-1.5 rounded-xl shadow-inner">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">NOTE ACTIVE DANS LE SCOPE</div>
            <div className="text-sm font-black text-amber-300">
              {activeNoteName || 'LA 432 Hz'} <span className="text-slate-400 text-xs">({activeFreq.toFixed(1)} Hz)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Tuning Mode, Octaves, Intervals, Waveform */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#070e1c] p-3 rounded-xl border border-[#162744]">
        {/* Tuning Reference */}
        <div>
          <label className="text-[10px] text-slate-500 font-bold block mb-1">ACCORD DE BASE (DIAPASON)</label>
          <div className="grid grid-cols-3 gap-1">
            {([432, 440, 528] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTuningBase(t)}
                className={`py-1 rounded font-bold text-xs transition-all border ${
                  tuningBase === t
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
                    : 'bg-[#101b2f] text-slate-400 border-[#1c3050] hover:text-slate-200'
                }`}
              >
                {t} Hz
              </button>
            ))}
          </div>
        </div>

        {/* Octave Shift */}
        <div>
          <label className="text-[10px] text-slate-500 font-bold block mb-1">
            OCTAVE : <span className="text-cyan-300 font-bold">C{currentOctave} - C{currentOctave + 1}</span>
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentOctave((prev) => Math.max(1, prev - 1))}
              className="flex-1 py-1 bg-[#101b2f] hover:bg-[#162744] text-slate-300 rounded border border-[#1c3050] font-bold"
            >
              -1 Oct
            </button>
            <span className="px-3 py-1 bg-slate-900 border border-slate-700 text-amber-400 font-black rounded">
              {currentOctave}
            </span>
            <button
              onClick={() => setCurrentOctave((prev) => Math.min(6, prev + 1))}
              className="flex-1 py-1 bg-[#101b2f] hover:bg-[#162744] text-slate-300 rounded border border-[#1c3050] font-bold"
            >
              +1 Oct
            </button>
          </div>
        </div>

        {/* Harmonic Interval X:Y Ratio */}
        <div>
          <label className="text-[10px] text-slate-500 font-bold block mb-1">
            HARMONIQUE Y:X ({HARMONIC_INTERVALS[selectedRatioIndex].label})
          </label>
          <select
            value={selectedRatioIndex}
            onChange={(e) => setSelectedRatioIndex(Number(e.target.value))}
            className="w-full bg-[#101b2f] border border-[#1c3050] rounded px-2 py-1 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
          >
            {HARMONIC_INTERVALS.map((int, i) => (
              <option key={i} value={i}>
                {int.label} — {int.desc}
              </option>
            ))}
          </select>
        </div>

        {/* Waveform */}
        <div>
          <label className="text-[10px] text-slate-500 font-bold block mb-1">TIMBRE VECTORIEL (FORME)</label>
          <div className="grid grid-cols-4 gap-1">
            {(['sine', 'triangle', 'sawtooth_up', 'square'] as ChannelConfig['waveform'][]).map((w) => (
              <button
                key={w}
                onClick={() => setWaveform(w)}
                className={`py-1 rounded text-[10px] font-bold uppercase transition-all border ${
                  waveform === w
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/20'
                    : 'bg-[#101b2f] text-slate-400 border-[#1c3050] hover:text-slate-200'
                }`}
              >
                {w === 'sawtooth_up' ? 'Scie' : w === 'sine' ? 'Sin' : w === 'triangle' ? 'Tri' : 'Carré'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Piano Keyboard with Notes, Signs and Frequencies */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="flex items-center gap-1.5 font-bold text-slate-300">
            <Music className="w-3.5 h-3.5 text-amber-400" /> CLAVIER PHYSIQUE (TOUCHES CLAVIER : A, W, S, E, D, F, T, G, Y, H, U, J, K)
          </span>
          <span className="text-[10px] text-amber-400">
            Signes musicaux : 𝄞 Clé de Sol • 𝄢 Clé de Fa • ♩ Noire • ♪ Croche • ♯ Dièse
          </span>
        </div>

        {/* Piano Keys Container */}
        <div className="relative bg-[#040810] p-3 rounded-2xl border-2 border-[#162744] shadow-[inset_0_0_30px_rgba(0,0,0,0.9)] overflow-x-auto">
          <div className="relative flex items-start justify-start min-w-[700px] h-48 select-none">
            {/* White Keys */}
            {keys
              .filter((k) => !k.isBlack)
              .map((k) => {
                const isActive = activeNoteName?.includes(k.note) && activeNoteName?.includes(`${k.octave}`);
                return (
                  <div
                    key={`${k.pitch}-${k.octave}`}
                    onClick={() => playNote(k.freq, `${k.note}${k.octave}`)}
                    className={`relative flex flex-col justify-between items-center w-12 h-44 rounded-b-xl border-x border-b transition-all cursor-pointer shadow-md mx-[1px] pt-2 pb-2 ${
                      isActive
                        ? 'bg-gradient-to-b from-amber-200 to-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-400/40 translate-y-1'
                        : 'bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 hover:from-white hover:to-slate-200 text-slate-900 border-slate-400'
                    }`}
                  >
                    {/* Top Musical Sign & Glyph */}
                    <span className="text-base font-serif font-black tracking-tight" style={{ color: k.color }}>
                      {k.musicalSign}
                    </span>

                    {/* Keyboard binding prompt */}
                    {k.keyboardKey && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[9px] font-black border border-slate-700">
                        {k.keyboardKey}
                      </span>
                    )}

                    {/* Bottom: Note Name & Exact Frequency */}
                    <div className="text-center w-full px-0.5">
                      <div className="text-xs font-black leading-tight tracking-tight">
                        {k.note}
                        <span className="text-[9px] opacity-75">{k.octave}</span>
                      </div>
                      <div className="text-[9px] font-mono font-semibold text-slate-600 truncate">
                        {Math.round(k.freq)} Hz
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Black Keys (Overlayed absolute positioned) */}
            <div className="absolute top-0 left-0 right-0 flex pointer-events-none">
              {keys.map((k, idx) => {
                if (!k.isBlack) return null;

                // Calculate horizontal position relative to preceding white keys
                const whiteCountBefore = keys.slice(0, idx).filter((item) => !item.isBlack).length;
                // Each white key is 48px + 2px margin = 50px
                const leftPos = whiteCountBefore * 50 - 15;

                const isActive = activeNoteName?.includes(k.note) && activeNoteName?.includes(`${k.octave}`);

                return (
                  <div
                    key={`${k.pitch}-${k.octave}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playNote(k.freq, `${k.note}${k.octave}`);
                    }}
                    style={{ left: `${leftPos}px` }}
                    className={`pointer-events-auto absolute top-0 w-8 h-28 rounded-b-lg border border-slate-950 flex flex-col justify-between items-center pt-2 pb-1.5 cursor-pointer z-10 transition-all shadow-xl ${
                      isActive
                        ? 'bg-gradient-to-b from-amber-500 to-amber-700 text-white border-amber-400 shadow-amber-500/50 translate-y-1'
                        : 'bg-gradient-to-b from-slate-900 via-slate-950 to-black hover:from-slate-800 hover:to-slate-900 text-amber-400'
                    }`}
                  >
                    <span className="text-xs font-black text-amber-300">♯</span>
                    {k.keyboardKey && (
                      <span className="px-1 rounded bg-slate-800 text-amber-300 text-[8px] font-bold border border-slate-700">
                        {k.keyboardKey}
                      </span>
                    )}
                    <div className="text-center w-full px-0.5">
                      <div className="text-[10px] font-black text-slate-200 leading-none">
                        {k.note}
                      </div>
                      <div className="text-[8px] font-mono text-amber-400 truncate">
                        {Math.round(k.freq)}Hz
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sacred Solfeggio & Chakra Scale Frequencies */}
      <div className="space-y-2 bg-[#070e1c] p-3.5 rounded-xl border border-[#162744]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> FRÉQUENCES SACRÉES SOLFEGGIO & CYMATIQUE
          </span>
          <span className="text-[10px] text-slate-500">
            Harmoniques anciennes établies (396Hz UT à 963Hz SI)
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
          {SOLFEGGIO_PRESETS.map((sol) => (
            <button
              key={sol.freq}
              onClick={() => playSolfeggio(sol)}
              className="flex flex-col items-center p-2 rounded-xl bg-[#0e192c] hover:bg-[#162744] border border-[#1e3458] transition-all hover:scale-105 group text-center"
            >
              <span className="text-xs font-black font-serif" style={{ color: sol.color }}>
                {sol.sign}
              </span>
              <span className="text-xs font-black text-slate-200 group-hover:text-amber-300">
                {sol.note}
              </span>
              <span className="text-[10px] font-mono text-cyan-300 font-bold">
                {sol.freq} Hz
              </span>
              <span className="text-[8px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                {sol.meaning}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Arpeggiator & Musical Sequences */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#070e1c] p-3.5 rounded-xl border border-[#162744]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlayingArp(!isPlayingArp)}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all border ${
              isPlayingArp
                ? 'bg-rose-500 text-slate-950 border-rose-300 shadow-lg shadow-rose-500/40 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
            }`}
          >
            {isPlayingArp ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlayingArp ? 'ARRÊTER L’ARPÈGE' : 'DÉMARRER L’ARPÉGIATEUR'}</span>
          </button>

          <div className="flex items-center gap-1 bg-[#101b2f] p-1 rounded-lg border border-[#1c3050]">
            {(['up', 'down', 'solfeggio', 'fibonacci'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setArpMode(m)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                  arpMode === m ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'solfeggio' ? 'Solfège Sacré' : m === 'fibonacci' ? 'Fibonacci' : m === 'up' ? 'Montant' : 'Descendant'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-bold">TEMPO BPM :</span>
            <input
              type="range"
              min="40"
              max="240"
              value={arpBpm}
              onChange={(e) => setArpBpm(Number(e.target.value))}
              className="w-24 accent-amber-400"
            />
            <span className="text-xs font-black text-amber-300 w-10">{arpBpm}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
