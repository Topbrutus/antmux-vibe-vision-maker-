const fs = require('fs');
let code = fs.readFileSync('src/components/ZoneCOscilloscope.tsx', 'utf8');

const target = `        setCanvasDimensions(prev => {
          if (prev.width === effectiveSize && prev.height === effectiveSize) return prev;
          return { width: effectiveSize, height: effectiveSize };
        });`;

const replacement = `        window.requestAnimationFrame(() => {
          setCanvasDimensions(prev => {
            if (prev.width === effectiveSize && prev.height === effectiveSize) return prev;
            return { width: effectiveSize, height: effectiveSize };
          });
        });`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/ZoneCOscilloscope.tsx', code);
