export type WaveformType =
  | 'sine'
  | 'cosine'
  | 'triangle'
  | 'square'
  | 'sawtooth_up'
  | 'sawtooth_down'
  | 'noise'
  | 'custom';

export type PresetName =
  | 'Circle'
  | 'Ellipse'
  | 'Line'
  | 'Lissajous'
  | 'Spiral'
  | 'Rose'
  | 'Rose Three'
  | 'Rose Five'
  | 'Rose Seven'
  | 'Rose Nine'
  | 'Genesis Mandala'
  | 'Quarter-Tone Mandala'
  | 'Microtonal Beats'
  | 'Octa-Lissajous'
  | 'Sacred Lotus 8-Gen'
  | 'Harmonic Star'
  | 'Custom XY'
  | 'Personnalisé';

export type ScopeRenderMode = 'phosphor' | 'line' | 'points' | 'accumulation';

export type AppMode =
  | 'main'
  | 'mixer'
  | 'sequence_generators'
  | 'piano'
  | 'segmented'
  | 'matrix'
  | 'radio'
  | 'mics'
  | 'patterns'
  | 'sessions'
  | 'mandala_directory'
  | 'image_lab'
  | 'text_lab'
  | 'timeline'
  | 'mandala'
  | 'spectral'
  | 'vortex'
  | 'comparator'
  | 'real_scope'
  | 'genesis';

export interface RadioTrackConfig {
  volume: number; // 0..2
  playbackRate: number; // 0.25..3.0
  echoDelay: number; // 0..1 (sec)
  echoFeedback: number; // 0..0.95
  filterFrequency: number; // 100..18000 Hz
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  reverbMix: number; // 0..1
  bitcrushDepth: number; // 0 = off, 1..16 bits
  reverseFx: boolean;
  pan: number; // -1..1
  mute: boolean;
}

export interface MicrophoneChannelConfig {
  id: 'mic1' | 'mic2';
  name: string;
  enabled: boolean;
  monitoring: boolean; // "Écouter le micro"
  gain: number; // 0..3
  echoDelay: number; // 0..1 (sec)
  echoFeedback: number; // 0..0.95
  noiseGateThreshold: number; // 0..0.1
  pitchShiftCents: number; // -2400..2400 cents (-2 to +2 octaves)
  ringModFreq: number; // 0 = off, 10..2000 Hz
  overdrive: number; // 0..10
  stereoPan: number; // -1..1
  invertPhase: boolean;
  mute: boolean;
}

export interface PatternFillChannel {
  id: string;
  name: string;
  color: string;
  opacity: number; // 0.05..1.0
  style: 'solid' | 'neon_glow' | 'crt_hatch' | 'radial_glow';
  seedX: number; // -1..1
  seedY: number; // -1..1
  pixelPoints?: Array<[number, number]>;
  polygonPath?: Array<[number, number]>;
  enabled: boolean;
}

export interface PatternItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  points: Array<[number, number]>;
  pointColors?: string[]; // Direct per-point RGB hex strings encoded in the pattern
  segments?: Array<{
    id: string;
    points: Array<[number, number]>;
    color?: string;
  }>;
  segmentColors?: Record<number, string>;
  fillChannels?: PatternFillChannel[];
  sourceModule: string;
  color?: string;
  colorEncoding?: 'monochrome' | 'rgb_points' | 'segments' | 'fill_channels' | 'laser_chroma';
  handMode?: 'left_handed' | 'right_handed';
  isFavorite?: boolean;
}

export interface ScopeActiveToggles {
  octaGenerators: boolean;
  segmentedGens: boolean;
  radioAudio: boolean;
  microphone1: boolean;
  microphone2: boolean;
  vectorImage: boolean;
  vectorText: boolean;
  timelineScene: boolean;
  mandalaComposer: boolean;
  vortexDesigner: boolean;
  mandalaDirectory?: boolean;
  pianoSynth?: boolean;
  sequenceGenerators?: boolean;
}

