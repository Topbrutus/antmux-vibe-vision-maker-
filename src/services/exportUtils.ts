import JSZip from 'jszip';
import { ChannelConfig, RecordedExperiment } from '../types/vectorScope';
import { computeChecksum, exportPointsToCsv, exportPointsToSvg } from './mathEngine';

/**
 * Encodes stereo Float32Array into a compliant WAV Blob
 * Formats: 16-bit PCM, 24-bit PCM, 32-bit IEEE Float
 */
export function encodeStereoWav(
  left: Float32Array,
  right: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: 44100 | 48000 | 96000,
  bitDepth: 16 | 24 | 32,
  autoLimit: boolean = true
): { blob: Blob; hasClipped: boolean } {
  let sampleCount = Math.min(left.length, right.length);
  let l = left;
  let r = right;

  // Simple resample if target differs from source
  if (sourceSampleRate !== targetSampleRate) {
    const ratio = targetSampleRate / sourceSampleRate;
    const newLen = Math.floor(sampleCount * ratio);
    const newL = new Float32Array(newLen);
    const newR = new Float32Array(newLen);

    for (let i = 0; i < newLen; i++) {
      const srcIdx = i / ratio;
      const idx0 = Math.floor(srcIdx);
      const idx1 = Math.min(idx0 + 1, sampleCount - 1);
      const frac = srcIdx - idx0;
      newL[i] = l[idx0] * (1 - frac) + l[idx1] * frac;
      newR[i] = r[idx0] * (1 - frac) + r[idx1] * frac;
    }
    l = newL;
    r = newR;
    sampleCount = newLen;
  }

  // Peak analysis and auto-limit
  let peak = 0;
  for (let i = 0; i < sampleCount; i++) {
    const absL = Math.abs(l[i]);
    const absR = Math.abs(r[i]);
    if (absL > peak) peak = absL;
    if (absR > peak) peak = absR;
  }

  let hasClipped = peak >= 0.999;
  let gain = 1.0;
  if (autoLimit && peak > 0.95) {
    gain = 0.95 / peak;
    hasClipped = false;
  }

  const numChannels = 2;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = targetSampleRate * blockAlign;
  const dataSize = sampleCount * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  const audioFormat = bitDepth === 32 ? 3 : 1; // 3 = IEEE Float, 1 = PCM
  view.setUint16(20, audioFormat, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < sampleCount; i++) {
    const sampleL = Math.max(-1, Math.min(1, l[i] * gain));
    const sampleR = Math.max(-1, Math.min(1, r[i] * gain));

    if (bitDepth === 16) {
      const sL = sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7fff;
      const sR = sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7fff;
      view.setInt16(offset, sL, true);
      view.setInt16(offset + 2, sR, true);
      offset += 4;
    } else if (bitDepth === 24) {
      const sL = sampleL < 0 ? sampleL * 0x800000 : sampleL * 0x7fffff;
      const sR = sampleR < 0 ? sampleR * 0x800000 : sampleR * 0x7fffff;
      writeInt24(view, offset, Math.floor(sL));
      writeInt24(view, offset + 3, Math.floor(sR));
      offset += 6;
    } else {
      // 32-bit IEEE float
      view.setFloat32(offset, sampleL, true);
      view.setFloat32(offset + 4, sampleR, true);
      offset += 8;
    }
  }

  const blob = new Blob([view], { type: 'audio/wav' });
  return { blob, hasClipped };
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function writeInt24(view: DataView, offset: number, value: number) {
  view.setUint8(offset, value & 0xff);
  view.setUint8(offset + 1, (value >> 8) & 0xff);
  view.setUint8(offset + 2, (value >> 16) & 0xff);
}

/**
 * Builds the complete multi-file experiment ZIP bundle:
 * - audio.wav
 * - preview.png
 * - xy_trace.csv
 * - events.jsonl
 * - manifest.json
 */
export async function createExperimentZipBundle(
  experiment: RecordedExperiment,
  wavBlob: Blob,
  previewCanvas: HTMLCanvasElement,
  points: Array<[number, number]>
): Promise<Blob> {
  const zip = new JSZip();

  // 1. audio.wav
  zip.file('audio.wav', wavBlob);

  // 2. preview.png
  const previewBlob = await new Promise<Blob | null>((resolve) => {
    previewCanvas.toBlob((b) => resolve(b), 'image/png');
  });
  if (previewBlob) {
    zip.file('preview.png', previewBlob);
  }

  // 3. xy_trace.csv
  const csvContent = exportPointsToCsv(points, experiment.sampleRate);
  zip.file('xy_trace.csv', csvContent);

  // 4. events.jsonl
  const eventsContent = experiment.events.map((e) => JSON.stringify(e)).join('\n') + '\n';
  zip.file('events.jsonl', eventsContent);

  // Compute checksum of the WAV file
  const wavBytes = new Uint8Array(await wavBlob.arrayBuffer());
  const wavChecksum = computeChecksum(wavBytes);

  // 5. manifest.json
  const manifest = {
    project: 'GENESIS VECTOR SCOPE',
    version: '1.0.0-PRO',
    date: experiment.timestamp,
    sampleRate: experiment.sampleRate,
    durationSec: experiment.duration,
    preset: experiment.preset,
    checksumWav: wavChecksum,
    parameters: {
      leftChannel_X: experiment.channelParams.x,
      rightChannel_Y: experiment.channelParams.y,
    },
    systemSpecs: {
      platform: 'Windows / Web Audio Laboratory',
      architecture: 'Stereo Vector Synth (Left=X, Right=Y)',
    },
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  return await zip.generateAsync({ type: 'blob' });
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function triggerTextDownload(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  triggerBlobDownload(blob, filename);
}
