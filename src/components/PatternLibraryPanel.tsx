import React, { useState, useEffect } from 'react';
import {
  Library,
  Plus,
  Trash2,
  Download,
  Upload,
  Copy,
  Edit2,
  Check,
  Star,
  Sparkles,
  ExternalLink,
  Eye,
  Disc,
  Layers,
  FolderOpen
} from 'lucide-react';
import { PatternItem } from '../types/vectorScope';
import {
  getSavedPatterns,
  savePattern,
  deletePattern,
  exportPatternsToJson,
  importPatternsFromJson
} from '../services/patternStorage';
import { triggerBlobDownload, triggerTextDownload } from '../services/exportUtils';

interface PatternLibraryPanelProps {
  currentScopePoints: Array<[number, number]>;
  onLoadPatternToScope: (pattern: PatternItem) => void;
  activePatternId?: string;
}

export const PatternLibraryPanel: React.FC<PatternLibraryPanelProps> = ({
  currentScopePoints,
  onLoadPatternToScope,
  activePatternId,
}) => {
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newPatternName, setNewPatternName] = useState('');
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    setPatterns(getSavedPatterns());
  }, []);

  const handleSaveCurrentScopeAsPattern = () => {
    if (!currentScopePoints || currentScopePoints.length === 0) return;
    const name = newPatternName.trim() || `Nouveau Motif ${patterns.length + 1}`;
    const saved = savePattern({
      name,
      description: `Motif vectoriel capturé (${currentScopePoints.length} points)`,
      points: currentScopePoints,
      sourceModule: 'OSCILLOSCOPE',
      color: '#00f5d4',
      isFavorite: false,
    });
    setPatterns(getSavedPatterns());
    setNewPatternName('');
    onLoadPatternToScope(saved);
  };

  const handleDelete = (id: string) => {
    const updated = deletePattern(id);
    setPatterns(updated);
  };

  const handleToggleFavorite = (pattern: PatternItem) => {
    savePattern({
      ...pattern,
      isFavorite: !pattern.isFavorite,
    });
    setPatterns(getSavedPatterns());
  };

  const handleStartRename = (pattern: PatternItem) => {
    setEditingId(pattern.id);
    setEditName(pattern.name);
  };

  const handleSaveRename = (pattern: PatternItem) => {
    if (editName.trim()) {
      savePattern({
        ...pattern,
        name: editName.trim(),
      });
      setPatterns(getSavedPatterns());
    }
    setEditingId(null);
  };

  const handleClone = (pattern: PatternItem) => {
    savePattern({
      ...pattern,
      id: undefined,
      name: `${pattern.name} (Copie)`,
      createdAt: new Date().toISOString(),
    });
    setPatterns(getSavedPatterns());
  };

  const handleExportAll = () => {
    const json = exportPatternsToJson();
    triggerTextDownload(json, `genesis_vector_patterns_${Date.now()}.json`, 'application/json');
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const res = importPatternsFromJson(content);
      if (res.success) {
        setPatterns(getSavedPatterns());
      }
    };
    reader.readAsText(file);
  };

  const filtered = patterns.filter(
    (p) =>
      p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      p.sourceModule.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-6 font-mono text-xs text-slate-300 shadow-2xl space-y-6">
      {/* Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 via-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20 text-slate-950">
            <Library className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-teal-300 tracking-wider uppercase">
                BIBLIOTHÈQUE DE MOTIFS & FORMES PURIFIÉES
              </h2>
              <span className="px-2 py-0.5 text-[10px] bg-teal-950/80 text-teal-400 border border-teal-500/30 rounded-full font-bold">
                PERSISTANT ENTRE LES PROJETS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Retirez les lignes parasites ou de retour, clonez vos figures géométriques et réutilisez-les à volonté
            </p>
          </div>
        </div>

        {/* Action Buttons: Export & Import JSON */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="input-import-patterns"
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-teal-400 text-slate-300 hover:text-teal-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-teal-400" />
            <span>IMPORTER MOTIFS</span>
            <input
              id="input-import-patterns"
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImportFile(e.target.files[0]);
                }
              }}
            />
          </label>

          <button
            onClick={handleExportAll}
            className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORTER TOUS (.JSON)</span>
          </button>
        </div>
      </div>

      {/* Capture Current Scope Section */}
      <div className="bg-[#060c18] border border-[#162744] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Disc className="w-5 h-5 text-teal-400 animate-pulse" />
          <div>
            <div className="font-bold text-slate-200">CAPTURER LE TRACÉ COURANT DU SCOPE</div>
            <div className="text-[10px] text-slate-400">
              {currentScopePoints.length} points actuellement visibles sur l'oscilloscope
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Nom du nouveau motif..."
            value={newPatternName}
            onChange={(e) => setNewPatternName(e.target.value)}
            className="bg-[#0b162a] border border-[#1d3050] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-400 w-48 sm:w-64"
          />
          <button
            onClick={handleSaveCurrentScopeAsPattern}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ENREGISTRER MOTIF</span>
          </button>
        </div>
      </div>

      {/* Search & Counter Filter */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Rechercher un motif par nom ou module..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="bg-[#081020] border border-[#14233c] rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-400 w-full max-w-sm"
        />
        <div className="text-slate-400 text-[11px]">
          {filtered.length} motif(s) enregistré(s)
        </div>
      </div>

      {/* Pattern Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((pattern) => {
          const isSelected = activePatternId === pattern.id;
          const isEditing = editingId === pattern.id;

          return (
            <div
              key={pattern.id}
              className={`bg-[#060c18] border rounded-xl p-4 space-y-3 transition-all ${
                isSelected
                  ? 'border-teal-400 bg-teal-950/20 shadow-lg shadow-teal-500/10'
                  : 'border-[#14233c] hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-[#0b162a] border border-teal-400 px-2 py-1 rounded text-xs text-teal-300 w-full focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(pattern)}
                        className="p-1 rounded bg-teal-500 text-slate-950 hover:bg-teal-400"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs text-teal-300 truncate max-w-[180px]">
                        {pattern.name}
                      </span>
                      <button
                        onClick={() => handleStartRename(pattern)}
                        className="text-slate-500 hover:text-teal-400 p-0.5"
                        title="Renommer le motif"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 bg-slate-900 rounded border border-slate-800 text-slate-400">
                      {pattern.sourceModule}
                    </span>
                    <span>•</span>
                    <span>{pattern.points.length} pts</span>
                  </div>
                </div>

                {/* Favorite Star */}
                <button
                  onClick={() => handleToggleFavorite(pattern)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    pattern.isFavorite
                      ? 'text-amber-400 border-amber-400/50 bg-amber-950/40'
                      : 'text-slate-600 border-slate-800 hover:text-slate-400'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${pattern.isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Badges for Color & Fill Channels */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {pattern.fillChannels && pattern.fillChannels.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-500/40 rounded text-[9px] font-bold flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    <span>{pattern.fillChannels.length} CANAL(AUX) DE REMPLISSAGE</span>
                  </span>
                )}
                {pattern.segmentColors && Object.keys(pattern.segmentColors).length > 0 && (
                  <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-500/40 rounded text-[9px] font-bold">
                    LIGNES MULTICOLORES
                  </span>
                )}
              </div>

              {/* Mini Preview Thumbnail */}
              <div className="w-full h-28 bg-[#040810] border border-[#14233c] rounded-lg overflow-hidden flex items-center justify-center relative">
                <svg className="w-full h-full" viewBox="-1.2 -1.2 2.4 2.4">
                  {/* Fill Channels Seeds / Halo */}
                  {pattern.fillChannels &&
                    pattern.fillChannels.map((fc, fIdx) => (
                      <circle
                        key={fc.id || fIdx}
                        cx={fc.seedX}
                        cy={-fc.seedY}
                        r={0.25}
                        fill={fc.color}
                        opacity={fc.opacity * 0.7}
                      />
                    ))}

                  {/* Polyline of the pattern */}
                  {pattern.points.length > 1 && (
                    <polyline
                      points={pattern.points
                        .slice(0, 300)
                        .map(([x, y]) => `${x},${-y}`)
                        .join(' ')}
                      fill="none"
                      stroke={pattern.color || '#00f5d4'}
                      strokeWidth="0.03"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                  )}
                </svg>
              </div>

              {/* Description */}
              {pattern.description && (
                <p className="text-[10px] text-slate-400 line-clamp-2">{pattern.description}</p>
              )}

              {/* Action Buttons: Charger sur Scope, Cloner, Supprimer */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#121f36]">
                <button
                  onClick={() => onLoadPatternToScope(pattern)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-teal-500 text-slate-950'
                      : 'bg-[#0f1d35] text-teal-300 hover:bg-teal-950 border border-teal-500/30'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isSelected ? 'ACTIF SUR SCOPE' : 'AFFICHER SCOPE'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleClone(pattern)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-slate-200"
                    title="Cloner ce motif"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(pattern.id)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400"
                    title="Supprimer ce motif"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
