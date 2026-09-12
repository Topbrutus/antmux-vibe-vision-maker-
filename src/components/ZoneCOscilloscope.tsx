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
  Palette,
  Droplet,
  Move
} from 'lucide-react';
import { ScopeDisplaySettings, ScopeRenderMode, AppMode, PatternFillChannel, TemporalCorrectionSpan } from '../types/vectorScope';
import { exportPointsToSvg, exportPointsToCsv } from '../services/mathEngine';
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
  points,
  settings,
  onSettingsChange,
  presetName,
  isPaused,
  onTogglePause,
  onNavigateToSource,
  onSavedToPatternLibrary,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 600, height: 600 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Line inspection and deletion state
  const [frozenPoints, setFrozenPoints] = useState<Array<[number, number]>>([]);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number | null>(null);
  const [hoveredSegmentIdx, setHoveredSegmentIdx] = useState<number | null>(null);
  const [deletedSegmentIndices, setDeletedSegmentIndices] = useState<Set<number>>(new Set());
  const [customPatternCreatedMsg, setCustomPatternCreatedMsg] = useState<string | null>(null);

  // USER SPECIFIED: Color system per line and void fill channels
  const [segmentColors, setSegmentColors] = useState<Record<number, string>>({});
  const [fillChannels, setFillChannels] = useState<PatternFillChannel[]>([]);
  const [pauseToolMode, setPauseToolMode] = useState<'inspect' | 'fill' | 'nudge'>('inspect');
  const [activeColor, setActiveColor] = useState<string>('#f59e0b');
  const [fillOpacity, setFillOpacity] = useState<number>(0.65);
  const [fillStyle, setFillStyle] = useState<'solid' | 'neon_glow' | 'crt_hatch'>('solid');
  const [showChannelsDrawer, setShowChannelsDrawer] = useState<boolean>(false);
  const channelMasksRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Nudge / Tasser avec la souris state (User request: déplacer généralement pendant pause)
  const [nudgeOffset, setNudgeOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [isDraggingNudge, setIsDraggingNudge] = useState<boolean>(false);
  const [nudgeDragStart, setNudgeDragStart] = useState<{ x: number; y: number } | null>(null);
  const [nudgeSpan, setNudgeSpan] = useState<TemporalCorrectionSpan>('5_sec');

  // Preset palette for fast selection
  const COLOR_PALETTE = [
    { label: 'Cyan P31', hex: '#00f5d4' },
    { label: 'Vert Laser', hex: '#39ff14' },
    { label: 'Ambre CRT', hex: '#ffb703' },
    { label: 'Or Solaire', hex: '#fbbf24' },
    { label: 'Rose Néon', hex: '#f43f5e' },
    { label: 'Magenta', hex: '#ec4899' },
    { label: 'Violet Plasma', hex: '#a855f7' },
    { label: 'Bleu Électrique', hex: '#38bdf8' },
    { label: 'Blanc Pur', hex: '#ffffff' },
    { label: 'Rouge Feu', hex: '#ef4444' },
    { label: 'Émeraude', hex: '#10b981' },
  ];

  // Synchronize frozen points when pause toggled
  useEffect(() => {
    if (isPaused) {
      if (frozenPoints.length === 0 && points.length > 0) {
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
  const activePoints = isPaused && frozenPoints.length > 0 ? frozenPoints : points;

  // Compute segment breakdown for interactive line picking
  const segmentsMeta: SegmentMeta[] = useMemo(() => {
    if (!isPaused || activePoints.length < 2) return [];

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

  // ResizeObserver for responsive high-res canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const size = Math.min(entry.contentRect.width, entry.contentRect.height > 0 ? entry.contentRect.height : 600);
        const effectiveSize = Math.max(300, Math.floor(size));
        setCanvasDimensions({ width: effectiveSize, height: effectiveSize });
      }
    });
    observer.observe(containerRef.current);
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

    // CRT Phosphor Colors
    let beamColorHex = '#00f5d4'; // Cyan P31
    if (settings.colorScheme === 'green_phosphor') beamColorHex = '#39ff14'; // Green P1
    if (settings.colorScheme === 'amber_phosphor') beamColorHex = '#ffb703'; // Amber P3
    if (settings.colorScheme === 'white_phosphor') beamColorHex = '#f8fafc'; // White P4
    if (settings.colorScheme === 'blue_phosphor') beamColorHex = '#38bdf8'; // Blue P11
    if (settings.colorScheme === 'gold_phosphor') beamColorHex = '#fbbf24'; // Gold Lotus

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
    // USER SPECIFIED: Draw Active Fill Channels (Void Fills with multiple channels)
    // ------------------------------------------------------------------------
    if (fillChannels.length > 0) {
      fillChannels.forEach((chan) => {
        if (!chan.enabled) return;
        const maskCanvas = channelMasksRef.current.get(chan.id);
        if (!maskCanvas) return;

        ctx.save();
        ctx.globalAlpha = chan.opacity;

        if (chan.style === 'neon_glow') {
          ctx.shadowColor = chan.color;
          ctx.shadowBlur = 18 * settings.brightness;
        } else {
          ctx.shadowBlur = 0;
        }

        // Tint the offscreen mask with the channel's chosen color
        const tempC = document.createElement('canvas');
        tempC.width = w;
        tempC.height = h;
        const tCtx = tempC.getContext('2d');
        if (tCtx) {
          tCtx.drawImage(maskCanvas, 0, 0);
          tCtx.globalCompositeOperation = 'source-in';
          tCtx.fillStyle = chan.color;
          tCtx.fillRect(0, 0, w, h);

          if (chan.style === 'crt_hatch') {
            // Horizontal CRT raster scanlines
            tCtx.globalCompositeOperation = 'destination-out';
            tCtx.fillStyle = '#000000';
            for (let scanY = 0; scanY < h; scanY += 4) {
              tCtx.fillRect(0, scanY, w, 2);
            }
          }

          ctx.drawImage(tempC, 0, 0);
        }
        ctx.restore();
      });
    }

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Bloom & glow setup
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

    // If Paused: Draw segments allowing individual highlight, custom line colors, and omission of deleted lines
    if (isPaused && segmentsMeta.length > 0) {
      segmentsMeta.forEach((seg) => {
        if (deletedSegmentIndices.has(seg.index)) return; // Skipped / deleted!

        const isSelected = selectedSegmentIdx === seg.index;
        const isHovered = hoveredSegmentIdx === seg.index;
        const customColor = segmentColors[seg.index];

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
        } else if (customColor) {
          // USER SPECIFIED: Individual assigned segment color
          ctx.strokeStyle = customColor;
          ctx.lineWidth = settings.thickness * 1.2;
          ctx.shadowColor = customColor;
          ctx.shadowBlur = 8 * settings.brightness;
        } else if (seg.isReturnLine) {
          ctx.strokeStyle = '#f97316'; // Orange warning highlight for return lines
          ctx.lineWidth = settings.thickness * 1.2;
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
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center bg-[#070e1c] rounded-2xl border border-[#14233c] p-3 shadow-2xl overflow-hidden font-mono ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none bg-[#050b14]' : 'h-full min-h-[480px]'
      }`}
    >
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

          {/* USER SPECIFIED: Pause Tools: Lignes & Couleurs vs Remplir Vides */}
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
                title="Inspecter et colorer des lignes ou supprimer des segments"
              >
                <Scissors className="w-3 h-3" />
                <span>LIGNES & COULEURS</span>
              </button>

              <button
                onClick={() => {
                  setPauseToolMode('fill');
                  setSelectedSegmentIdx(null);
                }}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all border ${
                  pauseToolMode === 'fill'
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-[#101e36] text-slate-300 border-[#1c3358] hover:text-white'
                }`}
                title="Cliquer dans un vide pour le remplir de couleur et ajouter un canal"
              >
                <Droplet className="w-3 h-3" />
                <span>REMPLIR VIDES & CANAUX</span>
              </button>

              <button
                onClick={() => setShowChannelsDrawer(!showChannelsDrawer)}
                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all border ${
                  showChannelsDrawer || fillChannels.length > 0
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                    : 'bg-[#101e36] text-slate-400 border-[#1c3358]'
                }`}
                title="Gérer les canaux de couleur et de remplissage"
              >
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>CANAUX ({fillChannels.length})</span>
              </button>
            </>
          )}

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

      {/* Main Square CRT Screen with Lab Bezel */}
      <div className="relative p-2 rounded-2xl bg-[#040810] border-2 border-[#162a4a] shadow-[inset_0_0_40px_rgba(0,0,0,0.9)] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          onMouseMove={handleCanvasMouseMove}
          onClick={handleCanvasClick}
          className={`rounded-xl block transition-all ${
            isPaused
              ? pauseToolMode === 'fill'
                ? 'cursor-crosshair'
                : 'cursor-pointer'
              : 'cursor-crosshair'
          }`}
        />

        {/* Phosphor CRT Bezel Glow Accent */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none border border-cyan-500/10 shadow-[0_0_20px_rgba(0,245,212,0.05)]" />
      </div>

      {/* USER SPECIFIED: Void Fill Sub-Bar when paused in 'fill' mode */}
      {isPaused && pauseToolMode === 'fill' && (
        <div className="absolute top-14 left-4 right-4 bg-[#071124]/95 border border-amber-500/50 p-2.5 rounded-xl shadow-2xl z-20 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-black text-amber-300 text-xs">OUTIL REMPLISSAGE DU VIDE :</span>
            <span className="text-[11px] text-slate-300">
              Cliquez dans un espace vide fermé entre les lignes du motif pour le colorer et créer automatiquement un nouveau canal.
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Color circles */}
            <div className="flex items-center gap-1 bg-[#040810] px-2 py-1 rounded-lg border border-[#162744]">
              {COLOR_PALETTE.slice(0, 8).map((col) => (
                <button
                  key={col.hex}
                  onClick={() => setActiveColor(col.hex)}
                  style={{ backgroundColor: col.hex }}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    activeColor === col.hex ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={col.label}
                />
              ))}
              <input
                type="color"
                value={activeColor}
                onChange={(e) => setActiveColor(e.target.value)}
                className="w-5 h-5 bg-transparent border-0 cursor-pointer ml-1"
                title="Couleur personnalisée"
              />
            </div>

            {/* Fill Style */}
            <div className="flex items-center gap-1 bg-[#040810] p-1 rounded-lg border border-[#162744]">
              {(['solid', 'crt_hatch', 'neon_glow'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFillStyle(st)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                    fillStyle === st ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'solid' ? 'Plein' : st === 'crt_hatch' ? 'Trame CRT' : 'Halo Néon'}
                </button>
              ))}
            </div>

            {/* Opacity */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span>OPACITÉ :</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={fillOpacity}
                onChange={(e) => setFillOpacity(parseFloat(e.target.value))}
                className="w-16 accent-amber-400"
              />
              <span className="text-amber-300 font-bold w-7">{(fillOpacity * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {customPatternCreatedMsg && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-emerald-950/95 border border-emerald-400 text-emerald-200 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 z-30 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{customPatternCreatedMsg}</span>
        </div>
      )}

      {/* USER SPECIFIED: Line Inspection & Coloration Floating Action Bar */}
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

          {/* Color Palette for this line */}
          <div className="flex items-center gap-2 bg-[#040810] px-3 py-1.5 rounded-xl border border-rose-500/40">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-rose-400" /> COULEUR LIGNE :
            </span>
            <div className="flex items-center gap-1">
              {COLOR_PALETTE.map((col) => (
                <button
                  key={col.hex}
                  onClick={() => handleApplyColorToSegment(col.hex)}
                  style={{ backgroundColor: col.hex }}
                  className="w-4 h-4 rounded-full transition-transform hover:scale-125 border border-slate-900 shadow-sm"
                  title={col.label}
                />
              ))}
              <input
                type="color"
                value={activeColor}
                onChange={(e) => handleApplyColorToSegment(e.target.value)}
                className="w-5 h-5 bg-transparent border-0 cursor-pointer ml-1"
                title="Couleur personnalisée"
              />
            </div>
            <button
              onClick={() => handleApplyColorToAll(activeColor)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 font-bold border border-slate-600"
            >
              À tout le motif
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* USER SPECIFIED: "en cliquant dessus, ça nous amène à l'endroit dont l'ozoué est généré" */}
            {onNavigateToSource && (
              <button
                onClick={() => onNavigateToSource(sourceModuleInfo.mode)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>ALLER AU MODULE SOURCE</span>
              </button>
            )}

            {/* USER SPECIFIED: "si j'ai une ligne supplémentaire que je ne veux pas, et bien je suis capable de l'enlever. Et si je l'enlève, ça va me donner un fichier supplémentaire comme quoi j'ai un motif en préparation" */}
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

      {/* USER SPECIFIED: Channels Drawer for managing multiple fill and color channels */}
      {showChannelsDrawer && (
        <div className="absolute top-14 right-4 w-96 bg-[#070e1c]/98 border-2 border-cyan-500/60 rounded-2xl shadow-2xl p-4 z-30 space-y-3 backdrop-blur-xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[#14233c] pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="font-black text-xs text-cyan-300 tracking-wider uppercase">
                CANAUX DE REMPLISSAGE ({fillChannels.length})
              </span>
            </div>
            <button
              onClick={() => setShowChannelsDrawer(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-[#101b2f]"
            >
              ✕
            </button>
          </div>

          <p className="text-[10px] text-slate-400">
            Chaque vide rempli génère automatiquement un canal indépendant avec son style et sa couleur.
          </p>

          {fillChannels.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#040810] border border-dashed border-[#1c3050] text-center text-slate-500 text-[11px]">
              Aucun canal de remplissage actif. Cliquez sur "REMPLIR VIDES & CANAUX" puis touchez un espace vide du motif.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {fillChannels.map((chan, idx) => (
                <div
                  key={chan.id}
                  className="bg-[#0b162a] border border-[#1c3358] rounded-xl p-2.5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={chan.enabled}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setFillChannels((prev) =>
                            prev.map((c) => (c.id === chan.id ? { ...c, enabled: val } : c))
                          );
                        }}
                        className="accent-cyan-400 cursor-pointer"
                      />
                      <span className="font-bold text-slate-200">{chan.name}</span>
                    </div>

                    <button
                      onClick={() => {
                        channelMasksRef.current.delete(chan.id);
                        setFillChannels((prev) => prev.filter((c) => c.id !== chan.id));
                      }}
                      className="p-1 rounded text-rose-400 hover:bg-rose-950/50 hover:text-rose-300"
                      title="Supprimer ce canal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#14233c]/60">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={chan.color}
                        onChange={(e) => {
                          const col = e.target.value;
                          setFillChannels((prev) =>
                            prev.map((c) => (c.id === chan.id ? { ...c, color: col } : c))
                          );
                        }}
                        className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded"
                      />
                      <select
                        value={chan.style}
                        onChange={(e) => {
                          const st = e.target.value as PatternFillChannel['style'];
                          setFillChannels((prev) =>
                            prev.map((c) => (c.id === chan.id ? { ...c, style: st } : c))
                          );
                        }}
                        className="bg-[#050b16] border border-[#1c3050] text-[10px] text-amber-300 rounded px-1.5 py-0.5"
                      >
                        <option value="solid">Plein</option>
                        <option value="crt_hatch">Trame CRT</option>
                        <option value="neon_glow">Halo Néon</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span>{(chan.opacity * 100).toFixed(0)}%</span>
                      <input
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.05"
                        value={chan.opacity}
                        onChange={(e) => {
                          const op = parseFloat(e.target.value);
                          setFillChannels((prev) =>
                            prev.map((c) => (c.id === chan.id ? { ...c, opacity: op } : c))
                          );
                        }}
                        className="w-14 accent-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Drawer Actions */}
          <div className="pt-2 border-t border-[#14233c] space-y-2">
            <button
              onClick={handleSaveColoredPattern}
              className="w-full py-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500 hover:opacity-95 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>SAUVEGARDER LE MOTIF MULTICOLORE</span>
            </button>

            {fillChannels.length > 0 && (
              <button
                onClick={() => {
                  channelMasksRef.current.clear();
                  setFillChannels([]);
                }}
                className="w-full py-1 text-slate-400 hover:text-rose-400 text-[10px] font-bold text-center"
              >
                Vider tous les canaux de remplissage
              </button>
            )}
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
        </div>
      )}
    </div>
  );
};
