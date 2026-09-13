import { SequenceGeneratorItem, PatternFillChannel, TemporalNudgeCorrection, TemporalCorrectionSpan } from '../types/vectorScope';

const STORAGE_KEY = 'gv_sequence_generators_v1';

// Algorithmic Rabbit & Hole contour builders
function createRabbitPoints(scale: number = 0.35, offsetX: number = 0, offsetY: number = 0): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const steps = 72;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    let r = 1.0;
    // Head and body lobes
    r += 0.25 * Math.sin(t);
    // Ears (two peaks near t = π/2)
    if (t > 1.2 && t < 1.9) {
      r += 1.35 * Math.sin((t - 1.2) * (Math.PI / 0.7));
    }
    // Tail (peak near t = 3π/2)
    if (t > 4.2 && t < 4.9) {
      r += 0.45 * Math.sin((t - 4.2) * (Math.PI / 0.7));
    }
    const x = offsetX + Math.cos(t) * r * scale;
    const y = offsetY + Math.sin(t) * r * scale;
    pts.push([Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]);
  }
  return pts;
}

function createBurrowHolePoints(rx: number = 0.45, ry: number = 0.22, cx: number = 0.45, cy: number = -0.55): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const steps = 54;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    // slight uneven earth contour
    const jitter = 1.0 + 0.08 * Math.sin(5 * t);
    const x = cx + Math.cos(t) * rx * jitter;
    const y = cy + Math.sin(t) * ry * jitter;
    pts.push([Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]);
  }
  return pts;
}

function createButterflyPoints(tParam: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const steps = 64;
  const wingFlap = 0.4 + 0.6 * Math.abs(Math.cos(tParam * Math.PI * 2));
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    // Butterfly curve
    const r = Math.exp(Math.cos(angle)) - 2 * Math.cos(4 * angle) + Math.pow(Math.sin(angle / 12), 5);
    const x = Math.sin(angle) * r * 0.25 * wingFlap;
    const y = Math.cos(angle) * r * 0.25;
    pts.push([Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]);
  }
  return pts;
}

function createSpaceshipPoints(tParam: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const rot = tParam * Math.PI * 2 * 0.2;
  const baseTriangle: Array<[number, number]> = [
    [0.0, 0.65],
    [0.45, -0.45],
    [0.18, -0.3],
    [0.0, -0.55],
    [-0.18, -0.3],
    [-0.45, -0.45],
    [0.0, 0.65],
  ];

  for (let i = 0; i < baseTriangle.length - 1; i++) {
    const p1 = baseTriangle[i];
    const p2 = baseTriangle[i + 1];
    for (let s = 0; s < 10; s++) {
      const u = s / 10;
      const bx = p1[0] * (1 - u) + p2[0] * u;
      const by = p1[1] * (1 - u) + p2[1] * u;
      // Rotate
      const rx = bx * Math.cos(rot) - by * Math.sin(rot);
      const ry = bx * Math.sin(rot) + by * Math.cos(rot);
      pts.push([rx * 0.7, ry * 0.7]);
    }
  }
  return pts;
}

function createQuantumStarPoints(pointsCount: number = 8, pulse: number = 1.0): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const steps = pointsCount * 8;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = (0.3 + 0.35 * Math.abs(Math.sin(pointsCount * t))) * pulse;
    const x = Math.cos(t) * r;
    const y = Math.sin(t) * r;
    pts.push([x, y]);
  }
  return pts;
}

