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
    
    // Check if the effect block calls any callback starting with "on" (e.g. props.onX, onX)
    // or calls a setX function
    const hasPropCallback = block.match(/\bon[A-Z]\w*/);
    const hasSetState = block.match(/\bset[A-Z]\w*/);
    
    if (hasPropCallback || hasSetState) {
      console.log(`=== ${file}:${lineNum} ===`);
      console.log(`Setters/Callbacks found!`);
      if (hasSetState) console.log(`  State setters:`, [...block.matchAll(/\bset[A-Z]\w*/g)].map(m => m[0]));
      if (hasPropCallback) console.log(`  Prop callbacks:`, [...block.matchAll(/\bon[A-Z]\w*/g)].map(m => m[0]));
      console.log(`Dependencies:`);
      // extract dependencies array
      const lastBracketClose = block.lastIndexOf(']');
      const lastBracketOpen = block.lastIndexOf('[', lastBracketClose);
      if (lastBracketOpen !== -1 && lastBracketOpen < lastBracketClose) {
        console.log(`  [${block.substring(lastBracketOpen + 1, lastBracketClose).trim()}]`);
      } else {
        console.log(`  NO DEPENDENCY ARRAY`);
      }
      console.log('-----------------------------------\n');
    }
    
    index += 'useEffect'.length;
  }
});
