const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = getFiles('src');

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  let index = 0;
  while ((index = content.indexOf('useEffect', index)) !== -1) {
    let parenCount = 0;
    let braceCount = 0;
    let block = '';
    let foundStart = false;
    let i = index;
    for (; i < content.length; i++) {
      const char = content[i];
      block += char;
      if (char === '(') {
        parenCount++;
        foundStart = true;
      } else if (char === ')') {
        parenCount--;
      } else if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
      }
      
      if (foundStart && parenCount === 0) {
        break;
      }
    }
    
    const lineNum = content.substring(0, index).split('\n').length;
    
    // Find dependency array at the end of block
    // E.g., [dep1, dep2]
    const depMatch = block.match(/\]\s*\)\s*$/);
    let deps = [];
    if (depMatch) {
      // Find the last square bracket pair
      const lastBracketClose = block.lastIndexOf(']');
      const lastBracketOpen = block.lastIndexOf('[', lastBracketClose);
      if (lastBracketOpen !== -1 && lastBracketOpen < lastBracketClose) {
        const depStr = block.substring(lastBracketOpen + 1, lastBracketClose);
        deps = depStr.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else {
      // If no dependency array at all, it's a huge potential issue!
      // But wait, let's verify if there is no comma before the ending paren.
      const hasNoArray = !block.includes('[');
      if (hasNoArray) {
        console.log(`⚠️ WARNING: No dependency array found at all!`);
        console.log(`File: ${file}:${lineNum}`);
        console.log(block);
        console.log('-----------------------------------\n');
      }
    }
    
    // Check for state setters
    const setters = [...block.matchAll(/\bset[A-Z]\w*/g)].map(m => m[0]);
    
    if (setters.length > 0) {
      // Let's analyze the dependency array
      // If deps contains props or functions or objects, it could be a trigger
      const suspectDeps = deps.filter(d => {
        // Functions, callbacks, or objects
        return d.toLowerCase().includes('on') || d.includes('config') || d.includes('state') || d.includes('points') || d.includes('data');
      });
      
      if (suspectDeps.length > 0) {
        console.log(`💡 SUSPECT EFFECT: ${file}:${lineNum}`);
        console.log(`Setters: ${[...new Set(setters)].join(', ')}`);
        console.log(`Dependencies: [${deps.join(', ')}]`);
        console.log(`Suspect deps: [${suspectDeps.join(', ')}]`);
        console.log('Snippet:', block.split('\n').slice(0, 4).join('\n'));
        console.log('-----------------------------------\n');
      }
    }
    
    index += 'useEffect'.length;
  }
});
