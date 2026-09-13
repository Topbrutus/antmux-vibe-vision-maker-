import { PatternItem } from '../types/vectorScope';

const PATTERNS_STORAGE_KEY = 'genesis_vector_lab_pattern_library_v1';

// Algorithmic helpers for pre-encoded colorful patterns
function generateEncodedRabbitPattern(): { points: Array<[number, number]>; pointColors: string[]; segmentColors: Record<number, string> } {
  const points: Array<[number, number]> = [];
  const pointColors: string[] = [];
  const segmentColors: Record<number, string> = {};

  // 1. Lapin Blanc & Oreilles Roses (72 points)
  const rabbitSteps = 72;
  for (let i = 0; i <= rabbitSteps; i++) {
    const t = (i / rabbitSteps) * Math.PI * 2;
    let r = 1.0;
    r += 0.25 * Math.sin(t);

    let col = '#ffffff'; // Blanc fourrure
    if (t > 1.2 && t < 1.9) {
      // Oreilles roses
      r += 1.35 * Math.sin((t - 1.2) * (Math.PI / 0.7));
      col = '#ffb3c6'; // Rose intérieur oreilles
    } else if (t > 4.2 && t < 4.9) {
      // Queue
      r += 0.45 * Math.sin((t - 4.2) * (Math.PI / 0.7));
      col = '#f8fafc';
    } else if (t > 0.4 && t < 0.7) {
      // Zone yeux
      col = '#fca5a5';
    }

    const x = Math.cos(t) * r * 0.32;
    const y = -0.1 + Math.sin(t) * r * 0.32;
    points.push([Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]);
    pointColors.push(col);
  }

  // 2. Terrier Brun Géologique (54 points)
  const holeSteps = 54;
  for (let i = 0; i <= holeSteps; i++) {
    const t = (i / holeSteps) * Math.PI * 2;
    const jitter = 1.0 + 0.08 * Math.sin(5 * t);
    const x = 0.45 + Math.cos(t) * 0.38 * jitter;
    const y = -0.55 + Math.sin(t) * 0.2 * jitter;
    points.push([Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]);
    pointColors.push('#8b4513'); // Brun terrier géologique
  }

  // Segment colors mapping
  for (let s = 0; s < 12; s++) {
    if (s >= 2 && s <= 4) segmentColors[s] = '#ffb3c6'; // Oreilles
    else if (s >= 8) segmentColors[s] = '#8b4513'; // Terrier
    else segmentColors[s] = '#ffffff'; // Fourrure blanche
  }

  return { points, pointColors, segmentColors };
}

const defaultRabbit = generateEncodedRabbitPattern();

