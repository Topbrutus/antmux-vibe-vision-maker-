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
      
      let inEffect = false;
      let effectBody = '';
      let effectLines = [];
      const lines = code.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('useEffect(() => {') || line.includes('useEffect( () => {') || line.includes('useEffect(')) {
          // crude parsing
          inEffect = true;
          effectBody = line + '\n';
          effectLines = [i + 1];
        } else if (inEffect) {
          effectBody += line + '\n';
          if (line.match(/^\s*\}\s*,\s*\[(.*)\]\s*\)\s*;/)) {
            inEffect = false;
            if (effectBody.includes('set') && !effectBody.includes('requestAnimationFrame') && !effectBody.includes('setTimeout') && !effectBody.includes('setInterval')) {
               console.log('--- ' + fullPath + ' : ' + effectLines[0] + ' ---');
               console.log(effectBody.trim());
            }
          } else if (line.match(/^\s*\}\s*\)\s*;/)) {
            inEffect = false;
            if (effectBody.includes('set') && !effectBody.includes('requestAnimationFrame') && !effectBody.includes('setTimeout') && !effectBody.includes('setInterval')) {
               console.log('--- NO DEPS: ' + fullPath + ' : ' + effectLines[0] + ' ---');
               console.log(effectBody.trim());
            }
          }
        }
      }
    }
  }
}
processDir('src');
