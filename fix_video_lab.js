import fs from 'fs';

const p = 'src/components/VideoVectorLab.tsx';
let content = fs.readFileSync(p, 'utf8');

// We will cache the blob at module level so it doesn't regenerate
content = content.replace(
  "export const VideoVectorLab: React.FC<VideoVectorLabProps> = ({",
  "let cachedDemoBlob: Blob | null = null;\nlet cachedDemoAudioBuffer: AudioBuffer | null = null;\n\nexport const VideoVectorLab: React.FC<VideoVectorLabProps> = ({"
);

content = content.replace(
  "        const demoBlob = await generateJerobeamMushroomVideoBlob(6);",
  "        let demoBlob = cachedDemoBlob;\n        if (!demoBlob) {\n          demoBlob = await generateJerobeamMushroomVideoBlob(6);\n          cachedDemoBlob = demoBlob;\n        }"
);

fs.writeFileSync(p, content);
console.log("Fixed VideoVectorLab");
