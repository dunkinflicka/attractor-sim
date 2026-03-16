import React, { useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import { AttractorConfig, Point3D } from '../types';

// ---------- Types ----------
export type ProjectionMode = '3D' | 'XY' | 'XZ' | 'YZ';

export interface VisualizerHandle {
  takeScreenshot: () => string;
}

interface VisualizerProps {
  attractor: AttractorConfig;
  params: Record<string, number>;
  isPlaying: boolean;
  simulationSpeed: number;
  maxTrailLength: number;
  particleSize: number;
  particleOpacity: number;
  zoomLevel: number;
  // New optional props — all have defaults so existing usage doesn't break
  showButterfly?: boolean;
  butterflyColor?: { r: number; g: number; b: number };
  projection?: ProjectionMode;
  onLyapunovUpdate?: (lambda: number) => void;
}

// ---------- Colour helpers (unchanged from original) ----------
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 255, g: 255, b: 255 };
};
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
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};
const lerpColor = (c1: {r:number,g:number,b:number}, c2: {r:number,g:number,b:number}, t: number) => ({
  r: Math.round(c1.r + (c2.r - c1.r) * t),
  g: Math.round(c1.g + (c2.g - c1.g) * t),
  b: Math.round(c1.b + (c2.b - c1.b) * t),
});

// ---------- RK4 (unchanged) ----------
const stepRK4 = (p: Point3D, params: Record<string, number>, ode: any, dt: number): Point3D => {
  const k1 = ode(p, params);
  const p2 = { x: p.x+k1.dx*dt*.5, y: p.y+k1.dy*dt*.5, z: p.z+k1.dz*dt*.5, w: (p.w||0)+(k1.dw||0)*dt*.5 };
  const k2 = ode(p2, params);
  const p3 = { x: p.x+k2.dx*dt*.5, y: p.y+k2.dy*dt*.5, z: p.z+k2.dz*dt*.5, w: (p.w||0)+(k2.dw||0)*dt*.5 };
  const k3 = ode(p3, params);
  const p4 = { x: p.x+k3.dx*dt, y: p.y+k3.dy*dt, z: p.z+k3.dz*dt, w: (p.w||0)+(k3.dw||0)*dt };
  const k4 = ode(p4, params);
  return {
    x: p.x+(k1.dx+2*k2.dx+2*k3.dx+k4.dx)*dt/6,
    y: p.y+(k1.dy+2*k2.dy+2*k3.dy+k4.dy)*dt/6,
    z: p.z+(k1.dz+2*k2.dz+2*k3.dz+k4.dz)*dt/6,
    w: (p.w||0)+((k1.dw||0)+2*(k2.dw||0)+2*(k3.dw||0)+(k4.dw||0))*dt/6,
  };
};

// ---------- Constants ----------
const BUTTERFLY_TRAIL = 8000;
const LYP_EPS = 1e-7;
const LYP_INTERVAL = 60; // report every N frames

