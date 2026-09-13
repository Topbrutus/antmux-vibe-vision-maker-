import fs from 'fs';
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
for (let i = 1600; i < lines.length; i++) {
  if (lines[i].includes("appMode === 'piano'")) {
    console.log(`Found piano at line ${i+1}`);
  }
}
