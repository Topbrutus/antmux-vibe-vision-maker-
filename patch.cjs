const fs = require('fs');
let code = fs.readFileSync('src/components/ZoneCOscilloscope.tsx', 'utf8');
const oldCode = `  // ResizeObserver for responsive high-res canvas measuring the CRT screen container
  useEffect(() => {
    const target = screenContainerRef.current || containerRef.current;
    if (!target) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rectW = entry.contentRect.width;
        const rectH = entry.contentRect.height;
        const availableSize = rectH > 50 ? Math.min(rectW, rectH) : rectW;
        const effectiveSize = Math.max(340, Math.min(720, Math.floor(availableSize)));
        setCanvasDimensions(prev => {
          if (prev.width === effectiveSize && prev.height === effectiveSize) return prev;
          return { width: effectiveSize, height: effectiveSize };
        });
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);`;
const newCode = `  // ResizeObserver for responsive high-res canvas measuring the CRT screen container
  useEffect(() => {
    const target = screenContainerRef.current || containerRef.current;
    if (!target) return;
    let rafId;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rectW = entry.contentRect.width;
        const rectH = entry.contentRect.height;
        const availableSize = rectH > 50 ? Math.min(rectW, rectH) : rectW;
        const effectiveSize = Math.max(340, Math.min(720, Math.floor(availableSize)));
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setCanvasDimensions(prev => {
            if (prev.width === effectiveSize && prev.height === effectiveSize) return prev;
            return { width: effectiveSize, height: effectiveSize };
          });
        });
      }
    });
    observer.observe(target);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);`;
fs.writeFileSync('src/components/ZoneCOscilloscope.tsx', code.replace(oldCode, newCode));
