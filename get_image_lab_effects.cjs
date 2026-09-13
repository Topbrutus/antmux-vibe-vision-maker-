const fs = require('fs');
const code = fs.readFileSync('src/components/ImageVectorLab.tsx', 'utf8');
const lines = code.split('\n');

const lineNumbers = [45, 121];

lineNumbers.forEach((ln) => {
  console.log(`=== Line ${ln} ===`);
  const start = Math.max(0, ln - 2);
  const end = Math.min(lines.length - 1, ln + 15);
  for (let i = start; i <= end; i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
  console.log('==================\n');
});
