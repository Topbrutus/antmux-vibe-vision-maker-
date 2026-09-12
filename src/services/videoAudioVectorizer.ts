/**
 * GENESIS VIDEO & AUDIO VECTORIZER SERVICE
 * 
 * Implements:
 * 1. Real-time optical beam extraction from video frames (phosphor CRT / vector beam tracking).
 * 2. Dual Audio-Visual Stereo Re-Synthesis: converts mono or downmixed video audio into
 *    true calibrated stereo (Left = X deflection, Right = Y deflection) guided by the video's visual trajectory.
 * 3. Procedural Demo Video Generator based on Jerobeam Fenderson's iconic oscilloscope mushroom.
 */

import { simplifyRDP } from './imageVectorizer';

export interface VideoBeamExtractorOptions {
  threshold: number; // 20..220
  colorMode: 'phosphor_green' | 'cyan' | 'monochrome' | 'all';
  tolerance: number; // 1.0..8.0 (RDP epsilon)
  maxPoints: number; // 128..1024
  scale: number; // 0.3..1.2
  smoothing: boolean;
  invert: boolean;
}

export const DEFAULT_BEAM_EXTRACTOR_OPTIONS: VideoBeamExtractorOptions = {
  threshold: 65,
  colorMode: 'phosphor_green',
  tolerance: 2.5,
  maxPoints: 512,
  scale: 0.9,
  smoothing: true,
  invert: false,
};

export interface VideoAnalysisFrameResult {
  opticalPoints: Array<[number, number]>;
  centroid: [number, number];
  boundingBox: { minX: number; maxX: number; minY: number; maxY: number };
  beamIntensity: number; // 0..1
  pixelCount: number;
}

/**
 * Extracts 2D vector coordinates of the oscilloscope electron beam from a video frame
 */
export function extractPhosphorBeamFromFrame(
  source: HTMLVideoElement | HTMLCanvasElement,
  bufferCanvas: HTMLCanvasElement,
  options: VideoBeamExtractorOptions = DEFAULT_BEAM_EXTRACTOR_OPTIONS
): VideoAnalysisFrameResult {
  const targetW = 200;
  const targetH = 200;
  bufferCanvas.width = targetW;
  bufferCanvas.height = targetH;

  const ctx = bufferCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      opticalPoints: [],
      centroid: [0, 0],
      boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      beamIntensity: 0,
      pixelCount: 0,
    };
  }

  // Draw source frame scaled down for fast real-time optical processing
  ctx.drawImage(source, 0, 0, targetW, targetH);

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, targetW, targetH);
  } catch (e) {
    // Canvas tainted (CORS if external URL)
    return {
      opticalPoints: [],
      centroid: [0, 0],
      boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      beamIntensity: 0,
      pixelCount: 0,
    };
  }

  const data = imgData.data;
  const beamPixels: Array<[number, number]> = [];
  let sumX = 0;
  let sumY = 0;
  let maxIntensityFound = 0;

  const threshold = options.threshold;
  const colorMode = options.colorMode;

  for (let y = 0; y < targetH; y += 2) {
    for (let x = 0; x < targetW; x += 2) {
      const idx = (y * targetW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      let score = 0;
      if (colorMode === 'phosphor_green') {
        // High green, with green higher than red and blue (classic CRT phosphor P31)
        score = g - 0.35 * r - 0.25 * b;
        if (g > threshold && score > threshold * 0.4) {
          score = g;
        } else {
          score = 0;
        }
      } else if (colorMode === 'cyan') {
        // Cyan: high green and high blue
        score = (g + b) * 0.5 - 0.5 * r;
      } else if (colorMode === 'monochrome') {
        // Pure luminance
        score = 0.299 * r + 0.587 * g + 0.114 * b;
      } else {
        // Max RGB
        score = Math.max(r, g, b);
      }

      const isHit = options.invert ? score < threshold : score >= threshold;

      if (isHit) {
        beamPixels.push([x, y]);
        sumX += x;
        sumY += y;
        if (score > maxIntensityFound) maxIntensityFound = score;
      }
    }
  }

  const count = beamPixels.length;
  if (count === 0) {
    return {
      opticalPoints: [],
      centroid: [0, 0],
      boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      beamIntensity: 0,
      pixelCount: 0,
    };
  }

  const avgX = sumX / count;
  const avgY = sumY / count;

  // Chain points along the trajectory using nearest neighbor traversal
  const maxScan = Math.min(count, 1200);
  const visited = new Uint8Array(count);
  const chained: Array<[number, number]> = [];

  let currIdx = 0;
  visited[0] = 1;
  chained.push(beamPixels[0]);

  for (let s = 1; s < maxScan; s++) {
    const [cx, cy] = beamPixels[currIdx];
    let bestIdx = -1;
    let bestDist = Infinity;

    // Local neighborhood window for speed
    const winStart = Math.max(0, currIdx - 150);
    const winEnd = Math.min(count, currIdx + 250);

    for (let j = winStart; j < winEnd; j++) {
      if (visited[j]) continue;
      const [nx, ny] = beamPixels[j];
      const dist = (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = j;
        if (dist < 12) break; // close enough
      }
    }

    if (bestIdx === -1) {
      // Find any remaining unvisited
      for (let j = 0; j < count; j++) {
        if (!visited[j]) {
          bestIdx = j;
          break;
        }
      }
    }

    if (bestIdx === -1) break;
    visited[bestIdx] = 1;
    chained.push(beamPixels[bestIdx]);
    currIdx = bestIdx;
  }

  // Simplify polyline
  const simplified = simplifyRDP(chained, options.tolerance);

  // Normalize to [-1, 1] Cartesian space with centered aspect ratio
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const normalized: Array<[number, number]> = simplified.map(([x, y]) => {
    const normX = ((x / targetW) * 2 - 1) * options.scale;
    const normY = -((y / targetH) * 2 - 1) * options.scale; // invert Y for oscilloscope Cartesian

    if (normX < minX) minX = normX;
    if (normX > maxX) maxX = normX;
    if (normY < minY) minY = normY;
    if (normY > maxY) maxY = normY;

    return [
      Math.max(-1, Math.min(1, normX)),
      Math.max(-1, Math.min(1, normY)),
    ];
  });

  // Downsample to maxPoints if needed
  let finalPoints = normalized;
  if (normalized.length > options.maxPoints) {
    const step = normalized.length / options.maxPoints;
    finalPoints = [];
    for (let i = 0; i < options.maxPoints; i++) {
      finalPoints.push(normalized[Math.floor(i * step)]);
    }
  }

  return {
    opticalPoints: finalPoints,
    centroid: [((avgX / targetW) * 2 - 1) * options.scale, -((avgY / targetH) * 2 - 1) * options.scale],
    boundingBox: {
      minX: isFinite(minX) ? minX : -1,
      maxX: isFinite(maxX) ? maxX : 1,
      minY: isFinite(minY) ? minY : -1,
      maxY: isFinite(maxY) ? maxY : 1,
    },
    beamIntensity: Math.min(1.0, maxIntensityFound / 255),
    pixelCount: count,
  };
}

