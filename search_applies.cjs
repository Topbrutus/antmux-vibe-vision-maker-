const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.tsx')) results.push(file);
  });
  return results;
}
walk('src/components').forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  if (code.match(/useEffect\([\s\S]*?(onApply|onSendToOscilloscope)[\s\S]*?\}, \[/)) {
    console.log(file);
  }
});
