import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChannelConfig,
  ScopeDisplaySettings,
  ChannelTelemetry,
  AppMode,
  PresetName,
  MandalaLayer,
  MandalaCombineMode,
  SequencerStep,
  SegmentedChannel,
  GeneratorSegmentConfig,
  TimelineScene,
  FloatingWindowState,
  GenesisSessionData,
  VectorTextConfig,
  OctaSystemState,
  OctaGeneratorConfig,
  TuningMode,
  GeneratorId,
  OctaMixerChannel,
  ModRouting,
  RadioTrackConfig,
  MicrophoneChannelConfig,
  PatternItem,
  ScopeActiveToggles,
  TabActivityLevels,
  TabMixerChannel
} from './types/vectorScope';
import { VectorAudioEngine } from './services/audioEngine';
import {
  generateLissajousPoints,
  generateRosePoints,
  generateMandalaPoints,
  generateVortexPoints,
  generateSegmentedXYPoints,
  createDefaultOctaSystem,
  applyOctaPreset,
  generateOctaXYPoints
} from './services/mathEngine';
import { triggerBlobDownload } from './services/exportUtils';
import { downloadWindowsZip } from './services/pythonAppFiles';
import {
  autoSaveCurrentSession,
  getAutoSavedSession,
  clearAutoSavedSession
} from './services/sessionStorage';

import { Header } from './components/Header';
import { ChannelZone } from './components/ChannelZone';
import { ZoneCOscilloscope } from './components/ZoneCOscilloscope';
import { ZoneDGenerator } from './components/ZoneDGenerator';
import { OctaGeneratorCard } from './components/OctaGeneratorCard';
import { OctaMixerPanel } from './components/OctaMixerPanel';
import { OctaModulationMatrix } from './components/OctaModulationMatrix';
import { MasterMixerPanel } from './components/MasterMixerPanel';
import { SessionManager } from './components/SessionManager';
import { MandalaComposer } from './components/MandalaComposer';
import { VortexDesigner, VortexParams } from './components/VortexDesigner';
import { SpectralLab } from './components/SpectralLab';
import { SequencerView } from './components/SequencerView';
import { ComparatorView } from './components/ComparatorView';
import { RealOscilloscopeMode } from './components/RealOscilloscopeMode';
import { GenesisMode } from './components/GenesisMode';
import { ExportModal } from './components/ExportModal';

import { FloatingScopeWindow } from './components/FloatingScopeWindow';
import { SnappableScopeWindow } from './components/SnappableScopeWindow';
import { SegmentedGenerators } from './components/SegmentedGenerators';
import { VideoVectorLab } from './components/VideoVectorLab';
import { VectorTextLab } from './components/VectorTextLab';
import { TimelineSceneLab } from './components/TimelineSceneLab';
import { AudioVideoSessionRecorder } from './components/AudioVideoSessionRecorder';
import { RadioPlayerPanel } from './components/RadioPlayerPanel';
import { DualMicPanel } from './components/DualMicPanel';
import { PatternLibraryPanel } from './components/PatternLibraryPanel';
import { HarmonicPianoPanel } from './components/HarmonicPianoPanel';
import { SequenceGeneratorsPanel } from './components/SequenceGeneratorsPanel';
import { AiChatModal } from './components/AiChatModal';
import { GhostCursorOverlay } from './components/GhostCursorOverlay';
import { Bot, Sparkles, MessageSquare } from 'lucide-react';

const INITIAL_CONFIG_X: ChannelConfig = {
  waveform: 'sine',
  frequency: 220,
  amplitude: 0.8,
  phase: 0,
  offset: 0,
  polarity: 1,
  gain: 1.0,
  mute: false,
  solo: false,
  fmDepth: 0,
  fmRate: 0,
  customHarmonics: [0, 0, 0, 0, 0, 0, 0, 0],
};

const INITIAL_CONFIG_Y: ChannelConfig = {
  waveform: 'cosine',
  frequency: 220,
  amplitude: 0.8,
  phase: 0,
  offset: 0,
  polarity: 1,
  gain: 1.0,
  mute: false,
  solo: false,
  fmDepth: 0,
  fmRate: 0,
  customHarmonics: [0, 0, 0, 0, 0, 0, 0, 0],
};

const INITIAL_SCOPE_SETTINGS: ScopeDisplaySettings = {
  thickness: 2.0,
  brightness: 1.0,
  persistence: 0.78,
  zoom: 1.0,
  rotation: 0,
  centerX: 0,
  centerY: 0,
  normalize: false,
  showGrid: true,
  showAxes: true,
  mode: 'phosphor',
  colorTheme: 'cyan_phosphor',
};

const DEFAULT_SEGMENTED_X: SegmentedChannel = {
  channel: 'X',
  mode: '4_GEN',
  splitMode: 'hard_split',
  crossfade: 0.1,
  mixMode: 'segmented',
  baseFrequency: 0,
  segments: [
    {
      id: 'X_A',
      name: 'Générateur XA',
      enabled: false,
      waveform: 'sine',
      frequencyRatio: 0,
      amplitude: 0,
      phase: 0,
      offset: 0,
      fmDepth: 0,
      fmRate: 0,
    },
    {
      id: 'X_B',
      name: 'Générateur XB',
      enabled: false,
      waveform: 'sine',
      frequencyRatio: 0,
      amplitude: 0,
      phase: 0,
      offset: 0,
      fmDepth: 0,
      fmRate: 0,
    },
  ],
};

const DEFAULT_SEGMENTED_Y: SegmentedChannel = {
  channel: 'Y',
  mode: '4_GEN',
  splitMode: 'hard_split',
  crossfade: 0.1,
  mixMode: 'segmented',
  baseFrequency: 0,
  segments: [
    {
      id: 'Y_A',
      name: 'Générateur YA',
      enabled: false,
      waveform: 'sine',
      frequencyRatio: 0,
      amplitude: 0,
      phase: 0,
      offset: 0,
      fmDepth: 0,
      fmRate: 0,
    },
    {
      id: 'Y_B',
      name: 'Générateur YB',
      enabled: false,
      waveform: 'sine',
      frequencyRatio: 0,
      amplitude: 0,
      phase: 0,
      offset: 0,
      fmDepth: 0,
      fmRate: 0,
    },
  ],
};

const DEFAULT_MANDALA_LAYERS: MandalaLayer[] = [
  {
    id: 'l1',
    name: 'Cercle Fondamental',
    enabled: true,
    shape: 'circle',
    frequency: 220,
    ratio: 1,
    phase: 90,
    amplitude: 0.8,
    rotation: 0,
    duration: 2.0,
  },
  {
    id: 'l2',
    name: 'Rosette Harmonique',
    enabled: true,
    shape: 'rose',
    frequency: 220,
    ratio: 1,
    phase: 0,
    amplitude: 0.85,
    rotation: 45,
    duration: 3.0,
    k: 5,
  },
];

