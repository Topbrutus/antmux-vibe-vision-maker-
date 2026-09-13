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
  Target,
  Atom,
  Gauge,
  HelpCircle
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
  relativisticEnabled: boolean;
  speedOfLightLimit: number;
  gravitationalDilationDepth: number;
  onRelativisticChange: (updates: { enabled?: boolean; speedOfLightLimit?: number; gravitationalDilationDepth?: number }) => void;
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
  relativisticEnabled,
  speedOfLightLimit,
  gravitationalDilationDepth,
  onRelativisticChange,
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

      {/* CERN Physics & Relativity Confinement Engine Panel */}
      <div className="border border-cyan-500/30 bg-[#060c18] rounded-xl p-5 space-y-4">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-[#14233c] pb-3">
          <div className="flex items-center gap-2.5">
            <Atom className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <h3 className="font-bold text-sm tracking-wide text-slate-100 uppercase flex items-center gap-2">
                LABORATOIRE PHYSIQUE RELATIVISTE (CERN)
              </h3>
              <p className="text-[10px] text-slate-400">
                Simulation de dilatation temporelle d'Einstein et confinement des champs de l'accélérateur
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/20">
              MÉTRIQUE ACTIVE
            </span>
          </div>
        </div>

        {/* Explain the "Grichment" (Crackling/Buzzing) */}
        <div className="bg-[#0b162a] border border-[#1d3050] rounded-lg p-3 text-[11px] leading-relaxed text-slate-300 space-y-2">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-cyan-300 font-semibold">D'où vient ce grésillement (grichment) ?</strong> C'est la signature acoustique authentique de la <span className="text-amber-400">synthèse vectorielle</span> ! Sur un oscilloscope (comme l'accélérateur du CERN), le faisceau d'électrons est dévié par des tensions de contrôle. Lorsque la trajectoire dessine des angles vifs ou saute d'un point à un autre, l'accélération tend vers l'infini, créant des harmoniques aiguës très agressives.
            </p>
          </div>
          <p className="pl-6 text-slate-400">
            En activant la <span className="text-cyan-400">Dilatation Relativiste</span> ci-dessous, la vitesse limite de la lumière restreint la vitesse de balayage du faisceau : le temps propre ralentit là où l'accélération est maximale, ce qui adoucit naturellement le signal et "gauchit" géométriquement les figures en de magnifiques géodésiques d'espace-temps !
          </p>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          {/* Toggle Relativistic Time */}
          <div className="space-y-2 bg-[#0a1324] p-3.5 rounded-lg border border-[#14233c] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  TEMPS NON-FIXE :
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest ${
                  relativisticEnabled ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                }`}>
                  {relativisticEnabled ? 'ACTIF (EINSTEIN)' : 'INACTIF (NEWTON)'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Le temps propre ralentit ($d\tau &lt; dt$) en fonction de la vitesse et de la position du faisceau.
              </p>
            </div>
            <button
              onClick={() => onRelativisticChange({ enabled: !relativisticEnabled })}
              className={`w-full py-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 mt-2 ${
                relativisticEnabled
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'bg-[#101d34] text-slate-300 hover:text-cyan-300 border border-[#1a3055]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{relativisticEnabled ? 'DÉSACTIVER MODÈLE CERN' : 'ACTIVER MODÈLE CERN'}</span>
            </button>
          </div>

          {/* Speed of Light Limit (C) */}
          <div className="space-y-2 bg-[#0a1324] p-3.5 rounded-lg border border-[#14233c] flex flex-col justify-between">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="font-bold text-amber-300">VITESSE LUMIÈRE ($C$) :</span>
                <span className="font-bold text-white">{speedOfLightLimit} u/s</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight mb-2">
                Limite cosmique de la vitesse du faisceau. Plus cette valeur est basse, plus l'effet relativiste est prononcé à bas volume.
              </p>
            </div>
            <input
              type="range"
              min="80"
              max="1200"
              step="10"
              value={speedOfLightLimit}
              disabled={!relativisticEnabled}
              onChange={(e) => onRelativisticChange({ speedOfLightLimit: parseFloat(e.target.value) })}
              className={`w-full h-1.5 rounded cursor-pointer accent-amber-400 bg-slate-800 ${
                !relativisticEnabled ? 'opacity-30 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Gravitational Dilation Depth */}
          <div className="space-y-2 bg-[#0a1324] p-3.5 rounded-lg border border-[#14233c] flex flex-col justify-between">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="font-bold text-cyan-300">PUITS GRAVITATIONNEL :</span>
                <span className="font-bold text-white">{(gravitationalDilationDepth * 100).toFixed(0)} %</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight mb-2">
                Intensité du ralentissement du temps près du centre (simule une singularité gravitationnelle ou une cavité RF).
              </p>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.95"
              step="0.05"
              value={gravitationalDilationDepth}
              disabled={!relativisticEnabled}
              onChange={(e) => onRelativisticChange({ gravitationalDilationDepth: parseFloat(e.target.value) })}
              className={`w-full h-1.5 rounded cursor-pointer accent-cyan-400 bg-slate-800 ${
                !relativisticEnabled ? 'opacity-30 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
