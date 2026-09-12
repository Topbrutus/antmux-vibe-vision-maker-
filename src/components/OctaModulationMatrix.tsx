import React, { useState } from 'react';
import {
  Shuffle,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  ArrowRight,
  RefreshCw,
  Power
} from 'lucide-react';
import {
  GeneratorId,
  ModRouting,
  ModTarget,
  OctaSystemState
} from '../types/vectorScope';

interface OctaModulationMatrixProps {
  state: OctaSystemState;
  onUpdateRoutings: (routings: ModRouting[]) => void;
  onResetMatrix: () => void;
}

const ALL_GENS: GeneratorId[] = ['L1', 'L2', 'L3', 'L4', 'R1', 'R2', 'R3', 'R4'];

export const OctaModulationMatrix: React.FC<OctaModulationMatrixProps> = ({
  state,
  onUpdateRoutings,
  onResetMatrix,
}) => {
  const routings = state.modulationMatrix?.routings || [];

  // Local state for adding a new route quickly
  const [sourceId, setSourceId] = useState<GeneratorId>('L1');
  const [targetId, setTargetId] = useState<GeneratorId>('R1');
  const [targetParam, setTargetParam] = useState<ModTarget>('fm');
  const [depth, setDepth] = useState<number>(0.5);

  const handleAddRouting = () => {
    // Check if already exists
    const id = `${sourceId}->${targetId}:${targetParam}`;
    const existingIndex = routings.findIndex((r) => r.id === id);
    if (existingIndex >= 0) {
      // Update existing
      const updated = [...routings];
      updated[existingIndex] = {
        ...updated[existingIndex],
        depth,
        enabled: true,
      };
      onUpdateRoutings(updated);
    } else {
      const newRouting: ModRouting = {
        id,
        sourceId,
        targetId,
        targetParam,
        depth,
        enabled: true,
      };
      onUpdateRoutings([...routings, newRouting]);
    }
  };

  const handleToggleRouting = (id: string) => {
    const updated = routings.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    onUpdateRoutings(updated);
  };

  const handleChangeDepth = (id: string, newDepth: number) => {
    const updated = routings.map((r) =>
      r.id === id ? { ...r, depth: newDepth } : r
    );
    onUpdateRoutings(updated);
  };

  const handleDeleteRouting = (id: string) => {
    const updated = routings.filter((r) => r.id !== id);
    onUpdateRoutings(updated);
  };

  const handleCellClick = (src: GeneratorId, tgt: GeneratorId, param: ModTarget) => {
    const id = `${src}->${tgt}:${param}`;
    const existing = routings.find((r) => r.id === id);
    if (existing) {
      if (existing.enabled) {
        // Toggle depth or remove if already active
        if (existing.depth >= 0.8) {
          handleDeleteRouting(id);
        } else {
          handleChangeDepth(id, Number((existing.depth + 0.25).toFixed(2)));
        }
      } else {
        handleToggleRouting(id);
      }
    } else {
      const newRoute: ModRouting = {
        id,
        sourceId: src,
        targetId: tgt,
        targetParam: param,
        depth: 0.5,
        enabled: true,
      };
      onUpdateRoutings([...routings, newRoute]);
    }
  };

  const handlePresetFMChains = () => {
    // Cross-modulation: L1 modulates R1 (FM), R1 modulates L2 (FM), L2 modulates R2 (AM)
    const newRoutings: ModRouting[] = [
      { id: 'L1->R1:fm', sourceId: 'L1', targetId: 'R1', targetParam: 'fm', depth: 0.65, enabled: true },
      { id: 'R1->L2:fm', sourceId: 'R1', targetId: 'L2', targetParam: 'fm', depth: 0.5, enabled: true },
      { id: 'L2->R2:am', sourceId: 'L2', targetId: 'R2', targetParam: 'am', depth: 0.75, enabled: true },
      { id: 'R3->L3:fm', sourceId: 'R3', targetId: 'L3', targetParam: 'fm', depth: 0.4, enabled: true },
      { id: 'L4->R4:fm', sourceId: 'L4', targetId: 'R4', targetParam: 'fm', depth: 0.55, enabled: true },
    ];
    onUpdateRoutings(newRoutings);
  };

  const handlePresetRingMod = () => {
    // AM Ring Mod Matrix
    const newRoutings: ModRouting[] = [
      { id: 'L1->R1:am', sourceId: 'L1', targetId: 'R1', targetParam: 'am', depth: 0.9, enabled: true },
      { id: 'L2->R2:am', sourceId: 'L2', targetId: 'R2', targetParam: 'am', depth: 0.8, enabled: true },
      { id: 'R3->L3:am', sourceId: 'R3', targetId: 'L3', targetParam: 'am', depth: 0.85, enabled: true },
      { id: 'R4->L4:am', sourceId: 'R4', targetId: 'L4', targetParam: 'am', depth: 0.95, enabled: true },
    ];
    onUpdateRoutings(newRoutings);
  };

  return (
    <div className="bg-[#050b18] border border-cyan-900/60 rounded-xl p-4 shadow-2xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-950 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-mono font-black text-cyan-300 tracking-wider uppercase">
              MATRICE DE MODULATION (FM / AM SYNTHESIS)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-700/60">
              8 OSCILLATEURS (L1..L4 ⇄ R1..R4)
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Routez la forme d'onde et le signal de sortie d'un générateur vers la fréquence (FM) ou l'amplitude (AM) d'un autre oscillateur.
          </p>
        </div>

        {/* Quick Presets & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePresetFMChains}
            className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/70 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Preset FM Cascade</span>
          </button>

          <button
            onClick={handlePresetRingMod}
            className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/70 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Preset Ring-Mod AM</span>
          </button>

          <button
            onClick={onResetMatrix}
            className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/70 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcwIcon className="w-3.5 h-3.5 text-rose-400" />
            <span>Remettre Matrice à Zéro</span>
          </button>
        </div>
      </div>

      {/* Manual Route Injector */}
      <div className="bg-[#030712] border border-cyan-950 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="text-cyan-400 font-bold uppercase">Créer un routage :</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Source :</span>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value as GeneratorId)}
              className="bg-[#0b162a] border border-slate-700 text-cyan-300 rounded px-2 py-1"
            >
              {ALL_GENS.map((g) => (
                <option key={g} value={g}>
                  {g} ({state.generators[g]?.name || g})
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-500" />

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Destination :</span>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value as GeneratorId)}
              className="bg-[#0b162a] border border-slate-700 text-amber-300 rounded px-2 py-1"
            >
              {ALL_GENS.map((g) => (
                <option key={g} value={g}>
                  {g} ({state.generators[g]?.name || g})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Type :</span>
            <div className="flex rounded border border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setTargetParam('fm')}
                className={`px-2.5 py-1 font-bold ${
                  targetParam === 'fm' ? 'bg-cyan-500 text-slate-950' : 'bg-[#0b162a] text-slate-400'
                }`}
              >
                FM (Fréq.)
              </button>
              <button
                type="button"
                onClick={() => setTargetParam('am')}
                className={`px-2.5 py-1 font-bold ${
                  targetParam === 'am' ? 'bg-amber-500 text-slate-950' : 'bg-[#0b162a] text-slate-400'
                }`}
              >
                AM (Amp.)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Profondeur :</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={depth}
              onChange={(e) => setDepth(parseFloat(e.target.value))}
              className="w-24 accent-cyan-400 h-1.5 bg-slate-800 rounded"
            />
            <span className="text-cyan-300 font-bold w-10 text-right">{Math.round(depth * 100)}%</span>
          </div>
        </div>

        <button
          onClick={handleAddRouting}
          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter Routage</span>
        </button>
      </div>

      {/* Visual Interactive Matrix Grid (8x8 Grid with Dual FM/AM indicators) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>GRILLE INTERACTIVE 8×8 (Cliquez sur une case pour moduler) :</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> = Modulation FM
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> = Modulation AM
            </span>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg p-3 bg-[#02050e]">
          <table className="w-full text-center font-mono text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-[11px] text-slate-500 border-b border-r border-slate-800 text-left">
                  SRC ↓ / DEST →
                </th>
                {ALL_GENS.map((tgt) => (
                  <th
                    key={tgt}
                    className={`p-2 border-b border-slate-800 font-bold ${
                      tgt.startsWith('L') ? 'text-cyan-300' : 'text-amber-300'
                    }`}
                  >
                    {tgt}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_GENS.map((src) => (
                <tr key={src} className="hover:bg-slate-900/40">
                  <td
                    className={`p-2 border-r border-slate-800 font-bold text-left ${
                      src.startsWith('L') ? 'text-cyan-300' : 'text-amber-300'
                    }`}
                  >
                    {src}
                  </td>
                  {ALL_GENS.map((tgt) => {
                    const isSelf = src === tgt;
                    const routeFM = routings.find(
                      (r) => r.sourceId === src && r.targetId === tgt && r.targetParam === 'fm'
                    );
                    const routeAM = routings.find(
                      (r) => r.sourceId === src && r.targetId === tgt && r.targetParam === 'am'
                    );

                    return (
                      <td
                        key={tgt}
                        className={`p-1.5 border border-slate-800/60 transition-colors ${
                          isSelf ? 'bg-slate-950/80 opacity-40' : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {/* FM Button */}
                          <button
                            type="button"
                            title={`FM: ${src} -> ${tgt}`}
                            disabled={isSelf}
                            onClick={() => handleCellClick(src, tgt, 'fm')}
                            className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center transition-all ${
                              routeFM && routeFM.enabled
                                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(0,245,212,0.6)] font-black'
                                : 'bg-slate-900 text-slate-600 hover:text-cyan-400 hover:bg-slate-800'
                            }`}
                          >
                            {routeFM && routeFM.enabled ? `${Math.round(routeFM.depth * 100)}` : 'FM'}
                          </button>

                          {/* AM Button */}
                          <button
                            type="button"
                            title={`AM: ${src} -> ${tgt}`}
                            disabled={isSelf}
                            onClick={() => handleCellClick(src, tgt, 'am')}
                            className={`w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center transition-all ${
                              routeAM && routeAM.enabled
                                ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.6)] font-black'
                                : 'bg-slate-900 text-slate-600 hover:text-amber-400 hover:bg-slate-800'
                            }`}
                          >
                            {routeAM && routeAM.enabled ? `${Math.round(routeAM.depth * 100)}` : 'AM'}
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Routings List & Detail Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-300">
            ROUTAGES ACTIFS DANS LE MOTEUR ({routings.length}) :
          </span>
          {routings.length > 0 && (
            <button
              onClick={() => onUpdateRoutings([])}
              className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer tous les routages</span>
            </button>
          )}
        </div>

        {routings.length === 0 ? (
          <div className="bg-[#030712] border border-dashed border-slate-800 rounded-lg p-6 text-center text-slate-500 font-mono text-xs">
            Aucun routage de modulation actif. La matrice est à zéro. Cliquez sur une case FM ou AM ci-dessus pour connecter les oscillateurs.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {routings.map((route) => (
              <div
                key={route.id}
                className={`p-3 rounded-lg border flex flex-col justify-between gap-2.5 transition-all ${
                  route.enabled
                    ? route.targetParam === 'fm'
                      ? 'bg-[#04121e] border-cyan-800/80 shadow-md shadow-cyan-950/40'
                      : 'bg-[#180e04] border-amber-800/80 shadow-md shadow-amber-950/40'
                    : 'bg-slate-950/60 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRouting(route.id)}
                      className={`p-1 rounded ${
                        route.enabled ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                      title={route.enabled ? 'Désactiver routage' : 'Activer routage'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {route.sourceId} → {route.targetId}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                        route.targetParam === 'fm'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                          : 'bg-amber-950 text-amber-300 border border-amber-700'
                      }`}
                    >
                      {route.targetParam.toUpperCase()}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteRouting(route.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">Profondeur :</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={route.depth}
                    onChange={(e) => handleChangeDepth(route.id, parseFloat(e.target.value))}
                    className={`w-full h-1.5 rounded appearance-none cursor-pointer ${
                      route.targetParam === 'fm' ? 'accent-cyan-400 bg-slate-800' : 'accent-amber-400 bg-slate-800'
                    }`}
                  />
                  <span
                    className={`text-xs font-mono font-bold w-12 text-right ${
                      route.targetParam === 'fm' ? 'text-cyan-300' : 'text-amber-300'
                    }`}
                  >
                    {Math.round(route.depth * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function RotateCcwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