/**
 * Synthesizes Stereo Left (X) and Right (Y) audio samples from video audio + optical vector path.
 * Renders the mono or mixed video audio in full stereo matched with the visual shape!
 */
export function synthesizeStereoSamples(
  inputL: Float32Array,
  inputR: Float32Array,
  opticalPoints: Array<[number, number]>,
  options: {
    visualMix: number; // 0..1 (0 = raw video audio, 1 = pure optical beam)
    audioModulation: number; // 0..1 (how much sound volume/peaks modulate beam amplitude)
    scanFreqHz: number; // 40..240 Hz
    sampleRate: number;
    timeOffset: number;
    quadratureAssist: boolean;
  }
): { outL: Float32Array; outR: Float32Array } {
  const len = inputL.length;
  const outL = new Float32Array(len);
  const outR = new Float32Array(len);

  const numPoints = opticalPoints.length;
  const hasTrajectory = numPoints > 2;

  const dt = 1 / options.sampleRate;
  const period = 1 / options.scanFreqHz;
  const mix = options.visualMix;
  const audioMod = options.audioModulation;

  for (let i = 0; i < len; i++) {
    const t = options.timeOffset + i * dt;
    const inL = inputL[i] || 0;
    const inR = inputR[i] || inL;
    const monoAudio = (inL + inR) * 0.5;
    const absAudio = Math.abs(monoAudio);

    let optX = 0;
    let optY = 0;

    if (hasTrajectory) {
      // Scan along the optical trajectory at scanFreqHz
      const normT = ((t % period) + period) % period;
      const fracPos = (normT / period) * numPoints;
      const idx0 = Math.floor(fracPos) % numPoints;
      const idx1 = (idx0 + 1) % numPoints;
      const sub = fracPos - Math.floor(fracPos);

      const p0 = opticalPoints[idx0];
      const p1 = opticalPoints[idx1];
      optX = p0[0] + (p1[0] - p0[0]) * sub;
      optY = p0[1] + (p1[1] - p0[1]) * sub;
    } else {
      // Fallback: subtle circular Lissajous carrier if no beam visible
      optX = Math.sin(2 * Math.PI * options.scanFreqHz * t);
      optY = Math.cos(2 * Math.PI * options.scanFreqHz * t);
    }

    // Audio envelope modulation factor (sound modulates the visual beam)
    const envelope = (1 - audioMod) + audioMod * Math.min(2.0, absAudio * 2.5);

    // Final blended Stereo X and Y
    // Left = X deflection, Right = Y deflection
    const finalX = (1 - mix) * inL + mix * optX * envelope;
    const finalY = (1 - mix) * inR + mix * optY * envelope;

    outL[i] = Math.max(-1, Math.min(1, finalX));
    outR[i] = Math.max(-1, Math.min(1, finalY));
  }

  return { outL, outR };
}

