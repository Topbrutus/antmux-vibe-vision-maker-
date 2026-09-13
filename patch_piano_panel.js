import fs from 'fs';

let code = fs.readFileSync('src/components/HarmonicPianoPanel.tsx', 'utf8');

const target1 = `      // Always guarantee Audio Engine is active and running
      await engine.resumeContext();
      engine.setSynthesisMode('dual_channel');
      setAudioRunning(true);

      const ampX = configX.amplitude > 0 ? configX.amplitude : 0.8;
      const gainX = configX.gain > 0 ? configX.gain : 1.0;
      const ampY = configY.amplitude > 0 ? configY.amplitude : 0.8;
      const gainY = configY.gain > 0 ? configY.gain : 1.0;

      engine.updateConfigX({
        frequency: freqX,
        waveform,
        mute: false,
        amplitude: ampX,
        gain: gainX,
      });

      engine.updateConfigY({
        frequency: freqY,
        waveform,
        mute: false,
        amplitude: ampY,
        gain: gainY,
      });

      onSelectPresetName(\`Note \${noteLabel} (\${freqX}Hz / \${freqY}Hz)\`);
    },
    [engine, selectedRatioIndex, waveform, configX.amplitude, configX.gain, configY.amplitude, configY.gain, onUpdateConfigX, onUpdateConfigY, onSelectPresetName]
  );

  const stopNote = useCallback(() => {
    engine.updateConfigX({ amplitude: 0 });
    engine.updateConfigY({ amplitude: 0 });
    setActiveNoteName(null);
  }, [engine, onUpdateConfigX, onUpdateConfigY]);`;

const replacement1 = `      // Always guarantee Audio Engine is active and running
      await engine.resumeContext();
      setAudioRunning(true);

      engine.triggerPianoNote(freqX, freqY, waveform);

      onSelectPresetName(\`Note \${noteLabel} (\${freqX}Hz / \${freqY}Hz)\`);
    },
    [engine, selectedRatioIndex, waveform, onSelectPresetName]
  );

  const stopNote = useCallback(() => {
    engine.releasePianoNote();
    setActiveNoteName(null);
  }, [engine]);`;

code = code.replace(target1, replacement1);

// wait, is there another stopNote reference? Let's check.
fs.writeFileSync('src/components/HarmonicPianoPanel.tsx', code);
