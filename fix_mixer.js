import fs from 'fs';

const p = 'src/App.tsx';
let content = fs.readFileSync(p, 'utf8');

content = content.replace(/\{appMode === 'mixer' && \(\s*<MasterMixerPanel([\s\S]*?)\/>\s*\)\}/, `<div className={appMode === 'mixer' ? '' : 'hidden'}>\n          <MasterMixerPanel$1/>\n        </div>`);

fs.writeFileSync(p, content);
console.log("Fixed Mixer");
