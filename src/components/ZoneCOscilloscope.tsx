import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Maximize2,
  Minimize2,
  Camera,
  RotateCw,
  Sun,
  Layers,
  Sparkles,
  Eye,
  Settings,
  Grid,
  Crosshair,
  Sliders,
  Pause,
  Play,
  Scissors,
  Trash2,
  Check,
  Plus,
  Compass,
  Zap,
  Info,
  Paintbrush,
  Move,
  Pin,
  PinOff,
  ExternalLink,
  GripHorizontal,
  Activity,
  Radio,
  Volume2
} from 'lucide-react';
import { ScopeDisplaySettings, ScopeRenderMode, AppMode, PatternFillChannel, TemporalCorrectionSpan } from '../types/vectorScope';
import {
  exportPointsToSvg,
  exportPointsToCsv,
  updateAndGenerateContourNoise,
  BouncingNoiseParticle,
  getContourBoundingBox,
  isPointInContourPolygon
} from '../services/mathEngine';
import { triggerBlobDownload, triggerTextDownload } from '../services/exportUtils';
import { savePattern } from '../services/patternStorage';
import { loadSequenceGenerators, saveSequenceGenerators } from '../services/sequenceGeneratorStorage';

interface ZoneCOscilloscopeProps {
  points: Array<[number, number]>;
  settings: ScopeDisplaySettings;
  onSettingsChange: (settings: Partial<ScopeDisplaySettings>) => void;
  presetName: string;
  isPaused: boolean;
  onTogglePause: () => void;
  onNavigateToSource?: (moduleName: AppMode) => void;
  onSavedToPatternLibrary?: (patternName: string) => void;
  isDetached?: boolean;
  onToggleDetach?: () => void;
}

interface SegmentMeta {
  index: number;
  startIndex: number;
  endIndex: number;
  p0: [number, number];
  p1: [number, number];
  length: number;
  isReturnLine: boolean;
}

