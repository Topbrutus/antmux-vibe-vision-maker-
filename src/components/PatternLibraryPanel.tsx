import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  FolderOpen,
  Sliders,
  Palette,
  Activity,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Zap,
  Repeat,
  Shuffle
} from 'lucide-react';
import { PatternItem, ScopeDisplaySettings } from '../types/vectorScope';
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
  scopeSettings?: ScopeDisplaySettings;
  onSettingsChange?: (settings: Partial<ScopeDisplaySettings>) => void;
}

export const PatternLibraryPanel: React.FC<PatternLibraryPanelProps> = ({
  currentScopePoints,
  onLoadPatternToScope,
  activePatternId,
  scopeSettings,
  onSettingsChange,
}) => {
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newPatternName, setNewPatternName] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'FAVORITES' | 'VIDEO' | 'MANDALA' | 'SCOPE'>('ALL');

  // Rapid Auto-Cycle / Spam Tester state
  const [isAutoCycling, setIsAutoCycling] = useState<boolean>(false);
  const [cycleSpeed, setCycleSpeed] = useState<number>(1000); // 400ms, 1000ms, 2000ms

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

  const activePattern = patterns.find((p) => p.id === activePatternId);

  const filtered = useMemo(() => {
    return patterns.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
        p.sourceModule.toLowerCase().includes(filterQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (categoryFilter === 'FAVORITES') return p.isFavorite;
      if (categoryFilter === 'VIDEO') return p.sourceModule.toUpperCase().includes('VIDEO') || p.sourceModule.toUpperCase().includes('ANIMATION');
      if (categoryFilter === 'MANDALA') return p.sourceModule.toUpperCase().includes('MANDALA');
      if (categoryFilter === 'SCOPE') return p.sourceModule.toUpperCase().includes('SCOPE') || p.sourceModule.toUpperCase().includes('OSCILLO');
      return true;
    });
  }, [patterns, filterQuery, categoryFilter]);

  const activeIndex = filtered.findIndex((p) => p.id === activePatternId);

  // Auto-Cycle / Fast Pattern Tester logic (Spammer & Tester)
  useEffect(() => {
    if (!isAutoCycling || filtered.length === 0) return;

    const interval = setInterval(() => {
      const currentIdx = filtered.findIndex((p) => p.id === activePatternId);
      const nextIdx = (currentIdx + 1) % filtered.length;
      onLoadPatternToScope(filtered[nextIdx]);
    }, cycleSpeed);

    return () => clearInterval(interval);
  }, [isAutoCycling, filtered, activePatternId, cycleSpeed, onLoadPatternToScope]);

  const handleNextPattern = useCallback(() => {
    if (filtered.length === 0) return;
    const currentIdx = filtered.findIndex((p) => p.id === activePatternId);
    const nextIdx = (currentIdx + 1) % filtered.length;
    onLoadPatternToScope(filtered[nextIdx]);
  }, [filtered, activePatternId, onLoadPatternToScope]);

  const handlePrevPattern = useCallback(() => {
    if (filtered.length === 0) return;
    const currentIdx = filtered.findIndex((p) => p.id === activePatternId);
    const prevIdx = currentIdx <= 0 ? filtered.length - 1 : currentIdx - 1;
    onLoadPatternToScope(filtered[prevIdx]);
  }, [filtered, activePatternId, onLoadPatternToScope]);

  // Keyboard navigation shortcuts for testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextPattern();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevPattern();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsAutoCycling((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPattern, handlePrevPattern]);

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
                BIBLIOTHÈQUE DE MOTIFS & OSCILLOSCOPE DÉTACHABLE
              </h2>
              <span className="px-2 py-0.5 text-[10px] bg-teal-950/80 text-teal-400 border border-teal-500/30 rounded-full font-bold">
                MOTEUR VECTORIEL EN DIRECT
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Détachez l'oscilloscope de son socle pour le garder en fenêtre flottante, puis parcourez, testez et spammez tous les motifs en direct !
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

      {/* Active Pattern Scope Status & Quick Beam Controls */}
      <div className="bg-gradient-to-r from-[#0d1c36] via-[#0b162b] to-[#0d1c36] border border-[#1b345b] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-inner">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">MOTIF ACTIF SUR L'OSCILLOSCOPE</div>
            <div className="text-sm font-black text-teal-300 flex items-center gap-2">
              {activePattern ? (
                <>
                  <span>{activePattern.name}</span>
                  <span className="text-xs text-slate-400 font-normal">({activePattern.points?.length || 0} points XY)</span>
                </>
              ) : (
                <span className="text-slate-400 font-normal italic">Tracé courant de l'oscilloscope ({currentScopePoints?.length || 0} points)</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Scope Display Presets (Colors & Phosphor) */}
        {scopeSettings && onSettingsChange && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#060c18] px-3 py-1.5 rounded-lg border border-[#162744]">
              <Palette className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-[10px] text-slate-400 font-bold mr-1">FAISCEAU :</span>
              {[
                { label: 'Cyan', color: '#00f5d4' },
                { label: 'Vert CRT', color: '#22c55e' },
                { label: 'Ambre', color: '#f59e0b' },
                { label: 'Blanc', color: '#f8fafc' },
                { label: 'Rose', color: '#f43f5e' },
              ].map((c) => (
                <button
                  key={c.color}
                  onClick={() => onSettingsChange({ primaryColor: c.color })}
                  style={{ backgroundColor: c.color }}
                  title={`Couleur du faisceau : ${c.label}`}
                  className={`w-4 h-4 rounded-full border transition-all ${
                    scopeSettings.primaryColor === c.color ? 'scale-125 border-white ring-2 ring-teal-400' : 'border-black/50 opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 bg-[#060c18] px-3 py-1.5 rounded-lg border border-[#162744]">
              <span className="text-[10px] text-slate-400 font-bold">RÉMANENCE :</span>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={scopeSettings.persistence ?? 0.25}
                onChange={(e) => onSettingsChange({ persistence: parseFloat(e.target.value) })}
                className="w-16 accent-teal-400"
              />
              <span className="text-[10px] text-teal-300 font-bold w-7">
                {Math.round((scopeSettings.persistence ?? 0.25) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* RAPID SPAM & AUTO-CYCLE TESTER BAR */}
      <div className="bg-gradient-to-r from-[#061124] via-[#091b38] to-[#061124] border-2 border-teal-500/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
            <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-teal-300 uppercase text-xs">
                TESTEUR RAPIDE & DÉFILÉ DES MOTIFS
              </span>
              {activeIndex !== -1 && (
                <span className="px-2 py-0.2 bg-[#0a1830] text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold">
                  {activeIndex + 1} / {filtered.length}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">
              Touches clavier : <kbd className="px-1 bg-slate-800 text-teal-300 rounded border border-slate-700">◀</kbd> <kbd className="px-1 bg-slate-800 text-teal-300 rounded border border-slate-700">▶</kbd> pour changer instantanément, <kbd className="px-1 bg-slate-800 text-amber-300 rounded border border-slate-700">Espace</kbd> pour Auto-cycle.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Previous Motif */}
          <button
            onClick={handlePrevPattern}
            disabled={filtered.length === 0}
            className="px-2.5 py-1.5 bg-[#09162e] hover:bg-[#13284f] text-slate-200 hover:text-white rounded-lg border border-[#1b345b] text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40"
            title="Tester le motif précédent (Touche ◀ ou ▲)"
          >
            <SkipBack className="w-3.5 h-3.5 text-teal-400" />
            <span>PRÉCÉDENT</span>
          </button>

          {/* Auto-Cycle Play/Pause */}
          <button
            onClick={() => setIsAutoCycling(!isAutoCycling)}
            disabled={filtered.length === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-md ${
              isAutoCycling
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/30 animate-pulse'
                : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/30'
            }`}
            title="Lancer le défilé automatique pour tester tous les motifs à la chaîne"
          >
            {isAutoCycling ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isAutoCycling ? 'ARRÊTER DÉFILÉ' : 'DÉFILÉ AUTO ⚡'}</span>
          </button>

          {/* Next Motif */}
          <button
            onClick={handleNextPattern}
            disabled={filtered.length === 0}
            className="px-2.5 py-1.5 bg-[#09162e] hover:bg-[#13284f] text-slate-200 hover:text-white rounded-lg border border-[#1b345b] text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40"
            title="Tester le motif suivant (Touche ▶ ou ▼)"
          >
            <span>SUIVANT</span>
            <SkipForward className="w-3.5 h-3.5 text-teal-400" />
          </button>

          {/* Speed Pills for cycle */}
          <div className="flex items-center gap-1 bg-[#060c18] px-2 py-1 rounded-lg border border-[#14233c] text-[10px]">
            <span className="text-slate-500 mr-1 font-bold">VITESSE:</span>
            {[
              { label: '0.4s (Spam)', ms: 400 },
              { label: '1.0s', ms: 1000 },
              { label: '2.0s', ms: 2000 },
            ].map((sp) => (
              <button
                key={sp.ms}
                onClick={() => setCycleSpeed(sp.ms)}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  cycleSpeed === sp.ms
                    ? 'bg-teal-400 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Capture Current Scope Section */}
      <div className="bg-[#060c18] border border-[#162744] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Disc className="w-5 h-5 text-teal-400 animate-pulse" />
          <div>
            <div className="font-bold text-slate-200">CAPTURER LE TRACÉ COURANT DU SCOPE DANS LA BIBLIOTHÈQUE</div>
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

      {/* Category Filter Pills & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'TOUS LES MOTIFS' },
            { id: 'FAVORITES', label: '★ FAVORIS' },
            { id: 'VIDEO', label: 'VIDÉO & LAPIN' },
            { id: 'MANDALA', label: 'MANDALAS' },
            { id: 'SCOPE', label: 'CAPTURES SCOPE' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                categoryFilter === cat.id
                  ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-sm shadow-teal-500/30'
                  : 'bg-[#081020] text-slate-400 border-[#14233c] hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Rechercher un motif par nom..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="bg-[#081020] border border-[#14233c] rounded-xl px-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-400 w-56"
          />
          <div className="text-slate-400 text-[11px] whitespace-nowrap">
            {filtered.length} motif(s)
          </div>
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
                  ? 'border-teal-400 bg-teal-950/20 shadow-lg shadow-teal-500/10 ring-1 ring-teal-400/40'
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
                    <span className="px-1.5 py-0.2 bg-slate-900 rounded border border-slate-800 text-slate-400 font-bold">
                      {pattern.sourceModule}
                    </span>
                    <span>•</span>
                    <span>{(pattern.points?.length || 0)} pts</span>
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
                {pattern.colorEncoding === 'laser_chroma' && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-emerald-950 to-teal-950 text-emerald-300 border border-emerald-500/50 rounded text-[9px] font-black flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                    <span>RGB ENCODÉ (POINT PAR POINT)</span>
                  </span>
                )}
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
              <div
                onClick={() => onLoadPatternToScope(pattern)}
                className="w-full h-32 bg-[#040810] border border-[#14233c] hover:border-teal-500/50 rounded-lg overflow-hidden flex items-center justify-center relative cursor-pointer group transition-all"
              >
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

                  {/* Multi-color rendering or single polyline */}
                  {pattern.pointColors && pattern.pointColors.length >= (pattern.points?.length || 0) ? (
                    (pattern.points || []).slice(0, 180).map((pt, i, arr) => {
                      if (i === arr.length - 1) return null;
                      const next = arr[i + 1];
                      const col = pattern.pointColors![i] || pattern.color || '#00f5d4';
                      return (
                        <line
                          key={i}
                          x1={pt[0]}
                          y1={-pt[1]}
                          x2={next[0]}
                          y2={-next[1]}
                          stroke={col}
                          strokeWidth="0.035"
                          strokeLinecap="round"
                        />
                      );
                    })
                  ) : (pattern.points?.length || 0) > 1 ? (
                    <polyline
                      points={pattern.points
                        .slice(0, 400)
                        .map(([x, y]) => `${x},${-y}`)
                        .join(' ')}
                      fill="none"
                      stroke={pattern.color || '#00f5d4'}
                      strokeWidth="0.03"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                  ) : null}
                </svg>

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-teal-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all backdrop-blur-[1px]">
                  <span className="px-2.5 py-1 bg-teal-500 text-slate-950 rounded-lg font-black text-[10px] flex items-center gap-1 shadow-lg">
                    <Eye className="w-3.5 h-3.5" /> AFFICHER SUR L'OSCILLOSCOPE
                  </span>
                </div>
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
                      ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                      : 'bg-[#0f1d35] text-teal-300 hover:bg-teal-950 border border-teal-500/30'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isSelected ? 'ACTIF SUR OSCILLOSCOPE' : 'CHARGER SUR LE SCOPE'}</span>
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
