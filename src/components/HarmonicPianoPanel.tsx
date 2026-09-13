import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Music,
  Play,
  Square,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Zap,
  RotateCcw,
  Layers,
  Activity,
  Compass,
  Repeat,
  Hand,
  Power,
  Info,
  ChevronDown,
  ChevronUp,
  Radio
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
  // Default to 'momentary' (Push & Release comme un vrai piano)
  const [playMode, setPlayMode] = useState<'momentary' | 'latch'>('momentary');
  const [isPlayingArp, setIsPlayingArp] = useState<boolean>(false);
  const [arpBpm, setArpBpm] = useState<number>(120);
  const [arpMode, setArpMode] = useState<'up' | 'down' | 'solfeggio' | 'fibonacci'>('up');
  const [waveform, setWaveform] = useState<ChannelConfig['waveform']>('sine');
  const [masterVol, setMasterVol] = useState<number>(0.8);
  const [audioRunning, setAudioRunning] = useState<boolean>(false);
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);

  const arpTimerRef = useRef<number | null>(null);
  const arpStepRef = useRef<number>(0);
  const activeKeysCountRef = useRef<number>(0);
  const isPointerActiveRef = useRef<boolean>(false);

  // Synchronize audio context state with UI
  useEffect(() => {
    const checkState = () => {
      const state = engine.getAudioContextState();
      setAudioRunning(state === 'running');
    };
    checkState();
    const timer = setInterval(checkState, 400);
    return () => clearInterval(timer);
  }, [engine]);

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

  const keys = useMemo(() => generateKeys(), [currentOctave, tuningBase]);

  // Silence / Stop note completely ("Rien du tout")
  const stopNote = useCallback(() => {
    setActiveNoteName(null);
    if (isPlayingArp) setIsPlayingArp(false);
    engine.releasePianoNote();
  }, [engine, isPlayingArp]);

  // Master Power Toggle (ON / OFF)
  const togglePower = async () => {
    const isNowRunning = await engine.toggleAudioState();
    setAudioRunning(isNowRunning);
    if (!isNowRunning) {
      stopNote();
    } else {
      // Direct audible confirmation
      const f = computeFreq('A', currentOctave);
      playNote(f, `LA${currentOctave}`);
    }
  };

  // Play a note & apply frequencies to Vector Oscilloscope generators
  const playNote = useCallback(
    async (freq: number, noteLabel: string) => {
      setActiveNoteName(noteLabel);
      setActiveFreq(freq);

      const ratio = HARMONIC_INTERVALS[selectedRatioIndex].ratio;
      const freqX = Math.round(freq * 10) / 10;
      const freqY = Math.round(freq * ratio * 10) / 10;

      // Always guarantee Audio Engine is active and running
      await engine.resumeContext();
      setAudioRunning(true);
      engine.triggerPianoNote(freqX, freqY, waveform);
      onSelectPresetName(`Note ${noteLabel} (${freqX}Hz / ${freqY}Hz)`);
    },
    [engine, selectedRatioIndex, waveform, onSelectPresetName]
  );

  // Play Solfeggio direct preset
  const playSolfeggio = (preset: (typeof SOLFEGGIO_PRESETS)[0]) => {
    playNote(preset.freq, `${preset.note} (${preset.freq}Hz)`);
  };

  // Global pointer release listener: prevents stuck notes in momentary mode
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (isPointerActiveRef.current) {
        isPointerActiveRef.current = false;
        if (playMode === 'momentary') {
          stopNote();
        }
      }
    };

    const handleWindowBlur = () => {
      activeKeysCountRef.current = 0;
      isPointerActiveRef.current = false;
      if (playMode === 'momentary') {
        stopNote();
      }
    };

    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [playMode, stopNote]);

  // Keyboard Event Handlers (Support momentary & latch)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (key === 'escape' || key === ' ') {
        e.preventDefault();
        stopNote();
        return;
      }
      const mapped = keyboardKeyMap[key];
      if (mapped) {
        activeKeysCountRef.current++;
        const freq = computeFreq(mapped.pitch, currentOctave + mapped.octaveOffset);
        playNote(freq, `${mapped.pitch}${currentOctave + mapped.octaveOffset}`);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      const mapped = keyboardKeyMap[key];
      if (mapped) {
        activeKeysCountRef.current = Math.max(0, activeKeysCountRef.current - 1);
        if (playMode === 'momentary' && activeKeysCountRef.current === 0) {
          stopNote();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentOctave, tuningBase, playNote, playMode, stopNote]);

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

  const isMutedOrSilent = configX.mute && configY.mute;

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-5 font-mono text-xs text-slate-300 shadow-2xl space-y-5 select-none">
      {/* Top Master Power & Control Header */}
      <div className="bg-gradient-to-r from-[#0d1b33] via-[#0f2244] to-[#0d1b33] border-2 border-[#1d355c] rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
            <Music className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-amber-300 tracking-wider uppercase">
                PIANO HARMONIQUE & GÉNÉRATEUR VECTORIEL
              </h2>
              <span className="px-2 py-0.5 text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40 rounded-full font-bold">
                DIRECT AUDIO & LISSAJOUS
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Touchez les touches pour générer instantanément le son stéréo et dessiner les figures géométriques sur l'oscilloscope.
            </p>
          </div>
        </div>

        {/* Master Audio Power Controls & Volume */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Main ON / OFF Power Switch */}
          <button
            onClick={togglePower}
            title="Activer ou mettre en veille le son (autorise la carte son de votre navigateur)"
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all border shadow-lg ${
              audioRunning
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300 shadow-emerald-500/30'
                : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-rose-600/40 animate-pulse'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{audioRunning ? 'AUDIO : ON (ACTIF)' : 'CLIQUEZ ICI : ACTIVER LE SON (ON)'}</span>
          </button>

          {/* Test Sound Button (La 432 Hz) */}
          <button
            onClick={() => playNote(432, 'LA4 (432Hz Test)')}
            title="Émettre un son de test immédiat à 432 Hz"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs bg-[#10223e] hover:bg-[#18345e] text-cyan-300 border border-cyan-500/40 transition-all hover:scale-105"
          >
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>TESTER LE SON ♫</span>
          </button>

          {/* Quick Silence (Rien du tout) button */}
          <button
            onClick={stopNote}
            title="Couper immédiatement le son / Retour au silence (Touche Échap ou Espace)"
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-black text-xs transition-all border shadow-md ${
              isMutedOrSilent || !activeNoteName
                ? 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-slate-200'
                : 'bg-amber-600 hover:bg-amber-500 text-slate-950 border-amber-400 shadow-amber-600/30'
            }`}
          >
            <VolumeX className="w-4 h-4" />
            <span>SILENCE (RIEN)</span>
          </button>

          {/* Master Volume Slider */}
          <div className="flex items-center gap-2 bg-[#070e1c] px-3 py-1.5 rounded-xl border border-[#162744]">
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] text-slate-400 font-bold">VOLUME :</span>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={masterVol}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setMasterVol(val);
                engine.setMasterVolume(val);
              }}
              className="w-20 accent-amber-400"
            />
            <span className="text-xs font-black text-amber-300 w-10 text-right">
              {Math.round(masterVol * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Explanatory Guide Drawer */}
      <div className="bg-[#070f1e] border border-[#162846] rounded-xl p-3 text-[11px] space-y-2">
        <div
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-amber-300"
        >
          <span className="flex items-center gap-2 font-bold text-amber-400">
            <Info className="w-4 h-4" /> COMMENT FONCTIONNE LE PIANO VECTORIEL ? (GUIDE EXPRESS)
          </span>
          <button className="text-slate-400 hover:text-white">
            {showHowItWorks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showHowItWorks && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#14233c] text-slate-400 leading-relaxed">
            <div className="bg-[#0b162a] p-2.5 rounded-lg border border-[#1c3050]">
              <div className="text-amber-300 font-bold mb-1">1. Déverrouillage du son</div>
              <p>
                Par sécurité, les navigateurs web coupent le son au chargement. Cliquez sur le bouton vert <strong>AUDIO : ON</strong> ou sur n'importe quelle touche pour allumer le moteur sonore.
              </p>
            </div>
            <div className="bg-[#0b162a] p-2.5 rounded-lg border border-[#1c3050]">
              <div className="text-cyan-300 font-bold mb-1">2. Son Stéréo & Lissajous</div>
              <p>
                Chaque touche joue une note fondamentale sur la voie X (Gauche) et son harmonique sur la voie Y (Droite) selon le ratio choisi (ex. Quinte 3:2), ce qui fait danser l'oscilloscope !
              </p>
            </div>
            <div className="bg-[#0b162a] p-2.5 rounded-lg border border-[#1c3050]">
              <div className="text-emerald-300 font-bold mb-1">3. Clavier Physique & Tactile</div>
              <p>
                Jouez à la souris, au doigt sur écran tactile, ou directement avec votre clavier d'ordinateur (touches <strong>A, W, S, E, D, F, T, G, Y, H, U, J, K</strong>). Touche Échap = Silence.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#070e1c] px-4 py-2.5 rounded-xl border border-[#162744]">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${audioRunning && activeNoteName && !isMutedOrSilent ? 'bg-amber-400 animate-ping' : audioRunning ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">NOTE ACTIVE & FRÉQUENCES GÉNÉRÉES</div>
            <div className="text-sm font-black text-amber-300">
              {activeNoteName && !isMutedOrSilent ? (
                <>
                  {activeNoteName} <span className="text-slate-400 text-xs font-normal">({activeFreq.toFixed(1)} Hz) • X:{Math.round(activeFreq)}Hz / Y:{Math.round(activeFreq * HARMONIC_INTERVALS[selectedRatioIndex].ratio)}Hz</span>
                </>
              ) : (
                <span className="text-slate-500 font-normal italic">En attente de touche • Silence</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold">INTERVALLE HARMONIQUE :</span>
          <span className="px-2 py-1 bg-[#101b2f] border border-[#1c3050] rounded text-cyan-300 font-bold">
            {HARMONIC_INTERVALS[selectedRatioIndex].label} ({HARMONIC_INTERVALS[selectedRatioIndex].desc})
          </span>
        </div>
      </div>

      {/* Prominent Mode Selector: Push & Release (Vrai Piano) vs Rester Enclenché */}
      <div className="bg-[#070e1c] border-2 border-[#1c355e] rounded-2xl p-3.5 shadow-lg space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-black text-amber-300 flex items-center gap-2 uppercase tracking-wide">
            <Hand className="w-4 h-4 text-amber-400" /> CHOIX DU MODE DE JEU (2 MODES AU CHOIX) :
          </span>
          <span className="text-[11px] text-slate-400">
            {playMode === 'momentary'
              ? 'Mode actif : Vrai Piano (Appuyer = Jouer • Relâcher = Silence)'
              : 'Mode actif : Maintien Continu (La note reste allumée en continu après le clic)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Mode 1: Push & Release */}
          <button
            type="button"
            onClick={() => {
              setPlayMode('momentary');
              stopNote();
            }}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              playMode === 'momentary'
                ? 'bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border-amber-400 shadow-md shadow-amber-500/20 text-white ring-1 ring-amber-400/40'
                : 'bg-[#0d1728] hover:bg-[#122038] border-[#1a2d4c] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0 ${
                playMode === 'momentary'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              🎹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-300 uppercase">
                  1. PUSH & RELEASE (VRAI PIANO)
                </span>
                {playMode === 'momentary' && (
                  <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black text-[9px] rounded">
                    ACTIF
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">
                Le son et le tracé jouent <strong>uniquement pendant l'appui</strong> (clic maintenu, doigt posé ou touche clavier) et <strong>s'arrêtent net dès le relâchement</strong>.
              </p>
            </div>
          </button>

          {/* Mode 2: Rester enclenché (Latch) */}
          <button
            type="button"
            onClick={() => setPlayMode('latch')}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              playMode === 'latch'
                ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-400/10 to-transparent border-cyan-400 shadow-md shadow-cyan-500/20 text-white ring-1 ring-cyan-400/40'
                : 'bg-[#0d1728] hover:bg-[#122038] border-[#1a2d4c] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0 ${
                playMode === 'latch'
                  ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              ♾️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-cyan-300 uppercase">
                  2. RESTER ENCLENCHÉ (CONTINU / LATCH)
                </span>
                {playMode === 'latch' && (
                  <span className="px-1.5 py-0.2 bg-cyan-400 text-slate-950 font-black text-[9px] rounded">
                    ACTIF
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">
                Un simple clic <strong>maintient la note allumée</strong> en continu pour admirer la figure de Lissajous sans garder le doigt appuyé.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Control Bar: Tuning Mode, Octaves, Intervals, Waveform */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#070e1c] p-3 rounded-xl border border-[#162744]">

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
            HARMONIQUE Y:X ({HARMONIC_INTERVALS[selectedRatioIndex]?.label || 'Ratio'})
          </label>
          <select
            value={selectedRatioIndex}
            onChange={(e) => setSelectedRatioIndex(Number(e.target.value))}
            className="w-full bg-[#101b2f] border border-[#1c3050] rounded px-2 py-1 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
          >
            {HARMONIC_INTERVALS.map((int, i) => (
              <option key={i} value={i}>
                {int?.label || `Ratio ${i}`} — {int?.desc || ''}
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
            <Music className="w-3.5 h-3.5 text-amber-400" /> CLAVIER PHYSIQUE (TOUCHES CLAVIER : A, W, S, E, D, F, T, G, Y, H, U, J, K • ÉCHAP/ESPACE = SILENCE)
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
                const isActive = !isMutedOrSilent && activeNoteName?.includes(k.note) && activeNoteName?.includes(`${k.octave}`);
                return (
                  <div
                    key={`${k.pitch}-${k.octave}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      isPointerActiveRef.current = true;
                      playNote(k.freq, `${k.note}${k.octave}`);
                    }}
                    onPointerUp={(e) => {
                      e.preventDefault();
                      if (playMode === 'momentary') {
                        isPointerActiveRef.current = false;
                        stopNote();
                      }
                    }}
                    onPointerLeave={() => {
                      if (playMode === 'momentary' && isPointerActiveRef.current) {
                        isPointerActiveRef.current = false;
                        stopNote();
                      }
                    }}
                    onPointerCancel={() => {
                      if (playMode === 'momentary') {
                        isPointerActiveRef.current = false;
                        stopNote();
                      }
                    }}
                    className={`relative flex flex-col justify-between items-center w-12 h-44 rounded-b-xl border-x border-b transition-all cursor-pointer shadow-md mx-[1px] pt-2 pb-2 touch-none select-none ${
                      isActive
                        ? 'bg-gradient-to-b from-amber-200 to-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-400/40 translate-y-1'
                        : 'bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 hover:from-white hover:to-slate-200 text-slate-900 border-slate-400 active:scale-[0.98]'
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

                const isActive = !isMutedOrSilent && activeNoteName?.includes(k.note) && activeNoteName?.includes(`${k.octave}`);

                return (
                  <div
                    key={`${k.pitch}-${k.octave}`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      isPointerActiveRef.current = true;
                      playNote(k.freq, `${k.note}${k.octave}`);
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (playMode === 'momentary') {
                        isPointerActiveRef.current = false;
                        stopNote();
                      }
                    }}
                    onPointerLeave={(e) => {
                      e.stopPropagation();
                      if (playMode === 'momentary' && isPointerActiveRef.current) {
                        isPointerActiveRef.current = false;
                        stopNote();
                      }
                    }}
                    onPointerCancel={(e) => {
                      e.stopPropagation();
                      if (playMode === 'momentary') {
                        isPointerActiveRef.current = false;
                        stopNote();
                      }
                    }}
                    style={{ left: `${leftPos}px` }}
                    className={`pointer-events-auto absolute top-0 w-8 h-28 rounded-b-lg border border-slate-950 flex flex-col justify-between items-center pt-2 pb-1.5 cursor-pointer z-10 transition-all shadow-xl touch-none select-none ${
                      isActive
                        ? 'bg-gradient-to-b from-amber-500 to-amber-700 text-white border-amber-400 shadow-amber-500/50 translate-y-1'
                        : 'bg-gradient-to-b from-slate-900 via-slate-950 to-black hover:from-slate-800 hover:to-slate-900 text-amber-400 active:scale-[0.98]'
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
            Harmoniques anciennes établies ({playMode === 'momentary' ? 'Maintenez pour jouer' : 'Cliquez pour activer'})
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
          {SOLFEGGIO_PRESETS.map((sol) => (
            <button
              key={sol.freq}
              onPointerDown={(e) => {
                e.preventDefault();
                isPointerActiveRef.current = true;
                playSolfeggio(sol);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                if (playMode === 'momentary') {
                  isPointerActiveRef.current = false;
                  stopNote();
                }
              }}
              onPointerLeave={() => {
                if (playMode === 'momentary' && isPointerActiveRef.current) {
                  isPointerActiveRef.current = false;
                  stopNote();
                }
              }}
              className="flex flex-col items-center p-2 rounded-xl bg-[#0e192c] hover:bg-[#162744] border border-[#1e3458] transition-all hover:scale-105 active:scale-95 group text-center touch-none select-none"
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