export const DEFAULT_PATTERNS: PatternItem[] = [
  {
    id: 'pat_rabbit_burrow_chroma',
    name: 'Lapin Blanc & Terrier Brun (Encodage RGB)',
    description: 'Lapin à fourrure blanche et oreilles roses avec son terrier géologique brun encodé point par point',
    createdAt: new Date().toISOString(),
    sourceModule: 'SÉQUENCE NARRATIVE',
    color: '#ffffff',
    colorEncoding: 'laser_chroma',
    points: defaultRabbit.points,
    pointColors: defaultRabbit.pointColors,
    segmentColors: defaultRabbit.segmentColors,
    fillChannels: [
      { id: 'fc_fur', name: 'Fourrure Blanche', color: '#ffffff', opacity: 0.9, style: 'solid', seedX: 0.0, seedY: -0.1, enabled: true },
      { id: 'fc_ears', name: 'Oreilles Roses', color: '#ffb3c6', opacity: 0.85, style: 'neon_glow', seedX: 0.0, seedY: 0.2, enabled: true },
      { id: 'fc_hole', name: 'Terrier Brun', color: '#8b4513', opacity: 0.95, style: 'crt_hatch', seedX: 0.45, seedY: -0.55, enabled: true },
    ],
    isFavorite: true,
  },
  {
    id: 'pat_lotus_sacred',
    name: 'Lotus Sacré Vectoriel',
    description: 'Fleur de lotus géométrique 8 pétales sans ligne de retour',
    createdAt: new Date().toISOString(),
    sourceModule: 'IMAGE VECTORIELLE',
    color: '#00f5d4',
    colorEncoding: 'monochrome',
    isFavorite: true,
    points: (() => {
      const pts: Array<[number, number]> = [];
      const numPoints = 360;
      for (let i = 0; i <= numPoints; i++) {
        const theta = (i / numPoints) * 2 * Math.PI;
        const r = 0.5 + 0.35 * Math.cos(8 * theta);
        pts.push([r * Math.cos(theta), r * Math.sin(theta)]);
      }
      return pts;
    })(),
  },
  {
    id: 'pat_harmonic_eight',
    name: 'Octagramme Étoilé Pur',
    description: 'Tracé en étoile 8 pointes sans diagonale parasite',
    createdAt: new Date().toISOString(),
    sourceModule: 'MANDALA COMPOSER',
    color: '#38bdf8',
    colorEncoding: 'monochrome',
    isFavorite: true,
    points: (() => {
      const pts: Array<[number, number]> = [];
      const steps = 400;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * 4 * Math.PI;
        const r = 0.8 * Math.sin(4 * t);
        pts.push([r * Math.cos(t), r * Math.sin(t)]);
      }
      return pts;
    })(),
  },
  {
    id: 'pat_lissajous_3_2',
    name: 'Lissajous 3:2 Harmonique',
    description: 'Figure classique de laboratoire purifiée',
    createdAt: new Date().toISOString(),
    sourceModule: 'LABORATOIRE X/Y',
    color: '#f59e0b',
    colorEncoding: 'monochrome',
    isFavorite: false,
    points: (() => {
      const pts: Array<[number, number]> = [];
      const count = 300;
      for (let i = 0; i <= count; i++) {
        const t = (i / count) * 2 * Math.PI;
        pts.push([0.8 * Math.sin(3 * t), 0.8 * Math.sin(2 * t + Math.PI / 4)]);
      }
      return pts;
    })(),
  },
  {
    id: 'pat_spiral_clean',
    name: 'Double Spirale d’Archimède',
    description: 'Spirale équilibrée centrée',
    createdAt: new Date().toISOString(),
    sourceModule: 'VORTEX DESIGNER',
    color: '#a855f7',
    colorEncoding: 'monochrome',
    isFavorite: false,
    points: (() => {
      const pts: Array<[number, number]> = [];
      const count = 400;
      for (let i = 0; i <= count; i++) {
        const t = (i / count) * 6 * Math.PI;
        const r = (i / count) * 0.85;
        pts.push([r * Math.cos(t), r * Math.sin(t)]);
      }
      return pts;
    })(),
  },
];

export function getSavedPatterns(): PatternItem[] {
  try {
    const raw = localStorage.getItem(PATTERNS_STORAGE_KEY);
    if (!raw) return DEFAULT_PATTERNS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PATTERNS;
  } catch (e) {
    console.error('Failed to load patterns:', e);
    return DEFAULT_PATTERNS;
  }
}

export function savePattern(pattern: Omit<PatternItem, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): PatternItem {
  const current = getSavedPatterns();
  const newItem: PatternItem = {
    ...pattern,
    id: pattern.id || `pattern_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: pattern.createdAt || new Date().toISOString(),
  };

  const filtered = current.filter((p) => p.id !== newItem.id);
  const updated = [newItem, ...filtered];
  localStorage.setItem(PATTERNS_STORAGE_KEY, JSON.stringify(updated));
  return newItem;
}

export function deletePattern(id: string): PatternItem[] {
  const current = getSavedPatterns();
  const updated = current.filter((p) => p.id !== id);
  localStorage.setItem(PATTERNS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function exportPatternsToJson(): string {
  const patterns = getSavedPatterns();
  return JSON.stringify(
    {
      app: 'GENESIS VECTOR LAB',
      type: 'pattern_library',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      patterns,
    },
    null,
    2
  );
}

export function importPatternsFromJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    const incoming: PatternItem[] = Array.isArray(data) ? data : data.patterns;
    if (!Array.isArray(incoming)) {
      return { success: false, count: 0, error: 'Format JSON invalide' };
    }

    const current = getSavedPatterns();
    const existingIds = new Set(current.map((p) => p.id));
    const merged = [...current];

    let addedCount = 0;
    for (const p of incoming) {
      if (p && p.name && Array.isArray(p.points)) {
        if (!existingIds.has(p.id)) {
          merged.push(p);
          existingIds.add(p.id);
          addedCount++;
        }
      }
    }

    localStorage.setItem(PATTERNS_STORAGE_KEY, JSON.stringify(merged));
    return { success: true, count: addedCount };
  } catch (e: any) {
    return { success: false, count: 0, error: e?.message || 'Erreur de lecture' };
  }
}
