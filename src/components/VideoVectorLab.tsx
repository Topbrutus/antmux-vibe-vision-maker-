import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Film,
  Video,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Sliders,
  Activity,
  Download,
  Upload,
  CheckCircle2,
  Layers,
  Zap,
  RefreshCw,
  Disc,
  StopCircle,
  Eye,
  Radio,
  FileAudio,
  FileVideo,
  Music,
  Maximize2,
  FastForward,
  Rewind,
  Save,
  Image as ImageIcon
} from 'lucide-react';
import {
  VectorizerConfig,
  DEFAULT_VECTORIZER_CONFIG,
  vectorizeImageData,
  generatePresetVectorImage
} from '../services/imageVectorizer';
import {
  VideoBeamExtractorOptions,
  DEFAULT_BEAM_EXTRACTOR_OPTIONS,
  extractPhosphorBeamFromFrame,
  generateJerobeamMushroomVideoBlob,
  synthesizeStereoSamples
} from '../services/videoAudioVectorizer';
import { VectorAudioEngine } from '../services/audioEngine';
import { exportPointsToSvg, exportPointsToCsv } from '../services/mathEngine';
import { encodeStereoWav, triggerBlobDownload, triggerTextDownload } from '../services/exportUtils';
import { PatternItem } from '../types/vectorScope';
import { savePattern } from '../services/patternStorage';

interface VideoVectorLabProps {
  audioEngine?: VectorAudioEngine | null;
  onSendToOscilloscope: (points: Array<[number, number]>, name: string) => void;
  isActiveInScope: boolean;
  onSavePattern?: (pattern: PatternItem) => void;
}

