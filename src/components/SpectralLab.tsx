import React, { useRef, useEffect, useState } from 'react';
import { Sliders, Activity, Disc, BarChart2, Radio, Info } from 'lucide-react';
import { calculatePearsonCorrelation } from '../services/mathEngine';

interface SpectralLabProps {
  freqDataX: Uint8Array;
  freqDataY: Uint8Array;
  rawTimeDataX: Float32Array;
  rawTimeDataY: Float32Array;
  sampleRate: number;
}

export const SpectralLab: React.FC<SpectralLabProps> = ({
  freqDataX,
  freqDataY,
  rawTimeDataX,
  rawTimeDataY,
  sampleRate,
}) => {
  const canvasLeftRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRightRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCompareRef = useRef<HTMLCanvasElement | null>(null);
  const spectrogramCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [clickedFreq, setClickedFreq] = useState<{ freq: number; ampDb: number } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'3view' | 'spectrogram'>('3view');

  const fftSize = 2048;
  const binWidth = sampleRate / fftSize;

  // Render Left Spectrum Canvas
  useEffect(() => {
    const canvas = canvasLeftRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSingleSpectrum(ctx, canvas.width, canvas.height, freqDataX, '#00f5d4', 'Canal Gauche / X');
  }, [freqDataX]);

  // Render Right Spectrum Canvas
  useEffect(() => {
    const canvas = canvasRightRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSingleSpectrum(ctx, canvas.width, canvas.height, freqDataY, '#f59e0b', 'Canal Droit / Y');
  }, [freqDataY]);

  // Render Comparative Spectrum Canvas (Overlay)
  useEffect(() => {
    const canvas = canvasCompareRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawComparativeSpectrum(ctx, canvas.width, canvas.height, freqDataX, freqDataY);
  }, [freqDataX, freqDataY]);

  // Render Spectrogram Scrolling Waterfall
  useEffect(() => {
    const canvas = spectrogramCanvasRef.current;
    if (!canvas || activeSubTab !== 'spectrogram') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Shift previous image down by 2 pixels
    ctx.drawImage(canvas, 0, 0, w, h - 2, 0, 2, w, h - 2);

    // Draw new top row
    const numBins = Math.min(256, freqDataX.length);
    const colWidth = w / numBins;

    for (let i = 0; i < numBins; i++) {
      const valX = freqDataX[i] / 255;
      const valY = freqDataY[i] / 255;
      // Colormap: Cyan for X, Amber for Y, Bright for both
      const r = Math.floor(valY * 255);
      const g = Math.floor(valX * 245 + valY * 158);
      const b = Math.floor(valX * 212);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i * colWidth, 0, colWidth + 1, 2);
    }
  }, [freqDataX, freqDataY, activeSubTab]);

  const drawSingleSpectrum = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    data: Uint8Array,
    color: string,
    label: string
  ) => {
    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#101e35';
    ctx.lineWidth = 1;
    for (let y = 0.25; y <= 1; y += 0.25) {
      ctx.beginPath();
      ctx.moveTo(0, h * y);
      ctx.lineTo(w, h * y);
      ctx.stroke();
    }

    // Spectrum curve with filled gradient
    ctx.beginPath();
    ctx.moveTo(0, h);
    const bins = Math.min(data.length, 512);
    for (let i = 0; i < bins; i++) {
      const x = (i / bins) * w;
      const y = h - (data[i] / 255) * h;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.fillStyle = color.includes('00f5d4') ? 'rgba(0, 245, 212, 0.1)' : 'rgba(245, 158, 11, 0.1)';
    ctx.fill();

    // Outline
    ctx.beginPath();
    for (let i = 0; i < bins; i++) {
      const x = (i / bins) * w;
      const y = h - (data[i] / 255) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  const drawComparativeSpectrum = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    dataX: Uint8Array,
    dataY: Uint8Array
  ) => {
    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#101e35';
    ctx.lineWidth = 1;
    for (let y = 0.25; y <= 1; y += 0.25) {
      ctx.beginPath();
      ctx.moveTo(0, h * y);
      ctx.lineTo(w, h * y);
      ctx.stroke();
    }

    const bins = Math.min(dataX.length, 512);

    // Draw Left (X) in Cyan
    ctx.beginPath();
    for (let i = 0; i < bins; i++) {
      const x = (i / bins) * w;
      const y = h - (dataX[i] / 255) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw Right (Y) in Amber
    ctx.beginPath();
    for (let i = 0; i < bins; i++) {
      const x = (i / bins) * w;
      const y = h - (dataY[i] / 255) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // If a frequency was clicked, draw inspection marker
    if (clickedFreq) {
      const targetBin = Math.round(clickedFreq.freq / binWidth);
      const px = (targetBin / bins) * w;
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const bins = 512;
    const binIdx = Math.floor((x / rect.width) * bins);
    const freq = Math.round(binIdx * binWidth);

    const valX = freqDataX[binIdx] ?? 0;
    const valY = freqDataY[binIdx] ?? 0;
    const maxVal = Math.max(valX, valY);
    const ampDb = maxVal > 0 ? (20 * Math.log10(maxVal / 255)).toFixed(1) : '-80';

    setClickedFreq({ freq, ampDb: parseFloat(ampDb) });
  };

  // Compute Stereo Correlation and Coherence
  const stereoCorr = calculatePearsonCorrelation(rawTimeDataX, rawTimeDataY);

  // Compute Balance (Energy L vs R)
  let sumL = 0;
  let sumR = 0;
  for (let i = 0; i < rawTimeDataX.length; i++) {
    sumL += rawTimeDataX[i] * rawTimeDataX[i];
    sumR += rawTimeDataY[i] * rawTimeDataY[i];
  }
  const totalEnergy = sumL + sumR + 1e-6;
  const balancePercent = ((sumR - sumL) / totalEnergy) * 100; // -100 = 100% Left, +100 = 100% Right

  // Octave band energies
  const bands = [
    { label: 'Sous-Graves (<60Hz)', range: [0, Math.floor(60 / binWidth)] },
    { label: 'Graves (60-250Hz)', range: [Math.floor(60 / binWidth), Math.floor(250 / binWidth)] },
    { label: 'Bas-Médiums (250-500Hz)', range: [Math.floor(250 / binWidth), Math.floor(500 / binWidth)] },
    { label: 'Médiums (500-2kHz)', range: [Math.floor(500 / binWidth), Math.floor(2000 / binWidth)] },
    { label: 'Aigus (2k-8kHz)', range: [Math.floor(2000 / binWidth), Math.floor(8000 / binWidth)] },
    { label: 'Brillance (>8kHz)', range: [Math.floor(8000 / binWidth), Math.min(512, freqDataX.length)] },
  ];

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-5 font-mono text-xs text-slate-300 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-sm tracking-wide">
              SPECTRAL LAB — ANALYSE SPECTRALE TRIPLE CANAUX & COHÉRENCE
            </h2>
            <p className="text-[11px] text-slate-400">
              FFT temps réel 2048 pts, spectrogramme en cascade, corrélation stéréo et balance
            </p>
          </div>
        </div>

        {/* Sub-tab view switcher */}
        <div className="flex items-center gap-1 bg-[#060c18] p-1 rounded-lg border border-[#162744]">
          <button
            onClick={() => setActiveSubTab('3view')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              activeSubTab === '3view' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3 SPECTRES SIMULTANÉS
          </button>
          <button
            onClick={() => setActiveSubTab('spectrogram')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              activeSubTab === 'spectrogram' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SPECTROGRAMME CASCADE
          </button>
        </div>
      </div>

      {/* Click-to-inspect Tooltip */}
      {clickedFreq && (
        <div className="bg-cyan-950/70 border border-cyan-400 px-3 py-1.5 rounded-lg flex items-center justify-between text-cyan-200 text-xs">
          <span className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>PIC SPECTRAL SÉLECTIONNÉ :</span>
            <strong className="text-white text-sm">{clickedFreq.freq} Hz</strong>
            <span className="text-slate-400">({clickedFreq.ampDb} dBFS)</span>
          </span>
          <button
            onClick={() => setClickedFreq(null)}
            className="text-slate-400 hover:text-white text-[10px] underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Main 3 Spectrum View */}
      {activeSubTab === '3view' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Left Channel X Spectrum */}
          <div className="bg-[#060c18] p-3 rounded-xl border border-cyan-500/20 space-y-2">
            <div className="flex justify-between items-center text-cyan-400 font-bold text-[11px]">
              <span>1. SPECTRE CANAL GAUCHE (X)</span>
              <span className="text-slate-500 text-[10px]">0 - 12 kHz</span>
            </div>
            <div className="rounded-lg overflow-hidden border border-[#14233c] cursor-pointer">
              <canvas
                ref={canvasLeftRef}
                width={360}
                height={160}
                className="w-full h-40 block"
                onClick={handleCanvasClick}
                title="Cliquez pour inspecter la fréquence exacte"
              />
            </div>
          </div>

          {/* 2. Right Channel Y Spectrum */}
          <div className="bg-[#060c18] p-3 rounded-xl border border-amber-500/20 space-y-2">
            <div className="flex justify-between items-center text-amber-400 font-bold text-[11px]">
              <span>2. SPECTRE CANAL DROIT (Y)</span>
              <span className="text-slate-500 text-[10px]">0 - 12 kHz</span>
            </div>
            <div className="rounded-lg overflow-hidden border border-[#14233c] cursor-pointer">
              <canvas
                ref={canvasRightRef}
                width={360}
                height={160}
                className="w-full h-40 block"
                onClick={handleCanvasClick}
                title="Cliquez pour inspecter la fréquence exacte"
              />
            </div>
          </div>

          {/* 3. Comparative Overlay Spectrum */}
          <div className="bg-[#060c18] p-3 rounded-xl border border-blue-500/30 space-y-2">
            <div className="flex justify-between items-center text-slate-200 font-bold text-[11px]">
              <span>3. COMPARAISON GAUCHE / DROITE</span>
              <span className="text-[10px]">
                <strong className="text-cyan-400">G: Bleu</strong> / <strong className="text-amber-400">D: Or</strong>
              </span>
            </div>
            <div className="rounded-lg overflow-hidden border border-[#14233c] cursor-pointer">
              <canvas
                ref={canvasCompareRef}
                width={360}
                height={160}
                className="w-full h-40 block"
                onClick={handleCanvasClick}
                title="Cliquez pour inspecter la fréquence exacte"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Spectrogram Waterfall */
        <div className="bg-[#060c18] p-3.5 rounded-xl border border-[#14233c] space-y-2">
          <div className="flex justify-between text-slate-300 font-bold text-[11px]">
            <span>SPECTROGRAMME CASCADE TEMPORELLE (Fréquences en abscisse, Défilement vers le bas)</span>
            <span className="text-cyan-400 text-[10px]">0 - 6 kHz</span>
          </div>
          <div className="rounded-lg overflow-hidden border border-[#162744]">
            <canvas ref={spectrogramCanvasRef} width={800} height={240} className="w-full h-60 block" />
          </div>
        </div>
      )}

      {/* Telemetry Meters & Stereo Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Stereo Correlation & Phase Coherence */}
        <div className="bg-[#060c18] p-3.5 rounded-xl border border-[#14233c] space-y-2">
          <span className="text-slate-400 font-bold text-[11px] block">CORRÉLATION STÉRÉO (PEARSON r) :</span>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">-1.0 (Hors phase)</span>
            <span
              className={`font-bold text-sm ${
                stereoCorr > 0.5 ? 'text-cyan-300' : stereoCorr < -0.5 ? 'text-rose-400' : 'text-amber-300'
              }`}
            >
              r = {stereoCorr.toFixed(3)}
            </span>
            <span className="text-slate-500">+1.0 (En phase)</span>
          </div>
          {/* Visual bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 absolute"
              style={{
                left: '50%',
                width: `${Math.abs(stereoCorr) * 50}%`,
                transform: stereoCorr < 0 ? 'translateX(-100%)' : 'none',
              }}
            />
          </div>
        </div>

        {/* Stereo Energy Balance L/R */}
        <div className="bg-[#060c18] p-3.5 rounded-xl border border-[#14233c] space-y-2">
          <span className="text-slate-400 font-bold text-[11px] block">BALANCE D'ÉNERGIE (GAUCHE / DROITE) :</span>
          <div className="flex items-center justify-between text-xs">
            <span className="text-cyan-400 font-bold">100% G (X)</span>
            <span className="text-slate-200">
              {balancePercent.toFixed(1)}% {balancePercent < 0 ? '← Gauche' : '→ Droit'}
            </span>
            <span className="text-amber-400 font-bold">100% D (Y)</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-cyan-400 absolute"
              style={{
                left: '50%',
                width: `${Math.min(50, Math.abs(balancePercent) / 2)}%`,
                transform: balancePercent < 0 ? 'translateX(-100%)' : 'none',
              }}
            />
          </div>
        </div>

        {/* Spectral Band Energy breakdown */}
        <div className="bg-[#060c18] p-3.5 rounded-xl border border-[#14233c] space-y-2">
          <span className="text-slate-400 font-bold text-[11px] block">RÉPARTITION PAR BANDES D'OCTAVE :</span>
          <div className="space-y-1 text-[10px]">
            {bands.slice(0, 4).map((b, i) => {
              let energy = 0;
              for (let k = b.range[0]; k < b.range[1]; k++) {
                energy += (freqDataX[k] ?? 0) + (freqDataY[k] ?? 0);
              }
              const pct = Math.min(100, (energy / ((b.range[1] - b.range[0]) * 510)) * 100);
              return (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 w-32 truncate">{b.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-slate-300">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