export interface TabActivityLevels {
  main: number;
  sequence_generators?: number;
  piano: number;
  segmented: number;
  matrix: number;
  radio: number;
  mics: number;
  patterns: number;
  sessions: number;
  mandala_directory: number;
  image_lab: number;
  text_lab: number;
  timeline: number;
  mandala: number;
  spectral: number;
  vortex: number;
  comparator: number;
  real_scope: number;
  genesis: number;
}

export type TemporalCorrectionSpan = '1_frame' | '1_sec' | '5_sec' | '10_sec' | 'all';

export interface TemporalNudgeCorrection {
  id: string;
  timeSec: number; // Center timestamp of the correction (e.g. 2.13s)
  frameIdx: number; // Center frame number (e.g. 64)
  deltaX: number; // Shift horizontally (-1.0 to 1.0)
  deltaY: number; // Shift vertically (-1.0 to 1.0)
  span: TemporalCorrectionSpan; // '1_frame' | '1_sec' | '5_sec' | '10_sec' | 'all'
  windowDurationSec: number; // 0 for frame, 1.0 for 1s, 5.0 for 5s (±2.5s), 10.0 for 10s, Infinity for all
  appliedAt: string;
  label?: string;
}

export interface SequenceGeneratorItem {
  id: string;
  name: string;
  category: 'narrative_animation' | 'procedural_morph' | 'geometric_loop' | 'harmonic_flow' | 'custom';
  description: string;
  createdAt: string;
  primaryColor: string; // e.g. '#ffffff' (Rabbit white), modifiable to '#00b4d8' (blue) or any color!
  secondaryColor?: string; // e.g. '#ffb3c6' (Rabbit pink ears)
  burrowColor?: string; // e.g. '#8b4513' (Rabbit brown burrow/hole)
  scale: number; // 0.2 to 3.0 -> "plus gros ou plus petit"
  offsetX: number; // -1.0 to 1.0
  offsetY: number; // -1.0 to 1.0
  rotationDeg: number; // 0 to 360
  speedMultiplier: number; // 0.2 to 3.0
  fillEnabled: boolean;
  fillOpacity: number; // 0..1
  durationSec: number;
  fps: number;
  baseFrequency: number;
  isActiveInScope?: boolean;
  temporalCorrections?: TemporalNudgeCorrection[]; // Dynamic automated adjustments over time
  keyframes: Array<{
    id: string;
    label: string;
    points: Array<[number, number]>;
    color?: string;
    fillChannels?: PatternFillChannel[];
    segmentColors?: Record<number, string>;
  }>;
}

export interface PianoKeyData {
  note: string; // "DO", "DO#", "RÉ", "RÉ#", "MI", "FA", "FA#", "SOL", "SOL#", "LA", "LA#", "SI"
  pitch: string; // "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
  octave: number;
  freq: number;
  isBlack: boolean;
  keyboardKey?: string;
  musicalSign: string; // 𝄞, 𝄢, ♩, ♪, ♫, ♯, ♭, ♮, etc.
  solfeggioMeaning?: string;
  color: string;
}

export type MandalaCategory =
  | 'all'
  | 'genesis_sacred'
  | 'alchemical_magic'
  | 'gothic_rose'
  | 'cymatics'
  | 'hermetic_occult'
  | 'quantum_flower'
  | 'manifest_glyphs'
  | 'cosmic_calendar';

export interface MandalaGeneratorParams {
  category: MandalaCategory;
  name: string;
  symmetry: number; // 3 to 64
  layersCount: number; // 1 to 8
  outerRadius: number; // 0.5 to 1.0
  innerRadius: number; // 0.05 to 0.5
  centerSymbol: 'bindu' | 'eye' | 'star' | 'circle' | 'lotus_seed' | 'triangle' | 'none';
  petalStyle: 'lotus' | 'gothic_lancet' | 'geometric_spikes' | 'flames' | 'curved_teardrop' | 'none';
  hasSriYantra: boolean;
  hasCardinalTGates: boolean; // Genesis T-gates / stupa portals
  hasPlanetaryOrbs: boolean; // 6 or 8 planetary satellite circles
  hasRunicRing: boolean; // concentric engraved ring
  hasGuillocheLattice: boolean; // interlacing woven rosette
  hasChladniStandingWaves: boolean; // cymatic nodal rings
  hasMantraWheel: boolean; // Tibetan / Siddham / sacred circular inscription
  rotationAngleDeg: number; // rotation offset
  colorPalette: 'gold_genesis' | 'cyan_vector' | 'alchemical_white' | 'emerald_occult' | 'plasma_violet' | 'amber_fire';
  baseAudioFreq: number; // 55Hz to 880Hz (e.g. 432Hz, 528Hz, 216Hz, 108Hz)
}

