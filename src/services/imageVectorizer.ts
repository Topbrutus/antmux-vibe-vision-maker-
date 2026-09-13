/**
 * GENESIS IMAGE VECTORIZER ENGINE
 * Image edge detection, contour extraction, Ramer-Douglas-Peucker simplification,
 * and conversion to high-speed XY audio deflection trajectory.
 */

export interface VectorizerConfig {
  threshold: number; // 20..240
  simplifyTolerance: number; // 0.5..10 (RDP epsilon)
  invert: boolean;
  maxPoints: number; // 256..2048
  scale: number; // 0.2..1.0
  blurRadius: number; // 0..3
}

export const DEFAULT_VECTORIZER_CONFIG: VectorizerConfig = {
  threshold: 110,
  simplifyTolerance: 2.2,
  invert: false,
  maxPoints: 768,
  scale: 0.85,
  blurRadius: 1,
};

/**
 * Ramer-Douglas-Peucker (RDP) polyline simplification
 */
function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return Math.hypot(point[0] - lineStart[0], point[1] - lineStart[1]);
  const u = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (mag * mag);
  const clampedU = Math.max(0, Math.min(1, u));
  const projX = lineStart[0] + clampedU * dx;
  const projY = lineStart[1] + clampedU * dy;
  return Math.hypot(point[0] - projX, point[1] - projY);
}

export function simplifyRDP(points: Array<[number, number]>, epsilon: number): Array<[number, number]> {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyRDP(points.slice(0, index + 1), epsilon);
    const right = simplifyRDP(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[end]];
  }
}

/**
 * Process HTML Canvas ImageData with Sobel edge detector and extract simplified XY points
 */
export function vectorizeImageData(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: VectorizerConfig
): Array<[number, number]> {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Grayscale buffer
  let gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i / 4] = config.invert ? 255 - lum : lum;
  }

  // 1b. Fast Box Blur for noise suppression
  if (config.blurRadius > 0) {
    const r = Math.min(3, Math.max(1, config.blurRadius));
    const temp = new Float32Array(width * height);
    // Horizontal blur
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < width) {
            sum += gray[y * width + nx];
            count++;
          }
        }
        temp[y * width + x] = sum / count;
      }
    }
    // Vertical blur
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -r; dy <= r; dy++) {
          const ny = y + dy;
          if (ny >= 0 && ny < height) {
            sum += temp[ny * width + x];
            count++;
          }
        }
        gray[y * width + x] = sum / count;
      }
    }
  }

  // 2. Sobel Edge Detection
  const edgePixels: Array<[number, number]> = [];
  const sobelThreshold = config.threshold;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = y * width + x;

      // Sobel kernel X: [-1 0 1; -2 0 2; -1 0 1]
      const gx =
        -gray[idx - width - 1] + gray[idx - width + 1] +
        -2 * gray[idx - 1] + 2 * gray[idx + 1] +
        -gray[idx + width - 1] + gray[idx + width + 1];

      // Sobel kernel Y: [-1 -2 -1; 0 0 0; 1 2 1]
      const gy =
        -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
        gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];

      const mag = Math.hypot(gx, gy);
      if (mag > sobelThreshold) {
        edgePixels.push([x, y]);
      }
    }
  }

  if (edgePixels.length === 0) return [];

  // 3. Nearest Neighbor Path Sorting (Chaining continuous vector beam trajectory)
  const visited = new Uint8Array(edgePixels.length);
  const chainedPoints: Array<[number, number]> = [];
  let currentIdx = 0;
  visited[0] = 1;
  chainedPoints.push(edgePixels[0]);

  const maxTrace = Math.min(edgePixels.length, 3000);
  for (let step = 1; step < maxTrace; step++) {
    const [cx, cy] = edgePixels[currentIdx];
    let nearestIdx = -1;
    let minDist = Infinity;

    // Search nearest unvisited neighbor within a localized window
    const searchLimit = Math.min(edgePixels.length, currentIdx + 400);
    const searchStart = Math.max(0, currentIdx - 200);

    for (let j = searchStart; j < searchLimit; j++) {
      if (visited[j]) continue;
      const [nx, ny] = edgePixels[j];
      const d = (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy);
      if (d < minDist) {
        minDist = d;
        nearestIdx = j;
        if (d < 25) break; // early exit if adjacent pixel
      }
    }

    if (nearestIdx === -1) {
      // Global search for nearest remaining point
      for (let j = 0; j < edgePixels.length; j++) {
        if (!visited[j]) {
          const [nx, ny] = edgePixels[j];
          const d = (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy);
          if (d < minDist) {
            minDist = d;
            nearestIdx = j;
          }
        }
      }
    }

    if (nearestIdx === -1) break;

    visited[nearestIdx] = 1;
    chainedPoints.push(edgePixels[nearestIdx]);
    currentIdx = nearestIdx;
  }

  // 4. RDP Simplification
  const simplified = simplifyRDP(chainedPoints, config.simplifyTolerance);

  // 5. Normalize coordinates to [-1, 1] Cartesian space (with inverted Y for scope)
  const normalized: Array<[number, number]> = simplified.map(([x, y]) => {
    const normX = ((x / width) * 2 - 1) * config.scale;
    const normY = -((y / height) * 2 - 1) * config.scale; // invert Y so top of image is top of scope
    return [
      Math.max(-1, Math.min(1, normX)),
      Math.max(-1, Math.min(1, normY)),
    ];
  });

  // Limit to maxPoints
  if (normalized.length > config.maxPoints) {
    const step = normalized.length / config.maxPoints;
    const resampled: Array<[number, number]> = [];
    for (let i = 0; i < config.maxPoints; i++) {
      resampled.push(normalized[Math.floor(i * step)]);
    }
    return resampled;
  }

  return normalized;
}

