import {
  ChannelConfig,
  PresetName,
  MandalaLayer,
  MandalaCombineMode,
  SegmentedChannel,
  GeneratorSegmentConfig,
  OctaGeneratorConfig,
  OctaSystemState,
  TuningMode,
  GeneratorId,
  ZoneKey,
  ModRouting,
  ModMatrixConfig
} from '../types/vectorScope';

export function evalWaveform(
  type: string,
  phaseRad: number,
  customHarmonics: number[] = [1, 0, 0, 0, 0, 0, 0, 0]
): number {
  const normPhase = ((phaseRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  switch (type) {
    case 'sine':
      return Math.sin(normPhase);
    case 'cosine':
      return Math.cos(normPhase);
    case 'triangle': {
      // Periodic triangle wave from -1 to 1
      const p = normPhase / (2 * Math.PI);
      return 4 * Math.abs(p - Math.floor(p + 0.75) + 0.25) - 1;
    }
    case 'square':
      return normPhase < Math.PI ? 1 : -1;
    case 'sawtooth_up':
      return (normPhase / Math.PI) - 1;
    case 'sawtooth_down':
      return 1 - (normPhase / Math.PI);
    case 'noise':
      return (Math.random() * 2 - 1);
    case 'custom': {
      let sum = 0;
      let totalWeight = 0;
      for (let h = 0; h < customHarmonics.length; h++) {
        const weight = customHarmonics[h] ?? 0;
        if (weight > 0) {
          sum += weight * Math.sin((h + 1) * normPhase);
          totalWeight += weight;
        }
      }
      return totalWeight > 0 ? sum / totalWeight : Math.sin(normPhase);
    }
    default:
      return Math.sin(normPhase);
  }
}

/**
 * Evaluate single segment sample at time t
 */
export function evalSegmentSample(t: number, baseFreq: number, seg: GeneratorSegmentConfig): number {
  if (!seg.enabled) return 0;
  const mod = seg.fmDepth > 0 ? 1 + seg.fmDepth * Math.sin(2 * Math.PI * seg.fmRate * t) : 1;
  const freq = baseFreq * seg.frequencyRatio * mod;
  const phase = 2 * Math.PI * freq * t + (seg.phase * Math.PI) / 180;
  const raw = evalWaveform(seg.waveform, phase);
  return (raw * seg.amplitude + seg.offset);
}

/**
 * High-performance Segmented Waveform Synthesis (4-Gen & 8-Gen)
 * Supports 'segmented' (time-slice) or 'layered', with 'hard_split' vs 'smooth_split' and crossfade
 */
export function computeSegmentedSample(t: number, channel: SegmentedChannel): number {
  const activeSegments = channel.segments.filter((s) => s.enabled);
  if (activeSegments.length === 0) return 0;

  if (channel.mixMode === 'layered') {
    let sum = 0;
    for (const seg of activeSegments) {
      sum += evalSegmentSample(t, channel.baseFrequency, seg);
    }
    return sum / Math.max(1, Math.sqrt(activeSegments.length));
  }

  // Segmented mode: divide base period T into N segments
  const baseFreq = Math.max(1, channel.baseFrequency);
  const period = 1 / baseFreq;
  const normPhase = ((t % period) + period) % period; // 0..period
  const phaseFrac = normPhase / period; // 0..1

  const N = activeSegments.length;
  const segWidth = 1 / N;
  const rawIdx = Math.floor(phaseFrac / segWidth);
  const currentIdx = Math.min(N - 1, Math.max(0, rawIdx));
  const nextIdx = (currentIdx + 1) % N;

  const currentVal = evalSegmentSample(t, channel.baseFrequency, activeSegments[currentIdx]);

  // If hard split without crossfade
  const xfadeWidth = channel.splitMode === 'smooth_split' ? Math.max(0.1, channel.crossfade) : channel.crossfade;
  if (xfadeWidth <= 0.001) {
    return currentVal;
  }

  // Check if near boundary
  const localFrac = (phaseFrac - currentIdx * segWidth) / segWidth; // 0..1 inside segment
  const boundaryDist = 1 - localFrac;

  if (boundaryDist < xfadeWidth) {
    const nextVal = evalSegmentSample(t, channel.baseFrequency, activeSegments[nextIdx]);
    // Smooth cosine crossfade
    const blendFactor = (xfadeWidth - boundaryDist) / xfadeWidth; // 0..1
    const smoothWeight = 0.5 * (1 - Math.cos(Math.PI * blendFactor));
    return currentVal * (1 - smoothWeight) + nextVal * smoothWeight;
  }

  return currentVal;
}

/**
 * Generate XY points from segmented X & Y channels
 */
export function generateSegmentedXYPoints(
  channelX: SegmentedChannel,
  channelY: SegmentedChannel,
  numPoints: number = 512
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const dt = 1 / 48000;
  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;
    const x = computeSegmentedSample(t, channelX);
    const y = computeSegmentedSample(t, channelY);
    points.push([Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]);
  }
  return points;
}

export function computeSampleXY(
  t: number,
  configX: ChannelConfig,
  configY: ChannelConfig
): [number, number] {
  // FM modulation on frequency if depth > 0
  const modX = configX.fmDepth > 0
    ? 1 + configX.fmDepth * Math.sin(2 * Math.PI * configX.fmRate * t)
    : 1;
  const modY = configY.fmDepth > 0
    ? 1 + configY.fmDepth * Math.sin(2 * Math.PI * configY.fmRate * t)
    : 1;

  const phaseX = 2 * Math.PI * configX.frequency * modX * t + (configX.phase * Math.PI) / 180;
  const phaseY = 2 * Math.PI * configY.frequency * modY * t + (configY.phase * Math.PI) / 180;

  const rawX = evalWaveform(configX.waveform, phaseX, configX.customHarmonics);
  const rawY = evalWaveform(configY.waveform, phaseY, configY.customHarmonics);

  const outX = configX.mute ? 0 : (rawX * configX.amplitude * configX.polarity + configX.offset) * configX.gain;
  const outY = configY.mute ? 0 : (rawY * configY.amplitude * configY.polarity + configY.offset) * configY.gain;

  return [outX, outY];
}

/**
 * Rose curve mathematical formula: r(theta) = cos(k * theta)
 * X = r * cos(theta), Y = r * sin(theta)
 */
export function computeRosePoint(
  theta: number,
  k: number,
  amplitude: number = 1,
  rotationRad: number = 0
): [number, number] {
  const r = amplitude * Math.cos(k * theta);
  const x = r * Math.cos(theta + rotationRad);
  const y = r * Math.sin(theta + rotationRad);
  return [x, y];
}

/**
 * Generates an array of Lissajous (X, Y) points
 */
export function generateLissajousPoints(
  freqX: number,
  freqY: number,
  phaseXDeg: number = 0,
  phaseYDeg: number = 90,
  numPoints: number = 512,
  ampX: number = 0.8,
  ampY: number = 0.8
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const radX = (phaseXDeg * Math.PI) / 180;
  const radY = (phaseYDeg * Math.PI) / 180;
  const dt = 1 / 48000;
  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;
    const x = ampX * Math.sin(2 * Math.PI * freqX * t + radX);
    const y = ampY * Math.sin(2 * Math.PI * freqY * t + radY);
    points.push([x, y]);
  }
  return points;
}