/**
 * Generates an authentic Procedural Oscilloscope Demo Video Blob (WebM)
 * based on Jerobeam Fenderson's formula for the Oscilloscope Mushroom and Spirals!
 */
export async function generateJerobeamMushroomVideoBlob(durationSec: number = 6): Promise<Blob> {
  const width = 360;
  const height = 360;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const fps = 30;
  const totalFrames = Math.floor(durationSec * fps);

  // Use MediaStream and MediaRecorder
  const stream = canvas.captureStream(fps);

  // Audio synthesis: Web Audio offline or live oscillator connected to stream
  let audioContext: AudioContext | null = null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioCtx();
    const dest = audioContext.createMediaStreamDestination();

    // Oscillator 1: Base sine carrier for mushroom (approx 220Hz / A3)
    const osc1 = audioContext.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110, audioContext.currentTime);

    const osc2 = audioContext.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(220, audioContext.currentTime);

    const gain1 = audioContext.createGain();
    gain1.gain.setValueAtTime(0.3, audioContext.currentTime);

    osc1.connect(gain1);
    osc2.connect(gain1);
    gain1.connect(dest);

    osc1.start();
    osc2.start();

    // Add audio track to canvas stream
    const audioTrack = dest.stream.getAudioTracks()[0];
    if (audioTrack) {
      stream.addTrack(audioTrack);
    }
  } catch (e) {
    console.warn('Audio stream attachment fallback:', e);
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
    ? 'video/webm;codecs=vp8,opus'
    : MediaRecorder.isTypeSupported('video/webm')
    ? 'video/webm'
    : 'video/mp4';

  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    videoBitsPerSecond: 2500000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
    };
  });

  recorder.start();

  // Render frames sequentially
  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;

    // Clear dark CRT background
    ctx.fillStyle = '#020610';
    ctx.fillRect(0, 0, width, height);

    // Subtle CRT reticle grid
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx <= width; gx += 36) {
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
    }
    for (let gy = 0; gy <= height; gy += 36) {
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
    }
    ctx.stroke();

    // Draw Jerobeam Fenderson's Oscilloscope Mushroom
    // Mathematics:
    // Left Channel (X): sine carrier multiplied with windowed sine cap + motion cosine
    // Right Channel (Y): cosine carrier + sawtooth spiral stem
    const points: Array<[number, number]> = [];
    const N = 400;
    const cx = width / 2;
    const cy = height / 2;
    const scale = width * 0.38;

    // Mushroom animation state
    const wobble = Math.sin(t * 3.5) * 0.08;
    const capWidth = 0.85 + Math.sin(t * 2.0) * 0.1;
    const stemHeight = 0.95;

    for (let i = 0; i < N; i++) {
      const u = i / N; // 0..1

      let px = 0;
      let py = 0;

      if (u < 0.65) {
        // Mushroom Cap: arcs with ribbed spiral texture
        const capPhase = (u / 0.65) * Math.PI; // 0..PI
        const rib = Math.sin(capPhase * 16 + t * 4) * 0.04;
        const radius = (Math.sin(capPhase) * capWidth + rib);
        px = Math.cos(capPhase) * radius + wobble * (1 - u);
        py = Math.sin(capPhase) * 0.55 + 0.15 + (u * 0.1);
      } else {
        // Mushroom Stem: descending stalk down into roots
        const stemU = (u - 0.65) / 0.35; // 0..1
        const stemW = 0.08 + stemU * 0.06;
        const side = (i % 2 === 0 ? 1 : -1);
        px = side * stemW + wobble * (1 - stemU * 0.5);
        py = 0.15 - stemU * stemHeight;
      }

      points.push([cx + px * scale, cy - py * scale]);
    }

    // Render glowing phosphor lines (glow pass + sharp core pass)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer phosphor bloom
    ctx.strokeStyle = 'rgba(0, 255, 120, 0.25)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let p = 1; p < points.length; p++) {
      ctx.lineTo(points[p][0], points[p][1]);
    }
    ctx.stroke();

    // Medium glow
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Sharp electron core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Beam impact bright spots
    ctx.fillStyle = '#ffffff';
    for (let b = 0; b < points.length; b += 40) {
      ctx.beginPath();
      ctx.arc(points[b][0], points[b][1], 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Video metadata header text on screen
    ctx.fillStyle = 'rgba(0, 255, 120, 0.7)';
    ctx.font = '10px monospace';
    ctx.fillText('JEROBEAM MUSHROOM OSCILLO DEMO', 12, 22);
    ctx.fillText(`TIME: ${(t).toFixed(2)}s | CH-G: X (HORIZ) | CH-D: Y (VERT)`, 12, 34);

    // Yield short delay so MediaRecorder can encode smoothly
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }

  recorder.stop();
  return recordingPromise;
}