export interface MandalaItem {
  id: string;
  name: string;
  category: MandalaCategory;
  description: string;
  tags: string[];
  symmetry: number;
  layersCount: number;
  points: Array<[number, number]>;
  baseFrequency: number;
  colorPalette: string;
  isFavorite?: boolean;
  createdAt: string;
  customParams?: Partial<MandalaGeneratorParams>;
}

export interface ChannelConfig {
  waveform: WaveformType;
  frequency: number; // Hz
  amplitude: number; // 0..1
  phase: number; // in degrees: 0..360
  offset: number; // DC offset: -1..1
  polarity: 1 | -1;
  gain: number; // 0..2
  mute: boolean;
  solo: boolean;
  fmDepth: number; // 0..1
  fmRate: number; // Hz
  customHarmonics: number[]; // 8 harmonics weights
}

export interface ChannelTelemetry {
  rms: number;
  peak: number; // 0..1
  dominantFreq: number; // Hz
  fundamental: number; // Hz
  phaseAngleDeg: number;
  harmonics: Array<{ freq: number; amp: number; ratio: number }>;
}

export interface ScopeDisplaySettings {
  thickness: number; // 1..6
  brightness: number; // 0.2..2.0
  persistence: number; // 0.05..0.98
  zoom: number; // 0.2..4.0
  rotation: number; // degrees 0..360
  centerX: number; // -1..1
  centerY: number; // -1..1
  normalize: boolean;
  showGrid: boolean;
  showAxes: boolean;
  mode: ScopeRenderMode;
  colorTheme?: 'cyan_phosphor' | 'green_crt' | 'gold_amber' | 'arctic_white' | 'custom';
  colorScheme?: 'green_phosphor' | 'amber_phosphor' | 'white_phosphor' | 'blue_phosphor' | 'gold_phosphor' | 'custom';
  primaryColor?: string;
  fillChannels?: PatternFillChannel[];
  segmentColors?: Record<number, string>;
  pointColors?: string[];
  handMode?: 'left_handed' | 'right_handed';
  colorEncodingMode?: 'monochrome' | 'rgb_vector' | 'ilda_chroma' | 'segmented';

  // USER MANDATE: Bruit blanc résonant intérieur rebondissant sur le contour du motif
  noiseFillEnabled?: boolean;
  noiseFrequency?: number; // 100 Hz .. 20 000 Hz
  noiseDensity?: number; // 50 .. 2000 points/faisceaux
  noiseBounceSpeed?: number; // 0.1 .. 5.0
  noiseIntensity?: number; // 0.1 .. 2.0
  noiseBounceMode?: 'specular' | 'stochastic' | 'quantum_diffuse';
}

