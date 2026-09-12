/**
 * GENESIS VECTOR FONT ENGINE
 * Procedural stroke vector glyphs for vector oscilloscopes (X/Y deflection).
 * Each glyph is defined as an array of continuous strokes, where each stroke is
 * an array of [x, y] coordinates in [-0.5, 0.5] range (with 0,0 at center).
 */

export type GlyphStroke = Array<[number, number]>;
export type GlyphDef = GlyphStroke[];

// Basic Stroke Font Dictionary (Monospace 1.0 height, 0.7 width)
export const VECTOR_GLYPHS: Record<string, GlyphDef> = {
  ' ': [],
  'A': [
    [[-0.35, -0.5], [-0.35, 0.1], [0, 0.5], [0.35, 0.1], [0.35, -0.5]],
    [[-0.3, -0.05], [0.3, -0.05]]
  ],
  'B': [
    [[-0.35, -0.5], [-0.35, 0.5], [0.2, 0.5], [0.35, 0.35], [0.35, 0.15], [0.2, 0.02], [-0.35, 0.02]],
    [[0.2, 0.02], [0.35, -0.1], [0.35, -0.35], [0.2, -0.5], [-0.35, -0.5]]
  ],
  'C': [
    [[0.35, 0.35], [0.2, 0.5], [-0.2, 0.5], [-0.35, 0.35], [-0.35, -0.35], [-0.2, -0.5], [0.2, -0.5], [0.35, -0.35]]
  ],
  'D': [
    [[-0.35, -0.5], [-0.35, 0.5], [0.15, 0.5], [0.35, 0.3], [0.35, -0.3], [0.15, -0.5], [-0.35, -0.5]]
  ],
  'E': [
    [[0.35, 0.5], [-0.35, 0.5], [-0.35, -0.5], [0.35, -0.5]],
    [[-0.35, 0.02], [0.2, 0.02]]
  ],
  'F': [
    [[-0.35, -0.5], [-0.35, 0.5], [0.35, 0.5]],
    [[-0.35, 0.05], [0.2, 0.05]]
  ],
  'G': [
    [[0.35, 0.35], [0.2, 0.5], [-0.2, 0.5], [-0.35, 0.35], [-0.35, -0.35], [-0.2, -0.5], [0.2, -0.5], [0.35, -0.35], [0.35, 0.0], [0.05, 0.0]]
  ],
  'H': [
    [[-0.35, -0.5], [-0.35, 0.5]],
    [[0.35, -0.5], [0.35, 0.5]],
    [[-0.35, 0.0], [0.35, 0.0]]
  ],
  'I': [
    [[0, -0.5], [0, 0.5]],
    [[-0.2, 0.5], [0.2, 0.5]],
    [[-0.2, -0.5], [0.2, -0.5]]
  ],
  'J': [
    [[0.3, 0.5], [0.3, -0.3], [0.15, -0.5], [-0.15, -0.5], [-0.3, -0.3], [-0.3, -0.1]]
  ],
  'K': [
    [[-0.35, -0.5], [-0.35, 0.5]],
    [[0.35, 0.5], [-0.35, 0.0], [0.35, -0.5]]
  ],
  'L': [
    [[-0.35, 0.5], [-0.35, -0.5], [0.35, -0.5]]
  ],
  'M': [
    [[-0.35, -0.5], [-0.35, 0.5], [0, 0.1], [0.35, 0.5], [0.35, -0.5]]
  ],
  'N': [
    [[-0.35, -0.5], [-0.35, 0.5], [0.35, -0.5], [0.35, 0.5]]
  ],
  'O': [
    [[-0.2, 0.5], [0.2, 0.5], [0.35, 0.35], [0.35, -0.35], [0.2, -0.5], [-0.2, -0.5], [-0.35, -0.35], [-0.35, 0.35], [-0.2, 0.5]]
  ],
  'P': [
    [[-0.35, -0.5], [-0.35, 0.5], [0.2, 0.5], [0.35, 0.35], [0.35, 0.15], [0.2, 0.0], [-0.35, 0.0]]
  ],
  'Q': [
    [[-0.2, 0.5], [0.2, 0.5], [0.35, 0.35], [0.35, -0.35], [0.2, -0.5], [-0.2, -0.5], [-0.35, -0.35], [-0.35, 0.35], [-0.2, 0.5]],
    [[0.05, -0.2], [0.38, -0.55]]
  ],
  'R': [
    [[-0.35, -0.5], [-0.35, 0.5], [0.2, 0.5], [0.35, 0.35], [0.35, 0.15], [0.2, 0.0], [-0.35, 0.0]],
    [[0.05, 0.0], [0.35, -0.5]]
  ],
  'S': [
    [[0.35, 0.35], [0.15, 0.5], [-0.15, 0.5], [-0.35, 0.35], [-0.35, 0.15], [0.35, -0.1], [0.35, -0.35], [0.15, -0.5], [-0.15, -0.5], [-0.35, -0.35]]
  ],
  'T': [
    [[-0.35, 0.5], [0.35, 0.5]],
    [[0, 0.5], [0, -0.5]]
  ],
  'U': [
    [[-0.35, 0.5], [-0.35, -0.3], [-0.2, -0.5], [0.2, -0.5], [0.35, -0.3], [0.35, 0.5]]
  ],
  'V': [
    [[-0.35, 0.5], [0, -0.5], [0.35, 0.5]]
  ],
  'W': [
    [[-0.35, 0.5], [-0.2, -0.5], [0, 0.1], [0.2, -0.5], [0.35, 0.5]]
  ],
  'X': [
    [[-0.35, 0.5], [0.35, -0.5]],
    [[-0.35, -0.5], [0.35, 0.5]]
  ],
  'Y': [
    [[-0.35, 0.5], [0, 0.0], [0.35, 0.5]],
    [[0, 0.0], [0, -0.5]]
  ],
  'Z': [
    [[-0.35, 0.5], [0.35, 0.5], [-0.35, -0.5], [0.35, -0.5]]
  ],
  '0': [
    [[-0.2, 0.5], [0.2, 0.5], [0.35, 0.35], [0.35, -0.35], [0.2, -0.5], [-0.2, -0.5], [-0.35, -0.35], [-0.35, 0.35], [-0.2, 0.5]],
    [[-0.2, -0.3], [0.2, 0.3]]
  ],
  '1': [
    [[-0.2, 0.3], [0, 0.5], [0, -0.5]],
    [[-0.2, -0.5], [0.2, -0.5]]
  ],
  '2': [
    [[-0.35, 0.35], [-0.15, 0.5], [0.15, 0.5], [0.35, 0.35], [0.35, 0.15], [-0.35, -0.5], [0.35, -0.5]]
  ],
  '3': [
    [[-0.35, 0.5], [0.35, 0.5], [0.05, 0.05], [0.35, 0.05], [0.35, -0.35], [0.15, -0.5], [-0.2, -0.5], [-0.35, -0.35]]
  ],
  '4': [
    [[0.2, -0.5], [0.2, 0.5], [-0.35, -0.1], [0.35, -0.1]]
  ],
  '5': [
    [[0.35, 0.5], [-0.35, 0.5], [-0.35, 0.05], [0.2, 0.05], [0.35, -0.1], [0.35, -0.35], [0.15, -0.5], [-0.2, -0.5], [-0.35, -0.35]]
  ],
  '6': [
    [[0.2, 0.5], [-0.2, 0.5], [-0.35, 0.3], [-0.35, -0.35], [-0.2, -0.5], [0.2, -0.5], [0.35, -0.35], [0.35, -0.1], [0.2, 0.05], [-0.35, 0.05]]
  ],
  '7': [
    [[-0.35, 0.5], [0.35, 0.5], [0.05, -0.5]],
    [[-0.1, 0.05], [0.2, 0.05]]
  ],
  '8': [
    [[-0.15, 0.5], [0.15, 0.5], [0.3, 0.3], [0.3, 0.1], [0.15, 0.0], [-0.15, 0.0], [-0.3, 0.1], [-0.3, 0.3], [-0.15, 0.5]],
    [[-0.15, 0.0], [0.15, 0.0], [0.35, -0.15], [0.35, -0.35], [0.2, -0.5], [-0.2, -0.5], [-0.35, -0.35], [-0.35, -0.15], [-0.15, 0.0]]
  ],
  '9': [
    [[-0.2, -0.5], [0.2, -0.5], [0.35, -0.3], [0.35, 0.35], [0.2, 0.5], [-0.2, 0.5], [-0.35, 0.35], [-0.35, 0.1], [-0.2, -0.05], [0.35, -0.05]]
  ],
  '-': [
    [[-0.3, 0.0], [0.3, 0.0]]
  ],
  '+': [
    [[-0.3, 0.0], [0.3, 0.0]],
    [[0.0, -0.3], [0.0, 0.3]]
  ],
  ':': [
    [[-0.05, 0.25], [0.05, 0.25]],
    [[-0.05, -0.25], [0.05, -0.25]]
  ],
  '.': [
    [[-0.05, -0.45], [0.05, -0.45]]
  ],
  '!': [
    [[0.0, 0.5], [0.0, -0.15]],
    [[0.0, -0.4], [0.0, -0.45]]
  ],
  '/': [
    [[-0.35, -0.5], [0.35, 0.5]]
  ],
  '=': [
    [[-0.3, 0.15], [0.3, 0.15]],
    [[-0.3, -0.15], [0.3, -0.15]]
  ]
};

