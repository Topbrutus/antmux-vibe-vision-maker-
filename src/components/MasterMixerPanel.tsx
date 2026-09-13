import React from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Play,
  Pause,
  CheckSquare,
  Square,
  Activity,
  Sparkles,
  Radio,
  Layers,
  Film,
  Music,
  Video,
  Mic,
  Shuffle,
  FolderOpen,
  Type,
  Compass,
  GitCompare,
  MonitorCheck,
  Disc,
  Eye,
  Zap,
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { AppMode, TabMixerChannel, ScopeDisplaySettings, PatternItem } from '../types/vectorScope';
import { ZoneCOscilloscope } from './ZoneCOscilloscope';

interface MasterMixerPanelProps {
  channels: Record<AppMode, TabMixerChannel>;
  onUpdateChannel: (id: AppMode, updates: Partial<TabMixerChannel>) => void;
  onBatchUpdateChannels: (updates: Partial<TabMixerChannel>) => void;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  masterMute: boolean;
  onToggleMasterMute: () => void;
  autoNormalize: boolean;
  onToggleAutoNormalize: () => void;
  onNavigateToTab: (mode: AppMode) => void;
  compositePoints: Array<[number, number]>;
  scopeSettings: ScopeDisplaySettings;
  onSettingsChange: (settings: Partial<ScopeDisplaySettings>) => void;
  rabbitDualZone: {
    enabled: boolean;
    primaryColor: string;
    earsColor: string;
    burrowColor: string;
    noiseEnabled: boolean;
    noiseFrequency: number;
    noiseDensity: number;
    noiseBounceSpeed: number;
  };
  onUpdateRabbitDualZone: (updates: Partial<MasterMixerPanelProps['rabbitDualZone']>) => void;
}

const TAB_ICONS: Record<AppMode, React.ComponentType<{ className?: string }>> = {
  main: Activity,
  mixer: Sliders,
  sequence_generators: Video,
  piano: Music,
  radio: Radio,
  mics: Mic,
  patterns: Layers,
  matrix: Shuffle,
  sessions: FolderOpen,
  segmented: Layers,
  image_lab: Film,
  text_lab: Type,
  timeline: Film,
  mandala: Sparkles,
  mandala_directory: Sparkles,
  spectral: Sliders,
  vortex: Compass,
  comparator: GitCompare,
  real_scope: MonitorCheck,
  genesis: Disc,
};

