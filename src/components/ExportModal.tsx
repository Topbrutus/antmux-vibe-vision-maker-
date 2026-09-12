import React, { useState } from 'react';
import {
  X,
  Download,
  AlertTriangle,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  Image,
  Archive,
  CheckCircle2
} from 'lucide-react';
import { AudioExportOptions, ChannelConfig, RecordedExperiment, GenesisSessionData } from '../types/vectorScope';
import { VectorAudioEngine } from '../services/audioEngine';
import {
  encodeStereoWav,
  createExperimentZipBundle,
  triggerBlobDownload,
  triggerTextDownload
} from '../services/exportUtils';
import { exportPointsToSvg, exportPointsToCsv } from '../services/mathEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  configX?: ChannelConfig;
  configY?: ChannelConfig;
  currentPreset?: string;
  points?: Array<[number, number]>;
  rawTimeDataX?: Float32Array;
  rawTimeDataY?: Float32Array;
  sampleRate?: number;
  sessionData?: GenesisSessionData;
  audioEngine?: VectorAudioEngine | null;
  currentPoints?: Array<[number, number]>;
}

export const ExportModal: React.FC<ExportModalProps> = (props) => {
  const { isOpen, onClose } = props;
  const configX = (props.configX ?? props.sessionData?.configX ?? props.audioEngine?.getConfig('x')) as ChannelConfig;
  const configY = (props.configY ?? props.sessionData?.configY ?? props.audioEngine?.getConfig('y')) as ChannelConfig;
  const currentPreset = props.currentPreset ?? props.sessionData?.currentPreset ?? 'Custom XY';
  const points = props.points ?? props.currentPoints ?? props.audioEngine?.xyPoints ?? [];
  const rawTimeDataX = props.rawTimeDataX ?? props.audioEngine?.rawBufferX ?? new Float32Array(0);
  const rawTimeDataY = props.rawTimeDataY ?? props.audioEngine?.rawBufferY ?? new Float32Array(0);
  const sampleRate = props.sampleRate ?? props.audioEngine?.getSampleRate() ?? 48000;
  const [exportType, setExportType] = useState<'wav' | 'bundle' | 'svg' | 'csv'>('bundle');
  const [targetSampleRate, setTargetSampleRate] = useState<44100 | 48000 | 96000>(48000);
  const [bitDepth, setBitDepth] = useState<16 | 24 | 32>(24);
  const [durationSec, setDurationSec] = useState<number>(5);
  const [autoLimit, setAutoLimit] = useState<boolean>(true);
  const [svgPeriodChoice, setSvgPeriodChoice] = useState<'1_period' | 'multi_periods' | 'complete'>('complete');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  // Check for potential clipping
  let peak = 0;
  for (let i = 0; i < rawTimeDataX.length; i++) {
    const ax = Math.abs(rawTimeDataX[i]);
    const ay = Math.abs(rawTimeDataY[i]);
    if (ax > peak) peak = ax;
    if (ay > peak) peak = ay;
  }
  const isClippingRisk = peak >= 0.98;

  const handleExportWav = () => {
    setIsProcessing(true);
    try {
      // Synthesize durationSec of audio
      const totalSamples = Math.floor(targetSampleRate * durationSec);
      const l = new Float32Array(totalSamples);
      const r = new Float32Array(totalSamples);

      // Repeat from actual buffers
      for (let i = 0; i < totalSamples; i++) {
        l[i] = rawTimeDataX[i % rawTimeDataX.length];
        r[i] = rawTimeDataY[i % rawTimeDataY.length];
      }

      const { blob, hasClipped } = encodeStereoWav(l, r, sampleRate, targetSampleRate, bitDepth, autoLimit);
      triggerBlobDownload(
        blob,
        `genesis_vector_${currentPreset.toLowerCase()}_${targetSampleRate}Hz_${bitDepth}bit.wav`
      );
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const handleExportBundleZip = async () => {
    setIsProcessing(true);
    try {
      const totalSamples = Math.floor(targetSampleRate * Math.max(3, durationSec));
      const l = new Float32Array(totalSamples);
      const r = new Float32Array(totalSamples);
      for (let i = 0; i < totalSamples; i++) {
        l[i] = rawTimeDataX[i % rawTimeDataX.length];
        r[i] = rawTimeDataY[i % rawTimeDataY.length];
      }

      const { blob } = encodeStereoWav(l, r, sampleRate, targetSampleRate, bitDepth, autoLimit);

      // Render a clean preview canvas for preview.png
      const offscreen = document.createElement('canvas');
      offscreen.width = 800;
      offscreen.height = 800;
      const ctx = offscreen.getContext('2d')!;
      ctx.fillStyle = '#050b14';
      ctx.fillRect(0, 0, 800, 800);
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const px = 400 + points[i][0] * 320;
        const py = 400 - points[i][1] * 320;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      const experiment: RecordedExperiment = {
        timestamp: new Date().toISOString(),
        duration: durationSec,
        sampleRate: targetSampleRate,
        channelParams: { x: configX, y: configY },
        preset: currentPreset,
        events: [
          { time: 0, event: 'INITIALIZE_VECTOR_LAB' },
          { time: 0.1, event: 'APPLY_PRESET', details: currentPreset },
          { time: 0.5, event: 'CAPTURE_TRACE_STABLE' },
        ],
        checksum: '',
      };

      const zipBlob = await createExperimentZipBundle(experiment, blob, offscreen, points);
      triggerBlobDownload(
        zipBlob,
        `GENESIS_EXPERIMENT_${currentPreset.toUpperCase()}_${Date.now()}.zip`
      );
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const handleExportSvg = () => {
    let ptsToExport = points;
    if (svgPeriodChoice === '1_period') {
      ptsToExport = points.slice(0, Math.min(256, points.length));
    } else if (svgPeriodChoice === 'multi_periods') {
      ptsToExport = points.slice(0, Math.min(1024, points.length));
    }
    const svgStr = exportPointsToSvg(ptsToExport, 800, 800, '#00f5d4');
    triggerTextDownload(svgStr, `genesis_vector_${currentPreset.toLowerCase()}.svg`, 'image/svg+xml');
    onClose();
  };

  const handleExportCsv = () => {
    const csvStr = exportPointsToCsv(points, sampleRate);
    triggerTextDownload(csvStr, `genesis_vector_xy_${currentPreset.toLowerCase()}.csv`, 'text/csv');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-mono text-xs text-slate-300">
      <div className="bg-[#091325] border border-[#1a3055] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#14233c] flex items-center justify-between bg-[#070e1c]">
          <div className="flex items-center gap-2.5">
            <Archive className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wide">
              EXPORTATION SCIENTIFIQUE & FICHIERS DU LABORATOIRE
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Clipping Risk Warning */}
          {isClippingRisk && (
            <div className="bg-rose-950/50 border border-rose-500/50 p-3 rounded-xl flex items-start gap-2.5 text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">ATTENTION : Risque de Clipping Audio Détecté !</strong>
                Le niveau crête atteint {(peak * 100).toFixed(1)}%. L'option « Limiteur automatique anti-clipping » ci-dessous protégera le fichier généré contre la saturation numérique.
              </div>
            </div>
          )}

          {/* Export Format Selector */}
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">
              CHOIX DU FORMAT DE SORTIE :
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'bundle', label: 'BUNDLE EXPÉRIMENTAL', sub: 'audio + csv + json + png', icon: Archive },
                { id: 'wav', label: 'WAV PCM STÉRÉO', sub: 'Pour oscilloscope réel', icon: FileAudio },
                { id: 'svg', label: 'SVG VECTORIEL', sub: 'Courbe infinie 2D', icon: FileCode },
                { id: 'csv', label: 'DONNÉES XY (CSV)', sub: 'Tableau numérique', icon: FileSpreadsheet },
              ].map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = exportType === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setExportType(fmt.id as any)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-md font-bold'
                        : 'bg-[#060c18] border-[#14233c] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-[11px]">{fmt.label}</span>
                    <span className="text-[9px] text-slate-500">{fmt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration specific to WAV or Bundle */}
          {(exportType === 'wav' || exportType === 'bundle') && (
            <div className="bg-[#060c18] p-3.5 rounded-xl border border-[#14233c] space-y-3">
              <span className="text-[10px] text-cyan-400 font-bold uppercase block">
                PARAMÈTRES AUDIO PCM STÉRÉO (LEFT=X, RIGHT=Y) :
              </span>

              {/* Sample Rate */}
              <div>
                <span className="text-slate-400 text-[10px] block mb-1">Fréquence d'Échantillonnage :</span>
                <div className="grid grid-cols-3 gap-2">
                  {[44100, 48000, 96000].map((sr) => (
                    <button
                      key={sr}
                      onClick={() => setTargetSampleRate(sr as any)}
                      className={`py-1.5 rounded-lg font-bold border text-center ${
                        targetSampleRate === sr
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                          : 'bg-[#091325] text-slate-400 border-[#14233c]'
                      }`}
                    >
                      {(sr / 1000).toFixed(1)} kHz
                    </button>
                  ))}
                </div>
              </div>

              {/* Bit Depth */}
              <div>
                <span className="text-slate-400 text-[10px] block mb-1">Résolution Numérique (Bits) :</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { bits: 16, label: '16 bits PCM (CD)' },
                    { bits: 24, label: '24 bits PCM (Studio)' },
                    { bits: 32, label: '32 bits Float' },
                  ].map((b) => (
                    <button
                      key={b.bits}
                      onClick={() => setBitDepth(b.bits as any)}
                      className={`py-1.5 px-2 rounded-lg font-bold border text-center text-[10px] ${
                        bitDepth === b.bits
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-[#091325] text-slate-400 border-[#14233c]'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration & Auto-Limiter */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 text-[10px] block mb-1">Durée du Fichier (s) :</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={durationSec}
                    onChange={(e) => setDurationSec(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-1 bg-[#091325] border border-[#14233c] rounded text-slate-200"
                  />
                </div>

                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoLimit}
                      onChange={(e) => setAutoLimit(e.target.checked)}
                      className="accent-cyan-400 rounded w-4 h-4"
                    />
                    <span>Limiter l'amplitude (anti-clipping)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Configuration specific to SVG */}
          {exportType === 'svg' && (
            <div className="bg-[#060c18] p-3.5 rounded-xl border border-[#14233c] space-y-2">
              <span className="text-[10px] text-cyan-400 font-bold uppercase block">
                SÉLECTION DE LA TRAJECTOIRE VECTORIELLE :
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1_period', label: 'Une seule période' },
                  { id: 'multi_periods', label: 'Plusieurs périodes' },
                  { id: 'complete', label: 'Trace complète' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSvgPeriodChoice(p.id as any)}
                    className={`py-1.5 px-2 rounded-lg font-bold border text-center text-[10px] ${
                      svgPeriodChoice === p.id
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                        : 'bg-[#091325] text-slate-400 border-[#14233c]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#14233c] flex items-center justify-between bg-[#070e1c]">
          <span className="text-[10px] text-slate-500">
            Prêt pour export : <strong className="text-slate-300">{currentPreset}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (exportType === 'bundle') handleExportBundleZip();
                else if (exportType === 'wav') handleExportWav();
                else if (exportType === 'svg') handleExportSvg();
                else handleExportCsv();
              }}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 flex items-center gap-2 shadow-md shadow-cyan-500/20"
            >
              <Download className="w-4 h-4" />
              <span>{isProcessing ? 'Génération...' : 'TÉLÉCHARGER LE FICHIER'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
