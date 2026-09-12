import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Video,
  Disc,
  StopCircle,
  Download,
  Upload,
  FolderArchive,
  Save,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  FileVideo,
  Clock,
  Radio
} from 'lucide-react';
import { VectorAudioEngine } from '../services/audioEngine';
import { GenesisSessionData } from '../types/vectorScope';
import { encodeStereoWav, triggerBlobDownload, triggerTextDownload } from '../services/exportUtils';

interface AudioVideoSessionRecorderProps {
  audioEngine: VectorAudioEngine;
  currentSessionData: () => GenesisSessionData;
  onRestoreSession: (session: GenesisSessionData) => void;
}

export const AudioVideoSessionRecorder: React.FC<AudioVideoSessionRecorderProps> = ({
  audioEngine,
  currentSessionData,
  onRestoreSession,
}) => {
  // Audio recording state
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioWavBlob, setAudioWavBlob] = useState<Blob | null>(null);

  // Video recording state
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  // Session state
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Timers for live duration
  useEffect(() => {
    let interval: any = null;
    if (isAudioRecording) {
      const start = performance.now();
      interval = setInterval(() => {
        setAudioDuration((performance.now() - start) / 1000);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isAudioRecording]);

  useEffect(() => {
    let interval: any = null;
    if (isVideoRecording) {
      const start = performance.now();
      interval = setInterval(() => {
        setVideoDuration((performance.now() - start) / 1000);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isVideoRecording]);

  // Audio Recording Controls
  const handleStartAudioRecord = () => {
    audioEngine.startRecording();
    setIsAudioRecording(true);
    setAudioWavBlob(null);
    setAudioDuration(0);
  };

  const handleStopAudioRecord = () => {
    const result = audioEngine.stopRecording();
    setIsAudioRecording(false);

    if (result.left.length > 0) {
      const { blob } = encodeStereoWav(result.left, result.right, result.sampleRate, 48000, 24, true);
      setAudioWavBlob(blob);
    }
  };

  const handleDownloadAudioWav = () => {
    if (!audioWavBlob) return;
    triggerBlobDownload(audioWavBlob, `GENESIS_STEREO_SESSION_${Date.now()}.wav`);
  };

  // Video Recording Controls
  const handleStartVideoRecord = () => {
    // Find active scope canvas in the DOM
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      alert('Aucun canvas oscilloscope détecté pour la capture vidéo.');
      return;
    }

    const canvasStream = canvas.captureStream(60);
    const audioDest = audioEngine.getMediaStreamDestination();

    let combinedStream: MediaStream;
    if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
      combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks(),
      ]);
    } else {
      combinedStream = canvasStream;
    }

    videoChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 6000000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        videoChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(videoChunksRef.current, { type: mimeType });
      setVideoBlob(blob);
    };

    recorder.start(250);
    mediaRecorderRef.current = recorder;
    setIsVideoRecording(true);
    setVideoBlob(null);
    setVideoDuration(0);
  };

  const handleStopVideoRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsVideoRecording(false);
  };

  const handleDownloadVideo = () => {
    if (!videoBlob) return;
    triggerBlobDownload(videoBlob, `GENESIS_VECTOR_VIDEO_${Date.now()}.webm`);
  };

  // Save Session
  const handleSaveSession = () => {
    const session = currentSessionData();
    const jsonStr = JSON.stringify(session, null, 2);
    triggerTextDownload(
      jsonStr,
      `GENESIS_SESSION_${new Date().toISOString().slice(0, 10)}.genesis.json`,
      'application/json'
    );
    setSaveStatus('Session exportée avec succès');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Load Session
  const handleLoadSession = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed: GenesisSessionData = JSON.parse(content);
        if (parsed.appName || parsed.configX) {
          onRestoreSession(parsed);
          setSaveStatus('Session chargée avec succès !');
          setTimeout(() => setSaveStatus(null), 3000);
        } else {
          alert('Fichier de session invalide.');
        }
      } catch (err) {
        alert('Erreur lors de la lecture du fichier de session.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-[#0a1324] border border-[#14233c] rounded-xl p-4 font-mono text-xs text-slate-300 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#14233c] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-md">
            <Disc className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              CENTRE D'ENREGISTREMENT AUDIO, VIDÉO & SESSION
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/70 border border-rose-800/40 text-rose-400">
                MASTER STUDIO
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Capture haute fidélité stéréo (WAV 24-bit), enregistrement vidéo WebM de l'oscilloscope synchronisé et sauvegarde de projet.
            </p>
          </div>
        </div>

        {saveStatus && (
          <div className="px-3 py-1 rounded bg-cyan-950/80 border border-cyan-700 text-cyan-300 text-[11px] flex items-center gap-1.5 animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

      {/* 3 Pillars: Audio Recorder, Video Recorder, Session Vault */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Pillar 1: Audio WAV Recorder */}
        <div className="bg-[#060c18] border border-[#14233c] rounded-lg p-3 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <FileAudio className="w-4 h-4 text-cyan-400" />
              <span>ENREGISTREUR AUDIO</span>
            </span>
            <span className="text-[10px] text-cyan-400">WAV 48kHz / 24-bit</span>
          </div>

          <div className="text-center py-2">
            <div className="text-2xl font-bold text-cyan-300 font-mono">
              {audioDuration.toFixed(1)} <span className="text-xs text-slate-500">sec</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isAudioRecording ? (
                <span className="text-rose-400 flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                  ENREGISTREMENT STÉRÉO ACTIF
                </span>
              ) : (
                'Canaux X (Gauche) et Y (Droit) prêts'
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAudioRecording ? (
              <button
                onClick={handleStartAudioRecord}
                className="flex-1 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Disc className="w-3.5 h-3.5" />
                <span>ENREGISTRER AUDIO</span>
              </button>
            ) : (
              <button
                onClick={handleStopAudioRecord}
                className="flex-1 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 shadow-sm animate-pulse"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>ARRÊTER</span>
              </button>
            )}

            {audioWavBlob && !isAudioRecording && (
              <button
                onClick={handleDownloadAudioWav}
                title="Télécharger WAV Stéréo"
                className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>WAV</span>
              </button>
            )}
          </div>
        </div>

        {/* Pillar 2: Synchronized Video Recorder */}
        <div className="bg-[#060c18] border border-[#14233c] rounded-lg p-3 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <FileVideo className="w-4 h-4 text-purple-400" />
              <span>ENREGISTREUR VIDÉO</span>
            </span>
            <span className="text-[10px] text-purple-400">WebM 60 FPS + Audio</span>
          </div>

          <div className="text-center py-2">
            <div className="text-2xl font-bold text-purple-300 font-mono">
              {videoDuration.toFixed(1)} <span className="text-xs text-slate-500">sec</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isVideoRecording ? (
                <span className="text-rose-400 flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                  CAPTURE SCOPE + SON ACTIF
                </span>
              ) : (
                'Flux visuel et audio synchronisés'
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isVideoRecording ? (
              <button
                onClick={handleStartVideoRecord}
                className="flex-1 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Video className="w-3.5 h-3.5" />
                <span>ENREGISTRER VIDÉO</span>
              </button>
            ) : (
              <button
                onClick={handleStopVideoRecord}
                className="flex-1 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 shadow-sm animate-pulse"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>ARRÊTER</span>
              </button>
            )}

            {videoBlob && !isVideoRecording && (
              <button
                onClick={handleDownloadVideo}
                title="Télécharger Vidéo WebM"
                className="px-3 py-1.5 rounded bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>VIDÉO</span>
              </button>
            )}
          </div>
        </div>

        {/* Pillar 3: Complete Session Manager */}
        <div className="bg-[#060c18] border border-[#14233c] rounded-lg p-3 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Save className="w-4 h-4 text-indigo-400" />
              <span>GESTION DE SESSION</span>
            </span>
            <span className="text-[10px] text-indigo-400">JSON Projet</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Sauvegardez l'ensemble de vos paramètres de générateurs, segmentations, timeline et affichage pour les reprendre à tout moment.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveSession}
              className="flex-1 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>SAUVEGARDER</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.genesis.json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleLoadSession(e.target.files[0]);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>CHARGER</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