/**
 * Built-in Preset Vector Shapes for Immediate Testing
 */
export function generatePresetVectorImage(
  preset: 'lotus' | 'atom' | 'sacred_cube' | 'star_octagram' | 'yinyang'
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const N = 512;

  switch (preset) {
    case 'lotus': {
      // Sacred Lotus flower with 8 petals and center seed
      for (let i = 0; i < N; i++) {
        const theta = (i / N) * 4 * Math.PI;
        const r = 0.75 * Math.abs(Math.cos(4 * theta)) * (0.6 + 0.4 * Math.sin(2 * theta));
        points.push([r * Math.cos(theta), r * Math.sin(theta)]);
      }
      break;
    }
    case 'atom': {
      // Rutherford atom model: nucleus + 3 orbital ellipses
      const ptsPerOrbit = Math.floor(N / 3);
      for (let orb = 0; orb < 3; orb++) {
        const tilt = (orb * Math.PI) / 3;
        for (let i = 0; i < ptsPerOrbit; i++) {
          const t = (i / ptsPerOrbit) * 2 * Math.PI;
          const x0 = 0.8 * Math.cos(t);
          const y0 = 0.28 * Math.sin(t);
          const rx = x0 * Math.cos(tilt) - y0 * Math.sin(tilt);
          const ry = x0 * Math.sin(tilt) + y0 * Math.cos(tilt);
          points.push([rx, ry]);
        }
      }
      break;
    }
    case 'sacred_cube': {
      // Metatron's cube projection
      for (let ring = 1; ring <= 3; ring++) {
        const r = (ring / 3) * 0.75;
        const pts = 6 * ring;
        for (let i = 0; i < pts; i++) {
          const theta = (i / pts) * 2 * Math.PI;
          points.push([r * Math.cos(theta), r * Math.sin(theta)]);
        }
      }
      break;
    }
    case 'star_octagram': {
      // 8-point geometric star
      for (let i = 0; i < N; i++) {
        const theta = (i / N) * 2 * Math.PI;
        const r = 0.75 * (0.55 + 0.45 * Math.cos(8 * theta));
        points.push([r * Math.cos(theta), r * Math.sin(theta)]);
      }
      break;
    }
    case 'yinyang': {
      for (let i = 0; i < N; i++) {
        const t = (i / N) * 2 * Math.PI;
        const r = 0.75;
        points.push([r * Math.cos(t), r * Math.sin(t)]);
      }
      break;
    }
  }

  return points;
}
