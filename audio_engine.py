"""
GENESIS VECTOR SCOPE - Audio Engine Module
Sortie stéréo faible latence via sounddevice (Left = X, Right = Y)
"""

import numpy as np

try:
    import sounddevice as sd
except ImportError:
    sd = None

class StereoVectorAudioEngine:
    def __init__(self, channel_x, channel_y, sample_rate: int = 48000, block_size: int = 512):
        self.channel_x = channel_x
        self.channel_y = channel_y
        self.sample_rate = sample_rate
        self.block_size = block_size
        self.is_active = False
        self.stream = None
        self.time_cursor = 0.0

    def start(self):
        if sd is None:
            print("[AVERTISSEMENT] sounddevice non disponible.")
            return

        if not self.is_active:
            try:
                self.stream = sd.OutputStream(
                    samplerate=self.sample_rate,
                    channels=2,
                    blocksize=self.block_size,
                    callback=self._audio_callback
                )
                self.stream.start()
                self.is_active = True
            except Exception as e:
                print(f"[ERREUR AUDIO] {e}")

    def stop(self):
        if self.stream is not None:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        self.is_active = False

    def _audio_callback(self, outdata, frames, time_info, status):
        t = self.time_cursor + np.arange(frames) / self.sample_rate
        self.time_cursor += frames / self.sample_rate

        # Left = X, Right = Y
        sig_x = self.channel_x.generate_block(t)
        sig_y = self.channel_y.generate_block(t)

        outdata[:, 0] = sig_x
        outdata[:, 1] = sig_y
