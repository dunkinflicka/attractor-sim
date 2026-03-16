import React, { useState, useMemo, useCallback, useRef } from 'react';
import Visualizer, { ProjectionMode, VisualizerHandle } from './components/Visualizer';
import Controls from './components/Controls';
import { ATTRACTORS } from './constants';

// Compute complementary colour: hue-rotate the attractor's primary colour by 180°,
// boost saturation + lightness so it pops on a black background.
// This guarantees maximum contrast against every attractor palette automatically.
const getComplement = (hex: string): { r: number; g: number; b: number } => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 200, b: 255 };
  let r=parseInt(m[1],16)/255, g=parseInt(m[2],16)/255, b=parseInt(m[3],16)/255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h=0, s=0, l=(max+min)/2;
  if (max!==min) {
    const d=max-min;
    s=l>0.5?d/(2-max-min):d/(max+min);
    if (max===r) h=(g-b)/d+(g<b?6:0);
    else if (max===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h/=6;
  }
  // Rotate 180°, force high saturation + lightness for black-bg visibility
  const hC=(h+0.5)%1, sC=Math.max(s,0.75), lC=Math.max(l,0.55);
  const hue2rgb=(p:number,q:number,t:number)=>{
    if(t<0)t+=1;if(t>1)t-=1;
    if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;
  };
  const q=lC<0.5?lC*(1+sC):lC+sC-lC*sC, p=2*lC-q;
  return {
    r:Math.round(hue2rgb(p,q,hC+1/3)*255),
    g:Math.round(hue2rgb(p,q,hC)*255),
    b:Math.round(hue2rgb(p,q,hC-1/3)*255),
  };
};

const PROJECTIONS: ProjectionMode[] = ['3D','XY','XZ','YZ'];