/**
 * Generates an array of points for any PresetName
 */
export function generatePresetPoints(
  presetName: PresetName,
  numPoints: number = 512,
  amplitude: number = 0.85
): Array<[number, number]> {
  switch (presetName) {
    case 'Circle':
      return generateLissajousPoints(220, 220, 0, 90, numPoints, amplitude, amplitude);
    case 'Ellipse':
      return generateLissajousPoints(220, 220, 0, 90, numPoints, amplitude, amplitude * 0.55);
    case 'Line':
      return generateLissajousPoints(220, 220, 0, 0, numPoints, amplitude, amplitude);
    case 'Lissajous':
      return generateLissajousPoints(220, 330, 0, 45, numPoints, amplitude, amplitude);
    case 'Spiral': {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < numPoints; i++) {
        const theta = (i / numPoints) * 6 * Math.PI;
        const r = (i / numPoints) * amplitude;
        pts.push([r * Math.cos(theta), r * Math.sin(theta)]);
      }
      return pts;
    }
    case 'Rose':
    case 'Rose Three':
      return generateRosePoints(3, numPoints, amplitude);
    case 'Rose Five':
      return generateRosePoints(5, numPoints, amplitude);
    case 'Rose Seven':
      return generateRosePoints(7, numPoints, amplitude);
    case 'Rose Nine':
      return generateRosePoints(9, numPoints, amplitude);
    case 'Genesis Mandala': {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < numPoints; i++) {
        const theta = (i / numPoints) * 2 * Math.PI;
        const r1 = 0.5 * Math.sin(6 * theta);
        const r2 = 0.3 * Math.cos(12 * theta);
        const r = (0.4 + r1 + r2) * amplitude;
        pts.push([r * Math.cos(theta), r * Math.sin(theta)]);
      }
      return pts;
    }
    default:
      return generateLissajousPoints(220, 220, 0, 90, numPoints, amplitude, amplitude);
  }
}

/**
 * Generates an array of Rose curve points
 */
export function generateRosePoints(
  k: number = 3,
  numPoints: number = 512,
  amplitude: number = 0.85,
  rotationRad: number = 0
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < numPoints; i++) {
    const theta = (i / numPoints) * 2 * Math.PI * (k % 2 === 0 ? 2 : 1);
    points.push(computeRosePoint(theta, k, amplitude, rotationRad));
  }
  return points;
}

/**
 * Generates an array of Mandala points
 */
export function generateMandalaPoints(
  layers: MandalaLayer[],
  mode: MandalaCombineMode = 'TIME_MULTIPLEX',
  numPoints: number = 512
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const dt = 1 / 48000;
  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;
    points.push(computeMandalaPoint(t, layers, mode));
  }
  return points;
}

/**
 * Generates an array of Vortex points
 */
export function generateVortexPoints(
  params: {
    baseFreq: number;
    decaySpiral: number;
    radialModDepth: number;
    radialModFreq: number;
    phaseDrift: number;
    rotationRate: number;
    mandalaMorph: number;
    kPetals: number;
  },
  numPoints: number = 512
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const dt = 1 / 48000;
  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;
    points.push(computeVortexPoint(t, params));
  }
  return points;
}

/**
 * Mandala multi-layer computation
 */
