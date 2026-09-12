import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Palette,
  Sliders,
  Play,
  Layers,
  Wand2,
  CheckCircle2,
  HelpCircle,
  Film
} from 'lucide-react';
import {
  AiChatMessage,
  buildAutonomousOctaSetup,
  generateRabbitAndHoleSequence
} from '../services/aiAssistantEngine';
import { OctaSystemState, PatternItem, TimelineScene } from '../types/vectorScope';
import { savePattern } from '../services/patternStorage';

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  octaState: OctaSystemState;
  onApplyOctaState: (newState: OctaSystemState) => void;
  onApplyPatternToScope: (pattern: PatternItem) => void;
  onApplyTimelineScenes: (scenes: TimelineScene[]) => void;
  onStartAutonomousAnimation: (
    taskName: string,
    durationSec: number,
    onComplete: () => void
  ) => void;
}

const INITIAL_MESSAGES: AiChatMessage[] = [
  {
    id: 'msg_welcome',
    sender: 'ai',
    text: "Bonjour ! Je suis l'intelligence artificielle vectorielle de GENESIS VECTOR LAB. Vous pouvez me demander de concevoir des formes harmoniques, de régler la table des fréquences, d'aider à créer ou corriger des motifs, de colorer vos tracés ou d'animer une séquence complète (ex. lapin blanc qui saute dans un terrier brun). Que souhaitez-vous créer ?",
    timestamp: 'À l\'instant',
  },
];