export interface FloatingWindowState {
  isFloating: boolean;
  isFullscreen: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Segmented 4-Gen (XA, XB, YA, YB) and 8-Gen (X1..X4, Y1..Y4) Configuration
 */
export interface GeneratorSegmentConfig {
  id: string;
  name: string;
  enabled: boolean;
  waveform: WaveformType;
  frequencyRatio: number; // relative to base freq (e.g. 1.0, 1.5, 2.0, 3.0)
  amplitude: number; // 0..1
  phase: number; // degrees 0..360
  offset: number; // DC offset -1..1
  fmDepth: number; // 0..1
  fmRate: number; // Hz
}

export interface SegmentedChannel {
  channel: 'X' | 'Y';
  mode: '4_GEN' | '8_GEN';
  splitMode: 'hard_split' | 'smooth_split';
  crossfade: number; // 0..0.5 (crossfade percentage at boundary)
  mixMode: 'segmented' | 'layered';
  baseFrequency: number;
  segments: GeneratorSegmentConfig[];
}

/**
 * 8-OSCILLATOR ARCHITECTURE : 4 LEFT (L1..L4) + 4 RIGHT (R1..R4)
 * X = L1 + L2 + L3 + L4
 * Y = R1 + R2 + R3 + R4
 */
export type GeneratorId = 'L1' | 'L2' | 'L3' | 'L4' | 'R1' | 'R2' | 'R3' | 'R4';
export type ZoneKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
export type TuningMode = 'LOCKED' | 'FREE';

export interface OctaGeneratorConfig {
  id: GeneratorId;
  name: string;
  zoneKey: ZoneKey;
  channel: 'L' | 'R';
  index: number; // 1..4
  enabled: boolean;
  waveform: WaveformType;
  baseFrequency: number; // Hz (f0)
  quarterToneOffset: number; // -24..+24 (50 cents per step, formula: f0 * 2^(n/24))
  phase: number; // degrees: 0..360
  amplitude: number; // 0..1
  offset: number; // DC offset: -1..1
  polarity: 1 | -1;
  fmDepth: number; // 0..1
  fmRate: number; // Hz
  mute: boolean;
  solo: boolean;
  gain: number; // 0..2
  customHarmonics?: number[];
}

export interface OctaMixerChannel {
  gain: number;
  mute: boolean;
  solo: boolean;
  invertPhase: boolean;
}

export type ModTarget = 'fm' | 'am';

export interface ModRouting {
  id: string; // e.g. "L1->R1:fm"
  sourceId: GeneratorId;
  targetId: GeneratorId;
  targetParam: ModTarget; // 'fm': frequency modulation, 'am': amplitude modulation
  depth: number; // -1.0 to 1.0 (or 0 to 1)
  enabled: boolean;
}

export interface ModMatrixConfig {
  routings: ModRouting[];
}

export interface OctaSystemState {
  tuningMode: TuningMode;
  masterFrequency: number; // Central f0 when in LOCKED mode (e.g. 220 Hz)
  generators: {
    L1: OctaGeneratorConfig;
    L2: OctaGeneratorConfig;
    L3: OctaGeneratorConfig;
    L4: OctaGeneratorConfig;
    R1: OctaGeneratorConfig;
    R2: OctaGeneratorConfig;
    R3: OctaGeneratorConfig;
    R4: OctaGeneratorConfig;
  };
  mixerLeft: OctaMixerChannel;
  mixerRight: OctaMixerChannel;
  autoNormalize: boolean;
  modulationMatrix: ModMatrixConfig;
}

/**
 * Vector Text Configuration
 */
export interface VectorTextConfig {
  text: string;
  scrollDirection: 'left_to_right' | 'right_to_left';
  speed: number; // scroll speed multiplier 0.1..5.0
  scale: number; // 0.2..1.5
  startOffset: number; // -2.0..2.0
  endOffset: number; // -2.0..2.0
  loop: boolean;
  letterSpacing: number; // 0.5..1.5
  mode: 'scroll' | 'typewriter' | 'static';
  isActiveInScope: boolean;
}

/**
 * Vector Image Data
 */
export interface VectorImageData {
  name: string;
  points: Array<[number, number]>;
  pointCount: number;
  scale: number;
  rotation: number;
  isActiveInScope: boolean;
  refreshRateHz: number;
}

/**
 * Timeline Scenes & Automation
 */
export type TimelineTransitionType = 'cut' | 'crossfade' | 'morph' | 'glitch' | 'spin' | 'zoom';

export interface TimelineScene {
  id: string;
  name: string;
  type: 'preset' | 'generators' | 'image' | 'text';
  duration: number; // seconds
  transition: TimelineTransitionType;
  transitionDuration: number; // seconds
  presetName?: PresetName;
  customText?: string;
  imagePreset?: 'lotus' | 'atom' | 'sacred_cube' | 'star_octagram' | 'yinyang';
  autoFreqRamp?: { startFreq: number; endFreq: number };
  autoRotation?: { startAngle: number; endAngle: number };
}

export type MandalaCombineMode = 'ADD' | 'MULTIPLY' | 'MORPH' | 'SEQUENCE' | 'TIME_MULTIPLEX';

export interface MandalaLayer {
  id: string;
  name: string;
  enabled: boolean;
  shape: 'circle' | 'rose' | 'spiral' | 'polygon' | 'lissajous';
  frequency: number;
  ratio: number;
  phase: number;
  amplitude: number;
  rotation: number;
  duration: number; // seconds
  k?: number; // for rose / petals
  petals?: number;
}

export interface SequencerStep {
  id: string;
  name: string;
  shape: PresetName;
  duration: number; // seconds
  pause: number; // seconds
  freqX: number;
  freqY: number;
  phase: number; // degrees
  amplitude: number;
  modulation: number;
}

export interface ComparisonMetrics {
  calculatedPoints: [number, number][];
  measuredPoints: [number, number][];
  errorX: number; // MSE
  errorY: number; // MSE
  correlation: number; // Pearson r
  phaseDifferenceDeg: number;
  rmsDifferenceDb: number;
  spectralDifference: number;
  sampleCount: number;
}

export interface AudioExportOptions {
  sampleRate: 44100 | 48000 | 96000;
  bitDepth: 16 | 24 | 32; // 32 = 32-bit float
  durationSec: number;
  autoLimit: boolean;
  channels: 'stereo';
}

export interface RecordedExperiment {
  id?: string;
  name?: string;
  timestamp: string;
  preset: string;
  durationSec?: number;
  duration?: number;
  sampleRate: number;
  checksum: string;
  channelX?: ChannelConfig;
  channelY?: ChannelConfig;
  channelParams?: { x: ChannelConfig; y: ChannelConfig };
  events?: any[];
  rawTimeDataX?: Float32Array;
  rawTimeDataY?: Float32Array;
  points?: Array<[number, number]>;
}

export interface TabMixerChannel {
  id: AppMode;
  name: string;
  category: string;
  isPaused: boolean;
  isMuted: boolean;
  inMixer: boolean; // Crochet de sélection pour être entendu et visualisé dans le mixeur
  volume: number; // 0..2 (Gain du canal)
  pan: number; // -1..1 (Panoramique stéréo / balance X-Y)
  solo: boolean;
  frequency?: number;
  activityLevel: number; // 0..1
  color: string;
}

export interface MasterMixerState {
  masterVolume: number;
  masterMute: boolean;
  autoNormalize: boolean;
  channels: Record<string, TabMixerChannel>;
  rabbitDualZoneEnabled?: boolean;
  rabbitPrimaryColor?: string;
  rabbitBurrowColor?: string;
  rabbitEarsColor?: string;
  rabbitNoiseEnabled?: boolean;
  rabbitNoiseFrequency?: number;
  rabbitNoiseDensity?: number;
  rabbitNoiseSpeed?: number;
  rabbitDualZone?: {
    enabled: boolean;
    primaryColor: string;
    earsColor: string;
    burrowColor: string;
    noiseEnabled: boolean;
    noiseFrequency: number;
    noiseDensity: number;
    noiseBounceSpeed: number;
  };
}

export interface GenesisSessionData {
  id?: string;
  name?: string;
  description?: string;
  version: string;
  appName: string;
  timestamp: string;
  octaState?: OctaSystemState;
  configX: ChannelConfig;
  configY: ChannelConfig;
  segmentedX: SegmentedChannel;
  segmentedY: SegmentedChannel;
  textConfig: VectorTextConfig;
  currentPreset: PresetName;
  timelineScenes: TimelineScene[];
  scopeSettings: ScopeDisplaySettings;
  masterMixerState?: MasterMixerState;
  tabControls?: Record<string, { isPaused: boolean; isMuted: boolean; inMixer: boolean; volume: number }>;
  radioConfig?: RadioTrackConfig;
  mic1Config?: MicrophoneChannelConfig;
  mic2Config?: MicrophoneChannelConfig;
  mandalaLayers?: MandalaLayer[];
  activePatternId?: string;
}
