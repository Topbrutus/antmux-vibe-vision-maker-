import React, { useState } from 'react';
import {
  MonitorCheck,
  AlertTriangle,
  Zap,
  ArrowLeftRight,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Radio,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { ChannelConfig } from '../types/vectorScope';

interface RealOscilloscopeModeProps {
  configX: ChannelConfig;
  configY: ChannelConfig;
  onConfigChangeX: (cfg: Partial<ChannelConfig>) => void;
  onConfigChangeY: (cfg: Partial<ChannelConfig>) => void;
  onTriggerTestPattern: (pattern: 'circle' | 'line' | 'phase' | 'amplitude') => void;
}

export const RealOscilloscopeMode: React.FC<RealOscilloscopeModeProps> = ({
  configX,
  configY,
  onConfigChangeX,
  onConfigChangeY,
  onTriggerTestPattern,
}) => {
  const [calibrationStep, setCalibrationStep] = useState<number>(1);

  const handleChannelSwap = () => {
    const tempX = { ...configX };
    onConfigChangeX({
      waveform: configY.waveform,
      frequency: configY.frequency,
      amplitude: configY.amplitude,
      phase: configY.phase,
    });
    onConfigChangeY({
      waveform: tempX.waveform,
      frequency: tempX.frequency,
      amplitude: tempX.amplitude,
      phase: tempX.phase,
    });
  };

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-2xl p-5 font-mono text-xs text-slate-300 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#14233c] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <MonitorCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-sm tracking-wide">
              MODE OSCILLOSCOPE PHYSIQUE DE LABORATOIRE (X/Y MODE)
            </h2>
            <p className="text-[11px] text-slate-400">
              Procédure de raccordement BNC, signaux de calibration et directives de sécurité électrique
            </p>
          </div>
        </div>

        {/* Wiring Badge */}
        <div className="flex items-center gap-3 bg-[#060c18] px-3 py-2 rounded-xl border border-cyan-500/30 text-xs">
          <span className="font-bold text-cyan-300">SORTIE AUDIO GAUCHE (L) → CANAL X (CH1)</span>
          <span className="text-slate-600">|</span>
          <span className="font-bold text-amber-400">SORTIE AUDIO DROITE (R) → CANAL Y (CH2)</span>
        </div>
      </div>

      {/* Laboratory BNC Safety & Earth Ground Warning */}
      <div className="bg-rose-950/40 border-2 border-rose-500/50 p-4 rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4 text-rose-400" /> AVERTISSEMENTS CRITIQUES DE SÉCURITÉ DE LABORATOIRE
        </div>
        <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-1 pl-1">
          <li>
            <strong className="text-rose-200">Sortie Ligne ou Casque Uniquement :</strong> N'utilisez{' '}
            <span className="underline font-bold">JAMAIS</span> une sortie amplifiée de haut-parleur (haut niveau de puissance), sous peine de détruire les étages d'entrée de votre oscilloscope.
          </li>
          <li>
            <strong className="text-rose-200">Masse BNC et Terre de Protection :</strong> Les blindages externes des prises BNC de la majorité des oscilloscopes de table sont{' '}
            <span className="underline font-bold">directement reliés à la terre secteur (PE)</span>. Évitez les boucles de masse avec votre carte son ou utilisez une isolation galvanique (transformateur de ligne audio 1:1) si votre ordinateur est lui-même relié à la terre.
          </li>
          <li>
            <strong className="text-rose-200">Protection Contre le Feedback Acoustique :</strong> Aucun rebouclage micro automatique n'est activé. Le niveau de sortie est automatiquement limité sous 0 dBFS.
          </li>
        </ul>
      </div>

      {/* Hardware Calibration & Test Signals Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Test Patterns Section */}
        <div className="bg-[#060c18] p-4 rounded-xl border border-[#14233c] space-y-3">
          <span className="text-cyan-400 font-bold text-xs block uppercase">
            SIGNAUX ÉTALONS DE CALIBRATION :
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onTriggerTestPattern('circle')}
              className="p-2.5 rounded-lg bg-[#091325] hover:bg-[#12223c] border border-cyan-500/30 text-cyan-200 text-left transition-colors"
            >
              <div className="font-bold text-xs">TEST CERCLE</div>
              <div className="text-[10px] text-slate-400">Vérifier orthogonalité X/Y</div>
            </button>

            <button
              onClick={() => onTriggerTestPattern('line')}
              className="p-2.5 rounded-lg bg-[#091325] hover:bg-[#12223c] border border-amber-500/30 text-amber-200 text-left transition-colors"
            >
              <div className="font-bold text-xs">TEST LIGNE 45°</div>
              <div className="text-[10px] text-slate-400">Équilibrage des gains L/R</div>
            </button>

            <button
              onClick={() => onTriggerTestPattern('phase')}
              className="p-2.5 rounded-lg bg-[#091325] hover:bg-[#12223c] border border-blue-500/30 text-blue-200 text-left transition-colors"
            >
              <div className="font-bold text-xs">TEST PHASE 90°</div>
              <div className="text-[10px] text-slate-400">Contrôle de quadrature</div>
            </button>

            <button
              onClick={() => onTriggerTestPattern('amplitude')}
              className="p-2.5 rounded-lg bg-[#091325] hover:bg-[#12223c] border border-slate-700 text-slate-200 text-left transition-colors"
            >
              <div className="font-bold text-xs">TEST AMPLITUDE CAL</div>
              <div className="text-[10px] text-slate-400">Calibration pleine échelle 1Vpp</div>
            </button>
          </div>

          {/* Quick Signal Modifiers */}
          <div className="pt-2 border-t border-[#14233c] flex flex-wrap items-center gap-2">
            <button
              onClick={handleChannelSwap}
              className="px-2.5 py-1.5 rounded bg-[#101d34] hover:bg-[#1a3055] text-cyan-300 flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" /> INVERSER CANAUX (SWAP X ↔ Y)
            </button>

            <button
              onClick={() => onConfigChangeX({ polarity: configX.polarity === 1 ? -1 : 1 })}
              className={`px-2.5 py-1.5 rounded text-xs font-bold border transition-colors ${
                configX.polarity === -1
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                  : 'bg-[#101d34] text-slate-300 border-[#1a3055]'
              }`}
            >
              INVERSER AXE X
            </button>

            <button
              onClick={() => onConfigChangeY({ polarity: configY.polarity === 1 ? -1 : 1 })}
              className={`px-2.5 py-1.5 rounded text-xs font-bold border transition-colors ${
                configY.polarity === -1
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-[#101d34] text-slate-300 border-[#1a3055]'
              }`}
            >
              INVERSER AXE Y
            </button>
          </div>
        </div>

        {/* Step-by-Step Calibration Procedure */}
        <div className="bg-[#060c18] p-4 rounded-xl border border-[#14233c] space-y-3">
          <span className="text-amber-400 font-bold text-xs block uppercase">
            PROCÉDURE D'ALIGNEMENT DE L'OSCILLOSCOPE :
          </span>

          <div className="space-y-2 text-[11px] text-slate-300">
            <div className={`p-2.5 rounded-lg border ${calibrationStep === 1 ? 'bg-cyan-950/40 border-cyan-400' : 'bg-[#091325] border-[#14233c]'}`}>
              <strong className="text-cyan-300 block mb-0.5">Étape 1 : Basculer en Mode X-Y</strong>
              Réglez la base de temps de l'oscilloscope sur « X-Y » (désactiver le balayage temporel horizontal t).
            </div>

            <div className={`p-2.5 rounded-lg border ${calibrationStep === 2 ? 'bg-cyan-950/40 border-cyan-400' : 'bg-[#091325] border-[#14233c]'}`}>
              <strong className="text-cyan-300 block mb-0.5">Étape 2 : Centrage et Calibre V/Div</strong>
              Alignez le point de repos au centre du réticule (GND). Passez en couplage AC ou DC, réglez CH1 et CH2 sur le même calibre (ex: 500 mV/div).
            </div>

            <div className={`p-2.5 rounded-lg border ${calibrationStep === 3 ? 'bg-cyan-950/40 border-cyan-400' : 'bg-[#091325] border-[#14233c]'}`}>
              <strong className="text-cyan-300 block mb-0.5">Étape 3 : Étalonnage du Cercle Parfait</strong>
              Cliquez sur « TEST CERCLE ». Ajustez les verniers fins de gain CH1 et CH2 jusqu'à obtenir un cercle parfait sans déformation elliptique.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
