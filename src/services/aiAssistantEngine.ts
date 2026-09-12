/**
 * Vector AI Assistant & Autonomous Generator Service
 *
 * Handles:
 * 1. AI Assistant Chat (Q&A, suggestions, shape & harmonic advice, troubleshooting, coloring suggestions)
 * 2. Visual AI Co-Pilot / Ghost Cursor Animation (animates a virtual glowing cursor navigating controls, knobs, cards)
 * 3. Autonomous Generator Setup (applies precise Octa Generator frequencies, quarter-tones, waveforms, phases, and gains)
 * 4. Autonomous Pattern Generation & Coloring (creates or corrects shapes, rabbit jumping into hole animation vector sequence)
 * 5. Autonomous Timeline Scene Assembly (builds automated multi-scene sequences with morph/crossfade transitions)
 */

import { OctaSystemState, PatternItem, TimelineScene, WaveformType } from '../types/vectorScope';
import { createDefaultOctaSystem } from './mathEngine';

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  actionTaken?: 'generators_configured' | 'pattern_created' | 'timeline_assembled' | 'colored_pattern' | 'rabbit_scene';
  createdPattern?: PatternItem;
  cursorActionSummary?: string;
}

export interface VirtualCursorTarget {
  elementSelector?: string;
  xRatio: number; // 0..1 relative to viewport width
  yRatio: number; // 0..1 relative to viewport height
  label: string;
  actionType: 'move' | 'click' | 'turn_dial' | 'type' | 'tune_f0' | 'apply_color';
  durationMs: number;
}

/**
 * Procedural Vector Rabbit & Hole Animation Generator
 * Creates an animated series of points depicting:
 * "un lapin blanc qui arrive de la gauche, saute jusqu'au milieu en deux bonds,
 * puis un trou brun apparaît devant lui, et le lapin saute dedans et disparaît"
 */
