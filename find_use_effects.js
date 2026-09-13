import fs from 'fs';
import path from 'path';

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const code = fs.readFileSync(fullPath, 'utf8');
      const regex = /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*(?:,\s*(\[[^\]]*\]))?\s*\)/g;
      let match;
      while ((match = regex.exec(code)) !== null) {
        if (!match[1]) {
          console.log('NO DEP ARRAY in ' + fullPath + ' at index ' + match.index);
        }
      }
    }
  }
}
processDir('src');