export const VideoVectorLab: React.FC<VideoVectorLabProps> = ({
  audioEngine,
  onSendToOscilloscope,
  isActiveInScope,
  onSavePattern,
}) => {
  // Main Lab Submode: Video (Default) or Static Image
  const [labMode, setLabMode] = useState<'video' | 'image'>('video');

  // ==========================================
  // --- VIDEO LAB STATE ---
  // ==========================================
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('jerobeam_mushroom_demo.webm');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(true);

  // Video Beam Extractor Settings
  const [beamConfig, setBeamConfig] = useState<VideoBeamExtractorOptions>(DEFAULT_BEAM_EXTRACTOR_OPTIONS);
  const [visualStereoMix, setVisualStereoMix] = useState(0.85); // 0 = original audio, 1 = pure optical beam
  const [audioModulation, setAudioModulation] = useState(0.45); // sound modulates visual beam amplitude
  const [scanFreqHz, setScanFreqHz] = useState(60); // beam sweep frequency
  const [phosphorColor, setPhosphorColor] = useState<'#00ff66' | '#00f5d4' | '#ffbe0b' | '#ffffff'>('#00ff66');

  // Video Audio Track buffer
  const [videoAudioBuffer, setVideoAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isDecodingAudio, setIsDecodingAudio] = useState(false);
  const [audioCorrelation, setAudioCorrelation] = useState<number>(0.98); // ~1.0 = mono, <0.8 = stereo
  const [audioRmsLevel, setAudioRmsLevel] = useState<number>(0);

  // Video Vector Trajectory state
  const [currentFramePoints, setCurrentFramePoints] = useState<Array<[number, number]>>([]);
  const [opticalFps, setOpticalFps] = useState(60);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);

  // Video and Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisBufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live Optical Processing Animation Loop Ref
  const animFrameIdRef = useRef<number | null>(null);
  const lastFpsTimeRef = useRef<number>(performance.now());
  const fpsFrameCountRef = useRef<number>(0);

  // Local Recording State ("l'enregistrementatif")
  const [isRecordingWav, setIsRecordingWav] = useState(false);
  const [recordedLeftChunks, setRecordedLeftChunks] = useState<Float32Array[]>([]);
  const [recordedRightChunks, setRecordedRightChunks] = useState<Float32Array[]>([]);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  // ==========================================
  // --- IMAGE LAB STATE (Static Mode) ---
  // ==========================================
  const [imgConfig, setImgConfig] = useState<VectorizerConfig>(DEFAULT_VECTORIZER_CONFIG);
  const [activeImagePreset, setActiveImagePreset] = useState<string>('lotus');
  const [imageName, setImageName] = useState<string>('Fleur de Lotus Sacrée');
  const [imageVectorPoints, setImageVectorPoints] = useState<Array<[number, number]>>([]);
  const [isImgProcessing, setIsImgProcessing] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const imgSourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize buffer canvas once
  useEffect(() => {
    if (!analysisBufferCanvasRef.current) {
      analysisBufferCanvasRef.current = document.createElement('canvas');
    }
  }, []);

  // Generate and load the default Jerobeam Mushroom demo video on mount
  useEffect(() => {
    let isCancelled = false;

    const loadDemo = async () => {
      setIsGeneratingDemo(true);
      try {
        const demoBlob = await generateJerobeamMushroomVideoBlob(6);
        if (!isCancelled) {
          const url = URL.createObjectURL(demoBlob);
          setVideoSrc(url);
          setVideoFileName('demo_jerobeam_oscilloscope_mushroom.webm');

          // Decode audio track from demo blob
          decodeAudioFromBlob(demoBlob);
        }
      } catch (err) {
        console.warn('Failed to generate demo video:', err);
      } finally {
        if (!isCancelled) setIsGeneratingDemo(false);
      }
    };

    loadDemo();

    return () => {
      isCancelled = true;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  // Decode audio from video file / blob using Web Audio API
  const decodeAudioFromBlob = async (blob: Blob) => {
    setIsDecodingAudio(true);
    try {
      const arrayBuf = await blob.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const tempCtx = new AudioCtx();
      const decoded = await tempCtx.decodeAudioData(arrayBuf);
      setVideoAudioBuffer(decoded);

      // Check mono / stereo correlation
      if (decoded.numberOfChannels === 1) {
        setAudioCorrelation(1.0); // True Mono
      } else {
        const left = decoded.getChannelData(0);
        const right = decoded.getChannelData(1);
        let dot = 0;
        let sumL = 0;
        let sumR = 0;
        const testLen = Math.min(left.length, 48000);
        for (let i = 0; i < testLen; i++) {
          dot += left[i] * right[i];
          sumL += left[i] * left[i];
          sumR += right[i] * right[i];
        }
        const denom = Math.sqrt(sumL * sumR);
        const corr = denom > 0 ? dot / denom : 1.0;
        setAudioCorrelation(Math.max(-1, Math.min(1, corr)));
      }
      tempCtx.close().catch(() => {});
    } catch (e) {
      console.warn('Could not decode audio track directly from video:', e);
      setVideoAudioBuffer(null);
    } finally {
      setIsDecodingAudio(false);
    }
  };

  // Video Import Handler
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadVideoFile(file);
  };

  const loadVideoFile = (file: File) => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoFileName(file.name);
    setIsVideoPlaying(false);
    setCurrentTime(0);

    // Decode audio track in background
    decodeAudioFromBlob(file);
  };

  // Drop zone handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      loadVideoFile(file);
    }
  };

  // Video Play / Pause toggle
  const togglePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (audioEngine) {
      await audioEngine.resumeContext();
    }

    if (video.paused) {
      video.play().then(() => {
        setIsVideoPlaying(true);
      }).catch((e) => console.warn('Play interrupted:', e));
    } else {
      video.pause();
      setIsVideoPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleStepFrame = (deltaFrames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsVideoPlaying(false);
    const frameDuration = 1 / 30;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + deltaFrames * frameDuration));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Continuous Frame Analysis & Oscilloscope Synthesis Loop
  useEffect(() => {
    let active = true;

    const processLoop = () => {
      if (!active) return;

      const video = videoRef.current;
      const bufferCanvas = analysisBufferCanvasRef.current;
      const overlayCanvas = videoOverlayCanvasRef.current;
      const scopeCanvas = scopeCanvasRef.current;

      if (video && bufferCanvas && !video.paused && !video.ended && video.readyState >= 2) {
        // 1. Extract optical vector trajectory from current video frame
        const result = extractPhosphorBeamFromFrame(video, bufferCanvas, beamConfig);
        const points = result.opticalPoints;

        if (points.length > 2) {
          setCurrentFramePoints(points);

          // Stream optical trajectory + video audio into AudioEngine if active in scope
          if (audioEngine && isActiveInScope) {
            audioEngine.setVideoStereoState({
              points,
              audioBuffer: videoAudioBuffer,
              playbackTime: video.currentTime,
              playbackRate: video.playbackRate,
              visualMix: visualStereoMix,
              audioModulation: audioModulation,
              scanFreqHz: scanFreqHz,
            });
          }

          // 2. Draw live optical overlay on top of the video player
          if (overlayCanvas) {
            overlayCanvas.width = video.videoWidth || 360;
            overlayCanvas.height = video.videoHeight || 360;
            const oCtx = overlayCanvas.getContext('2d');
            if (oCtx) {
              oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
              const w = overlayCanvas.width;
              const h = overlayCanvas.height;

              // Draw detected beam lines
              oCtx.strokeStyle = phosphorColor;
              oCtx.lineWidth = 2.0;
              oCtx.shadowColor = phosphorColor;
              oCtx.shadowBlur = 10;
              oCtx.beginPath();

              for (let i = 0; i < points.length; i++) {
                const px = ((points[i][0] / beamConfig.scale + 1) / 2) * w;
                const py = ((-points[i][1] / beamConfig.scale + 1) / 2) * h;
                if (i === 0) oCtx.moveTo(px, py);
                else oCtx.lineTo(px, py);
              }
              oCtx.stroke();

              // Draw centroid lock marker
              const cx = ((result.centroid[0] / beamConfig.scale + 1) / 2) * w;
              const cy = ((-result.centroid[1] / beamConfig.scale + 1) / 2) * h;
              oCtx.fillStyle = '#ffffff';
              oCtx.beginPath();
              oCtx.arc(cx, cy, 3, 0, Math.PI * 2);
              oCtx.fill();
            }
          }

          // 3. Render Re-Synthesized Stereo Oscilloscope Screen
          if (scopeCanvas) {
            renderScopeScreen(scopeCanvas, points, video.currentTime);
          }

          // Record chunk if recording active
          if (isRecordingWav) {
            const sampleRate = 48000;
            const chunkSamples = 1024;
            const dummyL = new Float32Array(chunkSamples);
            const dummyR = new Float32Array(chunkSamples);
            // Read from audio buffer if present
            if (videoAudioBuffer) {
              const cL = videoAudioBuffer.getChannelData(0);
              const startIdx = Math.floor(video.currentTime * videoAudioBuffer.sampleRate) % cL.length;
              for (let s = 0; s < chunkSamples; s++) {
                dummyL[s] = cL[(startIdx + s) % cL.length] || 0;
              }
            }
            const { outL, outR } = synthesizeStereoSamples(dummyL, dummyR, points, {
              visualMix: visualStereoMix,
              audioModulation: audioModulation,
              scanFreqHz: scanFreqHz,
              sampleRate: 48000,
              timeOffset: video.currentTime,
              quadratureAssist: true,
            });
            setRecordedLeftChunks((prev) => [...prev, outL]);
            setRecordedRightChunks((prev) => [...prev, outR]);
          }
        }

        // FPS telemetry
        fpsFrameCountRef.current++;
        const now = performance.now();
        if (now - lastFpsTimeRef.current >= 1000) {
          setOpticalFps(fpsFrameCountRef.current);
          fpsFrameCountRef.current = 0;
          lastFpsTimeRef.current = now;
        }

        setCurrentTime(video.currentTime);
      } else if (video && (video.paused || video.ended) && scopeCanvas && currentFramePoints.length > 2) {
        // Redraw static frame when paused
        renderScopeScreen(scopeCanvas, currentFramePoints, video.currentTime);
      }

      animFrameIdRef.current = requestAnimationFrame(processLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(processLoop);

    return () => {
      active = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [beamConfig, visualStereoMix, audioModulation, scanFreqHz, phosphorColor, videoAudioBuffer, isRecordingWav, audioEngine, isActiveInScope, currentFramePoints]);

  // Render Oscilloscope Screen (Right Panel)
  const renderScopeScreen = (canvas: HTMLCanvasElement, points: Array<[number, number]>, t: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark CRT background with slight phosphor persistence decay
    ctx.fillStyle = 'rgba(2, 6, 16, 0.28)';
    ctx.fillRect(0, 0, w, h);

    // CRT grid reticle
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 32) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += 32) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Center crosshairs
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.18)';
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer glow pass
    ctx.strokeStyle = phosphorColor === '#00ff66' ? 'rgba(0, 255, 102, 0.28)' : 'rgba(0, 245, 212, 0.28)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const [nx, ny] = points[i];
      const px = ((nx + 1) / 2) * w;
      const py = ((-ny + 1) / 2) * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Sharp core pass
    ctx.strokeStyle = phosphorColor;
    ctx.lineWidth = 2.0;
    ctx.shadowColor = phosphorColor;
    ctx.shadowBlur = 12;
    ctx.stroke();

    // White electron beam focal center
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.9;
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.restore();
  };

  // Broadcast current video trajectory to Master Oscilloscope
  const handleBroadcastToMasterScope = () => {
    if (currentFramePoints.length > 2) {
      onSendToOscilloscope(currentFramePoints, `Vidéo : ${videoFileName}`);
      if (audioEngine) {
        audioEngine.setVideoStereoState({
          points: currentFramePoints,
          audioBuffer: videoAudioBuffer,
          playbackTime: videoRef.current?.currentTime || 0,
          visualMix: visualStereoMix,
          audioModulation: audioModulation,
          scanFreqHz: scanFreqHz,
        });
      }
    }
  };

  // Save current video frame as a Pattern in the Pattern Library
  const handleSaveCurrentFrameToLibrary = () => {
    if (currentFramePoints.length < 3) return;
    const newPattern: PatternItem = {
      id: `video_frame_${Date.now()}`,
      name: `Tracé Vidéo (${videoFileName.replace(/\.[^/.]+$/, '')} @ ${(currentTime).toFixed(1)}s)`,
      description: 'Capture de faisceau vidéo vectoriel',
      createdAt: new Date().toISOString(),
      sourceModule: 'video_lab',
      points: currentFramePoints,
      color: phosphorColor,
      fillChannels: [
        {
          id: 'chan_video_1',
          name: 'Faisceau Phosphore',
          color: phosphorColor,
          opacity: 0.85,
          style: 'neon_glow',
          seedX: 0,
          seedY: 0,
          enabled: true,
        }
      ],
      segmentColors: {
        0: phosphorColor,
        1: '#00f5d4',
      },
    };
    savePattern(newPattern);
    if (onSavePattern) onSavePattern(newPattern);
    alert(`Tracé vidéo sauvegardé dans la Bibliothèque de Motifs avec succès !`);
  };

  // Recording WAV Controls ("l'enregistrementatif")
  const startRecordingWav = () => {
    setRecordedLeftChunks([]);
    setRecordedRightChunks([]);
    setIsRecordingWav(true);
  };

  const stopRecordingWav = () => {
    setIsRecordingWav(false);

    // Concatenate chunks
    const totalSamples = recordedLeftChunks.reduce((acc, c) => acc + c.length, 0);
    if (totalSamples === 0) return;

    const fullL = new Float32Array(totalSamples);
    const fullR = new Float32Array(totalSamples);

    let offset = 0;
    for (let i = 0; i < recordedLeftChunks.length; i++) {
      fullL.set(recordedLeftChunks[i], offset);
      fullR.set(recordedRightChunks[i], offset);
      offset += recordedLeftChunks[i].length;
    }

    const { blob } = encodeStereoWav(fullL, fullR, 48000, 48000, 24, true);
    triggerBlobDownload(blob, `GENESIS_VIDEO_STEREO_XY_${Date.now()}.wav`);
  };

  // Recording Video WebM/MP4 Controls
  const startRecordingVideoResult = () => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;

    videoChunksRef.current = [];
    const stream = canvas.captureStream(30);

    // Attach audio track from engine destination if available
    if (audioEngine) {
      const dest = audioEngine.getMediaStreamDestination();
      if (dest && dest.stream.getAudioTracks().length > 0) {
        stream.addTrack(dest.stream.getAudioTracks()[0]);
      }
    }

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';

    try {
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3000000 });
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const vBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        triggerBlobDownload(vBlob, `GENESIS_OSCILLOSCOPE_VIDEO_CAPTURE_${Date.now()}.webm`);
        setIsRecordingVideo(false);
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setIsRecordingVideo(true);
    } catch (e) {
      console.warn('Video recording error:', e);
    }
  };

  const stopRecordingVideoResult = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // ==========================================
  // --- STATIC IMAGE LAB LOGIC ---
  // ==========================================
  useEffect(() => {
    if (labMode === 'image' && activeImagePreset !== 'custom') {
      const pts = generatePresetVectorImage(activeImagePreset as any);
      setImageVectorPoints(pts);
      setImageName(
        activeImagePreset === 'lotus'
          ? 'Fleur de Lotus Sacrée'
          : activeImagePreset === 'atom'
          ? 'Modèle Atomique'
          : activeImagePreset === 'sacred_cube'
          ? 'Cube de Métatron'
          : activeImagePreset === 'star_octagram'
          ? 'Étoile Octagramme'
          : 'Yin Yang'
      );
    }
  }, [activeImagePreset, labMode]);

  // Render static image preview canvas
  useEffect(() => {
    if (labMode !== 'image') return;
    const canvas = imgPreviewCanvasRef.current;
    if (!canvas || imageVectorPoints.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#020610';
    ctx.fillRect(0, 0, w, h);

    // Reticle
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 32) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += 32) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Draw vector path
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 10;
    ctx.beginPath();

    for (let i = 0; i < imageVectorPoints.length; i++) {
      const [nx, ny] = imageVectorPoints[i];
      const px = ((nx + 1) / 2) * w;
      const py = ((-ny + 1) / 2) * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.shadowBlur = 0;
    ctx.stroke();
  }, [imageVectorPoints, labMode]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Toggle */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 shadow-inner">
              {labMode === 'video' ? <Film className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-wide text-white uppercase">
                  {labMode === 'video'
                    ? 'LABORATOIRE VIDÉO & CONVERSION STÉRÉO LISSAJOUS'
                    : 'LABORATOIRE IMAGE STATIQUE & VECTORISATION SOBEL'}
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  {labMode === 'video' ? 'DOUBLE ANALYSE AUDIO + VISUELLE' : 'ANALYSE SOBEL / RDP'}
                </span>
                {isActiveInScope && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 animate-pulse flex items-center gap-1">
                    <Activity className="w-3 h-3" /> ACTIF DANS L'OSCILLOSCOPE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {labMode === 'video'
                  ? 'Importez une vidéo (ex. dessin de champignon sur oscilloscope), analysez simultanément le son et le tracé visuel, et re-synthétisez un signal stéréo X/Y haute fidélité.'
                  : 'Convertissez n\'importe quelle photo ou schéma en signal vectoriel audio (détection de contours Sobel + simplification RDP).'}
              </p>
            </div>
          </div>

          {/* Submode Switcher Tabs */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1.5 self-start lg:self-auto">
            <button
              onClick={() => setLabMode('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                labMode === 'video'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Video className="w-4 h-4" />
              VIDÉO EN TEMPS RÉEL (DOUBLE ANALYSE)
            </button>
            <button
              onClick={() => setLabMode('image')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                labMode === 'image'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              IMAGE STATIQUE (SOBEL / RDP)
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* --- VIDEO LAB VIEW --- */}
      {/* ========================================================================= */}
      {labMode === 'video' && (
        <div className="space-y-6">
          {/* Action Ribbon: File Upload, Jerobeam Demo, & Master Broadcast */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-emerald-500/20"
              >
                <Upload className="w-4 h-4" />
                IMPORTER UNE VIDÉO (MP4 / WebM / MOV)
              </button>

              <button
                onClick={async () => {
                  setIsGeneratingDemo(true);
                  try {
                    const demoBlob = await generateJerobeamMushroomVideoBlob(6);
                    const url = URL.createObjectURL(demoBlob);
                    setVideoSrc(url);
                    setVideoFileName('jerobeam_mushroom_oscilloscope.webm');
                    decodeAudioFromBlob(demoBlob);
                  } catch (e) {
                    console.warn(e);
                  } finally {
                    setIsGeneratingDemo(false);
                  }
                }}
                disabled={isGeneratingDemo}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                {isGeneratingDemo ? 'GÉNÉRATION DÉMO...' : 'DÉMO JEROBEAM (CHAMPIGNON OSCILLO)'}
              </button>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleBroadcastToMasterScope}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
                  isActiveInScope
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                <Zap className="w-4 h-4" />
                DIFFUSER DANS L'OSCILLOSCOPE PRINCIPAL
              </button>
            </div>
          </div>

          {/* DUAL REAL-TIME VISUALIZERS: VIDEO TRACKING & STEREO OSCILLOSCOPE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Screen 1: Real-time Video Player with Optical Tracking Overlay */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200 tracking-wider uppercase">
                    1. ANALYSE VISUELLE & TRACKING OPTIQUE DU FAISCEAU
                  </span>
                </div>
                <div className="flex items-center gap-2 text-2xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  <span>{currentFramePoints.length} PTS TRACKÉS</span>
                  <span>•</span>
                  <span>{opticalFps} FPS</span>
                </div>
              </div>

              {/* Video with Overlay Container */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative aspect-square w-full bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner group"
              >
                {videoSrc ? (
                  <>
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      loop={isLooping}
                      playsInline
                      muted={isMuted}
                      onLoadedMetadata={() => {
                        if (videoRef.current) {
                          setDuration(videoRef.current.duration || 0);
                        }
                      }}
                      onEnded={() => setIsVideoPlaying(false)}
                      className="w-full h-full object-contain"
                    />
                    {/* Live Vector Tracking Overlay */}
                    <canvas
                      ref={videoOverlayCanvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none object-contain"
                    />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
                    <Video className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
                    <p className="text-sm font-medium text-slate-300">Glissez une vidéo ici ou cliquez sur Importer</p>
                    <p className="text-xs text-slate-500 mt-1">Accepte MP4, WebM, MOV avec ou sans piste audio</p>
                  </div>
                )}
              </div>

              {/* Video Player Timeline & Controls */}
              <div className="mt-3 space-y-2.5 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                {/* Scrubber Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-2xs font-mono text-slate-400 w-12 text-right">
                    {(currentTime).toFixed(1)}s
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 1}
                    step="0.01"
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="text-2xs font-mono text-slate-400 w-12">
                    {(duration).toFixed(1)}s
                  </span>
                </div>

                {/* Playback Button Bar */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={togglePlayPause}
                      className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md"
                      title={isVideoPlaying ? 'Pause' : 'Lecture'}
                    >
                      {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => handleStepFrame(-1)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                      title="Frame précédente (-1)"
                    >
                      <Rewind className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleStepFrame(1)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                      title="Frame suivante (+1)"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                          setCurrentTime(0);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                      title="Recommencer au début"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setIsLooping(!isLooping)}
                      className={`px-2 py-1 rounded text-2xs font-bold transition-all ${
                        isLooping
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                      title="Activer/Désactiver la boucle"
                    >
                      BOUCLE
                    </button>
                  </div>

                  {/* Speed & Volume */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-2xs text-slate-400">VITESSE:</span>
                      {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            setPlaybackRate(rate);
                            if (videoRef.current) videoRef.current.playbackRate = rate;
                          }}
                          className={`px-1.5 py-0.5 rounded text-2xs font-mono font-bold ${
                            playbackRate === rate
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setIsMuted(!isMuted);
                        if (videoRef.current) videoRef.current.muted = !isMuted;
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                      title={isMuted ? 'Rétablir le son' : 'Couper le son'}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen 2: Real-time Synthesized Stereo Oscilloscope (Canal G = X, Canal D = Y) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200 tracking-wider uppercase">
                    2. OSCILLOSCOPE STÉRÉO X/Y RECONSTRUIT (LISSAJOUS)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-2xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                  <span>CANAL G: X</span>
                  <span>•</span>
                  <span>CANAL D: Y</span>
                </div>
              </div>

              {/* CRT Scope Display Canvas */}
              <div className="relative aspect-square w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                <canvas
                  ref={scopeCanvasRef}
                  width={360}
                  height={360}
                  className="w-full h-full object-contain"
                />

                {/* Phosphor HUD Overlay Telemetry */}
                <div className="absolute top-2 left-2 pointer-events-none bg-black/70 backdrop-blur-sm border border-slate-800 p-2 rounded text-2xs font-mono space-y-0.5 text-slate-300">
                  <div className="text-emerald-400 font-bold">RE-SYNTHÈSE STÉRÉO : ACTIVE</div>
                  <div>
                    CORRÉLATION AUDIO L/R :{' '}
                    <span className={audioCorrelation > 0.9 ? 'text-amber-400' : 'text-emerald-400'}>
                      {audioCorrelation.toFixed(2)} ({audioCorrelation > 0.9 ? 'MONO SOURCE' : 'STÉRÉO'})
                    </span>
                  </div>
                  <div>
                    MIX VISUEL : <span className="text-cyan-400">{(visualStereoMix * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    SCAN BALAYAGE : <span className="text-slate-200">{scanFreqHz} Hz</span>
                  </div>
                </div>
              </div>

              {/* Scope Quick Actions & Color Palette */}
              <div className="mt-3 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xs text-slate-400">COULEUR PHOSPHORE:</span>
                  {[
                    { color: '#00ff66', name: 'Vert CRT P31' },
                    { color: '#00f5d4', name: 'Cyan Laser' },
                    { color: '#ffbe0b', name: 'Ambre Vintage' },
                    { color: '#ffffff', name: 'Blanc Pur' },
                  ].map((p) => (
                    <button
                      key={p.color}
                      onClick={() => setPhosphorColor(p.color as any)}
                      className={`w-5 h-5 rounded-full border transition-all ${
                        phosphorColor === p.color ? 'scale-110 border-white shadow-md' : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: p.color }}
                      title={p.name}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveCurrentFrameToLibrary}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-2xs font-bold transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    AJOUTER AUX MOTIFS
                  </button>

                  <button
                    onClick={() => {
                      const svg = exportPointsToSvg(currentFramePoints, 500, 500, phosphorColor);
                      triggerTextDownload(svg, `VIDEO_FRAME_${Date.now()}.svg`, 'image/svg+xml');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-2xs font-bold transition-all"
                    title="Télécharger SVG"
                  >
                    <Download className="w-3.5 h-3.5" />
                    SVG
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DUAL ANALYSIS & STEREO RE-SYNTHESIS CONTROLS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Détection Faisceau Optique */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  DÉTECTION DU FAISCEAU OPTIQUE
                </h3>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Seuil de Phosphore */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Sensibilité / Seuil Phosphore</span>
                    <span className="font-mono text-emerald-400">{beamConfig.threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    step="1"
                    value={beamConfig.threshold}
                    onChange={(e) => setBeamConfig({ ...beamConfig, threshold: parseInt(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                  <span className="text-2xs text-slate-500">Isole la ligne verte brillante du fond sombre</span>
                </div>

                {/* Tolérance Simplification RDP */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Lissage / Tolérance (RDP)</span>
                    <span className="font-mono text-emerald-400">{beamConfig.tolerance.toFixed(1)} px</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="8.0"
                    step="0.2"
                    value={beamConfig.tolerance}
                    onChange={(e) => setBeamConfig({ ...beamConfig, tolerance: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                  <span className="text-2xs text-slate-500">Réduit le bruit de capteur vidéo</span>
                </div>

                {/* Échelle / Cadrage */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Échelle d'amplitude</span>
                    <span className="font-mono text-emerald-400">{(beamConfig.scale * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="1.2"
                    step="0.05"
                    value={beamConfig.scale}
                    onChange={(e) => setBeamConfig({ ...beamConfig, scale: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Re-Synthèse Stéréo Intelligente */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-4 shadow-lg">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Music className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  FUSION & RE-SYNTHÈSE STÉRÉO
                </h3>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Mix Stéréo Visuel */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Mix Stéréo Visuel</span>
                    <span className="font-mono text-cyan-400">{(visualStereoMix * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={visualStereoMix}
                    onChange={(e) => setVisualStereoMix(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                  <div className="flex justify-between text-2xs text-slate-500">
                    <span>0% Son Brut Vidéo</span>
                    <span>100% Faisceau Optique</span>
                  </div>
                </div>

                {/* Modulation Sonore */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Modulation Sonore du Faisceau</span>
                    <span className="font-mono text-cyan-400">{(audioModulation * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioModulation}
                    onChange={(e) => setAudioModulation(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                  <span className="text-2xs text-slate-500">Le volume du son fait vibrer et vivre la forme</span>
                </div>

                {/* Fréquence de Balayage du Faisceau */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Fréquence Balayage Faisceau</span>
                    <span className="font-mono text-cyan-400">{scanFreqHz} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="240"
                    step="5"
                    value={scanFreqHz}
                    onChange={(e) => setScanFreqHz(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                  <span className="text-2xs text-slate-500">Vitesse de parcours du faisceau d'électrons</span>
                </div>
              </div>
            </div>

            {/* Card 3: "L'Enregistrementatif" (Dedicated Recording & Export Center) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-4 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5 mb-3.5">
                  <Disc className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    L'ENREGISTREMENTATIF & EXPORT DIRECT
                  </h3>
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  Enregistrez directement le flux complet issu de la double analyse : fichier WAV stéréo prêt pour
                  oscilloscope réel ou vidéo synchronisée.
                </p>

                <div className="space-y-2.5">
                  {/* Record WAV Button */}
                  <button
                    onClick={isRecordingWav ? stopRecordingWav : startRecordingWav}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all shadow-md ${
                      isRecordingWav
                        ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {isRecordingWav ? (
                      <>
                        <StopCircle className="w-4 h-4" />
                        ARRÊTER & TÉLÉCHARGER AUDIO STÉRÉO WAV
                      </>
                    ) : (
                      <>
                        <FileAudio className="w-4 h-4 text-rose-400" />
                        ENREGISTRER AUDIO STÉRÉO WAV (X/Y)
                      </>
                    )}
                  </button>

                  {/* Record Video Button */}
                  <button
                    onClick={isRecordingVideo ? stopRecordingVideoResult : startRecordingVideoResult}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all shadow-md ${
                      isRecordingVideo
                        ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isRecordingVideo ? (
                      <>
                        <StopCircle className="w-4 h-4" />
                        ARRÊTER & TÉLÉCHARGER VIDÉO WEBM
                      </>
                    ) : (
                      <>
                        <FileVideo className="w-4 h-4 text-amber-400" />
                        ENREGISTRER VIDÉO OSCILLOSCOPE (WEBM)
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-2xs text-slate-500 font-mono">
                SORTIE : 48 kHz / 24-bit PCM • CANAL G = X • CANAL D = Y
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* --- STATIC IMAGE LAB VIEW --- */}
      {/* ========================================================================= */}
      {labMode === 'image' && (
        <div className="space-y-6">
          {/* Presets & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-300">PRÉSETS GÉOMÉTRIQUES :</span>
              {[
                { id: 'lotus', label: 'Lotus Sacré' },
                { id: 'atom', label: 'Modèle Atomique' },
                { id: 'sacred_cube', label: 'Cube de Métatron' },
                { id: 'star_octagram', label: 'Octagramme' },
                { id: 'yinyang', label: 'Yin Yang' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveImagePreset(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeImagePreset === p.id
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const src = ev.target?.result as string;
                    setImageSrc(src);
                    setActiveImagePreset('custom');
                    setImageName(file.name);

                    // Load image into canvas for Sobel processing
                    const img = new Image();
                    img.onload = () => {
                      if (!imgSourceCanvasRef.current) return;
                      const sCanvas = imgSourceCanvasRef.current;
                      sCanvas.width = 320;
                      sCanvas.height = 320;
                      const sCtx = sCanvas.getContext('2d');
                      if (sCtx) {
                        sCtx.drawImage(img, 0, 0, 320, 320);
                        const pts = vectorizeImageData(sCtx, 320, 320, imgConfig);
                        setImageVectorPoints(pts);
                      }
                    };
                    img.src = src;
                  };
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
              <button
                onClick={() => imageFileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md"
              >
                <Upload className="w-4 h-4" />
                CHARGER UNE IMAGE PERSONNALISÉE
              </button>
            </div>
          </div>

          {/* Hidden Canvas for Sobel extraction */}
          <canvas ref={imgSourceCanvasRef} className="hidden" />

          {/* Dual Panel: Image Preview & Scope Rendering */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Source Image Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  IMAGE SOURCE
                </span>
                <span className="text-2xs text-slate-400 font-mono">{imageName}</span>
              </div>

              <div className="aspect-square w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                {imageSrc ? (
                  <img src={imageSrc} alt="Source" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
                    <Sparkles className="w-12 h-12 mb-2 text-teal-400 animate-pulse" />
                    <p className="text-sm font-medium text-slate-300">{imageName}</p>
                    <p className="text-xs text-slate-500 mt-1">Préset mathématique vectoriel actif</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Vector Tracing Scope Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  TRACÉ VECTORIEL D'OSCILLOSCOPE
                </span>
                <span className="text-2xs text-emerald-400 font-mono">
                  {imageVectorPoints.length} POINTS
                </span>
              </div>

              <div className="aspect-square w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                <canvas
                  ref={imgPreviewCanvasRef}
                  width={360}
                  height={360}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => onSendToOscilloscope(imageVectorPoints, imageName)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  <Zap className="w-4 h-4" />
                  ENVOYER À L'OSCILLOSCOPE
                </button>

                <button
                  onClick={() => {
                    const svg = exportPointsToSvg(imageVectorPoints, 500, 500, '#00ff66');
                    triggerTextDownload(svg, `${imageName.replace(/\s+/g, '_')}.svg`, 'image/svg+xml');
                  }}
                  className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  <Download className="w-4 h-4" />
                  SVG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
