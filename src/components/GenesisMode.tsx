import React from 'react';
import {
  Sparkles,
  Radio,
  RotateCw,
  Sliders,
  Download,
  Square,
  Play,
  Zap,
  Target
} from 'lucide-react';
import { ChannelConfig, ScopeDisplaySettings } from '../types/vectorScope';

interface GenesisModeProps {
  configX: ChannelConfig;
  configY: ChannelConfig;
  onConfigChangeX: (cfg: Partial<ChannelConfig>) => void;
  onConfigChangeY: (cfg: Partial<ChannelConfig>) => void;
  scopeSettings: ScopeDisplaySettings;
  onScopeSettingsChange: (settings: Partial<ScopeDisplaySettings>) => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  onExport: () => void;
  onGenerateHarmonicMandala: () => void;
}

export const GenesisMode: React.FC<GenesisModeProps> = ({
  configX,
  configY,
  onConfigChangeX,
  onConfigChangeY,
  scopeSettings,
  onScopeSettingsChange,
  isRecording,
  onToggleRecord,
  onExport,
  onGenerateHarmonicMandala,
}) => {
  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-6 font-mono text-xs text-slate-300 shadow-xl space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-base tracking-wide">
              MODE ÉPURÉ « GENESIS »
            </h2>
            <p className="text-[11px] text-cyan-400">
              Interface minimaliste de synthèse harmonique directe
            </p>
          </div>
        </div>

        {/* Action buttons: Record & Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleRecord}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-xs transition-all ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-[#101d34] text-slate-300 hover:text-rose-400 border border-[#1a3055]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-rose-500'}`} />
            <span>{isRecording ? 'REC EN COURS...' : 'ENREGISTRER'}</span>
          </button>

          <button
            onClick={onExport}
            className="px-3 py-1.5 rounded-lg bg-[#101d34] text-amber-300 hover:bg-[#1a3055] border border-amber-500/30 flex items-center gap-1.5 text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5" /> EXPORTER
          </button>
        </div>
      </div>

      {/* Prominent "GENERATE MANDALA" Button */}
      <div className="flex flex-col items-center justify-center py-2">
        <button
          onClick={onGenerateHarmonicMandala}
          className="group relative w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-500 text-slate-950 font-black text-sm tracking-wider uppercase shadow-xl shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/30"
        >
          <Sparkles className="w-5 h-5 fill-current animate-spin group-hover:rotate-180 transition-transform duration-700" />
          <span>GÉNÉRER MANDALA (RÉSONANCE HARMONIQUE)</span>
        </button>
        <span className="text-[11px] text-slate-400 mt-2 text-center">
          Génère le mandala vectoriel directement depuis les fréquences, amplitudes et phases actuelles
        </span>
      </div>

      {/* Essential Genesis Controls Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-[#060c18] p-5 rounded-xl border border-[#14233c]">
        {/* 1. FREQUENCY */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="font-bold text-cyan-300">FRÉQUENCE F0 :</span>
            <span className="font-bold text-white">{configX.frequency.toFixed(1)} Hz</span>
          </div>
          <input
            type="range"
            min="20"
            max="1200"
            step="5"
            value={configX.frequency}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onConfigChangeX({ frequency: val });
              onConfigChangeY({ frequency: val });
            }}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* 2. PHASE */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="font-bold text-amber-300">PHASE QUADRATURE :</span>
            <span className="font-bold text-white">{configY.phase.toFixed(0)}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            value={configY.phase}
            onChange={(e) => onConfigChangeY({ phase: parseFloat(e.target.value) })}
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* 3. AMPLITUDE */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="font-bold text-slate-200">AMPLITUDE :</span>
            <span className="font-bold text-white">{(configX.amplitude * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={configX.amplitude}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onConfigChangeX({ amplitude: val });
              onConfigChangeY({ amplitude: val });
            }}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* 4. ROTATION */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="font-bold text-slate-200">ROTATION VISUELLE :</span>
            <span className="font-bold text-white">{scopeSettings.rotation}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            value={scopeSettings.rotation}
            onChange={(e) => onScopeSettingsChange({ rotation: parseFloat(e.target.value) })}
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* 5. CENTER (X / Y) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="font-bold text-slate-200">CENTRAGE X/Y :</span>
            <button
              onClick={() => onScopeSettingsChange({ centerX: 0, centerY: 0 })}
              className="text-[10px] text-cyan-400 hover:underline"
            >
              Recentrer
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="range"
              min="-0.5"
              max="0.5"
              step="0.05"
              value={scopeSettings.centerX}
              onChange={(e) => onScopeSettingsChange({ centerX: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              title="Centre X"
            />
            <input
              type="range"
              min="-0.5"
              max="0.5"
              step="0.05"
              value={scopeSettings.centerY}
              onChange={(e) => onScopeSettingsChange({ centerY: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              title="Centre Y"
            />
          </div>
        </div>

        {/* 6. ZOOM */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="font-bold text-slate-200">ZOOM OPTIQUE :</span>
            <span className="font-bold text-white">{scopeSettings.zoom.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.4"
            max="2.5"
            step="0.05"
            value={scopeSettings.zoom}
            onChange={(e) => onScopeSettingsChange({ zoom: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
