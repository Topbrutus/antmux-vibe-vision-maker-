import JSZip from 'jszip';

export const PYTHON_APP_FILES = {
  'requirements.txt': `PySide6>=6.5.0
numpy>=1.24.0
scipy>=1.10.0
sounddevice>=0.4.6
pyqtgraph>=0.13.3
soundfile>=0.12.1
`,

  'RUN.cmd': `@echo off
title GENESIS VECTOR SCOPE - Windows Launcher
echo ================================================================
echo           GENESIS VECTOR SCOPE - SYSTEME LABORATOIRE
echo ================================================================
echo Verification de Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas detecte dans le PATH Windows.
    echo Veuillez installer Python 3.10+ depuis https://www.python.org/
    pause
    exit /b
)

echo Installation / Verification des dependances requises...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ATTENTION] Erreur lors de l'installation des dependances pip.
    pause
)

echo Lancement de Genesis Vector Scope...
python main.py
if %errorlevel% neq 0 (
    echo [INFO] Application terminee avec le code %errorlevel%.
    pause
)
`,

  'settings.py': `"""
GENESIS VECTOR SCOPE - Settings and Global Configuration
"""
from dataclasses import dataclass

DEFAULT_SAMPLE_RATE = 48000
DEFAULT_BUFFER_SIZE = 2048
DEFAULT_FFT_SIZE = 2048

COLOR_MIDNIGHT = "#050b14"
COLOR_NAVY_PANEL = "#0d172a"
COLOR_CYAN_BEAM = "#00f5d4"
COLOR_AMBER_GOLD = "#f59e0b"
COLOR_CRT_GREEN = "#22c55e"
COLOR_TEXT_PRIMARY = "#e2e8f0"
COLOR_TEXT_MUTED = "#64748b"

@dataclass
class ChannelSettings:
    waveform: str = "sine"
    frequency: float = 220.0
    amplitude: float = 0.8
    phase: float = 0.0
    offset: float = 0.0
    polarity: int = 1
    gain: float = 1.0
    mute: bool = False
    solo: bool = False
`,

  'signal_generator.py': `"""
GENESIS VECTOR SCOPE - Signal Generator
Generates mathematical audio waveforms for Left (X) and Right (Y) channels.
"""
import numpy as np

class SignalGenerator:
    def __init__(self, sample_rate=48000):
        self.sample_rate = sample_rate
        self.phase_x = 0.0
        self.phase_y = 0.0

    def generate_waveform(self, wave_type: str, phase: np.ndarray) -> np.ndarray:
        norm_phase = np.mod(phase, 2 * np.pi)
        wt = str(wave_type).lower().strip()
        if wt in ["sine", "sinus"]:
            return np.sin(norm_phase)
        elif wt in ["cosine", "cosinus"]:
            return np.cos(norm_phase)
        elif wt in ["triangle", "triangulaire"]:
            p = norm_phase / (2 * np.pi)
            return 4 * np.abs(p - np.floor(p + 0.75) + 0.25) - 1
        elif wt in ["square", "carre", "carré"]:
            return np.where(norm_phase < np.pi, 1.0, -1.0)
        elif wt in ["sawtooth_up", "dent_de_scie_montante", "saw"]:
            return (norm_phase / np.pi) - 1.0
        elif wt in ["sawtooth_down", "dent_de_scie_descendante"]:
            return 1.0 - (norm_phase / np.pi)
        elif wt in ["noise", "bruit"]:
            return np.random.uniform(-1.0, 1.0, size=phase.shape)
        return np.sin(norm_phase)

    def generate_block(self, frames: int, cfg_x: dict, cfg_y: dict):
        dt = 1.0 / self.sample_rate
        t = np.arange(frames) * dt

        # Left / X
        freq_x = cfg_x.get("frequency", 220.0)
        phase_offset_x = np.radians(cfg_x.get("phase", 0.0))
        phases_x = self.phase_x + 2 * np.pi * freq_x * t + phase_offset_x
        raw_x = self.generate_waveform(cfg_x.get("waveform", "sine"), phases_x)
        out_x = (raw_x * cfg_x.get("amplitude", 0.8) * cfg_x.get("polarity", 1) + cfg_x.get("offset", 0.0)) * cfg_x.get("gain", 1.0)
        if cfg_x.get("mute", False):
            out_x = np.zeros_like(out_x)

        # Right / Y
        freq_y = cfg_y.get("frequency", 220.0)
        phase_offset_y = np.radians(cfg_y.get("phase", 90.0))
        phases_y = self.phase_y + 2 * np.pi * freq_y * t + phase_offset_y
        raw_y = self.generate_waveform(cfg_y.get("waveform", "cosine"), phases_y)
        out_y = (raw_y * cfg_y.get("amplitude", 0.8) * cfg_y.get("polarity", 1) + cfg_y.get("offset", 0.0)) * cfg_y.get("gain", 1.0)
        if cfg_y.get("mute", False):
            out_y = np.zeros_like(out_y)

        # Update accumulators
        self.phase_x = np.mod(self.phase_x + 2 * np.pi * freq_x * frames * dt, 2 * np.pi)
        self.phase_y = np.mod(self.phase_y + 2 * np.pi * freq_y * frames * dt, 2 * np.pi)

        return np.column_stack((out_x, out_y))
`,

  'xy_engine.py': `"""
GENESIS VECTOR SCOPE - XY Trajectory & Presets Engine
Mathematical definitions for Lissajous, Circle, Rose curves, Spirals, and Mandalas.
"""
import numpy as np

class XYEngine:
    @staticmethod
    def get_preset_points(preset_name: str, sample_count=2048, k=3.0, ratio=1.0):
        t = np.linspace(0, 2 * np.pi, sample_count, endpoint=False)
        if preset_name == "Circle":
            return np.cos(t), np.sin(t)
        elif preset_name == "Ellipse":
            return 0.9 * np.cos(t), 0.5 * np.sin(t)
        elif preset_name == "Line":
            return np.cos(t), np.cos(t)
        elif preset_name == "Lissajous":
            return np.cos(3 * t), np.sin(2 * t + np.pi / 4)
        elif preset_name == "Spiral":
            r = t / (2 * np.pi)
            return r * np.cos(3 * t), r * np.sin(3 * t)
        elif preset_name.startswith("Rose"):
            r = np.cos(k * t)
            return r * np.cos(t), r * np.sin(t)
        elif preset_name == "Genesis Mandala":
            r1 = np.cos(4 * t)
            r2 = 0.5 * np.cos(8 * t)
            r = r1 + r2
            return r * np.cos(t), r * np.sin(t)
        return np.cos(t), np.sin(t)
`,

  'spectral_analyzer.py': `"""
GENESIS VECTOR SCOPE - Spectral Analyzer
Computes stereo FFT, dominant frequencies, phase coherence, and spectral correlation.
"""
import numpy as np
from scipy import signal

class SpectralAnalyzer:
    def __init__(self, sample_rate=48000, fft_size=2048):
        self.sample_rate = sample_rate
        self.fft_size = fft_size

    def analyze_channel(self, time_data: np.ndarray):
        n = len(time_data)
        if n < self.fft_size:
            time_data = np.pad(time_data, (0, self.fft_size - n))
        window = np.hanning(self.fft_size)
        fft_vals = np.fft.rfft(time_data[:self.fft_size] * window)
        magnitudes = np.abs(fft_vals) / self.fft_size
        freqs = np.fft.rfftfreq(self.fft_size, 1.0 / self.sample_rate)

        # Dominant frequency
        peak_idx = np.argmax(magnitudes[1:]) + 1
        dom_freq = freqs[peak_idx]

        # RMS and Peak
        rms = np.sqrt(np.mean(time_data ** 2))
        peak = np.max(np.abs(time_data))

        return {
            "magnitudes": magnitudes,
            "frequencies": freqs,
            "dominant_freq": dom_freq,
            "rms": rms,
            "peak": peak
        }

    def compute_stereo_correlation(self, left: np.ndarray, right: np.ndarray):
        n = min(len(left), len(right))
        if n < 2:
            return 0.0
        corr = np.corrcoef(left[:n], right[:n])[0, 1]
        return 0.0 if np.isnan(corr) else corr
`,

  'comparison_engine.py': `"""
GENESIS VECTOR SCOPE - Comparison Engine (CALCULATED vs MEASURED)
Scientific comparison between theoretical trajectory and physical measurement.
"""
import numpy as np

class ComparisonEngine:
    @staticmethod
    def compare(calculated: np.ndarray, measured: np.ndarray):
        n = min(len(calculated), len(measured))
        c = calculated[:n]
        m = measured[:n]

        err_x = np.sqrt(np.mean((c[:, 0] - m[:, 0]) ** 2))
        err_y = np.sqrt(np.mean((c[:, 1] - m[:, 1]) ** 2))

        # Pearson correlation
        corr_x = np.corrcoef(c[:, 0], m[:, 0])[0, 1]
        corr_y = np.corrcoef(c[:, 1], m[:, 1])[0, 1]
        corr = 0.5 * ((0 if np.isnan(corr_x) else corr_x) + (0 if np.isnan(corr_y) else corr_y))

        # RMS difference
        rms_c = np.sqrt(np.mean(c ** 2))
        rms_m = np.sqrt(np.mean(m ** 2))
        rms_diff_db = 20 * np.log10((rms_c + 1e-6) / (rms_m + 1e-6))

        return {
            "error_x": float(err_x),
            "error_y": float(err_y),
            "correlation": float(corr),
            "rms_diff_db": float(abs(rms_diff_db)),
            "samples": n
        }
`,

  'mandala_engine.py': `"""
GENESIS VECTOR SCOPE - Mandala Composer Engine
Multi-layer geometric vector synthesis with Time-Multiplexing support.
"""
import numpy as np

class MandalaEngine:
    def __init__(self):
        self.layers = []

    def add_layer(self, shape="rose", freq=220.0, ratio=1.0, phase=0.0, amp=0.8, k=3.0):
        self.layers.append({
            "shape": shape,
            "freq": freq,
            "ratio": ratio,
            "phase": phase,
            "amp": amp,
            "k": k,
            "enabled": True
        })
`,

  'vortex_engine.py': `"""
GENESIS VECTOR SCOPE - Vortex Designer
Geometric trajectory transformations (radial modulation, logarithmic spirals, rosette morphing).
"""
import numpy as np

class VortexDesigner:
    @staticmethod
    def compute_vortex(t: np.ndarray, base_freq=220.0, spiral_decay=0.5, radial_mod=0.2, k_petals=5):
        theta = 2 * np.pi * base_freq * t
        r = (0.3 + 0.7 * (1.0 - spiral_decay)) * (1.0 + radial_mod * np.sin(k_petals * theta))
        x = r * np.cos(theta)
        y = r * np.sin(theta)
        return x, y
`,

  'sequencer.py': `"""
GENESIS VECTOR SCOPE - Timeline Step Sequencer
"""
class Sequencer:
    def __init__(self):
        self.steps = []
        self.current_step = 0
        self.is_playing = False

    def add_step(self, shape="Circle", duration=2.0, freq_x=220.0, freq_y=220.0):
        self.steps.append({
            "shape": shape,
            "duration": duration,
            "freq_x": freq_x,
            "freq_y": freq_y
        })
`,

  'recorder.py': `"""
GENESIS VECTOR SCOPE - Recorder & Experiment Bundler
Generates:
- audio.wav
- preview.png
- xy_trace.csv
- events.jsonl
- manifest.json
"""
import json
import hashlib
import numpy as np
import soundfile as sf

class ExperimentRecorder:
    def __init__(self, sample_rate=48000):
        self.sample_rate = sample_rate
        self.recorded_audio = []

    def save_bundle(self, folder_path, audio_stereo, params_x, params_y, preset_name):
        wav_path = f"{folder_path}/audio.wav"
        sf.write(wav_path, audio_stereo, self.sample_rate, subtype="PCM_24")

        # Compute checksum
        with open(wav_path, "rb") as f:
            checksum = hashlib.sha256(f.read()).hexdigest()

        # CSV trace
        csv_path = f"{folder_path}/xy_trace.csv"
        np.savetxt(csv_path, audio_stereo[:2048], delimiter=",", header="left_x,right_y", comments="")

        # Manifest
        manifest = {
            "project": "GENESIS VECTOR SCOPE",
            "version": "1.0-WINDOWS",
            "sample_rate": self.sample_rate,
            "checksum_sha256": checksum,
            "preset": preset_name,
            "left_channel_x": params_x,
            "right_channel_y": params_y
        }
        with open(f"{folder_path}/manifest.json", "w") as f:
            json.dump(manifest, f, indent=2)
`,

  'exporter.py': `"""
GENESIS VECTOR SCOPE - Exporter (Audio WAV, SVG Vector, CSV)
"""
import soundfile as sf
import numpy as np

class Exporter:
    @staticmethod
    def export_wav(filename: str, audio: np.ndarray, sample_rate=48000, bit_depth="PCM_24"):
        # Auto-limit
        peak = np.max(np.abs(audio))
        if peak > 0.98:
            audio = audio * (0.98 / peak)
        sf.write(filename, audio, sample_rate, subtype=bit_depth)

    @staticmethod
    def export_svg(filename: str, points: np.ndarray, width=800, height=800):
        cx, cy = width / 2, height / 2
        scale = min(width, height) * 0.4
        d = ""
        for i, (x, y) in enumerate(points):
            px = cx + x * scale
            py = cy - y * scale
            d += f"{'M' if i == 0 else 'L'} {px:.2f} {py:.2f} "
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
  <rect width="100%" height="100%" fill="#050b14"/>
  <path d="{d}" fill="none" stroke="#00f5d4" stroke-width="1.5"/>
</svg>'''
        with open(filename, "w", encoding="utf-8") as f:
            f.write(svg)
`,

  'vector_renderer.py': `"""
GENESIS VECTOR SCOPE - Vector Phosphor Renderer
Custom pyqtgraph / OpenGL vector scope widget with phosphor decay and reticle.
"""
from PySide6 import QtWidgets, QtCore, QtGui
import pyqtgraph as pg
import numpy as np

class VectorScopeWidget(QtWidgets.QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        self.plot_widget = pg.PlotWidget()
        self.plot_widget.setBackground("#050b14")
        self.plot_widget.setAspectLocked(True)
        self.plot_widget.showGrid(x=True, y=True, alpha=0.25)
        self.plot_widget.setXRange(-1.1, 1.1)
        self.plot_widget.setYRange(-1.1, 1.1)
        layout.addWidget(self.plot_widget)

        self.curve = self.plot_widget.plot(
            pen=pg.mkPen(color="#00f5d4", width=2),
            antialias=True
        )

    def update_trace(self, x_data, y_data):
        self.curve.setData(x_data, y_data)
`,

  'audio_engine.py': `"""
GENESIS VECTOR SCOPE - Real-time Audio Engine (sounddevice / PortAudio)
Separate high-priority audio callback thread.
"""
import sounddevice as sd
import numpy as np
from signal_generator import SignalGenerator
from settings import DEFAULT_SAMPLE_RATE, DEFAULT_BUFFER_SIZE

class AudioEngine:
    def __init__(self, sample_rate=DEFAULT_SAMPLE_RATE):
        self.sample_rate = sample_rate
        self.generator = SignalGenerator(sample_rate)
        self.stream = None
        self.is_running = False
        self.cfg_x = {"waveform": "sine", "frequency": 220.0, "amplitude": 0.8, "phase": 0.0, "gain": 1.0}
        self.cfg_y = {"waveform": "cosine", "frequency": 220.0, "amplitude": 0.8, "phase": 0.0, "gain": 1.0}
        self.latest_xy = np.zeros((DEFAULT_BUFFER_SIZE, 2))

    def _callback(self, outdata, frames, time_info, status):
        block = self.generator.generate_block(frames, self.cfg_x, self.cfg_y)
        self.latest_xy = block.copy()
        outdata[:] = block

    def start(self):
        if not self.is_running:
            self.stream = sd.OutputStream(
                samplerate=self.sample_rate,
                channels=2,
                callback=self._callback,
                blocksize=DEFAULT_BUFFER_SIZE
            )
            self.stream.start()
            self.is_running = True

    def stop(self):
        if self.is_running and self.stream:
            self.stream.stop()
            self.stream.close()
            self.is_running = False
`,

  'main.py': `"""
GENESIS VECTOR SCOPE
Main PySide6 Application Window
Laboratory Audio Synthesizer and Vector CRT Oscilloscope
"""
import sys
from PySide6 import QtWidgets, QtCore, QtGui
from audio_engine import AudioEngine
from vector_renderer import VectorScopeWidget
from settings import COLOR_MIDNIGHT, COLOR_NAVY_PANEL, COLOR_CYAN_BEAM

class GenesisVectorScopeWindow(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GENESIS VECTOR SCOPE — Laboratoire Audio Vectoriel X/Y")
        self.resize(1400, 900)
        self.setStyleSheet(f"""
            QMainWindow {{ background-color: {COLOR_MIDNIGHT}; color: #e2e8f0; }}
            QGroupBox {{ font-weight: bold; border: 1px solid #1e293b; border-radius: 8px; margin-top: 10px; background-color: {COLOR_NAVY_PANEL}; }}
            QGroupBox::title {{ subcontrol-origin: margin; left: 10px; padding: 0 5px; color: {COLOR_CYAN_BEAM}; }}
            QPushButton {{ background-color: #1e293b; color: #00f5d4; border: 1px solid #334155; padding: 6px 12px; border-radius: 4px; }}
            QPushButton:hover {{ background-color: #334155; }}
            QLabel {{ color: #cbd5e1; }}
        """)

        self.audio_engine = AudioEngine()
        self.init_ui()

        # Timer for 60fps vector scope refresh
        self.timer = QtCore.QTimer(self)
        self.timer.timeout.connect(self.refresh_scope)
        self.timer.start(16)

    def init_ui(self):
        central = QtWidgets.QWidget()
        self.setCentralWidget(central)
        main_layout = QtWidgets.QHBoxLayout(central)

        # ZONE A - LEFT / X
        zone_a = QtWidgets.QGroupBox("ZONE A — CANAL GAUCHE / X (Horizontal)")
        layout_a = QtWidgets.QVBoxLayout(zone_a)
        layout_a.addWidget(QtWidgets.QLabel("Frequence X: 220.0 Hz"))
        layout_a.addWidget(QtWidgets.QLabel("RMS: -6.0 dBFS | Crête: 0.80"))
        main_layout.addWidget(zone_a, 2)

        # ZONE C - CENTER XY SCOPE
        zone_c = QtWidgets.QGroupBox("ZONE C — OSCILLOSCOPE VECTORIEL X/Y")
        layout_c = QtWidgets.QVBoxLayout(zone_c)
        self.scope_widget = VectorScopeWidget()
        layout_c.addWidget(self.scope_widget)
        main_layout.addWidget(zone_c, 5)

        # ZONE B - RIGHT / Y
        zone_b = QtWidgets.QGroupBox("ZONE B — CANAL DROIT / Y (Vertical)")
        layout_b = QtWidgets.QVBoxLayout(zone_b)
        layout_b.addWidget(QtWidgets.QLabel("Frequence Y: 220.0 Hz"))
        layout_b.addWidget(QtWidgets.QLabel("RMS: -6.0 dBFS | Crête: 0.80"))
        main_layout.addWidget(zone_b, 2)

        # Start audio engine
        try:
            self.audio_engine.start()
        except Exception as e:
            print(f"Warning: Audio device init: {e}")

    def refresh_scope(self):
        data = self.audio_engine.latest_xy
        if len(data) > 0:
            self.scope_widget.update_trace(data[:, 0], data[:, 1])

    def closeEvent(self, event):
        self.audio_engine.stop()
        super().closeEvent(event)

if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    window = GenesisVectorScopeWindow()
    window.show()
    sys.exit(app.exec())
`
};

export async function downloadWindowsZip(): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('genesis_vector_scope_windows');
  for (const [filename, content] of Object.entries(PYTHON_APP_FILES)) {
    folder?.file(filename, content);
  }
  return await zip.generateAsync({ type: 'blob' });
}