const App: React.FC = () => {
  const [activeAttractorId, setActiveAttractorId] = useState<string>('aizawa');
  const [params, setParams] = useState<Record<string,number>>(() => {
    const p: Record<string,number>={};
    const a=ATTRACTORS['aizawa'];
    Object.keys(a.defaultParams).forEach(k=>{p[k]=a.defaultParams[k].value;});
    return p;
  });

  const [isPlaying, setIsPlaying]       = useState(true);
  const [simulationSpeed, setSimSpeed]  = useState(0.015);
  const [maxTrailLength, setMaxTrail]   = useState(30000);
  const [particleSize, setPSize]        = useState(2.5);
  const [particleOpacity, setPOpacity]  = useState(0.5);
  const [zoomLevel, setZoom]            = useState(1.0);

  // New state
  const [showButterfly, setShowButterfly] = useState(false);
  const [lyapunov, setLyapunov]           = useState<number|null>(null);
  const [projection, setProjection]       = useState<ProjectionMode>('3D');

  // forwardRef handle — gives us takeScreenshot()
  const vizRef = useRef<VisualizerHandle>(null);

  const activeAttractor = useMemo(()=>ATTRACTORS[activeAttractorId],[activeAttractorId]);

  // Complement colour for butterfly — recomputed per attractor
  const butterflyColor = useMemo(()=>getComplement(activeAttractor.color),[activeAttractor.color]);
  const bCss = `rgb(${butterflyColor.r},${butterflyColor.g},${butterflyColor.b})`;

  const handleAttractorChange = (id: string) => {
    if (!ATTRACTORS[id]) return;
    setActiveAttractorId(id);
    const p:Record<string,number>={};
    Object.keys(ATTRACTORS[id].defaultParams).forEach(k=>{p[k]=ATTRACTORS[id].defaultParams[k].value;});
    setParams(p); setZoom(1.0); setIsPlaying(true); setLyapunov(null);
  };
  const handleParamChange=(key:string,value:number)=>{
    setParams(prev=>({...prev,[key]:value})); setLyapunov(null);
  };
  const handleReset=()=>{
    const p:Record<string,number>={};
    Object.keys(activeAttractor.defaultParams).forEach(k=>{p[k]=activeAttractor.defaultParams[k].value;});
    setParams(p); setZoom(1.0); setIsPlaying(true); setLyapunov(null);
  };
  const handleLyapunov = useCallback((v:number)=>setLyapunov(v),[]);

  const handleScreenshot=()=>{
    const dataUrl=vizRef.current?.takeScreenshot();
    if (!dataUrl) return;

    const img=new Image();
    img.onload=()=>{
      const W=img.width, H=img.height;
      const dpr=window.devicePixelRatio||1;

      const tmp=document.createElement('canvas');
      tmp.width=W; tmp.height=H;
      const ctx=tmp.getContext('2d')!;

      // 1. Paint the attractor canvas
      ctx.drawImage(img,0,0);

      // 2. Scale factor — canvas is DPR-scaled, we need to scale text to match
      const s=dpr;

      // 3. Attractor name — bottom left, same cinematic style as UI
      const nameLabel=activeAttractor.name.replace(' Attractor','').replace(' System','').toUpperCase();
      ctx.save();
      ctx.font=`300 ${28*s}px Inter, sans-serif`;
      ctx.letterSpacing=`${2*s}px`;
      ctx.fillStyle='rgba(255,255,255,0.88)';
      ctx.fillText(nameLabel, 48*s, H-120*s);
      // "ATTRACTOR" suffix
      ctx.font=`700 ${28*s}px Inter, sans-serif`;
      ctx.fillStyle='rgba(255,255,255,0.35)';
      const nameW=ctx.measureText(nameLabel+' ').width;
      ctx.fillText('ATTRACTOR', 48*s + nameW, H-120*s);
      ctx.restore();

      // 4. Equation lines — monospace, below name
      const lines=activeAttractor.equationDescription.split('\n');
      ctx.save();
      ctx.font=`${10*s}px "Courier New", monospace`;
      ctx.fillStyle='rgba(209,213,219,0.65)';
      lines.forEach((line,i)=>{
        ctx.fillText(line.trim(), 48*s, H-88*s + i*14*s);
      });
      ctx.restore();

      // 5. Lyapunov badge — top centre
      if (lyapunov!==null && lypInfo) {
        const badge=`${lypInfo.label}   λ = ${lyapunov>=0?'+':''}${lyapunov.toFixed(4)}`;
        ctx.save();
        ctx.font=`600 ${10*s}px Inter, sans-serif`;
        const bW=ctx.measureText(badge).width+32*s;
        const bX=W/2-bW/2, bY=20*s, bH=28*s;
        // pill background
        ctx.fillStyle='rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.roundRect(bX,bY,bW,bH,bH/2);
        ctx.fill();
        // border
        ctx.strokeStyle=lypInfo.color+'55';
        ctx.lineWidth=s;
        ctx.beginPath();
        ctx.roundRect(bX,bY,bW,bH,bH/2);
        ctx.stroke();
        // dot
        ctx.fillStyle=lypInfo.color;
        ctx.beginPath();
        ctx.arc(bX+16*s, bY+bH/2, 3.5*s, 0, Math.PI*2);
        ctx.fill();
        // text
        ctx.fillStyle=lypInfo.color;
        ctx.fillText(lypInfo.label, bX+26*s, bY+bH/2+3.5*s);
        ctx.fillStyle='rgba(255,255,255,0.5)';
        const labelW=ctx.measureText(lypInfo.label+'   ').width;
        ctx.fillText(`λ = ${lyapunov>=0?'+':''}${lyapunov.toFixed(4)}`, bX+26*s+labelW, bY+bH/2+3.5*s);
        ctx.restore();
      }

      // 6. Subtle watermark
      ctx.save();
      ctx.font=`${9*s}px Inter, sans-serif`;
      ctx.fillStyle='rgba(255,255,255,0.18)';
      ctx.textAlign='right';
      ctx.fillText('attractor-sim.vercel.app', W-20*s, H-12*s);
      ctx.restore();

      // 7. Download
      const a=document.createElement('a');
      a.href=tmp.toDataURL('image/png');
      a.download=`${activeAttractor.name.replace(/\s+/g,'-').toLowerCase()}-${Date.now()}.png`;
      a.click();
    };
    img.src=dataUrl;
  };

  const lypInfo = useMemo(()=>{
    if (lyapunov===null) return null;
    if (lyapunov>0.05)   return {label:'CHAOTIC',       color:'#f97316',glow:'rgba(249,115,22,0.3)'};
    if (lyapunov>-0.05)  return {label:'EDGE OF CHAOS', color:'#e2e8f0',glow:'rgba(226,232,240,0.15)'};
    return                      {label:'STABLE',         color:'#22d3ee',glow:'rgba(34,211,238,0.3)'};
  },[lyapunov]);

  return (
    <div className="w-screen h-[100dvh] bg-black text-white overflow-hidden relative font-sans selection:bg-white/20">

      {/* Visual Effects Layer — unchanged */}
      <div className="grain-overlay"></div>

      {/* Background Visualizer — unchanged z-index */}
      <div className="absolute inset-0 z-0">
        <Visualizer
          ref={vizRef}
          attractor={activeAttractor}
          params={params}
          isPlaying={isPlaying}
          simulationSpeed={simulationSpeed}
          maxTrailLength={maxTrailLength}
          particleSize={particleSize}
          particleOpacity={particleOpacity}
          zoomLevel={zoomLevel}
          showButterfly={showButterfly}
          butterflyColor={butterflyColor}
          projection={projection}
          onLyapunovUpdate={handleLyapunov}
        />
      </div>

      {/* ── NEW: Lyapunov badge — top centre ── */}
      {lyapunov!==null && lypInfo && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full"
            style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(16px)',
              border:`1px solid ${lypInfo.color}35`,boxShadow:`0 0 14px ${lypInfo.glow}`}}>
            <span className="w-2 h-2 rounded-full animate-pulse"
              style={{background:lypInfo.color,boxShadow:`0 0 5px ${lypInfo.color}`}}/>
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{color:lypInfo.color}}>
              {lypInfo.label}
            </span>
            <span className="text-[11px] font-mono text-white/50">
              λ = {lyapunov>=0?'+':''}{lyapunov.toFixed(4)}
            </span>
          </div>
        </div>
      )}

      {/* ── NEW: Bottom toolbar — projection + butterfly + screenshot ── */}
      {/* Sits at the very bottom, above the equation box */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">

        {/* Projection selector */}
        <div className="flex items-center rounded-full overflow-hidden"
          style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.08)'}}>
          {PROJECTIONS.map(p=>(
            <button key={p} onClick={()=>setProjection(p)}
              className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold transition-all duration-150 pointer-events-auto"
              style={{
                background:projection===p?'rgba(255,255,255,0.1)':'transparent',
                color:projection===p?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.35)',
              }}>
              {p}
            </button>
          ))}
        </div>

        {/* Butterfly toggle — colour matches complement of current attractor */}
        <button onClick={()=>setShowButterfly(v=>!v)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-semibold transition-all duration-200 pointer-events-auto"
          style={{
            background:showButterfly?`rgba(${butterflyColor.r},${butterflyColor.g},${butterflyColor.b},0.1)`:'rgba(0,0,0,0.55)',
            backdropFilter:'blur(16px)',
            border:showButterfly?`1px solid ${bCss}60`:'1px solid rgba(255,255,255,0.08)',
            color:showButterfly?bCss:'rgba(255,255,255,0.35)',
            boxShadow:showButterfly?`0 0 16px rgba(${butterflyColor.r},${butterflyColor.g},${butterflyColor.b},0.2)`:'none',
          }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12c0-4 3-8 9-8s9 4 9 8-3 8-9 8-9-4-9-8z"/>
            <path d="M12 4c-1.5 3-1.5 13 0 16M3 12h18"/>
          </svg>
          {showButterfly?'butterfly on':'butterfly'}
        </button>

        {/* Screenshot */}
        <button onClick={handleScreenshot}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-semibold transition-all duration-150 pointer-events-auto hover:bg-white/5 active:scale-95"
          style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.35)'}}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          save png
        </button>
      </div>

      {/* Cinematic Title Overlay — IDENTICAL to original, just shifted up slightly for toolbar */}
      <div className="absolute bottom-20 left-5 md:bottom-16 md:left-12 z-10 pointer-events-none w-auto max-w-[85%] md:max-w-2xl select-none flex flex-col items-start text-left">
        <h1 className="text-lg md:text-4xl font-[300] tracking-[0.15em] md:tracking-[0.2em] text-white/90 uppercase mb-3 md:mb-4 leading-tight" style={{fontFamily:'Inter, sans-serif'}}>
          {activeAttractor.name.replace(' Attractor','').replace(' System','')}
          <span className="font-bold ml-2 md:ml-3 opacity-50">ATTRACTOR</span>
        </h1>
        <div className="bg-black/50 backdrop-blur-3xl p-3 md:p-8 rounded-md border border-white/10 w-auto max-w-full md:w-[500px] flex items-center shadow-2xl opacity-50 transition-all duration-300">
          <pre className="text-[9px] md:text-xs font-mono text-gray-200 whitespace-pre-wrap leading-relaxed w-full break-words">
            {activeAttractor.equationDescription}
          </pre>
        </div>
      </div>

      {/* Foreground UI Layer — IDENTICAL to original */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <Controls
          attractor={activeAttractor}
          params={params}
          onParamChange={handleParamChange}
          onAttractorChange={handleAttractorChange}
          isPlaying={isPlaying}
          onTogglePlay={()=>setIsPlaying(!isPlaying)}
          onReset={handleReset}
          simulationSpeed={simulationSpeed}
          onSpeedChange={setSimSpeed}
          maxTrailLength={maxTrailLength}
          onMaxTrailLengthChange={setMaxTrail}
          particleSize={particleSize}
          onParticleSizeChange={setPSize}
          particleOpacity={particleOpacity}
          onParticleOpacityChange={setPOpacity}
          zoomLevel={zoomLevel}
          onZoomLevelChange={setZoom}
        />
      </div>

    </div>
  );
};

export default App;