export function computeMandalaPoint(
  t: number,
  layers: MandalaLayer[],
  mode: MandalaCombineMode
): [number, number] {
  const activeLayers = layers.filter((l) => l.enabled);
  if (activeLayers.length === 0) return [0, 0];

  if (mode === 'TIME_MULTIPLEX') {
    // Rapid switching between active layers at high rate (e.g. 240Hz per layer)
    // The phosphor screen persistence creates the optical overlay!
    const cycleFreq = 180; // switches 180 times per second
    const layerIdx = Math.floor(t * cycleFreq) % activeLayers.length;
    const l = activeLayers[layerIdx];
    return computeLayerPoint(t, l);
  }

  if (mode === 'ADD') {
    let sumX = 0;
    let sumY = 0;
    for (const l of activeLayers) {
      const [lx, ly] = computeLayerPoint(t, l);
      sumX += lx;
      sumY += ly;
    }
    const norm = Math.max(1, Math.sqrt(activeLayers.length));
    return [sumX / norm, sumY / norm];
  }

  if (mode === 'MULTIPLY') {
    let mulX = 1;
    let mulY = 1;
    for (const l of activeLayers) {
      const [lx, ly] = computeLayerPoint(t, l);
      mulX *= lx;
      mulY *= ly;
    }
    return [mulX, mulY];
  }

  if (mode === 'MORPH') {
    // Smooth cross-fade over time between consecutive layers
    const period = 4; // 4 seconds cycle
    const cycle = (t % (activeLayers.length * period)) / period;
    const idxA = Math.floor(cycle) % activeLayers.length;
    const idxB = (idxA + 1) % activeLayers.length;
    const blend = cycle - Math.floor(cycle);
    const [xa, ya] = computeLayerPoint(t, activeLayers[idxA]);
    const [xb, yb] = computeLayerPoint(t, activeLayers[idxB]);
    return [xa * (1 - blend) + xb * blend, ya * (1 - blend) + yb * blend];
  }

  // SEQUENCE mode: play one layer then the next according to duration
  let totalDur = 0;
  for (const l of activeLayers) totalDur += l.duration;
  const loopT = totalDur > 0 ? t % totalDur : 0;
  let accum = 0;
  for (const l of activeLayers) {
    if (loopT >= accum && loopT < accum + l.duration) {
      return computeLayerPoint(t, l);
    }
    accum += l.duration;
  }
  return computeLayerPoint(t, activeLayers[0]);
}

function computeLayerPoint(t: number, layer: MandalaLayer): [number, number] {
  const theta = 2 * Math.PI * layer.frequency * t + (layer.phase * Math.PI) / 180;
  const rot = (layer.rotation * Math.PI) / 180;

  switch (layer.shape) {
    case 'circle': {
      const x = layer.amplitude * Math.cos(theta);
      const y = layer.amplitude * Math.sin(theta * layer.ratio);
      return [
        x * Math.cos(rot) - y * Math.sin(rot),
        x * Math.sin(rot) + y * Math.cos(rot),
      ];
    }
    case 'rose': {
      return computeRosePoint(theta, layer.k, layer.amplitude, rot);
    }
    case 'spiral': {
      const r = layer.amplitude * ((theta % (6 * Math.PI)) / (6 * Math.PI));
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      return [
        x * Math.cos(rot) - y * Math.sin(rot),
        x * Math.sin(rot) + y * Math.cos(rot),
      ];
    }
    case 'lissajous': {
      const x = layer.amplitude * Math.cos(theta);
      const y = layer.amplitude * Math.sin(theta * layer.ratio + (layer.phase * Math.PI) / 180);
      return [
        x * Math.cos(rot) - y * Math.sin(rot),
        x * Math.sin(rot) + y * Math.cos(rot),
      ];
    }
    default:
      return [Math.cos(theta) * layer.amplitude, Math.sin(theta) * layer.amplitude];
  }
}

/**
 * Vortex Transformation calculation
 * Geometric / audio trajectory mapping:
 * r(t) = a * exp(b * theta) or Archimedean + radial modulation
 */
export function computeVortexPoint(
  t: number,
  params: {
    baseFreq: number;
    decaySpiral: number; // spiral growth factor
    radialModDepth: number;
    radialModFreq: number;
    phaseDrift: number;
    rotationRate: number;
    mandalaMorph: number; // 0..1 morph towards rosette
    kPetals: number;
  }
): [number, number] {
  const theta = 2 * Math.PI * params.baseFreq * t + params.phaseDrift * t;
  const rotation = params.rotationRate * 2 * Math.PI * t;

  // Base radius with spiral modulation
  const normTheta = (theta % (4 * Math.PI));
  const spiralR = 0.2 + 0.8 * (normTheta / (4 * Math.PI)) * params.decaySpiral + (1 - params.decaySpiral) * 0.8;

  // Radial modulation (ripples)
  const ripple = 1 + params.radialModDepth * Math.sin(params.radialModFreq * theta);

  // Rosette component for morphing
  const roseR = Math.cos(params.kPetals * theta);

  const effectiveR = (spiralR * (1 - params.mandalaMorph) + Math.abs(roseR) * params.mandalaMorph) * ripple;

  const rawX = effectiveR * Math.cos(theta);
  const rawY = effectiveR * Math.sin(theta);

  // Apply visual rotation
  const x = rawX * Math.cos(rotation) - rawY * Math.sin(rotation);
  const y = rawX * Math.sin(rotation) + rawY * Math.cos(rotation);

  return [x, y];
}

/**
 * Autocorrelation to estimate fundamental frequency from time-domain buffer
 */
export function estimateFundamental(
  buffer: Float32Array,
  sampleRate: number,
  minFreq: number = 30,
  maxFreq: number = 3000
): number {
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);
  const n = buffer.length;

  let bestPeriod = -1;
  let maxCorr = -1;

  for (let tau = minPeriod; tau <= maxPeriod; tau++) {
    let corr = 0;
    for (let i = 0; i < n - tau; i++) {
      corr += buffer[i] * buffer[i + tau];
    }
    if (corr > maxCorr) {
      maxCorr = corr;
      bestPeriod = tau;
    }
  }

  if (bestPeriod > 0 && maxCorr > 0.01) {
    return Math.round(sampleRate / bestPeriod);
  }
  return 0;
}

/**
 * Find dominant peaks in FFT array
 */
