import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Shuffle,
  SkipForward,
  Plus,
  Trash2,
  Download,
  Clock,
  Radio,
  Sliders
} from 'lucide-react';
import { SequencerStep, PresetName } from '../types/vectorScope';
import { triggerTextDownload } from '../services/exportUtils';

interface SequencerViewProps {
  onApplyStep: (step: SequencerStep) => void;
}

const DEFAULT_STEPS: SequencerStep[] = [
  {
    id: 's1',
    name: 'Cercle Fondamental',
    shape: 'Circle',
    duration: 2.0,
    pause: 0.2,
    freqX: 220,
    freqY: 220,
    phase: 90,
    amplitude: 0.8,
    modulation: 0,
  },
  {
    id: 's2',
    name: 'Lissajous 3:2',
    shape: 'Lissajous',
    duration: 2.5,
    pause: 0.2,
    freqX: 220,
    freqY: 330,
    phase: 45,
    amplitude: 0.85,
    modulation: 0.15,
  },
  {
    id: 's3',
    name: 'Rose Trois Pétales',
    shape: 'Rose Three',
    duration: 3.0,
    pause: 0.2,
    freqX: 220,
    freqY: 220,
    phase: 0,
    amplitude: 0.9,
    modulation: 0.2,
  },
  {
    id: 's4',
    name: 'Genesis Mandala',
    shape: 'Genesis Mandala',
    duration: 3.5,
    pause: 0.2,
    freqX: 440,
    freqY: 440,
    phase: 180,
    amplitude: 0.8,
    modulation: 0.3,
  },
];

