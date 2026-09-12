"""
GENESIS VECTOR SCOPE - Signal Generator Module
Génération mathématique de signaux analogiques virtuels pour canaux X et Y
"""

import numpy as np

class GeneratorChannel:
    def __init__(self, name: str, default_freq: float = 220.0, default_phase: float = 0.0):
        self.name = name
        self.waveform = "sinus"  # sinus, cosinus, triangle, carre, dent de scie, rose, spiral
        self.frequency = default_freq
        self.amplitude = 0.8
        self.phase_deg = default_phase
        self.offset = 0.0
        self.invert = False
        self.k_petals = 4
        self.spiral_rate = 0.2

    def set_waveform(self, wf: str):
        self.waveform = wf.lower()

    def set_frequency(self, freq: float):
        self.frequency = max(0.1, float(freq))

    def set_amplitude(self, amp: float):
        self.amplitude = max(0.0, min(1.0, float(amp)))

    def set_phase(self, deg: float):
        self.phase_deg = float(deg) % 360.0

    def generate_block(self, time_array: np.ndarray) -> np.ndarray:
        phase_rad = np.radians(self.phase_deg)
        wt = 2.0 * np.pi * self.frequency * time_array + phase_rad

        if self.waveform in ["sinus", "sine"]:
            sig = np.sin(wt)
        elif self.waveform in ["cosinus", "cosine"]:
            sig = np.cos(wt)
        elif self.waveform in ["triangle"]:
            sig = 2.0 * np.abs(2.0 * (wt / (2.0 * np.pi) - np.floor(wt / (2.0 * np.pi) + 0.5))) - 1.0
        elif self.waveform in ["carre", "square"]:
            sig = np.sign(np.sin(wt))
        elif self.waveform in ["dent de scie", "sawtooth"]:
            sig = 2.0 * (wt / (2.0 * np.pi) - np.floor(wt / (2.0 * np.pi) + 0.5))
        elif self.waveform in ["rose"]:
            # Mathematical rose r = cos(k * wt)
            r = np.cos(self.k_petals * wt)
            sig = r * np.cos(wt) if "X" in self.name else r * np.sin(wt)
        elif self.waveform in ["spiral"]:
            r = np.mod(wt, 2.0 * np.pi) / (2.0 * np.pi)
            sig = r * np.cos(wt) if "X" in self.name else r * np.sin(wt)
        else:
            sig = np.sin(wt)

        result = sig * self.amplitude + self.offset
        if self.invert:
            result = -result
        return np.clip(result, -1.0, 1.0)
