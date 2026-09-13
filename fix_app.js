import fs from 'fs';
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i] === "</div>" && lines[i-1] && lines[i-1].includes("</button>")) {
    lines[i] = "                  </div>\n                )}";
    break;
  }
}
fs.writeFileSync('src/App.tsx', lines.join('\n'));
