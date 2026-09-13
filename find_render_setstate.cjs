const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let inComponent = false;
  let braceCount = 0;
  
  lines.forEach((line, idx) => {
    // Basic heuristic to skip obvious safe lines
    if (line.includes('useEffect(') || line.includes('useCallback(') || line.includes('setTimeout(') || line.includes('setInterval(')) return;
    if (line.match(/onClick=|onChange=|onSubmit=|on[A-Z]/)) return;
    if (line.includes('const handle')) return;
    
    // Check for setState signature inside function body
    const match = line.match(/(?<!const |let |var |[.])set[A-Z][a-zA-Z0-9_]*\(/);
    if (match && !line.includes('(' + match[0])) { // prevent matching `const setFoo = ...`
      console.log(`Potential render setState in ${file}:${idx+1}: ${line.trim()}`);
    }
  });
});
