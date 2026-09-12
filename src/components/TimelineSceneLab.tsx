import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  Clock,
  Sparkles,
  Sliders,
  ChevronRight,
  Zap,
  Repeat
} from 'lucide-react';
import { TimelineScene, TimelineTransitionType, PresetName } from '../types/vectorScope';
import { generatePresetPoints } from '../services/mathEngine';
import { generatePresetVectorImage } from '../services/imageVectorizer';
import { generateTextVectorPoints } from '../services/vectorFont';

interface TimelineSceneLabProps {
  scenes: TimelineScene[];
  onScenesChange: (newScenes: TimelineScene[]) => void;
  onSendFrameToScope: (points: Array<[number, number]>, sceneLabel: string) => void;
  isActiveInScope: boolean;
}

const DEFAULT_SCENES: TimelineScene[] = [
  {
    id: 'sc_1',
    name: 'Intro : Mandala Genesis',
    type: 'preset',
    presetName: 'Genesis Mandala',
    duration: 4.0,
    transition: 'crossfade',
    transitionDuration: 1.0,
    autoRotation: { startAngle: 0, endAngle: 180 },
  },
  {
    id: 'sc_2',
    name: 'Texte : GENESIS VECTOR LAB',
    type: 'text',
    customText: 'GENESIS VECTOR LAB',
    duration: 5.0,
    transition: 'morph',
    transitionDuration: 1.2,
  },
  {
    id: 'sc_3',
    name: 'Symbole : Lotus Sacré',
    type: 'image',
    imagePreset: 'lotus',
    duration: 4.5,
    transition: 'spin',
    transitionDuration: 1.0,
    autoRotation: { startAngle: 0, endAngle: 360 },
  },
  {
    id: 'sc_4',
    name: 'Harmonique : Rose Neuf Pétales',
    type: 'preset',
    presetName: 'Rose Nine',
    duration: 4.0,
    transition: 'crossfade',
    transitionDuration: 1.0,
  },
];

