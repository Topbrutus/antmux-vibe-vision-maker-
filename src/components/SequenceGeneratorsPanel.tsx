import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Video,
  Play,
  Pause,
  Sliders,
  Activity,
  Plus,
  Trash2,
  Copy,
  Layers,
  Palette,
  Maximize2,
  FileVideo,
  Music,
  Bot,
  RefreshCw,
  Search,
  Move,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import {
  SequenceGeneratorItem,
  TimelineScene,
  TemporalNudgeCorrection,
  TemporalCorrectionSpan
} from '../types/vectorScope';
import {
  loadSequenceGenerators,
  saveSequenceGenerators,
  getDefaultSequenceGenerators,
  sampleGeneratorAtTime,
  computeTemporalOffsetAtTime
} from '../services/sequenceGeneratorStorage';
import { encodeStereoWav, triggerBlobDownload } from '../services/exportUtils';

interface SequenceGeneratorsPanelProps {
  onApplyPointsToScope: (points: Array<[number, number]>, color: string, name: string) => void;
  onApplyTimelineScenes?: (scenes: TimelineScene[]) => void;
  onOpenAiChat?: () => void;
  activeGeneratorId?: string;
}

export const SequenceGeneratorsPanel: React.FC<SequenceGeneratorsPanelProps> = ({
  onApplyPointsToScope,
  onApplyTimelineScenes,
  onOpenAiChat,
  activeGeneratorId: propActiveId,
}) => {
  const [generators, setGenerators] = useState<SequenceGeneratorItem[]>(() => loadSequenceGenerators());
  const [activeGenId, setActiveGenId] = useState<string>(propActiveId || 'seq_gen_rabbit_burrow_01');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [recordingGenId, setRecordingGenId] = useState<string | null>(null);

  // Keep localStorage in sync
  useEffect(() => {
    saveSequenceGenerators(generators);
  }, [generators]);

  const handleUpdateGenerator = (id: string, updates: Partial<SequenceGeneratorItem>) => {
    setGenerators((prev) => {
      const next = prev.map((g) => (g.id === id ? { ...g, ...updates } : g));
      return next;
    });

    const target = generators.find((g) => g.id === id);
    if (target && target.id === activeGenId) {
      const updated = { ...target, ...updates };
      const sample = sampleGeneratorAtTime(updated, 0);
      onApplyPointsToScope(sample.points, updated.primaryColor, updated.name);
    }
  };

  const handleInjectIntoScope = (gen: SequenceGeneratorItem) => {
    setActiveGenId(gen.id);
    const sample = sampleGeneratorAtTime(gen, 0);
    onApplyPointsToScope(sample.points, gen.primaryColor, gen.name);
  };

  const handleDuplicateGenerator = (gen: SequenceGeneratorItem) => {
    const newId = `seq_gen_${Date.now()}`;
    const copy: SequenceGeneratorItem = {
      ...gen,
      id: newId,
      name: `${gen.name} (Copie)`,
      createdAt: new Date().toISOString(),
    };
    setGenerators((prev) => [copy, ...prev]);
    setActiveGenId(newId);
  };

  const handleDeleteGenerator = (id: string) => {
    if (generators.length <= 1) {
      alert('Vous devez conserver au moins un générateur.');
      return;
    }
    setGenerators((prev) => prev.filter((g) => g.id !== id));
    if (activeGenId === id) {
      const remaining = generators.filter((g) => g.id !== id);
      if (remaining.length > 0) {
        setActiveGenId(remaining[0].id);
      }
    }
  };

  const handleAddNewGenerator = () => {
    const newId = `seq_gen_custom_${Date.now()}`;
    const newGen: SequenceGeneratorItem = {
      id: newId,
      name: 'Nouveau Générateur de Séquence',
      category: 'custom',
      description: 'Générateur de séquence avec trajectoires temporelles automatisées et corrections.',
      createdAt: new Date().toISOString(),
      primaryColor: '#00f5d4',
      secondaryColor: '#38bdf8',
      scale: 1.0,
      offsetX: 0.0,
      offsetY: 0.0,
      rotationDeg: 0,
      speedMultiplier: 1.0,
      fillEnabled: true,
      fillOpacity: 0.8,
      durationSec: 4.0,
      fps: 30,
      baseFrequency: 300,
      keyframes: [
        {
          id: 'kf_1',
          label: 'Point de départ (Cercle)',
          points: Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2;
            return [Math.cos(a) * 0.5, Math.sin(a) * 0.5];
          }),
          color: '#00f5d4',
        },
        {
          id: 'kf_2',
          label: 'Expansion (Losange)',
          points: Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const r = 0.6 / (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)));
            return [Math.cos(a) * r, Math.sin(a) * r];
          }),
          color: '#38bdf8',
        },
      ],
    };
    setGenerators((prev) => [newGen, ...prev]);
    setActiveGenId(newId);
  };

  const handleResetDefaults = () => {
    if (confirm('Voulez-vous réinitialiser la liste avec les générateurs par défaut ?')) {
      const defaults = getDefaultSequenceGenerators();
      setGenerators(defaults);
      setActiveGenId(defaults[0].id);
    }
  };

  const filteredGenerators = generators.filter((g) => {
    const matchQuery =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'all' || g.category === categoryFilter;
    return matchQuery && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-[#070e1c] border border-[#162744] p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-cyan-300 font-mono tracking-wide flex items-center gap-2">
                <span>PAGE DES GÉNÉRATEURS DE SÉQUENCES & VIDÉOS</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-500/40 font-bold">
                  {generators.length} GÉNÉRATEURS
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Chaque séquence possède son générateur dynamique : déplacez le tracé à la souris directement sur l’écran, modifiez la couleur (ex: lapin bleu), la taille, et ajustez le mouvement sur 1 frame, 1s, 5s ou 10s avec auto-équilibrage ultra-soft !
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleAddNewGenerator}
            id="btn-add-new-seq-generator"
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>+ NOUVEAU GÉNÉRATEUR</span>
          </button>

          {onOpenAiChat && (
            <button
              onClick={onOpenAiChat}
              id="btn-ask-ai-new-generator"
              className="px-3 py-2 rounded-xl text-xs font-mono font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-900/80 flex items-center gap-2 transition-all"
            >
              <Bot className="w-4 h-4 text-indigo-400" />
              <span>DEMANDER À L'IA</span>
            </button>
          )}

          <button
            onClick={handleResetDefaults}
            id="btn-reset-seq-generators"
            className="px-3 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 border border-[#192b47] hover:border-slate-600 flex items-center gap-1.5 transition-all"
            title="Réinitialiser les générateurs d'usine"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RÉINITIALISER</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#040915] p-3 rounded-xl border border-[#13223a]">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher un générateur (lapin, papillon, vaisseau, etc.)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'TOUS' },
            { id: 'narrative_animation', label: 'ANIMATIONS NARRATIVES' },
            { id: 'procedural_morph', label: 'MORPHING' },
            { id: 'geometric_loop', label: 'GÉOMÉTRIE' },
            { id: 'custom', label: 'PERSONNALISÉS' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all ${
                categoryFilter === c.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Defined Generators */}
      <div className="grid grid-cols-1 gap-6">
        {filteredGenerators.map((gen) => (
          <GeneratorCardItem
            key={gen.id}
            generator={gen}
            isActive={gen.id === activeGenId}
            onUpdate={(updates) => handleUpdateGenerator(gen.id, updates)}
            onInjectScope={() => handleInjectIntoScope(gen)}
            onDuplicate={() => handleDuplicateGenerator(gen)}
            onDelete={() => handleDeleteGenerator(gen.id)}
            isRecording={recordingGenId === gen.id}
            onApplyTimelineScenes={onApplyTimelineScenes}
          />
        ))}
      </div>
    </div>
  );
};

// Sub-Component: Single Generator Card with Interactive Mouse Dragging, Bell Curve Equilibration & Live Specs Monitor
interface GeneratorCardItemProps {
  generator: SequenceGeneratorItem;
  isActive: boolean;
  onUpdate: (updates: Partial<SequenceGeneratorItem>) => void;
  onInjectScope: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isRecording: boolean;
  onApplyTimelineScenes?: (scenes: TimelineScene[]) => void;
}

const GeneratorCardItem: React.FC<GeneratorCardItemProps> = ({
  generator,
  isActive,
  onUpdate,
  onInjectScope,
  onDuplicate,
  onDelete,
  onApplyTimelineScenes,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const animRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(performance.now());
  const [isExportingWav, setIsExportingWav] = useState<boolean>(false);
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);

  // Mouse Drag / Nudge state ("Tasser avec la souris")
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Temporal Scope Selector for Auto-Equilibration
  // Explicitly requested by user: '1_frame' | '1_sec' | '5_sec' | '10_sec' | 'all'
  const [selectedSpan, setSelectedSpan] = useState<TemporalCorrectionSpan>('5_sec');

  // Live Specs computed each frame
  const [liveSpecs, setLiveSpecs] = useState({
    timeSec: 0,
    frameNumber: 0,
    totalFrames: 0,
    effectiveX: 0,
    effectiveY: 0,
    autoDeltaX: 0,
    autoDeltaY: 0,
    keyframeLabel: '',
  });

  const COLOR_SWATCHES = [
    { label: 'Blanc', value: '#ffffff' },
    { label: 'Bleu Néon', value: '#3b82f6' }, // Explicit user request
    { label: 'Cyan Électrique', value: '#00f5d4' },
    { label: 'Vert Phosphore', value: '#10b981' },
    { label: 'Or Solaire', value: '#fbbf24' },
    { label: 'Rose Magenta', value: '#f43f5e' },
    { label: 'Violet Plasma', value: '#a855f7' },
    { label: 'Terre Brune', value: '#8b4513' },
  ];

  const SCALE_PRESETS = [
    { label: '0.4x Très Petit', value: 0.4 },
    { label: '0.7x Petit', value: 0.7 },
    { label: '1.0x Normal', value: 1.0 },
    { label: '1.4x Grand', value: 1.4 },
    { label: '2.0x Géant', value: 2.0 },
  ];

  // Continuous animation loop for the preview canvas
  useEffect(() => {
    let active = true;

    const renderLoop = (now: number) => {
      if (!active) return;
      const dt = (now - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = now;

      const effectiveDur = Math.max(0.5, generator.durationSec / Math.max(0.1, generator.speedMultiplier));

      if (isPlaying && !isDragging) {
        setPlaybackTime((prev) => (prev + dt) % effectiveDur);
      }

      drawPreviewFrame();
      animRef.current = requestAnimationFrame(renderLoop);
    };

    lastTimestampRef.current = performance.now();
    animRef.current = requestAnimationFrame(renderLoop);

    return () => {
      active = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, isDragging, generator, dragDelta, playbackTime]);

  // Compute live specs whenever playbackTime changes
  useEffect(() => {
    const fps = generator.fps || 30;
    const currentFrame = Math.round(playbackTime * fps);
    const totalFrames = Math.round(generator.durationSec * fps);
    const { autoDeltaX, autoDeltaY } = computeTemporalOffsetAtTime(generator, playbackTime);
    const effectiveX = generator.offsetX + autoDeltaX + (isDragging ? dragDelta.dx : 0);
    const effectiveY = generator.offsetY + autoDeltaY + (isDragging ? dragDelta.dy : 0);

    const kfs = generator.keyframes;
    let label = 'Animation continue';
    if (kfs.length > 0) {
      const segFloat = (playbackTime / Math.max(0.1, generator.durationSec)) * kfs.length;
      const idx = Math.floor(segFloat) % kfs.length;
      label = kfs[idx].label;
    }

    setLiveSpecs({
      timeSec: Number(playbackTime.toFixed(2)),
      frameNumber: currentFrame,
      totalFrames,
      effectiveX: Number(effectiveX.toFixed(2)),
      effectiveY: Number(effectiveY.toFixed(2)),
      autoDeltaX: Number((autoDeltaX + (isDragging ? dragDelta.dx : 0)).toFixed(2)),
      autoDeltaY: Number((autoDeltaY + (isDragging ? dragDelta.dy : 0)).toFixed(2)),
      keyframeLabel: label,
    });
  }, [playbackTime, generator, isDragging, dragDelta]);

  const drawPreviewFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    // Dark CRT vector background
    ctx.fillStyle = '#02050b';
    ctx.fillRect(0, 0, width, height);

    // CRT Grid
    ctx.strokeStyle = 'rgba(15, 35, 60, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();

    // Sample current points with auto-equilibration applied
    const sample = sampleGeneratorAtTime(generator, playbackTime);
    if (!sample.points || sample.points.length === 0) return;

    const scaleFactor = (Math.min(width, height) / 2) * 0.85;

    // If currently dragging, also add drag delta
    const pointsToDraw = sample.points.map(([px, py]) => {
      if (isDragging) {
        return [
          Math.max(-1.0, Math.min(1.0, px + dragDelta.dx)),
          Math.max(-1.0, Math.min(1.0, py + dragDelta.dy)),
        ] as [number, number];
      }
      return [px, py] as [number, number];
    });

    // Draw Ghost contour if dragging to show original vs new position
    if (isDragging && (Math.abs(dragDelta.dx) > 0.01 || Math.abs(dragDelta.dy) > 0.01)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < sample.points.length; i++) {
        const px = cx + sample.points[i][0] * scaleFactor;
        const py = cy - sample.points[i][1] * scaleFactor;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Displacement anchor vector line
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + dragDelta.dx * scaleFactor, cy - dragDelta.dy * scaleFactor);
      ctx.stroke();
      ctx.restore();
    }

    // Phosphor glow pass
    ctx.save();
    ctx.strokeStyle = generator.primaryColor;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = generator.primaryColor;
    ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    for (let i = 0; i < pointsToDraw.length; i++) {
      const px = cx + pointsToDraw[i][0] * scaleFactor;
      const py = cy - pointsToDraw[i][1] * scaleFactor;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Sharp Core Vector Beam
    ctx.save();
    ctx.strokeStyle = generator.primaryColor;
    ctx.lineWidth = 2.0;
    ctx.shadowColor = generator.primaryColor;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    for (let i = 0; i < pointsToDraw.length; i++) {
      const px = cx + pointsToDraw[i][0] * scaleFactor;
      const py = cy - pointsToDraw[i][1] * scaleFactor;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // Live On-screen Dragging HUD Overlay
    if (isDragging) {
      ctx.save();
      ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `TASSER: ΔX ${dragDelta.dx >= 0 ? '+' : ''}${dragDelta.dx.toFixed(2)}  ΔY ${dragDelta.dy >= 0 ? '+' : ''}${dragDelta.dy.toFixed(2)}`,
        12,
        24
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '10px monospace';
      const spanLabel =
        selectedSpan === '5_sec'
          ? 'Équilibre: 5s (±2.5s)'
          : selectedSpan === '1_frame'
          ? 'Frame 1x'
          : selectedSpan === '1_sec'
          ? 'Équilibre: 1s'
          : selectedSpan === '10_sec'
          ? 'Équilibre: 10s'
          : 'Global (tout)';
      ctx.fillText(`Mode: ${spanLabel}`, 12, 40);
      ctx.restore();
    }
  };

  // Mouse drag handlers on the canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragDelta({ dx: 0, dy: 0 });
    // Pause automatically when user grabs the shape to make precision nudging easy
    setIsPlaying(false);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleFactor = (Math.min(rect.width, rect.height) / 2) * 0.85;
    const dx = (e.clientX - dragStart.x) / scaleFactor;
    const dy = -(e.clientY - dragStart.y) / scaleFactor;
    setDragDelta({ dx, dy });
  };

  const handleCanvasMouseUp = () => {
    if (isDragging && (Math.abs(dragDelta.dx) > 0.005 || Math.abs(dragDelta.dy) > 0.005)) {
      applyNudgeCorrection(dragDelta.dx, dragDelta.dy);
    }
    setIsDragging(false);
    setDragStart(null);
    setDragDelta({ dx: 0, dy: 0 });
  };

  const applyNudgeCorrection = (dx: number, dy: number) => {
    const fps = generator.fps || 30;
    const currentFrame = Math.round(playbackTime * fps);

    if (selectedSpan === 'all') {
      // Direct global offset update
      onUpdate({
        offsetX: Math.max(-1.0, Math.min(1.0, generator.offsetX + dx)),
        offsetY: Math.max(-1.0, Math.min(1.0, generator.offsetY + dy)),
      });
      return;
    }

    const windowDur =
      selectedSpan === '1_frame'
        ? 0
        : selectedSpan === '1_sec'
        ? 1.0
        : selectedSpan === '5_sec'
        ? 5.0
        : 10.0;

    const newCorrection: TemporalNudgeCorrection = {
      id: `corr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timeSec: Number(playbackTime.toFixed(2)),
      frameIdx: currentFrame,
      deltaX: Number(dx.toFixed(3)),
      deltaY: Number(dy.toFixed(3)),
      span: selectedSpan,
      windowDurationSec: windowDur,
      appliedAt: new Date().toLocaleTimeString(),
      label:
        selectedSpan === '1_frame'
          ? `Frame ${currentFrame} (unique)`
          : selectedSpan === '5_sec'
          ? `Frame ${currentFrame} (±2.5s Auto-Équilibrée)`
          : `Frame ${currentFrame} (±${(windowDur / 2).toFixed(1)}s)`,
    };

    const currentCorrections = generator.temporalCorrections || [];
    onUpdate({
      temporalCorrections: [...currentCorrections, newCorrection],
    });
  };

  const handleRemoveCorrection = (corrId: string) => {
    const list = (generator.temporalCorrections || []).filter((c) => c.id !== corrId);
    onUpdate({ temporalCorrections: list });
  };

  const handleClearAllCorrections = () => {
    onUpdate({ temporalCorrections: [] });
  };

  // Video recording function
  const handleGenerateVideoFile = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsExportingVideo(true);
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
        videoBitsPerSecond: 4000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        const cleanName = generator.name.replace(/\s+/g, '_').toLowerCase();
        triggerBlobDownload(videoBlob, `${cleanName}_video.webm`);
        setIsExportingVideo(false);
      };

      recorder.start();
      const durMs = (generator.durationSec / Math.max(0.1, generator.speedMultiplier)) * 1000;
      setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, Math.min(15000, Math.max(1000, durMs)));
    } catch (e) {
      console.error('Failed to capture video stream:', e);
      setIsExportingVideo(false);
      alert('La capture vidéo n’a pas pu démarrer sur ce navigateur.');
    }
  };

  // Export X/Y Stereo Audio file (.WAV)
  const handleExportWavAudio = () => {
    setIsExportingWav(true);
    try {
      const sampleRate = 48000;
      const duration = generator.durationSec;
      const totalSamples = Math.floor(sampleRate * duration);
      const left = new Float32Array(totalSamples);
      const right = new Float32Array(totalSamples);

      for (let i = 0; i < totalSamples; i++) {
        const tSec = i / sampleRate;
        const sample = sampleGeneratorAtTime(generator, tSec);
        if (sample.points.length > 0) {
          const ptIdx = Math.floor(((i % 200) / 200) * sample.points.length);
          const pt = sample.points[ptIdx];
          left[i] = pt[0] * 0.8;
          right[i] = pt[1] * 0.8;
        }
      }

      const { blob } = encodeStereoWav(left, right, sampleRate, 48000, 16, true);
      const cleanName = generator.name.replace(/\s+/g, '_').toLowerCase();
      triggerBlobDownload(blob, `${cleanName}_audio_stereo_XY.wav`);
    } catch (e) {
      console.error('Failed to export audio WAV:', e);
    } finally {
      setIsExportingWav(false);
    }
  };

  const handleSendToTimeline = () => {
    if (!onApplyTimelineScenes) return;
    const scenes: TimelineScene[] = generator.keyframes.map((kf, i) => ({
      id: `scene_${generator.id}_${i}_${Date.now()}`,
      name: `${generator.name} - ${kf.label}`,
      type: 'preset',
      duration: Number((generator.durationSec / generator.keyframes.length).toFixed(1)),
      transition: 'morph',
      transitionDuration: 0.5,
    }));
    onApplyTimelineScenes(scenes);
    alert(`Les ${scenes.length} scènes de ce générateur ont été importées dans la Timeline !`);
  };

  return (
    <div
      className={`bg-[#060c18] border-2 rounded-2xl p-5 shadow-2xl transition-all ${
        isActive
          ? 'border-cyan-400/80 shadow-[0_0_30px_rgba(0,245,212,0.15)] bg-gradient-to-b from-[#071328] to-[#050b16]'
          : 'border-[#15253e] hover:border-slate-700'
      }`}
    >
      {/* Top Header Row of the Generator */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#14233c]">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full border border-white/20 shadow-md"
            style={{ backgroundColor: generator.primaryColor }}
            title={`Couleur principale : ${generator.primaryColor}`}
          />
          <div>
            <input
              type="text"
              value={generator.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="text-base font-black text-slate-100 bg-transparent hover:bg-slate-900/60 focus:bg-slate-900 px-2 py-0.5 rounded border border-transparent focus:border-cyan-500/50 font-mono tracking-wide focus:outline-none transition-all"
            />
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono px-2">
              <span className="uppercase text-cyan-400 font-bold">{generator.category}</span>
              <span>•</span>
              <span>{generator.keyframes.length} KEYFRAMES</span>
              <span>•</span>
              <span>
                {generator.temporalCorrections?.length || 0} CORRECTIONS TEMPORELLES ACTIVES
              </span>
            </div>
          </div>
        </div>

        {/* Master Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onInjectScope}
            id={`btn-inject-scope-${generator.id}`}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-black flex items-center gap-2 transition-all shadow-md ${
              isActive
                ? 'bg-emerald-500 text-slate-950 border border-emerald-300 shadow-emerald-500/20'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{isActive ? '✓ ACTIF SUR SCOPE' : 'INJECTER DANS LE SCOPE'}</span>
          </button>

          <button
            onClick={onDuplicate}
            title="Dupliquer ce générateur"
            className="p-2 rounded-xl text-xs font-mono text-slate-400 hover:text-cyan-300 border border-[#162744] hover:border-cyan-500/50 hover:bg-[#0c1a30] transition-all"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={onDelete}
            title="Supprimer ce générateur"
            className="p-2 rounded-xl text-xs font-mono text-slate-500 hover:text-rose-400 border border-[#162744] hover:border-rose-500/50 hover:bg-rose-950/20 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Left Preview + Right Parameter & Dynamic Automation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
        {/* Left Column (5 Cols): Real-time Preview Canvas + Video Controls */}
        <div className="lg:col-span-5 flex flex-col items-center gap-3">
          <div
            className={`relative w-full aspect-square max-w-[340px] rounded-2xl overflow-hidden border-2 border-[#192b47] shadow-inner bg-[#02050b] select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="w-full h-full object-contain"
              title="Cliquez et glissez directement avec la souris pour tasser ou déplacer le tracé !"
            />

            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-900/80 text-cyan-300 border border-cyan-500/40 backdrop-blur-sm flex items-center gap-1.5 hover:bg-slate-800"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isPlaying ? 'PAUSE' : 'LIRE'}</span>
            </button>

            {/* Hint Badge: Tasser à la souris */}
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-950/80 text-cyan-300 border border-cyan-500/40 backdrop-blur-sm flex items-center gap-1">
              <Move className="w-3 h-3 text-cyan-400" />
              <span>TASSER AVEC SOURIS</span>
            </div>

            {/* Active Glow Badge */}
            {isActive && (
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>FLUX SCOPE ACTIF</span>
              </div>
            )}
          </div>

          {/* Interactive Scrubbing Bar & Stepping Controls */}
          <div className="w-full max-w-[340px] space-y-1.5 bg-[#040915] p-2.5 rounded-xl border border-[#132238]">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-cyan-300 font-bold">{liveSpecs.timeSec.toFixed(2)}s</span>
                <span className="text-slate-500">/ {generator.durationSec.toFixed(1)}s</span>
              </div>
              <span className="text-amber-400 font-bold">
                FRAME {liveSpecs.frameNumber} / {liveSpecs.totalFrames}
              </span>
            </div>

            {/* Timeline Scrubber */}
            <input
              type="range"
              min="0"
              max={generator.durationSec}
              step="0.033"
              value={playbackTime}
              onChange={(e) => {
                setPlaybackTime(parseFloat(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />

            {/* Frame -1 / Play / Frame +1 controls */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => {
                  setPlaybackTime((p) => Math.max(0, p - 1 / (generator.fps || 30)));
                  setIsPlaying(false);
                }}
                className="px-2 py-1 rounded bg-[#0b1626] hover:bg-[#12233c] text-slate-300 text-[10px] font-mono flex items-center gap-1 border border-[#182944]"
                title="Reculer d'une frame"
              >
                <ChevronLeft className="w-3 h-3" />
                <span>-1 FRAME</span>
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/40 flex items-center gap-1"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlaying ? 'PAUSE' : 'LIRE'}</span>
              </button>

              <button
                onClick={() => {
                  setPlaybackTime((p) =>
                    Math.min(generator.durationSec, p + 1 / (generator.fps || 30))
                  );
                  setIsPlaying(false);
                }}
                className="px-2 py-1 rounded bg-[#0b1626] hover:bg-[#12233c] text-slate-300 text-[10px] font-mono flex items-center gap-1 border border-[#182944]"
                title="Avancer d'une frame"
              >
                <span>+1 FRAME</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Video & Audio Generator Controls */}
          <div className="w-full max-w-[340px] flex flex-col gap-2">
            <button
              onClick={handleGenerateVideoFile}
              disabled={isExportingVideo}
              id={`btn-render-video-${generator.id}`}
              className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <FileVideo className="w-4 h-4" />
              <span>
                {isExportingVideo ? 'ENREGISTREMENT VIDÉO EN COURS...' : 'GÉNÉRER LA VIDÉO (.WEBM)'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportWavAudio}
                disabled={isExportingWav}
                className="py-1.5 rounded-lg text-[11px] font-mono bg-[#0c182c] text-cyan-300 border border-[#1d3356] hover:bg-[#122340] flex items-center justify-center gap-1.5 transition-all"
              >
                <Music className="w-3 h-3 text-cyan-400" />
                <span>AUDIO X/Y (.WAV)</span>
              </button>

              <button
                onClick={handleSendToTimeline}
                className="py-1.5 rounded-lg text-[11px] font-mono bg-[#0c182c] text-indigo-300 border border-[#1d3356] hover:bg-[#122340] flex items-center justify-center gap-1.5 transition-all"
              >
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>VERS TIMELINE</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Direct Customization Panel + Real-time Specs Monitor + Temporal Auto-Equilibration */}
        <div className="lg:col-span-7 space-y-4">
          {/* SECTION 1: USER REQUEST - MONITEUR DES SPECS DYNAMIQUES & AUTOMATISATION */}
          {/* "Et tu vois les modifications du spec changées pendant l'animation." */}
          <div className="bg-[#040915] p-4 rounded-2xl border border-[#1a2f4c] shadow-lg space-y-2">
            <div className="flex items-center justify-between border-b border-[#14243b] pb-2">
              <span className="text-xs font-mono font-black text-cyan-300 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>MONITEUR DES SPECS EN TEMPS RÉEL (DYNAMIC AUTOMATION)</span>
              </span>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                {isPlaying ? '● LECTURE ACTIVE' : '❚❚ PAUSE - ÉDITION POSSIBLE'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-[#071120] p-2 rounded-lg border border-[#15273f]">
                <div className="text-[9px] text-slate-400">POSITION X DYNAMIQUE</div>
                <div className="text-cyan-300 font-bold text-xs">
                  {liveSpecs.effectiveX >= 0 ? `+${liveSpecs.effectiveX}` : liveSpecs.effectiveX}
                </div>
                <div className="text-[9px] text-slate-500">
                  (Base: {generator.offsetX.toFixed(2)})
                </div>
              </div>

              <div className="bg-[#071120] p-2 rounded-lg border border-[#15273f]">
                <div className="text-[9px] text-slate-400">POSITION Y DYNAMIQUE</div>
                <div className="text-cyan-300 font-bold text-xs">
                  {liveSpecs.effectiveY >= 0 ? `+${liveSpecs.effectiveY}` : liveSpecs.effectiveY}
                </div>
                <div className="text-[9px] text-slate-500">
                  (Base: {generator.offsetY.toFixed(2)})
                </div>
              </div>

              <div className="bg-[#071120] p-2 rounded-lg border border-[#15273f]">
                <div className="text-[9px] text-slate-400">ÉCHELLE GLOBALE</div>
                <div className="text-amber-300 font-bold text-xs">
                  {(generator.scale * 100).toFixed(0)}%
                </div>
                <div className="text-[9px] text-slate-500">×{generator.scale.toFixed(2)}</div>
              </div>

              <div className="bg-[#071120] p-2 rounded-lg border border-[#15273f]">
                <div className="text-[9px] text-slate-400">CORRECTIONS ACTIVES</div>
                <div className="text-emerald-300 font-bold text-xs">
                  {generator.temporalCorrections?.length || 0} active(s)
                </div>
                <div className="text-[9px] text-slate-500">
                  Δ: {liveSpecs.autoDeltaX !== 0 || liveSpecs.autoDeltaY !== 0 ? 'Oui' : 'Neutre'}
                </div>
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-400 bg-[#071120] px-3 py-1.5 rounded-lg border border-[#14253c] flex items-center justify-between">
              <span className="truncate">PHASE : {liveSpecs.keyframeLabel}</span>
              <span className="text-indigo-300">
                COURBE D'ÉQUILIBRAGE : HANN COSINE (C¹ FLUIDE)
              </span>
            </div>
          </div>

          {/* SECTION 2: USER REQUEST - DÉPLACER / TASSER AVEC LA SOURIS & ÉTENDUE TEMPORELLE */}
          {/* "Ce qui veut dire qu'en plein milieu de l'animation, je peux aller le corriger. On pourrait corriger sur une frame, sur une seconde, sur 5 secondes, sur 10 secondes et sur toute l'animation. Ce qui veut dire que si je modifie sur 5 secondes, eh bien, exemple, il y a la la frame qui est 64, eh bien, sur 2 secondes et demie avant et 2 secondes et demie après, ça va auto-ajuster pour que ça prenne sa place. Ultra-soft, sans que ça paraisse qu'il y a une modification." */}
          <div className="bg-[#040915] p-4 rounded-2xl border border-indigo-900/50 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#14243b] pb-2">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold text-indigo-300">
                  TASSER LE TRACÉ AVEC LA SOURIS & AUTO-ÉQUILIBRAGE ULTRA-SOFT
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-300 font-bold">
                FRAME ACTIVE : {liveSpecs.frameNumber} ({liveSpecs.timeSec}s)
              </span>
            </div>

            {/* Temporal Scope Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
                <span>ÉTENDUE DE L'AJUSTEMENT TEMPOREL :</span>
                <span className="text-cyan-300 font-bold">
                  {selectedSpan === '1_frame' && '1 Frame (Image unique sans transition)'}
                  {selectedSpan === '1_sec' && '1 Seconde (±0.5s auto-équilibrée)'}
                  {selectedSpan === '5_sec' &&
                    '5 Secondes (±2.5s auto-équilibrée ultra-soft — Recommandé)'}
                  {selectedSpan === '10_sec' && '10 Secondes (±5.0s auto-équilibrée)'}
                  {selectedSpan === 'all' && "Toute l'Animation (Décalage permanent global)"}
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { id: '1_frame', label: '1 FRAME', sub: 'Précise' },
                  { id: '1_sec', label: '1 SECONDE', sub: '±0.5s' },
                  { id: '5_sec', label: '5 SECONDES', sub: '±2.5s Soft', recommended: true },
                  { id: '10_sec', label: '10 SECONDES', sub: '±5.0s' },
                  { id: 'all', label: 'TOUTE L’ANIM.', sub: 'Globale' },
                ].map((span) => (
                  <button
                    key={span.id}
                    onClick={() => setSelectedSpan(span.id as TemporalCorrectionSpan)}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-mono text-center transition-all border ${
                      selectedSpan === span.id
                        ? 'bg-indigo-600 text-white font-black border-indigo-400 shadow-md shadow-indigo-500/20'
                        : 'bg-[#0a1527] text-slate-400 hover:text-slate-200 border-[#162744]'
                    }`}
                  >
                    <div className="font-bold">{span.label}</div>
                    <div className="text-[9px] opacity-75">{span.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Bell Curve illustration for the auto-equilibration window */}
            <div className="bg-[#060e1d] p-2.5 rounded-xl border border-[#13243d] flex items-center justify-between gap-4">
              <div className="text-[10px] font-mono text-slate-400 space-y-1">
                <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>COURBE D'ÉQUILIBRAGE COS² (HANN)</span>
                </div>
                <div>
                  {selectedSpan === '5_sec' ? (
                    <span>
                      Déplacement max à la <b className="text-white">Frame {liveSpecs.frameNumber}</b>, puis atténuation ultra-fluide sur <b className="text-amber-300">2.5s avant</b> et <b className="text-amber-300">2.5s après</b>.
                    </span>
                  ) : selectedSpan === '1_frame' ? (
                    <span>Correction chirurgicale appliquée exclusivement à la frame sélectionnée.</span>
                  ) : selectedSpan === 'all' ? (
                    <span>Déplacement constant sur toutes les frames de la vidéo.</span>
                  ) : (
                    <span>Atténuation harmonique en cloche sur la fenêtre temporelle choisie.</span>
                  )}
                </div>
              </div>

              {/* Mini SVG representation of the cosine bell curve */}
              <div className="w-24 h-8 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 32" className="w-full h-full stroke-cyan-400 fill-none">
                  {selectedSpan === '1_frame' ? (
                    <path d="M 10 28 L 50 28 L 50 4 L 50 28 L 90 28" strokeWidth="2" />
                  ) : selectedSpan === 'all' ? (
                    <path d="M 5 8 L 95 8" strokeWidth="2" />
                  ) : (
                    <path
                      d="M 10 28 C 30 28, 40 4, 50 4 C 60 4, 70 28, 90 28"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}
                  <circle cx="50" cy="4" r="3" className="fill-amber-400 stroke-none" />
                </svg>
              </div>
            </div>

            {/* Rapid Nudge Buttons (Alternative or complement to mouse dragging) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] font-mono text-slate-400">MICRO-AJUSTEMENTS RAPIDES :</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => applyNudgeCorrection(-0.05, 0)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-[#091527] hover:bg-[#12233c] text-cyan-300 border border-[#1b3152] transition-all"
                  title="Tasser vers la gauche"
                >
                  ← GAUCHE (-0.05)
                </button>
                <button
                  onClick={() => applyNudgeCorrection(0.05, 0)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-[#091527] hover:bg-[#12233c] text-cyan-300 border border-[#1b3152] transition-all"
                  title="Tasser vers la droite (ex: lapin trop à gauche)"
                >
                  → DROITE (+0.05)
                </button>
                <button
                  onClick={() => applyNudgeCorrection(0, 0.05)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-[#091527] hover:bg-[#12233c] text-cyan-300 border border-[#1b3152] transition-all"
                  title="Tasser vers le haut (ex: lapin trop bas)"
                >
                  ↑ HAUT (+0.05)
                </button>
                <button
                  onClick={() => applyNudgeCorrection(0, -0.05)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-[#091527] hover:bg-[#12233c] text-cyan-300 border border-[#1b3152] transition-all"
                  title="Tasser vers le bas"
                >
                  ↓ BAS (-0.05)
                </button>
              </div>
            </div>

            {/* List of Applied Corrections with Deletion */}
            {generator.temporalCorrections && generator.temporalCorrections.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#14243b]">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>CORRECTIONS ENREGISTRÉES ({generator.temporalCorrections.length}) :</span>
                  <button
                    onClick={handleClearAllCorrections}
                    className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                  >
                    Tout réinitialiser
                  </button>
                </div>

                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {generator.temporalCorrections.map((corr) => (
                    <div
                      key={corr.id}
                      className="flex items-center justify-between bg-[#071222] px-2.5 py-1 rounded text-[10px] font-mono border border-[#152842]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-300 font-bold">
                          {corr.label || `Frame ${corr.frameIdx}`}
                        </span>
                        <span className="text-slate-400">
                          ΔX: {corr.deltaX > 0 ? `+${corr.deltaX}` : corr.deltaX} | ΔY:{' '}
                          {corr.deltaY > 0 ? `+${corr.deltaY}` : corr.deltaY}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveCorrection(corr.id)}
                        className="text-slate-500 hover:text-rose-400"
                        title="Supprimer cet ajustement"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: COLOR, SCALE & STATIC PARAMETERS */}
          <div className="bg-[#040915] p-4 rounded-2xl border border-[#132238] space-y-4">
            {/* Color Swatches ("puis je le mets bleu par exemple") */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" />
                  <span>COULEUR PRINCIPALE (EX: LAPIN BLEU)</span>
                </label>
                <span className="text-xs font-mono text-slate-400">{generator.primaryColor}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={generator.primaryColor}
                  onChange={(e) => onUpdate({ primaryColor: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-[#20375a]"
                  title="Sélecteur libre"
                />

                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.value}
                    onClick={() => onUpdate({ primaryColor: swatch.value })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all border ${
                      generator.primaryColor.toLowerCase() === swatch.value.toLowerCase()
                        ? 'border-white text-white shadow-md'
                        : 'border-transparent text-slate-300 hover:border-slate-600'
                    }`}
                    style={{ backgroundColor: swatch.value + '25' }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/40 shadow-sm"
                      style={{ backgroundColor: swatch.value }}
                    />
                    <span>{swatch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Scale Slider ("ou je le mets plus gros ou plus petit") */}
            <div className="space-y-2 pt-2 border-t border-[#132238]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>TAILLE / ÉCHELLE (PLUS GROS OU PLUS PETIT)</span>
                </label>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {(generator.scale * 100).toFixed(0)}% (×{generator.scale.toFixed(2)})
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-slate-500">PETIT</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={generator.scale}
                  onChange={(e) => onUpdate({ scale: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <span className="text-[10px] font-mono text-slate-500">GROS</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {SCALE_PRESETS.map((sc) => (
                  <button
                    key={sc.value}
                    onClick={() => onUpdate({ scale: sc.value })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                      Math.abs(generator.scale - sc.value) < 0.05
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary elements (Terrier brun, oreilles) */}
            <div className="pt-2 border-t border-[#132238] flex flex-wrap items-center justify-between gap-3">
              {generator.burrowColor && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-300 font-semibold">
                    COULEUR TERRIER :
                  </span>
                  <input
                    type="color"
                    value={generator.burrowColor}
                    onChange={(e) => onUpdate({ burrowColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border border-slate-700"
                  />
                  <span className="text-[10px] font-mono text-slate-400">
                    {generator.burrowColor}
                  </span>
                </div>
              )}

              {generator.secondaryColor && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-300 font-semibold">
                    DÉTAIL (OREILLES) :
                  </span>
                  <input
                    type="color"
                    value={generator.secondaryColor}
                    onChange={(e) => onUpdate({ secondaryColor: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border border-slate-700"
                  />
                  <span className="text-[10px] font-mono text-slate-400">
                    {generator.secondaryColor}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`chk-fill-${generator.id}`}
                  checked={generator.fillEnabled}
                  onChange={(e) => onUpdate({ fillEnabled: e.target.checked })}
                  className="accent-cyan-400 cursor-pointer"
                />
                <label
                  htmlFor={`chk-fill-${generator.id}`}
                  className="text-[11px] font-mono text-slate-300 cursor-pointer"
                >
                  REMPLISSAGE VECTORIEL
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
