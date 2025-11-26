
import React, { useRef, useEffect, useCallback } from 'react';
import { AttractorConfig, Point3D } from '../types';

interface VisualizerProps {
  attractor: AttractorConfig;
  params: Record<string, number>;
  isPlaying: boolean;
  simulationSpeed: number;
  maxTrailLength: number;
  particleSize: number;
  particleOpacity: number;
  zoomLevel: number;
}

// Helper to parse hex to rgb
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
};

// Color Science Helpers
const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
};

const hslToRgb = (h: number, s: number, l: number) => {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

// Linear Interpolation for RGB
const lerpColor = (c1: {r: number, g: number, b: number}, c2: {r: number, g: number, b: number}, t: number) => {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t)
  };
};

// Runge-Kutta 4 Integration Step
const stepRK4 = (p: Point3D, params: Record<string, number>, ode: any, dt: number): Point3D => {
  const k1 = ode(p, params);
  
  const p2 = { 
    x: p.x + k1.dx * dt * 0.5, 
    y: p.y + k1.dy * dt * 0.5, 
    z: p.z + k1.dz * dt * 0.5, 
    w: (p.w||0) + (k1.dw||0)*dt*0.5 
  };
  const k2 = ode(p2, params);
  
  const p3 = { 
    x: p.x + k2.dx * dt * 0.5, 
    y: p.y + k2.dy * dt * 0.5, 
    z: p.z + k2.dz * dt * 0.5, 
    w: (p.w||0) + (k2.dw||0)*dt*0.5 
  };
  const k3 = ode(p3, params);
  
  const p4 = { 
    x: p.x + k3.dx * dt, 
    y: p.y + k3.dy * dt, 
    z: p.z + k3.dz * dt, 
    w: (p.w||0) + (k3.dw||0)*dt 
  };
  const k4 = ode(p4, params);

  return {
    x: p.x + (k1.dx + 2*k2.dx + 2*k3.dx + k4.dx) * dt / 6,
    y: p.y + (k1.dy + 2*k2.dy + 2*k3.dy + k4.dy) * dt / 6,
    z: p.z + (k1.dz + 2*k2.dz + 2*k3.dz + k4.dz) * dt / 6,
    w: (p.w||0) + ((k1.dw||0) + 2*(k2.dw||0) + 2*(k3.dw||0) + (k4.dw||0)) * dt / 6
  };
};

