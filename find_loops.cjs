const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('find src -name "*.tsx" -o -name "*.ts"').toString().split('\n').filter(Boolean);

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  const regex = /useEffect\(\(\)\s*=>\s*\{([\s\S]*?)\}(?:\s*,\s*\[([^\]]*)\])?\);/g;
  while ((match = regex.exec(content)) !== null) {
    const body = match[1];
    const deps = match[2];
    if (body.match(/set[A-Z]/)) {
      console.log(`\n--- ${file} (Deps: [${deps !== undefined ? deps : 'NONE'}]) ---`);
      console.log(body.trim().split('\n').map(l => l.trim()).filter(l => l.match(/set[A-Z]/)).join('\n'));
    }
  }
}
