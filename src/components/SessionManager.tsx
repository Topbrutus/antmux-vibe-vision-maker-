import React, { useState, useEffect } from 'react';
import {
  Save,
  FolderOpen,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Check,
  Clock,
  Layers,
  FileJson,
  AlertCircle
} from 'lucide-react';
import { GenesisSessionData, OctaSystemState } from '../types/vectorScope';
import {
  getSavedSessions,
  saveSessionToStorage,
  deleteSessionFromStorage,
  exportSessionToFile,
  importSessionFromFile,
  SavedSessionItem
} from '../services/sessionStorage';

interface SessionManagerProps {
  currentSessionData: GenesisSessionData;
  onRestoreSession: (session: GenesisSessionData) => void;
  onResetAllToZero: () => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  currentSessionData,
  onRestoreSession,
  onResetAllToZero,
}) => {
  const [sessions, setSessions] = useState<SavedSessionItem[]>([]);
  const [sessionName, setSessionName] = useState<string>('');
  const [sessionDesc, setSessionDesc] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState<boolean>(false);

  useEffect(() => {
    setSessions(getSavedSessions());
  }, []);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleSaveCurrentSession = (e: React.FormEvent) => {
    e.preventDefault();
    const name = sessionName.trim() || `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    const id = `session_${Date.now()}`;
    const item: SavedSessionItem = {
      id,
      name,
      description: sessionDesc.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        ...currentSessionData,
        id,
        name,
        description: sessionDesc.trim(),
      },
    };

    const updated = saveSessionToStorage(item);
    setSessions(updated);
    setSessionName('');
    setSessionDesc('');
    showFeedback(`Session "${name}" enregistrée avec succès !`);
  };

  const handleLoadSession = (item: SavedSessionItem) => {
    onRestoreSession(item.data);
    setSelectedId(item.id);
    showFeedback(`Session "${item.name}" chargée avec succès !`);
  };

  const handleDeleteSession = (id: string, name: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer la session "${name}" ?`)) {
      const updated = deleteSessionFromStorage(id);
      setSessions(updated);
      showFeedback(`Session supprimée.`);
    }
  };

  const handleExportJson = (item: SavedSessionItem) => {
    exportSessionToFile(item.data, `${item.name.replace(/\s+/g, '_')}.json`);
    showFeedback(`Fichier JSON exporté.`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const data = await importSessionFromFile(file);
      const name = data.name || file.name.replace('.json', '');
      const id = `imported_${Date.now()}`;
      const item: SavedSessionItem = {
        id,
        name,
        description: data.description || 'Session importée depuis un fichier externe',
        createdAt: data.timestamp || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: {
          ...data,
          id,
          name,
        },
      };
      const updated = saveSessionToStorage(item);
      setSessions(updated);
      onRestoreSession(data);
      showFeedback(`Session "${name}" importée et activée !`);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'import');
    }
  };

  const handleExecuteReset = () => {
    onResetAllToZero();
    setIsConfirmingReset(false);
    showFeedback(`Toutes les configurations et générateurs ont été réinitialisés à zéro.`);
  };

  return (
    <div className="bg-[#050b18] border border-cyan-900/60 rounded-xl p-4 sm:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-950 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg font-mono font-black text-cyan-300 tracking-wider uppercase">
              GESTION DES SESSIONS & PRESETS
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-700/60">
              PERSISTANCE LOCALE & FICHIERS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Enregistrez toutes vos configurations, 8 générateurs, matrice de modulation et presets, restaurez-les à volonté ou remettez tout à zéro.
          </p>
        </div>

        {/* Big Reset Button (User Request: "Dans le même onglet, je voudrais avoir un reset pour que tout retombe à zéro comme au départ.") */}
        <div>
          {!isConfirmingReset ? (
            <button
              id="btn-reset-to-zero"
              onClick={() => setIsConfirmingReset(true)}
              className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/80 rounded-lg text-xs font-mono font-black flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-all transform hover:scale-105"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>RÉINITIALISER TOUT À ZÉRO (RESET DÉPART)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-rose-950 border border-rose-500 p-2 rounded-lg">
              <span className="text-xs text-rose-200 font-bold">Confirmer la remise à zéro ?</span>
              <button
                onClick={handleExecuteReset}
                className="px-2.5 py-1 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-500"
              >
                OUI, METTRE À ZÉRO
              </button>
              <button
                onClick={() => setIsConfirmingReset(false)}
                className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="p-3 bg-cyan-950/80 border border-cyan-500 text-cyan-300 rounded-lg text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4 text-cyan-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Form: Save Current Session */}
      <div className="bg-[#030712] border border-cyan-950 p-4 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase">
          <Save className="w-4 h-4" />
          <span>Enregistrer la session actuelle avec tous ses réglages</span>
        </div>

        <form onSubmit={handleSaveCurrentSession} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5 space-y-1">
            <label className="text-[11px] font-mono text-slate-400">Nom de la session :</label>
            <input
              type="text"
              placeholder="Ex: Mandalas Bleus Quart de Ton, Cascade FM 8-Gens..."
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full bg-[#0b162a] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="md:col-span-5 space-y-1">
            <label className="text-[11px] font-mono text-slate-400">Description ou notes (optionnel) :</label>
            <input
              type="text"
              placeholder="Ex: Utilise microtonalité +50 cents sur L2, matrice FM L1->R1..."
              value={sessionDesc}
              onChange={(e) => setSessionDesc(e.target.value)}
              className="w-full bg-[#0b162a] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Sauvegarder</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sessions Browser */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-slate-300">
              SESSIONS ENREGISTRÉES ({sessions.length})
            </span>
          </div>

          {/* Import file button */}
          <label className="px-3 py-1.5 bg-[#0b162a] border border-[#1d3050] hover:border-cyan-500/50 text-cyan-300 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Importer Session (JSON)</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </label>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-[#02050e] border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-2">
            <FileJson className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs font-mono text-slate-400">Aucune session enregistrée pour le moment.</div>
            <p className="text-[11px] font-mono text-slate-600 max-w-md mx-auto">
              Configurez vos oscillateurs, accordages, filtres et matrices de modulation puis donnez un nom à votre session ci-dessus pour la sauvegarder.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sessions.map((item) => {
              const isSelected = selectedId === item.id;
              const dateStr = new Date(item.updatedAt || item.createdAt).toLocaleDateString();
              const timeStr = new Date(item.updatedAt || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                    isSelected
                      ? 'bg-[#061426] border-cyan-500/80 shadow-lg shadow-cyan-950/50'
                      : 'bg-[#030712] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-cyan-300 truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {dateStr} {timeStr}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-xs font-mono text-slate-400 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                        {item.data.octaState ? '8-Gen Octa' : 'Stéréo X/Y'}
                      </span>
                      {item.data.octaState?.modulationMatrix?.routings?.length ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                          {item.data.octaState.modulationMatrix.routings.length} modulations
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                    <button
                      onClick={() => handleLoadSession(item)}
                      className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs font-mono flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Charger</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleExportJson(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
                        title="Télécharger fichier JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(item.id, item.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Supprimer la session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
