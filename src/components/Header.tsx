import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Radio,
  Download,
  Upload,
  AlertTriangle,
  FolderArchive,
  Layers,
  Sparkles,
  Activity,
  GitCompare,
  Sliders,
  Compass,
  MonitorCheck,
  Image as ImageIcon,
  Type,
  Film,
  Video,
  ExternalLink,
  Dock,
  Shuffle,
  FolderOpen,
  Mic,
  Disc,
  Library,
  Eye,
  EyeOff,
  Music,
  ZoomIn,
  ZoomOut,
  Bot
} from 'lucide-react';
import {
  AppMode,
  FloatingWindowState,
  ScopeActiveToggles,
  TabActivityLevels
} from '../types/vectorScope';
import { downloadWindowsZip } from '../services/pythonAppFiles';
import { triggerBlobDownload } from '../services/exportUtils';

interface HeaderProps {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  masterVolume: number;
  onVolumeChange: (val: number) => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  hasClipping: boolean;
  sampleRate: number;
  currentPreset: string;
  onOpenExportModal: () => void;
  onAudioFileSelected: (file: File) => void;
  floatingScopeState: FloatingWindowState;
  onToggleScopeFloating: () => void;
  scopeToggles: ScopeActiveToggles;
  onToggleScopeSource: (sourceKey: keyof ScopeActiveToggles) => void;
  activityLevels: TabActivityLevels;
  fontScale?: number;
  onIncreaseFont?: () => void;
  onDecreaseFont?: () => void;
  onResetFont?: () => void;
  onOpenAiChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  appMode,
  setAppMode,
  isPlaying,
  onTogglePlay,
  masterVolume,
  onVolumeChange,
  isRecording,
  onToggleRecord,
  hasClipping,
  sampleRate,
  currentPreset,
  onOpenExportModal,
  onAudioFileSelected,
  floatingScopeState,
  onToggleScopeFloating,
  scopeToggles,
  onToggleScopeSource,
  activityLevels,
  fontScale = 1.0,
  onIncreaseFont,
  onDecreaseFont,
  onResetFont,
  onOpenAiChat,
}) => {
  const [isExportingZip, setIsExportingZip] = useState(false);

  const handleExportWindowsPackage = async () => {
    try {
      setIsExportingZip(true);
      const zipBlob = await downloadWindowsZip();
      triggerBlobDownload(zipBlob, 'GENESIS_VECTOR_LAB_Windows_PySide6.zip');
    } catch (e) {
      console.error('Failed to export Windows package:', e);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAudioFileSelected(e.target.files[0]);
    }
  };

  const navTabs: Array<{
    id: AppMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    scopeKey?: keyof ScopeActiveToggles;
  }> = [
    { id: 'main', label: 'LABORATOIRE X/Y', icon: Activity, scopeKey: 'octaGenerators' },
    { id: 'sequence_generators', label: 'GÉNÉRATEURS VIDÉO & SÉQUENCES', icon: Video, scopeKey: 'sequenceGenerators' },
    { id: 'piano', label: 'PIANO & NOTES', icon: Music, scopeKey: 'octaGenerators' },
    { id: 'radio', label: 'RADIO & CHANSON', icon: Radio, scopeKey: 'radioAudio' },
    { id: 'mics', label: 'STUDIO DOUBLE MICRO', icon: Mic, scopeKey: 'microphone1' },
    { id: 'patterns', label: 'BIBLIOTHÈQUE MOTIFS', icon: Library },
    { id: 'matrix', label: 'MATRICE MODULATION', icon: Shuffle },
    { id: 'sessions', label: 'SESSIONS & PRESETS', icon: FolderOpen },
    { id: 'segmented', label: '4/8 GÉNÉRATEURS', icon: Layers, scopeKey: 'segmentedGens' },
    { id: 'image_lab', label: 'VIDÉO & IMAGE VECTOR', icon: Film, scopeKey: 'vectorImage' },
    { id: 'text_lab', label: 'TEXTE ANIMÉ', icon: Type, scopeKey: 'vectorText' },
    { id: 'timeline', label: 'TIMELINE & SCÈNES', icon: Film, scopeKey: 'timelineScene' },
    { id: 'mandala', label: 'MANDALA COMPOSER', icon: Sparkles, scopeKey: 'mandalaComposer' },
    { id: 'vortex', label: 'VORTEX DESIGNER', icon: Compass, scopeKey: 'vortexDesigner' },
    { id: 'spectral', label: 'LABO SPECTRAL', icon: Sliders },
    { id: 'comparator', label: 'COMPARATEUR', icon: GitCompare },
    { id: 'real_scope', label: 'CALIBRATION OSCILLO', icon: MonitorCheck },
    { id: 'genesis', label: 'EXPÉRIENCE GENESIS', icon: Disc },
  ];

  return (
    <header className="bg-[#070e1c] border-b border-[#14233c] text-slate-100 select-none sticky top-0 z-40">
      {/* Top Bar: Identity, Telemetry, Master Audio, Action Buttons */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-300/30">
            <Radio className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base font-black tracking-wider text-cyan-300 uppercase">
                GENESIS VECTOR LAB
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-mono tracking-widest bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 rounded">
                MULTI-FLUX 4 CANAUX • SIMULTANÉ
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
              <span>CANAL G = X</span>
              <span className="text-slate-600">|</span>
              <span>CANAL D = Y</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400 font-semibold">{currentPreset}</span>
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono">
          <div className="px-2.5 py-1 rounded bg-[#0b162a] border border-[#1d3050] flex items-center gap-2 text-slate-300">
            <span className="text-slate-500">ÉCHANTILLONNAGE</span>
            <span className="text-cyan-400 font-bold">{(sampleRate / 1000).toFixed(1)} kHz</span>
          </div>

          {/* Clipping Alert */}
          <div
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition-all ${
              hasClipping
                ? 'bg-rose-950/80 text-rose-300 border-rose-500 animate-pulse font-bold'
                : 'bg-[#0b162a] text-slate-400 border-[#1d3050]'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${hasClipping ? 'text-rose-400' : 'text-slate-500'}`} />
            <span>{hasClipping ? 'ATTENTION CLIPPING !' : 'HEADROOM OK'}</span>
          </div>
        </div>

        {/* Master Controls & Buttons */}
        <div className="flex items-center gap-2">
          {/* Detachable Scope Quick Toggle */}
          <button
            onClick={onToggleScopeFloating}
            id="btn-toggle-floating-scope"
            className={`px-2.5 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all border ${
              floatingScopeState.isFloating
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                : 'bg-[#0b162a] text-cyan-300 border-[#1d3050] hover:border-cyan-400'
            }`}
            title="Détacher / Ré-ancrer l'oscilloscope"
          >
            {floatingScopeState.isFloating ? <Dock className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {floatingScopeState.isFloating ? 'SCOPE DÉTACHÉ' : 'DÉTACHER SCOPE'}
            </span>
          </button>

          {/* Master Audio Toggle */}
          <button
            onClick={onTogglePlay}
            id="btn-master-audio-toggle"
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all border shadow-sm ${
              isPlaying
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-cyan-500/30 hover:bg-cyan-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'AUDIO ACTIF' : 'DÉMARRER AUDIO'}</span>
          </button>

          {/* Master Volume */}
          <div className="hidden sm:flex items-center gap-2 bg-[#0b162a] px-2.5 py-1.5 rounded-md border border-[#1d3050]">
            {masterVolume > 0 ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
            <input
              type="range"
              min="0"
              max="1.2"
              step="0.02"
              value={masterVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-20 accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              title={`Volume Master: ${(masterVolume * 100).toFixed(0)}%`}
            />
            <span className="text-[11px] font-mono text-slate-400 w-8">
              {(masterVolume * 100).toFixed(0)}%
            </span>
          </div>

          {/* Record Button */}
          <button
            onClick={onToggleRecord}
            id="btn-toggle-record"
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all border ${
              isRecording
                ? 'bg-red-600 text-white border-red-400 shadow-lg shadow-red-600/30 animate-pulse'
                : 'bg-[#0b162a] text-slate-300 border-[#1d3050] hover:border-red-500/50 hover:text-red-400'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
            <span>{isRecording ? 'REC...' : 'REC A/V'}</span>
          </button>

          {/* Audio Import */}
          <label
            htmlFor="audio-file-import"
            className="px-2.5 py-1.5 rounded-md text-xs font-mono bg-[#0b162a] text-slate-300 border border-[#1d3050] hover:border-cyan-500/50 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Importer un fichier audio stéréo (WAV, MP3, FLAC)"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">IMPORTER</span>
            <input
              id="audio-file-import"
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileInput}
            />
          </label>

          {/* Export Lab Session */}
          <button
            onClick={onOpenExportModal}
            id="btn-export-session"
            className="px-2.5 py-1.5 rounded-md text-xs font-mono bg-[#0b162a] text-slate-300 border border-[#1d3050] hover:border-amber-500/50 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
            title="Exporter l'expérience (WAV, SVG, PNG, CSV, JSON Manifest)"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">EXPORTER</span>
          </button>

          {/* Font Size Zoom (+ and -) as requested by user */}
          <div className="flex items-center bg-[#0b162a] border border-[#1d3050] rounded-md px-1.5 py-1 gap-1" title="Ajuster la taille de la police d'affichage">
            <span className="text-[10px] font-mono text-slate-400 font-bold px-1">POLICE</span>
            <button
              onClick={onDecreaseFont}
              id="btn-font-decrease"
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs transition-colors"
              title="Diminuer la police (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onResetFont}
              className="px-1 text-[10px] font-mono text-cyan-300 font-bold hover:text-cyan-200"
              title="Réinitialiser la taille (100%)"
            >
              {Math.round(fontScale * 100)}%
            </button>
            <button
              onClick={onIncreaseFont}
              id="btn-font-increase"
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs transition-colors"
              title="Grossir la police (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI Assistant Chat Trigger in Top Bar as well */}
          {onOpenAiChat && (
            <button
              onClick={onOpenAiChat}
              id="btn-open-ai-chat-header"
              className="px-2.5 py-1.5 rounded-md text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-900/80 flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,245,212,0.25)] transition-all animate-pulse"
              title="Ouvrir l'IA de clavardage & co-pilote"
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline font-bold">IA ASSISTANT</span>
            </button>
          )}

          {/* Windows Source Code / App ZIP Package */}
          <button
            onClick={handleExportWindowsPackage}
            disabled={isExportingZip}
            id="btn-download-windows-zip"
            className="px-2.5 py-1.5 rounded-md text-xs font-mono bg-blue-950/60 text-blue-300 border border-blue-600/40 hover:bg-blue-900/60 flex items-center gap-1.5 transition-all"
            title="Télécharger les modules Python complets + RUN.cmd pour Windows"
          >
            <FolderArchive className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">WINDOWS (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar with USER SPECIFIED:
          1. Voyant d'activité sonore qui flash au même rythme
          2. Bouton Ajouter dans le Scope / Mettre invisible au-dessus de chaque onglet
          3. Wrap sur 1 ou 2 lignes quand ça ne rentre pas sur une seule ligne */}
      <div className="px-3 bg-[#050b14] flex flex-wrap items-center gap-1.5 border-t border-[#121c2e] py-1.5">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = appMode === tab.id;
          const activity = (activityLevels as any)[tab.id] || 0;
          const hasScopeToggle = !!tab.scopeKey;
          const isScopeActive = tab.scopeKey ? scopeToggles[tab.scopeKey] : true;

          return (
            <div
              key={tab.id}
              className={`flex flex-col items-center rounded-xl p-1 border transition-all ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500/50'
                  : 'bg-[#081120] border-[#132238] hover:border-slate-700'
              }`}
            >
              {/* Top Sub-Bar: Scope Visibility Toggle button as requested! */}
              {hasScopeToggle ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tab.scopeKey) onToggleScopeSource(tab.scopeKey);
                  }}
                  title={isScopeActive ? 'Présent sur l\'oscilloscope (cliquer pour masquer)' : 'Masqué de l\'oscilloscope (cliquer pour activer)'}
                  className={`px-2 py-0.5 mb-1 rounded text-[9px] font-mono font-bold flex items-center gap-1 transition-all ${
                    isScopeActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                      : 'bg-slate-900 text-slate-500 border border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {isScopeActive ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                  <span>{isScopeActive ? '+SCOPE' : 'INVIS.'}</span>
                </button>
              ) : (
                <div className="h-4" /> // spacing placeholder
              )}

              {/* Main Tab Click Button */}
              <button
                onClick={() => setAppMode(tab.id)}
                className={`px-2.5 py-1 text-xs font-mono font-medium flex items-center gap-1.5 transition-all whitespace-nowrap rounded-lg ${
                  isActive
                    ? 'text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>

                {/* USER SPECIFIED: Voyant qui s'allume et flashe au rythme du son généré par cet onglet */}
                <span
                  className={`w-2 h-2 rounded-full transition-all duration-75 ${
                    activity > 0.08
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] scale-125'
                      : 'bg-slate-750'
                  }`}
                  style={{
                    opacity: Math.min(1.0, Math.max(0.15, activity * 2.5)),
                  }}
                  title={activity > 0.08 ? `Signal audio actif (~${(activity * 100).toFixed(0)}%)` : 'Silence'}
                />
              </button>
            </div>
          );
        })}
      </div>
    </header>
  );
};
