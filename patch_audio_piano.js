import fs from 'fs';

let code = fs.readFileSync('src/services/audioEngine.ts', 'utf8');

const target1 = `  private recordingStartTime: number = 0;`;

const replacement1 = `  private recordingStartTime: number = 0;

  // Additive Piano Synthesizer State
  private pianoState = {
    active: false,
    freqX: 432,
    freqY: 432,
    phaseX: 0,
    phaseY: 0,
    currentAmp: 0,
    targetAmp: 0,
    waveform: 'sine' as WaveformType
  };

  public triggerPianoNote(freqX: number, freqY: number, waveform: WaveformType) {
    this.pianoState.freqX = freqX;
    this.pianoState.freqY = freqY;
    this.pianoState.waveform = waveform;
    this.pianoState.targetAmp = 0.8;
    this.pianoState.active = true;
  }

  public releasePianoNote() {
    this.pianoState.targetAmp = 0;
  }`;

code = code.replace(target1, replacement1);

const target2 = `      // Clipping check
      if (Math.abs(valX) >= 0.99 || Math.abs(valY) >= 0.99) {`;

const replacement2 = `      // Additive Piano Perturbation
      if (this.pianoState.active || this.pianoState.currentAmp > 0.0001) {
        if (this.pianoState.currentAmp < this.pianoState.targetAmp) {
          this.pianoState.currentAmp = Math.min(this.pianoState.targetAmp, this.pianoState.currentAmp + 0.008); // Fast attack
        } else if (this.pianoState.currentAmp > this.pianoState.targetAmp) {
          this.pianoState.currentAmp = Math.max(this.pianoState.targetAmp, this.pianoState.currentAmp - 0.0008); // Smooth release
        }

        this.pianoState.phaseX += 2 * Math.PI * this.pianoState.freqX * dt;
        this.pianoState.phaseY += 2 * Math.PI * this.pianoState.freqY * dt;
        if (this.pianoState.phaseX > 2 * Math.PI) this.pianoState.phaseX -= 2 * Math.PI;
        if (this.pianoState.phaseY > 2 * Math.PI) this.pianoState.phaseY -= 2 * Math.PI;

        const pX = evalWaveform(this.pianoState.waveform, this.pianoState.phaseX, []) * this.pianoState.currentAmp;
        const pY = evalWaveform(this.pianoState.waveform, this.pianoState.phaseY, []) * this.pianoState.currentAmp;

        valX += pX;
        valY += pY;
        
        if (this.pianoState.currentAmp <= 0.0001 && this.pianoState.targetAmp === 0) {
          this.pianoState.active = false;
        }
      }

      // Clipping check
      if (Math.abs(valX) >= 0.99 || Math.abs(valY) >= 0.99) {`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/services/audioEngine.ts', code);