export function findSpectralPeaks(
  freqData: Uint8Array | Float32Array,
  sampleRate: number,
  fftSize: number,
  maxPeaks: number = 5
): Array<{ freq: number; amp: number; ratio: number }> {
  const binCount = freqData.length;
  const binWidth = sampleRate / fftSize;
  const peaks: Array<{ bin: number; amp: number; freq: number }> = [];

  for (let i = 2; i < binCount - 2; i++) {
    const val = freqData[i];
    if (val > freqData[i - 1] && val > freqData[i + 1] && val > (typeof val === 'number' && val > -90 ? -80 : 20)) {
      peaks.push({
        bin: i,
        amp: typeof val === 'number' ? (val < 0 ? (val + 100) / 100 : val / 255) : 0,
        freq: Math.round(i * binWidth),
      });
    }
  }

  peaks.sort((a, b) => b.amp - a.amp);
  const top = peaks.slice(0, maxPeaks);
  if (top.length === 0) return [];

  const fundamental = top[0].freq;
  return top.map((p) => ({
    freq: p.freq,
    amp: Math.min(1, Math.max(0, p.amp)),
    ratio: fundamental > 0 ? parseFloat((p.freq / fundamental).toFixed(2)) : 1,
  }));
}

/**
 * Calculate Pearson correlation r between two synchronized buffers
 */
export function calculatePearsonCorrelation(x: Float32Array | number[], y: Float32Array | number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  let meanX = 0;
  let meanY = 0;
  for (let i = 0; i < n; i++) {
    meanX += x[i];
    meanY += y[i];
  }
  meanX /= n;
  meanY /= n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

/**
 * Compare Calculated trajectory against Measured trajectory
 */
export function computeTrajectoryComparison(
  calc: Array<[number, number]>,
  meas: Array<[number, number]>
) {
  const n = Math.min(calc.length, meas.length);
  if (n === 0) {
    return {
      errorX: 0,
      errorY: 0,
      correlation: 0,
      phaseDifferenceDeg: 0,
      rmsDifferenceDb: 0,
      spectralDifference: 0,
    };
  }

  let sumErrX2 = 0;
  let sumErrY2 = 0;
  let sumCalcRms = 0;
  let sumMeasRms = 0;

  const xsCalc = new Float32Array(n);
  const ysCalc = new Float32Array(n);
  const xsMeas = new Float32Array(n);
  const ysMeas = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const [cx, cy] = calc[i];
    const [mx, my] = meas[i];

    xsCalc[i] = cx;
    ysCalc[i] = cy;
    xsMeas[i] = mx;
    ysMeas[i] = my;

    const dx = cx - mx;
    const dy = cy - my;
    sumErrX2 += dx * dx;
    sumErrY2 += dy * dy;

    sumCalcRms += cx * cx + cy * cy;
    sumMeasRms += mx * mx + my * my;
  }

  const mseX = sumErrX2 / n;
  const mseY = sumErrY2 / n;
  const corrX = calculatePearsonCorrelation(xsCalc, xsMeas);
  const corrY = calculatePearsonCorrelation(ysCalc, ysMeas);
  const avgCorr = (corrX + corrY) / 2;

  const rmsCalc = Math.sqrt(sumCalcRms / (2 * n));
  const rmsMeas = Math.sqrt(sumMeasRms / (2 * n));
  const diffDb = Math.abs(20 * Math.log10((rmsCalc + 1e-6) / (rmsMeas + 1e-6)));

  // Phase diff estimate using dot product & cross product
  let dot = 0;
  let cross = 0;
  for (let i = 0; i < n; i++) {
    dot += xsCalc[i] * xsMeas[i] + ysCalc[i] * ysMeas[i];
    cross += xsCalc[i] * ysMeas[i] - ysCalc[i] * xsMeas[i];
  }
  const phaseDiffDeg = (Math.atan2(cross, dot) * 180) / Math.PI;

  return {
    errorX: Math.sqrt(mseX),
    errorY: Math.sqrt(mseY),
    correlation: avgCorr,
    phaseDifferenceDeg: phaseDiffDeg,
    rmsDifferenceDb: diffDb,
    spectralDifference: Math.abs(mseX - mseY),
  };
}

/**
 * Generate SVG Path string from points
 */