export function generateRabbitAndHoleSequence(): {
  scenes: TimelineScene[];
  keyframePatterns: PatternItem[];
} {
  const timestamp = Date.now();
  const patterns: PatternItem[] = [];

  // Generate vector contour for a cartoon bunny
  // Ears, head, body, fluffy tail, legs
  const createRabbitContour = (scale: number = 0.35, offsetX: number = 0, offsetY: number = 0, squat: number = 0): Array<[number, number]> => {
    const pts: Array<[number, number]> = [];
    const N = 120;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * 2 * Math.PI;
      // Parametric bunny silhouette
      let rx = Math.cos(t) * 0.7;
      let ry = Math.sin(t) * (0.85 - squat * 0.25);

      // Left ear bump
      if (t > 0.8 && t < 1.4) {
        const earPhase = (t - 0.8) / 0.6;
        ry += Math.sin(earPhase * Math.PI) * 1.2;
        rx -= 0.15;
      }
      // Right ear bump
      if (t > 1.7 && t < 2.3) {
        const earPhase = (t - 1.7) / 0.6;
        ry += Math.sin(earPhase * Math.PI) * 1.3;
        rx += 0.15;
      }
      // Fluffy round tail
      if (t > 3.8 && t < 4.4) {
        const tailPhase = (t - 3.8) / 0.6;
        rx -= Math.sin(tailPhase * Math.PI) * 0.35;
        ry -= 0.1;
      }

      pts.push([
        offsetX + rx * scale,
        offsetY + ry * scale
      ]);
    }
    return pts;
  };

  // Generate vector contour for a ground burrow hole
  const createHoleContour = (scale: number = 0.4, offsetX: number = 0.3, offsetY: number = -0.55, depth: number = 1.0): Array<[number, number]> => {
    const pts: Array<[number, number]> = [];
    const N = 80;
    // Elliptical hole on ground with dark concentric inner spiral
    for (let i = 0; i < N; i++) {
      const t = (i / N) * 2 * Math.PI * depth;
      const r = 1.0 - (i / N) * 0.45;
      const hx = Math.cos(t) * 1.3 * scale * r;
      const hy = Math.sin(t) * 0.45 * scale * r;
      pts.push([offsetX + hx, offsetY + hy]);
    }
    return pts;
  };

  // Combined keyframes
  // Frame 1: Lapin apparaît à l'extrême gauche
  const f1Rabbit = createRabbitContour(0.3, -0.85, -0.4, 0.1);
  const p1: PatternItem = {
    id: `pat_rabbit_f1_${timestamp}`,
    name: 'Lapin Blanc - Départ Gauche',
    description: 'Lapin blanc vectoriel à gauche de la scène',
    createdAt: new Date().toISOString(),
    sourceModule: 'ai_assistant',
    points: f1Rabbit,
    color: '#ffffff',
    fillChannels: [
      { id: 'ch_bunny_white', name: 'Fourrure Blanche', color: '#ffffff', opacity: 0.95, style: 'solid', seedX: -0.85, seedY: -0.4, enabled: true },
      { id: 'ch_ears_pink', name: 'Intérieur Oreilles', color: '#ffb3c6', opacity: 0.8, style: 'neon_glow', seedX: -0.85, seedY: -0.15, enabled: true }
    ],
    segmentColors: { 0: '#ffffff', 20: '#ffffff', 40: '#ffc0cb', 70: '#ffffff' }
  };
  patterns.push(p1);

  // Frame 2: Premier bond en l'air
  const f2Rabbit = createRabbitContour(0.32, -0.45, 0.25, -0.2);
  const p2: PatternItem = {
    id: `pat_rabbit_f2_${timestamp}`,
    name: 'Lapin Blanc - Premier Bond Aérien',
    description: 'Premier bond gracieux du lapin vers le centre',
    createdAt: new Date().toISOString(),
    sourceModule: 'ai_assistant',
    points: f2Rabbit,
    color: '#ffffff',
    fillChannels: [
      { id: 'ch_bunny_white', name: 'Fourrure Blanche', color: '#ffffff', opacity: 0.95, style: 'solid', seedX: -0.45, seedY: 0.25, enabled: true }
    ],
    segmentColors: { 0: '#ffffff', 50: '#f8fafc' }
  };
  patterns.push(p2);

  // Frame 3: Réception au sol au milieu
  const f3Rabbit = createRabbitContour(0.34, 0.0, -0.45, 0.35);
  const p3: PatternItem = {
    id: `pat_rabbit_f3_${timestamp}`,
    name: 'Lapin Blanc - Au Milieu (Préparation)',
    description: 'Lapin blanc au centre observant la terre',
    createdAt: new Date().toISOString(),
    sourceModule: 'ai_assistant',
    points: f3Rabbit,
    color: '#ffffff',
    fillChannels: [
      { id: 'ch_bunny_white', name: 'Fourrure Blanche', color: '#ffffff', opacity: 0.95, style: 'solid', seedX: 0.0, seedY: -0.45, enabled: true }
    ],
    segmentColors: { 0: '#ffffff' }
  };
  patterns.push(p3);

  // Frame 4: Trou brun apparaît devant le lapin (à x = 0.4, y = -0.55)
  const f4Hole = createHoleContour(0.45, 0.45, -0.55, 1.2);
  const f4Combined = [...createRabbitContour(0.32, 0.0, -0.45, 0.1), ...f4Hole];
  const p4: PatternItem = {
    id: `pat_rabbit_f4_${timestamp}`,
    name: 'Trou Brun Apparaît Devant le Lapin',
    description: 'Ouverture géologique d’un terrier brun devant le lapin',
    createdAt: new Date().toISOString(),
    sourceModule: 'ai_assistant',
    points: f4Combined,
    color: '#a0522d',
    fillChannels: [
      { id: 'ch_rabbit', name: 'Lapin Blanc', color: '#ffffff', opacity: 0.95, style: 'solid', seedX: 0.0, seedY: -0.45, enabled: true },
      { id: 'ch_hole_brown', name: 'Terrier Brun', color: '#8b4513', opacity: 0.9, style: 'crt_hatch', seedX: 0.45, seedY: -0.55, enabled: true }
    ],
    segmentColors: { 0: '#ffffff', 120: '#8b4513', 160: '#5c2c16' }
  };
  patterns.push(p4);

  // Frame 5: Le lapin saute la tête la première dans le trou brun
  const f5Plunge = [...createRabbitContour(0.24, 0.35, -0.3, 0.4), ...createHoleContour(0.45, 0.45, -0.55, 1.3)];
  const p5: PatternItem = {
    id: `pat_rabbit_f5_${timestamp}`,
    name: 'Lapin Blanc - Saut Dans le Trou',
    description: 'Le lapin plonge tête première dans le terrier brun',
    createdAt: new Date().toISOString(),
    sourceModule: 'ai_assistant',
    points: f5Plunge,
    color: '#d2691e',
    fillChannels: [
      { id: 'ch_rabbit', name: 'Lapin Plongeant', color: '#ffffff', opacity: 0.85, style: 'solid', seedX: 0.35, seedY: -0.3, enabled: true },
      { id: 'ch_hole', name: 'Terrier Brun', color: '#8b4513', opacity: 0.95, style: 'solid', seedX: 0.45, seedY: -0.55, enabled: true }
    ],
    segmentColors: { 0: '#ffffff', 120: '#8b4513' }
  };
  patterns.push(p5);

  // Frame 6: Le lapin a disparu ! Seul le terrier brun reste avec ondulations
  const f6HoleOnly = createHoleContour(0.45, 0.45, -0.55, 1.5);
  const p6: PatternItem = {
    id: `pat_rabbit_f6_${timestamp}`,
    name: 'Terrier Brun Seul (Lapin Disparu)',
    description: 'Le lapin a disparu dans le terrier brun, rémanence de terre',
    createdAt: new Date().toISOString(),
    sourceModule: 'ai_assistant',
    points: f6HoleOnly,
    color: '#8b4513',
    fillChannels: [
      { id: 'ch_hole', name: 'Terrier Brun Terrestre', color: '#8b4513', opacity: 0.95, style: 'radial_glow', seedX: 0.45, seedY: -0.55, enabled: true }
    ],
    segmentColors: { 0: '#8b4513', 40: '#5c2c16', 70: '#3e1d0c' }
  };
  patterns.push(p6);

  // Timeline scenes
  const scenes: TimelineScene[] = [
    {
      id: `scene_rabbit_1_${timestamp}`,
      name: '1. Arrivée du Lapin Blanc (Gauche)',
      type: 'preset',
      duration: 2.0,
      transition: 'morph',
      transitionDuration: 0.8,
    },
    {
      id: `scene_rabbit_2_${timestamp}`,
      name: '2. Premier Bond Aérien',
      type: 'preset',
      duration: 1.8,
      transition: 'morph',
      transitionDuration: 0.6,
    },
    {
      id: `scene_rabbit_3_${timestamp}`,
      name: '3. Atterrissage au Milieu',
      type: 'preset',
      duration: 1.5,
      transition: 'crossfade',
      transitionDuration: 0.5,
    },
    {
      id: `scene_rabbit_4_${timestamp}`,
      name: '4. Apparition du Trou Brun',
      type: 'preset',
      duration: 2.2,
      transition: 'morph',
      transitionDuration: 0.6,
    },
    {
      id: `scene_rabbit_5_${timestamp}`,
      name: '5. Saut & Disparition dans le Trou',
      type: 'preset',
      duration: 2.0,
      transition: 'spin',
      transitionDuration: 0.8,
    },
    {
      id: `scene_rabbit_6_${timestamp}`,
      name: '6. Terrier Brun - Disparition Totale',
      type: 'preset',
      duration: 2.5,
      transition: 'crossfade',
      transitionDuration: 0.8,
    }
  ];

  return { scenes, keyframePatterns: patterns };
}

