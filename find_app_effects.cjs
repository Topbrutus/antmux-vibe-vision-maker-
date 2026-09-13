const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

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
  const hasSetState = block.match(/\bset[A-Z]\w*/);
  
  if (hasSetState) {
    console.log(`=== App.tsx:${lineNum} ===`);
    console.log(`State setters:`, [...block.matchAll(/\bset[A-Z]\w*/g)].map(m => m[0]));
    const lastBracketClose = block.lastIndexOf(']');
    const lastBracketOpen = block.lastIndexOf('[', lastBracketClose);
    if (lastBracketOpen !== -1 && lastBracketOpen < lastBracketClose) {
      console.log(`Dependencies: [${block.substring(lastBracketOpen + 1, lastBracketClose).trim()}]`);
    } else {
      console.log(`Dependencies: NO DEPENDENCY ARRAY`);
    }
    console.log('-----------------------------------\n');
  }
  
  index += 'useEffect'.length;
}
