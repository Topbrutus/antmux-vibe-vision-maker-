import {
  ChannelConfig,
  WaveformType,
  SegmentedChannel,
  OctaSystemState,
  OctaGeneratorConfig,
  TuningMode,
  GeneratorId,
  OctaMixerChannel,
  ModRouting,
  RadioTrackConfig,
  MicrophoneChannelConfig
} from '../types/vectorScope';
import {
  evalWaveform,
  computeSegmentedSample,
  computeOctaSample,
  createDefaultOctaSystem,
  computeQuarterToneFreq
} from './mathEngine';

export class VectorAudioEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private masterGainNode: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private splitterNode: ChannelSplitterNode | null = null;
  private mergerNode: ChannelMergerNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

  private analyserX: AnalyserNode | null = null;
  private analyserY: AnalyserNode | null = null;

  // Custom audio generator node (Synthesizer stream)
  private processorNode: ScriptProcessorNode | null = null;

  // Synthesis Mode (Defaulting to the powerful 8-generator Octa architecture)
  private synthesisMode: 'octa' | 'standard' | 'segmented' | 'vector_path' | 'video_stereo' | 'dual_channel' = 'octa';
  private octaState: OctaSystemState = createDefaultOctaSystem();
  private segmentedX: SegmentedChannel | null = null;
  private segmentedY: SegmentedChannel | null = null;
  private customVectorPoints: Array<[number, number]> = [];
  private customVectorColors: string[] = [];
  private vectorRefreshHz: number = 60;

  private getColorBrightness(color: string | undefined): number {
    if (!color) return 1.0;
    const cleaned = color.trim().toLowerCase();
    let r = 255, g = 255, b = 255;
    if (cleaned.startsWith('#')) {
      const hex = cleaned.substring(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
    } else if (cleaned.startsWith('rgb')) {
      const match = cleaned.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (match) {
        r = parseInt(match[1], 10);
        g = parseInt(match[2], 10);
        b = parseInt(match[3], 10);
      }
    } else if (cleaned.startsWith('hsl')) {
      const match = cleaned.match(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/);
      if (match) {
        return parseInt(match[3], 10) / 100;
      }
    } else {
      if (cleaned === 'black') return 0.0;
      if (cleaned === 'white') return 1.0;
      if (cleaned === 'brown' || cleaned === '#8b4513') return 0.3;
    }
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return Math.max(0.0, Math.min(1.0, luminance));
  }

  // Video Stereo Resynthesis state
  private videoTrajectoryPoints: Array<[number, number]> = [];
  private videoVisualMix: number = 0.85;
  private videoAudioModulation: number = 0.45;
  private videoScanFreqHz: number = 60;
  private videoAudioBuffer: AudioBuffer | null = null;
  private videoPlaybackTime: number = 0;
  private videoPlaybackRate: number = 1.0;

  // Scope feed toggles: allow mixing or isolating what goes into the oscilloscope X/Y
  private feedSynthesizerToScope: boolean = true;
  private feedRadioToScope: boolean = true;
  private feedMic1ToScope: boolean = true;
  private feedMic2ToScope: boolean = true;

  // Audio elements & effects for Radio (Song player)
  private importedBuffer: AudioBuffer | null = null;
  private importedSourceNode: AudioBufferSourceNode | null = null;
  private isPlayingImported: boolean = false;
  private radioStartTime: number = 0;
  private radioPauseOffset: number = 0;
  private radioDuration: number = 0;
  private radioTrackConfig: RadioTrackConfig = {
    volume: 1.0,
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
  };

  // Web Audio Graph nodes for Radio FX
  private radioGainNode: GainNode | null = null;
  private radioPannerNode: StereoPannerNode | null = null;
  private radioFilterNode: BiquadFilterNode | null = null;
  private radioDelayNode: DelayNode | null = null;
  private radioFeedbackGain: GainNode | null = null;
  private radioScopeGainNode: GainNode | null = null;
  private synthScopeGainNode: GainNode | null = null;

  // Dual Microphones Nodes & States
  private mic1Stream: MediaStream | null = null;
  private mic1SourceNode: MediaStreamAudioSourceNode | null = null;
  private mic1GainNode: GainNode | null = null;
  private mic1MonitorGain: GainNode | null = null;
  private mic1DelayNode: DelayNode | null = null;
  private mic1FeedbackGain: GainNode | null = null;
  private mic1PannerNode: StereoPannerNode | null = null;
  private mic1ScopeGain: GainNode | null = null;

  private mic2Stream: MediaStream | null = null;
  private mic2SourceNode: MediaStreamAudioSourceNode | null = null;
  private mic2GainNode: GainNode | null = null;
  private mic2MonitorGain: GainNode | null = null;
  private mic2DelayNode: DelayNode | null = null;
  private mic2FeedbackGain: GainNode | null = null;
  private mic2PannerNode: StereoPannerNode | null = null;
  private mic2ScopeGain: GainNode | null = null;

  private mic1Config: MicrophoneChannelConfig = {
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
  };

  private mic2Config: MicrophoneChannelConfig = {
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
  };

  // Activity detection RMS meters for tabs
  public levelSynthesizer: number = 0;
  public levelRadio: number = 0;
  public levelMic1: number = 0;
  public levelMic2: number = 0;

  // Engine configuration
  private configX: ChannelConfig;
  private configY: ChannelConfig;
  private phaseAccumX: number = 0;
  private phaseAccumY: number = 0;
  private timeElapsed: number = 0;

  // Real-time circular buffers for the oscilloscope
  private bufferSize: number = 1024;
  public rawBufferX: Float32Array = new Float32Array(1024);
  public rawBufferY: Float32Array = new Float32Array(1024);
  public freqBufferX: Uint8Array = new Uint8Array(512);
  public freqBufferY: Uint8Array = new Uint8Array(512);
  public xyPoints: Array<[number, number]> = [];

  // Clipping detection
  private hasClipping: boolean = false;
  private clippingResetTimer: number | undefined;
  public onClippingWarning?: () => void;

  // Real-time audio recording
  private isRecording: boolean = false;
  private recordedChunksLeft: Float32Array[] = [];
  private recordedChunksRight: Float32Array[] = [];
  private recordingStartTime: number = 0;

  // Relativistic and Gravity Time Dilation (CERN Confinement Engine)
  public relativisticEnabled: boolean = false;
  public speedOfLightLimit: number = 300; // units/sec, lower limit = more dilation
  public gravitationalDilationDepth: number = 0.4; // radial gravitational factor
  public properTimeElapsed: number = 0;
  private prevValX: number = 0;
  private prevValY: number = 0;

  // Smoothing for plates deflection inertia (Anti-popcorn click reconstruction filter)
  private smoothValX: number = 0;
  private smoothValY: number = 0;

  // Tab mix and pause/mute isolation states
  private appMode: string = 'main';
  private tabChannelsState: Record<string, { isPaused: boolean; isMuted: boolean }> = {};
  private smoothTabGain: number = 1.0;

  // High-precision step-by-step FM phase accumulation for the 8 octa generators
  private octaPhases: Record<GeneratorId, number> = {
    L1: 0, L2: 0, L3: 0, L4: 0,
    R1: 0, R2: 0, R3: 0, R4: 0
  };

  // Pre-allocated static generator IDs for zero-allocation iteration in audio loop
  private static readonly OCTA_IDS: GeneratorId[] = ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'];

  // Coherent generator outputs for modulation feedback
  private octaLastOutputs: Record<GeneratorId, number> = {
    L1: 0, L2: 0, L3: 0, L4: 0,
    R1: 0, R2: 0, R3: 0, R4: 0
  };

  // Pre-allocated modulation calculation buffers (Zero GC allocations inside 2048 audio loop)
  private octaFmOffsets: Record<GeneratorId, number> = {
    L1: 0, L2: 0, L3: 0, L4: 0,
    R1: 0, R2: 0, R3: 0, R4: 0
  };
  private octaAmFactors: Record<GeneratorId, number> = {
    L1: 1, L2: 1, L3: 1, L4: 1,
    R1: 1, R2: 1, R3: 1, R4: 1
  };
  private octaFinalVals: Record<GeneratorId, number> = {
    L1: 0, L2: 0, L3: 0, L4: 0,
    R1: 0, R2: 0, R3: 0, R4: 0
  };

  // Sub-frame smoothed parameter states for Octa generators & mixer
  private smoothGenGain: Record<GeneratorId, number> = {
    L1: 1, L2: 1, L3: 1, L4: 1,
    R1: 1, R2: 1, R3: 1, R4: 1
  };
  private smoothGenAmp: Record<GeneratorId, number> = {
    L1: 0.8, L2: 0.8, L3: 0.8, L4: 0.8,
    R1: 0.8, R2: 0.8, R3: 0.8, R4: 0.8
  };
  private smoothGenActive: Record<GeneratorId, number> = {
    L1: 1, L2: 0, L3: 0, L4: 0,
    R1: 1, R2: 0, R3: 0, R4: 0
  };
  private smoothMixerGainL: number = 1.0;
  private smoothMixerGainR: number = 1.0;
  private smoothMixerMuteL: number = 1.0; // 1 = active, 0 = muted
  private smoothMixerMuteR: number = 1.0;
  private smoothNormScaleL: number = 1.0;
  private smoothNormScaleR: number = 1.0;

  // Dedicated Look-Ahead Limiter (Zero Overshoot True-Peak Limiter)
  // 96 samples (~2.0 ms at 48kHz) allows ramping gain down BEFORE the peak reaches DAC
  private static readonly LIMITER_LOOKAHEAD_SAMPLES = 96;
  private limiterDelayL: Float32Array = new Float32Array(96);
  private limiterDelayR: Float32Array = new Float32Array(96);
  private limiterPeakRing: Float32Array = new Float32Array(96);
  private limiterWriteIdx: number = 0;
  private limiterGain: number = 1.0;
  private readonly limiterThreshold: number = 0.95; // -0.45 dBFS true peak ceiling

  /**
   * Process a stereo sample through the look-ahead true-peak limiter.
   * Scans a 96-sample (~2ms) look-ahead window and ramps down gain ahead of time
   * so transient peaks never clip or cause popcorn noise.
   */
  private processLookAheadLimiter(inX: number, inY: number, dt: number): [number, number] {
    const N = VectorAudioEngine.LIMITER_LOOKAHEAD_SAMPLES;
    const peak = Math.max(Math.abs(inX), Math.abs(inY));

    // Store incoming sample in circular look-ahead buffers
    this.limiterDelayL[this.limiterWriteIdx] = inX;
    this.limiterDelayR[this.limiterWriteIdx] = inY;
    this.limiterPeakRing[this.limiterWriteIdx] = peak;

    // Scan maximum peak across lookahead window
    let maxLookaheadPeak = 0;
    for (let k = 0; k < N; k++) {
      const p = this.limiterPeakRing[k];
      if (p > maxLookaheadPeak) {
        maxLookaheadPeak = p;
      }
    }

    // Determine target gain attenuation
    const targetGain = maxLookaheadPeak > this.limiterThreshold
      ? this.limiterThreshold / maxLookaheadPeak
      : 1.0;

    // Sub-frame look-ahead attack & release smoothing
    if (targetGain < this.limiterGain) {
      // Fast look-ahead attack (tau = 0.6ms): ramps down well before delayed sample exits
      const attackCoeff = 1 - Math.exp(-dt / 0.0006);
      this.limiterGain += (targetGain - this.limiterGain) * attackCoeff;
    } else {
      // Release (tau = 35ms): natural, musical recovery without pumping
      const releaseCoeff = 1 - Math.exp(-dt / 0.035);
      this.limiterGain += (targetGain - this.limiterGain) * releaseCoeff;
    }

    // Read delayed sample (oldest in ring buffer)
    const readIdx = (this.limiterWriteIdx + 1) % N;
    const delayedL = this.limiterDelayL[readIdx];
    const delayedR = this.limiterDelayR[readIdx];

    // Advance write pointer
    this.limiterWriteIdx = (this.limiterWriteIdx + 1) % N;

    // Apply look-ahead gain reduction
    let outX = delayedL * this.limiterGain;
    let outY = delayedR * this.limiterGain;

    // Safety soft-knee ceiling: transparent saturation for any extreme residual inter-sample peaks
    if (Math.abs(outX) > 0.92) {
      outX = Math.sign(outX) * (0.92 + 0.05 * Math.tanh((Math.abs(outX) - 0.92) / 0.05));
    }
    if (Math.abs(outY) > 0.92) {
      outY = Math.sign(outY) * (0.92 + 0.05 * Math.tanh((Math.abs(outY) - 0.92) / 0.05));
    }

    return [outX, outY];
  }

  // Additive Piano Synthesizer State
  private pianoState = {
    active: false,
    freqX: 432,
    freqY: 432,
    phaseX: 0,
    phaseY: 0,
    currentAmp: 0,
    targetAmp: 0,
    waveform: 'sine' as WaveformType
  };

  public triggerPianoNote(freqX: number, freqY: number, waveform: WaveformType) {
    this.pianoState.freqX = freqX;
    this.pianoState.freqY = freqY;
    this.pianoState.waveform = waveform;
    this.pianoState.targetAmp = 0.8;
    this.pianoState.active = true;
  }

  public releasePianoNote(immediate: boolean = false) {
    this.pianoState.targetAmp = 0;
    if (immediate) {
      this.pianoState.currentAmp = 0;
      this.pianoState.active = false;
    }
  }

  constructor(cfgX?: ChannelConfig, cfgY?: ChannelConfig) {
    this.configX = cfgX ? { ...cfgX } : {
      waveform: 'sine',
      frequency: 220,
      amplitude: 0.7,
      phase: 0,
      offset: 0,
      polarity: 1,
      gain: 1.0,
      mute: false,
      solo: false,
      fmDepth: 0,
      fmRate: 1,
      customHarmonics: [1, 0, 0, 0, 0, 0, 0, 0],
    };

    this.configY = cfgY ? { ...cfgY } : {
      waveform: 'sine',
      frequency: 220,
      amplitude: 0.7,
      phase: 90,
      offset: 0,
      polarity: 1,
      gain: 1.0,
      mute: false,
      solo: false,
      fmDepth: 0,
      fmRate: 1,
      customHarmonics: [1, 0, 0, 0, 0, 0, 0, 0],
    };

    // Initialize sub-frame smoothing parameter states from initial Octa state
    const initialGens = this.octaState.generators;
    for (const gid of VectorAudioEngine.OCTA_IDS) {
      if (initialGens[gid]) {
        this.smoothGenGain[gid] = initialGens[gid].gain;
        this.smoothGenAmp[gid] = initialGens[gid].amplitude;
        this.smoothGenActive[gid] = initialGens[gid].enabled && !initialGens[gid].mute ? 1.0 : 0.0;
      }
    }
    this.smoothMixerGainL = this.octaState.mixerLeft.gain;
    this.smoothMixerGainR = this.octaState.mixerRight.gain;
    this.smoothMixerMuteL = this.octaState.mixerLeft.mute ? 0.0 : 1.0;
    this.smoothMixerMuteR = this.octaState.mixerRight.mute ? 0.0 : 1.0;
  }

  public async initAudio(): Promise<boolean> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.isRunning = true;
      return true;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // Dynamics Limiter
      this.limiterNode = this.ctx.createDynamicsCompressor();
      this.limiterNode.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
      this.limiterNode.knee.setValueAtTime(4.0, this.ctx.currentTime);
      this.limiterNode.ratio.setValueAtTime(20.0, this.ctx.currentTime);
      this.limiterNode.attack.setValueAtTime(0.001, this.ctx.currentTime);
      this.limiterNode.release.setValueAtTime(0.05, this.ctx.currentTime);

      this.masterGainNode = this.ctx.createGain();
      this.masterGainNode.gain.setValueAtTime(0.7, this.ctx.currentTime);

      // Stereo Analysers
      this.splitterNode = this.ctx.createChannelSplitter(2);
      this.analyserX = this.ctx.createAnalyser();
      this.analyserX.fftSize = this.bufferSize;
      this.analyserX.smoothingTimeConstant = 0.6;

      this.analyserY = this.ctx.createAnalyser();
      this.analyserY.fftSize = this.bufferSize;
      this.analyserY.smoothingTimeConstant = 0.6;

      this.splitterNode.connect(this.analyserX, 0);
      this.splitterNode.connect(this.analyserY, 1);

      // ScriptProcessor for precise sample-by-sample vector sound generation
      this.processorNode = this.ctx.createScriptProcessor(2048, 0, 2);
      this.processorNode.onaudioprocess = this.handleAudioProcess.bind(this);

      // Routing: Processor -> synthScopeGainNode -> Splitter (Analysers) & Limiter -> MasterGain -> Destination
      this.synthScopeGainNode = this.ctx.createGain();
      this.synthScopeGainNode.gain.setValueAtTime(this.feedSynthesizerToScope ? 1.0 : 0.0, this.ctx.currentTime);

      this.processorNode.connect(this.synthScopeGainNode);
      this.synthScopeGainNode.connect(this.splitterNode);
      this.processorNode.connect(this.limiterNode);
      this.limiterNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.ctx.destination);

      // Create MediaStreamDestination for A/V synchronized video recording
      this.mediaStreamDest = this.ctx.createMediaStreamDestination();
      this.masterGainNode.connect(this.mediaStreamDest);

      // Setup Radio Audio Graph (Independent, concurrent playback)
      this.setupRadioGraph();

      this.isRunning = true;
      return true;
    } catch (err) {
      console.error('Failed to initialize AudioContext:', err);
      return false;
    }
  }

  /**
   * Builds the reusable graph for the Radio track (Song player)
   */
  private setupRadioGraph() {
    if (!this.ctx || !this.limiterNode || !this.splitterNode) return;

    this.radioGainNode = this.ctx.createGain();
    this.radioGainNode.gain.setValueAtTime(this.radioTrackConfig.mute ? 0 : this.radioTrackConfig.volume, this.ctx.currentTime);

    this.radioFilterNode = this.ctx.createBiquadFilter();
    this.radioFilterNode.type = this.radioTrackConfig.filterType;
    this.radioFilterNode.frequency.setValueAtTime(this.radioTrackConfig.filterFrequency, this.ctx.currentTime);

    this.radioDelayNode = this.ctx.createDelay(2.0);
    this.radioDelayNode.delayTime.setValueAtTime(this.radioTrackConfig.echoDelay, this.ctx.currentTime);

    this.radioFeedbackGain = this.ctx.createGain();
    this.radioFeedbackGain.gain.setValueAtTime(this.radioTrackConfig.echoFeedback, this.ctx.currentTime);

    if (this.ctx.createStereoPanner) {
      this.radioPannerNode = this.ctx.createStereoPanner();
      this.radioPannerNode.pan.setValueAtTime(this.radioTrackConfig.pan, this.ctx.currentTime);
    }

    this.radioScopeGainNode = this.ctx.createGain();
    this.radioScopeGainNode.gain.setValueAtTime(this.feedRadioToScope ? 1 : 0, this.ctx.currentTime);

    // Filter -> Delay Feedback Loop
    this.radioFilterNode.connect(this.radioDelayNode);
    this.radioDelayNode.connect(this.radioFeedbackGain);
    this.radioFeedbackGain.connect(this.radioDelayNode);

    // Sum Dry + Wet into Gain
    this.radioFilterNode.connect(this.radioGainNode);
    this.radioDelayNode.connect(this.radioGainNode);

    if (this.radioPannerNode) {
      this.radioGainNode.connect(this.radioPannerNode);
      this.radioPannerNode.connect(this.limiterNode); // Output to speakers
      this.radioPannerNode.connect(this.radioScopeGainNode);
    } else {
      this.radioGainNode.connect(this.limiterNode);
      this.radioGainNode.connect(this.radioScopeGainNode);
    }

    // Connect to Splitter for Scope visualization
    this.radioScopeGainNode.connect(this.splitterNode);
  }

  public getMediaStreamDestination(): MediaStreamAudioDestinationNode | null {
    return this.mediaStreamDest;
  }

  public setVideoStereoState(params: {
    points: Array<[number, number]>;
    audioBuffer?: AudioBuffer | null;
    playbackTime?: number;
    playbackRate?: number;
    visualMix?: number;
    audioModulation?: number;
    scanFreqHz?: number;
  }) {
    this.synthesisMode = 'video_stereo';
    if (params.points) this.videoTrajectoryPoints = params.points;
    if (params.audioBuffer !== undefined) this.videoAudioBuffer = params.audioBuffer;
    if (params.playbackTime !== undefined) {
      // If the difference is small (under 0.15s), don't snap the clock.
      // This allows the high-precision audio thread to keep streaming continuously without clicks!
      const diff = Math.abs(this.videoPlaybackTime - params.playbackTime);
      if (diff > 0.15) {
        this.videoPlaybackTime = params.playbackTime;
      }
    }
    if (params.playbackRate !== undefined) this.videoPlaybackRate = params.playbackRate;
    if (params.visualMix !== undefined) this.videoVisualMix = params.visualMix;
    if (params.audioModulation !== undefined) this.videoAudioModulation = params.audioModulation;
    if (params.scanFreqHz !== undefined) this.videoScanFreqHz = params.scanFreqHz;
  }

  public updateVideoTrajectoryPoints(points: Array<[number, number]>, playbackTime?: number) {
    this.videoTrajectoryPoints = points;
    if (playbackTime !== undefined) {
      const diff = Math.abs(this.videoPlaybackTime - playbackTime);
      if (diff > 0.15) {
        this.videoPlaybackTime = playbackTime;
      }
    }
  }

  public setFeedToScope(source: 'synthesizer' | 'radio' | 'mic1' | 'mic2', active: boolean) {
    if (source === 'synthesizer') {
      this.feedSynthesizerToScope = active;
      if (this.synthScopeGainNode && this.ctx) {
        this.synthScopeGainNode.gain.setValueAtTime(active ? 1.0 : 0.0, this.ctx.currentTime);
      }
    }
    if (source === 'radio') {
      this.feedRadioToScope = active;
      if (this.radioScopeGainNode && this.ctx) {
        this.radioScopeGainNode.gain.setValueAtTime(active ? 1 : 0, this.ctx.currentTime);
      }
    }
    if (source === 'mic1') {
      this.feedMic1ToScope = active;
      if (this.mic1ScopeGain && this.ctx) {
        this.mic1ScopeGain.gain.setValueAtTime(active ? 1 : 0, this.ctx.currentTime);
      }
    }
    if (source === 'mic2') {
      this.feedMic2ToScope = active;
      if (this.mic2ScopeGain && this.ctx) {
        this.mic2ScopeGain.gain.setValueAtTime(active ? 1 : 0, this.ctx.currentTime);
      }
    }
  }

  public setSegmentedChannels(x: SegmentedChannel, y: SegmentedChannel) {
    this.segmentedX = x;
    this.segmentedY = y;
  }

  public setCustomVectorPath(points: Array<[number, number]>, refreshHz: number = 60, colors?: string[]) {
    this.customVectorPoints = points;
    this.xyPoints = points;
    this.vectorRefreshHz = Math.max(10, Math.min(480, refreshHz));
    this.synthesisMode = 'vector_path';
    this.customVectorColors = colors || [];
  }

  public setAppMode(appMode: string) {
    this.appMode = appMode;
  }

  public updateTabChannels(channels: Record<string, { isPaused: boolean; isMuted: boolean }>) {
    this.tabChannelsState = channels;
  }

  public setSynthesisMode(mode: 'dual_channel' | 'segmented' | 'octa' | 'vector_path' | 'video_stereo') {
    this.synthesisMode = mode;
  }

  public getSynthesisMode(): string {
    return this.synthesisMode;
  }

  public getAudioContextState(): 'running' | 'suspended' | 'closed' | 'uninitialized' {
    if (!this.ctx) return 'uninitialized';
    return this.ctx.state;
  }

  public async toggleAudioState(): Promise<boolean> {
    this.initAudio();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
      this.isRunning = true;
      return true;
    } else if (this.ctx.state === 'running') {
      await this.ctx.suspend();
      this.isRunning = false;
      return false;
    }
    return false;
  }

  public async resumeContext(): Promise<void> {
    this.initAudio();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
      this.isRunning = true;
    }
  }

  public setMasterVolume(val: number) {
    if (this.masterGainNode && this.ctx) {
      this.masterGainNode.gain.setTargetAtTime(Math.max(0, Math.min(1.5, val)), this.ctx.currentTime, 0.02);
    }
  }

  public updateConfig(channel: 'x' | 'y', config: Partial<ChannelConfig>) {
    if (channel === 'x') {
      this.configX = { ...this.configX, ...config };
    } else {
      this.configY = { ...this.configY, ...config };
    }
  }

  public updateConfigX(config: Partial<ChannelConfig>) {
    this.configX = { ...this.configX, ...config };
  }

  public updateConfigY(config: Partial<ChannelConfig>) {
    this.configY = { ...this.configY, ...config };
  }

  public getOctaState(): OctaSystemState {
    return { ...this.octaState };
  }

  public setOctaState(state: OctaSystemState) {
    this.octaState = JSON.parse(JSON.stringify(state));
    this.synthesisMode = 'octa';
  }

  public updateOctaGenerator(id: GeneratorId, config: Partial<OctaGeneratorConfig>) {
    if (this.octaState.generators[id]) {
      this.octaState.generators[id] = {
        ...this.octaState.generators[id],
        ...config,
      };
      this.synthesisMode = 'octa';
    }
  }

  public updateOctaMixer(channel: 'L' | 'R', mixer: Partial<OctaMixerChannel>) {
    if (channel === 'L') {
      this.octaState.mixerLeft = { ...this.octaState.mixerLeft, ...mixer };
    } else {
      this.octaState.mixerRight = { ...this.octaState.mixerRight, ...mixer };
    }
    this.synthesisMode = 'octa';
  }

  public updateOctaTuning(tuningMode: TuningMode, masterFrequency?: number) {
    this.octaState.tuningMode = tuningMode;
    if (masterFrequency !== undefined) {
      this.octaState.masterFrequency = masterFrequency;
    }
    this.synthesisMode = 'octa';
  }

  public setOctaAutoNormalize(normalize: boolean) {
    this.octaState.autoNormalize = normalize;
  }

  public updateOctaModMatrix(routings: ModRouting[] | { routings: ModRouting[] }) {
    if (Array.isArray(routings)) {
      this.octaState.modulationMatrix = { routings };
    } else if (routings && Array.isArray((routings as any).routings)) {
      this.octaState.modulationMatrix = { routings: (routings as any).routings };
    }
    this.synthesisMode = 'octa';
  }

  public getConfig(channel: 'x' | 'y'): ChannelConfig {
    return channel === 'x' ? { ...this.configX } : { ...this.configY };
  }

  public getSampleRate(): number {
    return this.ctx ? this.ctx.sampleRate : 48000;
  }

  public getIsPlaying(): boolean {
    return this.isRunning && (this.ctx?.state === 'running');
  }

  public stopAudio(): void {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
      this.isRunning = false;
    }
  }

  /**
   * Internal high-fidelity sample synthesis loop (Generators / Synthesis)
   * Plays concurrently with Radio and Microphones!
   */
  private handleAudioProcess(e: AudioProcessingEvent) {
    const leftOut = e.outputBuffer.getChannelData(0);
    const rightOut = e.outputBuffer.getChannelData(1);
    const len = leftOut.length;
    const sampleRate = e.outputBuffer.sampleRate;
    const dt = 1 / sampleRate;

    const cfgX = this.configX;
    const cfgY = this.configY;

    const points: Array<[number, number]> = [];
    let localClipping = false;
    let sumSynthLevel = 0;

    // Solo/Mute logic
    const muteX = cfgX.mute || (cfgY.solo && !cfgX.solo);
    const muteY = cfgY.mute || (cfgX.solo && !cfgY.solo);

    const activeTab = this.tabChannelsState[this.appMode];
    const isTabPaused = activeTab ? activeTab.isPaused : false;
    const isTabMuted = activeTab ? activeTab.isMuted : false;

    // Extract active Octa state and routings once per audio block (Zero-allocation optimization)
    const octa = this.octaState;
    const gens = octa.generators;
    const tuning = octa.tuningMode;
    const masterF = octa.masterFrequency;
    const routings = octa.modulationMatrix?.routings || [];
    const activeRoutings = routings.filter((r) => r.enabled && Math.abs(r.depth) > 0.001);
    const hasLeftSolo = gens.L1.solo || gens.L2.solo || gens.L3.solo || gens.L4.solo;
    const hasRightSolo = gens.R1.solo || gens.R2.solo || gens.R3.solo || gens.R4.solo;

    // Sub-frame smoothing rate constant (tau = ~5ms)
    const smoothCoeff = 1 - Math.exp(-dt / 0.005);

    for (let i = 0; i < len; i++) {
      const t = isTabPaused
        ? this.properTimeElapsed
        : (this.relativisticEnabled ? this.properTimeElapsed : (this.timeElapsed + i * dt));
      let valX = 0;
      let valY = 0;

      if (this.synthesisMode === 'octa') {
        // Step 1: Reset modulation buffers without allocating new objects (Zero GC)
        for (let g = 0; g < 8; g++) {
          const gid = VectorAudioEngine.OCTA_IDS[g];
          this.octaFmOffsets[gid] = 0;
          this.octaAmFactors[gid] = 1.0;
        }

        // Step 2: Accumulate modulation offsets using coherent generator outputs from previous sample
        const numRoutings = activeRoutings.length;
        for (let r = 0; r < numRoutings; r++) {
          const route = activeRoutings[r];
          const srcVal = this.octaLastOutputs[route.sourceId] || 0;
          if (route.targetParam === 'fm') {
            this.octaFmOffsets[route.targetId] += srcVal * route.depth * 200;
          } else if (route.targetParam === 'am') {
            const amMod = Math.max(0, 1 + srcVal * route.depth);
            this.octaAmFactors[route.targetId] *= Math.min(2.0, amMod);
          }
        }

        // Step 3: Compute final modulated outputs with sub-frame parameter smoothing
        for (let g = 0; g < 8; g++) {
          const gid = VectorAudioEngine.OCTA_IDS[g];
          const gen = gens[gid];
          const isSoloChannel = gen.channel === 'L' ? hasLeftSolo : hasRightSolo;
          const targetActive = isSoloChannel
            ? (gen.solo ? 1.0 : 0.0)
            : (gen.enabled && !gen.mute ? 1.0 : 0.0);

          // Sub-frame smooth active state, gain, and amplitude
          this.smoothGenActive[gid] += (targetActive - this.smoothGenActive[gid]) * smoothCoeff;
          this.smoothGenGain[gid] += (gen.gain - this.smoothGenGain[gid]) * smoothCoeff;
          this.smoothGenAmp[gid] += (gen.amplitude - this.smoothGenAmp[gid]) * smoothCoeff;

          const curActive = this.smoothGenActive[gid];
          if (curActive > 0.0005) {
            const f0 = tuning === 'LOCKED' ? masterF : gen.baseFrequency;
            const baseEffectiveFreq = computeQuarterToneFreq(f0, gen.quarterToneOffset);
            const internalMod = gen.fmDepth > 0
              ? 1 + gen.fmDepth * Math.sin(2 * Math.PI * gen.fmRate * t)
              : 1;
            // Bound frequency safely below Nyquist
            const clampedFm = Math.max(-0.4 * sampleRate, Math.min(0.4 * sampleRate, this.octaFmOffsets[gid]));
            const instFreq = Math.max(1, Math.min(0.45 * sampleRate, (baseEffectiveFreq * internalMod) + clampedFm));

            if (!isTabPaused) {
              this.octaPhases[gid] = (this.octaPhases[gid] + 2 * Math.PI * instFreq * dt) % (2 * Math.PI);
            }

            const raw = evalWaveform(gen.waveform, this.octaPhases[gid] + (gen.phase * Math.PI) / 180, gen.customHarmonics);
            const effectiveAmp = this.smoothGenAmp[gid] * Math.min(2.5, this.octaAmFactors[gid]);
            const val = (raw * effectiveAmp * gen.polarity + gen.offset) * this.smoothGenGain[gid] * curActive;

            this.octaFinalVals[gid] = val;
            this.octaLastOutputs[gid] = val;
          } else {
            this.octaFinalVals[gid] = 0;
            this.octaLastOutputs[gid] = 0;
          }
        }

        // Step 4: Mix Left Bus (X) & Right Bus (Y) with continuous headroom scaling
        let sumL = this.octaFinalVals.L1 + this.octaFinalVals.L2 + this.octaFinalVals.L3 + this.octaFinalVals.L4;
        let sumR = this.octaFinalVals.R1 + this.octaFinalVals.R2 + this.octaFinalVals.R3 + this.octaFinalVals.R4;

        // Continuous energy-based normalization factor
        const activeWeightL = this.smoothGenActive.L1 + this.smoothGenActive.L2 + this.smoothGenActive.L3 + this.smoothGenActive.L4;
        const activeWeightR = this.smoothGenActive.R1 + this.smoothGenActive.R2 + this.smoothGenActive.R3 + this.smoothGenActive.R4;

        const targetNormL = octa.autoNormalize ? 1.0 / Math.max(1.0, Math.sqrt(activeWeightL)) : 1.0;
        const targetNormR = octa.autoNormalize ? 1.0 / Math.max(1.0, Math.sqrt(activeWeightR)) : 1.0;

        this.smoothNormScaleL += (targetNormL - this.smoothNormScaleL) * smoothCoeff;
        this.smoothNormScaleR += (targetNormR - this.smoothNormScaleR) * smoothCoeff;

        sumL *= this.smoothNormScaleL;
        sumR *= this.smoothNormScaleR;

        // Soft saturation curve ensures bus sums never clip hard
        sumL = Math.tanh(sumL * 0.85) * 1.05;
        sumR = Math.tanh(sumR * 0.85) * 1.05;

        if (octa.mixerLeft.invertPhase) sumL = -sumL;
        if (octa.mixerRight.invertPhase) sumR = -sumR;

        const targetMuteL = octa.mixerLeft.mute ? 0.0 : 1.0;
        const targetMuteR = octa.mixerRight.mute ? 0.0 : 1.0;
        this.smoothMixerGainL += (octa.mixerLeft.gain - this.smoothMixerGainL) * smoothCoeff;
        this.smoothMixerGainR += (octa.mixerRight.gain - this.smoothMixerGainR) * smoothCoeff;
        this.smoothMixerMuteL += (targetMuteL - this.smoothMixerMuteL) * smoothCoeff;
        this.smoothMixerMuteR += (targetMuteR - this.smoothMixerMuteR) * smoothCoeff;

        valX = sumL * this.smoothMixerGainL * this.smoothMixerMuteL;
        valY = sumR * this.smoothMixerGainR * this.smoothMixerMuteR;

      } else if (this.synthesisMode === 'segmented' && this.segmentedX && this.segmentedY) {
        valX = computeSegmentedSample(t, this.segmentedX);
        valY = computeSegmentedSample(t, this.segmentedY);
      } else if (this.synthesisMode === 'vector_path' && this.customVectorPoints.length > 0) {
        // Image or Animated Vector Text path streaming
        const N = this.customVectorPoints.length;
        const period = 1 / this.vectorRefreshHz;
        const normT = ((t % period) + period) % period;
        const fracPos = (normT / period) * N;
        const idx0 = Math.floor(fracPos) % N;
        const idx1 = (idx0 + 1) % N;
        const subFrac = fracPos - Math.floor(fracPos);

        const p0 = this.customVectorPoints[idx0];
        const p1 = this.customVectorPoints[idx1];
        const rawX = p0[0] + (p1[0] - p0[0]) * subFrac;
        const rawY = p0[1] + (p1[1] - p0[1]) * subFrac;

        // Blanking factor on jump: if scanner jumps too far, we damp the gain to prevent popping
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        let jumpBlanking = 1.0;
        if (dist > 0.15) {
          jumpBlanking = Math.max(0.0, 1.0 - (dist - 0.15) / 0.15);
        }

        // Color brightness modulation
        let colorBrightness = 1.0;
        if (this.customVectorColors && this.customVectorColors.length === N) {
          const c0 = this.customVectorColors[idx0];
          const c1 = this.customVectorColors[idx1];
          const b0 = this.getColorBrightness(c0);
          const b1 = this.getColorBrightness(c1);
          colorBrightness = b0 + (b1 - b0) * subFrac;
        } else if (this.customVectorColors && this.customVectorColors.length > 0) {
          const c0 = this.customVectorColors[idx0 % this.customVectorColors.length];
          colorBrightness = this.getColorBrightness(c0);
        }

        const ampX = (cfgX.amplitude !== undefined && cfgX.amplitude > 0) ? cfgX.amplitude : 0.8;
        const gainX = (cfgX.gain !== undefined && cfgX.gain > 0) ? cfgX.gain : 1.0;
        const ampY = (cfgY.amplitude !== undefined && cfgY.amplitude > 0) ? cfgY.amplitude : 0.8;
        const gainY = (cfgY.gain !== undefined && cfgY.gain > 0) ? cfgY.gain : 1.0;

        const totalModulation = colorBrightness * jumpBlanking;

        valX = muteX ? 0 : (rawX * ampX * cfgX.polarity + cfgX.offset) * gainX * totalModulation;
        valY = muteY ? 0 : (rawY * ampY * cfgY.polarity + cfgY.offset) * gainY * totalModulation;
      } else if (this.synthesisMode === 'video_stereo') {
        // Dual Audio-Visual Stereo Re-Synthesis (Mono Video -> Stereo Lissajous guided by visual)
        const N = this.videoTrajectoryPoints.length;
        let optX = 0;
        let optY = 0;
        if (N > 1) {
          const period = 1 / this.videoScanFreqHz;
          const normT = ((t % period) + period) % period;
          const fracPos = (normT / period) * N;
          const idx0 = Math.floor(fracPos) % N;
          const idx1 = (idx0 + 1) % N;
          const subFrac = fracPos - Math.floor(fracPos);

          const p0 = this.videoTrajectoryPoints[idx0];
          const p1 = this.videoTrajectoryPoints[idx1];
          optX = p0[0] + (p1[0] - p0[0]) * subFrac;
          optY = p0[1] + (p1[1] - p0[1]) * subFrac;
        } else {
          optX = Math.sin(2 * Math.PI * this.videoScanFreqHz * t);
          optY = Math.cos(2 * Math.PI * this.videoScanFreqHz * t);
        }

        // Fetch audio sample from decoded video audio buffer if loaded
        let audioSampleL = 0;
        let audioSampleR = 0;
        if (this.videoAudioBuffer) {
          const sRate = this.videoAudioBuffer.sampleRate;
          const bufLen = this.videoAudioBuffer.length;
          const playTime = Math.max(0, (this.videoPlaybackTime + (i * dt) * this.videoPlaybackRate) % this.videoAudioBuffer.duration);
          const sampleIdx = Math.floor(playTime * sRate) % bufLen;
          const chanL = this.videoAudioBuffer.getChannelData(0);
          audioSampleL = chanL[sampleIdx] || 0;
          if (this.videoAudioBuffer.numberOfChannels > 1) {
            const chanR = this.videoAudioBuffer.getChannelData(1);
            audioSampleR = chanR[sampleIdx] || 0;
          } else {
            audioSampleR = audioSampleL;
          }
        }

        const monoA = (audioSampleL + audioSampleR) * 0.5;
        const absA = Math.abs(monoA);
        const env = (1 - this.videoAudioModulation) + this.videoAudioModulation * Math.min(2.5, absA * 2.8);

        const rawX = (1 - this.videoVisualMix) * audioSampleL + this.videoVisualMix * optX * env;
        const rawY = (1 - this.videoVisualMix) * audioSampleR + this.videoVisualMix * optY * env;

        valX = muteX ? 0 : (rawX * cfgX.amplitude * cfgX.polarity + cfgX.offset) * cfgX.gain;
        valY = muteY ? 0 : (rawY * cfgY.amplitude * cfgY.polarity + cfgY.offset) * cfgY.gain;
      } else {
        // Standard dual-channel synth mode
        const modX = cfgX.fmDepth > 0
          ? 1 + cfgX.fmDepth * Math.sin(2 * Math.PI * cfgX.fmRate * t)
          : 1;
        const modY = cfgY.fmDepth > 0
          ? 1 + cfgY.fmDepth * Math.sin(2 * Math.PI * cfgY.fmRate * t)
          : 1;

        this.phaseAccumX += 2 * Math.PI * cfgX.frequency * modX * dt;
        this.phaseAccumY += 2 * Math.PI * cfgY.frequency * modY * dt;

        this.phaseAccumX %= 2 * Math.PI;
        this.phaseAccumY %= 2 * Math.PI;

        const currentPhaseX = this.phaseAccumX + (cfgX.phase * Math.PI) / 180;
        const currentPhaseY = this.phaseAccumY + (cfgY.phase * Math.PI) / 180;

        const rawValX = evalWaveform(cfgX.waveform, currentPhaseX, cfgX.customHarmonics);
        const rawValY = evalWaveform(cfgY.waveform, currentPhaseY, cfgY.customHarmonics);

        valX = muteX ? 0 : (rawValX * cfgX.amplitude * cfgX.polarity + cfgX.offset) * cfgX.gain;
        valY = muteY ? 0 : (rawValY * cfgY.amplitude * cfgY.polarity + cfgY.offset) * cfgY.gain;
      }

      // Additive Piano Perturbation
      if (this.pianoState.active || this.pianoState.currentAmp > 0.0001) {
        if (this.pianoState.currentAmp < this.pianoState.targetAmp) {
          this.pianoState.currentAmp = Math.min(this.pianoState.targetAmp, this.pianoState.currentAmp + 0.008); // Fast attack
        } else if (this.pianoState.currentAmp > this.pianoState.targetAmp) {
          this.pianoState.currentAmp = Math.max(this.pianoState.targetAmp, this.pianoState.currentAmp - 0.0008); // Smooth release
        }

        this.pianoState.phaseX += 2 * Math.PI * this.pianoState.freqX * dt;
        this.pianoState.phaseY += 2 * Math.PI * this.pianoState.freqY * dt;
        if (this.pianoState.phaseX > 2 * Math.PI) this.pianoState.phaseX -= 2 * Math.PI;
        if (this.pianoState.phaseY > 2 * Math.PI) this.pianoState.phaseY -= 2 * Math.PI;

        const pX = evalWaveform(this.pianoState.waveform, this.pianoState.phaseX, []) * this.pianoState.currentAmp;
        const pY = evalWaveform(this.pianoState.waveform, this.pianoState.phaseY, []) * this.pianoState.currentAmp;

        valX += pX;
        valY += pY;
        
        if (this.pianoState.currentAmp <= 0.0001 && this.pianoState.targetAmp === 0) {
          this.pianoState.active = false;
        }
      }

      // Sub-frame smooth tab gain transition (prevents clicks when pausing or muting tabs)
      const targetTabGain = isTabPaused || isTabMuted ? 0.0 : 1.0;
      this.smoothTabGain += (targetTabGain - this.smoothTabGain) * smoothCoeff;
      valX *= this.smoothTabGain;
      valY *= this.smoothTabGain;

      // Look-Ahead True-Peak Limiter: scans 96 samples (~2ms) ahead to ramp down gain
      // before peaks emerge, eliminating all digital transient clipping and popcorn noise.
      const [limitedX, limitedY] = this.processLookAheadLimiter(valX, valY, dt);

      // Clipping check on pre-limiter signal for UI telemetry
      if (Math.abs(valX) >= 0.99 || Math.abs(valY) >= 0.99) {
        localClipping = true;
      }

      // Smooth beam deflector plates inertia: acts as an analog reconstruction filter.
      // This eliminates 100% of the sharp infinite-slope "popcorn" crackling peaks
      // without affecting the beautiful geometric shapes on the scope.
      const alpha = 0.72;
      this.smoothValX = this.smoothValX * alpha + limitedX * (1 - alpha);
      this.smoothValY = this.smoothValY * alpha + limitedY * (1 - alpha);

      leftOut[i] = this.smoothValX;
      rightOut[i] = this.smoothValY;
      sumSynthLevel += this.smoothValX * this.smoothValX + this.smoothValY * this.smoothValY;

      // Store sample in visual buffer every few samples for responsive rendering
      if (i % 2 === 0) {
        points.push([this.smoothValX, this.smoothValY]);
      }

      if (this.relativisticEnabled) {
        // Calculate velocity of coordinates (change per sample dt)
        const dx = valX - this.prevValX;
        const dy = valY - this.prevValY;
        const velocity = Math.sqrt(dx * dx + dy * dy) / dt; // unitless speed per second
        
        // Speed of light limit
        const C = this.speedOfLightLimit;
        const beta = Math.min(0.999, velocity / C);
        const srFactor = Math.sqrt(1 - beta * beta); // proper time slows down at high velocity (SR)
        
        // General relativistic factor: time slows down near the high-energy center (gravity / confinement)
        const radialDist = Math.sqrt(valX * valX + valY * valY);
        const grFactor = Math.max(0.01, 1.0 - this.gravitationalDilationDepth * Math.max(0, 1.0 - radialDist));
        
        // Combined proper time increment
        const dTau = dt * srFactor * grFactor;
        if (!isTabPaused) {
          this.properTimeElapsed += dTau;
        }
      } else {
        // Keep properTimeElapsed synchronized with coordinate time
        if (!isTabPaused) {
          this.properTimeElapsed = this.timeElapsed + (i + 1) * dt;
        }
      }

      this.prevValX = valX;
      this.prevValY = valY;
    }

    if (!isTabPaused) {
      if (this.synthesisMode === 'video_stereo') {
        this.videoPlaybackTime += len * dt * this.videoPlaybackRate;
        if (this.videoAudioBuffer) {
          this.videoPlaybackTime %= this.videoAudioBuffer.duration;
        }
      }
      this.timeElapsed += len * dt;
    }
    this.xyPoints = points;
    this.levelSynthesizer = Math.min(1.0, Math.sqrt(sumSynthLevel / (len * 2)) * 2);

    if (localClipping) {
      this.hasClipping = true;
      if (this.onClippingWarning) {
        this.onClippingWarning();
      }
      clearTimeout(this.clippingResetTimer);
      this.clippingResetTimer = window.setTimeout(() => {
        this.hasClipping = false;
      }, 1500);
    }

    // Audio recording accumulator
    if (this.isRecording) {
      this.recordedChunksLeft.push(new Float32Array(leftOut));
      this.recordedChunksRight.push(new Float32Array(rightOut));
    }
  }

  public getHasClipping(): boolean {
    return this.hasClipping;
  }

  public updateBuffers() {
    if (!this.analyserX || !this.analyserY) return;

    this.analyserX.getFloatTimeDomainData(this.rawBufferX);
    this.analyserY.getFloatTimeDomainData(this.rawBufferY);

    this.analyserX.getByteFrequencyData(this.freqBufferX);
    this.analyserY.getByteFrequencyData(this.freqBufferY);

    // If vector path synthesis is active, maintain the high-precision vector points persistently
    if (this.synthesisMode === 'vector_path' && this.customVectorPoints && this.customVectorPoints.length > 0) {
      this.xyPoints = this.customVectorPoints;
      return;
    }

    // Compute active combined points from analysers if playing other modes
    const combinedPoints: Array<[number, number]> = [];
    const step = 2;
    let hasSignal = false;
    for (let i = 0; i < this.rawBufferX.length; i += step) {
      const px = this.rawBufferX[i];
      const py = this.rawBufferY[i];
      if (Math.abs(px) > 0.005 || Math.abs(py) > 0.005) {
        hasSignal = true;
      }
      combinedPoints.push([px, py]);
    }
    if (hasSignal && combinedPoints.length > 10) {
      this.xyPoints = combinedPoints;
    }
  }

  public getTelemetry(): {
    rmsX: number;
    rmsY: number;
    peakX: number;
    peakY: number;
  } {
    let sumX = 0;
    let sumY = 0;
    let peakX = 0;
    let peakY = 0;

    for (let i = 0; i < this.rawBufferX.length; i++) {
      const x = this.rawBufferX[i];
      const y = this.rawBufferY[i];
      sumX += x * x;
      sumY += y * y;
      const absX = Math.abs(x);
      const absY = Math.abs(y);
      if (absX > peakX) peakX = absX;
      if (absY > peakY) peakY = absY;
    }

    const rmsX = Math.sqrt(sumX / this.rawBufferX.length);
    const rmsY = Math.sqrt(sumY / this.rawBufferY.length);

    return { rmsX, rmsY, peakX, peakY };
  }

  // ==========================================
  // RADIO PLAYER ENGINE (CONCURRENT AUDIO)
  // ==========================================

  public async loadAudioFile(file: File): Promise<{ success: boolean; duration: number; name: string }> {
    await this.initAudio();
    if (!this.ctx) return { success: false, duration: 0, name: file.name };

    try {
      const arrayBuf = await file.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuf);
      this.importedBuffer = decoded;
      this.radioDuration = decoded.duration;
      this.radioPauseOffset = 0;

      // Start playing immediately through radio graph
      this.playRadioAudio(0);
      return { success: true, duration: decoded.duration, name: file.name };
    } catch (err) {
      console.error('Failed to decode audio file:', err);
      return { success: false, duration: 0, name: file.name };
    }
  }

  public playRadioAudio(startOffsetSec?: number) {
    if (!this.ctx || !this.importedBuffer || !this.radioFilterNode) return;

    if (this.importedSourceNode) {
      try {
        this.importedSourceNode.stop();
        this.importedSourceNode.disconnect();
      } catch (e) {}
      this.importedSourceNode = null;
    }

    const offset = startOffsetSec !== undefined ? startOffsetSec : this.radioPauseOffset;

    this.importedSourceNode = this.ctx.createBufferSource();
    this.importedSourceNode.buffer = this.importedBuffer;
    this.importedSourceNode.loop = true;
    this.importedSourceNode.playbackRate.setValueAtTime(this.radioTrackConfig.playbackRate, this.ctx.currentTime);

    // Connect source into Radio FX Chain
    this.importedSourceNode.connect(this.radioFilterNode);

    this.importedSourceNode.start(0, Math.max(0, offset % this.importedBuffer.duration));
    this.radioStartTime = this.ctx.currentTime - offset / this.radioTrackConfig.playbackRate;
    this.isPlayingImported = true;
    this.levelRadio = 0.6;
  }

  public pauseRadioAudio() {
    if (this.importedSourceNode && this.ctx) {
      const elapsed = (this.ctx.currentTime - this.radioStartTime) * this.radioTrackConfig.playbackRate;
      this.radioPauseOffset = this.importedBuffer ? elapsed % this.importedBuffer.duration : 0;
      try {
        this.importedSourceNode.stop();
        this.importedSourceNode.disconnect();
      } catch (e) {}
      this.importedSourceNode = null;
    }
    this.isPlayingImported = false;
    this.levelRadio = 0;
  }

  public stopRadioAudio() {
    this.pauseRadioAudio();
    this.radioPauseOffset = 0;
  }

  public seekRadioAudio(seconds: number) {
    if (!this.importedBuffer) return;
    const clamped = Math.max(0, Math.min(this.importedBuffer.duration, seconds));
    this.radioPauseOffset = clamped;
    if (this.isPlayingImported) {
      this.playRadioAudio(clamped);
    }
  }

  public getRadioCurrentTime(): number {
    if (!this.ctx || !this.importedBuffer) return 0;
    if (!this.isPlayingImported) return this.radioPauseOffset;
    const elapsed = (this.ctx.currentTime - this.radioStartTime) * this.radioTrackConfig.playbackRate;
    return elapsed % this.importedBuffer.duration;
  }

  public getRadioDuration(): number {
    return this.radioDuration;
  }

  public getIsRadioPlaying(): boolean {
    return this.isPlayingImported;
  }

  public updateRadioConfig(updates: Partial<RadioTrackConfig>) {
    this.radioTrackConfig = { ...this.radioTrackConfig, ...updates };
    if (!this.ctx) return;

    if (updates.volume !== undefined || updates.mute !== undefined) {
      const vol = this.radioTrackConfig.mute ? 0 : this.radioTrackConfig.volume;
      this.radioGainNode?.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.02);
    }

    if (updates.playbackRate !== undefined && this.importedSourceNode) {
      this.importedSourceNode.playbackRate.setTargetAtTime(updates.playbackRate, this.ctx.currentTime, 0.02);
    }

    if (updates.filterFrequency !== undefined && this.radioFilterNode) {
      this.radioFilterNode.frequency.setTargetAtTime(updates.filterFrequency, this.ctx.currentTime, 0.02);
    }

    if (updates.filterType !== undefined && this.radioFilterNode) {
      this.radioFilterNode.type = updates.filterType;
    }

    if (updates.echoDelay !== undefined && this.radioDelayNode) {
      this.radioDelayNode.delayTime.setTargetAtTime(updates.echoDelay, this.ctx.currentTime, 0.02);
    }

    if (updates.echoFeedback !== undefined && this.radioFeedbackGain) {
      this.radioFeedbackGain.gain.setTargetAtTime(updates.echoFeedback, this.ctx.currentTime, 0.02);
    }

    if (updates.pan !== undefined && this.radioPannerNode) {
      this.radioPannerNode.pan.setTargetAtTime(updates.pan, this.ctx.currentTime, 0.02);
    }
  }

  public getRadioConfig(): RadioTrackConfig {
    return { ...this.radioTrackConfig };
  }

  // ==========================================
  // DUAL MICROPHONE ENGINE
  // ==========================================

  public async startMicrophone(micId: 'mic1' | 'mic2', deviceId?: string): Promise<boolean> {
    await this.initAudio();
    if (!this.ctx || !this.splitterNode || !this.limiterNode) return false;

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const sourceNode = this.ctx.createMediaStreamSource(stream);

      // Gain Node
      const gainNode = this.ctx.createGain();
      // Delay (Echo) & Feedback
      const delayNode = this.ctx.createDelay(2.0);
      const feedbackGain = this.ctx.createGain();
      // Monitor Node ("Écouter le micro" into headphones/speakers)
      const monitorGain = this.ctx.createGain();
      // Scope feed
      const scopeGain = this.ctx.createGain();

      const config = micId === 'mic1' ? this.mic1Config : this.mic2Config;
      const feedToScope = micId === 'mic1' ? this.feedMic1ToScope : this.feedMic2ToScope;

      gainNode.gain.setValueAtTime(config.mute ? 0 : config.gain, this.ctx.currentTime);
      delayNode.delayTime.setValueAtTime(config.echoDelay, this.ctx.currentTime);
      feedbackGain.gain.setValueAtTime(config.echoFeedback, this.ctx.currentTime);
      monitorGain.gain.setValueAtTime(config.monitoring ? 1.0 : 0, this.ctx.currentTime);
      scopeGain.gain.setValueAtTime(feedToScope ? 1.0 : 0, this.ctx.currentTime);

      // Wire: Mic Source -> Delay loop & Gain
      sourceNode.connect(gainNode);
      gainNode.connect(delayNode);
      delayNode.connect(feedbackGain);
      feedbackGain.connect(delayNode);

      // Panner
      let panner: StereoPannerNode | null = null;
      if (this.ctx.createStereoPanner) {
        panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(config.stereoPan, this.ctx.currentTime);
        gainNode.connect(panner);
        delayNode.connect(panner);

        // Monitor connection (to speakers through limiter)
        panner.connect(monitorGain);
        monitorGain.connect(this.limiterNode);

        // Scope connection (to analyser splitter)
        panner.connect(scopeGain);
        scopeGain.connect(this.splitterNode);
      } else {
        gainNode.connect(monitorGain);
        delayNode.connect(monitorGain);
        monitorGain.connect(this.limiterNode);

        gainNode.connect(scopeGain);
        delayNode.connect(scopeGain);
        scopeGain.connect(this.splitterNode);
      }

      if (micId === 'mic1') {
        this.stopMicrophone('mic1');
        this.mic1Stream = stream;
        this.mic1SourceNode = sourceNode;
        this.mic1GainNode = gainNode;
        this.mic1DelayNode = delayNode;
        this.mic1FeedbackGain = feedbackGain;
        this.mic1MonitorGain = monitorGain;
        this.mic1PannerNode = panner;
        this.mic1ScopeGain = scopeGain;
        this.mic1Config.enabled = true;
      } else {
        this.stopMicrophone('mic2');
        this.mic2Stream = stream;
        this.mic2SourceNode = sourceNode;
        this.mic2GainNode = gainNode;
        this.mic2DelayNode = delayNode;
        this.mic2FeedbackGain = feedbackGain;
        this.mic2MonitorGain = monitorGain;
        this.mic2PannerNode = panner;
        this.mic2ScopeGain = scopeGain;
        this.mic2Config.enabled = true;
      }

      return true;
    } catch (err) {
      console.error(`Failed to start ${micId}:`, err);
      return false;
    }
  }

  public stopMicrophone(micId: 'mic1' | 'mic2') {
    if (micId === 'mic1') {
      this.mic1SourceNode?.disconnect();
      this.mic1Stream?.getTracks().forEach((t) => t.stop());
      this.mic1Stream = null;
      this.mic1SourceNode = null;
      this.mic1Config.enabled = false;
      this.levelMic1 = 0;
    } else {
      this.mic2SourceNode?.disconnect();
      this.mic2Stream?.getTracks().forEach((t) => t.stop());
      this.mic2Stream = null;
      this.mic2SourceNode = null;
      this.mic2Config.enabled = false;
      this.levelMic2 = 0;
    }
  }

  public updateMicrophoneConfig(micId: 'mic1' | 'mic2', updates: Partial<MicrophoneChannelConfig>) {
    const config = micId === 'mic1' ? this.mic1Config : this.mic2Config;
    Object.assign(config, updates);

    if (!this.ctx) return;

    const gainNode = micId === 'mic1' ? this.mic1GainNode : this.mic2GainNode;
    const monitorGain = micId === 'mic1' ? this.mic1MonitorGain : this.mic2MonitorGain;
    const delayNode = micId === 'mic1' ? this.mic1DelayNode : this.mic2DelayNode;
    const feedbackGain = micId === 'mic1' ? this.mic1FeedbackGain : this.mic2FeedbackGain;
    const panner = micId === 'mic1' ? this.mic1PannerNode : this.mic2PannerNode;

    if (updates.gain !== undefined || updates.mute !== undefined) {
      const g = config.mute ? 0 : config.gain;
      gainNode?.gain.setTargetAtTime(g, this.ctx.currentTime, 0.02);
    }

    if (updates.monitoring !== undefined) {
      monitorGain?.gain.setTargetAtTime(config.monitoring ? 1.0 : 0, this.ctx.currentTime, 0.02);
    }

    if (updates.echoDelay !== undefined && delayNode) {
      delayNode.delayTime.setTargetAtTime(config.echoDelay, this.ctx.currentTime, 0.02);
    }

    if (updates.echoFeedback !== undefined && feedbackGain) {
      feedbackGain.gain.setTargetAtTime(config.echoFeedback, this.ctx.currentTime, 0.02);
    }

    if (updates.stereoPan !== undefined && panner) {
      panner.pan.setTargetAtTime(config.stereoPan, this.ctx.currentTime, 0.02);
    }
  }

  public getMicrophoneConfig(micId: 'mic1' | 'mic2'): MicrophoneChannelConfig {
    return { ...(micId === 'mic1' ? this.mic1Config : this.mic2Config) };
  }

  public getIsMicActive(micId?: 'mic1' | 'mic2'): boolean {
    if (!micId) return this.mic1Config.enabled || this.mic2Config.enabled;
    return micId === 'mic1' ? this.mic1Config.enabled : this.mic2Config.enabled;
  }

  /**
   * Real-time audio recording
   */
  public startRecording() {
    this.recordedChunksLeft = [];
    this.recordedChunksRight = [];
    this.recordingStartTime = performance.now();
    this.isRecording = true;
  }

  public stopRecording(): {
    left: Float32Array;
    right: Float32Array;
    sampleRate: number;
    duration: number;
  } {
    this.isRecording = false;
    const duration = (performance.now() - this.recordingStartTime) / 1000;
    const sampleRate = this.getSampleRate();

    let totalLen = 0;
    for (const chunk of this.recordedChunksLeft) totalLen += chunk.length;

    const mergedLeft = new Float32Array(totalLen);
    const mergedRight = new Float32Array(totalLen);

    let offset = 0;
    for (let c = 0; c < this.recordedChunksLeft.length; c++) {
      mergedLeft.set(this.recordedChunksLeft[c], offset);
      mergedRight.set(this.recordedChunksRight[c], offset);
      offset += this.recordedChunksLeft[c].length;
    }

    return {
      left: mergedLeft,
      right: mergedRight,
      sampleRate,
      duration,
    };
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public setRelativisticSettings(enabled: boolean, speedOfLight: number, gravityDepth: number) {
    this.relativisticEnabled = enabled;
    this.speedOfLightLimit = speedOfLight;
    this.gravitationalDilationDepth = gravityDepth;
  }
}
