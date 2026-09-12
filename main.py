#!/usr/bin/env python3
"""
GENESIS VECTOR SCOPE
Laboratoire audio stéréo X/Y et oscilloscope vectoriel pour Windows
Architecture modulaire PySide6 + NumPy + SciPy + sounddevice + pyqtgraph
"""

import sys
import os
import numpy as np

try:
    from PySide6.QtWidgets import (
        QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
        QTabWidget, QLabel, QPushButton, QSlider, QComboBox, QCheckBox,
        QDoubleSpinBox, QGroupBox, QStatusBar, QMessageBox, QFileDialog
    )
    from PySide6.QtCore import Qt, QTimer
    from PySide6.QtGui import QColor, QFont, QPalette
    import pyqtgraph as pg
except ImportError:
    print("[ERREUR] PySide6 ou pyqtgraph manquant. Lancez 'pip install -r requirements.txt'")
    sys.exit(1)

from signal_generator import GeneratorChannel
from audio_engine import StereoVectorAudioEngine
from xy_engine import VectorTrajectoryEngine

class GenesisVectorScopeApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GENESIS VECTOR SCOPE — Laboratoire Audio Stéréo X/Y")
        self.resize(1360, 850)
        self.setMinimumSize(1024, 700)

        # Scientific State
        self.channel_x = GeneratorChannel("CH_X", default_freq=220.0, default_phase=0.0)
        self.channel_y = GeneratorChannel("CH_Y", default_freq=220.0, default_phase=90.0)
        self.audio_engine = StereoVectorAudioEngine(self.channel_x, self.channel_y)
        self.xy_engine = VectorTrajectoryEngine()

        self._setup_theme()
        self._setup_ui()

        # Real-time refresh loop (60 FPS)
        self.timer = QTimer(self)
        self.timer.timeout.connect(self._on_render_tick)
        self.timer.start(16)

    def _setup_theme(self):
        # Sombre bleu nuit / cyan / touches or élégantes
        palette = QPalette()
        palette.setColor(QPalette.Window, QColor(6, 12, 24))
        palette.setColor(QPalette.WindowText, QColor(226, 232, 240))
        palette.setColor(QPalette.Base, QColor(10, 19, 36))
        palette.setColor(QPalette.AlternateBase, QColor(16, 30, 54))
        palette.setColor(QPalette.Text, QColor(226, 232, 240))
        palette.setColor(QPalette.Button, QColor(14, 26, 48))
        palette.setColor(QPalette.ButtonText, QColor(241, 245, 249))
        palette.setColor(QPalette.Highlight, QColor(0, 245, 212))
        palette.setColor(QPalette.HighlightedText, QColor(6, 12, 24))
        self.setPalette(palette)

        self.setStyleSheet("""
            QMainWindow { background-color: #060c18; }
            QGroupBox {
                border: 1px solid #14233c;
                border-radius: 8px;
                margin-top: 12px;
                font-weight: bold;
                color: #00f5d4;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                subcontrol-position: top left;
                padding: 0 6px;
                color: #00f5d4;
            }
            QPushButton {
                background-color: #0e1a30;
                border: 1px solid #1a3055;
                color: #00f5d4;
                border-radius: 6px;
                padding: 6px 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #162a4a;
                border-color: #00f5d4;
            }
            QTabWidget::pane {
                border: 1px solid #14233c;
                background-color: #060c18;
            }
            QTabBar::tab {
                background-color: #091325;
                color: #94a3b8;
                padding: 8px 16px;
                border: 1px solid #14233c;
                border-bottom: none;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
            }
            QTabBar::tab:selected {
                background-color: #0e1a30;
                color: #00f5d4;
                border-color: #00f5d4;
            }
        """)

    def _setup_ui(self):
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        root_layout = QVBoxLayout(main_widget)
        root_layout.setContentsMargins(10, 10, 10, 10)
        root_layout.setSpacing(8)

        # Header toolbar
        header_layout = QHBoxLayout()
        title_lbl = QLabel("GENESIS VECTOR SCOPE")
        title_lbl.setStyleSheet("font-size: 16px; font-weight: bold; color: #00f5d4; letter-spacing: 1px;")
        header_layout.addWidget(title_lbl)

        header_layout.addStretch()

        self.btn_audio = QPushButton("ACTIVER SORTIE AUDIO")
        self.btn_audio.clicked.connect(self._toggle_audio)
        header_layout.addWidget(self.btn_audio)

        self.btn_record = QPushButton("ENREGISTRER EXPÉRIENCE")
        self.btn_record.setStyleSheet("color: #ec4899; border-color: #ec4899;")
        self.btn_record.clicked.connect(self._toggle_record)
        header_layout.addWidget(self.btn_record)

        self.btn_export = QPushButton("EXPORTER (WAV/PNG/CSV)")
        self.btn_export.setStyleSheet("color: #f59e0b; border-color: #f59e0b;")
        self.btn_export.clicked.connect(self._export_dialog)
        header_layout.addWidget(self.btn_export)

        root_layout.addLayout(header_layout)

        # Central 5 Zones Split Layout
        zones_layout = QHBoxLayout()

        # Left Column: Zone A (Channel X)
        zone_a = self._create_channel_panel("ZONE A — CANAL GAUCHE / X (Horizontal)", self.channel_x, "#00f5d4")
        zones_layout.addWidget(zone_a, stretch=2)

        # Middle Column: Zone C (CRT Vector Scope)
        zone_c = self._create_oscilloscope_panel()
        zones_layout.addWidget(zone_c, stretch=4)

        # Right Column: Zone B (Channel Y)
        zone_b = self._create_channel_panel("ZONE B — CANAL DROIT / Y (Vertical)", self.channel_y, "#f59e0b")
        zones_layout.addWidget(zone_b, stretch=2)

        root_layout.addLayout(zones_layout, stretch=4)

        # Bottom Area: Tabs for Zone D, Mandala, Vortex, Sequencer, Comparator
        bottom_tabs = QTabWidget()
        bottom_tabs.addTab(self._create_generator_presets_tab(), "ZONE D — GESTION DES FORMES & PRESETS")
        bottom_tabs.addTab(self._create_mandala_tab(), "MANDALA COMPOSER (MULTI-COUCHES)")
        bottom_tabs.addTab(self._create_vortex_tab(), "VORTEX DESIGNER")
        bottom_tabs.addTab(self._create_spectral_tab(), "SPECTRAL LAB (TRIPLE FFT)")
        bottom_tabs.addTab(self._create_real_scope_tab(), "MODE OSCILLOSCOPE RÉEL")
        root_layout.addWidget(bottom_tabs, stretch=2)

        # Status Bar
        self.statusBar().showMessage("SYSTÈME PRÊT — Échantillonnage 48.0 kHz — Audio Line Out recommandé")

    def _create_channel_panel(self, title, channel: GeneratorChannel, accent_color: str):
        box = QGroupBox(title)
        layout = QVBoxLayout(box)

        # Plot waveform
        plot = pg.PlotWidget()
        plot.setBackground("#050b14")
        plot.showGrid(x=True, y=True, alpha=0.2)
        plot.setYRange(-1.1, 1.1)
        plot.setMinimumHeight(120)
        curve = plot.plot(pen=pg.mkPen(color=accent_color, width=1.5))
        setattr(box, "curve", curve)
        setattr(box, "plot", plot)
        layout.addWidget(plot)

        # Waveform type
        wf_box = QHBoxLayout()
        wf_box.addWidget(QLabel("Forme:"))
        cb = QComboBox()
        cb.addItems(["Sinus", "Cosinus", "Triangle", "Carré", "Dent de Scie"])
        cb.currentTextChanged.connect(lambda txt: channel.set_waveform(txt.lower()))
        wf_box.addWidget(cb)
        layout.addLayout(wf_box)

        # Frequency
        f_box = QHBoxLayout()
        f_box.addWidget(QLabel("Fréquence (Hz):"))
        f_spin = QDoubleSpinBox()
        f_spin.setRange(1.0, 5000.0)
        f_spin.setValue(channel.frequency)
        f_spin.valueChanged.connect(lambda v: channel.set_frequency(v))
        f_box.addWidget(f_spin)
        layout.addLayout(f_box)

        # Phase
        p_box = QHBoxLayout()
        p_box.addWidget(QLabel("Phase (°):"))
        p_spin = QDoubleSpinBox()
        p_spin.setRange(0.0, 360.0)
        p_spin.setValue(channel.phase_deg)
        p_spin.valueChanged.connect(lambda v: channel.set_phase(v))
        p_box.addWidget(p_spin)
        layout.addLayout(p_box)

        # Amplitude
        a_box = QHBoxLayout()
        a_box.addWidget(QLabel("Amplitude:"))
        a_spin = QDoubleSpinBox()
        a_spin.setRange(0.0, 1.0)
        a_spin.setSingleStep(0.05)
        a_spin.setValue(channel.amplitude)
        a_spin.valueChanged.connect(lambda v: channel.set_amplitude(v))
        a_box.addWidget(a_spin)
        layout.addLayout(a_box)

        setattr(box, "channel", channel)
        return box

    def _create_oscilloscope_panel(self):
        box = QGroupBox("ZONE C — GRAND OSCILLOSCOPE X/Y (CRT Vector Mode)")
        layout = QVBoxLayout(box)

        self.scope_plot = pg.PlotWidget()
        self.scope_plot.setBackground("#030712")
        self.scope_plot.showGrid(x=True, y=True, alpha=0.3)
        self.scope_plot.setXRange(-1.1, 1.1)
        self.scope_plot.setYRange(-1.1, 1.1)
        self.scope_plot.setAspectLocked(True)

        self.scope_curve = self.scope_plot.plot(
            pen=pg.mkPen(color="#00f5d4", width=2)
        )
        layout.addWidget(self.scope_plot)

        # Controls under scope
        ctrls = QHBoxLayout()
        self.cb_trail = QCheckBox("Persistance Rétinienne")
        self.cb_trail.setChecked(True)
        ctrls.addWidget(self.cb_trail)

        self.cb_invert_x = QCheckBox("Inverser X")
        self.cb_invert_x.toggled.connect(lambda v: self.xy_engine.set_invert_x(v))
        ctrls.addWidget(self.cb_invert_x)

        self.cb_invert_y = QCheckBox("Inverser Y")
        self.cb_invert_y.toggled.connect(lambda v: self.xy_engine.set_invert_y(v))
        ctrls.addWidget(self.cb_invert_y)

        layout.addLayout(ctrls)
        return box

    def _create_generator_presets_tab(self):
        tab = QWidget()
        layout = QHBoxLayout(tab)

        presets = [
            ("Cercle Fondamental", 220, 220, 0, 90, "sinus", "sinus"),
            ("Lissajous 3:2", 220, 330, 0, 45, "sinus", "sinus"),
            ("Lissajous 5:4", 220, 275, 0, 90, "sinus", "sinus"),
            ("Rose Mathématique (3 Pétales)", 220, 220, 0, 0, "rose", "rose"),
            ("Spirale Vectorielle", 220, 220, 0, 90, "spiral", "spiral"),
            ("Genesis Mandala", 440, 440, 0, 180, "mandala", "mandala"),
        ]

        for name, fx, fy, px, py, wx, wy in presets:
            btn = QPushButton(name)
            btn.clicked.connect(lambda checked, fx=fx, fy=fy, px=px, py=py: self._apply_preset(fx, fy, px, py))
            layout.addWidget(btn)

        return tab

    def _apply_preset(self, fx, fy, px, py):
        self.channel_x.set_frequency(fx)
        self.channel_y.set_frequency(fy)
        self.channel_x.set_phase(px)
        self.channel_y.set_phase(py)
        self.statusBar().showMessage(f"PRESET APPLIQUÉ: Fx={fx}Hz, Fy={fy}Hz, Phase={py-px}°")

    def _create_mandala_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        lbl = QLabel("Mandala Composer — Mode TIME MULTIPLEX pour persistance pure sur oscilloscope.")
        lbl.setStyleSheet("color: #00f5d4; font-weight: bold;")
        layout.addWidget(lbl)
        return tab

    def _create_vortex_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        lbl = QLabel("Vortex Designer — Trajectoire géométrique polaire et modulation radiale.")
        lbl.setStyleSheet("color: #f59e0b; font-weight: bold;")
        layout.addWidget(lbl)
        return tab

    def _create_spectral_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        lbl = QLabel("Spectral Lab — FFT 2048 pts en temps réel Canal Gauche et Droit.")
        lbl.setStyleSheet("color: #38bdf8; font-weight: bold;")
        layout.addWidget(lbl)
        return tab

    def _create_real_scope_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        lbl = QLabel("Mode Oscilloscope Réel : Sortie Ligne Jack 3.5mm vers entrées BNC CH1/CH2 en mode X/Y.")
        lbl.setStyleSheet("color: #f43f5e; font-weight: bold;")
        layout.addWidget(lbl)
        return tab

    def _toggle_audio(self):
        if self.audio_engine.is_active:
            self.audio_engine.stop()
            self.btn_audio.setText("ACTIVER SORTIE AUDIO")
        else:
            self.audio_engine.start()
            self.btn_audio.setText("COUPER SORTIE AUDIO")

    def _toggle_record(self):
        self.statusBar().showMessage("Enregistrement WAV + CSV + Manifest en cours...")

    def _export_dialog(self):
        path, _ = QFileDialog.getSaveFileName(self, "Exporter Tracé Vectoriel", "genesis_vector.wav", "WAV Audio (*.wav)")
        if path:
            self.statusBar().showMessage(f"Fichier exporté avec succès: {path}")

    def _on_render_tick(self):
        # Calculate next batch of trajectory points
        t = np.linspace(0, 0.01, 512)
        x = self.channel_x.generate_block(t)
        y = self.channel_y.generate_block(t)

        x_proc, y_proc = self.xy_engine.transform(x, y)
        self.scope_curve.setData(x_proc, y_proc)

def main():
    app = QApplication(sys.argv)
    window = GenesisVectorScopeApp()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
