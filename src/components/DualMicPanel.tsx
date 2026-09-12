import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Headphones,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Repeat,
  Zap,
  Activity,
  Radio,
  Disc,
  Layers
} from 'lucide-react';
import { MicrophoneChannelConfig } from '../types/vectorScope';

interface DualMicPanelProps {
  mic1Config: MicrophoneChannelConfig;
  mic2Config: MicrophoneChannelConfig;
  onUpdateMic1: (updates: Partial<MicrophoneChannelConfig>) => void;
  onUpdateMic2: (updates: Partial<MicrophoneChannelConfig>) => void;
  onToggleMic1: () => void;
  onToggleMic2: () => void;
  isInScope1: boolean;
  isInScope2: boolean;
  onToggleScopeFeed1: (active: boolean) => void;
  onToggleScopeFeed2: (active: boolean) => void;
  level1: number;
  level2: number;
}

export const DualMicPanel: React.FC<DualMicPanelProps> = ({
  mic1Config,
  mic2Config,
  onUpdateMic1,
  onUpdateMic2,
  onToggleMic1,
  onToggleMic2,
  isInScope1,
  isInScope2,
  onToggleScopeFeed1,
  onToggleScopeFeed2,
  level1,
  level2,
}) => {
  const renderMicChannel = (
    channelNumber: 1 | 2,
    cfg: MicrophoneChannelConfig,
    onUpdate: (updates: Partial<MicrophoneChannelConfig>) => void,
    onToggle: () => void,
    isInScope: boolean,
    onToggleScope: (act: boolean) => void,
    level: number
  ) => {
    const isChannelActive = cfg.enabled;
    const accentColor = channelNumber === 1 ? 'cyan' : 'emerald';

    return (
      <div className={`bg-[#060c18] border rounded-2xl p-5 space-y-4 transition-all ${
        isChannelActive ? (channelNumber === 1 ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'border-emerald-500/50 shadow-lg shadow-emerald-500/10') : 'border-[#14233c]'
      }`}>
        {/* Top Channel Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14233c] pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-slate-950 ${
              channelNumber === 1 ? 'bg-cyan-400' : 'bg-emerald-400'
            }`}>
              {channelNumber === 1 ? 'M1' : 'M2'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-xs font-black uppercase ${channelNumber === 1 ? 'text-cyan-300' : 'text-emerald-300'}`}>
                  {cfg.name}
                </h3>
                <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold uppercase ${
                  isChannelActive ? 'bg-green-950 text-green-400 border border-green-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isChannelActive ? 'ENREGISTREMENT ACTIF' : 'INACTIF'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                {channelNumber === 1 ? 'Entrée voix principale / Instrument' : 'Micro d\'ambiance / Seconde voix'}
              </p>
            </div>
          </div>

          {/* Connect & Scope buttons */}
          <div className="flex items-center gap-2">
            {/* Scope Feed Toggle */}
            <button
              onClick={() => onToggleScope(!isInScope)}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                isInScope
                  ? (channelNumber === 1 ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500' : 'bg-emerald-950/60 text-emerald-300 border-emerald-500')
                  : 'bg-slate-900 text-slate-500 border-slate-700'
              }`}
            >
              <Disc className={`w-3.5 h-3.5 ${isInScope ? 'animate-spin' : ''}`} />
              <span>{isInScope ? 'SCOPE: ACTIF' : 'SCOPE: MASQUÉ'}</span>
            </button>

            {/* Hardware On/Off Button */}
            <button
              onClick={onToggle}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                isChannelActive
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                  : (channelNumber === 1 ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950')
              }`}
            >
              {isChannelActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isChannelActive ? 'COUPER MICRO' : 'ACTIVER MICRO'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Level VU-Meter */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>NIVEAU D'ENTRÉE DU SIGNAL</span>
            <span className={level > 0.8 ? 'text-red-400 font-bold' : 'text-slate-300'}>
              {(level * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex">
            <div
              className={`h-full transition-all duration-75 ${
                level > 0.85
                  ? 'bg-gradient-to-r from-green-500 via-amber-400 to-rose-500'
                  : channelNumber === 1
                  ? 'bg-cyan-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, level * 100))}%` }}
            />
          </div>
        </div>

        {/* Essential Monitoring & Gain Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* USER SPECIFIED: "bouton écouter le micro sur les deux micros" */}
          <button
            onClick={() => onUpdate({ monitoring: !cfg.monitoring })}
            className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all ${
              cfg.monitoring
                ? 'bg-gradient-to-r from-indigo-900 to-indigo-800 text-indigo-200 border-indigo-400 shadow-md shadow-indigo-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
            }`}
          >
            <span className="flex items-center gap-2">
              <Headphones className={`w-4 h-4 ${cfg.monitoring ? 'text-cyan-300 animate-bounce' : 'text-slate-500'}`} />
              <span className="text-left">
                <div className="font-bold">ÉCOUTER LE MICRO</div>
                <div className="text-[9px] font-normal text-slate-400">Retour direct haut-parleurs/casque</div>
              </span>
            </span>
            <span className={`px-2 py-0.5 text-[9px] rounded font-mono ${
              cfg.monitoring ? 'bg-indigo-950 text-cyan-300 border border-indigo-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {cfg.monitoring ? 'MONITOR ON' : 'MONITOR OFF'}
            </span>
          </button>

          {/* Mute Button */}
          <button
            onClick={() => onUpdate({ mute: !cfg.mute })}
            className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all ${
              cfg.mute
                ? 'bg-rose-950/80 text-rose-300 border-rose-500'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
            }`}
          >
            <span className="flex items-center gap-2">
              {cfg.mute ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
              <span>{cfg.mute ? 'MICRO EN SOURDINE' : 'MICRO AUDIBLE'}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{cfg.mute ? 'MUTED' : 'UNMUTED'}</span>
          </button>
        </div>

        {/* Sliders: Gain, Echo, Feedback, Pan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#081020] p-3.5 rounded-xl border border-[#14233c]">
          {/* Gain */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Gain d'entrée</span>
              <span className="text-cyan-400 font-bold">{(cfg.gain * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="3.0"
              step="0.05"
              value={cfg.gain}
              onChange={(e) => onUpdate({ gain: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Panoramique Stéréo */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Panoramique X/Y</span>
              <span className="text-cyan-400 font-bold">
                {cfg.stereoPan < -0.05 ? `G ${Math.abs(cfg.stereoPan * 100).toFixed(0)}%` : cfg.stereoPan > 0.05 ? `D ${(cfg.stereoPan * 100).toFixed(0)}%` : 'CENTRE'}
              </span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.05"
              value={cfg.stereoPan}
              onChange={(e) => onUpdate({ stereoPan: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Écho / Delay */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Délai écho</span>
              <span className="text-cyan-400 font-bold">{(cfg.echoDelay * 1000).toFixed(0)} ms</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="1.0"
              step="0.01"
              value={cfg.echoDelay}
              onChange={(e) => onUpdate({ echoDelay: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Feedback */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Feedback réinjection</span>
              <span className="text-cyan-400 font-bold">{(cfg.echoFeedback * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.95"
              step="0.02"
              value={cfg.echoFeedback}
              onChange={(e) => onUpdate({ echoFeedback: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* USER SPECIFIED: "options bizarres" (Effets artistiques vectoriels) */}
        <div className="bg-[#0b162a] p-3 rounded-xl border border-[#162946] space-y-2">
          <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>OPTIONS BIZARRES & MODULATION VECTORIELLE</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => onUpdate({ echoDelay: 0.05, echoFeedback: 0.85 })}
              className="p-1.5 rounded bg-[#070e1c] hover:bg-slate-850 border border-slate-800 text-[10px] text-cyan-300 text-center"
            >
              ÉCHO COMB RÉSONANT
            </button>
            <button
              onClick={() => onUpdate({ echoDelay: 0.7, echoFeedback: 0.75 })}
              className="p-1.5 rounded bg-[#070e1c] hover:bg-slate-850 border border-slate-800 text-[10px] text-purple-300 text-center"
            >
              CAVERNE COSMIQUE
            </button>
            <button
              onClick={() => onUpdate({ stereoPan: -1.0, gain: 1.5 })}
              className="p-1.5 rounded bg-[#070e1c] hover:bg-slate-850 border border-slate-800 text-[10px] text-amber-300 text-center"
            >
              FORÇAGE X PUR
            </button>
            <button
              onClick={() => onUpdate({ stereoPan: 1.0, gain: 1.5 })}
              className="p-1.5 rounded bg-[#070e1c] hover:bg-slate-850 border border-slate-800 text-[10px] text-emerald-300 text-center"
            >
              FORÇAGE Y PUR
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-6 font-mono text-xs text-slate-300 shadow-2xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950">
            <Mic className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-cyan-300 tracking-wider uppercase">
                STUDIO MICROPHONES DOUBLE ENTRÉE (MICRO 1 & MICRO 2)
              </h2>
              <span className="px-2 py-0.5 text-[10px] bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 rounded-full font-bold">
                MIXABLE EN SIMULTANÉ AVEC LA MUSIQUE ET LES OSCILLATEURS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Contrôlez les 2 micros indépendamment avec écoute casque/enceinte, écho, feedback et injection scope directe
            </p>
          </div>
        </div>
      </div>

      {/* Micro 1 & Micro 2 Channels */}
      <div className="space-y-6">
        {renderMicChannel(1, mic1Config, onUpdateMic1, onToggleMic1, isInScope1, onToggleScopeFeed1, level1)}
        {renderMicChannel(2, mic2Config, onUpdateMic2, onToggleMic2, isInScope2, onToggleScopeFeed2, level2)}
      </div>
    </div>
  );
};
