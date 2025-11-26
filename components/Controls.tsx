
import React, { useState } from 'react';
import { AttractorConfig, Parameter } from '../types';
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { ATTRACTORS } from '../constants';

interface ControlsProps {
  attractor: AttractorConfig;
  params: Record<string, number>;
  onParamChange: (key: string, value: number) => void;
  onAttractorChange: (id: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  simulationSpeed: number;
  onSpeedChange: (speed: number) => void;
  maxTrailLength: number;
  onMaxTrailLengthChange: (val: number) => void;
  particleSize: number;
  onParticleSizeChange: (val: number) => void;
  particleOpacity: number;
  onParticleOpacityChange: (val: number) => void;
  zoomLevel: number;
  onZoomLevelChange: (val: number) => void;
}

const SliderControl = ({ label, value, min, max, step, onChange }: any) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 w-12">{label}</label>
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1 h-[2px] bg-gray-700 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
    />
    <span className="text-[10px] text-right w-8 font-mono text-gray-400">{value.toFixed(2)}</span>
  </div>
);

const Controls: React.FC<ControlsProps> = ({
  attractor,
  params,
  onParamChange,
  onAttractorChange,
  isPlaying,
  onTogglePlay,
  onReset,
  simulationSpeed,
  onSpeedChange,
  maxTrailLength,
  onMaxTrailLengthChange,
  particleSize,
  onParticleSizeChange,
  particleOpacity,
  onParticleOpacityChange,
  zoomLevel,
  onZoomLevelChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div 
      className={`pointer-events-auto absolute top-0 right-0 h-full bg-black/80 backdrop-blur-xl border-l border-white/5 shadow-2xl z-20 transition-transform duration-500 ease-in-out ${isCollapsed ? 'translate-x-full' : 'translate-x-0'}`}
      style={{ width: 'var(--sidebar-width)' }}
    >
        {/* Mobile/Desktop Width Variable Helper */}
        <style>{`
          :root {
            --sidebar-width: 85vw;
          }
          @media (min-width: 640px) {
            :root {
              --sidebar-width: 20rem;
            }
          }
        `}</style>

        {/* Toggle Button - Attached to the left side of the sidebar */}
        <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute top-1/2 -left-8 md:-left-8 transform -translate-y-1/2 bg-black/60 backdrop-blur-md border border-r-0 border-white/10 p-2 rounded-l-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none w-8 h-12 flex items-center justify-center md:h-auto"
            title={isCollapsed ? "Expand Settings" : "Collapse Settings"}
        >
            {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

      <div className="h-full w-full flex flex-col gap-6 overflow-y-auto p-5 pb-24 md:p-6">
        
        {/* Header / Title */}
        <div className="flex items-center justify-between">
             <span className="text-xs font-bold text-white tracking-widest uppercase">Configuration</span>
             {/* Mobile Close Button */}
             <button 
               onClick={() => setIsCollapsed(true)}
               className="md:hidden p-1 text-gray-400 hover:text-white transition-colors"
             >
               <X size={16} />
             </button>
        </div>

        {/* Palette / Attractor Selection */}
        <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">System</label>
            <div className="relative">
            <select 
                value={attractor.id} 
                onChange={(e) => onAttractorChange(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-gray-300 text-xs rounded-sm focus:ring-1 focus:ring-white/20 block p-2 outline-none font-mono uppercase cursor-pointer"
            >
                {Object.values(ATTRACTORS).map((a) => (
                <option key={a.id} value={a.id} className="bg-gray-900 text-white border-none py-2">
                    {a.name.toUpperCase()}
                </option>
                ))}
            </select>
            </div>
        </div>

        <hr className="border-white/5" />

        {/* Viewport Settings */}
        <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2 block">Viewport</label>
            <SliderControl 
                label="ZOOM" 
                value={zoomLevel} 
                min={0.1} max={5.0} step={0.01} 
                onChange={onZoomLevelChange} 
            />
        </div>

        <hr className="border-white/5" />

        {/* Visual Settings */}
        <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2 block">Rendering</label>
            <SliderControl 
                label="SPEED" 
                value={simulationSpeed} 
                min={0.1} max={5.0} step={0.1} 
                onChange={onSpeedChange} 
            />
            <SliderControl 
                label="DENSITY" 
                value={maxTrailLength} 
                min={1000} max={100000} step={1000} 
                onChange={onMaxTrailLengthChange} 
            />
            <SliderControl 
                label="SIZE" 
                value={particleSize} 
                min={0.1} max={10.0} step={0.1} 
                onChange={onParticleSizeChange} 
            />
            <SliderControl 
                label="ALPHA" 
                value={particleOpacity} 
                min={0.01} max={1.0} step={0.01} 
                onChange={onParticleOpacityChange} 
            />
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 gap-2">
            <button 
            onClick={onTogglePlay}
            className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-sm transition-all group"
            >
            {isPlaying ? <Pause size={14} className="text-gray-400 group-hover:text-white" /> : <Play size={14} className="text-gray-400 group-hover:text-white" />}
            <span className="text-[10px] uppercase tracking-wider font-semibold group-hover:text-white">{isPlaying ? 'Halt' : 'Run'}</span>
            </button>
        </div>

        <hr className="border-white/5" />

        {/* Parameters */}
        <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Parameters</label>
            </div>
            
            {(Object.entries(attractor.defaultParams) as [string, Parameter][]).map(([key, config]) => {
            const val = params[key] ?? config.value;
            return (
                <div key={key} className="flex items-center justify-between gap-4 py-1">
                <span className="text-xs font-serif text-gray-400 w-6" title={config.name}>{config.name.split(' ')[0]}</span>
                <input 
                    type="range" 
                    min={config.min} 
                    max={config.max} 
                    step={config.step} 
                    value={val}
                    onChange={(e) => onParamChange(key, parseFloat(e.target.value))}
                    className="flex-1 h-[2px] bg-gray-700 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-400 [&::-webkit-slider-thumb]:hover:bg-white"
                />
                <span className="text-[10px] text-right w-8 font-mono text-gray-500">{val.toFixed(2)}</span>
                </div>
            );
            })}
            
            <div className="pt-4">
                <button 
                    onClick={onReset} 
                    className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-sm transition-colors text-gray-400 hover:text-white group"
                >
                    <RotateCcw size={12} className="group-hover:-rotate-180 transition-transform duration-500" />
                    <span className="text-[10px] uppercase tracking-widest font-semibold">Reset System</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;
