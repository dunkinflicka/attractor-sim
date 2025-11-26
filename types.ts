
export interface Point3D {
  x: number;
  y: number;
  z: number;
  w?: number; // 4th dimension for higher-order systems
}

export interface Parameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  description: string;
}

export interface AttractorConfig {
  id: string;
  name: string;
  description: string;
  equationDescription: string;
  visualizationType: 'attractor' | 'fractal' | 'map'; // Distinguish between ODEs, Fractals, and Discrete Maps
  defaultParams: Record<string, Parameter>;
  // Function to calculate next state derivatives (dx, dy, dz, dw). Used for 'attractor'.
  ode?: (p: Point3D, params: Record<string, number>) => { dx: number; dy: number; dz: number; dw?: number };
  // Function to calculate next discrete position. Used for 'map'.
  map?: (p: Point3D, params: Record<string, number>) => Point3D;
  scale: number; // Scale factor for visualization
  center: Point3D; // Center point for camera focus
  speedMultiplier: number; // Default speed multiplier
  startPoint?: Point3D; // Optional starting point for the simulation
  color: string; // Primary UI color
  colors?: string[]; // Optional: Multi-stop gradient colors for the particles (e.g. ['#000', '#f00', '#ff0'])
}
