import React, { useRef, useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Sliders,
  Sparkles,
  RefreshCw,
  Activity,
  Download,
  CheckCircle2,
  Layers,
  Zap
} from 'lucide-react';
import {
  VectorizerConfig,
  DEFAULT_VECTORIZER_CONFIG,
  vectorizeImageData,
  generatePresetVectorImage
} from '../services/imageVectorizer';
import { VectorImageData } from '../types/vectorScope';
import { exportPointsToSvg, exportPointsToCsv } from '../services/mathEngine';
import { triggerBlobDownload, triggerTextDownload } from '../services/exportUtils';

interface ImageVectorLabProps {
  onSendToOscilloscope: (points: Array<[number, number]>, name: string) => void;
  isActiveInScope: boolean;
}

export const ImageVectorLab: React.FC<ImageVectorLabProps> = ({
  onSendToOscilloscope,
  isActiveInScope,
}) => {
  const [config, setConfig] = useState<VectorizerConfig>(DEFAULT_VECTORIZER_CONFIG);
  const [activePreset, setActivePreset] = useState<string>('lotus');
  const [imageName, setImageName] = useState<string>('Fleur de Lotus Sacrée');
  const [vectorPoints, setVectorPoints] = useState<Array<[number, number]>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load preset on mount or when preset changes
  useEffect(() => {
    if (activePreset === 'custom') return;
    const pts = generatePresetVectorImage(activePreset as any);
    setVectorPoints(pts);
    setImageName(
      activePreset === 'lotus'
        ? 'Fleur de Lotus Sacrée'
        : activePreset === 'atom'
        ? 'Modèle Atomique'
        : activePreset === 'sacred_cube'
        ? 'Cube de Métatron'
        : activePreset === 'star_octagram'
        ? 'Étoile Octagramme'
        : 'Yin Yang'
    );
  }, [activePreset]);

  // Process uploaded image
  const processImage = (img: HTMLImageElement) => {
    setIsProcessing(true);
    const canvas = sourceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw image onto 256x256 buffer for fast edge detection
    const w = 256;
    const h = 256;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // Vectorize using Sobel and RDP
    const points = vectorizeImageData(ctx, w, h, config);
    setVectorPoints(points);
    setIsProcessing(false);
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);
      setActivePreset('custom');
      setImageName(file.name.replace(/\.[^/.]+$/, ''));
      const img = new Image();
      img.onload = () => processImage(img);
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Re-process when config sliders change and an image is loaded
  const handleConfigChange = (updates: Partial<VectorizerConfig>) => {
    const newCfg = { ...config, ...updates };
    setConfig(newCfg);
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        const canvas = sourceCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = 256;
        canvas.height = 256;
        ctx.drawImage(img, 0, 0, 256, 256);
        const points = vectorizeImageData(ctx, 256, 256, newCfg);
        setVectorPoints(points);
      };
      img.src = imageSrc;
    }
  };

  // Draw vector beam trajectory preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Coordinate grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (vectorPoints.length > 1) {
      const cx = w / 2;
      const cy = h / 2;
      const scale = (w * 0.42) * config.scale;

      ctx.save();
      // Glow pass
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx + vectorPoints[0][0] * scale, cy - vectorPoints[0][1] * scale);
      for (let i = 1; i < vectorPoints.length; i++) {
        ctx.lineTo(cx + vectorPoints[i][0] * scale, cy - vectorPoints[i][1] * scale);
      }
      ctx.stroke();

      // Sharp pass
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + vectorPoints[0][0] * scale, cy - vectorPoints[0][1] * scale);
      for (let i = 1; i < vectorPoints.length; i++) {
        ctx.lineTo(cx + vectorPoints[i][0] * scale, cy - vectorPoints[i][1] * scale);
      }
      ctx.stroke();

      ctx.restore();
    }
  }, [vectorPoints, config.scale]);

  const handleExportSvg = () => {
    const svgStr = exportPointsToSvg(vectorPoints, 800, 800, '#00f5d4');
    triggerTextDownload(svgStr, `GENESIS_VECTOR_IMAGE_${imageName.replace(/\s+/g, '_')}.svg`, 'image/svg+xml');
  };

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-xl p-4 font-mono text-xs text-slate-300 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14233c] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              LABORATOIRE DE VECTORISATION D'IMAGES
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/40 text-cyan-400">
                SOBEL & RAMER-DOUGLAS-PEUCKER
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Détection de contours, simplification polygonale et conversion en trajectoire sonore XY pour oscilloscope.
            </p>
          </div>
        </div>

        {/* Stream to scope button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSendToOscilloscope(vectorPoints, imageName)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${
              isActiveInScope
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/80 text-cyan-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isActiveInScope ? 'EN COURS DANS OSCILLOSCOPE' : "DIFFUSER DANS L'OSCILLOSCOPE"}</span>
          </button>
        </div>
      </div>

      {/* Preset Shapes Selector & Image Uploader */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#060c18] p-3 rounded-lg border border-[#14233c]">
        {/* Presets */}
        <div className="md:col-span-8 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 mr-1">Presets géométriques :</span>
          {[
            { id: 'lotus', label: 'Lotus Sacré' },
            { id: 'atom', label: 'Atome' },
            { id: 'sacred_cube', label: 'Cube Métatron' },
            { id: 'star_octagram', label: 'Octagramme' },
            { id: 'yinyang', label: 'Yin Yang' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setActivePreset(preset.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                activePreset === preset.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Upload Custom Image Button */}
        <div className="md:col-span-4 flex justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 font-bold flex items-center gap-1.5 text-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importer Image (PNG/JPG)</span>
          </button>
        </div>
      </div>

      {/* Vectorizer Settings Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#081326] p-3 rounded-lg border border-[#14284b]">
        {/* Threshold */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Seuil Détection (Sobel) :</span>
            <span className="text-cyan-300 font-bold">{config.threshold}</span>
          </div>
          <input
            type="range"
            min="20"
            max="240"
            step="5"
            value={config.threshold}
            onChange={(e) => handleConfigChange({ threshold: parseInt(e.target.value, 10) })}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
          />
        </div>

        {/* Simplification Tolerance */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Tolérance RDP :</span>
            <span className="text-cyan-300 font-bold">{config.simplifyTolerance.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="8.0"
            step="0.2"
            value={config.simplifyTolerance}
            onChange={(e) => handleConfigChange({ simplifyTolerance: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
          />
        </div>

        {/* Max Points */}
        <div>
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Nombre de Points :</span>
            <span className="text-cyan-300 font-bold">{vectorPoints.length}</span>
          </div>
          <input
            type="range"
            min="256"
            max="1536"
            step="64"
            value={config.maxPoints}
            onChange={(e) => handleConfigChange({ maxPoints: parseInt(e.target.value, 10) })}
            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
          />
        </div>

        {/* Scale & Invert */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
            <input
              type="checkbox"
              checked={config.invert}
              onChange={(e) => handleConfigChange({ invert: e.target.checked })}
              className="accent-cyan-400 rounded"
            />
            <span>Inverser Seuil</span>
          </label>

          <button
            onClick={handleExportSvg}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1 text-[11px]"
          >
            <Download className="w-3 h-3" />
            <span>Export SVG</span>
          </button>
        </div>
      </div>

      {/* Side-by-side Dual Canvases Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Source Image Canvas */}
        <div className="bg-[#050b14] border border-[#14233c] rounded-lg p-2 flex flex-col items-center justify-center">
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-1 mb-2">
            <span className="text-[11px] text-slate-400 font-bold">SOURCE IMAGE : {imageName}</span>
            <span className="text-[10px] text-slate-500">256 x 256 BUFFER</span>
          </div>
          <div className="w-60 h-60 bg-[#030712] border border-slate-800 rounded flex items-center justify-center overflow-hidden">
            {imageSrc ? (
              <img src={imageSrc} alt="Source" className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-4 text-slate-500 text-xs">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <span>Preset géométrique actif</span>
                <span className="block text-[10px] text-slate-600 mt-1">Glissez une image pour analyser vos contours</span>
              </div>
            )}
            <canvas ref={sourceCanvasRef} className="hidden" />
          </div>
        </div>

        {/* Vector Beam Path Preview */}
        <div className="bg-[#050b14] border border-[#14233c] rounded-lg p-2 flex flex-col items-center justify-center">
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-1 mb-2">
            <span className="text-[11px] text-cyan-400 font-bold">FAISCEAU VECTORIEL XY DÉTECTÉ</span>
            <span className="text-[10px] text-cyan-500">{vectorPoints.length} NOEUDS VECTEURS</span>
          </div>
          <div className="w-60 h-60 bg-[#030712] border border-slate-800 rounded flex items-center justify-center overflow-hidden">
            <canvas ref={previewCanvasRef} width={240} height={240} className="w-full h-full block" />
          </div>
        </div>
      </div>
    </div>
  );
};
