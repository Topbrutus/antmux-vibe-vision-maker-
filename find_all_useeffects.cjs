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
    // Find matching parentheses and brackets to extract the useEffect block
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
    
    // Find the dependency array
    // It's usually at the end of the useEffect call: , [ ... ])
    // Let's print the file, line number, and a snippet of the block plus the dependencies
    const lineNum = content.substring(0, index).split('\n').length;
    console.log(`=== ${file}:${lineNum} ===`);
    console.log(block.trim());
    console.log('===================================\n');
    
    index += 'useEffect'.length;
  }
});
