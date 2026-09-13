import fs from 'fs';
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
lines[1602] = "        </div>";
fs.writeFileSync('src/App.tsx', lines.join('\n'));