export function exportPointsToSvg(
  points: Array<[number, number]>,
  width: number = 800,
  height: number = 800,
  scopeColor: string = '#00f5d4'
): string {
  if (points.length === 0) return '';
  const cx = width / 2;
  const cy = height / 2;
  const scale = (Math.min(width, height) / 2) * 0.85;

  let d = '';
  for (let i = 0; i < points.length; i++) {
    const x = cx + points[i][0] * scale;
    const y = cy - points[i][1] * scale; // inverted Y for standard cartesian
    if (i === 0) {
      d += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
    } else {
      d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- GENESIS VECTOR SCOPE VECTOR EXPORT -->
  <rect width="100%" height="100%" fill="#060c18" />
  <!-- Reticle Grid -->
  <circle cx="${cx}" cy="${cy}" r="${scale * 0.25}" fill="none" stroke="#102a45" stroke-width="1" stroke-dasharray="4,4" />
  <circle cx="${cx}" cy="${cy}" r="${scale * 0.5}" fill="none" stroke="#102a45" stroke-width="1" stroke-dasharray="4,4" />
  <circle cx="${cx}" cy="${cy}" r="${scale * 0.75}" fill="none" stroke="#102a45" stroke-width="1" stroke-dasharray="4,4" />
  <circle cx="${cx}" cy="${cy}" r="${scale}" fill="none" stroke="#18385c" stroke-width="1.5" />
  <line x1="${cx}" y1="0" x2="${cx}" y2="${height}" stroke="#18385c" stroke-width="1" />
  <line x1="0" y1="${cy}" x2="${width}" y2="${cy}" stroke="#18385c" stroke-width="1" />
  <!-- Phosphor Glow Path -->
  <path d="${d}" fill="none" stroke="${scopeColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.4" filter="blur(3px)" />
  <path d="${d}" fill="none" stroke="${scopeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
}

/**
 * Generate CSV data from points
 */
export function exportPointsToCsv(
  points: Array<[number, number]>,
  sampleRate: number = 48000
): string {
  let csv = 'index,time_sec,left_x,right_y\n';
  const dt = 1 / sampleRate;
  for (let i = 0; i < points.length; i++) {
    const t = (i * dt).toFixed(7);
    csv += `${i},${t},${points[i][0].toFixed(6)},${points[i][1].toFixed(6)}\n`;
  }
  return csv;
}

/**
 * Simple checksum algorithm (CRC32-like hex string)
 */
export function computeChecksum(strOrBuffer: string | Uint8Array): string {
  let hash = 0x811c9dc5;
  if (typeof strOrBuffer === 'string') {
    for (let i = 0; i < strOrBuffer.length; i++) {
      hash ^= strOrBuffer.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
  } else {
    for (let i = 0; i < strOrBuffer.length; i++) {
      hash ^= strOrBuffer[i];
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
  }
  return ('0000000' + (hash >>> 0).toString(16)).slice(-8).toUpperCase();
}

/**
 * Computes exact frequency shifted by quarter-tones (50 cents each).
 * Formula: f(n) = f0 * 2^(n / 24)
 * n = 0 => f0
 * n = +1 => +1 quarter-tone (50 cents)
 * n = -1 => -1 quarter-tone (-50 cents)
 * n = +2 => +1 semitone (100 cents)
 */
export function computeQuarterToneFreq(baseFreq: number, quarterToneOffset: number): number {
  return baseFreq * Math.pow(2, quarterToneOffset / 24);
}

/**
 * Returns human-readable musical pitch description of quarter-tone offset
 */
export function getQuarterToneLabel(offset: number): string {
  if (offset === 0) return '0 (Central)';
  const sign = offset > 0 ? '+' : '';
  const cents = offset * 50;
  if (offset % 2 === 0) {
    const semitones = offset / 2;
    return `${sign}${semitones} demi-ton${Math.abs(semitones) > 1 ? 's' : ''} (${sign}${cents} cents)`;
  }
  const quarterTones = offset;
  return `${sign}${quarterTones} quart${Math.abs(quarterTones) > 1 ? 's' : ''} de ton (${sign}${cents} cents)`;
}

/**
 * Computes instantaneous sample value for a single Octa generator
 * with optional FM and AM modulation offsets injected from the modulation matrix.
 */
export function computeOctaSample(
  t: number,
  gen: OctaGeneratorConfig,
  tuningMode: TuningMode,
  masterFrequency: number,
  fmModOffset: number = 0,
  amModFactor: number = 1.0
): number {
  if (!gen.enabled || gen.mute) return 0;

  const f0 = tuningMode === 'LOCKED' ? masterFrequency : gen.baseFrequency;
  const baseEffectiveFreq = computeQuarterToneFreq(f0, gen.quarterToneOffset);

  // Internal LFO FM
  const internalMod = gen.fmDepth > 0
    ? 1 + gen.fmDepth * Math.sin(2 * Math.PI * gen.fmRate * t)
    : 1;

  // Total effective frequency including external matrix FM offset
  const effectiveFreq = Math.max(1, (baseEffectiveFreq * internalMod) + fmModOffset);

  const phaseRad = 2 * Math.PI * effectiveFreq * t + (gen.phase * Math.PI) / 180;
  const raw = evalWaveform(gen.waveform, phaseRad, gen.customHarmonics);

  // Calculate amplitude including matrix AM factor (clamped >= 0)
  const effectiveAmp = Math.max(0, gen.amplitude * amModFactor);

  return (raw * effectiveAmp * gen.polarity + gen.offset) * gen.gain;
}

/**
 * Factory for initial 8-generator system state (All generators, gains, and modulations start at zero by default)
 */
export function createDefaultOctaSystem(): OctaSystemState {
  return {
    tuningMode: 'LOCKED',
    masterFrequency: 0,
    autoNormalize: true,
    mixerLeft: {
      gain: 0,
      mute: false,
      solo: false,
      invertPhase: false,
    },
    mixerRight: {
      gain: 0,
      mute: false,
      solo: false,
      invertPhase: false,
    },
    modulationMatrix: {
      routings: [],
    },
    generators: {
      L1: {
        id: 'L1',
        name: 'Générateur L1',
        zoneKey: 'A',
        channel: 'L',
        index: 1,
        enabled: false,
        waveform: 'sine',
        baseFrequency: 0,
        quarterToneOffset: 0,
        phase: 0,
        amplitude: 0,
        offset: 0,
        polarity: 1,
        fmDepth: 0,
        fmRate: 0,
        mute: false,
        solo: false,
        gain: 0,
      },
      L2: {
        id: 'L2',
        name: 'Générateur L2',
        zoneKey: 'C',
        channel: 'L',
        index: 2,
        enabled: false,
        waveform: 'sine',
        baseFrequency: 0,
        quarterToneOffset: 0,
        phase: 0,
        amplitude: 0,
        offset: 0,
        polarity: 1,
        fmDepth: 0,
        fmRate: 0,
        mute: false,
        solo: false,
        gain: 0,
      },
      L3: {
        id: 'L3',
        name: 'Générateur L3',
        zoneKey: 'E',
        channel: 'L',
        index: 3,
        enabled: false,
        waveform: 'sine',
        baseFrequency: 0,
        quarterToneOffset: 0,
        phase: 0,
        amplitude: 0,
        offset: 0,
        polarity: 1,
        fmDepth: 0,
        fmRate: 0,
        mute: false,
        solo: false,
        gain: 0,
      },
      L4: {
        id: 'L4',
        name: 'Générateur L4',
        zoneKey: 'G',
        channel: 'L',
        index: 4,
        enabled: false,
        waveform: 'sine',
        baseFrequency: 0,
        quarterToneOffset: 0,
        phase: 0,
        amplitude: 0,
        offset: 0,
        polarity: 1,
        fmDepth: 0,
        fmRate: 0,
        mute: false,
        solo: false,
        gain: 0,
      },
      R1: {
        id: 'R1',
        name: 'Générateur R1',
        zoneKey: 'B',
        channel: 'R',
        index: 1,
        enabled: false,
        waveform: 'sine',
        baseFrequency: 0,
        quarterToneOffset: 0,
        phase: 0,
        amplitude: 0,
        offset: 0,
        polarity: 1,
        fmDepth: 0,
        fmRate: 0,
        mute: false,
        solo: false,
        gain: 0,
      },
      R2: {
        id: 'R2',
        name: 'Générateur R2',
        zoneKey: 'D',
        channel: 'R',
        index: 2,
        enabled: false,
        waveform: 'sine',
        baseFrequency: 0,
        quarterToneOffset: 0,
        phase: 0,
        amplitude: 0,
        offset: 0,
        polarity: 1,
        fmDepth: 0,
        fmRate: 0,
        mute: false,
        solo: false,
        gain: 0,
      },
      R3: {
        id: 'R3',
        name: 'Générateur R3',
        zoneKey: 'F',
        channel: 'R',
        index: 3,
        enabled: false,
        waveform: 'sine',
        baseFrequency: 0,
        quarterToneOffset: 0,
        phase: 0,
        amplitude: 0,
        offset: 0,
        polarity: 1,
        fmDepth: 0,
        fmRate: 0,
        mute: false,
        solo: false,
        gain: 0,
      },
      R4: {
        id: 'R4',
        name: 'Générateur R4',
        zoneKey: 'H',
        channel: 'R',
        index: 4,
        enabled: false,
        waveform: 'sine',
        baseFrequency: 0,
        quarterToneOffset: 0,
        phase: 0,
        amplitude: 0,
        offset: 0,
        polarity: 1,
        fmDepth: 0,
        fmRate: 0,
        mute: false,
        solo: false,
        gain: 0,
      },
    },
  };
}

/**
 * Apply a preset to the 8-generator system
 */
export function applyOctaPreset(preset: PresetName, state: OctaSystemState): OctaSystemState {
  const next: OctaSystemState = JSON.parse(JSON.stringify(state));
  const gens = next.generators;

  switch (preset) {
    case 'Quarter-Tone Mandala': {
      // The flagship preset: complex evolving quarter-tone beating geometry
      next.tuningMode = 'LOCKED';
      next.masterFrequency = 220;
      gens.L1 = { ...gens.L1, enabled: true, mute: false, waveform: 'sine', quarterToneOffset: 0, amplitude: 0.8, phase: 0 };
      gens.L2 = { ...gens.L2, enabled: true, mute: false, waveform: 'cosine', quarterToneOffset: 1, amplitude: 0.55, phase: 45 };
      gens.L3 = { ...gens.L3, enabled: true, mute: false, waveform: 'triangle', quarterToneOffset: 5, amplitude: 0.4, phase: 90 };
      gens.L4 = { ...gens.L4, enabled: true, mute: false, waveform: 'sawtooth_up', quarterToneOffset: -3, amplitude: 0.25, phase: 180 };

      gens.R1 = { ...gens.R1, enabled: true, mute: false, waveform: 'cosine', quarterToneOffset: 2, amplitude: 0.8, phase: 90 };
      gens.R2 = { ...gens.R2, enabled: true, mute: false, waveform: 'sine', quarterToneOffset: -1, amplitude: 0.55, phase: 135 };
      gens.R3 = { ...gens.R3, enabled: true, mute: false, waveform: 'triangle', quarterToneOffset: 7, amplitude: 0.4, phase: 0 };
      gens.R4 = { ...gens.R4, enabled: true, mute: false, waveform: 'sawtooth_down', quarterToneOffset: 4, amplitude: 0.25, phase: 270 };
      break;
    }
    case 'Microtonal Beats': {
      // Subtle circular beating and rotation from +/- 1 quarter-tone
      next.tuningMode = 'LOCKED';
      next.masterFrequency = 180;
      gens.L1 = { ...gens.L1, enabled: true, mute: false, waveform: 'sine', quarterToneOffset: 0, amplitude: 0.8, phase: 0 };
      gens.L2 = { ...gens.L2, enabled: true, mute: false, waveform: 'sine', quarterToneOffset: 1, amplitude: 0.7, phase: 90 };
      gens.L3 = { ...gens.L3, enabled: false, mute: false };
      gens.L4 = { ...gens.L4, enabled: false, mute: false };

      gens.R1 = { ...gens.R1, enabled: true, mute: false, waveform: 'cosine', quarterToneOffset: 0, amplitude: 0.8, phase: 90 };
      gens.R2 = { ...gens.R2, enabled: true, mute: false, waveform: 'cosine', quarterToneOffset: -1, amplitude: 0.7, phase: 0 };
      gens.R3 = { ...gens.R3, enabled: false, mute: false };
      gens.R4 = { ...gens.R4, enabled: false, mute: false };
      break;
    }
    case 'Octa-Lissajous': {
      // Multi-harmonic node Lissajous figures
      next.tuningMode = 'FREE';
      gens.L1 = { ...gens.L1, enabled: true, mute: false, waveform: 'sine', baseFrequency: 110, quarterToneOffset: 0, amplitude: 0.7, phase: 0 };
      gens.L2 = { ...gens.L2, enabled: true, mute: false, waveform: 'sine', baseFrequency: 220, quarterToneOffset: 0, amplitude: 0.5, phase: 45 };
      gens.L3 = { ...gens.L3, enabled: true, mute: false, waveform: 'sine', baseFrequency: 330, quarterToneOffset: 0, amplitude: 0.35, phase: 90 };
      gens.L4 = { ...gens.L4, enabled: true, mute: false, waveform: 'sine', baseFrequency: 440, quarterToneOffset: 0, amplitude: 0.2, phase: 180 };

      gens.R1 = { ...gens.R1, enabled: true, mute: false, waveform: 'cosine', baseFrequency: 165, quarterToneOffset: 0, amplitude: 0.7, phase: 90 };
      gens.R2 = { ...gens.R2, enabled: true, mute: false, waveform: 'cosine', baseFrequency: 275, quarterToneOffset: 0, amplitude: 0.5, phase: 135 };
      gens.R3 = { ...gens.R3, enabled: true, mute: false, waveform: 'cosine', baseFrequency: 385, quarterToneOffset: 0, amplitude: 0.35, phase: 0 };
      gens.R4 = { ...gens.R4, enabled: true, mute: false, waveform: 'cosine', baseFrequency: 495, quarterToneOffset: 0, amplitude: 0.2, phase: 270 };
      break;
    }
    case 'Sacred Lotus 8-Gen': {
      // Symmetrical 8-petal bloom with quarter-tone phase interference
      next.tuningMode = 'LOCKED';
      next.masterFrequency = 144;
      gens.L1 = { ...gens.L1, enabled: true, mute: false, waveform: 'sine', quarterToneOffset: 0, amplitude: 0.75, phase: 0 };
      gens.L2 = { ...gens.L2, enabled: true, mute: false, waveform: 'triangle', quarterToneOffset: 4, amplitude: 0.55, phase: 45 };
      gens.L3 = { ...gens.L3, enabled: true, mute: false, waveform: 'cosine', quarterToneOffset: 8, amplitude: 0.4, phase: 90 };
      gens.L4 = { ...gens.L4, enabled: true, mute: false, waveform: 'sawtooth_up', quarterToneOffset: 12, amplitude: 0.25, phase: 135 };

      gens.R1 = { ...gens.R1, enabled: true, mute: false, waveform: 'cosine', quarterToneOffset: 0, amplitude: 0.75, phase: 90 };
      gens.R2 = { ...gens.R2, enabled: true, mute: false, waveform: 'triangle', quarterToneOffset: 4, amplitude: 0.55, phase: 135 };
      gens.R3 = { ...gens.R3, enabled: true, mute: false, waveform: 'sine', quarterToneOffset: 8, amplitude: 0.4, phase: 180 };
      gens.R4 = { ...gens.R4, enabled: true, mute: false, waveform: 'sawtooth_down', quarterToneOffset: 12, amplitude: 0.25, phase: 225 };
      break;
    }
    case 'Harmonic Star': {
      next.tuningMode = 'LOCKED';
      next.masterFrequency = 200;
      gens.L1 = { ...gens.L1, enabled: true, mute: false, waveform: 'sine', quarterToneOffset: 0, amplitude: 0.8, phase: 0 };
      gens.L2 = { ...gens.L2, enabled: true, mute: false, waveform: 'triangle', quarterToneOffset: 6, amplitude: 0.5, phase: 60 };
      gens.L3 = { ...gens.L3, enabled: true, mute: false, waveform: 'square', quarterToneOffset: -6, amplitude: 0.3, phase: 120 };
      gens.L4 = { ...gens.L4, enabled: false, mute: false };

      gens.R1 = { ...gens.R1, enabled: true, mute: false, waveform: 'cosine', quarterToneOffset: 0, amplitude: 0.8, phase: 90 };
      gens.R2 = { ...gens.R2, enabled: true, mute: false, waveform: 'triangle', quarterToneOffset: 6, amplitude: 0.5, phase: 150 };
      gens.R3 = { ...gens.R3, enabled: true, mute: false, waveform: 'square', quarterToneOffset: -6, amplitude: 0.3, phase: 210 };
      gens.R4 = { ...gens.R4, enabled: false, mute: false };
      break;
    }
    case 'Circle': {
      next.tuningMode = 'LOCKED';
      next.masterFrequency = 220;
      gens.L1 = { ...gens.L1, enabled: true, mute: false, waveform: 'sine', quarterToneOffset: 0, amplitude: 0.8, phase: 0 };
      gens.L2 = { ...gens.L2, enabled: false };
      gens.L3 = { ...gens.L3, enabled: false };
      gens.L4 = { ...gens.L4, enabled: false };

      gens.R1 = { ...gens.R1, enabled: true, mute: false, waveform: 'cosine', quarterToneOffset: 0, amplitude: 0.8, phase: 90 };
      gens.R2 = { ...gens.R2, enabled: false };
      gens.R3 = { ...gens.R3, enabled: false };
      gens.R4 = { ...gens.R4, enabled: false };
      break;
    }
    case 'Lissajous': {
      next.tuningMode = 'FREE';
      gens.L1 = { ...gens.L1, enabled: true, mute: false, waveform: 'sine', baseFrequency: 220, quarterToneOffset: 0, amplitude: 0.8, phase: 0 };
      gens.L2 = { ...gens.L2, enabled: false };
      gens.L3 = { ...gens.L3, enabled: false };
      gens.L4 = { ...gens.L4, enabled: false };

      gens.R1 = { ...gens.R1, enabled: true, mute: false, waveform: 'sine', baseFrequency: 330, quarterToneOffset: 0, amplitude: 0.8, phase: 90 };
      gens.R2 = { ...gens.R2, enabled: false };
      gens.R3 = { ...gens.R3, enabled: false };
      gens.R4 = { ...gens.R4, enabled: false };
      break;
    }
    default: {
      // Keep existing
      break;
    }
  }

  return next;
}

/**
 * Computes an array of XY coordinate points for the 8-generator Octa system
 * at a given moment in time or across a cycle, fully taking into account the Modulation Matrix (FM/AM).
 */
export function generateOctaXYPoints(
  state: OctaSystemState,
  numPoints: number = 800,
  timeOffset: number = 0
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const baseF = state.masterFrequency > 0 ? state.masterFrequency : 110;
  const duration = Math.max(0.015, 2.5 / baseF);
  const dt = duration / numPoints;

  const gens = state.generators;
  const routings = state.modulationMatrix?.routings || [];
  const activeRoutings = routings.filter((r) => r.enabled && Math.abs(r.depth) > 0.001);

  const genIds: GeneratorId[] = ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'];
  const hasLeftSolo = gens.L1.solo || gens.L2.solo || gens.L3.solo || gens.L4.solo;
  const hasRightSolo = gens.R1.solo || gens.R2.solo || gens.R3.solo || gens.R4.solo;
  const leftIds: GeneratorId[] = ['L1', 'L2', 'L3', 'L4'];
  const rightIds: GeneratorId[] = ['R1', 'R2', 'R3', 'R4'];

  for (let i = 0; i < numPoints; i++) {
    const t = timeOffset + i * dt;

    // Step 1: Compute unmodulated baseline outputs for all 8 generators to use as modulation sources
    const rawOuts: Record<GeneratorId, number> = {
      L1: computeOctaSample(t, gens.L1, state.tuningMode, state.masterFrequency),
      L2: computeOctaSample(t, gens.L2, state.tuningMode, state.masterFrequency),
      L3: computeOctaSample(t, gens.L3, state.tuningMode, state.masterFrequency),
      L4: computeOctaSample(t, gens.L4, state.tuningMode, state.masterFrequency),
      R1: computeOctaSample(t, gens.R1, state.tuningMode, state.masterFrequency),
      R2: computeOctaSample(t, gens.R2, state.tuningMode, state.masterFrequency),
      R3: computeOctaSample(t, gens.R3, state.tuningMode, state.masterFrequency),
      R4: computeOctaSample(t, gens.R4, state.tuningMode, state.masterFrequency),
    };

    // Step 2: Accumulate modulation offsets per generator
    const fmOffsets: Record<GeneratorId, number> = { L1: 0, L2: 0, L3: 0, L4: 0, R1: 0, R2: 0, R3: 0, R4: 0 };
    const amFactors: Record<GeneratorId, number> = { L1: 1, L2: 1, L3: 1, L4: 1, R1: 1, R2: 1, R3: 1, R4: 1 };

    if (activeRoutings.length > 0) {
      for (let r = 0; r < activeRoutings.length; r++) {
        const route = activeRoutings[r];
        const srcVal = rawOuts[route.sourceId] || 0;
        if (route.targetParam === 'fm') {
          // FM Depth: 1.0 = +/- 200 Hz frequency deviation
          fmOffsets[route.targetId] += srcVal * route.depth * 200;
        } else if (route.targetParam === 'am') {
          // AM Depth: depth 1.0 can modulate amplitude by (1 + srcVal * depth)
          amFactors[route.targetId] *= Math.max(0, 1 + srcVal * route.depth);
        }
      }
    }

    // Step 3: Compute final modulated sample per generator
    // Sum Left
    let sumL = 0;
    let activeL = 0;
    for (let g = 0; g < 4; g++) {
      const gid = leftIds[g];
      const gen = gens[gid];
      const shouldPlay = hasLeftSolo ? gen.solo : (gen.enabled && !gen.mute);
      if (shouldPlay) {
        sumL += computeOctaSample(t, gen, state.tuningMode, state.masterFrequency, fmOffsets[gid], amFactors[gid]);
        activeL++;
      }
    }
    if (state.autoNormalize && activeL > 1) {
      sumL = Math.tanh(sumL * 0.75) * 1.05;
    }
    if (state.mixerLeft.invertPhase) sumL = -sumL;
    const x = state.mixerLeft.mute ? 0 : sumL * state.mixerLeft.gain;

    // Sum Right
    let sumR = 0;
    let activeR = 0;
    for (let g = 0; g < 4; g++) {
      const gid = rightIds[g];
      const gen = gens[gid];
      const shouldPlay = hasRightSolo ? gen.solo : (gen.enabled && !gen.mute);
      if (shouldPlay) {
        sumR += computeOctaSample(t, gen, state.tuningMode, state.masterFrequency, fmOffsets[gid], amFactors[gid]);
        activeR++;
      }
    }
    if (state.autoNormalize && activeR > 1) {
      sumR = Math.tanh(sumR * 0.75) * 1.05;
    }
    if (state.mixerRight.invertPhase) sumR = -sumR;
    const y = state.mixerRight.mute ? 0 : sumR * state.mixerRight.gain;

    points.push([x, y]);
  }

  return points;
}

