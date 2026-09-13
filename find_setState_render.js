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
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/set[A-Z][a-zA-Z]*\(/)) {
          if (!line.includes('onClick') && !line.includes('onChange') && !line.includes('=>') && !line.includes('useEffect') && !line.includes('useCallback') && !line.includes('useMemo')) {
             console.log(fullPath + ':' + (i+1) + ': ' + line.trim());
          }
        }
      }
    }
  }
}
processDir('src');