const Visualizer: React.FC<VisualizerProps> = ({
  attractor,
  params,
  isPlaying,
  simulationSpeed,
  maxTrailLength,
  particleSize,
  particleOpacity,
  zoomLevel
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // --- SWARM ENGINE STATE (Multi-Particle System) ---
  const swarmCountRef = useRef(0);
  const xRef = useRef<Float32Array | null>(null);
  const yRef = useRef<Float32Array | null>(null);
  const zRef = useRef<Float32Array | null>(null);
  const wRef = useRef<Float32Array | null>(null);
  
  // Animation State
  const revealRef = useRef(0);
  
  // Refs for logic
  const paramsRef = useRef(params);
  const attractorRef = useRef(attractor);
  const settingsRef = useRef({
    isPlaying,
    simulationSpeed,
    maxTrailLength,
    particleSize,
    particleOpacity,
    zoomLevel
  });

  const rotationRef = useRef({ x: 0.8, y: 0.6 }); 
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(true);

  // Fractal state
  const fractalOffsetRef = useRef({ x: 0, y: 0 });
  const fractalZoomMultRef = useRef(1.0);
  const fractalGrowthRef = useRef(0);
  const animationTimeRef = useRef(0);
  const paletteRef = useRef<{r: Uint8Array, g: Uint8Array, b: Uint8Array} | null>(null);
  
  // Nebula Palette State
  const nebulaPaletteRef = useRef<{r: Uint8Array, g: Uint8Array, b: Uint8Array} | null>(null);

  useEffect(() => {
    paramsRef.current = params;
    attractorRef.current = attractor;
    settingsRef.current = {
      isPlaying,
      simulationSpeed,
      maxTrailLength,
      particleSize,
      particleOpacity,
      zoomLevel
    };
  }, [params, attractor, isPlaying, simulationSpeed, maxTrailLength, particleSize, particleOpacity, zoomLevel]);

  // Generate Palette
  useEffect(() => {
    const size = 1024;
    const rArr = new Uint8Array(size);
    const gArr = new Uint8Array(size);
    const bArr = new Uint8Array(size);

    if (attractor.colors && attractor.colors.length > 1) {
      // GRADIENT MODE (Use defined color stops)
      const colors = attractor.colors.map(hexToRgb);
      const segments = colors.length - 1;
      
      for (let i = 0; i < size; i++) {
        const t = i / (size - 1); // 0 to 1
        const segmentIndex = Math.floor(t * segments);
        const segmentT = (t * segments) - segmentIndex;
        
        // Clamp index to safe bounds
        const c1 = colors[Math.min(segmentIndex, colors.length - 1)];
        const c2 = colors[Math.min(segmentIndex + 1, colors.length - 1)];
        
        const final = lerpColor(c1, c2, segmentT);
        rArr[i] = final.r;
        gArr[i] = final.g;
        bArr[i] = final.b;
      }

    } else {
      // FALLBACK MODE (Procedural HSL generation based on single color)
      const baseRgb = hexToRgb(attractor.color);
      const [h, s, l] = rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
      
      for (let i = 0; i < size; i++) {
        const t = i / size; // 0 to 1
        
        // Subtle Hue Shift (Analogous only)
        const hueShift = h + Math.sin(t * Math.PI * 2) * 0.05;

        // Luminance Gradient (Dark -> Bright -> Dark)
        let lMod = 0.3 + 0.4 * Math.pow(Math.sin(t * Math.PI * 4), 2); 
        
        // Saturation Control
        let sMod = s * 0.9; 

        const color = hslToRgb(hueShift, sMod, lMod);
        rArr[i] = color.r;
        gArr[i] = color.g;
        bArr[i] = color.b;
      }
    }

    nebulaPaletteRef.current = { r: rArr, g: gArr, b: bArr };
  }, [attractor.color, attractor.colors]);

  // Initialization
  useEffect(() => {
    // Force reset swarm on attractor change
    swarmCountRef.current = 0; 
    xRef.current = null; 
    
    // Jumpstart fractal
    const targetMaxIter = Math.floor(attractor.defaultParams.iterations?.value || 100);
    fractalGrowthRef.current = targetMaxIter; 
    
    revealRef.current = 0; // Reset reveal animation to 0
  }, [attractor.id, attractor.startPoint]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    autoRotateRef.current = false; 
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    
    if (attractorRef.current.visualizationType === 'fractal') {
      const zoom = (paramsRef.current.zoom || 0.8) * fractalZoomMultRef.current;
      const panSpeed = 3.5 / (zoom * Math.min(window.innerWidth, window.innerHeight));
      fractalOffsetRef.current.x -= dx * panSpeed;
      fractalOffsetRef.current.y -= dy * panSpeed;
    } else {
      rotationRef.current.y += dx * 0.005;
      rotationRef.current.x += dy * 0.005;
    }
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (attractorRef.current.visualizationType === 'fractal') {
      const zoomFactor = 1.1;
      if (e.deltaY < 0) fractalZoomMultRef.current *= zoomFactor;
      else fractalZoomMultRef.current /= zoomFactor;
    }
  };

  const getFractalPalette = () => {
    if (paletteRef.current) return paletteRef.current;
    const size = 1000;
    const r = new Uint8Array(size);
    const g = new Uint8Array(size);
    const b = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      const t = i / size;
      r[i] = Math.floor(255 * (0.5 + 0.5 * Math.sin(6.28 * t)));
      g[i] = Math.floor(255 * (0.5 + 0.5 * Math.sin(6.28 * t + 2.0)));
      b[i] = Math.floor(255 * (0.5 + 0.5 * Math.sin(6.28 * t + 4.0)));
    }
    paletteRef.current = { r, g, b };
    return paletteRef.current;
  };

  const renderFractal = (ctx: CanvasRenderingContext2D, width: number, height: number, effectiveDpr: number) => {
    const params = paramsRef.current;
    const { isPlaying, zoomLevel } = settingsRef.current;
    const baseZoom = params.zoom || 0.8;
    const targetMaxIter = Math.floor(params.iterations || 100);

    // Smoothly grow detail if needed, but start visible
    if (fractalGrowthRef.current < targetMaxIter) {
        fractalGrowthRef.current += Math.max(1, targetMaxIter / 60); 
    }
    
    const maxIter = Math.floor(fractalGrowthRef.current);
    // Apply visual zoomLevel from UI
    const zoom = baseZoom * fractalZoomMultRef.current * zoomLevel;
    const offsetX = (params.centerX || -0.5) + fractalOffsetRef.current.x;
    const offsetY = (params.centerY || 0) + fractalOffsetRef.current.y;
    
    // VISUAL ALIGNMENT: STRICT CENTER
    const cx = width / 2;

    const scale = 3.5 / (zoom * Math.min(width, height));
    const panX = offsetX - cx * scale;
    const panY = offsetY - (height / 2) * scale;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    if (isPlaying) animationTimeRef.current += 1;
    const colorShift = animationTimeRef.current * 3; 
    const palette = getFractalPalette();

    for (let py = 0; py < height; py++) {
      const y0 = panY + py * scale;
      let index = py * width * 4; 
      for (let px = 0; px < width; px++) {
        const x0 = panX + px * scale;
        let x = 0, y = 0, x2 = 0, y2 = 0;
        let iteration = 0;
        while (x2 + y2 <= 4 && iteration < maxIter) {
          y = (x + x) * y + y0;
          x = x2 - y2 + x0;
          x2 = x * x;
          y2 = y * y;
          iteration++;
        }
        if (iteration === maxIter) {
          data[index++] = 0; data[index++] = 0; data[index++] = 0; data[index++] = 255; 
        } else {
          const idx = (iteration * 10 + colorShift) % 1000;
          data[index++] = palette.r[idx];
          data[index++] = palette.g[idx];
          data[index++] = palette.b[idx];
          data[index++] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  const renderSwarmMode = (ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) => {
    const { isPlaying, simulationSpeed, maxTrailLength, particleSize, particleOpacity, zoomLevel } = settingsRef.current;
    const attractor = attractorRef.current;
    const params = paramsRef.current;
    
    // 1. CLEAR
    ctx.clearRect(0, 0, width, height);

    const count = maxTrailLength;
    
    // 2. INITIALIZATION
    if (!xRef.current || xRef.current.length !== count) {
      xRef.current = new Float32Array(count);
      yRef.current = new Float32Array(count);
      zRef.current = new Float32Array(count);
      wRef.current = new Float32Array(count);
      swarmCountRef.current = count;
      
      const startX = attractor.startPoint?.x || 0.1;
      const startY = attractor.startPoint?.y || 0.1;
      const startZ = attractor.startPoint?.z || 0.1;

      let p: Point3D = { x: startX, y: startY, z: startZ, w: 0 };
      
      if (attractor.ode) {
        // Initialization needs to be clean, run a pre-warm
        const dt = 0.01; 
        for (let i = 0; i < count; i++) {
           p = stepRK4(p, params, attractor.ode, dt);
           
           xRef.current[i] = p.x;
           yRef.current[i] = p.y;
           zRef.current[i] = p.z;
           wRef.current[i] = p.w || 0;
           
           if (isNaN(p.x) || Math.abs(p.x) > 5000) {
              p = { x: startX, y: startY, z: startZ };
              p.x += (Math.random()-0.5) * 0.1; 
           }
        }
      } else if (attractor.map) {
         for (let i = 0; i < count; i++) {
             const next = attractor.map(p, params);
             p = { ...next };
             xRef.current[i] = p.x;
             yRef.current[i] = p.y;
             zRef.current[i] = p.z;
         }
      }
    }

    const x = xRef.current!;
    const y = yRef.current!;
    const z = zRef.current!;
    const w = wRef.current!;

    // 3. PHYSICS UPDATE
    // Reveal Speed: ~25 seconds at 60fps (1500 frames)
    const targetFrames = 1500; 
    const progress = Math.min(1, revealRef.current / count);
    
    const dynamicSpeed = Math.max(0.5, (count / targetFrames) * (0.2 + 0.8 * Math.sin(progress * Math.PI / 2)));
    
    if (revealRef.current < count) {
       revealRef.current += dynamicSpeed;
    }
    
    const drawLimit = Math.min(count, Math.ceil(revealRef.current));

    if (isPlaying && attractor.ode) {
       // SUB-STEPPING FOR SMOOTHER PHYSICS
       const subSteps = 4;
       const totalDt = 0.01 * simulationSpeed * attractor.speedMultiplier;
       const dt = totalDt / subSteps;
       
       for (let i = 0; i < count; i++) {
          let p: Point3D = {x: x[i], y: y[i], z: z[i], w: w[i] || 0};
          
          for(let s = 0; s < subSteps; s++) {
             p = stepRK4(p, params, attractor.ode, dt);
          }
          
          x[i] = p.x; y[i] = p.y; z[i] = p.z; w[i] = p.w || 0;
          
          if (isNaN(x[i]) || Math.abs(x[i]) > 5000) {
             const randomIdx = Math.floor(Math.random() * count);
             if (!isNaN(x[randomIdx])) { 
                x[i] = x[randomIdx]; y[i] = y[randomIdx]; z[i] = z[randomIdx]; 
             } else { 
                x[i] = attractor.startPoint?.x || 0.1; 
                y[i] = attractor.startPoint?.y || 0.1; 
                z[i] = attractor.startPoint?.z || 0.1; 
             }
          }
       }
    }

    // 4. ANIMATION & RENDER
    // VISUAL ALIGNMENT: STRICT CENTER
    const cx = width / 2;
    const cy = height / 2;
    const minDim = Math.min(width, height);
    
    // Apply Zoom Level
    const scale = (minDim / (attractor.scale || 10)) * zoomLevel;
    
    if (autoRotateRef.current && isPlaying) {
        rotationRef.current.y += 0.002;
    }

    const rotX = rotationRef.current.x;
    const rotY = rotationRef.current.y;
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    
    const fov = minDim * 1.5;

    ctx.globalCompositeOperation = 'lighter'; 

    const baseSize = Math.max(0.5, particleSize * dpr); 
    const nebula = nebulaPaletteRef.current;
    
    // TUNED FOR CLARITY - Low fog, low DoF
    const fogDensity = 0.05; 
    const dofStrength = 0.01; 
    const headLength = Math.min(3000, count * 0.1); 

    animationTimeRef.current += 1;
    const timeShift = animationTimeRef.current * 0.0005; 

    for (let i = 0; i < drawLimit; i++) {
       const tx = x[i] - attractor.center.x;
       const ty = y[i] - attractor.center.y;
       const tz = z[i] - attractor.center.z;
       
       const x1 = tx * cosY - tz * sinY;
       const z1 = tx * sinY + tz * cosY;
       const y2 = ty * cosX - z1 * sinX;
       const z2 = ty * sinX + z1 * cosX;

       if (z2 > -fov * 0.99) {
           const projScale = fov / (fov + z2);
           
           if (projScale > 0 && projScale < 50) {
               const screenX = cx + x1 * scale * projScale;
               const screenY = cy + y2 * scale * projScale;

               if (screenX >= -20 && screenX < width + 20 && screenY >= -20 && screenY < height + 20) {
                   
                   // --- VISUAL ENHANCEMENTS ---
                   // Z-Depth Fog
                   const zNorm = z2 / (attractor.scale * 2.5);
                   const fogFactor = Math.exp(-Math.max(0, zNorm + 0.5) * fogDensity);
                   
                   // Depth of Field (Subtler)
                   const distFromFocus = Math.abs(z2);
                   const dofFactor = 1.0 / (1.0 + (distFromFocus / (attractor.scale * 8)) * dofStrength);

                   // "Comet Head"
                   const distFromHead = drawLimit - i;
                   let headBoost = 1.0;
                   let isHead = false;
                   
                   if (distFromHead < headLength) {
                      const t = distFromHead / headLength;
                      headBoost = 1.0 + (1.0 - t) * 3.0; 
                      isHead = true;
                   }

                   let alpha = particleOpacity * fogFactor * dofFactor * headBoost;
                   alpha = Math.min(1, Math.max(0, alpha));

                   if (alpha > 0.01) {
                      // NEBULA COLORING (Gradient or Procedural)
                      let r = 255, g = 255, b = 255;
                      
                      if (nebula) {
                        // Create a flowing wave effect through the palette
                        const wave = (i / count * 4 + timeShift);
                        // Wrap around palette size (1024)
                        const colorIdx = Math.floor(Math.abs(wave * 1024) % 1024); 
                        r = nebula.r[colorIdx];
                        g = nebula.g[colorIdx];
                        b = nebula.b[colorIdx];
                      }
                      
                      const finalSize = baseSize * projScale * (isHead ? 1.5 : 1.0);

                      ctx.fillStyle = `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${alpha})`;
                      
                      ctx.beginPath();
                      ctx.arc(screenX, screenY, finalSize / 2, 0, Math.PI * 2);
                      ctx.fill();
                   }
               }
           }
       }
    }
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use alpha: false for performance
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // For fractal, force dpr = 1 to save CPU. For others use full res.
    const effectiveDpr = attractorRef.current.visualizationType === 'fractal' ? 1 : dpr;
    const width = rect.width * effectiveDpr;
    const height = rect.height * effectiveDpr;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    if (attractorRef.current.visualizationType === 'fractal') {
      renderFractal(ctx, width, height, effectiveDpr);
    } else {
      renderSwarmMode(ctx, width, height, effectiveDpr);
    }

    requestRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [render]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block touch-none cursor-move"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    />
  );
};

export default Visualizer;
