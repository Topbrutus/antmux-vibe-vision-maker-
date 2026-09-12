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
  createDefaultOctaSystem
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
  private synthesisMode: 'octa' | 'standard' | 'segmented' | 'vector_path' | 'video_stereo' = 'octa';
  private octaState: OctaSystemState = createDefaultOctaSystem();
  private segmentedX: SegmentedChannel | null = null;
  private segmentedY: SegmentedChannel | null = null;
  private customVectorPoints: Array<[number, number]> = [];
  private vectorRefreshHz: number = 60;

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

      // Routing: Processor -> Splitter (Analysers) & Limiter -> MasterGain -> Destination
      this.processorNode.connect(this.splitterNode);
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

  public setSynthesisMode(mode: 'octa' | 'standard' | 'segmented' | 'vector_path' | 'video_stereo') {
    this.synthesisMode = mode;
  }

  public getSynthesisMode(): 'octa' | 'standard' | 'segmented' | 'vector_path' | 'video_stereo' {
    return this.synthesisMode;
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
    if (params.playbackTime !== undefined) this.videoPlaybackTime = params.playbackTime;
    if (params.playbackRate !== undefined) this.videoPlaybackRate = params.playbackRate;
    if (params.visualMix !== undefined) this.videoVisualMix = params.visualMix;
    if (params.audioModulation !== undefined) this.videoAudioModulation = params.audioModulation;
    if (params.scanFreqHz !== undefined) this.videoScanFreqHz = params.scanFreqHz;
  }

  public updateVideoTrajectoryPoints(points: Array<[number, number]>, playbackTime?: number) {
    this.videoTrajectoryPoints = points;
    if (playbackTime !== undefined) this.videoPlaybackTime = playbackTime;
  }

  public setFeedToScope(source: 'synthesizer' | 'radio' | 'mic1' | 'mic2', active: boolean) {
    if (source === 'synthesizer') this.feedSynthesizerToScope = active;
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

  public setCustomVectorPath(points: Array<[number, number]>, refreshHz: number = 60) {
    this.customVectorPoints = points;
    this.vectorRefreshHz = Math.max(10, Math.min(480, refreshHz));
  }

  public async resumeContext(): Promise<void> {
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

  public updateOctaModMatrix(routingsOrConfig: ModRouting[] | { routings: ModRouting[] }) {
    const routings = Array.isArray(routingsOrConfig) ? routingsOrConfig : routingsOrConfig.routings;
    this.octaState.modulationMatrix = { routings };
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

    // If synthesizer scope feed is muted/disabled, zero out generator buffer
    if (!this.feedSynthesizerToScope) {
      for (let i = 0; i < len; i++) {
        leftOut[i] = 0;
        rightOut[i] = 0;
      }
      this.levelSynthesizer = 0;
      return;
    }

    const cfgX = this.configX;
    const cfgY = this.configY;

    const points: Array<[number, number]> = [];
    let localClipping = false;
    let sumSynthLevel = 0;

    // Solo/Mute logic
    const muteX = cfgX.mute || (cfgY.solo && !cfgX.solo);
    const muteY = cfgY.mute || (cfgX.solo && !cfgY.solo);

    for (let i = 0; i < len; i++) {
      const t = this.timeElapsed + i * dt;
      let valX = 0;
      let valY = 0;

      if (this.synthesisMode === 'octa') {
        const octa = this.octaState;
        const gens = octa.generators;
        const tuning = octa.tuningMode;
        const masterF = octa.masterFrequency;
        const routings = octa.modulationMatrix?.routings || [];
        const activeRoutings = routings.filter((r) => r.enabled && Math.abs(r.depth) > 0.001);

        // Step 1: Baseline unmodulated samples as sources
        const rawOuts: Record<GeneratorId, number> = {
          L1: computeOctaSample(t, gens.L1, tuning, masterF),
          L2: computeOctaSample(t, gens.L2, tuning, masterF),
          L3: computeOctaSample(t, gens.L3, tuning, masterF),
          L4: computeOctaSample(t, gens.L4, tuning, masterF),
          R1: computeOctaSample(t, gens.R1, tuning, masterF),
          R2: computeOctaSample(t, gens.R2, tuning, masterF),
          R3: computeOctaSample(t, gens.R3, tuning, masterF),
          R4: computeOctaSample(t, gens.R4, tuning, masterF),
        };

        // Step 2: Accumulate modulation offsets per generator
        const fmOffsets: Record<GeneratorId, number> = { L1: 0, L2: 0, L3: 0, L4: 0, R1: 0, R2: 0, R3: 0, R4: 0 };
        const amFactors: Record<GeneratorId, number> = { L1: 1, L2: 1, L3: 1, L4: 1, R1: 1, R2: 1, R3: 1, R4: 1 };

        if (activeRoutings.length > 0) {
          for (let r = 0; r < activeRoutings.length; r++) {
            const route = activeRoutings[r];
            const srcVal = rawOuts[route.sourceId] || 0;
            if (route.targetParam === 'fm') {
              fmOffsets[route.targetId] += srcVal * route.depth * 200;
            } else if (route.targetParam === 'am') {
              amFactors[route.targetId] *= Math.max(0, 1 + srcVal * route.depth);
            }
          }
        }

        // Step 3: Compute final modulated outputs for each generator
        const finalL1 = computeOctaSample(t, gens.L1, tuning, masterF, fmOffsets.L1, amFactors.L1);
        const finalL2 = computeOctaSample(t, gens.L2, tuning, masterF, fmOffsets.L2, amFactors.L2);
        const finalL3 = computeOctaSample(t, gens.L3, tuning, masterF, fmOffsets.L3, amFactors.L3);
        const finalL4 = computeOctaSample(t, gens.L4, tuning, masterF, fmOffsets.L4, amFactors.L4);

        const finalR1 = computeOctaSample(t, gens.R1, tuning, masterF, fmOffsets.R1, amFactors.R1);
        const finalR2 = computeOctaSample(t, gens.R2, tuning, masterF, fmOffsets.R2, amFactors.R2);
        const finalR3 = computeOctaSample(t, gens.R3, tuning, masterF, fmOffsets.R3, amFactors.R3);
        const finalR4 = computeOctaSample(t, gens.R4, tuning, masterF, fmOffsets.R4, amFactors.R4);

        // Mix Left Bus (X)
        const hasLeftSolo = gens.L1.solo || gens.L2.solo || gens.L3.solo || gens.L4.solo;
        let sumL = 0;
        let activeL = 0;
        const leftGens = [
          { gen: gens.L1, val: finalL1 },
          { gen: gens.L2, val: finalL2 },
          { gen: gens.L3, val: finalL3 },
          { gen: gens.L4, val: finalL4 },
        ];
        for (const item of leftGens) {
          const shouldPlay = hasLeftSolo ? item.gen.solo : (item.gen.enabled && !item.gen.mute);
          if (shouldPlay) {
            sumL += item.val;
            activeL++;
          }
        }
        if (octa.autoNormalize && activeL > 1) {
          sumL = Math.tanh(sumL * 0.75) * 1.05;
        }
        if (octa.mixerLeft.invertPhase) sumL = -sumL;
        valX = octa.mixerLeft.mute ? 0 : sumL * octa.mixerLeft.gain;

        // Mix Right Bus (Y)
        const hasRightSolo = gens.R1.solo || gens.R2.solo || gens.R3.solo || gens.R4.solo;
        let sumR = 0;
        let activeR = 0;
        const rightGens = [
          { gen: gens.R1, val: finalR1 },
          { gen: gens.R2, val: finalR2 },
          { gen: gens.R3, val: finalR3 },
          { gen: gens.R4, val: finalR4 },
        ];
        for (const item of rightGens) {
          const shouldPlay = hasRightSolo ? item.gen.solo : (item.gen.enabled && !item.gen.mute);
          if (shouldPlay) {
            sumR += item.val;
            activeR++;
          }
        }
        if (octa.autoNormalize && activeR > 1) {
          sumR = Math.tanh(sumR * 0.75) * 1.05;
        }
        if (octa.mixerRight.invertPhase) sumR = -sumR;
        valY = octa.mixerRight.mute ? 0 : sumR * octa.mixerRight.gain;

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

        valX = muteX ? 0 : (rawX * cfgX.amplitude * cfgX.polarity + cfgX.offset) * cfgX.gain;
        valY = muteY ? 0 : (rawY * cfgY.amplitude * cfgY.polarity + cfgY.offset) * cfgY.gain;
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

        if (this.phaseAccumX > 1e6) this.phaseAccumX %= 2 * Math.PI;
        if (this.phaseAccumY > 1e6) this.phaseAccumY %= 2 * Math.PI;

        const currentPhaseX = this.phaseAccumX + (cfgX.phase * Math.PI) / 180;
        const currentPhaseY = this.phaseAccumY + (cfgY.phase * Math.PI) / 180;

        const rawValX = evalWaveform(cfgX.waveform, currentPhaseX, cfgX.customHarmonics);
        const rawValY = evalWaveform(cfgY.waveform, currentPhaseY, cfgY.customHarmonics);

        valX = muteX ? 0 : (rawValX * cfgX.amplitude * cfgX.polarity + cfgX.offset) * cfgX.gain;
        valY = muteY ? 0 : (rawValY * cfgY.amplitude * cfgY.polarity + cfgY.offset) * cfgY.gain;
      }

      // Clipping check
      if (Math.abs(valX) >= 0.99 || Math.abs(valY) >= 0.99) {
        localClipping = true;
      }

      leftOut[i] = valX;
      rightOut[i] = valY;
      sumSynthLevel += valX * valX + valY * valY;

      // Store sample in visual buffer every few samples for responsive rendering
      if (i % 2 === 0) {
        points.push([valX, valY]);
      }
    }

    this.timeElapsed += len * dt;
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

    // Keep analyser/time-domain/FFT buffers synchronized with the live Web Audio graph.
    this.updateBuffers();
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

    // Compute active combined points from analysers if playing
    const combinedPoints: Array<[number, number]> = [];
    const step = 2;
    for (let i = 0; i < this.rawBufferX.length; i += step) {
      combinedPoints.push([this.rawBufferX[i], this.rawBufferY[i]]);
    }
    if (combinedPoints.length > 10) {
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
}
