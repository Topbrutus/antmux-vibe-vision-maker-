import fs from 'fs';

const p = 'src/App.tsx';
let content = fs.readFileSync(p, 'utf8');

// We want to replace `{appMode === '...' && (` with `<div className={appMode === '...' ? 'space-y-4' : 'hidden'}>`
// But the current format is:
// {appMode === 'main' && (
//   <div className="space-y-4">
// ...
//   </div>
// )}

content = content.replace(/\{appMode === '([a-z_]+)' && \(\s*<div className="space-y-4">\s*([\s\S]*?)\s*<\/div>\s*\)\}/g, (match, mode, inner) => {
  return `<div className={appMode === '${mode}' ? 'space-y-4' : 'hidden'}>\n  ${inner}\n</div>`;
});

// There is one exception: piano has `&& engineRef.current &&`
content = content.replace(/\{appMode === 'piano' && engineRef\.current && \(\s*<div className="space-y-4">\s*([\s\S]*?)\s*<\/div>\s*\)\}/g, (match, inner) => {
  return `{engineRef.current && (<div className={appMode === 'piano' ? 'space-y-4' : 'hidden'}>\n  ${inner}\n</div>)}`;
});

fs.writeFileSync(p, content);
console.log("Fixed Tabs");