export function getDefaultSequenceGenerators(): SequenceGeneratorItem[] {
  const now = new Date().toISOString();

  // Generator 1: Lapin Blanc & Terrier Brun (Requested by user)
  const rabbitGen: SequenceGeneratorItem = {
    id: 'seq_gen_rabbit_burrow_01',
    name: 'Générateur Lapin Blanc & Terrier Brun',
    category: 'narrative_animation',
    description: 'Animation narrative complète : le lapin arrive à gauche, saute en 2 bonds, le terrier brun apparaît et il plonge dedans.',
    createdAt: now,
    primaryColor: '#ffffff', // Blanc original modifiable en Bleu, Vert, etc.
    secondaryColor: '#ffb3c6', // Oreilles roses
    burrowColor: '#8b4513', // Terrier géologique brun
    scale: 1.0, // Échelle 1.0 modifiable (plus gros / plus petit)
    offsetX: 0.0,
    offsetY: 0.0,
    rotationDeg: 0,
    speedMultiplier: 1.0,
    fillEnabled: true,
    fillOpacity: 0.85,
    durationSec: 6.0,
    fps: 30,
    baseFrequency: 216,
    isActiveInScope: true,
    keyframes: [
      {
        id: 'kf_1',
        label: '1. Arrivée à gauche (-0.85)',
        points: createRabbitPoints(0.28, -0.8, -0.35),
        color: '#ffffff',
        fillChannels: [
          { id: 'fc_fur', name: 'Fourrure Lapin', color: '#ffffff', opacity: 0.9, style: 'solid', seedX: -0.8, seedY: -0.35, enabled: true },
          { id: 'fc_ears', name: 'Oreilles', color: '#ffb3c6', opacity: 0.8, style: 'neon_glow', seedX: -0.8, seedY: -0.15, enabled: true }
        ],
      },
      {
        id: 'kf_2',
        label: '2. Premier bond aérien',
        points: createRabbitPoints(0.32, -0.45, 0.25),
        color: '#ffffff',
        fillChannels: [
          { id: 'fc_fur', name: 'Fourrure Lapin', color: '#ffffff', opacity: 0.9, style: 'solid', seedX: -0.45, seedY: 0.25, enabled: true }
        ],
      },
      {
        id: 'kf_3',
        label: '3. Réception au centre (0.0)',
        points: createRabbitPoints(0.33, 0.0, -0.45),
        color: '#ffffff',
        fillChannels: [
          { id: 'fc_fur', name: 'Fourrure Lapin', color: '#ffffff', opacity: 0.9, style: 'solid', seedX: 0.0, seedY: -0.45, enabled: true }
        ],
      },
      {
        id: 'kf_4',
        label: '4. Ouverture du terrier brun devant',
        points: [...createRabbitPoints(0.32, 0.0, -0.45), ...createBurrowHolePoints(0.35, 0.2, 0.45, -0.55)],
        color: '#ffffff',
        fillChannels: [
          { id: 'fc_fur', name: 'Fourrure Lapin', color: '#ffffff', opacity: 0.9, style: 'solid', seedX: 0.0, seedY: -0.45, enabled: true },
          { id: 'fc_hole', name: 'Terrier Brun', color: '#8b4513', opacity: 0.9, style: 'crt_hatch', seedX: 0.45, seedY: -0.55, enabled: true }
        ],
      },
      {
        id: 'kf_5',
        label: '5. Plongeon dans le trou',
        points: [...createRabbitPoints(0.24, 0.35, -0.32), ...createBurrowHolePoints(0.38, 0.22, 0.45, -0.55)],
        color: '#d2691e',
        fillChannels: [
          { id: 'fc_fur', name: 'Lapin Plongeant', color: '#ffffff', opacity: 0.8, style: 'solid', seedX: 0.35, seedY: -0.32, enabled: true },
          { id: 'fc_hole', name: 'Terrier Brun', color: '#8b4513', opacity: 0.95, style: 'solid', seedX: 0.45, seedY: -0.55, enabled: true }
        ],
      },
      {
        id: 'kf_6',
        label: '6. Disparu - Rémanence du terrier',
        points: createBurrowHolePoints(0.42, 0.24, 0.45, -0.55),
        color: '#8b4513',
        fillChannels: [
          { id: 'fc_hole', name: 'Terrier Brun Seul', color: '#8b4513', opacity: 0.95, style: 'radial_glow', seedX: 0.45, seedY: -0.55, enabled: true }
        ],
      },
    ],
  };

  // Generator 2: Papillon Phosphore
  const butterflyGen: SequenceGeneratorItem = {
    id: 'seq_gen_butterfly_02',
    name: 'Générateur Papillon Phosphore & Morphing',
    category: 'procedural_morph',
    description: 'Battement d’ailes 3D et ondulation oscilloscopique haute fidélité.',
    createdAt: now,
    primaryColor: '#00f5d4',
    secondaryColor: '#38bdf8',
    scale: 1.0,
    offsetX: 0.0,
    offsetY: 0.0,
    rotationDeg: 0,
    speedMultiplier: 1.0,
    fillEnabled: true,
    fillOpacity: 0.7,
    durationSec: 4.0,
    fps: 30,
    baseFrequency: 432,
    keyframes: [
      { id: 'bkf_1', label: 'Ailes ouvertes', points: createButterflyPoints(0.0), color: '#00f5d4' },
      { id: 'bkf_2', label: 'Ailes repliées', points: createButterflyPoints(0.25), color: '#38bdf8' },
      { id: 'bkf_3', label: 'Ailes fermées', points: createButterflyPoints(0.5), color: '#818cf8' },
      { id: 'bkf_4', label: 'Ailes déployées', points: createButterflyPoints(0.75), color: '#00f5d4' },
    ],
  };

  // Generator 3: Vaisseau Spatial Hyperespace
  const spaceshipGen: SequenceGeneratorItem = {
    id: 'seq_gen_spaceship_03',
    name: 'Générateur Vaisseau Vectoriel & Anneaux',
    category: 'geometric_loop',
    description: 'Trajectoire géométrique d’un intercepteur vectoriel traversant des distorsions.',
    createdAt: now,
    primaryColor: '#3b82f6',
    secondaryColor: '#a855f7',
    scale: 1.0,
    offsetX: 0.0,
    offsetY: 0.0,
    rotationDeg: 0,
    speedMultiplier: 1.0,
    fillEnabled: false,
    fillOpacity: 0.5,
    durationSec: 3.5,
    fps: 30,
    baseFrequency: 324,
    keyframes: [
      { id: 'skf_1', label: 'Cap 0°', points: createSpaceshipPoints(0.0), color: '#3b82f6' },
      { id: 'skf_2', label: 'Virage 90°', points: createSpaceshipPoints(0.25), color: '#6366f1' },
      { id: 'skf_3', label: 'Plein Gaz 180°', points: createSpaceshipPoints(0.5), color: '#a855f7' },
      { id: 'skf_4', label: 'Boucle 270°', points: createSpaceshipPoints(0.75), color: '#3b82f6' },
    ],
  };

  // Generator 4: Étoile Quantique
  const starGen: SequenceGeneratorItem = {
    id: 'seq_gen_quantum_star_04',
    name: 'Générateur Étoile Quantique & Pulsation',
    category: 'harmonic_flow',
    description: 'Pulsation harmonique 8 branches avec modulation de brillance et ondes coronales.',
    createdAt: now,
    primaryColor: '#fbbf24',
    secondaryColor: '#f97316',
    scale: 1.0,
    offsetX: 0.0,
    offsetY: 0.0,
    rotationDeg: 0,
    speedMultiplier: 1.0,
    fillEnabled: true,
    fillOpacity: 0.75,
    durationSec: 3.0,
    fps: 30,
    baseFrequency: 528,
    keyframes: [
      { id: 'qkf_1', label: 'Étoile Compacte', points: createQuantumStarPoints(8, 0.7), color: '#fbbf24' },
      { id: 'qkf_2', label: 'Expansion Éruptive', points: createQuantumStarPoints(8, 1.25), color: '#f59e0b' },
      { id: 'qkf_3', label: 'Apogée Lumineuse', points: createQuantumStarPoints(8, 1.45), color: '#ef4444' },
      { id: 'qkf_4', label: 'Refroidissement', points: createQuantumStarPoints(8, 0.9), color: '#fbbf24' },
    ],
  };

  return [rabbitGen, butterflyGen, spaceshipGen, starGen];
}

