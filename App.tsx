import React, { useState, useMemo } from 'react';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';
import { ATTRACTORS } from './constants';

const App: React.FC = () => {
  const [activeAttractorId, setActiveAttractorId] = useState<string>('aizawa');
  
  // Flatten params state: { [key: string]: number }
  const [params, setParams] = useState<Record<string, number>>(() => {
    // Initial load parameters
    const initialParams: Record<string, number> = {};
    const attractor = ATTRACTORS['aizawa'];
    Object.keys(attractor.defaultParams).forEach(key => {
      initialParams[key] = attractor.defaultParams[key].value;
    });
    return initialParams;
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(0.025); // Slow default for detailed observation
  
  // Visual States - Tuned for "Crystal Clear 3D" look
  const [maxTrailLength, setMaxTrailLength] = useState(30000); 
  const [particleSize, setParticleSize] = useState(1.5); 
  const [particleOpacity, setParticleOpacity] = useState(0.5); 

  // Camera / Viewport States
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const activeAttractor = useMemo(() => ATTRACTORS[activeAttractorId], [activeAttractorId]);

  const handleAttractorChange = (id: string) => {
    if (!ATTRACTORS[id]) return;
    setActiveAttractorId(id);
    const newAttractor = ATTRACTORS[id];
    
    const newParams: Record<string, number> = {};
    Object.keys(newAttractor.defaultParams).forEach(key => {
      newParams[key] = newAttractor.defaultParams[key].value;
    });
    setParams(newParams);
    // Reset view
    setZoomLevel(1.0);
    setIsPlaying(true);
  };

  const handleParamChange = (key: string, value: number) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleReset = () => {
     const newParams: Record<string, number> = {};
    Object.keys(activeAttractor.defaultParams).forEach(key => {
      newParams[key] = activeAttractor.defaultParams[key].value;
    });
    setParams(newParams);
    setZoomLevel(1.0);
    setIsPlaying(true);
  };

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden relative font-sans selection:bg-white/20">
      
      {/* Visual Effects Layer */}
      <div className="grain-overlay"></div>

      {/* Background Visualizer - Z-Index 0 */}
      <div className="absolute inset-0 z-0">
        <Visualizer 
          attractor={activeAttractor} 
          params={params} 
          isPlaying={isPlaying}
          simulationSpeed={simulationSpeed}
          maxTrailLength={maxTrailLength}
          particleSize={particleSize}
          particleOpacity={particleOpacity}
          zoomLevel={zoomLevel}
        />
      </div>

      {/* Cinematic Title Overlay (Bottom Left) - Responsive Scaling */}
      <div className="absolute bottom-8 left-6 md:bottom-12 md:left-12 z-10 pointer-events-none max-w-[90%] md:max-w-2xl select-none flex flex-col items-start text-left">
         {/* Title and Attractor Label: Unified sizing logic (same font size) scaled for mobile */}
         <h1 className="text-xl md:text-4xl font-[300] tracking-[0.2em] text-white/90 uppercase mb-4 leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
            {activeAttractor.name.replace(' Attractor', '').replace(' System', '')}
            <span className="font-bold ml-2 md:ml-3 opacity-50">ATTRACTOR</span>
         </h1>
         
         {/* Glass Equation Box: High Blur + Medium Opacity to see colors but block shapes - Scaled for Mobile */}
         <div className="bg-black/50 backdrop-blur-3xl p-4 md:p-8 rounded-md border border-white/10 w-[280px] md:w-[500px] min-h-[60px] md:h-[100px] flex items-center shadow-2xl opacity-50 transition-all duration-300">
            <pre className="text-[10px] md:text-xs font-mono text-gray-200 whitespace-pre-wrap leading-relaxed w-full">
               {activeAttractor.equationDescription}
            </pre>
         </div>
      </div>

      {/* Foreground UI Layer - Z-Index 20. */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        
        {/* Controls Panel (Right) */}
        <Controls 
          attractor={activeAttractor}
          params={params}
          onParamChange={handleParamChange}
          onAttractorChange={handleAttractorChange}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onReset={handleReset}
          simulationSpeed={simulationSpeed}
          onSpeedChange={setSimulationSpeed}
          maxTrailLength={maxTrailLength}
          onMaxTrailLengthChange={setMaxTrailLength}
          particleSize={particleSize}
          onParticleSizeChange={setParticleSize}
          particleOpacity={particleOpacity}
          onParticleOpacityChange={setParticleOpacity}
          zoomLevel={zoomLevel}
          onZoomLevelChange={setZoomLevel}
        />
      </div>

    </div>
  );
};

export default App;