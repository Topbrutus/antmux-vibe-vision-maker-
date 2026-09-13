const fs = require('fs');

const path = 'src/services/mathEngine.ts';
let code = fs.readFileSync(path, 'utf-8');

const regex = /export function updateAndGenerateContourNoise[\s\S]*?return resultPoints;\n\}/;

const newCode = `export function updateAndGenerateContourNoise(
  polygon: Array<[number, number]>,
  particlesRef: BouncingNoiseParticle[],
  targetCount: number,
  freqHz: number,
  bounceSpeed: number,
  bounceMode: 'specular' | 'stochastic' | 'quantum_diffuse' = 'specular',
  dt: number = 0.016
): Array<{ x: number; y: number; brightness: number }> {
  if (!polygon || polygon.length < 3) return [];

  const bbox = getContourBoundingBox(polygon);
  const width = Math.max(0.05, bbox.maxX - bbox.minX);
  const height = Math.max(0.05, bbox.maxY - bbox.minY);

  const spawnAtCenter = (): { x: number, y: number, vx: number, vy: number, life: number } => {
    let px = bbox.cx;
    let py = bbox.cy;
    // Spawn concentrated near the center (expanding universe logic)
    for (let attempts = 0; attempts < 15; attempts++) {
      const u = Math.random();
      const r = Math.pow(u, 4) * 0.5; // heavily weighted towards center (0)
      const a = Math.random() * Math.PI * 2;
      const rx = bbox.cx + Math.cos(a) * r * width;
      const ry = bbox.cy + Math.sin(a) * r * height;
      if (isPointInContourPolygon([rx, ry], polygon)) {
        px = rx;
        py = ry;
        break;
      }
    }
    const angle = Math.random() * Math.PI * 2;
    // Velocity is directed outwards from center to simulate expansion
    const spd = (0.2 + Math.random() * 0.8) * bounceSpeed * 1.8;
    return {
      x: px,
      y: py,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: Math.random(),
    };
  };

  // Maintain particle pool
  const count = Math.max(30, Math.min(2000, targetCount));
  while (particlesRef.length < count) {
    particlesRef.push(spawnAtCenter());
  }
  if (particlesRef.length > count) {
    particlesRef.length = count;
  }

  const freqFactor = Math.min(5.0, Math.max(0.5, Math.log10(Math.max(100, freqHz)) * 0.7));
  const effectiveDt = dt * freqFactor;
  const resultPoints: Array<{ x: number; y: number; brightness: number }> = [];

  for (let i = 0; i < particlesRef.length; i++) {
    const p = particlesRef[i];
    
    // Jitter according to frequency
    const jitterMag = (0.005 * freqFactor);
    const jx = (Math.random() - 0.5) * jitterMag;
    const jy = (Math.random() - 0.5) * jitterMag;

    let nextX = p.x + p.vx * effectiveDt + jx;
    let nextY = p.y + p.vy * effectiveDt + jy;

    // Test if next position is inside the contour
    if (!isPointInContourPolygon([nextX, nextY], polygon)) {
       // Universe boundary reached -> respawn at center
       const fresh = spawnAtCenter();
       p.x = fresh.x;
       p.y = fresh.y;
       p.vx = fresh.vx;
       p.vy = fresh.vy;
       p.life = 0;
    } else {
       p.x = nextX;
       p.y = nextY;
       p.life = (p.life + effectiveDt * 2) % 1;
    }
    
    // Calculate brightness: dimmer as they move further away (distancing energy)
    const dx = p.x - bbox.cx;
    const dy = p.y - bbox.cy;
    const dist = Math.hypot(dx, dy);
    const maxRadius = Math.max(width, height) * 0.5;
    const normDist = Math.min(1.0, dist / Math.max(0.001, maxRadius));
    
    // Bright in center, fading out exponentially towards edges
    const distanceFade = Math.pow(1.0 - normDist, 1.5);
    const bright = Math.max(0.05, distanceFade) * (0.5 + 0.5 * Math.sin(p.life * Math.PI));

    resultPoints.push({
      x: p.x,
      y: p.y,
      brightness: bright,
    });
  }

  return resultPoints;
}`;

if (code.match(regex)) {
   code = code.replace(regex, newCode);
   fs.writeFileSync(path, code);
   console.log("Patched successfully!");
} else {
   console.log("Regex did not match.");
}