export function loadSequenceGenerators(): SequenceGeneratorItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = getDefaultSequenceGenerators();
      saveSequenceGenerators(defaults);
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const defaults = getDefaultSequenceGenerators();
    saveSequenceGenerators(defaults);
    return defaults;
  } catch (e) {
    console.error('Error loading sequence generators from localStorage:', e);
    return getDefaultSequenceGenerators();
  }
}

export function saveSequenceGenerators(generators: SequenceGeneratorItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(generators));
  } catch (e) {
    console.error('Error saving sequence generators to localStorage:', e);
  }
}

/**
 * Transforms points according to generator Scale, Offset X, Offset Y, and RotationDeg
 */
export function applyGeneratorTransformations(
  points: Array<[number, number]>,
  scale: number,
  offsetX: number,
  offsetY: number,
  rotationDeg: number
): Array<[number, number]> {
  if (!points || points.length === 0) return [];
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return points.map(([x, y]) => {
    // 1. Scale
    const sx = x * scale;
    const sy = y * scale;
    // 2. Rotate
    const rx = sx * cos - sy * sin;
    const ry = sx * sin + sy * cos;
    // 3. Offset
    const finalX = rx + offsetX;
    const finalY = ry + offsetY;
    return [
      Math.max(-1.0, Math.min(1.0, finalX)),
      Math.max(-1.0, Math.min(1.0, finalY)),
    ];
  });
}

/**
 * Computes dynamic offset at time T from all temporal corrections
 * Auto-equilibration:
 * - '1_frame': applied only on the exact frame
 * - '1_sec': cosine window of 1.0s (±0.5s)
 * - '5_sec': cosine window of 5.0s (±2.5s) as requested: "sur 2 secondes et demie avant et 2 secondes et demie après, ça va auto-ajuster pour que ça prenne sa place. Ultra-soft, sans que ça paraisse qu'il y a une modification."
 * - '10_sec': cosine window of 10.0s (±5.0s)
 * - 'all': constant offset over entire animation
 */