export const ZoneCOscilloscope: React.FC<ZoneCOscilloscopeProps> = ({
  points = [],
  settings,
  onSettingsChange,
  presetName,
  isPaused,
  onTogglePause,
  onNavigateToSource,
  onSavedToPatternLibrary,
  isDetached,
  onToggleDetach,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 600, height: 600 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Floating / Detached Scope State (Détachable de son socle)
  const [internalDetached, setInternalDetached] = useState<boolean>(false);
  const isDetachedEffective = isDetached !== undefined ? isDetached : internalDetached;
  const toggleDetach = () => {
    if (onToggleDetach) {
      onToggleDetach();
    } else {
      setInternalDetached(!internalDetached);
    }
  };

  const [detachedSize, setDetachedSize] = useState<number>(420); // 320, 420, 560
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 460) : 100,
    y: 80,
  }));
  const [isDraggingFloating, setIsDraggingFloating] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  const handleStartFloatingDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingFloating(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: floatingPos.x,
      initY: floatingPos.y,
    };
  };

  useEffect(() => {
    if (!isDraggingFloating) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const maxX = Math.max(10, window.innerWidth - detachedSize - 10);
      const maxY = Math.max(10, window.innerHeight - detachedSize - 60);

      setFloatingPos({
        x: Math.min(Math.max(10, dragStartRef.current.initX + dx), maxX),
        y: Math.min(Math.max(10, dragStartRef.current.initY + dy), maxY),
      });
    };

    const handlePointerUp = () => {
      setIsDraggingFloating(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingFloating, detachedSize]);

  // Adjust canvas size when in detached mode
  useEffect(() => {
    if (isDetachedEffective) {
      const cSize = Math.max(260, detachedSize - 32);
      setCanvasDimensions({ width: cSize, height: cSize });
    }
  }, [isDetachedEffective, detachedSize]);

  // Line inspection and deletion state
  const [frozenPoints, setFrozenPoints] = useState<Array<[number, number]>>([]);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number | null>(null);
  const [hoveredSegmentIdx, setHoveredSegmentIdx] = useState<number | null>(null);
  const [deletedSegmentIndices, setDeletedSegmentIndices] = useState<Set<number>>(new Set());
  const [customPatternCreatedMsg, setCustomPatternCreatedMsg] = useState<string | null>(null);

  // USER SPECIFIED: Color system per line and void fill channels
  const [segmentColors, setSegmentColors] = useState<Record<number, string>>({});
  const [pointColors, setPointColors] = useState<string[]>([]);
  const [fillChannels, setFillChannels] = useState<PatternFillChannel[]>([]);
  const [pauseToolMode, setPauseToolMode] = useState<'inspect' | 'fill' | 'nudge' | 'left_brush'>('inspect');
  const [activeColor, setActiveColor] = useState<string>('#ffffff');
  const [fillOpacity, setFillOpacity] = useState<number>(0.65);
  const [fillStyle, setFillStyle] = useState<'solid' | 'neon_glow' | 'crt_hatch'>('solid');
  const [showChannelsDrawer, setShowChannelsDrawer] = useState<boolean>(false);
  const channelMasksRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Left-Handed / Right-Handed ergonomic mode
  const [handMode, setHandMode] = useState<'left_handed' | 'right_handed'>(() => {
    try {
      const saved = localStorage.getItem('genesis_hand_mode');
      return (saved as any) || 'left_handed'; // Default to Left-Handed for artistic ergonomics
    } catch {
      return 'left_handed';
    }
  });

  const handleToggleHandMode = () => {
    const next = handMode === 'left_handed' ? 'right_handed' : 'left_handed';
    setHandMode(next);
    try {
      localStorage.setItem('genesis_hand_mode', next);
    } catch {}
    if (onSettingsChange) {
      onSettingsChange({ handMode: next });
    }
  };

  // Nudge / Tasser avec la souris state (User request: déplacer généralement pendant pause)
  const [nudgeOffset, setNudgeOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [isDraggingNudge, setIsDraggingNudge] = useState<boolean>(false);
  const [nudgeDragStart, setNudgeDragStart] = useState<{ x: number; y: number } | null>(null);
  const [nudgeSpan, setNudgeSpan] = useState<TemporalCorrectionSpan>('5_sec');

  // Simulation ref for Bouncing White Noise Electron Beam Particles
  const noiseParticlesRef = useRef<BouncingNoiseParticle[]>([]);

  // Synchronize frozen points when pause toggled
  useEffect(() => {
    if (isPaused) {
      if (frozenPoints.length === 0 && points && points.length > 0) {
        setFrozenPoints([...points]);
        setDeletedSegmentIndices(new Set());
        setSelectedSegmentIdx(null);
      }
    } else {
      setFrozenPoints([]);
      setDeletedSegmentIndices(new Set());
      setSelectedSegmentIdx(null);
    }
  }, [isPaused]);

  // Points to render: live or frozen (with deleted lines filtered out)
  const activePoints = isPaused && frozenPoints.length > 0 ? frozenPoints : (points || []);

  // Compute segment breakdown for interactive line picking & multi-color drawing
  const segmentsMeta: SegmentMeta[] = useMemo(() => {
    if (activePoints.length < 2) return [];

    const segs: SegmentMeta[] = [];
    const N = activePoints.length;

    // Estimate average step length to detect long return-to-start jump lines
    let totalLen = 0;
    for (let i = 0; i < N - 1; i++) {
      const dx = activePoints[i + 1][0] - activePoints[i][0];
      const dy = activePoints[i + 1][1] - activePoints[i][1];
      totalLen += Math.sqrt(dx * dx + dy * dy);
    }
    const avgLen = totalLen / Math.max(1, N - 1);

    // Group points into segments
    const stepSize = Math.max(1, Math.floor(N / 40));
    for (let i = 0; i < N - 1; i += stepSize) {
      const endI = Math.min(N - 1, i + stepSize);
      const p0 = activePoints[i];
      const p1 = activePoints[endI];
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const length = Math.sqrt(dx * dx + dy * dy);

      // A line segment is considered a return-line if it spans far across or connects back from end to beginning
      const isReturnLine = length > avgLen * 3.5 || (i >= N - stepSize && length > avgLen * 2);

      segs.push({
        index: segs.length,
        startIndex: i,
        endIndex: endI,
        p0,
        p1,
        length,
        isReturnLine,
      });
    }

    return segs;
  }, [isPaused, activePoints]);

  const screenContainerRef = useRef<HTMLDivElement | null>(null);

  // ResizeObserver for responsive high-res canvas measuring the CRT screen container
  useEffect(() => {
    const target = screenContainerRef.current || containerRef.current;
    if (!target) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rectW = entry.contentRect.width;
        const rectH = entry.contentRect.height;
        const availableSize = rectH > 50 ? Math.min(rectW, rectH) : rectW;
        const effectiveSize = Math.max(340, Math.min(720, Math.floor(availableSize)));
        window.requestAnimationFrame(() => { setCanvasDimensions(prev => {          if (prev.width === effectiveSize && prev.height === effectiveSize) return prev;          return { width: effectiveSize, height: effectiveSize };        });
        });
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Main Canvas Real-Time Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // CRT Phosphor Colors & Pattern custom color
    let beamColorHex = settings.primaryColor || '#00f5d4'; // Default fallback
    if (settings.colorScheme === 'green_phosphor') beamColorHex = '#39ff14'; // Green P1
    else if (settings.colorScheme === 'amber_phosphor') beamColorHex = '#ffb703'; // Amber P3
    else if (settings.colorScheme === 'white_phosphor') beamColorHex = '#f8fafc'; // White P4
    else if (settings.colorScheme === 'blue_phosphor') beamColorHex = '#38bdf8'; // Blue P11
    else if (settings.colorScheme === 'gold_phosphor') beamColorHex = '#fbbf24'; // Gold Lotus
    else if (settings.colorScheme === 'earthy_phosphor') beamColorHex = '#ffffff'; // White outlines / Earth Brown fill
    else if (settings.colorScheme === 'custom' || settings.primaryColor) {
      beamColorHex = settings.primaryColor || '#00f5d4';
    }

    // Phosphor Decay / Accumulation handling
    if (settings.mode === 'accumulation') {
      ctx.fillStyle = 'rgba(5, 11, 20, 0.015)';
      ctx.fillRect(0, 0, w, h);
    } else {
      const fadeAlpha = isPaused ? 1.0 : Math.max(0.04, 1 - settings.persistence);
      ctx.fillStyle = `rgba(5, 11, 20, ${fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Draw Graticule / Reticle Grid & Axes if enabled
    if (settings.showGrid) {
      ctx.save();
      ctx.strokeStyle = '#0e1d35';
      ctx.lineWidth = 1;
      const radius = (Math.min(w, h) / 2) * 0.85 * settings.zoom;

      // Concentric circles
      for (let r = 0.25; r <= 1.0; r += 0.25) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * r, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Subdivisions cross lines
      const divs = 8;
      for (let d = 0; d < divs; d++) {
        const ang = (d * Math.PI) / divs;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(ang) * radius, cy - Math.sin(ang) * radius);
        ctx.lineTo(cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (settings.showAxes) {
      ctx.save();
      ctx.strokeStyle = '#1a3359';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
      ctx.restore();
    }

    if (activePoints.length === 0) return;

    // Normalization check
    let scaleX = (w / 2) * 0.85 * settings.zoom;
    let scaleY = (h / 2) * 0.85 * settings.zoom;

    if (settings.normalize) {
      let maxAbs = 0.001;
      for (let i = 0; i < activePoints.length; i++) {
        const ax = Math.abs(activePoints[i][0]);
        const ay = Math.abs(activePoints[i][1]);
        if (ax > maxAbs) maxAbs = ax;
        if (ay > maxAbs) maxAbs = ay;
      }
      scaleX /= maxAbs;
      scaleY /= maxAbs;
    }

    // Visual Rotation
    const rotRad = (settings.rotation * Math.PI) / 180;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);

    // ------------------------------------------------------------------------
    // USER SPECIFIED: Bruit blanc à l'intérieur des fréquences demandées
    // Confiné mathématiquement à l'intérieur du motif (ex: lapin blanc)
    // Rebondit sur le contour du motif. Tout l'extérieur est éliminé !
    // ------------------------------------------------------------------------
    const isNoiseEnabled = settings.noiseFillEnabled ?? true;
    if (isNoiseEnabled && activePoints.length >= 4) {
      ctx.save();

      // Step 1: Strict geometric clipping mask matching the motif polygon contour
      ctx.beginPath();
      let firstPt = true;
      for (let i = 0; i < activePoints.length; i++) {
        const rawX = activePoints[i][0];
        const rawY = activePoints[i][1];
        const rx = rawX * cosR - rawY * sinR;
        const ry = rawX * sinR + rawY * cosR;
        const px = cx + rx * scaleX;
        const py = cy - ry * scaleY;

        if (firstPt) {
          ctx.moveTo(px, py);
          firstPt = false;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.clip(); // Guaranteed zero drawing outside the motif calculation!

      // Step 2: Generate and simulate white noise particles bouncing inside the contour
      const noiseFreq = settings.noiseFrequency || 4400;
      const noiseDensity = settings.noiseDensity || 260;
      const bounceSpeed = settings.noiseBounceSpeed || 1.2;
      const noiseIntensity = settings.noiseIntensity || 0.85;
      const bounceMode = settings.noiseBounceMode || 'specular';

      const noisePoints = updateAndGenerateContourNoise(
        activePoints,
        noiseParticlesRef.current,
        noiseDensity,
        noiseFreq,
        bounceSpeed,
        bounceMode,
        0.016
      );

      // Step 3: Draw interior resonant white noise electron sparks
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6 * settings.brightness * noiseIntensity;

      for (let i = 0; i < noisePoints.length; i++) {
        const np = noisePoints[i];
        const rx = np.x * cosR - np.y * sinR;
        const ry = np.x * sinR + np.y * cosR;
        const px = cx + rx * scaleX;
        const py = cy - ry * scaleY;

        ctx.globalAlpha = np.brightness * noiseIntensity * Math.min(1.0, 0.95 * settings.brightness);
        ctx.beginPath();
        const ptSize = Math.max(1, 1.2 * settings.thickness * (0.6 + 0.4 * Math.random()));
        ctx.arc(px, py, ptSize, 0, Math.PI * 2);
        ctx.fill();

        // Connect stochastic micro-sparks for high frequency laser texture
        if (i > 0 && i % 4 === 0) {
          const prev = noisePoints[i - 1];
          const prx = prev.x * cosR - prev.y * sinR;
          const pry = prev.x * sinR + prev.y * cosR;
          const ppx = cx + prx * scaleX;
          const ppy = cy - pry * scaleY;
          const distSq = (px - ppx) ** 2 + (py - ppy) ** 2;
          if (distSq < (w * 0.08) ** 2) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.8 * settings.thickness;
            ctx.globalAlpha = 0.3 * noiseIntensity;
            ctx.beginPath();
            ctx.moveTo(ppx, ppy);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw Fill Channels (Remplissage) under the outlines
    if (fillChannels && fillChannels.length > 0) {
      fillChannels.forEach((chan) => {
        if (!chan.enabled || !chan.pixelPoints || chan.pixelPoints.length === 0) return;
        ctx.save();
        ctx.fillStyle = chan.color || '#8b4513';
        // Opacity is slightly scaled by overall brightness
        ctx.globalAlpha = (chan.opacity !== undefined ? chan.opacity : 0.6) * Math.min(1.2, settings.brightness);
        
        if (chan.style === 'neon_glow' || settings.colorScheme === 'earthy_phosphor') {
          ctx.shadowColor = chan.color || '#8b4513';
          ctx.shadowBlur = 8 * settings.brightness;
        }

        const ptSize = Math.max(1, settings.thickness * 0.7);
        for (let i = 0; i < chan.pixelPoints.length; i++) {
          const [px, py] = chan.pixelPoints[i];
          if (px >= 0 && px < w && py >= 0 && py < h) {
            ctx.fillRect(px - ptSize / 2, py - ptSize / 2, ptSize, ptSize);
          }
        }
        ctx.restore();
      });
    }

    // Bloom & glow setup for outlines
    if (settings.mode === 'phosphor') {
      ctx.shadowColor = beamColorHex;
      ctx.shadowBlur = 8 * settings.brightness;
      ctx.globalAlpha = Math.min(1.0, 0.85 * settings.brightness);
    } else {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = Math.min(1.0, 0.95 * settings.brightness);
    }

    ctx.strokeStyle = beamColorHex;
    ctx.fillStyle = beamColorHex;
    ctx.lineWidth = settings.thickness;

    const isEarthy = settings.colorScheme === 'earthy_phosphor';
    const hasSegmentColors = Object.keys(segmentColors).length > 0;
    const hasPointColors = pointColors && pointColors.length > 0;

    // Use segment-by-segment drawing if paused, using earthy theme, or using custom segment colors
    if ((isPaused || isEarthy || hasSegmentColors || hasPointColors) && segmentsMeta.length > 0) {
      segmentsMeta.forEach((seg) => {
        if (deletedSegmentIndices.has(seg.index)) return; // Skipped / deleted!

        const isSelected = selectedSegmentIdx === seg.index;
        const isHovered = hoveredSegmentIdx === seg.index;

        ctx.save();
        if (isSelected) {
          ctx.strokeStyle = '#f43f5e'; // Bright Rose for selected line
          ctx.lineWidth = Math.max(3, settings.thickness * 2.5);
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 14;
        } else if (isHovered) {
          ctx.strokeStyle = '#fbbf24'; // Amber for hovered
          ctx.lineWidth = Math.max(2.5, settings.thickness * 1.8);
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 10;
        } else if (isEarthy) {
          if (seg.isReturnLine) {
            ctx.strokeStyle = '#8b4513'; // Earth earthy brown for transition return lines
            ctx.globalAlpha = Math.min(1.0, 0.45 * settings.brightness);
            ctx.lineWidth = settings.thickness * 0.8;
            if (settings.mode === 'phosphor') {
              ctx.shadowColor = '#8b4513';
              ctx.shadowBlur = 4 * settings.brightness;
            }
          } else {
            ctx.strokeStyle = '#ffffff'; // White high intensity contours
            ctx.globalAlpha = Math.min(1.0, 1.0 * settings.brightness);
            ctx.lineWidth = settings.thickness * 1.3;
            if (settings.mode === 'phosphor') {
              ctx.shadowColor = '#ffffff';
              ctx.shadowBlur = 12 * settings.brightness;
            }
          }
        } else if (seg.isReturnLine) {
          ctx.strokeStyle = '#f97316'; // Orange warning highlight for return lines
          ctx.lineWidth = settings.thickness * 1.2;
        } else if (segmentColors[seg.index]) {
          ctx.strokeStyle = segmentColors[seg.index];
          ctx.lineWidth = settings.thickness;
          if (settings.mode === 'phosphor') {
            ctx.shadowColor = segmentColors[seg.index];
            ctx.shadowBlur = 8 * settings.brightness;
          }
        } else {
          ctx.strokeStyle = beamColorHex;
          ctx.lineWidth = settings.thickness;
        }

        ctx.beginPath();
        let isFirst = true;
        for (let idx = seg.startIndex; idx <= seg.endIndex; idx++) {
          const rawX = activePoints[idx][0];
          const rawY = activePoints[idx][1];
          const rx = rawX * cosR - rawY * sinR;
          const ry = rawX * sinR + rawY * cosR;
          const px = cx + rx * scaleX;
          const py = cy - ry * scaleY;

          if (isFirst) {
            ctx.moveTo(px, py);
            isFirst = false;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
        ctx.restore();
      });
    } else {
      // Standard Continuous Wave / CRT drawing
      if (settings.mode === 'points') {
        const dotSize = Math.max(1, settings.thickness);
        for (let i = 0; i < activePoints.length; i++) {
          const rawX = activePoints[i][0];
          const rawY = activePoints[i][1];
          const rx = rawX * cosR - rawY * sinR;
          const ry = rawX * sinR + rawY * cosR;
          const px = cx + rx * scaleX;
          const py = cy - ry * scaleY;
          ctx.fillRect(px - dotSize / 2, py - dotSize / 2, dotSize, dotSize);
        }
      } else {
        ctx.beginPath();
        for (let i = 0; i < activePoints.length; i++) {
          const rawX = activePoints[i][0];
          const rawY = activePoints[i][1];
          const rx = rawX * cosR - rawY * sinR;
          const ry = rawX * sinR + rawY * cosR;
          const px = cx + rx * scaleX;
          const py = cy - ry * scaleY;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();

        if (settings.mode === 'phosphor' && settings.thickness > 1.5) {
          ctx.shadowBlur = 14 * settings.brightness;
          ctx.stroke();
          ctx.lineWidth = settings.thickness * 0.6;
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }, [
    activePoints,
    settings,
    canvasDimensions,
    isPaused,
    segmentsMeta,
    selectedSegmentIdx,
    hoveredSegmentIdx,
    deletedSegmentIndices,
    segmentColors,
    fillChannels,
  ]);

  // Canvas Mouse Picking: find closest segment
  const getSegmentUnderMouse = (clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas || !isPaused || segmentsMeta.length === 0) return null;

    const rect = canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    let scaleX = (w / 2) * 0.85 * settings.zoom;
    let scaleY = (h / 2) * 0.85 * settings.zoom;

    const rotRad = (settings.rotation * Math.PI) / 180;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);

    let closestIdx: number | null = null;
    let minDistance = 22; // 22px click tolerance radius

    for (const seg of segmentsMeta) {
      if (deletedSegmentIndices.has(seg.index)) continue;

      // Check distance to points within this segment
      for (let idx = seg.startIndex; idx <= seg.endIndex; idx += 2) {
        const rawX = activePoints[idx][0];
        const rawY = activePoints[idx][1];
        const rx = rawX * cosR - rawY * sinR;
        const ry = rawX * sinR + rawY * cosR;
        const px = cx + rx * scaleX;
        const py = cy - ry * scaleY;

        const dist = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = seg.index;
        }
      }
    }

    return closestIdx;
  };

  // USER SPECIFIED: Void Fill Algorithm (Algorithme de Remplissage par Inondation BFS)
  const performFloodFill = (clickX: number, clickY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || activePoints.length < 2) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = (Math.min(w, h) / 2) * 0.95;

    let scaleX = (w / 2) * 0.85 * settings.zoom;
    let scaleY = (h / 2) * 0.85 * settings.zoom;
    if (settings.normalize) {
      let maxAbs = 0.001;
      for (let i = 0; i < activePoints.length; i++) {
        const ax = Math.abs(activePoints[i][0]);
        const ay = Math.abs(activePoints[i][1]);
        if (ax > maxAbs) maxAbs = ax;
        if (ay > maxAbs) maxAbs = ay;
      }
      scaleX /= maxAbs;
      scaleY /= maxAbs;
    }
    const rotRad = (settings.rotation * Math.PI) / 180;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);

    // 1. Render all vector lines to an offscreen barrier canvas to detect boundaries accurately
    const barrierCanvas = document.createElement('canvas');
    barrierCanvas.width = w;
    barrierCanvas.height = h;
    const bCtx = barrierCanvas.getContext('2d', { willReadFrequently: true });
    if (!bCtx) return;

    bCtx.fillStyle = '#000000';
    bCtx.fillRect(0, 0, w, h);

    bCtx.strokeStyle = '#ffffff';
    bCtx.lineWidth = Math.max(3, settings.thickness * 1.5);
    bCtx.lineCap = 'round';
    bCtx.lineJoin = 'round';

    if (segmentsMeta.length > 0) {
      segmentsMeta.forEach((seg) => {
        if (deletedSegmentIndices.has(seg.index)) return;
        bCtx.beginPath();
        let isFirst = true;
        for (let idx = seg.startIndex; idx <= seg.endIndex; idx++) {
          const rawX = activePoints[idx][0];
          const rawY = activePoints[idx][1];
          const rx = rawX * cosR - rawY * sinR;
          const ry = rawX * sinR + rawY * cosR;
          const px = cx + rx * scaleX;
          const py = cy - ry * scaleY;
          if (isFirst) {
            bCtx.moveTo(px, py);
            isFirst = false;
          } else {
            bCtx.lineTo(px, py);
          }
        }
        bCtx.stroke();
      });
    } else {
      bCtx.beginPath();
      for (let i = 0; i < activePoints.length; i++) {
        const rawX = activePoints[i][0];
        const rawY = activePoints[i][1];
        const rx = rawX * cosR - rawY * sinR;
        const ry = rawX * sinR + rawY * cosR;
        const px = cx + rx * scaleX;
        const py = cy - ry * scaleY;
        if (i === 0) bCtx.moveTo(px, py);
        else bCtx.lineTo(px, py);
      }
      bCtx.stroke();
    }

    const imgData = bCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let seedX = Math.round(clickX);
    let seedY = Math.round(clickY);
    if (seedX < 0 || seedX >= w || seedY < 0 || seedY >= h) return;

    // If user clicked directly on a line, look around in small radius for adjacent empty void
    if (data[(seedY * w + seedX) * 4] > 100) {
      let found = false;
      for (let r = 1; r <= 8 && !found; r++) {
        for (let dy = -r; dy <= r && !found; dy++) {
          for (let dx = -r; dx <= r && !found; dx++) {
            const nx = seedX + dx;
            const ny = seedY + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              if (data[(ny * w + nx) * 4] < 60) {
                seedX = nx;
                seedY = ny;
                found = true;
              }
            }
          }
        }
      }
      if (!found) return;
    }

    // BFS Queue to collect the void pixels
    const visited = new Uint8Array(w * h);
    const queue: number[] = [seedY * w + seedX];
    visited[seedY * w + seedX] = 1;

    const filledIndices: number[] = [];
    const maxPixels = Math.floor(w * h * 0.55);

    while (queue.length > 0) {
      const idx = queue.shift()!;
      const px = idx % w;
      const py = Math.floor(idx / w);
      filledIndices.push(idx);

      if (filledIndices.length > maxPixels) break;

      const neighbors = [
        px + 1 < w ? idx + 1 : -1,
        px - 1 >= 0 ? idx - 1 : -1,
        py + 1 < h ? idx + w : -1,
        py - 1 >= 0 ? idx - w : -1,
      ];

      for (const nIdx of neighbors) {
        if (nIdx < 0 || visited[nIdx]) continue;
        const nPx = nIdx % w;
        const nPy = Math.floor(nIdx / w);

        const dist = Math.sqrt((nPx - cx) ** 2 + (nPy - cy) ** 2);
        if (dist > maxRadius) continue;
        if (data[nIdx * 4] > 100) continue; // Boundary hit!

        visited[nIdx] = 1;
        queue.push(nIdx);
      }
    }

    if (filledIndices.length < 20) return;

    // Create persistent high-speed mask canvas for this channel
    const maskC = document.createElement('canvas');
    maskC.width = w;
    maskC.height = h;
    const mCtx = maskC.getContext('2d');
    if (mCtx) {
      const mImg = mCtx.createImageData(w, h);
      const mD = mImg.data;
      for (let i = 0; i < filledIndices.length; i++) {
        const id = filledIndices[i] * 4;
        mD[id] = 255;
        mD[id + 1] = 255;
        mD[id + 2] = 255;
        mD[id + 3] = 255;
      }
      mCtx.putImageData(mImg, 0, 0);
    }

    const chanId = `chan_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    channelMasksRef.current.set(chanId, maskC);

    const newChannel: PatternFillChannel = {
      id: chanId,
      name: `Canal Remplissage #${fillChannels.length + 1}`,
      color: activeColor,
      opacity: fillOpacity,
      style: fillStyle,
      seedX: (seedX - cx) / scaleX,
      seedY: -(seedY - cy) / scaleY,
      pixelPoints: filledIndices.slice(0, 1000).map((idx) => [idx % w, Math.floor(idx / w)]),
      enabled: true,
    };

    setFillChannels((prev) => [...prev, newChannel]);
    setShowChannelsDrawer(true);
    setCustomPatternCreatedMsg(`Vide sélectionné ! ${newChannel.name} ajouté à la configuration (${filledIndices.length} px)`);
    setTimeout(() => setCustomPatternCreatedMsg(null), 4000);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaused) return;
    if (pauseToolMode === 'fill') {
      setHoveredSegmentIdx(null);
      return;
    }
    const found = getSegmentUnderMouse(e.clientX, e.clientY);
    setHoveredSegmentIdx(found);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (pauseToolMode === 'fill') {
      performFloodFill(mouseX, mouseY);
      return;
    }

    const found = getSegmentUnderMouse(e.clientX, e.clientY);
    if (found !== null) {
      setSelectedSegmentIdx(found);
    }
  };

  // USER SPECIFIED: Apply chosen color to selected line segment
  const handleApplyColorToSegment = (color: string) => {
    if (selectedSegmentIdx === null) return;
    setSegmentColors((prev) => ({
      ...prev,
      [selectedSegmentIdx]: color,
    }));
    setActiveColor(color);
  };

  // Apply chosen color to ALL line segments
  const handleApplyColorToAll = (color: string) => {
    const updated: Record<number, string> = {};
    segmentsMeta.forEach((seg) => {
      updated[seg.index] = color;
    });
    setSegmentColors(updated);
    setActiveColor(color);
  };

  // USER SPECIFIED: Save pattern with both colored segments and fill channels
  const handleSaveColoredPattern = () => {
    const patternName = `Motif Composé (${presetName}) #${Date.now().toString().slice(-4)}`;
    const saved = savePattern({
      name: patternName,
      description: `Motif enrichi avec ${fillChannels.length} canal(aux) de remplissage et lignes colorées (${activePoints.length} points)`,
      points: activePoints,
      segmentColors,
      fillChannels,
      sourceModule: 'OSCILLOSCOPE',
      color: activeColor,
      isFavorite: true,
    });

    setCustomPatternCreatedMsg(`Motif complet avec ses ${fillChannels.length} canaux enregistré dans la Bibliothèque !`);
    setTimeout(() => setCustomPatternCreatedMsg(null), 4500);

    if (onSavedToPatternLibrary) {
      onSavedToPatternLibrary(patternName);
    }
  };

  // USER SPECIFIED: Encode color directly into the pattern points (Left-Handed / Laser Chroma Encoding)
  const handleEncodeCurrentColorsIntoPattern = () => {
    const encodedPointColors: string[] = [];
    for (let i = 0; i < activePoints.length; i++) {
      let ptCol = activeColor;
      const seg = segmentsMeta.find((s) => i >= s.startIndex && i <= s.endIndex);
      if (seg && segmentColors[seg.index]) {
        ptCol = segmentColors[seg.index];
      } else if (pointColors[i]) {
        ptCol = pointColors[i];
      }
      encodedPointColors.push(ptCol);
    }

    setPointColors(encodedPointColors);

    const patternName = `Motif Encodé RGB (${presetName}) #${Date.now().toString().slice(-4)}`;
    const saved = savePattern({
      name: patternName,
      description: `Motif avec chrominance RGB point par point et ${fillChannels.length} canaux encodés (${activePoints.length} points)`,
      points: activePoints,
      pointColors: encodedPointColors,
      segmentColors,
      fillChannels,
      colorEncoding: 'laser_chroma',
      handMode,
      sourceModule: 'OSCILLOSCOPE',
      color: activeColor,
      isFavorite: true,
    });

    if (onSettingsChange) {
      onSettingsChange({
        pointColors: encodedPointColors,
        segmentColors,
        fillChannels,
        primaryColor: activeColor,
        colorScheme: 'custom',
      });
    }

    setCustomPatternCreatedMsg(`Couleurs encodées avec succès dans le motif "${patternName}" !`);
    setTimeout(() => setCustomPatternCreatedMsg(null), 4500);

    if (onSavedToPatternLibrary) {
      onSavedToPatternLibrary(patternName);
    }
  };

  // Preset Gradient Color Sweeps (Arc-en-Ciel, Cyberpunk, Lapin & Terrier Nature)
  const handleApplyGradientSweep = (type: 'rabbit_burrow' | 'rainbow' | 'sunset' | 'cyberpunk') => {
    const N = activePoints.length;
    if (N === 0) return;
    const newPtColors: string[] = [];
    const newSegColors: Record<number, string> = {};

    if (type === 'rabbit_burrow') {
      // Rabbit: White body (#ffffff), Pink ears (#ffb3c6), Red eyes (#ef4444), Burrow: Brown (#8b4513)
      segmentsMeta.forEach((seg, sIdx) => {
        if (sIdx === 0) newSegColors[seg.index] = '#8b4513'; // Burrow
        else if (sIdx === 1) newSegColors[seg.index] = '#ffffff'; // Rabbit body
        else if (sIdx === 2) newSegColors[seg.index] = '#ffb3c6'; // Ears
        else newSegColors[seg.index] = '#ffffff';
      });
      for (let i = 0; i < N; i++) {
        const seg = segmentsMeta.find((s) => i >= s.startIndex && i <= s.endIndex);
        if (seg && newSegColors[seg.index]) {
          newPtColors.push(newSegColors[seg.index]);
        } else if (i < N * 0.3) {
          newPtColors.push('#8b4513');
        } else if (i < N * 0.7) {
          newPtColors.push('#ffffff');
        } else {
          newPtColors.push('#ffb3c6');
        }
      }
    } else if (type === 'rainbow') {
      for (let i = 0; i < N; i++) {
        const hue = Math.round((i / N) * 360);
        newPtColors.push(`hsl(${hue}, 100%, 60%)`);
      }
    } else if (type === 'sunset') {
      for (let i = 0; i < N; i++) {
        const t = i / N;
        // Orange to Magenta to Purple
        const r = 255;
        const g = Math.round(180 * (1 - t));
        const b = Math.round(220 * t);
        newPtColors.push(`rgb(${r}, ${g}, ${b})`);
      }
    } else if (type === 'cyberpunk') {
      for (let i = 0; i < N; i++) {
        newPtColors.push(i % 2 === 0 ? '#00f5d4' : '#ec4899');
      }
    }

    setPointColors(newPtColors);
    setSegmentColors(newSegColors);
    if (onSettingsChange) {
      onSettingsChange({
        pointColors: newPtColors,
        segmentColors: newSegColors,
        colorScheme: 'custom',
      });
    }
  };

  // Delete the selected line and generate a clean pattern in the library!
  const handleDeleteSelectedSegment = () => {
    if (selectedSegmentIdx === null) return;

    const newDeleted = new Set(deletedSegmentIndices);
    newDeleted.add(selectedSegmentIdx);
    setDeletedSegmentIndices(newDeleted);

    // Build the clean array of points without the deleted segment
    const remainingPoints: Array<[number, number]> = [];
    segmentsMeta.forEach((seg) => {
      if (!newDeleted.has(seg.index)) {
        for (let idx = seg.startIndex; idx <= seg.endIndex; idx++) {
          remainingPoints.push(activePoints[idx]);
        }
      }
    });

    // Directly save to Pattern Library as requested by user!
    const patternName = `Motif Purifié (${presetName}) #${Date.now().toString().slice(-4)}`;
    const saved = savePattern({
      name: patternName,
      description: `Forme nettoyée sans ligne parasite/retour (${remainingPoints.length} points)`,
      points: remainingPoints,
      sourceModule: 'OSCILLOSCOPE',
      color: '#00f5d4',
      isFavorite: true,
    });

    setCustomPatternCreatedMsg(`Ligne retirée ! Motif généré et ajouté à la Bibliothèque : "${patternName}"`);
    setTimeout(() => setCustomPatternCreatedMsg(null), 4500);

    setSelectedSegmentIdx(null);
    if (onSavedToPatternLibrary) {
      onSavedToPatternLibrary(patternName);
    }
  };

  // Determine origin module from preset name
  const getSourceModule = (): { name: string; mode: AppMode } => {
    const p = presetName.toLowerCase();
    if (p.includes('mandala') || p.includes('rose')) return { name: 'MANDALA COMPOSER', mode: 'mandala' };
    if (p.includes('vortex') || p.includes('spiral')) return { name: 'VORTEX DESIGNER', mode: 'vortex' };
    if (p.includes('image') || p.includes('lotus') || p.includes('atom')) return { name: 'IMAGE VECTORIELLE', mode: 'image_lab' };
    if (p.includes('text') || p.includes('texte')) return { name: 'TEXTE ANIMÉ', mode: 'text_lab' };
    if (p.includes('segmented')) return { name: '4/8 GÉNÉRATEURS', mode: 'segmented' };
    if (p.includes('timeline')) return { name: 'TIMELINE & SCÈNES', mode: 'timeline' };
    return { name: 'LABORATOIRE X/Y (GÉNÉRATEURS)', mode: 'main' };
  };

  const sourceModuleInfo = getSourceModule();

  // Snapshot PNG export
  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        triggerBlobDownload(blob, `genesis_scope_${presetName.toLowerCase()}_${Date.now()}.png`);
      }
    });
  };

  // Snapshot SVG export
  const handleExportSvg = () => {
    const svgStr = exportPointsToSvg(activePoints, 800, 800, '#00f5d4');
    triggerTextDownload(svgStr, `genesis_scope_${presetName.toLowerCase()}_${Date.now()}.svg`, 'image/svg+xml');
  };

  // Snapshot CSV export
  const handleExportCsv = () => {
    const csvStr = exportPointsToCsv(activePoints);
    triggerTextDownload(csvStr, `genesis_scope_${presetName.toLowerCase()}_${Date.now()}.csv`, 'text/csv');
  };

  return (
    <>
      {/* 1. Docking Base Placeholder when scope is detached */}
      {isDetachedEffective && (
        <div
          ref={containerRef}
          className="w-full bg-gradient-to-br from-[#060e1c] via-[#09162e] to-[#060e1c] border-2 border-dashed border-teal-500/50 rounded-2xl p-6 text-center space-y-4 shadow-xl font-mono text-xs text-slate-300 relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border-2 border-teal-400/50 flex items-center justify-center text-teal-300 shadow-lg shrink-0">
              <ExternalLink className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-sm font-black text-teal-300 uppercase tracking-wider">
                  OSCILLOSCOPE DÉTACHÉ DE SON SOCLE
                </span>
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[9px] rounded-full">
                  HUD FLOTTANT ACTIF
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
                L'écran d'oscilloscope flotte librement au-dessus de vos panneaux. Déplacez-le à la souris et parcourez la bibliothèque pour tester ou spammer tous les motifs en direct !
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={toggleDetach}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-teal-500/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
            >
              <Pin className="w-4 h-4" />
              <span>RACCROCHER L'OSCILLOSCOPE AU SOCLE</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. The Oscilloscope (Docked in page, or Detached Floating HUD) */}
      <div
        ref={!isDetachedEffective ? containerRef : undefined}
        style={
          isDetachedEffective
            ? {
                position: 'fixed',
                left: `${floatingPos.x}px`,
                top: `${floatingPos.y}px`,
                width: `${detachedSize}px`,
                zIndex: 99999,
              }
            : undefined
        }
        className={`relative flex flex-col items-center justify-between bg-[#060c18] font-mono transition-all ${
          isDetachedEffective
            ? 'rounded-2xl border-2 border-teal-400/80 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(0,245,212,0.25)] backdrop-blur-xl p-4 select-none'
            : isFullscreen
            ? 'fixed inset-0 z-50 rounded-none bg-[#040810] border border-[#14233c] p-4 md:p-6 shadow-2xl overflow-hidden'
            : 'rounded-3xl border border-[#142646] p-4 md:p-6 shadow-2xl overflow-hidden w-full min-h-[640px] md:min-h-[720px] lg:min-h-[760px]'
        }`}
      >
        {/* Floating Header Bar for Dragging and Quick Resize */}
        {isDetachedEffective && (
          <div
            onPointerDown={handleStartFloatingDrag}
            className="w-full flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-gradient-to-r from-[#0a1830] via-[#0f244a] to-[#0a1830] border border-teal-500/40 cursor-grab active:cursor-grabbing text-[11px]"
          >
            <div className="flex items-center gap-2 text-teal-300 font-black">
              <GripHorizontal className="w-4 h-4 text-teal-400" />
              <span className="uppercase tracking-wider">🛰️ SCOPE FLOTTANT (DÉTACHÉ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-[#060e1c] px-1.5 py-0.5 rounded border border-[#142646]">
                {[
                  { label: 'S', size: 320 },
                  { label: 'M', size: 420 },
                  { label: 'L', size: 560 },
                ].map((s) => (
                  <button
                    key={s.size}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetachedSize(s.size);
                    }}
                    className={`px-1.5 py-0.2 rounded font-black text-[9px] transition-all ${
                      detachedSize === s.size ? 'bg-teal-400 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDetach();
                }}
                title="Raccrocher sur le socle"
                className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[9px] rounded flex items-center gap-1 shadow-sm"
              >
                <Pin className="w-3 h-3" />
                <span>SOCLE</span>
              </button>
            </div>
          </div>
        )}
      {/* Top Overlay Badge & Telemetry */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 bg-[#050b14]/90 backdrop-blur-md px-3 py-1 rounded-lg border border-[#162744] text-[11px] pointer-events-auto">
          <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400'}`} />
          <span className="text-cyan-300 font-bold uppercase tracking-wider">ZONE C — OSCILLOSCOPE X/Y</span>
          <span className="text-slate-500">|</span>
          <span className="text-amber-400 font-semibold">{presetName}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-[10px]">{activePoints.length} PTS</span>
          {isPaused && (
            <span className="px-1.5 py-0.2 bg-amber-950/80 text-amber-300 border border-amber-500/40 rounded text-[9px] font-bold">
              PAUSE ACTIVE (CLIQUEZ SUR LES LIGNES)
            </span>
          )}
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#050b14]/90 backdrop-blur-md p-1 rounded-lg border border-[#162744]">
          {/* Pause / Resume Button */}
          <button
            onClick={onTogglePause}
            id="btn-scope-toggle-pause"
            className={`px-2.5 py-1 rounded font-bold text-xs flex items-center gap-1.5 transition-all border ${
              isPaused
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
            title={isPaused ? 'Reprendre le tracé en direct' : 'Mettre sur pause pour inspecter, colorer ou remplir les vides'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isPaused ? 'REPRENDRE' : 'PAUSE TRACÉ'}</span>
          </button>

          {/* Pause Tools: Line deletion, Nudge & Noise Fill */}
          {isPaused && (
            <>
              <div className="h-4 w-px bg-slate-700 mx-1" />
              <button
                onClick={() => {
                  setPauseToolMode('inspect');
                  setSelectedSegmentIdx(null);
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all border ${
                  pauseToolMode === 'inspect'
                    ? 'bg-rose-500 text-slate-950 border-rose-300 shadow-sm'
                    : 'bg-[#101e36] text-slate-300 border-[#1c3358] hover:text-white'
                }`}
                title="Inspecter et supprimer des segments indésirables"
              >
                <Scissors className="w-3 h-3" />
                <span>INSPECTER LIGNES</span>
              </button>

              <button
                onClick={() => {
                  const next = !settings.noiseFillEnabled;
                  onSettingsChange({ noiseFillEnabled: next });
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all border ${
                  settings.noiseFillEnabled
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 border-cyan-300 shadow-sm'
                    : 'bg-[#101e36] text-slate-400 border-[#1c3358]'
                }`}
                title="Activer ou désactiver le bruit blanc résonnant intérieur rebondissant sur le contour"
              >
                <Radio className="w-3 h-3" />
                <span>BRUIT BLANC {settings.noiseFillEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </>
          )}

          <button
            onClick={toggleDetach}
            className={`p-1.5 rounded transition-all text-xs flex items-center gap-1 font-bold ${
              isDetachedEffective
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                : 'text-teal-300 hover:bg-[#122038] hover:text-white'
            }`}
            title={
              isDetachedEffective
                ? "Raccrocher l'oscilloscope sur son socle"
                : "Détacher l'oscilloscope en fenêtre flottante (PiP) pour tester les motifs"
            }
          >
            {isDetachedEffective ? <Pin className="w-3.5 h-3.5 fill-current" /> : <ExternalLink className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[10px]">
              {isDetachedEffective ? 'RACCROCHER' : 'DÉTACHER'}
            </span>
          </button>
          <button
            onClick={() => setShowControls(!showControls)}
            className={`p-1.5 rounded transition-colors text-xs ${
              showControls ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-[#122038]'
            }`}
            title="Options d'affichage de la trace"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleExportPng}
            className="p-1.5 rounded text-slate-300 hover:bg-[#122038] transition-colors text-xs"
            title="Capturer l'image PNG"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded text-slate-300 hover:bg-[#122038] transition-colors text-xs"
            title={isFullscreen ? 'Quitter Plein Écran' : 'Plein Écran'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Spacious Square CRT Screen */}
      <div className="w-full flex flex-col items-center justify-center gap-3 my-auto py-2">
        <div
          ref={screenContainerRef}
          className="relative w-full max-w-[660px] aspect-square p-3 md:p-5 rounded-3xl bg-[#03060c] border-2 border-[#162a4a] shadow-[inset_0_0_60px_rgba(0,0,0,0.95),0_15px_40px_rgba(0,0,0,0.85)] flex items-center justify-center mx-auto transition-all"
        >
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            onMouseMove={handleCanvasMouseMove}
            onClick={handleCanvasClick}
            className={`rounded-2xl block w-full h-full object-contain transition-all ${
              isPaused ? 'cursor-pointer' : 'cursor-crosshair'
            }`}
          />

          {/* Phosphor CRT Bezel Glow Accent */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none border border-cyan-500/15 shadow-[0_0_30px_rgba(0,245,212,0.06)]" />
        </div>

        {/* USER SPECIFIED: Bruit Blanc Intérieur Rebondissant Ribbon & Frequency Controller */}
        <div className="w-full max-w-[660px] bg-[#050d1c]/95 border border-[#142646] p-3 rounded-2xl shadow-xl flex flex-col gap-2.5 text-xs backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#13243f] pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !settings.noiseFillEnabled;
                  onSettingsChange({ noiseFillEnabled: next });
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all flex items-center gap-1.5 ${
                  settings.noiseFillEnabled
                    ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/20'
                    : 'bg-[#09152a] text-slate-400 border-[#142646]'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>BRUIT BLANC INTÉRIEUR : {settings.noiseFillEnabled ? 'ACTIF' : 'INACTIF'}</span>
              </button>

              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Rebondit strictement à l'intérieur du motif calculé
              </span>
            </div>

            {/* Quick Frequency Presets */}
            <div className="flex items-center gap-1 bg-[#030812] p-1 rounded-xl border border-[#142646]">
              {[
                { label: '250 Hz', hz: 250 },
                { label: '1 kHz', hz: 1000 },
                { label: '4.4 kHz', hz: 4400 },
                { label: '10 kHz', hz: 10000 },
                { label: '18 kHz', hz: 18000 },
              ].map((pst) => (
                <button
                  key={pst.hz}
                  type="button"
                  onClick={() => onSettingsChange({ noiseFrequency: pst.hz })}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-black transition-all ${
                    (settings.noiseFrequency || 4400) === pst.hz
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-[#09162c] text-slate-300 hover:text-white'
                  }`}
                >
                  {pst.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders for Frequency, Density, Bounce Speed & Physics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
            {/* Frequency Slider */}
            <div className="flex flex-col gap-1 bg-[#030812] p-2 rounded-xl border border-[#142646]">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-cyan-400" /> Fréquence :
                </span>
                <span className="text-cyan-300 font-black font-mono">
                  {(settings.noiseFrequency || 4400).toLocaleString()} Hz
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="20000"
                step="50"
                value={settings.noiseFrequency || 4400}
                onChange={(e) => onSettingsChange({ noiseFrequency: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 h-1.5 bg-[#09152a] rounded-lg"
              />
            </div>

            {/* Density & Sparkles */}
            <div className="flex flex-col gap-1 bg-[#030812] p-2 rounded-xl border border-[#142646]">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-teal-400" /> Densité :
                </span>
                <span className="text-teal-300 font-black font-mono">
                  {settings.noiseDensity || 260} pts
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="1000"
                step="20"
                value={settings.noiseDensity || 260}
                onChange={(e) => onSettingsChange({ noiseDensity: parseInt(e.target.value) })}
                className="w-full accent-teal-400 h-1.5 bg-[#09152a] rounded-lg"
              />
            </div>

            {/* Bounce Speed & Rebound Mode */}
            <div className="flex flex-col gap-1 bg-[#030812] p-2 rounded-xl border border-[#142646]">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Vitesse Rebond :
                </span>
                <span className="text-amber-300 font-black font-mono">
                  {(settings.noiseBounceSpeed || 1.2).toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="4.0"
                step="0.1"
                value={settings.noiseBounceSpeed || 1.2}
                onChange={(e) => onSettingsChange({ noiseBounceSpeed: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 h-1.5 bg-[#09152a] rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {customPatternCreatedMsg && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-emerald-950/95 border border-emerald-400 text-emerald-200 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 z-30 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{customPatternCreatedMsg}</span>
        </div>
      )}

      {/* Line Inspection & Deletion Floating Action Bar */}
      {isPaused && selectedSegmentIdx !== null && (
        <div className="absolute bottom-6 left-4 right-4 bg-[#091325]/95 border border-rose-500/60 p-3.5 rounded-2xl shadow-2xl z-30 flex flex-wrap items-center justify-between gap-4 text-xs font-mono backdrop-blur-md">
          <div className="space-y-1">
            <div className="text-rose-400 font-bold flex items-center gap-1.5">
              <Scissors className="w-4 h-4" />
              <span>LIGNE SÉLECTIONNÉE #{selectedSegmentIdx + 1}</span>
            </div>
            <div className="text-[11px] text-slate-300">
              Origine du signal : <span className="text-cyan-300 font-bold">{sourceModuleInfo.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToSource && (
              <button
                onClick={() => onNavigateToSource(sourceModuleInfo.mode)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>ALLER AU MODULE SOURCE</span>
              </button>
            )}

            <button
              onClick={handleDeleteSelectedSegment}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>RETIRER LA LIGNE & CRÉER MOTIF</span>
            </button>

            <button
              onClick={() => setSelectedSegmentIdx(null)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-xs"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Bottom Floating Quick Settings / Controls Panel */}
      {showControls && (
        <div className="absolute bottom-4 left-4 right-4 bg-[#091325]/95 backdrop-blur-md p-3.5 rounded-xl border border-[#1c335a] shadow-2xl z-20 text-xs text-slate-300 space-y-3">
          <div className="flex items-center justify-between border-b border-[#14233c] pb-2">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" /> REGLAGES OPTIQUES DU FAISCEAU CRT
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportSvg}
                className="px-2 py-0.5 bg-[#12223c] hover:bg-[#1b345c] text-[10px] text-cyan-300 rounded border border-cyan-500/30"
              >
                SVG Vectoriel
              </button>
              <button
                onClick={handleExportCsv}
                className="px-2 py-0.5 bg-[#12223c] hover:bg-[#1b345c] text-[10px] text-amber-300 rounded border border-amber-500/30"
              >
                Données CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Mode selection */}
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">MODE TRACÉ</span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {(['phosphor', 'line', 'points', 'accumulation'] as ScopeRenderMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => onSettingsChange({ mode: m })}
                    className={`px-1.5 py-1 rounded font-bold uppercase transition-colors ${
                      settings.mode === m
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-[#101d34] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m === 'phosphor' ? 'Phosphore' : m === 'line' ? 'Ligne' : m === 'points' ? 'Points' : 'Accumul.'}
                  </button>
                ))}
              </div>
            </div>

            {/* Phosphor Theme */}
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">TEINTE PHOSPHORE</span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {[
                  { id: 'cyan_phosphor', label: 'Cyan P31' },
                  { id: 'green_phosphor', label: 'Vert P1' },
                  { id: 'amber_phosphor', label: 'Ambre P3' },
                  { id: 'white_phosphor', label: 'Blanc P4' },
                  { id: 'blue_phosphor', label: 'Bleu P11' },
                  { id: 'gold_phosphor', label: 'Or Lotus' },
                  { id: 'earthy_phosphor', label: 'Terre & Blanc' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSettingsChange({ colorScheme: c.id as any })}
                    className={`px-1.5 py-1 rounded text-[9px] uppercase transition-colors ${
                      settings.colorScheme === c.id
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-[#101d34] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Brightness, Persistence */}
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>LUMINOSITÉ / BLOOM</span>
                  <span>{(settings.brightness * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.05"
                  value={settings.brightness}
                  onChange={(e) => onSettingsChange({ brightness: parseFloat(e.target.value) })}
                  className="w-full h-1 accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>RÉMANENCE PHOSPHORE</span>
                  <span>{(settings.persistence * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.95"
                  step="0.02"
                  value={settings.persistence}
                  onChange={(e) => onSettingsChange({ persistence: parseFloat(e.target.value) })}
                  className="w-full h-1 accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Rotation & Toggles */}
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>ROTATION PHOSPHORE</span>
                  <span>{settings.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={settings.rotation}
                  onChange={(e) => onSettingsChange({ rotation: parseInt(e.target.value, 10) })}
                  className="w-full h-1 accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onSettingsChange({ showGrid: !settings.showGrid })}
                  className={`px-2 py-0.5 rounded text-[10px] border ${
                    settings.showGrid ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500' : 'bg-[#101d34] text-slate-400 border-slate-700'
                  }`}
                >
                  Grille Réticule
                </button>
                <button
                  onClick={() => onSettingsChange({ showAxes: !settings.showAxes })}
                  className={`px-2 py-0.5 rounded text-[10px] border ${
                    settings.showAxes ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500' : 'bg-[#101d34] text-slate-400 border-slate-700'
                  }`}
                >
                  Axes X/Y
                </button>
              </div>
            </div>
          </div>

          {/* Les 4 canaux de remplissage dashboard section */}
          <div className="border-t border-[#1c335a] pt-3 mt-2 space-y-2">
            <span className="text-[10px] text-cyan-300 block font-bold uppercase tracking-wider">
              CONTRÔLE DES CANAUX DE REMPLISSAGE (MAX 4 CANAUX)
            </span>
            {fillChannels.length === 0 ? (
              <div className="text-[10px] text-slate-500 italic bg-[#050b15]/60 p-2 rounded border border-[#101f35]">
                Aucun canal de remplissage actif. Mettez l'oscilloscope en PAUSE, activez l'outil "Remplissage", puis cliquez à l'intérieur d'un motif fermé pour injecter une zone de couleur.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {fillChannels.slice(0, 4).map((chan, idx) => (
                  <div key={chan.id} className="bg-[#050d1a] border border-[#14233c] p-2 rounded-lg flex flex-col gap-1.5 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-300 truncate flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block border border-slate-900 shadow-inner" style={{ backgroundColor: chan.color || '#8b4513' }} />
                        Canal #{idx + 1}
                      </span>
                      <button
                        onClick={() => {
                          const updated = fillChannels.filter((_, cIdx) => cIdx !== idx);
                          setFillChannels(updated);
                          if (onSettingsChange) {
                            onSettingsChange({ fillChannels: updated });
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 text-xs font-bold transition-colors px-1"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-400 mt-1">
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          id={`chan-toggle-${chan.id}`}
                          checked={chan.enabled}
                          onChange={(e) => {
                            const updated = [...fillChannels];
                            updated[idx] = { ...chan, enabled: e.target.checked };
                            setFillChannels(updated);
                            if (onSettingsChange) {
                              onSettingsChange({ fillChannels: updated });
                            }
                          }}
                          className="w-3 h-3 rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor={`chan-toggle-${chan.id}`} className="cursor-pointer select-none">ACTIVER</label>
                      </div>

                      <div className="flex items-center gap-1 justify-end">
                        <input
                          type="color"
                          value={chan.color}
                          onChange={(e) => {
                            const updated = [...fillChannels];
                            updated[idx] = { ...chan, color: e.target.value };
                            setFillChannels(updated);
                            if (onSettingsChange) {
                              onSettingsChange({ fillChannels: updated });
                            }
                          }}
                          className="w-5 h-4 bg-transparent border-0 cursor-pointer outline-none rounded"
                        />
                        <span>TEINTE</span>
                      </div>
                    </div>

                    <div className="space-y-1 mt-1 text-[9px] text-slate-500">
                      <div className="flex justify-between">
                        <span>OPACITÉ</span>
                        <span>{((chan.opacity ?? 0.6) * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={chan.opacity ?? 0.6}
                        onChange={(e) => {
                          const updated = [...fillChannels];
                          updated[idx] = { ...chan, opacity: parseFloat(e.target.value) };
                          setFillChannels(updated);
                          if (onSettingsChange) {
                            onSettingsChange({ fillChannels: updated });
                          }
                        }}
                        className="w-full h-1 accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};
