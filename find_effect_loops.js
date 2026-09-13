import fs from 'fs';
const content = fs.readFileSync('src/App.tsx', 'utf8');

// match useEffect without dependency array or with empty/changing dependencies
const effectRegex = /useEffect\(\(\) => \{[\s\S]*?\}, \[([\s\S]*?)\]\);/g;
let match;
while ((match = effectRegex.exec(content)) !== null) {
  const deps = match[1].trim();
  if (deps === '') {
    console.log(`Empty deps at line ${content.substring(0, match.index).split('\n').length}`);
  }
}