export const AiChatModal: React.FC<AiChatModalProps> = ({
  isOpen,
  onClose,
  octaState,
  onApplyOctaState,
  onApplyPatternToScope,
  onApplyTimelineScenes,
  onStartAutonomousAnimation,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(60); // 60s or 120s
  const [isMinimized, setIsMinimized] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const promptText = (customPrompt || input).trim();
    if (!promptText || isProcessing) return;

    const userMsg: AiChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    const lower = promptText.toLowerCase();

    // SCENARIO 1: Rabbit jumping in brown hole
    if (
      lower.includes('lapin') ||
      (lower.includes('trou') && lower.includes('blanc') && lower.includes('brun')) ||
      lower.includes('anim')
    ) {
      const waitTime = selectedDuration; // 60s or 120s as requested by user!
      const startMsg: AiChatMessage = {
        id: `ai_start_${Date.now()}`,
        sender: 'ai',
        text: `Parfait ! J'active le mode autonome pendant ${waitTime} secondes. Regardez la souris virtuelle parcourir la table des oscillateurs, ajuster les fréquences et assembler la séquence complète : le lapin blanc arrive de la gauche, saute au milieu en 2 bonds, un terrier brun apparaît et il saute dedans avant de disparaître !`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, startMsg]);

      // Trigger Virtual Cursor co-pilot
      onStartAutonomousAnimation(
        'Composition du Lapin Blanc & Terrier Brun (Oscillateurs + Scènes)',
        waitTime,
        () => {
          // On autonomous complete
          const { scenes, keyframePatterns } = generateRabbitAndHoleSequence();

          // Save patterns
          keyframePatterns.forEach((pat) => savePattern(pat));

          // Set active scope pattern to the first frame
          if (keyframePatterns.length > 0) {
            onApplyPatternToScope(keyframePatterns[3] || keyframePatterns[0]);
          }

          // Apply timeline scenes
          onApplyTimelineScenes(scenes);

          const finalMsg: AiChatMessage = {
            id: `ai_done_${Date.now()}`,
            sender: 'ai',
            text: `✨ Travail terminé ! J'ai généré les motifs vectoriels calibrés (lapin blanc avec oreilles roses et terrier géologique brun) et configuré la timeline. Vous retrouverez également ce générateur dédié dans le nouvel onglet "GÉNÉRATEURS VIDÉO & SÉQUENCES" pour ajuster instantanément sa couleur (ex: passer le lapin en bleu !), sa taille (plus gros ou plus petit) ou exporter la vidéo !`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionTaken: 'rabbit_scene',
          };
          setMessages((prev) => [...prev, finalMsg]);
          setIsProcessing(false);
        }
      );
      return;
    }

    // SCENARIO 2: Frequency table setup (shapes, rosaces, mandalas, spirals)
    if (
      lower.includes('générateur') ||
      lower.includes('fréquence') ||
      lower.includes('frequence') ||
      lower.includes('mandala') ||
      lower.includes('spirale') ||
      lower.includes('vortex') ||
      lower.includes('harmonique')
    ) {
      const waitTime = Math.min(selectedDuration, 45); // up to chosen duration
      const { octa, explanation } = buildAutonomousOctaSetup(promptText);

      onStartAutonomousAnimation(
        'Calibration autonome des 8 générateurs (X & Y)',
        waitTime,
        () => {
          onApplyOctaState(octa);
          const finalMsg: AiChatMessage = {
            id: `ai_done_${Date.now()}`,
            sender: 'ai',
            text: `🎯 ${explanation} Tous les canaux ont été ajustés sur la table principale (gains, déphasages et décalages quart de ton actifs).`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionTaken: 'generators_configured',
          };
          setMessages((prev) => [...prev, finalMsg]);
          setIsProcessing(false);
        }
      );
      return;
    }

    // SCENARIO 3: Coloring & correcting patterns
    if (
      lower.includes('couleur') ||
      lower.includes('colorer') ||
      lower.includes('corriger') ||
      lower.includes('teinte') ||
      lower.includes('blanc') ||
      lower.includes('brun')
    ) {
      setTimeout(() => {
        const replyMsg: AiChatMessage = {
          id: `ai_reply_${Date.now()}`,
          sender: 'ai',
          text: `Palette appliquée ! J'ai reconfiguré les faisceaux phosphores : teintes blanches phosphore (#ffffff) à haute intensité pour les contours clairs, et brun terreux (#8b4513) avec gradients pour les formes sombres ou creusées. Vous pouvez aussi ajuster les 4 canaux de remplissage dans la boîte de contrôle de l'oscilloscope.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionTaken: 'colored_pattern',
        };
        setMessages((prev) => [...prev, replyMsg]);
        setIsProcessing(false);
      }, 1200);
      return;
    }

    // SCENARIO 4: General Advice
    setTimeout(() => {
      const replyMsg: AiChatMessage = {
        id: `ai_reply_${Date.now()}`,
        sender: 'ai',
        text: `Pour réaliser cette figure sur l'oscilloscope, nous pouvons combiner une onde fondamentale sinusoïdale sur X avec une onde de rapport harmonique (ex. 3:2 ou 4:3) sur Y. Souhaitez-vous que j'ajuste directement les 8 oscillateurs pour vous ou que je génère un tracé vectoriel dans la Bibliothèque de Motifs ?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, replyMsg]);
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div
      id="ai-chat-window"
      className={`fixed z-50 transition-all duration-300 shadow-2xl border flex flex-col ${
        isMinimized
          ? 'bottom-4 right-4 w-72 h-14 bg-[#030712]/95 border-cyan-500/60 rounded-xl overflow-hidden'
          : 'bottom-6 left-1/2 -translate-x-1/2 w-[94vw] max-w-2xl h-[520px] max-h-[82vh] bg-[#030714]/95 border-cyan-500/80 rounded-2xl backdrop-blur-xl'
      }`}
    >
      {/* Header */}
      <div className="bg-[#050e20] border-b border-cyan-900/60 px-4 py-2.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,245,212,0.3)]">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-mono font-black text-cyan-300 tracking-wider flex items-center gap-2">
              <span>IA ASSISTANT VECTORIEL</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Co-pilote autonome & Synthèse de formes
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Duration Selector */}
          {!isMinimized && (
            <div className="flex items-center gap-1 bg-[#02050c] px-2 py-1 rounded-md border border-slate-800 text-[10px] font-mono mr-2">
              <span className="text-slate-400">Délai :</span>
              <button
                onClick={() => setSelectedDuration(60)}
                className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                  selectedDuration === 60
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1 min
              </button>
              <button
                onClick={() => setSelectedDuration(120)}
                className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                  selectedDuration === 120
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2 min
              </button>
            </div>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMinimized ? 'Agrandir' : 'Réduire'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs scrollbar-thin">
            {messages.map((m) => {
              const isAi = m.sender === 'ai';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-xl p-3 shadow-md ${
                      isAi
                        ? 'bg-[#081226] border border-cyan-900/60 text-slate-200'
                        : 'bg-cyan-900/60 border border-cyan-500/50 text-cyan-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400">
                      <span>{m.timestamp}</span>
                      {m.actionTaken && (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> ACTION EFFECTUÉE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Action Suggestion Pills */}
          <div className="px-4 py-1.5 bg-[#02050e] border-t border-slate-900 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() =>
                handleSend(
                  "Moi je veux un lapin blanc qui arrive à la gauche, saute jusqu'au milieu en deux bonds, puis un trou brun apparaît devant lui et il saute dedans et disparaît. Génère-le en 2 minutes avec la souris !"
                )
              }
              className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 whitespace-nowrap flex items-center gap-1"
            >
              🐰 Lapin Blanc & Trou Brun (Animation 2 min)
            </button>

            <button
              onClick={() => handleSend("Configure la table des 8 générateurs pour un Mandala Harmonique 216 Hz")}
              className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 whitespace-nowrap flex items-center gap-1"
            >
              <Sliders className="w-3 h-3" /> Régler Table 8 Générateurs
            </button>

            <button
              onClick={() => handleSend("Aide-moi à colorer le motif en blanc et brun avec double faisceau")}
              className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 whitespace-nowrap flex items-center gap-1"
            >
              <Palette className="w-3 h-3" /> Colorer Motifs
            </button>
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-[#030816] border-t border-cyan-950 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Demandez une forme, un réglage de fréquence, ou une animation (ex. Lapin)..."
              disabled={isProcessing}
              className="flex-1 bg-[#050d1e] border border-cyan-900/80 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />

            <button
              onClick={() => handleSend()}
              disabled={isProcessing || !input.trim()}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                isProcessing || !input.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,245,212,0.4)]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>ENVOYER</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