export const SequencerView: React.FC<SequencerViewProps> = ({ onApplyStep }) => {
  const [steps, setSteps] = useState<SequencerStep[]>(DEFAULT_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isRandom, setIsRandom] = useState<boolean>(false);

  // Playback Step Timer
  useEffect(() => {
    if (!isPlaying || steps.length === 0) return;

    const step = steps[currentStepIndex];
    if (step) {
      onApplyStep(step);
    }

    const timer = setTimeout(() => {
      if (isRandom) {
        const nextRand = Math.floor(Math.random() * steps.length);
        setCurrentStepIndex(nextRand);
      } else {
        const next = currentStepIndex + 1;
        if (next < steps.length) {
          setCurrentStepIndex(next);
        } else if (isLooping) {
          setCurrentStepIndex(0);
        } else {
          setIsPlaying(false);
        }
      }
    }, (step.duration + step.pause) * 1000);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, isLooping, isRandom, steps]);

  const addStep = () => {
    const num = steps.length + 1;
    const newStep: SequencerStep = {
      id: `step_${Date.now()}`,
      name: `Étape ${num}`,
      shape: 'Circle',
      duration: 2.0,
      pause: 0.1,
      freqX: 220 * (num % 3 === 0 ? 1.5 : num % 2 === 0 ? 2 : 1),
      freqY: 220,
      phase: 90,
      amplitude: 0.8,
      modulation: 0,
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const updateStep = (id: string, updates: Partial<SequencerStep>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const exportSequenceJson = () => {
    const data = JSON.stringify(steps, null, 2);
    triggerTextDownload(data, `genesis_sequence_${Date.now()}.json`, 'application/json');
  };

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-5 font-mono text-xs text-slate-300 shadow-xl space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-sm tracking-wide">
              SÉQUENCEUR DE TRAJECTOIRES VECTORIELLES & TIMELINE
            </h2>
            <p className="text-[11px] text-slate-400">
              Automatisation chronologique des formes, fréquences, phases et modulations
            </p>
          </div>
        </div>

        {/* Transport Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs ${
              isPlaying
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'LECTURE'}</span>
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(0);
            }}
            className="p-1.5 rounded-lg bg-[#101d34] hover:bg-[#1a3055] text-slate-300"
            title="Arrêt"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={() => setCurrentStepIndex((prev) => (prev + 1) % steps.length)}
            className="p-1.5 rounded-lg bg-[#101d34] hover:bg-[#1a3055] text-slate-300"
            title="Étape suivante"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 rounded-lg transition-colors ${
              isLooping ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40' : 'bg-[#101d34] text-slate-500'
            }`}
            title={isLooping ? 'Boucle activée' : 'Boucle désactivée'}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsRandom(!isRandom)}
            className={`p-1.5 rounded-lg transition-colors ${
              isRandom ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40' : 'bg-[#101d34] text-slate-500'
            }`}
            title="Ordre aléatoire"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={addStep}
            className="px-2.5 py-1.5 rounded-lg bg-[#101d34] hover:bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> ÉTAPE
          </button>

          <button
            onClick={exportSequenceJson}
            className="p-1.5 rounded-lg bg-[#101d34] hover:bg-[#1a3055] text-slate-300"
            title="Exporter la séquence JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timeline Steps Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step, idx) => {
          const isCurrent = idx === currentStepIndex && isPlaying;
          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-cyan-950/50 border-cyan-400 shadow-lg shadow-cyan-500/20'
                  : 'bg-[#060c18] border-[#14233c] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[#14233c] pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      isCurrent ? 'bg-cyan-400 text-slate-950' : 'bg-[#101e35] text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={step.name}
                    onChange={(e) => updateStep(step.id, { name: e.target.value })}
                    className="bg-transparent font-bold text-slate-200 text-xs border-b border-transparent focus:border-cyan-400 outline-none w-28"
                  />
                </div>
                <button
                  onClick={() => removeStep(step.id)}
                  className="text-slate-500 hover:text-rose-400"
                  title="Supprimer l'étape"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Step Parameters */}
              <div className="space-y-2 text-[10px]">
                {/* Shape Preset */}
                <div>
                  <span className="text-slate-500 block mb-1">Forme :</span>
                  <select
                    value={step.shape}
                    onChange={(e) => updateStep(step.id, { shape: e.target.value as PresetName })}
                    className="w-full px-2 py-1 bg-[#091325] border border-[#162744] rounded text-slate-200 font-bold"
                  >
                    <option value="Circle">Cercle</option>
                    <option value="Ellipse">Ellipse</option>
                    <option value="Line">Ligne</option>
                    <option value="Lissajous">Lissajous</option>
                    <option value="Spiral">Spirale</option>
                    <option value="Rose Three">Rose 3 Pétales</option>
                    <option value="Rose Five">Rose 5 Pétales</option>
                    <option value="Rose Seven">Rose 7 Pétales</option>
                    <option value="Genesis Mandala">Genesis Mandala</option>
                  </select>
                </div>

                {/* Duration & Pause */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Durée (s) :</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="60"
                      value={step.duration}
                      onChange={(e) => updateStep(step.id, { duration: parseFloat(e.target.value) || 1 })}
                      className="w-full px-1.5 py-0.5 bg-[#091325] border border-[#162744] rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block">Pause (s) :</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={step.pause}
                      onChange={(e) => updateStep(step.id, { pause: parseFloat(e.target.value) || 0 })}
                      className="w-full px-1.5 py-0.5 bg-[#091325] border border-[#162744] rounded text-slate-200"
                    />
                  </div>
                </div>

                {/* Frequencies X & Y */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Freq X (Hz) :</span>
                    <input
                      type="number"
                      value={step.freqX}
                      onChange={(e) => updateStep(step.id, { freqX: parseFloat(e.target.value) || 1 })}
                      className="w-full px-1.5 py-0.5 bg-[#091325] border border-[#162744] rounded text-cyan-300 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block">Freq Y (Hz) :</span>
                    <input
                      type="number"
                      value={step.freqY}
                      onChange={(e) => updateStep(step.id, { freqY: parseFloat(e.target.value) || 1 })}
                      className="w-full px-1.5 py-0.5 bg-[#091325] border border-[#162744] rounded text-amber-300 font-bold"
                    />
                  </div>
                </div>

                {/* Phase & Amplitude */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Phase :</span>
                    <input
                      type="number"
                      min="0"
                      max="360"
                      value={step.phase}
                      onChange={(e) => updateStep(step.id, { phase: parseFloat(e.target.value) || 0 })}
                      className="w-full px-1.5 py-0.5 bg-[#091325] border border-[#162744] rounded text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block">Amplitude :</span>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={step.amplitude}
                      onChange={(e) => updateStep(step.id, { amplitude: parseFloat(e.target.value) || 0 })}
                      className="w-full px-1.5 py-0.5 bg-[#091325] border border-[#162744] rounded text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
