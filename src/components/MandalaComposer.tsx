import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Play,
  Sparkles,
  Eye,
  EyeOff,
  Clock,
  RotateCw,
  Zap,
  Sliders
} from 'lucide-react';
import { MandalaLayer, MandalaCombineMode } from '../types/vectorScope';

interface MandalaComposerProps {
  layers: MandalaLayer[];
  onLayersChange: (layers: MandalaLayer[]) => void;
  combineMode: MandalaCombineMode;
  onCombineModeChange: (mode: MandalaCombineMode) => void;
  onApplyToAudioEngine: () => void;
}

export const MandalaComposer: React.FC<MandalaComposerProps> = ({
  layers,
  onLayersChange,
  combineMode,
  onCombineModeChange,
  onApplyToAudioEngine,
}) => {
  const addLayer = () => {
    const nextIdx = layers.length + 1;
    const newLayer: MandalaLayer = {
      id: `layer_${Date.now()}`,
      name: `Couche ${nextIdx}`,
      enabled: true,
      shape: nextIdx % 2 === 0 ? 'rose' : 'circle',
      frequency: 220 * (nextIdx === 2 ? 1.5 : nextIdx === 3 ? 2 : 1),
      ratio: 1,
      phase: (nextIdx * 45) % 360,
      amplitude: 0.75,
      rotation: (nextIdx * 30) % 360,
      duration: 2.0,
      k: nextIdx + 2,
    };
    onLayersChange([...layers, newLayer]);
  };

  const removeLayer = (id: string) => {
    onLayersChange(layers.filter((l) => l.id !== id));
  };

  const updateLayer = (id: string, updates: Partial<MandalaLayer>) => {
    onLayersChange(layers.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-5 font-mono text-xs text-slate-300 shadow-xl space-y-5">
      {/* Header & Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-sm tracking-wide">
              MANDALA COMPOSER — SUPERPOSITION MULTI-COUCHES VECTORIELLES
            </h2>
            <p className="text-[11px] text-slate-400">
              Combinaison mathématique ou persistance optique rapide (Time-Multiplexing)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addLayer}
            className="px-3 py-1.5 rounded-md bg-[#101e35] text-cyan-300 border border-cyan-500/30 hover:bg-cyan-950/40 flex items-center gap-1.5 font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> AJOUTER COUCHE
          </button>
          <button
            onClick={onApplyToAudioEngine}
            className="px-3 py-1.5 rounded-md bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 text-xs"
          >
            <Zap className="w-3.5 h-3.5 fill-current" /> ACTIVER SUR OSCILLOSCOPE
          </button>
        </div>
      </div>

      {/* Mode Explanation & Selection */}
      <div className="bg-[#060c18] p-3 rounded-xl border border-[#14233c] space-y-2">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
          MODE DE COMBINAISON :
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            {
              id: 'TIME_MULTIPLEX',
              label: 'TIME MULTIPLEX',
              badge: 'Recommandé',
              desc: 'Alternance ultra-rapide (persistance rétinienne CRT pure)',
            },
            { id: 'ADD', label: 'ADDITION', desc: 'Somme mathématique X1+X2, Y1+Y2' },
            { id: 'MULTIPLY', label: 'MULTIPLICATION', desc: 'Modulation en anneau X1·X2' },
            { id: 'MORPH', label: 'MORPHING', desc: 'Interpolation temporelle continue' },
            { id: 'SEQUENCE', label: 'SÉQUENCE', desc: 'Lecture alternée selon durée' },
          ].map((m) => {
            const isSelected = combineMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onCombineModeChange(m.id as MandalaCombineMode)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-md font-bold'
                    : 'bg-[#091325] border-[#162744] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold">{m.label}</span>
                  {m.badge && (
                    <span className="text-[8px] px-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                      {m.badge}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-slate-500 line-clamp-2">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layers List */}
      <div className="space-y-3">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={`p-3.5 rounded-xl border transition-all ${
              layer.enabled
                ? 'bg-[#060c18] border-[#182c4c]'
                : 'bg-[#040810] border-[#101b2f] opacity-60'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#121f35] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateLayer(layer.id, { enabled: !layer.enabled })}
                  className={`p-1.5 rounded ${
                    layer.enabled ? 'text-cyan-400 hover:bg-cyan-950/40' : 'text-slate-600 hover:bg-slate-800'
                  }`}
                  title={layer.enabled ? 'Désactiver' : 'Activer'}
                >
                  {layer.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <span className="w-5 h-5 rounded-full bg-[#101e35] text-cyan-300 font-bold flex items-center justify-center text-[10px]">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={layer.name}
                  onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                  className="bg-transparent font-bold text-slate-200 text-xs border-b border-transparent focus:border-cyan-400 outline-none w-32"
                />
              </div>

              {/* Shape Type */}
              <div className="flex items-center gap-1.5">
                {(['circle', 'rose', 'spiral', 'lissajous'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateLayer(layer.id, { shape: s })}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${
                      layer.shape === s
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-[#101e35] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}

                <button
                  onClick={() => removeLayer(layer.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 ml-2"
                  title="Supprimer la couche"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Layer Sliders */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-[10px]">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Fréquence:</span>
                  <span className="text-cyan-300 font-bold">{layer.frequency.toFixed(0)} Hz</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="5"
                  value={layer.frequency}
                  onChange={(e) => updateLayer(layer.id, { frequency: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Amplitude:</span>
                  <span className="text-cyan-300 font-bold">{(layer.amplitude * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={layer.amplitude}
                  onChange={(e) => updateLayer(layer.id, { amplitude: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Phase:</span>
                  <span className="text-slate-200">{layer.phase.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={layer.phase}
                  onChange={(e) => updateLayer(layer.id, { phase: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 h-1 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Rotation:</span>
                  <span className="text-slate-200">{layer.rotation.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={layer.rotation}
                  onChange={(e) => updateLayer(layer.id, { rotation: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 h-1 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {layer.shape === 'rose' && (
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Pétales (k):</span>
                    <span className="text-amber-300 font-bold">{layer.k}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    step="1"
                    value={layer.k}
                    onChange={(e) => updateLayer(layer.id, { k: parseInt(e.target.value) })}
                    className="w-full accent-amber-400 h-1 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Durée Séquence:</span>
                  <span className="text-slate-200">{layer.duration.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="10"
                  step="0.2"
                  value={layer.duration}
                  onChange={(e) => updateLayer(layer.id, { duration: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
