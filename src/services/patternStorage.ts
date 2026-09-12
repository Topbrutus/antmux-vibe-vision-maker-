import { PatternItem } from '../types/vectorScope';

const PATTERNS_STORAGE_KEY = 'genesis_vector_lab_pattern_library_v1';

export const DEFAULT_PATTERNS: PatternItem[] = [
  {
    id: 'pat_lotus_sacred',
    name: 'Lotus Sacré Vectoriel',
    description: 'Fleur de lotus géométrique 8 pétales sans ligne de retour',
    createdAt: new Date().toISOString(),
    sourceModule: 'IMAGE VECTORIELLE',
    color: '#00f5d4',
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
