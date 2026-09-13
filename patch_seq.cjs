const fs = require('fs');

const path = 'src/services/sequenceGeneratorStorage.ts';
let code = fs.readFileSync(path, 'utf-8');

const regex = /const idxA = \(Math.floor\(segmentFloat\) % kfs.length \+ kfs.length\) % kfs.length;\s*const idxB = \(idxA \+ 1\) % kfs.length;\s*const blend = segmentFloat - Math.floor\(segmentFloat\);\s*const ptsA = kfs\[idxA\]\.points \|\| \[\];\s*const ptsB = kfs\[idxB\]\.points \|\| \[\];/;

const newCode = `let idxA = (Math.floor(segmentFloat) % kfs.length + kfs.length) % kfs.length;
  if (isNaN(idxA)) idxA = 0;
  let idxB = (idxA + 1) % kfs.length;
  if (isNaN(idxB)) idxB = 0;
  let blend = segmentFloat - Math.floor(segmentFloat);
  if (isNaN(blend)) blend = 0;
  
  const kfA = kfs[idxA] || kfs[0];
  const kfB = kfs[idxB] || kfs[0];
  const ptsA = kfA?.points || [];
  const ptsB = kfB?.points || [];`;

if (code.match(regex)) {
   code = code.replace(regex, newCode);
   fs.writeFileSync(path, code);
   console.log("Patched successfully!");
} else {
   console.log("Regex did not match.");
}