export const MasterMixerPanel: React.FC<MasterMixerPanelProps> = ({
  channels,
  onUpdateChannel,
  onBatchUpdateChannels,
  masterVolume,
  onMasterVolumeChange,
  masterMute,
  onToggleMasterMute,
  autoNormalize,
  onToggleAutoNormalize,
  onNavigateToTab,
  compositePoints,
  scopeSettings,
  onSettingsChange,
  rabbitDualZone,
  onUpdateRabbitDualZone,
}) => {
  const channelList = Object.values(channels) as TabMixerChannel[];
  const activeMixerCount = channelList.filter((c) => c.inMixer && !c.isMuted && !c.isPaused).length;

  return (
    <div className="w-full flex flex-col gap-5 p-3 md:p-6 bg-[#030712] text-slate-100 min-h-screen select-none font-sans">
      {/* Master Top Bar */}
      <div className="bg-[#071124] border border-[#142646] p-4 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl text-slate-950 shadow-lg shadow-cyan-500/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-black tracking-wider text-cyan-300 uppercase">
                MIXEUR MASTER UNIFIÉ & OSCILLOSCOPE MULTI-ONGLETS
              </h1>
              <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-500/40 rounded-md text-[10px] font-mono font-bold">
                {activeMixerCount} / {channelList.length} ACTIFS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tous les onglets fonctionnent simultanément. Cochez les crochets [☑] pour router chaque onglet dans le mixeur master.
            </p>
          </div>
        </div>

        {/* Master Output Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-[#040916] p-2 rounded-xl border border-[#122340]">
          {/* Master Volume */}
          <div className="flex items-center gap-2 px-2">
            <button
              onClick={onToggleMasterMute}
              className={`p-1.5 rounded-lg border transition-all ${
                masterMute
                  ? 'bg-rose-950/80 text-rose-400 border-rose-500/60 shadow-md'
                  : 'bg-[#09152a] text-cyan-300 border-[#142646] hover:text-white'
              }`}
              title={masterMute ? 'Désactiver la sourdine générale' : 'Sourdine générale Master'}
            >
              {masterMute ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400 font-bold">VOLUME MASTER</span>
                <span className="text-cyan-300 font-bold">{Math.round(masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.02"
                value={masterVolume}
                onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
                className="w-28 accent-cyan-400 h-1.5 bg-[#0b162a] rounded-lg"
              />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Auto-Normalize */}
          <button
            onClick={onToggleAutoNormalize}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all flex items-center gap-1.5 ${
              autoNormalize
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/60 shadow-sm'
                : 'bg-[#09152a] text-slate-400 border-[#142646]'
            }`}
            title="Normalisation dynamique automatique pour éviter toute saturation lorsque plusieurs onglets tournent en même temps"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>NORMALISATION : {autoNormalize ? 'ON' : 'OFF'}</span>
          </button>

          {/* Quick Batch Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onBatchUpdateChannels({ inMixer: true })}
              className="px-2 py-1 rounded bg-[#09152a] hover:bg-[#122442] text-slate-300 hover:text-cyan-300 text-[10px] font-mono border border-[#142646]"
              title="Cocher tous les onglets pour le mixeur"
            >
              TOUT COCHER
            </button>
            <button
              onClick={() => onBatchUpdateChannels({ inMixer: false })}
              className="px-2 py-1 rounded bg-[#09152a] hover:bg-[#122442] text-slate-300 hover:text-rose-300 text-[10px] font-mono border border-[#142646]"
              title="Décocher tous les onglets du mixeur"
            >
              TOUT DÉCOCHER
            </button>
            <button
              onClick={() => onBatchUpdateChannels({ isMuted: false })}
              className="px-2 py-1 rounded bg-[#09152a] hover:bg-[#122442] text-teal-300 text-[10px] font-mono border border-[#142646]"
              title="Activer le son de tous les onglets (enlever les sourdines)"
            >
              TOUT ACTIVER
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Oscilloscope Composite + Channels Rack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Composite Oscilloscope with Dual-Zone Rabbit Support */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-[#071124] border border-[#142646] p-4 rounded-2xl shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#122340] pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-mono font-bold text-xs text-cyan-300">
                  OSCILLOSCOPE MASTER DU MIXEUR ({activeMixerCount} SOURCES COMBINÉES)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Lissajous X/Y & Rendu Phosphore
              </span>
            </div>

            {/* Oscilloscope Container */}
            <div className="w-full flex justify-center py-1">
              <ZoneCOscilloscope
                points={compositePoints}
                settings={scopeSettings}
                onSettingsChange={onSettingsChange}
                presetName="MIXEUR MASTER"
                isPaused={false}
                onTogglePause={() => {}}
                sourceModuleInfo={{ name: 'MIXEUR MASTER (MULTI-ONGLETS)', mode: 'mixer' }}
              />
            </div>

            {/* Special Section: Lapin Blanc & Terrier Dual-Zone Configuration */}
            <div className="bg-[#040a16] p-3 rounded-xl border border-teal-500/30 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#122340] pb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-rabbit-dual-zone"
                    checked={rabbitDualZone.enabled}
                    onChange={(e) => onUpdateRabbitDualZone({ enabled: e.target.checked })}
                    className="accent-teal-400 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="chk-rabbit-dual-zone" className="font-bold text-xs text-teal-300 flex items-center gap-1.5 cursor-pointer">
                    🐰 LAPIN BLANC & TERRIER (DOUBLE ZONE & COULEURS PRÉSERVÉES)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateRabbitDualZone({ noiseEnabled: !rabbitDualZone.noiseEnabled })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                      rabbitDualZone.noiseEnabled
                        ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 border-cyan-300'
                        : 'bg-[#09152a] text-slate-400 border-[#142646]'
                    }`}
                  >
                    BRUIT BLANC INTÉRIEUR : {rabbitDualZone.noiseEnabled ? 'ACTIF' : 'OFF'}
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 leading-relaxed">
                Les 2 zones du lapin (Zone 1 : contours, fourrure blanche, oreilles roses, terrier géologique brun ; Zone 2 : bruit blanc intérieur résonnant qui rebondit à l'intérieur du motif) sont directement fusionnées dans le mixeur avec leurs couleurs intactes.
              </div>

              {/* Color swatches and noise parameters for the rabbit */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="flex flex-col gap-1 bg-[#071124] p-2 rounded-lg border border-[#122340]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Fourrure :</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={rabbitDualZone.primaryColor}
                      onChange={(e) => onUpdateRabbitDualZone({ primaryColor: e.target.value })}
                      className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded"
                    />
                    <span className="text-[10px] font-mono text-slate-200">{rabbitDualZone.primaryColor}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 bg-[#071124] p-2 rounded-lg border border-[#122340]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Oreilles :</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={rabbitDualZone.earsColor}
                      onChange={(e) => onUpdateRabbitDualZone({ earsColor: e.target.value })}
                      className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded"
                    />
                    <span className="text-[10px] font-mono text-slate-200">{rabbitDualZone.earsColor}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 bg-[#071124] p-2 rounded-lg border border-[#122340]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Terrier Brun :</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={rabbitDualZone.burrowColor}
                      onChange={(e) => onUpdateRabbitDualZone({ burrowColor: e.target.value })}
                      className="w-5 h-5 bg-transparent border-0 cursor-pointer rounded"
                    />
                    <span className="text-[10px] font-mono text-slate-200">{rabbitDualZone.burrowColor}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 bg-[#071124] p-2 rounded-lg border border-[#122340]">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Fréq. Bruit :</span>
                  <span className="text-[10px] font-mono text-cyan-300 font-bold">
                    {rabbitDualZone.noiseFrequency} Hz
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Channels Rack Table with Checkmarks (Crochets) */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="bg-[#071124] border border-[#142646] p-4 rounded-2xl shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#122340] pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="font-mono font-bold text-xs text-cyan-300 uppercase">
                  RACK DES ONGLETS & CONTRÔLES INDIVIDUELS
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Crochet [☑] = Entendre dans le Mixeur
              </span>
            </div>

            {/* List of all channels in rack */}
            <div className="flex flex-col gap-2.5 max-h-[750px] overflow-y-auto pr-1">
              {channelList.map((chan) => {
                const Icon = TAB_ICONS[chan.id] || Activity;
                const isIncluded = chan.inMixer;
                const isSilent = chan.isMuted || chan.isPaused || !isIncluded;

                return (
                  <div
                    key={chan.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isIncluded
                        ? chan.isMuted
                          ? 'bg-[#0a1220] border-rose-900/40 text-slate-400'
                          : chan.isPaused
                          ? 'bg-[#0a1424] border-amber-900/40 text-slate-400'
                          : 'bg-[#08152c] border-cyan-500/40 text-slate-100 shadow-md shadow-cyan-950/20'
                        : 'bg-[#050b16] border-[#101e36] text-slate-500 opacity-75 hover:opacity-100'
                    }`}
                  >
                    {/* Left: Checkbox (Crochet) + Icon + Tab Name */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      {/* Checkbox (Crochet) */}
                      <button
                        onClick={() => onUpdateChannel(chan.id, { inMixer: !chan.inMixer })}
                        className={`p-1 rounded-md transition-all ${
                          chan.inMixer
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                            : 'bg-slate-900 text-slate-600 border border-slate-700 hover:text-slate-300'
                        }`}
                        title={chan.inMixer ? 'Retirer du mixeur master' : 'Cocher pour entendre et voir dans le mixeur master'}
                      >
                        {chan.inMixer ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>

                      <div className="p-1.5 rounded-lg bg-[#030814] border border-[#142646] text-cyan-400">
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-slate-200 truncate max-w-[140px]">
                            {chan.name}
                          </span>
                          {/* Live Activity pulsing dot */}
                          <span
                            className={`w-2 h-2 rounded-full transition-all ${
                              chan.activityLevel > 0.05
                                ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                                : 'bg-slate-700'
                            }`}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 uppercase">
                          {chan.category}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Controls (Pause, Sourdine/Mute, Solo) */}
                    <div className="flex items-center gap-1.5">
                      {/* Pause Toggle */}
                      <button
                        onClick={() => onUpdateChannel(chan.id, { isPaused: !chan.isPaused })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all flex items-center gap-1 ${
                          chan.isPaused
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-[#040810] text-slate-300 border-[#142646] hover:text-white'
                        }`}
                        title={chan.isPaused ? 'Reprendre la génération' : 'Mettre cet onglet en pause'}
                      >
                        {chan.isPaused ? <Play className="w-3 h-3 text-amber-400" /> : <Pause className="w-3 h-3" />}
                        <span>{chan.isPaused ? 'EN PAUSE' : 'ACTIF'}</span>
                      </button>

                      {/* Mute / Sourdine Toggle */}
                      <button
                        onClick={() => onUpdateChannel(chan.id, { isMuted: !chan.isMuted })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all flex items-center gap-1 ${
                          chan.isMuted
                            ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                            : 'bg-[#040810] text-teal-300 border-[#142646] hover:text-white'
                        }`}
                        title={chan.isMuted ? 'Désactiver la sourdine' : 'Mettre en sourdine cet onglet'}
                      >
                        {chan.isMuted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3 text-teal-400" />}
                        <span>{chan.isMuted ? 'SOURDINE' : 'AUDIO'}</span>
                      </button>

                      {/* Solo Toggle */}
                      <button
                        onClick={() => {
                          const nextSolo = !chan.solo;
                          // If enabling solo, mute all other channels in mixer
                          if (nextSolo) {
                            channelList.forEach((c) => {
                              onUpdateChannel(c.id, { solo: c.id === chan.id });
                            });
                          } else {
                            onUpdateChannel(chan.id, { solo: false });
                          }
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black border transition-all ${
                          chan.solo
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30'
                            : 'bg-[#040810] text-slate-400 border-[#142646] hover:text-amber-300'
                        }`}
                        title="Écouter cet onglet en solo"
                      >
                        SOLO
                      </button>
                    </div>

                    {/* Right: Volume Slider & Navigation Jump */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex flex-col gap-0.5 min-w-[100px]">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="text-slate-400">GAIN</span>
                          <span className="text-cyan-300 font-bold">{Math.round(chan.volume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2.0"
                          step="0.05"
                          value={chan.volume}
                          onChange={(e) => onUpdateChannel(chan.id, { volume: parseFloat(e.target.value) })}
                          className="w-24 accent-cyan-400 h-1 bg-[#040810] rounded-lg"
                        />
                      </div>

                      {/* Direct jump to Tab */}
                      <button
                        onClick={() => onNavigateToTab(chan.id)}
                        className="p-1.5 rounded-lg bg-[#040810] hover:bg-[#122442] border border-[#142646] text-slate-300 hover:text-cyan-300 transition-colors"
                        title="Ouvrir cet onglet"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
