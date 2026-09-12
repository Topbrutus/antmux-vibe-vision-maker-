import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX, Mic, CheckCircle2, Sliders, Waves } from 'lucide-react';
import { ChannelConfig, ChannelTelemetry, WaveformType } from '../types/vectorScope';

interface ChannelZoneProps {
  channelKey: 'x' | 'y';
  title: string;
  axisLabel: string;
  axisRole: string; // "Axe Horizontal X" or "Axe Vertical Y"
  accentColor: 'cyan' | 'amber';
  config: ChannelConfig;
  onConfigChange: (newConfig: Partial<ChannelConfig>) => void;
  telemetry: ChannelTelemetry;
  rawTimeData: Float32Array;
  freqData: Uint8Array;
}

export const ChannelZone: React.FC<ChannelZoneProps> = ({
  channelKey,
  title,
  axisLabel,
  axisRole,
  accentColor,
  config,
  onConfigChange,
  telemetry,
  rawTimeData,
  freqData,
}) => {
  const timeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render Mini Time-Domain Waveform
  useEffect(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background & Graticule
    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#0f1d33';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Waveform
    ctx.strokeStyle = accentColor === 'cyan' ? '#00f5d4' : '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const step = Math.max(1, Math.floor(rawTimeData.length / w));
    for (let i = 0; i < w; i++) {
      const idx = i * step;
      const val = rawTimeData[idx] ?? 0;
      const y = (0.5 - val * 0.45) * h;
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();
  }, [rawTimeData, accentColor]);

  // Render Mini FFT Spectrum
  useEffect(() => {
    const canvas = fftCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, w, h);

    const barCount = 48;
    const barWidth = w / barCount;
    const barStep = Math.floor(freqData.length / barCount);

    ctx.fillStyle = accentColor === 'cyan' ? '#00f5d4' : '#f59e0b';

    for (let b = 0; b < barCount; b++) {
      const val = freqData[b * barStep] ?? 0;
      const barHeight = (val / 255) * h;
      ctx.fillRect(b * barWidth, h - barHeight, barWidth - 1, barHeight);
    }
  }, [freqData, accentColor]);

  const rmsDb = telemetry.rms > 1e-5 ? (20 * Math.log10(telemetry.rms)).toFixed(1) : '-inf';
  const peakDb = telemetry.peak > 1e-5 ? (20 * Math.log10(telemetry.peak)).toFixed(1) : '-inf';

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-xl p-3.5 flex flex-col gap-3 font-mono text-xs text-slate-300 shadow-md">
      {/* Header with Title & Axis Role */}
      <div className="flex items-center justify-between border-b border-[#14233c] pb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-slate-950 text-xs shadow-sm ${
              accentColor === 'cyan' ? 'bg-cyan-400' : 'bg-amber-400'
            }`}
          >
            {axisLabel}
          </span>
          <div>
            <h2 className="font-bold text-slate-100 tracking-wide">{title}</h2>
            <p className={`text-[10px] font-semibold ${accentColor === 'cyan' ? 'text-cyan-400' : 'text-amber-400'}`}>
              {axisRole}
            </p>
          </div>
        </div>

        {/* Solo / Mute Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onConfigChange({ solo: !config.solo })}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
              config.solo
                ? 'bg-amber-500 text-slate-950 border-amber-300'
                : 'bg-[#0f1d33] text-slate-400 border-[#1d3050] hover:text-slate-200'
            }`}
          >
            SOLO
          </button>
          <button
            onClick={() => onConfigChange({ mute: !config.mute })}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
              config.mute
                ? 'bg-rose-600 text-white border-rose-400'
                : 'bg-[#0f1d33] text-slate-400 border-[#1d3050] hover:text-slate-200'
            }`}
          >
            MUTE
          </button>
        </div>
      </div>

      {/* Mini Visualizers: Time Domain & Spectrum */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>FORME D'ONDE</span>
            <span className="text-slate-500">t(s)</span>
          </div>
          <div className="rounded-lg overflow-hidden border border-[#162744]">
            <canvas ref={timeCanvasRef} width={180} height={56} className="w-full h-14 block" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>SPECTRE FFT</span>
            <span className="text-slate-500">2048 pts</span>
          </div>
          <div className="rounded-lg overflow-hidden border border-[#162744]">
            <canvas ref={fftCanvasRef} width={180} height={56} className="w-full h-14 block" />
          </div>
        </div>
      </div>

      {/* Numerical Telemetry Metrics */}
      <div className="grid grid-cols-2 gap-2 bg-[#060c18] p-2.5 rounded-lg border border-[#122036] text-[11px]">
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Fréq. Fondamentale</span>
          <span className={`font-bold ${accentColor === 'cyan' ? 'text-cyan-300' : 'text-amber-300'}`}>
            {telemetry.fundamental > 0 ? `${telemetry.fundamental} Hz` : `${config.frequency.toFixed(1)} Hz`}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Fréq. Dominante FFT</span>
          <span className="text-slate-200 font-bold">
            {telemetry.dominantFreq > 0 ? `${telemetry.dominantFreq} Hz` : `${config.frequency.toFixed(1)} Hz`}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Niveau RMS</span>
          <span className="text-slate-200">
            {rmsDb} dB <span className="text-slate-500 text-[9px]">({telemetry.rms.toFixed(2)})</span>
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Niveau Crête</span>
          <span className={`${telemetry.peak >= 0.98 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
            {peakDb} dB <span className="text-slate-500 text-[9px]">({telemetry.peak.toFixed(2)})</span>
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Déphasage Relatif</span>
          <span className="text-slate-300">{config.phase.toFixed(1)}°</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Polarité</span>
          <span className="text-slate-300">{config.polarity === 1 ? '+1 (Normale)' : '-1 (Inversée)'}</span>
        </div>
      </div>

      {/* Frequency & Phase Interactive Controls */}
      <div className="space-y-2.5 pt-1">
        {/* Frequency Slider & Input */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] text-slate-400">Fréquence :</span>
            <span className={`font-bold ${accentColor === 'cyan' ? 'text-cyan-300' : 'text-amber-300'}`}>
              {config.frequency.toFixed(1)} Hz
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="10"
              max="2000"
              step="1"
              value={config.frequency}
              onChange={(e) => onConfigChange({ frequency: parseFloat(e.target.value) })}
              className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="20000"
              value={config.frequency}
              onChange={(e) => onConfigChange({ frequency: Math.max(1, parseFloat(e.target.value) || 1) })}
              className="w-16 px-1.5 py-0.5 bg-[#060c18] border border-[#162744] rounded text-right text-slate-200 text-[11px]"
            />
          </div>
        </div>

        {/* Phase Slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] text-slate-400">Phase (Degrés) :</span>
            <span className="text-slate-200 font-bold">{config.phase.toFixed(0)}°</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={config.phase}
              onChange={(e) => onConfigChange({ phase: parseFloat(e.target.value) })}
              className="flex-1 accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            {/* Quick 0, 90, 180, 270 buttons */}
            <div className="flex gap-1">
              {[0, 90, 180].map((deg) => (
                <button
                  key={deg}
                  onClick={() => onConfigChange({ phase: deg })}
                  className="px-1.5 py-0.5 bg-[#0f1d33] hover:bg-[#182e50] text-[9px] text-slate-400 rounded"
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gain / Amplitude Slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] text-slate-400">Gain du Canal :</span>
            <span className="text-slate-200 font-bold">{config.gain.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.01"
            value={config.gain}
            onChange={(e) => onConfigChange({ gain: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Main Harmonics List */}
      <div className="border-t border-[#14233c] pt-2">
        <span className="text-[10px] text-slate-500 block mb-1.5">HARMONIQUES PRINCIPALES IDENTIFIÉES :</span>
        <div className="flex flex-wrap gap-1.5">
          {telemetry.harmonics.length > 0 ? (
            telemetry.harmonics.slice(0, 4).map((h, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded bg-[#060c18] border border-[#14233c] text-[10px] text-slate-300"
              >
                H{i + 1}: <strong className="text-cyan-400">{h.freq} Hz</strong> (x{h.ratio})
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-500 italic">Pure onde fondamentale</span>
          )}
        </div>
      </div>
    </div>
  );
};