// ---------- Component ----------
const Visualizer = React.forwardRef<VisualizerHandle, VisualizerProps>((props, ref) => {
  const {
    attractor, params, isPlaying, simulationSpeed, maxTrailLength,
    particleSize, particleOpacity, zoomLevel,
    showButterfly = false,
    butterflyColor = { r: 0, g: 220, b: 255 },
    projection = '3D',
    onLyapunovUpdate,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  // Expose screenshot via forwardRef + useImperativeHandle
  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      // Must draw to a temp canvas with alpha:true for transparent PNG
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width; tmp.height = canvas.height;
      const ctx2 = tmp.getContext('2d')!;
      ctx2.drawImage(canvas, 0, 0);
      return tmp.toDataURL('image/png');
    },
  }));

  // --- SWARM STATE ---
  const swarmCountRef = useRef(0);
  const xRef = useRef<Float32Array | null>(null);
  const yRef = useRef<Float32Array | null>(null);
  const zRef = useRef<Float32Array | null>(null);
  const wRef = useRef<Float32Array | null>(null);

  // --- BUTTERFLY STATE ---
  const bxRef = useRef<Float32Array | null>(null);
  const byRef = useRef<Float32Array | null>(null);
  const bzRef = useRef<Float32Array | null>(null);

  // --- LYAPUNOV STATE ---
  const lypA   = useRef<Point3D>({ x: 0.1, y: 0.1, z: 0.1 });
  const lypB   = useRef<Point3D>({ x: 0.1+LYP_EPS, y: 0.1, z: 0.1 });
  const lypSum = useRef(0);
  const lypN   = useRef(0);
  const lypF   = useRef(0);

  const revealRef       = useRef(0);
  const paramsRef       = useRef(params);
  const attractorRef    = useRef(attractor);
  const settingsRef     = useRef({ isPlaying, simulationSpeed, maxTrailLength, particleSize, particleOpacity, zoomLevel });
  const showBRef        = useRef(showButterfly);
  const bColorRef       = useRef(butterflyColor);
  const projectionRef   = useRef(projection);
  const lyapCbRef       = useRef(onLyapunovUpdate);

  const rotationRef     = useRef({ x: 0.8, y: 0.6 });
  const isDraggingRef   = useRef(false);
  const lastMouseRef    = useRef({ x: 0, y: 0 });
  const autoRotateRef   = useRef(true);

  const fractalOffsetRef = useRef({ x: 0, y: 0 });
  const fractalZoomMRef  = useRef(1.0);
  const fractalGrowthRef = useRef(0);
  const animTimeRef      = useRef(0);
  const paletteRef       = useRef<{r:Uint8Array,g:Uint8Array,b:Uint8Array}|null>(null);
  const nebulaRef        = useRef<{r:Uint8Array,g:Uint8Array,b:Uint8Array}|null>(null);

  useEffect(() => {
    paramsRef.current     = params;
    attractorRef.current  = attractor;
    settingsRef.current   = { isPlaying, simulationSpeed, maxTrailLength, particleSize, particleOpacity, zoomLevel };
    showBRef.current      = showButterfly;
    bColorRef.current     = butterflyColor;
    projectionRef.current = projection;
    lyapCbRef.current     = onLyapunovUpdate;
  }, [params, attractor, isPlaying, simulationSpeed, maxTrailLength, particleSize, particleOpacity, zoomLevel, showButterfly, butterflyColor, projection, onLyapunovUpdate]);

  // Nebula palette (unchanged logic from original)
  useEffect(() => {
    const size = 1024;
    const rArr = new Uint8Array(size), gArr = new Uint8Array(size), bArr = new Uint8Array(size);
    if (attractor.colors && attractor.colors.length > 1) {
      const colors = attractor.colors.map(hexToRgb);
      const segments = colors.length - 1;
      for (let i = 0; i < size; i++) {
        const t = i / (size - 1);
        const si = Math.floor(t * segments);
        const st = t * segments - si;
        const c1 = colors[Math.min(si, colors.length-1)];
        const c2 = colors[Math.min(si+1, colors.length-1)];
        const f = lerpColor(c1, c2, st);
        rArr[i]=f.r; gArr[i]=f.g; bArr[i]=f.b;
      }
    } else {
      const base = hexToRgb(attractor.color);
      const [h, s] = rgbToHsl(base.r, base.g, base.b);
      for (let i = 0; i < size; i++) {
        const t = i / size;
        const c = hslToRgb(h+Math.sin(t*Math.PI*2)*0.05, s*0.9, 0.3+0.4*Math.pow(Math.sin(t*Math.PI*4),2));
        rArr[i]=c.r; gArr[i]=c.g; bArr[i]=c.b;
      }
    }
    nebulaRef.current = { r: rArr, g: gArr, b: bArr };
  }, [attractor.color, attractor.colors]);

  // Reset on attractor change
  useEffect(() => {
    swarmCountRef.current = 0;
    xRef.current = null;
    bxRef.current = null;
    fractalGrowthRef.current = Math.floor(attractor.defaultParams.iterations?.value || 100);
    revealRef.current = 0;
    const sx = attractor.startPoint?.x || 0.1;
    const sy = attractor.startPoint?.y || 0.1;
    const sz = attractor.startPoint?.z || 0.1;
    lypA.current = { x: sx, y: sy, z: sz };
    lypB.current = { x: sx+LYP_EPS, y: sy, z: sz };
    lypSum.current = 0; lypN.current = 0; lypF.current = 0;
  }, [attractor.id, attractor.startPoint]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    autoRotateRef.current = false;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    if (attractorRef.current.visualizationType === 'fractal') {
      const zoom = (paramsRef.current.zoom || 0.8) * fractalZoomMRef.current;
      const ps = 3.5 / (zoom * Math.min(window.innerWidth, window.innerHeight));
      fractalOffsetRef.current.x -= dx * ps;
      fractalOffsetRef.current.y -= dy * ps;
    } else if (projectionRef.current === '3D') {
      // Only allow rotation in 3D mode
      rotationRef.current.y += dx * 0.005;
      rotationRef.current.x += dy * 0.005;
    }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };
  const handleWheel = (e: React.WheelEvent) => {
    if (attractorRef.current.visualizationType === 'fractal') {
      if (e.deltaY < 0) fractalZoomMRef.current *= 1.1;
      else fractalZoomMRef.current /= 1.1;
    }
  };

  const getFractalPalette = () => {
    if (paletteRef.current) return paletteRef.current;
    const size = 1000;
    const r = new Uint8Array(size), g = new Uint8Array(size), b = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      const t = i / size;
      r[i] = Math.floor(255*(0.5+0.5*Math.sin(6.28*t)));
      g[i] = Math.floor(255*(0.5+0.5*Math.sin(6.28*t+2.0)));
      b[i] = Math.floor(255*(0.5+0.5*Math.sin(6.28*t+4.0)));
    }
    paletteRef.current = { r, g, b };
    return paletteRef.current;
  };

  // ---------- renderFractal — UNCHANGED from original ----------
  const renderFractal = (ctx: CanvasRenderingContext2D, width: number, height: number, effectiveDpr: number) => {
    const params = paramsRef.current;
    const { isPlaying, zoomLevel } = settingsRef.current;
    const baseZoom = params.zoom || 0.8;
    const targetMaxIter = Math.floor(params.iterations || 100);
    if (fractalGrowthRef.current < targetMaxIter) fractalGrowthRef.current += Math.max(1, targetMaxIter/60);
    const maxIter = Math.floor(fractalGrowthRef.current);
    const zoom = baseZoom * fractalZoomMRef.current * zoomLevel;
    const offsetX = (params.centerX || -0.5) + fractalOffsetRef.current.x;
    const offsetY = (params.centerY || 0) + fractalOffsetRef.current.y;
    const cx = width / 2;
    const scale = 3.5 / (zoom * Math.min(width, height));
    const panX = offsetX - cx * scale;
    const panY = offsetY - (height/2) * scale;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    if (isPlaying) animTimeRef.current += 1;
    const colorShift = animTimeRef.current * 3;
    const palette = getFractalPalette();
    for (let py = 0; py < height; py++) {
      const y0 = panY + py * scale;
      let index = py * width * 4;
      for (let px = 0; px < width; px++) {
        const x0 = panX + px * scale;
        let x = 0, y = 0, x2 = 0, y2 = 0, iteration = 0;
        while (x2+y2 <= 4 && iteration < maxIter) {
          y = (x+x)*y+y0; x = x2-y2+x0; x2=x*x; y2=y*y; iteration++;
        }
        if (iteration === maxIter) { data[index++]=0;data[index++]=0;data[index++]=0;data[index++]=255; }
        else {
          const idx = (iteration*10+colorShift)%1000;
          data[index++]=palette.r[idx];data[index++]=palette.g[idx];data[index++]=palette.b[idx];data[index++]=255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  // ---------- renderSwarmMode — original logic + butterfly + lyapunov + projection ----------
  const renderSwarmMode = (ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) => {
    const { isPlaying, simulationSpeed, maxTrailLength, particleSize, particleOpacity, zoomLevel } = settingsRef.current;
    const attractor = attractorRef.current;
    const params    = paramsRef.current;
    const showB     = showBRef.current;
    const bColor    = bColorRef.current;
    const proj      = projectionRef.current;

    ctx.clearRect(0, 0, width, height);
    const count = maxTrailLength;

    // ---- INIT MAIN TRAIL (original unchanged) ----
    if (!xRef.current || xRef.current.length !== count) {
      xRef.current = new Float32Array(count);
      yRef.current = new Float32Array(count);
      zRef.current = new Float32Array(count);
      wRef.current = new Float32Array(count);
      swarmCountRef.current = count;
      const sx = attractor.startPoint?.x || 0.1;
      const sy = attractor.startPoint?.y || 0.1;
      const sz = attractor.startPoint?.z || 0.1;
      let p: Point3D = { x: sx, y: sy, z: sz, w: 0 };
      if (attractor.ode) {
        for (let i = 0; i < count; i++) {
          p = stepRK4(p, params, attractor.ode, 0.01);
          xRef.current[i]=p.x; yRef.current![i]=p.y; zRef.current![i]=p.z; wRef.current![i]=p.w||0;
          if (isNaN(p.x)||Math.abs(p.x)>5000) { p={x:sx,y:sy,z:sz}; p.x+=(Math.random()-.5)*.1; }
        }
      } else if (attractor.map) {
        for (let i = 0; i < count; i++) {
          const next = attractor.map(p, params); p={...next};
          xRef.current[i]=p.x; yRef.current![i]=p.y; zRef.current![i]=p.z;
        }
      }
    }

    // ---- INIT BUTTERFLY TRAIL ----
    if (!bxRef.current) {
      bxRef.current = new Float32Array(BUTTERFLY_TRAIL);
      byRef.current = new Float32Array(BUTTERFLY_TRAIL);
      bzRef.current = new Float32Array(BUTTERFLY_TRAIL);
      const sx = attractor.startPoint?.x || 0.1;
      const sy = attractor.startPoint?.y || 0.1;
      const sz = attractor.startPoint?.z || 0.1;
      let p: Point3D = { x: sx+LYP_EPS, y: sy, z: sz, w: 0 };
      if (attractor.ode) {
        for (let i = 0; i < BUTTERFLY_TRAIL; i++) {
          p = stepRK4(p, params, attractor.ode, 0.01);
          bxRef.current[i]=p.x; byRef.current![i]=p.y; bzRef.current![i]=p.z;
          if (isNaN(p.x)||Math.abs(p.x)>5000) p={x:sx+LYP_EPS, y:sy, z:sz};
        }
      }
    }

    const x=xRef.current!, y=yRef.current!, z=zRef.current!, w=wRef.current!;
    const bx=bxRef.current!, by=byRef.current!, bz=bzRef.current!;

    // ---- REVEAL (original unchanged) ----
    const progress = Math.min(1, revealRef.current/count);
    const dynamicSpeed = Math.max(0.5, (count/1500)*(0.2+0.8*Math.sin(progress*Math.PI/2)));
    if (revealRef.current < count) revealRef.current += dynamicSpeed;
    const drawLimit = Math.min(count, Math.ceil(revealRef.current));

    // ---- PHYSICS UPDATE ----
    if (isPlaying && attractor.ode) {
      const subSteps = 4;
      const totalDt = 0.01 * simulationSpeed * attractor.speedMultiplier;
      const dt = totalDt / subSteps;

      // Main trail (original)
      for (let i = 0; i < count; i++) {
        let p: Point3D = {x:x[i],y:y[i],z:z[i],w:w[i]||0};
        for (let s=0;s<subSteps;s++) p=stepRK4(p,params,attractor.ode,dt);
        x[i]=p.x; y[i]=p.y; z[i]=p.z; w[i]=p.w||0;
        if (isNaN(x[i])||Math.abs(x[i])>5000) {
          const ri=Math.floor(Math.random()*count);
          if (!isNaN(x[ri])) {x[i]=x[ri];y[i]=y[ri];z[i]=z[ri];}
          else {x[i]=attractor.startPoint?.x||0.1;y[i]=attractor.startPoint?.y||0.1;z[i]=attractor.startPoint?.z||0.1;}
        }
      }

      // Butterfly trail
      for (let i=0;i<BUTTERFLY_TRAIL;i++) {
        let p: Point3D={x:bx[i],y:by[i],z:bz[i],w:0};
        for (let s=0;s<subSteps;s++) p=stepRK4(p,params,attractor.ode,dt);
        bx[i]=p.x; by[i]=p.y; bz[i]=p.z;
        if (isNaN(bx[i])||Math.abs(bx[i])>5000) {
          bx[i]=attractor.startPoint?.x||0.1; by[i]=attractor.startPoint?.y||0.1; bz[i]=attractor.startPoint?.z||0.1;
        }
      }

      // Lyapunov exponent — two single-point trackers with renormalisation
      for (let s=0;s<subSteps;s++) {
        lypA.current = stepRK4(lypA.current, params, attractor.ode, dt);
        lypB.current = stepRK4(lypB.current, params, attractor.ode, dt);
      }
      const ddx=lypB.current.x-lypA.current.x;
      const ddy=lypB.current.y-lypA.current.y;
      const ddz=lypB.current.z-lypA.current.z;
      const dist=Math.sqrt(ddx*ddx+ddy*ddy+ddz*ddz);
      if (dist>0&&isFinite(dist)) {
        lypSum.current += Math.log(dist/LYP_EPS);
        lypN.current++;
        const inv=LYP_EPS/dist;
        lypB.current={x:lypA.current.x+ddx*inv,y:lypA.current.y+ddy*inv,z:lypA.current.z+ddz*inv};
      } else {
        lypB.current={x:lypA.current.x+LYP_EPS,y:lypA.current.y,z:lypA.current.z};
      }
      lypF.current++;
      if (lypF.current>=LYP_INTERVAL && lypN.current>0) {
        const lambda=lypSum.current/lypN.current;
        if (isFinite(lambda)) lyapCbRef.current?.(lambda);
        lypF.current=0;
      }
    }

    // ---- RENDER ----
    const cx=width/2, cy=height/2;
    const minDim=Math.min(width,height);
    const scale=(minDim/(attractor.scale||10))*zoomLevel;

    if (proj==='3D' && autoRotateRef.current && isPlaying) rotationRef.current.y+=0.002;

    const rotX=rotationRef.current.x, rotY=rotationRef.current.y;
    const cosY=Math.cos(rotY),sinY=Math.sin(rotY);
    const cosX=Math.cos(rotX),sinX=Math.sin(rotX);
    const fov=minDim*1.5;

    ctx.globalCompositeOperation='lighter';
    const baseSize=Math.max(0.5,particleSize*dpr);
    const nebula=nebulaRef.current;
    const fogDensity=0.05, dofStrength=0.01;
    const headLength=Math.min(3000,count*0.1);
    animTimeRef.current+=1;
    const timeShift=animTimeRef.current*0.0005;

    // Project world→screen. For 2D modes: flat orthographic using the same scale.
    // We re-centre on the attractor's center before projecting, just like 3D.
    const project = (px: number, py: number, pz: number) => {
      const tx=px-attractor.center.x;
      const ty=py-attractor.center.y;
      const tz=pz-attractor.center.z;

      if (proj==='3D') {
        const x1=tx*cosY-tz*sinY;
        const z1=tx*sinY+tz*cosY;
        const y2=ty*cosX-z1*sinX;
        const z2=ty*sinX+z1*cosX;
        if (z2<=-fov*.99) return null;
        const ps=fov/(fov+z2);
        if (ps<=0||ps>=50) return null;
        return { sx:cx+x1*scale*ps, sy:cy+y2*scale*ps, ps, depth:z2 };
      }
      // Flat orthographic — no rotation, no perspective
      // Use same scale as 3D but flat; choose which two axes to display
      let ax: number, ay: number, depth: number;
      if (proj==='XY') { ax=tx; ay=-ty; depth=tz; }
      else if (proj==='XZ') { ax=tx; ay=-tz; depth=ty; }
      else { ax=ty; ay=-tz; depth=tx; } // YZ
      return { sx:cx+ax*scale, sy:cy+ay*scale, ps:1, depth };
    };

    // Draw main trail
    for (let i=0;i<drawLimit;i++) {
      const hit=project(x[i],y[i],z[i]);
      if (!hit) continue;
      const {sx,sy,ps,depth}=hit;
      if (sx<-20||sx>width+20||sy<-20||sy>height+20) continue;

      const fogFactor = proj==='3D' ? Math.exp(-Math.max(0,depth/(attractor.scale*2.5)+0.5)*fogDensity) : 1;
      const dofFactor = proj==='3D' ? 1/(1+(Math.abs(depth)/(attractor.scale*8))*dofStrength) : 1;
      const distHead=drawLimit-i;
      const isHead=distHead<headLength;
      const headBoost=isHead ? 1+(1-distHead/headLength)*3 : 1;
      const alpha=Math.min(1,Math.max(0,particleOpacity*fogFactor*dofFactor*headBoost));
      if (alpha<=0.01) continue;

      let r=255,g=255,b=255;
      if (nebula) {
        const colorIdx=Math.floor(Math.abs((i/count*4+timeShift)*1024)%1024);
        r=nebula.r[colorIdx]; g=nebula.g[colorIdx]; b=nebula.b[colorIdx];
      }
      ctx.fillStyle=`rgba(${r|0},${g|0},${b|0},${alpha})`;
      ctx.beginPath();
      ctx.arc(sx,sy,(baseSize*ps*(isHead?1.5:1))/2,0,Math.PI*2);
      ctx.fill();
    }

    // Draw butterfly trail
    if (showB && attractor.ode) {
      const bLimit=Math.min(BUTTERFLY_TRAIL,Math.ceil(revealRef.current*(BUTTERFLY_TRAIL/count)));
      for (let i=0;i<bLimit;i++) {
        const hit=project(bx[i],by[i],bz[i]);
        if (!hit) continue;
        const {sx,sy,ps}=hit;
        if (sx<-20||sx>width+20||sy<-20||sy>height+20) continue;
        const distHead=bLimit-i;
        const isHead=distHead<500;
        const headBoost=isHead ? 1+(1-distHead/500)*4 : 1;
        const ageFade=i/bLimit;
        const alpha=Math.min(1,Math.max(0,(0.12+0.45*ageFade)*headBoost*particleOpacity));
        if (alpha<=0.01) continue;
        ctx.fillStyle=`rgba(${bColor.r},${bColor.g},${bColor.b},${alpha})`;
        ctx.beginPath();
        ctx.arc(sx,sy,(baseSize*ps*(isHead?1.8:0.8))/2,0,Math.PI*2);
        ctx.fill();
      }
    }
  };

  const render = useCallback(() => {
    const canvas=canvasRef.current;
    if (!canvas) return;
    const ctx=canvas.getContext('2d',{alpha:false});
    if (!ctx) return;
    const dpr=window.devicePixelRatio||1;
    const rect=canvas.getBoundingClientRect();
    const effectiveDpr=attractorRef.current.visualizationType==='fractal'?1:dpr;
    const w=rect.width*effectiveDpr, h=rect.height*effectiveDpr;
    if (canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    if (attractorRef.current.visualizationType==='fractal') renderFractal(ctx,w,h,effectiveDpr);
    else renderSwarmMode(ctx,w,h,effectiveDpr);
    requestRef.current=requestAnimationFrame(render);
  },[]);

  useEffect(()=>{
    requestRef.current=requestAnimationFrame(render);
    return ()=>cancelAnimationFrame(requestRef.current);
  },[render]);

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
});

Visualizer.displayName='Visualizer';
export default Visualizer;