const DEFAULT_TAB_CHANNELS: Record<AppMode, TabMixerChannel> = {
  main: { id: 'main', name: 'Laboratoire X/Y', category: 'Oscillateurs Octa', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#00f5d4' },
  mixer: { id: 'mixer', name: 'Mixeur Master', category: 'Master Bus', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#38bdf8' },
  sequence_generators: { id: 'sequence_generators', name: 'Générateurs Vidéo', category: 'Séquences & Lapin', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#f43f5e' },
  piano: { id: 'piano', name: 'Piano & Notes', category: 'Synth Solfeggio', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#eab308' },
  radio: { id: 'radio', name: 'Radio & Chanson', category: 'Lecteur Audio', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#ec4899' },
  mics: { id: 'mics', name: 'Double Micro', category: 'Entrée Directe', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#8b5cf6' },
  patterns: { id: 'patterns', name: 'Bibliothèque Motifs', category: 'Vecteurs & Lapin', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#10b981' },
  matrix: { id: 'matrix', name: 'Matrice Modulation', category: 'FM / AM Matrix', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#6366f1' },
  sessions: { id: 'sessions', name: 'Sessions & Presets', category: 'Sauvegardes', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#06b6d4' },
  segmented: { id: 'segmented', name: '4/8 Générateurs', category: 'Synth Harmonique', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#14b8a6' },
  image_lab: { id: 'image_lab', name: 'Vidéo & Image', category: 'Vectoriseur', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#f97316' },
  text_lab: { id: 'text_lab', name: 'Texte Animé', category: 'Typographie', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#a855f7' },
  timeline: { id: 'timeline', name: 'Timeline & Scènes', category: 'Automation', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#ef4444' },
  mandala: { id: 'mandala', name: 'Mandala Composer', category: 'Art Sacré', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#fbbf24' },
  mandala_directory: { id: 'mandala_directory', name: 'Annuaire Mandala', category: 'Catalogue', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#fbbf24' },
  spectral: { id: 'spectral', name: 'Labo Spectral', category: 'Analyse FFT', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#3b82f6' },
  vortex: { id: 'vortex', name: 'Vortex Designer', category: 'Dynamique 3D', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#06b6d4' },
  comparator: { id: 'comparator', name: 'Comparateur', category: 'Mesures', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#64748b' },
  real_scope: { id: 'real_scope', name: 'Calibration Oscillo', category: 'Hardware', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#22c55e' },
  genesis: { id: 'genesis', name: 'Expérience Genesis', category: 'Master Synth', isPaused: false, isMuted: false, inMixer: true, volume: 1.0, pan: 0, solo: false, activityLevel: 0, color: '#e11d48' },
};

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('main');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [masterVolume, setMasterVolume] = useState<number>(0.7);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isClipping, setIsClipping] = useState<boolean>(false);

  // Tab Mixer & Concurrency State
  const [tabChannels, setTabChannels] = useState<Record<AppMode, TabMixerChannel>>(DEFAULT_TAB_CHANNELS);
  const [masterMute, setMasterMute] = useState<boolean>(false);
  const [autoNormalizeMixer, setAutoNormalizeMixer] = useState<boolean>(true);

  // Rabbit & Burrow dual zone visualization state for Mixer & Sequences
  const [rabbitDualZone, setRabbitDualZone] = useState({
    enabled: true,
    primaryColor: '#ffffff',
    earsColor: '#ffb3c6',
    burrowColor: '#8b4513',
    noiseEnabled: true,
    noiseFrequency: 440,
    noiseDensity: 400,
    noiseBounceSpeed: 1.0,
  });

  const handleUpdateTabChannel = (id: AppMode, updates: Partial<TabMixerChannel>) => {
    setTabChannels((prev) => {
      const current = prev[id] || DEFAULT_TAB_CHANNELS[id];
      const nextChan = { ...current, ...updates };
      const next = { ...prev, [id]: nextChan };

      // Propagate mute/pause to audio engine components if needed
      if (engineRef.current) {
        engineRef.current.updateTabChannels(next);

        if (id === 'radio') {
          if (updates.isMuted !== undefined) {
            engineRef.current.updateRadioConfig({ mute: updates.isMuted });
          }
          if (updates.isPaused !== undefined) {
            if (updates.isPaused) {
              engineRef.current.pauseRadioAudio();
            } else if (isPlaying) {
              engineRef.current.playRadioAudio();
            }
          }
        }
        if (id === 'mics') {
          if (updates.isMuted !== undefined || updates.isPaused !== undefined) {
            const isMutedOrPaused = nextChan.isMuted || nextChan.isPaused;
            engineRef.current.updateMicrophoneConfig('mic1', { mute: isMutedOrPaused });
            engineRef.current.updateMicrophoneConfig('mic2', { mute: isMutedOrPaused });
          }
        }
      }

      return next;
    });
  };

  const handleBatchUpdateTabChannels = (updates: Partial<TabMixerChannel>) => {
    setTabChannels((prev) => {
      const next = { ...prev };
      (Object.keys(next) as AppMode[]).forEach((key) => {
        next[key] = { ...next[key], ...updates };
      });
      if (engineRef.current) {
        engineRef.current.updateTabChannels(next);
      }
      return next;
    });
  };

  // Channels state
  const [configX, setConfigX] = useState<ChannelConfig>(INITIAL_CONFIG_X);
  const [configY, setConfigY] = useState<ChannelConfig>(INITIAL_CONFIG_Y);

  // Segmented multi-generators state (4-Gen and 8-Gen)
  const [segmentedX, setSegmentedX] = useState<SegmentedChannel>(DEFAULT_SEGMENTED_X);
  const [segmentedY, setSegmentedY] = useState<SegmentedChannel>(DEFAULT_SEGMENTED_Y);
  const [isSegmentedActiveInAudio, setIsSegmentedActiveInAudio] = useState<boolean>(false);

  // Vector Image state
  const [vectorImagePoints, setVectorImagePoints] = useState<Array<[number, number]>>([]);
  const [isImageActiveInAudio, setIsImageActiveInAudio] = useState<boolean>(false);

  // Vector Text state
  const [vectorTextPoints, setVectorTextPoints] = useState<Array<[number, number]>>([]);
  const [isTextActiveInAudio, setIsTextActiveInAudio] = useState<boolean>(false);

  // Timeline state
  const [timelineScenes, setTimelineScenes] = useState<TimelineScene[]>([]);
  const [isTimelineActiveInAudio, setIsTimelineActiveInAudio] = useState<boolean>(false);

  // Active Source Label
  const [sourceLabel, setSourceLabel] = useState<string>('OSCILLATEUR STÉRÉO');

  // Floating Window State
  const [floatingScopeState, setFloatingScopeState] = useState<FloatingWindowState>({
    isFloating: false,
    isFullscreen: false,
    x: 180,
    y: 90,
    width: 520,
    height: 520,
  });

  // Snappable Scope & Spectral Window State (Global across all tabs & modes)
  const [isSnappableScopeOpen, setIsSnappableScopeOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('genesis_global_snappable_open');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleGlobalSnappableScope = () => {
    setIsSnappableScopeOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('genesis_global_snappable_open', next.toString());
      } catch {}
      return next;
    });
  };

  // Scope Pause State for line picking/deleting
  const [isScopePaused, setIsScopePaused] = useState<boolean>(false);

  // Display & Presets
  const [scopeSettings, setScopeSettings] = useState<ScopeDisplaySettings>(INITIAL_SCOPE_SETTINGS);
  const [currentPreset, setCurrentPreset] = useState<PresetName>('Circle');
  const [isRatioLocked, setIsRatioLocked] = useState<boolean>(true);
  const [frequencyRatio, setFrequencyRatio] = useState<number>(1.0);
  const [roseK, setRoseK] = useState<number>(5);

  // Mandala & Audio Engine
  const [mandalaLayers, setMandalaLayers] = useState<MandalaLayer[]>(DEFAULT_MANDALA_LAYERS);
  const [mandalaCombineMode, setMandalaCombineMode] = useState<MandalaCombineMode>('ADD');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Real-time buffers
  const [xyPoints, setXyPoints] = useState<Array<[number, number]>>([]);
  const [rawTimeDataX, setRawTimeDataX] = useState<Float32Array>(new Float32Array(512));
  const [rawTimeDataY, setRawTimeDataY] = useState<Float32Array>(new Float32Array(512));
  const [freqDataX, setFreqDataX] = useState<Uint8Array>(new Uint8Array(256));
  const [freqDataY, setFreqDataY] = useState<Uint8Array>(new Uint8Array(256));

  // Telemetry
  const [telemetryX, setTelemetryX] = useState<ChannelTelemetry>({
    rms: 0,
    peak: 0,
    dominantFreq: 220,
    fundamental: 220,
    phaseAngleDeg: 0,
    harmonics: [],
  });
  const [telemetryY, setTelemetryY] = useState<ChannelTelemetry>({
    rms: 0,
    peak: 0,
    dominantFreq: 220,
    fundamental: 220,
    phaseAngleDeg: 90,
    harmonics: [],
  });

  // 8-Generator Octa Architecture (L1..L4 for LEFT/X, R1..R4 for RIGHT/Y)
  const [octaState, setOctaState] = useState<OctaSystemState>(() => createDefaultOctaSystem());

  // Radio (Song player) state
  const [radioTrackName, setRadioTrackName] = useState<string>('');
  const [radioDuration, setRadioDuration] = useState<number>(0);
  const [radioCurrentTime, setRadioCurrentTime] = useState<number>(0);
  const [isRadioPlaying, setIsRadioPlaying] = useState<boolean>(false);
  const [radioConfig, setRadioConfig] = useState<RadioTrackConfig>({
    volume: 0.8,
    playbackRate: 1.0,
    echoDelay: 0.25,
    echoFeedback: 0.35,
    filterFrequency: 8000,
    filterType: 'lowpass',
    reverbMix: 0,
    bitcrushDepth: 0,
    reverseFx: false,
    pan: 0,
    mute: false,
  });

  // Dual Microphones state
  const [mic1Config, setMic1Config] = useState<MicrophoneChannelConfig>({
    id: 'mic1',
    name: 'Microphone Principal (1)',
    enabled: false,
    monitoring: false,
    gain: 1.0,
    echoDelay: 0.2,
    echoFeedback: 0.3,
    noiseGateThreshold: 0.01,
    pitchShiftCents: 0,
    ringModFreq: 0,
    overdrive: 0,
    stereoPan: -0.2,
    invertPhase: false,
    mute: false,
  });

  const [mic2Config, setMic2Config] = useState<MicrophoneChannelConfig>({
    id: 'mic2',
    name: 'Microphone Secondaire (2)',
    enabled: false,
    monitoring: false,
    gain: 1.0,
    echoDelay: 0.35,
    echoFeedback: 0.45,
    noiseGateThreshold: 0.01,
    pitchShiftCents: 0,
    ringModFreq: 0,
    overdrive: 0,
    stereoPan: 0.2,
    invertPhase: false,
    mute: false,
  });

  // Scope visibility toggles across all sources
  const [scopeToggles, setScopeToggles] = useState<ScopeActiveToggles>({
    octaGenerators: true,
    sequenceGenerators: true,
    segmentedGens: true,
    radioAudio: true,
    microphone1: true,
    microphone2: true,
    vectorImage: true,
    vectorText: true,
    timelineScene: true,
    mandalaComposer: true,
    vortexDesigner: true,
  });

  // Flashing activity levels for each tab
  const [activityLevels, setActivityLevels] = useState<TabActivityLevels>({
    main: 0,
    sequence_generators: 0,
    piano: 0,
    mandala_directory: 0,
    segmented: 0,
    matrix: 0,
    radio: 0,
    mics: 0,
    patterns: 0,
    sessions: 0,
    image_lab: 0,
    text_lab: 0,
    timeline: 0,
    mandala: 0,
    spectral: 0,
    vortex: 0,
    comparator: 0,
    real_scope: 0,
    genesis: 0,
  });

  // Active loaded pattern ID
  const [activePatternId, setActivePatternId] = useState<string | undefined>(undefined);

  // Font scale zoom state (+ and -) as requested by user
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = localStorage.getItem('gv_font_scale');
    return saved ? parseFloat(saved) || 1.0 : 1.0;
  });

  // CERN Physics Relativistic Engine State
  const [relativisticEnabled, setRelativisticEnabled] = useState<boolean>(false);
  const [speedOfLightLimit, setSpeedOfLightLimit] = useState<number>(300);
  const [gravitationalDilationDepth, setGravitationalDilationDepth] = useState<number>(0.4);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', fontScale.toString());
    localStorage.setItem('gv_font_scale', fontScale.toString());
  }, [fontScale]);

  // Restore autosaved session on initial mount
  const hasRestoredAutosave = useRef<boolean>(false);
  useEffect(() => {
    if (!hasRestoredAutosave.current) {
      hasRestoredAutosave.current = true;
      const autosaved = getAutoSavedSession();
      if (autosaved) {
        handleRestoreSession(autosaved);
      }
    }
  }, []);

  // Autosave session on state change and when switching tabs/backgrounding
  useEffect(() => {
    const timeout = setTimeout(() => {
      const data = getSessionData();
      autoSaveCurrentSession(data);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [configX, configY, segmentedX, segmentedY, octaState, currentPreset, scopeSettings, timelineScenes, isTextActiveInAudio]);

  // Handle visibility change / backgrounding
  useEffect(() => {
    const handleVisibilityOrUnload = () => {
      const data = getSessionData();
      autoSaveCurrentSession(data);
    };

    document.addEventListener('visibilitychange', handleVisibilityOrUnload);
    window.addEventListener('pagehide', handleVisibilityOrUnload);
    window.addEventListener('beforeunload', handleVisibilityOrUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
      window.removeEventListener('pagehide', handleVisibilityOrUnload);
      window.removeEventListener('beforeunload', handleVisibilityOrUnload);
    };
  }, [configX, configY, segmentedX, segmentedY, octaState, currentPreset, scopeSettings, timelineScenes, isTextActiveInAudio]);

  // AI Chat and Virtual Cursor Co-pilot state
  const [isAiChatOpen, setIsAiChatOpen] = useState<boolean>(false);
  const [ghostCursorState, setGhostCursorState] = useState<{
    isVisible: boolean;
    xRatio: number;
    yRatio: number;
    label: string;
    isClicking: boolean;
    timeLeftSec: number;
  }>({
    isVisible: false,
    xRatio: 0.5,
    yRatio: 0.5,
    label: 'En attente...',
    isClicking: false,
    timeLeftSec: 0,
  });

  const ghostAnimRef = useRef<number | null>(null);
  const ghostTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleIncreaseFont = () => {
    setFontScale((prev) => Math.min(1.6, Number((prev + 0.08).toFixed(2))));
  };

  const handleDecreaseFont = () => {
    setFontScale((prev) => Math.max(0.7, Number((prev - 0.08).toFixed(2))));
  };

  const handleResetFont = () => {
    setFontScale(1.0);
  };

  // Launch Autonomous AI Generation with Ghost Cursor wandering across knobs and tables
  const handleStartAutonomousAnimation = (
    taskName: string,
    durationSec: number,
    onComplete: () => void
  ) => {
    // Ensure we are in main lab or timeline to observe
    if (appMode !== 'main' && appMode !== 'timeline') {
      setAppMode('main');
    }

    if (ghostTimerRef.current) clearInterval(ghostTimerRef.current);
    if (ghostAnimRef.current) cancelAnimationFrame(ghostAnimRef.current);

    let remaining = durationSec;
    setGhostCursorState({
      isVisible: true,
      xRatio: 0.45,
      yRatio: 0.45,
      label: `IA : ${taskName}`,
      isClicking: false,
      timeLeftSec: remaining,
    });

    const startTime = Date.now();
    const durationMs = durationSec * 1000;

    // Waypoints across the UI for autonomous cursor exploration:
    // Knobs left (L1..L4), Center oscilloscope, Knobs right (R1..R4), Master Tuning, Frequencies
    const waypoints = [
      { x: 0.18, y: 0.28, label: 'Accordage Fréquence L1 (Fondamentale X)' },
      { x: 0.22, y: 0.35, label: 'Réglage Forme d\'onde Sinus L1' },
      { x: 0.18, y: 0.48, label: 'Harmonique L2 +12 quarts de ton' },
      { x: 0.50, y: 0.38, label: 'Calibration Faisceau Oscilloscope' },
      { x: 0.82, y: 0.28, label: 'Accordage Fréquence R1 (Orthogonale Y)' },
      { x: 0.80, y: 0.35, label: 'Déphasage 90° Canal Droit' },
      { x: 0.82, y: 0.48, label: 'Harmonique R2 (Morphologie Contour)' },
      { x: 0.50, y: 0.72, label: 'Mixeur Master & Normalisation Auto' },
      { x: 0.42, y: 0.78, label: 'F0 Master Lock à 216 Hz' },
      { x: 0.55, y: 0.35, label: 'Tracé Vectoriel du Lapin Blanc' },
      { x: 0.45, y: 0.42, label: 'Canal Oreilles Roses (#ffb3c6)' },
      { x: 0.60, y: 0.52, label: 'Génération Terrier Géologique Brun (#8b4513)' },
      { x: 0.35, y: 0.85, label: 'Assemblage Scènes Timeline (Morphing)' },
    ];

    let wpIndex = 0;
    const intervalTick = setInterval(() => {
      remaining -= 1;
      wpIndex = (wpIndex + 1) % waypoints.length;
      const targetWp = waypoints[wpIndex];

      // Add natural wandering jitter
      const jitterX = (Math.random() - 0.5) * 0.08;
      const jitterY = (Math.random() - 0.5) * 0.08;
      const willClick = Math.random() > 0.4;

      setGhostCursorState({
        isVisible: true,
        xRatio: Math.max(0.08, Math.min(0.92, (targetWp?.x || 0.5) + jitterX)),
        yRatio: Math.max(0.12, Math.min(0.88, (targetWp?.y || 0.5) + jitterY)),
        label: targetWp?.label || 'Action Vectorielle',
        isClicking: willClick,
        timeLeftSec: Math.max(0, remaining),
      });

      if (remaining <= 0) {
        clearInterval(intervalTick);
        setGhostCursorState((prev) => ({ ...prev, isVisible: false }));
        onComplete();
      }
    }, 1000);

    ghostTimerRef.current = intervalTick;
  };

  const engineRef = useRef<VectorAudioEngine | null>(null);
  const animFrameIdRef = useRef<number>(0);

  // Initialize Audio Engine
  useEffect(() => {
    const engine = new VectorAudioEngine(INITIAL_CONFIG_X, INITIAL_CONFIG_Y);
    engine.setOctaState(octaState);
    engine.updateTabChannels(tabChannels);
    engine.setAppMode(appMode);
    engineRef.current = engine;

    engine.onClippingWarning = () => {
      setIsClipping(true);
      setTimeout(() => setIsClipping(false), 1200);
    };

    return () => {
      if (engineRef.current) {
        engineRef.current.stopAudio();
      }
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  // Sync active appMode (tab) to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setAppMode(appMode);
    }
  }, [appMode]);

  // Sync tab mixer channels to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateTabChannels(tabChannels);
    }
  }, [tabChannels]);

  // Sync volume
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setMasterVolume(masterVolume);
    }
  }, [masterVolume]);

  // Sync relativistic state to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setRelativisticSettings(
        relativisticEnabled,
        speedOfLightLimit,
        gravitationalDilationDepth
      );
    }
  }, [relativisticEnabled, speedOfLightLimit, gravitationalDilationDepth]);

  // Sync octaState to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setOctaState(octaState);
    }
  }, [octaState]);

  // Handlers for 8-Generator Octa System
  const handleUpdateOctaGenerator = useCallback((id: GeneratorId, updates: Partial<OctaGeneratorConfig>) => {
    setOctaState((prev) => {
      const next = {
        ...prev,
        generators: {
          ...prev.generators,
          [id]: { ...prev.generators[id], ...updates },
        },
      };
      if (engineRef.current) {
        engineRef.current.updateOctaGenerator(id, updates);
      }
      return next;
    });
  }, []);

  const handleUpdateTuningMode = useCallback((mode: TuningMode) => {
    setOctaState((prev) => {
      const next = { ...prev, tuningMode: mode };
      if (engineRef.current) {
        engineRef.current.updateOctaTuning(mode);
      }
      return next;
    });
  }, []);

  const handleUpdateMasterFreq = useCallback((freq: number) => {
    setOctaState((prev) => {
      const next = { ...prev, masterFrequency: freq };
      if (engineRef.current) {
        engineRef.current.updateOctaTuning(prev.tuningMode, freq);
      }
      return next;
    });
  }, []);

  const handleUpdateMixer = useCallback((channel: 'L' | 'R', updates: Partial<OctaMixerChannel>) => {
    setOctaState((prev) => {
      const next = {
        ...prev,
        [channel === 'L' ? 'mixerLeft' : 'mixerRight']: {
          ...prev[channel === 'L' ? 'mixerLeft' : 'mixerRight'],
          ...updates,
        },
      };
      if (engineRef.current) {
        engineRef.current.updateOctaMixer(channel, updates);
      }
      return next;
    });
  }, []);

  const handleUpdateAutoNormalize = useCallback((enabled: boolean) => {
    setOctaState((prev) => {
      const next = { ...prev, autoNormalize: enabled };
      if (engineRef.current) {
        engineRef.current.setOctaAutoNormalize(enabled);
      }
      return next;
    });
  }, []);

  const handleApplyOctaPreset = useCallback((preset: PresetName) => {
    setCurrentPreset(preset);
    setSourceLabel(`PRESET : ${preset}`);
    setOctaState((prev) => {
      const next = applyOctaPreset(preset, prev);
      if (engineRef.current) {
        engineRef.current.setOctaState(next);
      }
      return next;
    });
  }, []);

  // Sync configs to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfigX(configX);
    }
  }, [configX]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfigY(configY);
    }
  }, [configY]);

  // Sync segmented channels to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSegmentedChannels(segmentedX, segmentedY);
    }
  }, [segmentedX, segmentedY]);

  // Scope toggle handler
  const handleToggleScopeSource = (sourceKey: keyof ScopeActiveToggles) => {
    setScopeToggles((prev) => {
      const next = { ...prev, [sourceKey]: !prev[sourceKey] };
      const eng = engineRef.current;
      if (eng) {
        if (sourceKey === 'octaGenerators') eng.setFeedToScope('synthesizer', next.octaGenerators);
        if (sourceKey === 'radioAudio') eng.setFeedToScope('radio', next.radioAudio);
        if (sourceKey === 'microphone1') eng.setFeedToScope('mic1', next.microphone1);
        if (sourceKey === 'microphone2') eng.setFeedToScope('mic2', next.microphone2);
      }
      return next;
    });
  };

  // Real-time animation loop reading buffers from engine
  useEffect(() => {
    const updateLoop = () => {
      const engine = engineRef.current;
      if (engine) {
        // Refresh FFT and time domain analysers from Web Audio thread
        engine.updateBuffers();

        // Read buffers
        if (engine.xyPoints && engine.xyPoints.length > 5) {
          setXyPoints(engine.xyPoints);
        } else if (engine.getSynthesisMode() !== 'vector_path') {
          const pts = generateOctaXYPoints(octaState, 600, performance.now() * 0.001);
          setXyPoints(pts);
        }

        setRawTimeDataX(new Float32Array(engine.rawBufferX.subarray(0, 512)));
        setRawTimeDataY(new Float32Array(engine.rawBufferY.subarray(0, 512)));
        setFreqDataX(new Uint8Array(engine.freqBufferX.subarray(0, 256)));
        setFreqDataY(new Uint8Array(engine.freqBufferY.subarray(0, 256)));

        // Synchronize radio telemetry
        setRadioCurrentTime(engine.getRadioCurrentTime());
        setIsRadioPlaying(engine.getIsRadioPlaying());

        // Compute RMS and Peak telemetry
        let sumSqX = 0;
        let peakX = 0;
        for (let i = 0; i < 512; i++) {
          const val = engine.rawBufferX[i];
          sumSqX += val * val;
          if (Math.abs(val) > peakX) peakX = Math.abs(val);
        }
        let sumSqY = 0;
        let peakY = 0;
        for (let i = 0; i < 512; i++) {
          const val = engine.rawBufferY[i];
          sumSqY += val * val;
          if (Math.abs(val) > peakY) peakY = Math.abs(val);
        }

        const rmsX = Math.sqrt(sumSqX / 512);
        const rmsY = Math.sqrt(sumSqY / 512);

        setTelemetryX((prev) => ({
          ...prev,
          rms: rmsX,
          peak: peakX,
          dominantFreq: octaState.masterFrequency,
          fundamental: octaState.masterFrequency,
          phaseAngleDeg: 0,
        }));

        setTelemetryY((prev) => ({
          ...prev,
          rms: rmsY,
          peak: peakY,
          dominantFreq: octaState.masterFrequency,
          fundamental: octaState.masterFrequency,
          phaseAngleDeg: 90,
        }));

        // Update active tab flashing LEDs
        const synthLevel = engine.levelSynthesizer;
        const radLevel = engine.levelRadio;
        const m1Level = engine.levelMic1;
        const m2Level = engine.levelMic2;

        setActivityLevels({
          main: synthLevel,
          sequence_generators: synthLevel,
          piano: synthLevel,
          mandala_directory: synthLevel,
          segmented: isSegmentedActiveInAudio ? synthLevel : 0,
          matrix: synthLevel,
          radio: radLevel,
          mics: Math.max(m1Level, m2Level),
          patterns: 0,
          sessions: 0,
          image_lab: isImageActiveInAudio ? 0.6 : 0,
          text_lab: isTextActiveInAudio ? 0.6 : 0,
          timeline: isTimelineActiveInAudio ? 0.6 : 0,
          mandala: synthLevel,
          spectral: (rmsX + rmsY) / 2,
          vortex: synthLevel,
          comparator: synthLevel,
          real_scope: (rmsX + rmsY) / 2,
          genesis: synthLevel,
        });
      }

      animFrameIdRef.current = requestAnimationFrame(updateLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animFrameIdRef.current);
  }, [octaState, isSegmentedActiveInAudio, isImageActiveInAudio, isTextActiveInAudio, isTimelineActiveInAudio]);

  // Audio start/pause toggle
  const handleTogglePlay = useCallback(async () => {
    if (!engineRef.current) return;
    if (!isPlaying) {
      await engineRef.current.initAudio();
      await engineRef.current.resumeContext();
      setIsPlaying(true);
    } else {
      engineRef.current.stopAudio();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  // Recording toggle
  const handleToggleRecord = () => {
    if (!engineRef.current) return;
    if (!isRecording) {
      engineRef.current.startRecording();
      setIsRecording(true);
    } else {
      const recorded = engineRef.current.stopRecording();
      setIsRecording(false);
      setIsExportModalOpen(true);
    }
  };

  // Radio Song Player actions
  const handleUploadRadioFile = async (file: File) => {
    if (!engineRef.current) return;
    const res = await engineRef.current.loadAudioFile(file);
    if (res.success) {
      setRadioTrackName(file.name);
      setRadioDuration(res.duration);
      setIsRadioPlaying(true);
      setIsPlaying(true);
      setSourceLabel(`RADIO : ${file.name}`);
    }
  };

  const handleRadioPlay = async () => {
    if (!engineRef.current) return;
    await engineRef.current.resumeContext();
    engineRef.current.playRadioAudio();
    setIsRadioPlaying(true);
    setIsPlaying(true);
  };

  const handleRadioPause = () => {
    if (!engineRef.current) return;
    engineRef.current.pauseRadioAudio();
    setIsRadioPlaying(false);
  };

  const handleRadioSeek = (seconds: number) => {
    if (!engineRef.current) return;
    engineRef.current.seekRadioAudio(seconds);
    setRadioCurrentTime(seconds);
  };

  const handleRadioConfigChange = (updates: Partial<RadioTrackConfig>) => {
    setRadioConfig((prev) => {
      const next = { ...prev, ...updates };
      if (engineRef.current) {
        engineRef.current.updateRadioConfig(next);
      }
      return next;
    });
  };

  // Dual Microphone actions
  const handleToggleMic1 = async () => {
    if (!engineRef.current) return;
    if (!mic1Config.enabled) {
      const ok = await engineRef.current.startMicrophone('mic1');
      if (ok) {
        setMic1Config((prev) => ({ ...prev, enabled: true }));
        setIsPlaying(true);
      }
    } else {
      engineRef.current.stopMicrophone('mic1');
      setMic1Config((prev) => ({ ...prev, enabled: false }));
    }
  };

  const handleToggleMic2 = async () => {
    if (!engineRef.current) return;
    if (!mic2Config.enabled) {
      const ok = await engineRef.current.startMicrophone('mic2');
      if (ok) {
        setMic2Config((prev) => ({ ...prev, enabled: true }));
        setIsPlaying(true);
      }
    } else {
      engineRef.current.stopMicrophone('mic2');
      setMic2Config((prev) => ({ ...prev, enabled: false }));
    }
  };

  const handleUpdateMic1 = (updates: Partial<MicrophoneChannelConfig>) => {
    setMic1Config((prev) => {
      const next = { ...prev, ...updates };
      if (engineRef.current) {
        engineRef.current.updateMicrophoneConfig('mic1', next);
      }
      return next;
    });
  };

  const handleUpdateMic2 = (updates: Partial<MicrophoneChannelConfig>) => {
    setMic2Config((prev) => {
      const next = { ...prev, ...updates };
      if (engineRef.current) {
        engineRef.current.updateMicrophoneConfig('mic2', next);
      }
      return next;
    });
  };

  // Pattern Library action: Load pattern to oscilloscope
  const handleLoadPatternToScope = useCallback((pattern: PatternItem) => {
    if (!engineRef.current || !pattern) return;
    setActivePatternId(pattern.id);
    const pts = pattern.points || [];
    setXyPoints(pts);
    const patColor = pattern.color || '#ffffff';
    setScopeSettings((prev) => ({
      ...prev,
      primaryColor: patColor,
      colorScheme: 'custom',
      fillChannels: pattern.fillChannels || [],
      segmentColors: pattern.segmentColors || {},
      pointColors: pattern.pointColors || [],
    }));

    let ptColors = pattern.pointColors || [];
    if (ptColors.length === 0 && pts.length > 0) {
      const N = pts.length;
      const segColors = pattern.segmentColors || {};
      const stepSize = Math.max(1, Math.floor(N / 40));
      ptColors = new Array(N);
      for (let i = 0; i < N; i++) {
        const segIdx = Math.floor(i / stepSize);
        ptColors[i] = segColors[segIdx] || patColor;
      }
    }

    engineRef.current.setCustomVectorPath(pts, 60, ptColors);
    engineRef.current.setSynthesisMode('vector_path');
    setSourceLabel(`MOTIF : ${pattern.name}`);
    if (!isPlaying) handleTogglePlay();
  }, [isPlaying, handleTogglePlay]);

  // External audio file selection
  const handleAudioFileSelected = async (file: File) => {
    await handleUploadRadioFile(file);
    setAppMode('radio');
  };

  // Apply Presets
  const handleApplyPreset = (name: PresetName) => {
    setCurrentPreset(name);
    setSourceLabel(`PRESET : ${name}`);
    if (engineRef.current) {
      engineRef.current.setSynthesisMode('standard');
    }
    setIsSegmentedActiveInAudio(false);
    setIsImageActiveInAudio(false);
    setIsTextActiveInAudio(false);
    setIsTimelineActiveInAudio(false);

    const baseFreq = configX.frequency;
    switch (name) {
      case 'Circle':
        setConfigX((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.8, phase: 0 }));
        setConfigY((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.8, phase: 90 }));
        setFrequencyRatio(1.0);
        break;
      case 'Ellipse':
        setConfigX((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.9, phase: 0 }));
        setConfigY((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.5, phase: 90 }));
        setFrequencyRatio(1.0);
        break;
      case 'Line':
        setConfigX((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.8, phase: 0 }));
        setConfigY((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.8, phase: 0 }));
        setFrequencyRatio(1.0);
        break;
      case 'Lissajous':
        setConfigX((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.8, phase: 0 }));
        setConfigY((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq * 1.5, amplitude: 0.8, phase: 45 }));
        setFrequencyRatio(1.5);
        break;
      case 'Spiral':
        setConfigX((prev) => ({ ...prev, waveform: 'sawtooth_up', frequency: baseFreq, amplitude: 0.8, phase: 0 }));
        setConfigY((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.8, phase: 90 }));
        break;
      case 'Rose':
      case 'Rose Three':
        setRoseK(3);
        setConfigX((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.85, phase: 0 }));
        setConfigY((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq * 2, amplitude: 0.85, phase: 90 }));
        break;
      case 'Rose Five':
        setRoseK(5);
        setConfigX((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.85, phase: 0 }));
        setConfigY((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq * 3, amplitude: 0.85, phase: 90 }));
        break;
      case 'Rose Seven':
        setRoseK(7);
        setConfigX((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.85, phase: 0 }));
        setConfigY((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq * 4, amplitude: 0.85, phase: 90 }));
        break;
      case 'Rose Nine':
        setRoseK(9);
        setConfigX((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq, amplitude: 0.85, phase: 0 }));
        setConfigY((prev) => ({ ...prev, waveform: 'sine', frequency: baseFreq * 5, amplitude: 0.85, phase: 90 }));
        break;
      case 'Genesis Mandala':
        setConfigX((prev) => ({
          ...prev,
          waveform: 'custom',
          frequency: 440,
          amplitude: 0.85,
          phase: 0,
          customHarmonics: [1, 0.5, 0.3, 0.2, 0.1, 0, 0, 0],
        }));
        setConfigY((prev) => ({
          ...prev,
          waveform: 'custom',
          frequency: 440,
          amplitude: 0.85,
          phase: 180,
          customHarmonics: [1, 0.5, 0.3, 0.2, 0.1, 0, 0, 0],
        }));
        break;
      default:
        break;
    }
  };

  // Toggle Segmented Audio
  const handleToggleSegmentedAudio = () => {
    if (!engineRef.current) return;
    if (!isSegmentedActiveInAudio) {
      engineRef.current.setSynthesisMode('segmented');
      engineRef.current.setSegmentedChannels(segmentedX, segmentedY);
      setIsSegmentedActiveInAudio(true);
      setIsImageActiveInAudio(false);
      setIsTextActiveInAudio(false);
      setIsTimelineActiveInAudio(false);
      setSourceLabel('4/8 GÉNÉRATEURS SEGMENTÉS');
      if (!isPlaying) handleTogglePlay();
    } else {
      engineRef.current.setSynthesisMode('standard');
      setIsSegmentedActiveInAudio(false);
      setSourceLabel('OSCILLATEUR STÉRÉO');
    }
  };

  // Inject Vector Image into Oscilloscope & Audio
  const handleSendImageToScope = (points: Array<[number, number]>, name: string) => {
    if (!engineRef.current) return;
    setVectorImagePoints(points);
    engineRef.current.setCustomVectorPath(points || [], 60);
    engineRef.current.setSynthesisMode('vector_path');
    setIsImageActiveInAudio(true);
    setIsSegmentedActiveInAudio(false);
    setIsTextActiveInAudio(false);
    setIsTimelineActiveInAudio(false);
    setSourceLabel(`IMAGE : ${name}`);
    if (!isPlaying) handleTogglePlay();
  };

  // Inject Vector Text into Oscilloscope & Audio
  const handleSendTextToScope = (points: Array<[number, number]>, text: string) => {
    if (!engineRef.current) return;
    setVectorTextPoints(points);
    engineRef.current.setCustomVectorPath(points || [], 60);
    engineRef.current.setSynthesisMode('vector_path');
    setIsTextActiveInAudio(true);
    setIsImageActiveInAudio(false);
    setIsSegmentedActiveInAudio(false);
    setIsTimelineActiveInAudio(false);
    setSourceLabel(`TEXTE : ${text}`);
    if (!isPlaying) handleTogglePlay();
  };

  // Inject Timeline Frame into Oscilloscope & Audio
  const handleSendTimelineToScope = (points: Array<[number, number]>, sceneLabel: string) => {
    setXyPoints(points || []);
    if (!engineRef.current) return;
    engineRef.current.setCustomVectorPath(points || [], 60);
    engineRef.current.setSynthesisMode('vector_path');
    setIsTimelineActiveInAudio(true);
    setIsTextActiveInAudio(false);
    setIsImageActiveInAudio(false);
    setIsSegmentedActiveInAudio(false);
    setSourceLabel(sceneLabel);
  };

  // Apply Vortex to Scope
  const handleApplyVortex = (vortexParams: VortexParams) => {
    const pts = generateVortexPoints(vortexParams, 600);
    setXyPoints(pts);

    if (engineRef.current) {
      engineRef.current.setCustomVectorPath(pts, 60);
      engineRef.current.updateConfig('x', { frequency: vortexParams.baseFreq, amplitude: 0.85, phase: 0 });
      engineRef.current.updateConfig('y', { frequency: vortexParams.baseFreq, amplitude: 0.85, phase: 90 + vortexParams.phaseDrift });
    }

    setConfigX((prev) => ({
      ...prev,
      waveform: 'sine',
      frequency: vortexParams.baseFreq,
      amplitude: 0.85,
      phase: 0,
    }));
    setConfigY((prev) => ({
      ...prev,
      waveform: 'cosine',
      frequency: vortexParams.baseFreq,
      amplitude: 0.85,
      phase: 90 + vortexParams.phaseDrift,
    }));
    setScopeSettings((prev) => ({
      ...prev,
      rotation: vortexParams.rotationRate * 90,
      persistence: 0.82,
    }));
    setSourceLabel('VORTEX GÉOMÉTRIQUE');
    setIsImageActiveInAudio(false);
    setIsTextActiveInAudio(false);
    setIsSegmentedActiveInAudio(false);
  };

  const handleGenerateHarmonicMandala = () => {
    handleApplyOctaPreset('Sacred Lotus 8-Gen');
  };

  const handleTriggerTestPattern = (pattern: 'square' | 'cross' | 'circle' | 'ramp') => {
    if (pattern === 'circle') handleApplyPreset('Circle');
    if (pattern === 'square') {
      setConfigX((p) => ({ ...p, waveform: 'square', frequency: 100 }));
      setConfigY((p) => ({ ...p, waveform: 'square', frequency: 100, phase: 90 }));
    }
    if (pattern === 'cross') {
      setConfigX((p) => ({ ...p, waveform: 'triangle', frequency: 200 }));
      setConfigY((p) => ({ ...p, waveform: 'triangle', frequency: 200, phase: 0 }));
    }
    if (pattern === 'ramp') {
      setConfigX((p) => ({ ...p, waveform: 'sawtooth_up', frequency: 150 }));
      setConfigY((p) => ({ ...p, waveform: 'sawtooth_up', frequency: 150, phase: 90 }));
    }
  };

  const handleApplySequencerStep = (step: SequencerStep) => {
    setConfigX((prev) => ({
      ...prev,
      frequency: step.freqX,
      phase: 0,
      amplitude: step.amplitude,
    }));
    setConfigY((prev) => ({
      ...prev,
      frequency: step.freqY,
      phase: step.phase,
      amplitude: step.amplitude,
    }));
  };

  // Session serialize & restore
  const getSessionData = (): GenesisSessionData => ({
    version: '2.0-LAB',
    appName: 'GENESIS VECTOR LAB',
    timestamp: new Date().toISOString(),
    configX,
    configY,
    segmentedX,
    segmentedY,
    octaState,
    textConfig: {
      text: 'GENESIS LAB',
      scrollDirection: 'right_to_left',
      speed: 1.2,
      scale: 0.65,
      startOffset: 1.5,
      endOffset: -1.5,
      loop: true,
      letterSpacing: 0.85,
      mode: 'scroll',
      isActiveInScope: isTextActiveInAudio,
    },
    currentPreset,
    timelineScenes,
    scopeSettings,
    masterMixerState: {
      channels: tabChannels,
      masterVolume,
      masterMute,
      autoNormalize: autoNormalizeMixer,
      rabbitDualZone,
    },
  });

  const lissajousPoints = useMemo(() => {
    return generateLissajousPoints(configX.frequency, configY.frequency, configX.phase, configY.phase, 512);
  }, [configX.frequency, configY.frequency, configX.phase, configY.phase]);

  const handleRestoreSession = (session: GenesisSessionData) => {
    if (session.configX) setConfigX(session.configX);
    if (session.configY) setConfigY(session.configY);
    if (session.segmentedX) setSegmentedX(session.segmentedX);
    if (session.segmentedY) setSegmentedY(session.segmentedY);
    if (session.currentPreset) setCurrentPreset(session.currentPreset);
    if (session.scopeSettings) setScopeSettings(session.scopeSettings);
    if (session.timelineScenes) setTimelineScenes(session.timelineScenes);
    if (session.octaState) {
      setOctaState(session.octaState);
      if (engineRef.current) {
        engineRef.current.setOctaState(session.octaState);
      }
    }
    if (session.masterMixerState) {
      if (session.masterMixerState.channels) setTabChannels(session.masterMixerState.channels);
      if (session.masterMixerState.masterVolume !== undefined) setMasterVolume(session.masterMixerState.masterVolume);
      if (session.masterMixerState.masterMute !== undefined) setMasterMute(session.masterMixerState.masterMute);
      if (session.masterMixerState.autoNormalize !== undefined) setAutoNormalizeMixer(session.masterMixerState.autoNormalize);
      if (session.masterMixerState.rabbitDualZone) setRabbitDualZone(session.masterMixerState.rabbitDualZone);
    }
  };

  const handleResetAllToZero = () => {
    clearAutoSavedSession();
    setConfigX({ ...INITIAL_CONFIG_X });
    setConfigY({ ...INITIAL_CONFIG_Y });
    setSegmentedX({ ...DEFAULT_SEGMENTED_X });
    setSegmentedY({ ...DEFAULT_SEGMENTED_Y });

    const zeroOcta = createDefaultOctaSystem();
    setOctaState(zeroOcta);
    if (engineRef.current) {
      engineRef.current.setOctaState(zeroOcta);
    }
    setCurrentPreset('Personnalisé');
    setSourceLabel('TOUT RÉINITIALISÉ À ZÉRO');
  };

  const handleUpdateModRoutings = (routings: ModRouting[]) => {
    setOctaState((prev) => {
      const next = {
        ...prev,
        modulationMatrix: {
          ...prev.modulationMatrix,
          routings,
        },
      };
      if (engineRef.current) {
        engineRef.current.updateOctaModMatrix({ routings });
      }
      return next;
    });
  };

  const handleResetModMatrix = () => {
    handleUpdateModRoutings([]);
  };

  return (
    <div
      className="min-h-screen bg-[#050b14] text-slate-200 font-mono flex flex-col selection:bg-cyan-500 selection:text-slate-950 transition-[font-size] duration-150"
      style={{
        fontSize: `${fontScale}rem`,
      }}
    >
      {/* Header with Transport, Scope Toggles, Tab Pause/Mute Controls & Audio Activity Indicators */}
      <Header
        appMode={appMode}
        setAppMode={setAppMode}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        masterVolume={masterVolume}
        onVolumeChange={setMasterVolume}
        isRecording={isRecording}
        onToggleRecord={handleToggleRecord}
        hasClipping={isClipping}
        sampleRate={engineRef.current?.getSampleRate() || 48000}
        currentPreset={currentPreset}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onAudioFileSelected={handleAudioFileSelected}
        floatingScopeState={floatingScopeState}
        onToggleScopeFloating={() =>
          setFloatingScopeState((prev) => ({
            ...prev,
            isFloating: !prev.isFloating,
            isFullscreen: false,
          }))
        }
        scopeToggles={scopeToggles}
        onToggleScopeSource={handleToggleScopeSource}
        activityLevels={activityLevels}
        fontScale={fontScale}
        onIncreaseFont={handleIncreaseFont}
        onDecreaseFont={handleDecreaseFont}
        onResetFont={handleResetFont}
        onOpenAiChat={() => setIsAiChatOpen(true)}
        isSnappableScopeOpen={isSnappableScopeOpen}
        onToggleSnappableScope={toggleGlobalSnappableScope}
        tabChannels={tabChannels}
        onUpdateTabChannel={handleUpdateTabChannel}
      />

      {/* Snappable & Detachable Scope & Spectral Visualizer (Rendered anywhere on screen when enabled) */}
      {isSnappableScopeOpen && (
        <SnappableScopeWindow
          points={xyPoints}
          settings={scopeSettings}
          onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
          freqDataX={freqDataX}
          freqDataY={freqDataY}
          rawTimeDataX={rawTimeDataX}
          rawTimeDataY={rawTimeDataY}
          sampleRate={engineRef.current?.getSampleRate() || 48000}
          presetName={currentPreset}
          isPaused={isScopePaused}
          onTogglePause={() => setIsScopePaused(!isScopePaused)}
          currentLabel={sourceLabel}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onNavigateToSource={(mode) => setAppMode(mode)}
          defaultSnap="top_right"
          onClose={() => setIsSnappableScopeOpen(false)}
        />
      )}

      {/* Floating Oscilloscope Window (Rendered anywhere on screen when detached) */}
      {floatingScopeState.isFloating && (
        <FloatingScopeWindow
          points={xyPoints}
          settings={scopeSettings}
          onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
          floatingState={floatingScopeState}
          onFloatingStateChange={(updates) => setFloatingScopeState((prev) => ({ ...prev, ...updates }))}
          presetName={currentPreset}
          sourceLabel={sourceLabel}
        />
      )}

      {/* Main Working View */}
      <main className="flex-1 p-3 sm:p-4 max-w-[1920px] w-full mx-auto space-y-4">
        {/* Tab 1: Studio View: 8-Generator Matrix (Left: A, C, E, G / Center: Scope & Mixers / Right: B, D, F, H) */}
        <div className={appMode === 'main' ? 'space-y-4' : 'hidden'}>
  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              {/* Left Column (Axe X): Zone A (L1), Zone C (L2), Zone E (L3), Zone G (L4) */}
              <div className="xl:col-span-3 space-y-3">
                <div className="bg-[#040914] border border-cyan-950 px-3 py-2 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f5d4]" />
                    <span className="text-xs font-mono font-black text-cyan-400 tracking-wider">
                      CANAL GAUCHE / AXE X
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                    X = L1 + L2 + L3 + L4
                  </span>
                </div>

                <OctaGeneratorCard
                  config={octaState.generators.L1}
                  tuningMode={octaState.tuningMode}
                  masterFrequency={octaState.masterFrequency}
                  onUpdate={(updates) => handleUpdateOctaGenerator('L1', updates)}
                  accent="cyan"
                />

                <OctaGeneratorCard
                  config={octaState.generators.L2}
                  tuningMode={octaState.tuningMode}
                  masterFrequency={octaState.masterFrequency}
                  onUpdate={(updates) => handleUpdateOctaGenerator('L2', updates)}
                  accent="cyan"
                />

                <OctaGeneratorCard
                  config={octaState.generators.L3}
                  tuningMode={octaState.tuningMode}
                  masterFrequency={octaState.masterFrequency}
                  onUpdate={(updates) => handleUpdateOctaGenerator('L3', updates)}
                  accent="cyan"
                />

                <OctaGeneratorCard
                  config={octaState.generators.L4}
                  tuningMode={octaState.tuningMode}
                  masterFrequency={octaState.masterFrequency}
                  onUpdate={(updates) => handleUpdateOctaGenerator('L4', updates)}
                  accent="cyan"
                />
              </div>

              {/* Center Column: Oscilloscope XY with Pause/Select/Delete lines & Octa Mixer Panel */}
              <div className="xl:col-span-6 space-y-4">
                {!floatingScopeState.isFloating ? (
                  <ZoneCOscilloscope
                    points={xyPoints}
                    settings={scopeSettings}
                    onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                    presetName={currentPreset}
                    isPaused={isScopePaused}
                    onTogglePause={() => setIsScopePaused(!isScopePaused)}
                    onNavigateToSource={(mode) => setAppMode(mode)}
                    onSavedToPatternLibrary={() => {}}
                  />
                ) : (
                  <div className="bg-[#060c18] border border-dashed border-cyan-800/50 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[440px] space-y-3">
                    <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-600/50 flex items-center justify-center text-cyan-400 animate-pulse">
                      <span className="text-xl">⤢</span>
                    </div>
                    <div className="font-bold text-sm text-cyan-300">OSCILLOSCOPE DÉTACHÉ EN FENÊTRE FLOTTANTE</div>
                    <p className="text-xs text-slate-400 max-w-sm">
                      L'oscilloscope est actuellement détaché. Vous pouvez le déplacer librement sur votre écran, le redimensionner ou l'afficher en plein écran.
                    </p>
                    <button
                      onClick={() => setFloatingScopeState((prev) => ({ ...prev, isFloating: false }))}
                      className="px-4 py-2 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-700 hover:bg-cyan-900 text-xs font-bold transition-colors"
                    >
                      Ré-ancrer l'oscilloscope au centre
                    </button>
                  </div>
                )}

                {/* MIXER LEFT & RIGHT + RÉGIE FRÉQUENCES & QUARTER-TONE MANDALA */}
                <OctaMixerPanel
                  state={octaState}
                  onUpdateTuningMode={handleUpdateTuningMode}
                  onUpdateMasterFreq={handleUpdateMasterFreq}
                  onUpdateMixer={handleUpdateMixer}
                  onUpdateAutoNormalize={handleUpdateAutoNormalize}
                  onApplyPreset={handleApplyOctaPreset}
                  onResetToZero={handleResetAllToZero}
                  telemetryX={telemetryX}
                  telemetryY={telemetryY}
                />

                {/* USER SPECIFIED: "un bouton en bas au milieu dans le carré libre où la fenêtre. Je voudrais avoir une fenêtre pour clavarder avec l'intelligence artificielle." */}
                <div className="bg-[#040915] border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 p-4 rounded-2xl shadow-xl transition-all flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,245,212,0.3)]">
                      <Bot className="w-7 h-7 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-cyan-300 font-mono flex items-center gap-2">
                        <span>CLAVARDAGE & ASSISTANT IA VECTORIEL</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                          ACTIF
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        Demandez des formes, de l'aide pour régler les oscillateurs, colorer des motifs ou observer la souris animer le lapin blanc et le terrier en 2 min !
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsAiChatOpen(true)}
                    id="btn-open-ai-chat-center"
                    className="px-5 py-2.5 rounded-xl text-xs font-mono font-black bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 hover:from-cyan-400 hover:to-emerald-300 shadow-[0_0_20px_rgba(0,245,212,0.4)] flex items-center gap-2 transition-all shrink-0 hover:scale-105 active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>OUVRIR FENÊTRE IA</span>
                  </button>
                </div>
              </div>

              {/* Right Column (Axe Y): Zone B (R1), Zone D (R2), Zone F (R3), Zone H (R4) */}
              <div className="xl:col-span-3 space-y-3">
                <div className="bg-[#160c04] border border-amber-950 px-3 py-2 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                    <span className="text-xs font-mono font-black text-amber-400 tracking-wider">
                      CANAL DROIT / AXE Y
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                    Y = R1 + R2 + R3 + R4
                  </span>
                </div>

                <OctaGeneratorCard
                  config={octaState.generators.R1}
                  tuningMode={octaState.tuningMode}
                  masterFrequency={octaState.masterFrequency}
                  onUpdate={(updates) => handleUpdateOctaGenerator('R1', updates)}
                  accent="amber"
                />

                <OctaGeneratorCard
                  config={octaState.generators.R2}
                  tuningMode={octaState.tuningMode}
                  masterFrequency={octaState.masterFrequency}
                  onUpdate={(updates) => handleUpdateOctaGenerator('R2', updates)}
                  accent="amber"
                />

                <OctaGeneratorCard
                  config={octaState.generators.R3}
                  tuningMode={octaState.tuningMode}
                  masterFrequency={octaState.masterFrequency}
                  onUpdate={(updates) => handleUpdateOctaGenerator('R3', updates)}
                  accent="amber"
                />

                <OctaGeneratorCard
                  config={octaState.generators.R4}
                  tuningMode={octaState.tuningMode}
                  masterFrequency={octaState.masterFrequency}
                  onUpdate={(updates) => handleUpdateOctaGenerator('R4', updates)}
                  accent="amber"
                />
              </div>
            </div>
          </div>

        {/* Tab 2: MIXEUR MASTER & CONCURRENCE MULTI-ONGLETS */}
        <div className={appMode === 'mixer' ? '' : 'hidden'}>
          <MasterMixerPanel
            channels={tabChannels}
            onUpdateChannel={handleUpdateTabChannel}
            onBatchUpdateChannels={handleBatchUpdateTabChannels}
            masterVolume={masterVolume}
            onMasterVolumeChange={(vol) => {
              setMasterVolume(vol);
              if (engineRef.current) engineRef.current.setMasterVolume(vol);
            }}
            masterMute={masterMute}
            onToggleMasterMute={() => {
              setMasterMute((prev) => {
                const next = !prev;
                if (engineRef.current) {
                  engineRef.current.setMasterVolume(next ? 0 : masterVolume);
                }
                return next;
              });
            }}
            autoNormalize={autoNormalizeMixer}
            onToggleAutoNormalize={() => setAutoNormalizeMixer(!autoNormalizeMixer)}
            onNavigateToTab={(mode) => setAppMode(mode)}
            compositePoints={xyPoints}
            scopeSettings={scopeSettings}
            onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
            rabbitDualZone={rabbitDualZone}
            onUpdateRabbitDualZone={(updates) => setRabbitDualZone((prev) => ({ ...prev, ...updates }))}
          />
        </div>

        {/* Tab: Générateurs Vidéo & Séquences Centralisés (Lapin Blanc, Papillon, etc.) */}
        <div className={appMode === 'sequence_generators' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <SequenceGeneratorsPanel
              scopeSettings={scopeSettings}
              onScopeSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
              onApplyPointsToScope={(points, color, name, fillChannels) => {
                const pts = points || [];
                setXyPoints(pts);
                setSourceLabel(`SÉQUENCE: ${name.toUpperCase()}`);
                setScopeSettings((prev) => ({
                  ...prev,
                  primaryColor: color || '#ffffff',
                  colorScheme: 'custom',
                  fillChannels: fillChannels || [],
                }));
                if (engineRef.current) {
                  const patColor = color || '#ffffff';
                  const ptColors = new Array(pts.length).fill(patColor);
                  engineRef.current.setCustomVectorPath(pts, 60, ptColors);
                  engineRef.current.setSynthesisMode('vector_path');
                }
              }}
              onApplyTimelineScenes={(scenes) => {
                setTimelineScenes(scenes);
                setAppMode('timeline');
              }}
              onOpenAiChat={() => setIsAiChatOpen(true)}
            />
</div>

        {/* Tab: Station Radio & Lecteur Audio Continu */}
        <div className={appMode === 'radio' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <RadioPlayerPanel
              trackName={radioTrackName}
              duration={radioDuration}
              currentTime={radioCurrentTime}
              isPlaying={isRadioPlaying}
              onPlay={handleRadioPlay}
              onPause={handleRadioPause}
              onSeek={handleRadioSeek}
              onUploadFile={handleUploadRadioFile}
              config={radioConfig}
              onConfigChange={handleRadioConfigChange}
              isInScope={scopeToggles.radioAudio}
              onToggleScopeFeed={(active) => handleToggleScopeSource('radioAudio')}
            />
</div>

        {/* Tab: Double Microphones (Micro 1 & Micro 2) */}
        <div className={appMode === 'mics' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <DualMicPanel
              mic1Config={mic1Config}
              mic2Config={mic2Config}
              onUpdateMic1={handleUpdateMic1}
              onUpdateMic2={handleUpdateMic2}
              onToggleMic1={handleToggleMic1}
              onToggleMic2={handleToggleMic2}
              isInScope1={scopeToggles.microphone1}
              isInScope2={scopeToggles.microphone2}
              onToggleScopeFeed1={(act) => handleToggleScopeSource('microphone1')}
              onToggleScopeFeed2={(act) => handleToggleScopeSource('microphone2')}
              level1={engineRef.current?.levelMic1 || 0}
              level2={engineRef.current?.levelMic2 || 0}
            />
</div>

        {/* Tab: Bibliothèque de Motifs */}
        <div className={appMode === 'patterns' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <PatternLibraryPanel
              currentScopePoints={xyPoints}
              onLoadPatternToScope={handleLoadPatternToScope}
              activePatternId={activePatternId}
              scopeSettings={scopeSettings}
              onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
            />
</div>

        {/* Tab: Modulation Matrix (FM / AM Routing for 8 Generators) */}
        <div className={appMode === 'matrix' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <OctaModulationMatrix
              state={octaState}
              onUpdateRoutings={handleUpdateModRoutings}
              onResetMatrix={handleResetModMatrix}
            />
</div>

        {/* Tab: Sessions & Presets Manager + Reset Departure */}
        <div className={appMode === 'sessions' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <SessionManager
              currentSessionData={getSessionData()}
              onRestoreSession={handleRestoreSession}
              onResetAllToZero={handleResetAllToZero}
            />
</div>

        {/* Tab 2: Segmented 4-Gen & 8-Gen Laboratory */}
        <div className={appMode === 'segmented' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <SegmentedGenerators
              segmentedX={segmentedX}
              segmentedY={segmentedY}
              onSegmentedXChange={setSegmentedX}
              onSegmentedYChange={setSegmentedY}
              isActiveInAudio={isSegmentedActiveInAudio}
              onToggleActiveInAudio={handleToggleSegmentedAudio}
            />
</div>

        {/* Tab 3: Vector Video & Image Import Lab */}
        <div className={appMode === 'image_lab' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <VideoVectorLab
              audioEngine={engineRef.current}
              onSendToOscilloscope={handleSendImageToScope}
              isActiveInScope={isImageActiveInAudio}
              onSavePattern={handleLoadPatternToScope}
            />
</div>

        {/* Tab 4: Animated Vector Text Lab */}
        <div className={appMode === 'text_lab' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <VectorTextLab
              onSendToOscilloscope={handleSendTextToScope}
              isActiveInScope={isTextActiveInAudio}
            />
</div>

        {/* Tab 5: Multi-Scene Timeline with Automation */}
        <div className={appMode === 'timeline' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <TimelineSceneLab
              scenes={timelineScenes}
              onScenesChange={setTimelineScenes}
              onSendFrameToScope={handleSendTimelineToScope}
              isActiveInScope={isTimelineActiveInAudio}
              scopeSettings={scopeSettings}
              onScopeSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
            />
</div>

        {/* Tab 6: Mandala Composer */}
        <div className={appMode === 'mandala' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <MandalaComposer
              layers={mandalaLayers}
              onLayersChange={(newLayers) => {
                setMandalaLayers(newLayers);
                const pts = generateMandalaPoints(newLayers, mandalaCombineMode, 600);
                setXyPoints(pts);
                if (engineRef.current) {
                  engineRef.current.setCustomVectorPath(pts, 60);
                }
              }}
              combineMode={mandalaCombineMode}
              onCombineModeChange={(newMode) => {
                setMandalaCombineMode(newMode);
                const pts = generateMandalaPoints(mandalaLayers, newMode, 600);
                setXyPoints(pts);
                if (engineRef.current) {
                  engineRef.current.setCustomVectorPath(pts, 60);
                }
              }}
              onApplyToAudioEngine={() => {
                const pts = generateMandalaPoints(mandalaLayers, mandalaCombineMode, 600);
                setXyPoints(pts);

                const active = mandalaLayers.find((l) => l.enabled) || mandalaLayers[0];
                if (active) {
                  setConfigX((prev) => ({ ...prev, frequency: active.frequency, phase: 0 }));
                  setConfigY((prev) => ({ ...prev, frequency: active.frequency * active.ratio, phase: active.phase }));
                }

                if (engineRef.current) {
                  engineRef.current.setCustomVectorPath(pts, 60);
                  if (active) {
                    engineRef.current.updateConfig('x', { frequency: active.frequency, phase: 0 });
                    engineRef.current.updateConfig('y', { frequency: active.frequency * active.ratio, phase: active.phase });
                  }
                }

                setIsImageActiveInAudio(false);
                setIsTextActiveInAudio(false);
                setIsSegmentedActiveInAudio(false);
                setSourceLabel('MANDALA MULTI-COUCHES');
              }}
            />
</div>

        {/* Tab 7: Vortex Designer */}
        <div className={appMode === 'vortex' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <VortexDesigner onApplyVortexToScope={handleApplyVortex} />
</div>

        {/* Tab 8: Spectral Lab */}
        <div className={appMode === 'spectral' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <SpectralLab
              freqDataX={freqDataX}
              freqDataY={freqDataY}
              rawTimeDataX={rawTimeDataX}
              rawTimeDataY={rawTimeDataY}
              sampleRate={engineRef.current?.getSampleRate() || 48000}
            />
</div>

        {/* Tab 9: Comparator View (Calculated vs Measured) */}
        <div className={appMode === 'comparator' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <ComparatorView
              calculatedPoints={lissajousPoints}
              measuredPoints={xyPoints}
            />
</div>

        {/* Tab 10: Real Oscilloscope Calibration Mode */}
        <div className={appMode === 'real_scope' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <RealOscilloscopeMode
              configX={configX}
              configY={configY}
              onConfigChangeX={(updates) => setConfigX((prev) => ({ ...prev, ...updates }))}
              onConfigChangeY={(updates) => setConfigY((prev) => ({ ...prev, ...updates }))}
              onTriggerTestPattern={handleTriggerTestPattern}
            />
</div>

        {/* Tab 11: Genesis Mode */}
        <div className={appMode === 'genesis' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <GenesisMode
              configX={configX}
              configY={configY}
              onConfigChangeX={(updates) => setConfigX((prev) => ({ ...prev, ...updates }))}
              onConfigChangeY={(updates) => setConfigY((prev) => ({ ...prev, ...updates }))}
              scopeSettings={scopeSettings}
              onScopeSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
              isRecording={isRecording}
              onToggleRecord={handleToggleRecord}
              onExport={() => setIsExportModalOpen(true)}
              onGenerateHarmonicMandala={handleGenerateHarmonicMandala}
              relativisticEnabled={relativisticEnabled}
              speedOfLightLimit={speedOfLightLimit}
              gravitationalDilationDepth={gravitationalDilationDepth}
              onRelativisticChange={(updates) => {
                if (updates.enabled !== undefined) setRelativisticEnabled(updates.enabled);
                if (updates.speedOfLightLimit !== undefined) setSpeedOfLightLimit(updates.speedOfLightLimit);
                if (updates.gravitationalDilationDepth !== undefined) setGravitationalDilationDepth(updates.gravitationalDilationDepth);
              }}
            />
</div>

        {/* Tab 12: Piano & Notes Harmoniques */}
        {engineRef.current && (<div className={appMode === 'piano' ? 'space-y-4' : 'hidden'}>
  <div className="max-w-xl mx-auto">
              <ZoneCOscilloscope
                points={xyPoints}
                settings={scopeSettings}
                onSettingsChange={(updates) => setScopeSettings((prev) => ({ ...prev, ...updates }))}
                presetName={currentPreset}
                isPaused={isScopePaused}
                onTogglePause={() => setIsScopePaused(!isScopePaused)}
              />
            </div>
            <HarmonicPianoPanel
              engine={engineRef.current}
              configX={configX}
              configY={configY}
              onUpdateConfigX={(updates) => {
                setConfigX((prev) => ({ ...prev, ...updates }));
                if (engineRef.current) engineRef.current.updateConfigX(updates);
              }}
              onUpdateConfigY={(updates) => {
                setConfigY((prev) => ({ ...prev, ...updates }));
                if (engineRef.current) engineRef.current.updateConfigY(updates);
              }}
              onSelectPresetName={(name) => {
                setCurrentPreset(name as any);
                setSourceLabel(`PIANO : ${name}`);
              }}
            />
</div>)}

        {/* Session & Audio/Video Master Recorder Box (Accessible across all tabs) */}
        {engineRef.current && (
          <div className="pt-2">
            <AudioVideoSessionRecorder
              audioEngine={engineRef.current}
              currentSessionData={getSessionData}
              onRestoreSession={handleRestoreSession}
            />
          </div>
        )}
      </main>

      {/* Scientific Lab Footer */}
      <footer className="border-t border-[#121f35] bg-[#030712] px-4 py-2.5 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>MOTEUR AUDIO : <strong className="text-cyan-400">{isPlaying ? 'EN COURS (48.0 kHz)' : 'EN VEILLE'}</strong></span>
          </span>
          <span>SOURCE ACTIVE : <strong className="text-slate-300">{sourceLabel}</strong></span>
        </div>

        <div className="flex items-center gap-4">
          <span>CH1 / X (GAUCHE) : <strong className="text-cyan-400">{configX.frequency.toFixed(1)} Hz</strong></span>
          <span>CH2 / Y (DROIT) : <strong className="text-amber-400">{configY.frequency.toFixed(1)} Hz</strong></span>
          <span>DÉPHASAGE : <strong className="text-slate-300">{(configY.phase - configX.phase + 360) % 360}°</strong></span>
          <span className="text-slate-600">|</span>
          <span className="text-indigo-400 font-bold">GENESIS VECTOR LAB</span>
        </div>
      </footer>

      {/* Export Lab Modal */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          sessionData={getSessionData()}
          audioEngine={engineRef.current}
          currentPoints={xyPoints}
        />
      )}

      {/* Autonomous Virtual Cursor Co-Pilot Overlay */}
      <GhostCursorOverlay
        isVisible={ghostCursorState.isVisible}
        xRatio={ghostCursorState.xRatio}
        yRatio={ghostCursorState.yRatio}
        label={ghostCursorState.label}
        isClicking={ghostCursorState.isClicking}
        timeLeftSec={ghostCursorState.timeLeftSec}
      />

      {/* AI Assistant Chat Modal */}
      <AiChatModal
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        octaState={octaState}
        onApplyOctaState={(newState) => {
          setOctaState(newState);
          if (engineRef.current) {
            engineRef.current.setOctaState(newState);
          }
        }}
        onApplyPatternToScope={(pattern) => {
          handleLoadPatternToScope(pattern);
        }}
        onApplyTimelineScenes={(scenes) => {
          setTimelineScenes(scenes);
        }}
        onStartAutonomousAnimation={handleStartAutonomousAnimation}
      />
    </div>
  );
}