/**
 * Configure 8-generator table automatically for a requested shape/harmonic
 */
export function buildAutonomousOctaSetup(request: string): {
  octa: OctaSystemState;
  explanation: string;
} {
  const clean = request.toLowerCase();
  const octa = createDefaultOctaSystem();

  if (clean.includes('mandala') || clean.includes('rosace') || clean.includes('sacré')) {
    octa.masterFrequency = 216;
    octa.tuningMode = 'LOCKED';
    octa.mixerLeft.gain = 1.0;
    octa.mixerRight.gain = 1.0;

    // L1: Fondamentale X
    octa.generators.L1.enabled = true;
    octa.generators.L1.waveform = 'sine';
    octa.generators.L1.amplitude = 0.85;
    octa.generators.L1.quarterToneOffset = 0;
    octa.generators.L1.phase = 0;

    // L2: Harmonique 3
    octa.generators.L2.enabled = true;
    octa.generators.L2.waveform = 'triangle';
    octa.generators.L2.amplitude = 0.45;
    octa.generators.L2.quarterToneOffset = 12; // +1 octave
    octa.generators.L2.phase = 45;

    // R1: Fondamentale Y déphasée 90°
    octa.generators.R1.enabled = true;
    octa.generators.R1.waveform = 'sine';
    octa.generators.R1.amplitude = 0.85;
    octa.generators.R1.quarterToneOffset = 0;
    octa.generators.R1.phase = 90;

    // R2: Harmonique 5
    octa.generators.R2.enabled = true;
    octa.generators.R2.waveform = 'sine';
    octa.generators.R2.amplitude = 0.4;
    octa.generators.R2.quarterToneOffset = 16;
    octa.generators.R2.phase = 180;

    return {
      octa,
      explanation: 'Configuration harmonique Mandala Sacré 216 Hz générée avec succès sur la table des 8 oscillateurs (f0, octaves pures et ratios pythagoriciens).',
    };
  }

  if (clean.includes('spirale') || clean.includes('vortex')) {
    octa.masterFrequency = 108;
    octa.tuningMode = 'LOCKED';
    octa.mixerLeft.gain = 0.95;
    octa.mixerRight.gain = 0.95;

    octa.generators.L1.enabled = true;
    octa.generators.L1.waveform = 'sawtooth_up';
    octa.generators.L1.amplitude = 0.8;
    octa.generators.L1.phase = 0;

    octa.generators.R1.enabled = true;
    octa.generators.R1.waveform = 'sine';
    octa.generators.R1.amplitude = 0.8;
    octa.generators.R1.phase = 90;

    octa.generators.R2.enabled = true;
    octa.generators.R2.waveform = 'triangle';
    octa.generators.R2.amplitude = 0.35;
    octa.generators.R2.quarterToneOffset = 7;
    octa.generators.R2.phase = 180;

    return {
      octa,
      explanation: 'Configuration Spirale / Vortex créée à 108 Hz avec rampe en dents de scie sur X et modulation sinusoïdale orthogonale sur Y.',
    };
  }

  // Default: Étoile harmonique complexe
  octa.masterFrequency = 220;
  octa.tuningMode = 'LOCKED';
  octa.mixerLeft.gain = 1.0;
  octa.mixerRight.gain = 1.0;

  octa.generators.L1.enabled = true;
  octa.generators.L1.waveform = 'sine';
  octa.generators.L1.amplitude = 0.8;
  octa.generators.L1.phase = 0;

  octa.generators.L3.enabled = true;
  octa.generators.L3.waveform = 'square';
  octa.generators.L3.amplitude = 0.25;
  octa.generators.L3.quarterToneOffset = 12;

  octa.generators.R1.enabled = true;
  octa.generators.R1.waveform = 'sine';
  octa.generators.R1.amplitude = 0.8;
  octa.generators.R1.phase = 90;

  octa.generators.R3.enabled = true;
  octa.generators.R3.waveform = 'triangle';
  octa.generators.R3.amplitude = 0.3;
  octa.generators.R3.quarterToneOffset = 19;

  return {
    octa,
    explanation: 'Synthèse géométrique multi-harmonique 220 Hz configurée sur L1/L3 et R1/R3 avec accordage quart de ton.',
  };
}