export function computeTemporalOffsetAtTime(
  generator: SequenceGeneratorItem,
  timeSec: number
): { autoDeltaX: number; autoDeltaY: number; activeWeightsCount: number } {
  let autoDeltaX = 0;
  let autoDeltaY = 0;
  let activeWeightsCount = 0;

  const corrections = generator.temporalCorrections;
  if (!corrections || corrections.length === 0) {
    return { autoDeltaX: 0, autoDeltaY: 0, activeWeightsCount: 0 };
  }

  const duration = Math.max(0.2, (generator.durationSec || 1) / Math.max(0.1, generator.speedMultiplier || 1));
  const tMod = timeSec % duration;

  for (const corr of corrections) {
    let weight = 0;

    if (corr.span === 'all') {
      weight = 1.0;
    } else if (corr.span === '1_frame') {
      const frameDur = 1 / Math.max(1, generator.fps || 30);
      const dt = Math.abs(tMod - (corr.timeSec % duration));
      if (dt <= frameDur * 0.6) {
        weight = 1.0;
      }
    } else {
      // Raised cosine bell curve for '1_sec', '5_sec', '10_sec'
      const windowDur = corr.windowDurationSec || (corr.span === '5_sec' ? 5.0 : corr.span === '1_sec' ? 1.0 : 10.0);
      const halfWindow = windowDur / 2; // e.g. 2.5s for 5s span
      
      const centerT = corr.timeSec % duration;
      let dt = Math.abs(tMod - centerT);
      if (dt > duration / 2) {
        dt = duration - dt;
      }

      if (dt <= halfWindow) {
        // Normalized distance u from 0 (center) to 1 (edge)
        const u = dt / halfWindow;
        // Raised cosine / Hann window: smoothly 1 at center, exactly 0 with 0 derivative at edge (ultra-soft)
        weight = 0.5 * (1 + Math.cos(Math.PI * u));
      }
    }

    if (weight > 0.001) {
      autoDeltaX += corr.deltaX * weight;
      autoDeltaY += corr.deltaY * weight;
      activeWeightsCount++;
    }
  }

  return { autoDeltaX, autoDeltaY, activeWeightsCount };
}

/**
 * Smoothly interpolates the generator points at current time T
 */
export function sampleGeneratorAtTime(
  generator: SequenceGeneratorItem,
  timeSec: number
): {
  points: Array<[number, number]>;
  currentColor: string;
  fillChannels?: PatternFillChannel[];
  autoDeltaX: number;
  autoDeltaY: number;
} {
  const { autoDeltaX, autoDeltaY } = computeTemporalOffsetAtTime(generator, timeSec);
  const effectiveOffsetX = generator.offsetX + autoDeltaX;
  const effectiveOffsetY = generator.offsetY + autoDeltaY;

  const kfs = generator.keyframes;
  if (!kfs || kfs.length === 0) {
    return { points: [], currentColor: generator.primaryColor, autoDeltaX, autoDeltaY };
  }
  if (kfs.length === 1) {
    const rawPts = kfs[0].points || [];
    const transformed = applyGeneratorTransformations(
      rawPts,
      generator.scale,
      effectiveOffsetX,
      effectiveOffsetY,
      generator.rotationDeg
    );
    return {
      points: transformed,
      currentColor: generator.primaryColor,
      fillChannels: kfs[0].fillChannels,
      autoDeltaX,
      autoDeltaY,
    };
  }

  const effectiveDuration = Math.max(0.2, (generator.durationSec || 1) / Math.max(0.1, generator.speedMultiplier || 1));
  const tNorm = (timeSec % effectiveDuration) / effectiveDuration; // 0..1
  const segmentFloat = tNorm * kfs.length;
  let idxA = (Math.floor(segmentFloat) % kfs.length + kfs.length) % kfs.length;
  if (isNaN(idxA)) idxA = 0;
  let idxB = (idxA + 1) % kfs.length;
  if (isNaN(idxB)) idxB = 0;
  let blend = segmentFloat - Math.floor(segmentFloat);
  if (isNaN(blend)) blend = 0;
  
  const kfA = kfs[idxA] || kfs[0];
  const kfB = kfs[idxB] || kfs[0];
  const ptsA = kfA?.points || [];
  const ptsB = kfB?.points || [];

  const maxLen = Math.max(ptsA.length, ptsB.length);
  const interpolated: Array<[number, number]> = [];

  for (let i = 0; i < maxLen; i++) {
    const pA = ptsA.length > 0 ? ptsA[i % ptsA.length] : [0, 0];
    const pB = ptsB.length > 0 ? ptsB[i % ptsB.length] : [0, 0];
    const ix = pA[0] * (1 - blend) + pB[0] * blend;
    const iy = pA[1] * (1 - blend) + pB[1] * blend;
    interpolated.push([ix, iy]);
  }

  const transformed = applyGeneratorTransformations(
    interpolated,
    generator.scale,
    effectiveOffsetX,
    effectiveOffsetY,
    generator.rotationDeg
  );

  return {
    points: transformed,
    currentColor: generator.primaryColor,
    fillChannels: kfs[idxA].fillChannels,
    autoDeltaX,
    autoDeltaY,
  };
}