export interface TextVectorRenderOptions {
  text: string;
  scrollProgress: number; // 0 to 1
  scrollDirection: 'left_to_right' | 'right_to_left';
  scale: number;
  letterSpacing: number; // default 0.85
  numSamples?: number;
}

/**
 * Generate a continuous trajectory of XY points for animated vector text
 */
export function generateTextVectorPoints(
  optionsOrText: TextVectorRenderOptions | string,
  scrollProgressArg: number = 0,
  scrollDirectionArg: 'left_to_right' | 'right_to_left' = 'right_to_left',
  scaleArg: number = 0.8,
  letterSpacingArg: number = 0.85,
  numSamplesArg: number = 512
): Array<[number, number]> {
  let text: string;
  let scrollProgress: number;
  let scrollDirection: 'left_to_right' | 'right_to_left';
  let scale: number;
  let letterSpacing: number;
  let numSamples: number;

  if (typeof optionsOrText === 'string') {
    text = optionsOrText;
    scrollProgress = scrollProgressArg;
    scrollDirection = scrollDirectionArg;
    scale = scaleArg;
    letterSpacing = letterSpacingArg;
    numSamples = numSamplesArg;
  } else {
    text = optionsOrText.text;
    scrollProgress = optionsOrText.scrollProgress;
    scrollDirection = optionsOrText.scrollDirection;
    scale = optionsOrText.scale ?? 0.8;
    letterSpacing = optionsOrText.letterSpacing ?? 0.85;
    numSamples = optionsOrText.numSamples ?? 512;
  }

  const upperText = (text || 'GENESIS LAB').toUpperCase();
  const totalChars = upperText.length;
  if (totalChars === 0) return [];

  // Calculate overall string width
  const charWidth = letterSpacing;
  const totalWidth = totalChars * charWidth;

  // Viewport width is 2.0 (from -1 to +1)
  const viewWidth = 2.4;
  const scrollRange = totalWidth + viewWidth;

  let currentOffset: number;
  if (scrollDirection === 'right_to_left') {
    // Starts at right (+1.2), ends at left (-totalWidth - 1.2)
    currentOffset = 1.2 - scrollProgress * scrollRange;
  } else {
    // Starts at left (-1.2 - totalWidth), moves to right (+1.2)
    currentOffset = -totalWidth - 1.2 + scrollProgress * scrollRange;
  }

  // Collect all line segments in the visible window
  const activeSegments: Array<{ p1: [number, number]; p2: [number, number] }> = [];

  for (let c = 0; c < totalChars; c++) {
    const char = upperText[c];
    const glyphDef = VECTOR_GLYPHS[char] || VECTOR_GLYPHS[' '];
    const charCenterX = currentOffset + c * charWidth + charWidth / 2;

    // Fast frustum cull: skip characters outside visible [-1.5, +1.5]
    if (charCenterX < -1.8 || charCenterX > 1.8) continue;

    for (const stroke of glyphDef) {
      for (let s = 0; s < stroke.length - 1; s++) {
        const [x1, y1] = stroke[s];
        const [x2, y2] = stroke[s + 1];

        activeSegments.push({
          p1: [(charCenterX + x1 * 0.7) * scale, y1 * scale],
          p2: [(charCenterX + x2 * 0.7) * scale, y2 * scale],
        });
      }
    }
  }

  if (activeSegments.length === 0) {
    // If nothing visible in window, return a slight center idle pulse
    const idle: Array<[number, number]> = [];
    for (let i = 0; i < numSamples; i++) {
      const theta = (i / numSamples) * 2 * Math.PI;
      idle.push([0.05 * Math.cos(theta), 0.05 * Math.sin(theta)]);
    }
    return idle;
  }

  // Interpolate continuous audio points along active segments with fast fly-back
  const points: Array<[number, number]> = [];
  const samplesPerSegment = Math.max(4, Math.floor(numSamples / activeSegments.length));

  for (let i = 0; i < activeSegments.length; i++) {
    const { p1, p2 } = activeSegments[i];
    for (let s = 0; s < samplesPerSegment; s++) {
      const frac = s / samplesPerSegment;
      const x = p1[0] + (p2[0] - p1[0]) * frac;
      const y = p1[1] + (p2[1] - p1[1]) * frac;
      points.push([Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]);
    }

    // Add 2 flyback blanking transition points between disconnected strokes
    if (i < activeSegments.length - 1) {
      const nextP1 = activeSegments[i + 1].p1;
      points.push([(p2[0] + nextP1[0]) * 0.5, (p2[1] + nextP1[1]) * 0.5]);
    }
  }

  // Pad or trim to exactly numSamples
  if (points.length < numSamples) {
    const last = points[points.length - 1] || [0, 0];
    while (points.length < numSamples) {
      points.push([last[0], last[1]]);
    }
  }

  return points.slice(0, numSamples);
}