export const TimelineSceneLab: React.FC<TimelineSceneLabProps> = ({
  scenes = DEFAULT_SCENES,
  onScenesChange,
  onSendFrameToScope,
  isActiveInScope,
}) => {
  const [activeScenes, setActiveScenes] = useState<TimelineScene[]>(
    scenes.length > 0 ? scenes : DEFAULT_SCENES
  );
  const [selectedSceneId, setSelectedSceneId] = useState<string>(activeScenes[0]?.id || 'sc_1');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [loop, setLoop] = useState<boolean>(true);

  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  const totalDuration = activeScenes.reduce((acc, s) => acc + s.duration, 0);

  // Sync back to parent
  const updateScenes = (newSc: TimelineScene[]) => {
    setActiveScenes(newSc);
    onScenesChange(newSc);
  };

  // Find active scene and local time
  const getSceneAtTime = (t: number) => {
    let accumulated = 0;
    for (let i = 0; i < activeScenes.length; i++) {
      const sc = activeScenes[i];
      if (t >= accumulated && t < accumulated + sc.duration) {
        return {
          scene: sc,
          index: i,
          localTime: t - accumulated,
          progress: (t - accumulated) / sc.duration,
          nextScene: activeScenes[(i + 1) % activeScenes.length],
        };
      }
      accumulated += sc.duration;
    }
    return {
      scene: activeScenes[activeScenes.length - 1],
      index: activeScenes.length - 1,
      localTime: activeScenes[activeScenes.length - 1]?.duration || 0,
      progress: 1,
      nextScene: activeScenes[0],
    };
  };

  // Compute points for a given scene
  const getPointsForScene = (sc: TimelineScene, progress: number): Array<[number, number]> => {
    if (sc.type === 'image' && sc.imagePreset) {
      return generatePresetVectorImage(sc.imagePreset);
    }
    if (sc.type === 'text' && sc.customText) {
      return generateTextVectorPoints({
        text: sc.customText,
        scrollProgress: progress,
        scrollDirection: 'right_to_left',
        scale: 0.65,
        letterSpacing: 0.85,
      });
    }
    // Preset
    const pName = sc.presetName || 'Genesis Mandala';
    return generatePresetPoints(pName, 512, 1);
  };

  // Timeline playback loop
  useEffect(() => {
    const loopStep = (timestamp: number) => {
      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (isPlaying && totalDuration > 0) {
        setCurrentTime((prev) => {
          let next = prev + dt;
          if (next >= totalDuration) {
            next = loop ? 0 : totalDuration;
            if (!loop) setIsPlaying(false);
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(loopStep);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loopStep);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, totalDuration, loop]);

  // Frame calculation and transmission to scope
  useEffect(() => {
    if (!isActiveInScope || activeScenes.length === 0) return;

    const { scene, localTime, progress, nextScene } = getSceneAtTime(currentTime);
    if (!scene) return;

    let pts = getPointsForScene(scene, progress);

    // Apply rotation automation if present
    if (scene.autoRotation) {
      const angle =
        scene.autoRotation.startAngle +
        progress * (scene.autoRotation.endAngle - scene.autoRotation.startAngle);
      const rad = (angle * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);
      pts = pts.map(([x, y]) => [x * cosR - y * sinR, x * sinR + y * cosR]);
    }

    // Check transition zone near end of scene
    const timeLeft = scene.duration - localTime;
    if (timeLeft < scene.transitionDuration && nextScene) {
      const transProgress = (scene.transitionDuration - timeLeft) / scene.transitionDuration;
      const nextPts = getPointsForScene(nextScene, 0);

      if (scene.transition === 'crossfade' || scene.transition === 'morph') {
        const blendN = Math.min(pts.length, nextPts.length);
        const blended: Array<[number, number]> = [];
        for (let i = 0; i < blendN; i++) {
          blended.push([
            pts[i][0] * (1 - transProgress) + nextPts[i][0] * transProgress,
            pts[i][1] * (1 - transProgress) + nextPts[i][1] * transProgress,
          ]);
        }
        pts = blended;
      }
    }

    onSendFrameToScope(pts, `SCÈNE: ${scene.name} (${currentTime.toFixed(1)}s)`);
  }, [currentTime, isActiveInScope, activeScenes]);

  const selectedScene = activeScenes.find((s) => s.id === selectedSceneId) || activeScenes[0];

  const updateSelectedScene = (updates: Partial<TimelineScene>) => {
    updateScenes(activeScenes.map((s) => (s.id === selectedSceneId ? { ...s, ...updates } : s)));
  };

  const handleAddScene = () => {
    const newId = `sc_${Date.now()}`;
    const newScene: TimelineScene = {
      id: newId,
      name: `Nouvelle Scène ${activeScenes.length + 1}`,
      type: 'preset',
      presetName: 'Lissajous',
      duration: 4.0,
      transition: 'crossfade',
      transitionDuration: 1.0,
    };
    updateScenes([...activeScenes, newScene]);
    setSelectedSceneId(newId);
  };

  const handleDeleteScene = (id: string) => {
    if (activeScenes.length <= 1) return;
    const filtered = activeScenes.filter((s) => s.id !== id);
    updateScenes(filtered);
    if (selectedSceneId === id) {
      setSelectedSceneId(filtered[0]?.id || '');
    }
  };

  const handleDuplicateScene = (sc: TimelineScene) => {
    const dup: TimelineScene = {
      ...sc,
      id: `sc_${Date.now()}`,
      name: `${sc.name} (Copie)`,
    };
    updateScenes([...activeScenes, dup]);
  };

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-xl p-4 font-mono text-xs text-slate-300 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14233c] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              TIMELINE D'AUTOMATION & SCÈNES VECTORIELLES
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-800/40 text-indigo-300">
                {activeScenes.length} SCÈNES • {totalDuration.toFixed(1)}s TOTAL
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Séquençage automatique de formes, images, textes avec fondus enchaînés, morphing et rotations animées.
            </p>
          </div>
        </div>

        {/* Live to Scope button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!isPlaying) setIsPlaying(true);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${
              isActiveInScope
                ? 'bg-indigo-500 text-slate-950 border-indigo-400 shadow-md shadow-indigo-500/20'
                : 'bg-slate-800/80 text-indigo-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isActiveInScope ? 'TIMELINE EN COURS DANS SCOPE' : 'ACTIVER TIMELINE DANS SCOPE'}</span>
          </button>
        </div>
      </div>

      {/* Transport Bar & Scrubber */}
      <div className="bg-[#060c18] p-3 rounded-lg border border-[#14233c] space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Play/Pause/Rewind */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3.5 py-1.5 rounded font-bold border flex items-center gap-1.5 transition-colors ${
                isPlaying
                  ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-800'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'PAUSE' : 'LECTURE'}</span>
            </button>

            <button
              onClick={() => setCurrentTime(0)}
              title="Rembobiner au début"
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] ml-2">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
                className="accent-indigo-400 rounded"
              />
              <span>Boucle infinie</span>
            </label>
          </div>

          {/* Timecode display */}
          <div className="text-right text-[11px]">
            <span className="text-indigo-400 font-bold text-sm">
              {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Global Progress Bar / Interactive Scrubber */}
        <div className="relative">
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="0.05"
            value={currentTime}
            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
            className="w-full accent-indigo-400 h-2 bg-slate-800 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Visual Scene Blocks Strip (Horizontal Timeline) */}
      <div className="bg-[#050b14] p-3 rounded-lg border border-[#14284b] overflow-x-auto">
        <div className="flex items-stretch gap-2 min-w-full">
          {activeScenes.map((sc, idx) => {
            const isSelected = sc.id === selectedSceneId;
            const widthPct = Math.max(14, (sc.duration / totalDuration) * 100);

            return (
              <div
                key={sc.id}
                onClick={() => setSelectedSceneId(sc.id)}
                style={{ minWidth: '170px' }}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-950/70 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                    : 'bg-[#081326] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-bold text-indigo-300">SCÈNE #{idx + 1}</span>
                    <span className="text-slate-500">{sc.duration.toFixed(1)}s</span>
                  </div>
                  <div className="font-bold text-slate-200 text-[11px] truncate">{sc.name}</div>
                  <div className="text-[10px] text-slate-400 mt-1 capitalize">
                    Type : {sc.type} • {sc.transition}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateScene(sc);
                    }}
                    title="Dupliquer"
                    className="p-1 hover:text-cyan-300 text-slate-500"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScene(sc.id);
                    }}
                    title="Supprimer"
                    className="p-1 hover:text-red-400 text-slate-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Scene Button */}
          <button
            onClick={handleAddScene}
            className="min-w-[130px] p-2.5 rounded-lg border border-dashed border-slate-700 hover:border-indigo-400 text-slate-400 hover:text-indigo-300 flex flex-col items-center justify-center gap-1 text-center transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[11px] font-bold">Ajouter Scène</span>
          </button>
        </div>
      </div>

      {/* Selected Scene Inspector & Automation Panel */}
      {selectedScene && (
        <div className="bg-[#060c18] p-3 rounded-lg border border-[#14233c] grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Scene Name & Type */}
          <div className="md:col-span-4 space-y-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Nom de la scène :</label>
              <input
                type="text"
                value={selectedScene.name}
                onChange={(e) => updateSelectedScene({ name: e.target.value })}
                className="w-full bg-[#0a1324] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Type de contenu :</label>
              <select
                value={selectedScene.type}
                onChange={(e) => updateSelectedScene({ type: e.target.value as any })}
                className="w-full bg-[#0a1324] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
              >
                <option value="preset">Preset Mathématique XY</option>
                <option value="text">Texte Vectoriel Animé</option>
                <option value="image">Image Vectorielle</option>
              </select>
            </div>

            {selectedScene.type === 'text' && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Texte à afficher :</label>
                <input
                  type="text"
                  value={selectedScene.customText || ''}
                  onChange={(e) => updateSelectedScene({ customText: e.target.value.toUpperCase() })}
                  className="w-full bg-[#0a1324] border border-slate-700 rounded px-2 py-1 text-cyan-300 text-xs"
                />
              </div>
            )}

            {selectedScene.type === 'image' && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Image vectorielle :</label>
                <select
                  value={selectedScene.imagePreset || 'lotus'}
                  onChange={(e) => updateSelectedScene({ imagePreset: e.target.value as any })}
                  className="w-full bg-[#0a1324] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                >
                  <option value="lotus">Lotus Sacré</option>
                  <option value="atom">Modèle Atomique</option>
                  <option value="sacred_cube">Cube de Métatron</option>
                  <option value="star_octagram">Étoile Octagramme</option>
                  <option value="yinyang">Yin Yang</option>
                </select>
              </div>
            )}
          </div>

          {/* Timing & Transition */}
          <div className="md:col-span-4 space-y-2">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Durée de la scène :</span>
                <span className="text-cyan-300 font-bold">{selectedScene.duration.toFixed(1)} s</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="20.0"
                step="0.5"
                value={selectedScene.duration}
                onChange={(e) => updateSelectedScene({ duration: parseFloat(e.target.value) })}
                className="w-full accent-indigo-400 h-1 bg-slate-800 rounded"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Transition de sortie :</label>
              <select
                value={selectedScene.transition}
                onChange={(e) => updateSelectedScene({ transition: e.target.value as TimelineTransitionType })}
                className="w-full bg-[#0a1324] border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
              >
                <option value="cut">Cut (Instantanée)</option>
                <option value="crossfade">Fondu Enchaîné (Crossfade)</option>
                <option value="morph">Morphing Vectoriel</option>
                <option value="spin">Spin Rotation</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Durée transition :</span>
                <span className="text-indigo-300">{selectedScene.transitionDuration.toFixed(1)} s</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={selectedScene.transitionDuration}
                onChange={(e) => updateSelectedScene({ transitionDuration: parseFloat(e.target.value) })}
                className="w-full accent-indigo-400 h-1 bg-slate-800 rounded"
              />
            </div>
          </div>

          {/* Automation Ramp */}
          <div className="md:col-span-4 space-y-2">
            <span className="text-[10px] text-indigo-300 font-bold block mb-1">
              AUTOMATION DE ROTATION VECTORIELLE
            </span>
            <div className="bg-[#0a1324] p-2 rounded border border-slate-800 space-y-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={!!selectedScene.autoRotation}
                  onChange={(e) =>
                    updateSelectedScene({
                      autoRotation: e.target.checked ? { startAngle: 0, endAngle: 360 } : undefined,
                    })
                  }
                  className="accent-indigo-400 rounded"
                />
                <span>Activer rotation animée</span>
              </label>

              {selectedScene.autoRotation && (
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-400">Angle début :</span>
                    <input
                      type="number"
                      value={selectedScene.autoRotation.startAngle}
                      onChange={(e) =>
                        updateSelectedScene({
                          autoRotation: {
                            ...selectedScene.autoRotation!,
                            startAngle: parseInt(e.target.value, 10) || 0,
                          },
                        })
                      }
                      className="w-full bg-[#050b14] border border-slate-700 rounded px-1.5 py-0.5 text-center text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400">Angle fin :</span>
                    <input
                      type="number"
                      value={selectedScene.autoRotation.endAngle}
                      onChange={(e) =>
                        updateSelectedScene({
                          autoRotation: {
                            ...selectedScene.autoRotation!,
                            endAngle: parseInt(e.target.value, 10) || 360,
                          },
                        })
                      }
                      className="w-full bg-[#050b14] border border-slate-700 rounded px-1.5 py-0.5 text-center text-slate-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
