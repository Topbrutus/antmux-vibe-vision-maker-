import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Volume2,
  VolumeX,
  Radio as RadioIcon,
  Upload,
  Waves,
  Sparkles,
  Sliders,
  Disc,
  Filter,
  Repeat,
  Compass
} from 'lucide-react';
import { RadioTrackConfig } from '../types/vectorScope';

interface RadioPlayerPanelProps {
  trackName: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (seconds: number) => void;
  onUploadFile: (file: File) => void;
  config: RadioTrackConfig;
  onConfigChange: (updates: Partial<RadioTrackConfig>) => void;
  isInScope: boolean;
  onToggleScopeFeed: (active: boolean) => void;
}

export const RadioPlayerPanel: React.FC<RadioPlayerPanelProps> = ({
  trackName,
  duration,
  currentTime,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onUploadFile,
  config,
  onConfigChange,
  isInScope,
  onToggleScopeFeed,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSeek(val);
  };

  const handleSkip = (delta: number) => {
    onSeek(Math.max(0, Math.min(duration, currentTime + delta)));
  };

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-6 font-mono text-xs text-slate-300 shadow-2xl space-y-6">
      {/* Header Station Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
            <RadioIcon className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-amber-300 tracking-wider uppercase">
                STATION RADIO & LECTEUR AUDIO CONTINU
              </h2>
              <span className="px-2 py-0.5 text-[10px] bg-amber-950/80 text-amber-400 border border-amber-500/30 rounded-full font-bold">
                CONCURRENT AUX 8-GÉNÉRATEURS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Joue en superposition sonore et visuelle directe avec les oscillateurs, micros et motifs
            </p>
          </div>
        </div>

        {/* Action Buttons: Upload & Scope Toggle */}
        <div className="flex items-center gap-2">
          {/* Scope Influence Toggle */}
          <button
            onClick={() => onToggleScopeFeed(!isInScope)}
            id="btn-radio-toggle-scope"
            className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center gap-1.5 transition-all ${
              isInScope
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-500 border-slate-700 hover:border-slate-500'
            }`}
          >
            <Disc className={`w-3.5 h-3.5 ${isInScope ? 'text-amber-400 animate-spin' : ''}`} />
            <span>{isInScope ? 'INFLUENCE SCOPE: ON' : 'SCOPE: INVISIBLE'}</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            id="btn-radio-upload-song"
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>IMPORTER CHANSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUploadFile(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>

      {/* Track Player Display & Progress Bar */}
      <div className="bg-[#060c18] border border-[#1d2d48] rounded-xl p-4 space-y-4">
        {/* Track Title and Telemetry */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-200 font-bold uppercase truncate max-w-md">
              {trackName || 'Aucune chanson chargée (cliquez sur IMPORTER)'}
            </span>
          </div>
          <div className="text-xs text-amber-400 font-bold">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Timeline Scrubbing Bar */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={duration > 0 ? duration : 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeekChange}
            id="slider-radio-scrub"
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0:00</span>
            <span>Position temporelle (scrub direct)</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Player Transport Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {/* Rewind -10s */}
          <button
            onClick={() => handleSkip(-10)}
            id="btn-radio-rewind"
            className="p-2.5 rounded-xl bg-slate-850 border border-slate-700 hover:border-amber-400/50 text-slate-300 hover:text-amber-300 transition-all"
            title="Reculer de 10s"
          >
            <Rewind className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            id="btn-radio-play-pause"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-sm flex items-center gap-2 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30 transition-all active:scale-95"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>LECTURE</span>
              </>
            )}
          </button>

          {/* Fast Forward +10s */}
          <button
            onClick={() => handleSkip(10)}
            id="btn-radio-forward"
            className="p-2.5 rounded-xl bg-slate-850 border border-slate-700 hover:border-amber-400/50 text-slate-300 hover:text-amber-300 transition-all"
            title="Avancer de 10s"
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Reset to Beginning */}
          <button
            onClick={() => onSeek(0)}
            id="btn-radio-restart"
            className="p-2.5 rounded-xl bg-slate-850 border border-slate-700 hover:border-amber-400/50 text-slate-300 hover:text-amber-300 transition-all"
            title="Retour au début (0s)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audio Modulation, Speed & DSP FX Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Speed & Volume */}
        <div className="bg-[#081020] border border-[#162744] p-3.5 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-amber-300 font-bold border-b border-[#14233c] pb-1.5">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> VITESSE & VOLUME
            </span>
          </div>

          {/* Speed (PlaybackRate) */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Vitesse lecture</span>
              <span className="text-amber-400 font-bold">{config.playbackRate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="2.5"
              step="0.05"
              value={config.playbackRate}
              onChange={(e) => onConfigChange({ playbackRate: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <button onClick={() => onConfigChange({ playbackRate: 0.5 })} className="hover:text-amber-400">0.5x</button>
              <button onClick={() => onConfigChange({ playbackRate: 1.0 })} className="hover:text-amber-400 font-bold">1.0x</button>
              <button onClick={() => onConfigChange({ playbackRate: 1.5 })} className="hover:text-amber-400">1.5x</button>
              <button onClick={() => onConfigChange({ playbackRate: 2.0 })} className="hover:text-amber-400">2.0x</button>
            </div>
          </div>

          {/* Volume */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Volume chanson</span>
              <span className="text-amber-400 font-bold">{(config.volume * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="2.0"
              step="0.02"
              value={config.volume}
              onChange={(e) => onConfigChange({ volume: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Pan */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Panoramique stéréo</span>
              <span className="text-amber-400 font-bold">
                {config.pan < -0.05 ? `G ${Math.abs(config.pan * 100).toFixed(0)}%` : config.pan > 0.05 ? `D ${(config.pan * 100).toFixed(0)}%` : 'CENTRE'}
              </span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.05"
              value={config.pan}
              onChange={(e) => onConfigChange({ pan: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Écho & Feedback */}
        <div className="bg-[#081020] border border-[#162744] p-3.5 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-cyan-300 font-bold border-b border-[#14233c] pb-1.5">
            <span className="flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" /> ÉCHO & FEEDBACK
            </span>
          </div>

          {/* Delay Time */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Temps écho (Delay)</span>
              <span className="text-cyan-400 font-bold">{(config.echoDelay * 1000).toFixed(0)} ms</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="1.0"
              step="0.01"
              value={config.echoDelay}
              onChange={(e) => onConfigChange({ echoDelay: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Feedback */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Réinjection (Feedback)</span>
              <span className="text-cyan-400 font-bold">{(config.echoFeedback * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.95"
              step="0.02"
              value={config.echoFeedback}
              onChange={(e) => onConfigChange({ echoFeedback: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          <div className="p-2 rounded bg-[#0b162a] text-[10px] text-slate-400 border border-[#1d3050]">
            Crée des spirales oscillographiques récursives en modulant le signal dans le temps.
          </div>
        </div>

        {/* Filtre Dynamique (EQ / Morphing) */}
        <div className="bg-[#081020] border border-[#162744] p-3.5 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-purple-300 font-bold border-b border-[#14233c] pb-1.5">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> FILTRE & COLORATION
            </span>
          </div>

          {/* Filter Type */}
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px]">Type de filtre</span>
            <div className="grid grid-cols-3 gap-1">
              {(['lowpass', 'bandpass', 'highpass'] as const).map((ft) => (
                <button
                  key={ft}
                  onClick={() => onConfigChange({ filterType: ft })}
                  className={`py-1 text-[10px] font-bold rounded border transition-all ${
                    config.filterType === ft
                      ? 'bg-purple-600 text-white border-purple-400'
                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {ft === 'lowpass' ? 'BAS' : ft === 'bandpass' ? 'BANDE' : 'HAUT'}
                </button>
              ))}
            </div>
          </div>

          {/* Cutoff Frequency */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Fréquence de coupure</span>
              <span className="text-purple-400 font-bold">
                {config.filterFrequency > 1000
                  ? `${(config.filterFrequency / 1000).toFixed(1)} kHz`
                  : `${Math.round(config.filterFrequency)} Hz`}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="16000"
              step="50"
              value={config.filterFrequency}
              onChange={(e) => onConfigChange({ filterFrequency: parseFloat(e.target.value) })}
              className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Options Bizarres & Effets Spéciaux */}
        <div className="bg-[#081020] border border-[#162744] p-3.5 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-rose-300 font-bold border-b border-[#14233c] pb-1.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> OPTIONS SPÉCIALES
            </span>
          </div>

          {/* Mute Track */}
          <button
            onClick={() => onConfigChange({ mute: !config.mute })}
            className={`w-full py-1.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              config.mute
                ? 'bg-rose-950/80 text-rose-300 border-rose-500'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            {config.mute ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{config.mute ? 'RADIO EN SOURDINE (MUTE)' : 'RADIO ACTIVE'}</span>
          </button>

          {/* Fast Presets */}
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px]">Profils d'effets rapides :</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() =>
                  onConfigChange({
                    playbackRate: 0.75,
                    echoDelay: 0.45,
                    echoFeedback: 0.65,
                    filterFrequency: 2500,
                    filterType: 'lowpass',
                  })
                }
                className="p-1 text-[10px] rounded bg-[#0f1d35] hover:bg-[#162744] text-cyan-300 border border-[#1d3050] text-center"
              >
                SLOWED & ECHO
              </button>
              <button
                onClick={() =>
                  onConfigChange({
                    playbackRate: 1.4,
                    echoDelay: 0.12,
                    echoFeedback: 0.4,
                    filterFrequency: 5000,
                    filterType: 'highpass',
                  })
                }
                className="p-1 text-[10px] rounded bg-[#0f1d35] hover:bg-[#162744] text-rose-300 border border-[#1d3050] text-center"
              >
                CHIPMUNK VORTEX
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
