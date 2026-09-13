import fs from 'fs';
let code = fs.readFileSync('src/components/HarmonicPianoPanel.tsx', 'utf8');

code = code.replace(/const stopNote = useCallback\(\(\) => \{[\s\S]*?onUpdateConfigY\]\);\n/g, 
`const stopNote = useCallback(() => {
    setActiveNoteName(null);
    if (isPlayingArp) setIsPlayingArp(false);
    engine.releasePianoNote();
  }, [engine, isPlayingArp]);\n`);

code = code.replace(/await engine\.resumeContext\(\);\n      engine\.setSynthesisMode\('dual_channel'\);\n      setAudioRunning\(true\);[\s\S]*?onSelectPresetName\(\`Note \$\{noteLabel\} \(\$\{freqX\}Hz \/ \$\{freqY\}Hz\)\`\);\n    \},\n    \[engine, selectedRatioIndex, waveform, configX\.amplitude, configX\.gain, configY\.amplitude, configY\.gain, onUpdateConfigX, onUpdateConfigY, onSelectPresetName\]\n  \);/g, 
`await engine.resumeContext();
      setAudioRunning(true);
      engine.triggerPianoNote(freqX, freqY, waveform);
      onSelectPresetName(\`Note \${noteLabel} (\${freqX}Hz / \${freqY}Hz)\`);
    },
    [engine, selectedRatioIndex, waveform, onSelectPresetName]
  );`);

fs.writeFileSync('src/components/HarmonicPianoPanel.tsx', code);
