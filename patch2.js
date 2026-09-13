import fs from 'fs';
let code = fs.readFileSync('src/components/HarmonicPianoPanel.tsx', 'utf8');

const regex = /engine\.setSynthesisMode\('dual_channel'\);[\s\S]*?setActiveNoteName\(null\);\n  \}, \[engine, onUpdateConfigX, onUpdateConfigY\]\);/g;

code = code.replace(regex, `engine.triggerPianoNote(freqX, freqY, waveform);
      onSelectPresetName(\`Note \${noteLabel} (\${freqX}Hz / \${freqY}Hz)\`);
    },
    [engine, selectedRatioIndex, waveform, onSelectPresetName]
  );

  const stopNote = useCallback(() => {
    engine.releasePianoNote();
    setActiveNoteName(null);
  }, [engine]);`);

fs.writeFileSync('src/components/HarmonicPianoPanel.tsx', code);
