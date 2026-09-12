import React, { useRef, useEffect } from 'react';
import { GitCompare, CheckCircle2, AlertCircle, Info, Activity } from 'lucide-react';
import { computeTrajectoryComparison } from '../services/mathEngine';

interface ComparatorViewProps {
  calculatedPoints: Array<[number, number]>;
  measuredPoints: Array<[number, number]>;
}

export const ComparatorView: React.FC<ComparatorViewProps> = ({
  calculatedPoints,
  measuredPoints,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const metrics = computeTrajectoryComparison(calculatedPoints, measuredPoints);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = (Math.min(w, h) / 2) * 0.8;

    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, w, h);

    // Reticle
    ctx.strokeStyle = '#101e35';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, 2 * Math.PI);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();

    const n = Math.min(calculatedPoints.length, measuredPoints.length);

    // Draw Error vectors (magenta lines connecting calculated and measured points)
    if (n > 0) {
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i += 2) {
        const [cxPt, cyPt] = calculatedPoints[i];
        const [mxPt, myPt] = measuredPoints[i];
        ctx.moveTo(cx + cxPt * scale, cy - cyPt * scale);
        ctx.lineTo(cx + mxPt * scale, cy - myPt * scale);
      }
      ctx.stroke();
    }

    // Draw CALCULATED (Cyan)
    if (calculatedPoints.length > 0) {
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < calculatedPoints.length; i++) {
        const px = cx + calculatedPoints[i][0] * scale;
        const py = cy - calculatedPoints[i][1] * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Draw MEASURED (Amber)
    if (measuredPoints.length > 0) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < measuredPoints.length; i++) {
        const px = cx + measuredPoints[i][0] * scale;
        const py = cy - measuredPoints[i][1] * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }, [calculatedPoints, measuredPoints]);

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-5 font-mono text-xs text-slate-300 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-sm tracking-wide">
              COMPARATEUR TRAJECTOIRES — CALCULATED VS MEASURED
            </h2>
            <p className="text-[11px] text-slate-400">
              Superposition expérimentale du modèle théorique et du signal réel
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-bold bg-[#060c18] px-3 py-1.5 rounded-lg border border-[#162744]">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> CALCULATED (Théorie)
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> MEASURED (Réel)
          </span>
          <span className="flex items-center gap-1.5 text-pink-400">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500" /> Vecteur d'Écart
          </span>
        </div>
      </div>

      {/* Main Grid: Visual Overlay + Scientific Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Canvas Superposition View */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center bg-[#050b14] p-3 rounded-xl border border-[#162a4a]">
          <canvas ref={canvasRef} width={420} height={420} className="rounded-lg block w-full max-w-[420px]" />
          <span className="text-[10px] text-slate-500 mt-2">
            Superposition géométrique normalisée ({calculatedPoints.length} échantillons)
          </span>
        </div>

        {/* Scientific Measurements Table */}
        <div className="lg:col-span-6 space-y-3">
          <div className="bg-[#060c18] p-4 rounded-xl border border-[#14233c] space-y-3">
            <span className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider block">
              MÉTRIQUES SCIENTIFIQUES DE CONCORDANCE :
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#091325] p-2.5 rounded-lg border border-[#14233c]">
                <span className="text-slate-500 text-[10px] block">ERREUR AXE X (RMSE)</span>
                <span className="font-bold text-slate-200 text-sm">{metrics.errorX.toFixed(4)}</span>
              </div>

              <div className="bg-[#091325] p-2.5 rounded-lg border border-[#14233c]">
                <span className="text-slate-500 text-[10px] block">ERREUR AXE Y (RMSE)</span>
                <span className="font-bold text-slate-200 text-sm">{metrics.errorY.toFixed(4)}</span>
              </div>

              <div className="bg-[#091325] p-2.5 rounded-lg border border-[#14233c]">
                <span className="text-slate-500 text-[10px] block">CORRÉLATION (PEARSON r)</span>
                <span className="font-bold text-cyan-300 text-sm">r = {metrics.correlation.toFixed(4)}</span>
              </div>

              <div className="bg-[#091325] p-2.5 rounded-lg border border-[#14233c]">
                <span className="text-slate-500 text-[10px] block">DÉPHASAGE ESTIMÉ</span>
                <span className="font-bold text-amber-300 text-sm">Δθ = {metrics.phaseDifferenceDeg.toFixed(2)}°</span>
              </div>

              <div className="bg-[#091325] p-2.5 rounded-lg border border-[#14233c]">
                <span className="text-slate-500 text-[10px] block">DIFFÉRENCE RMS</span>
                <span className="font-bold text-slate-200 text-sm">{metrics.rmsDifferenceDb.toFixed(2)} dB</span>
              </div>

              <div className="bg-[#091325] p-2.5 rounded-lg border border-[#14233c]">
                <span className="text-slate-500 text-[10px] block">ÉCART SPECTRAL</span>
                <span className="font-bold text-slate-200 text-sm">{metrics.spectralDifference.toFixed(4)}</span>
              </div>
            </div>

            {/* Scientific Veracity Disclaimer */}
            <div className="bg-[#040810] p-3 rounded-lg border border-amber-500/20 flex items-start gap-2.5 text-[11px] text-slate-400">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-amber-300">RÈGLE SCIENTIFIQUE STRICTE :</strong> Les deux signaux
                ne sont jamais déclarés identiques sans mesure analytique. Une corrélation de {metrics.correlation.toFixed(3)} indique une conformité{' '}
                {metrics.correlation > 0.95 ? 'quasi-parfaite' : metrics.correlation > 0.8 ? 'forte' : 'partielle'} avec les lois mathématiques du modèle théorique.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
