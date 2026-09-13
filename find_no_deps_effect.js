import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');

const effectRegex = /useEffect\(\(\) => \{[\s\S]*?\}(?!, \[)/g;
let match;
while ((match = effectRegex.exec(content)) !== null) {
  console.log(`No deps at line ${content.substring(0, match.index).split('\n').length}`);
}
