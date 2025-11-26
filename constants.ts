
import { AttractorConfig, Point3D } from './types';

export const ATTRACTORS: Record<string, AttractorConfig> = {
  lorenz: {
    id: 'lorenz',
    name: 'Lorenz Attractor',
    description: 'The classic butterfly effect attractor. A system of ordinary differential equations first studied by Edward Lorenz.',
    equationDescription: 'dx/dt = σ(y - x)\ndy/dt = x(ρ - z) - y\ndz/dt = xy - βz',
    visualizationType: 'attractor',
    scale: 13.0,
    center: { x: 0, y: 0, z: 25 },
    speedMultiplier: 1.0,
    startPoint: { x: 0.1, y: 0.1, z: 0.1 },
    color: '#ea580c', 
    colors: ['#000000', '#450a0a', '#991b1b', '#ea580c', '#fdba74', '#ffffff'], // Magma: Void -> Deep Red -> Red -> Orange -> Peach -> White
    defaultParams: {
      sigma: { name: 'σ (Sigma)', value: 10, min: 0, max: 20, step: 0.1, description: 'Prandtl number' },
      rho: { name: 'ρ (Rho)', value: 28, min: 0, max: 100, step: 0.1, description: 'Rayleigh number' },
      beta: { name: 'β (Beta)', value: 2.667, min: 0, max: 10, step: 0.001, description: 'Geometric factor' },
    },
    ode: (p: Point3D, params: Record<string, number>) => {
      const { sigma, rho, beta } = params;
      return {
        dx: sigma * (p.y - p.x),
        dy: p.x * (rho - p.z) - p.y,
        dz: p.x * p.y - beta * p.z
      };
    }
  },
  aizawa: {
    id: 'aizawa',
    name: 'Aizawa Attractor',
    description: 'A system with a stunning sphere-like shape and a tube-like structure through the axis.',
    equationDescription: 'dx/dt = (z - β)x - δy\ndy/dt = δx + (z - β)y\ndz/dt = γ + αz - z³/3 - (x² + y²)(1 + εz) + ζzx³',
    visualizationType: 'attractor',
    scale: 0.9, 
    center: { x: 0, y: 0, z: 0.5 },
    speedMultiplier: 1.5,
    startPoint: { x: 0.1, y: 0, z: 0 },
    color: '#be185d', 
    colors: ['#000000', '#260815', '#500724', '#831843', '#bc5885', '#fce7f3'], // Wild Berry: Void -> Dark Fig -> Deep Plum -> Mulberry -> Antique Pink -> Pale Rose
    defaultParams: {
      a: { name: 'α (Alpha)', value: 0.95, min: 0, max: 1.5, step: 0.01, description: 'Linear z term' },
      b: { name: 'β (Beta)', value: 0.7, min: 0, max: 1.5, step: 0.01, description: 'Linear x,y term' },
      c: { name: 'γ (Gamma)', value: 0.6, min: 0, max: 1.5, step: 0.01, description: 'Constant z term' },
      d: { name: 'δ (Delta)', value: 3.5, min: 0, max: 5.0, step: 0.01, description: 'Rotation speed' },
      e: { name: 'ε (Epsilon)', value: 0.25, min: 0, max: 1.0, step: 0.01, description: 'Coupling term' },
      f: { name: 'ζ (Zeta)', value: 0.1, min: 0, max: 1.0, step: 0.01, description: 'Cubic damping' },
    },
    ode: (p: Point3D, params: Record<string, number>) => {
      const { a, b, c, d, e, f } = params;
      const x2 = p.x * p.x;
      const y2 = p.y * p.y;
      const z3 = p.z * p.z * p.z;
      const x3 = p.x * p.x * p.x;
      return {
        dx: (p.z - b) * p.x - d * p.y,
        dy: d * p.x + (p.z - b) * p.y,
        dz: c + a * p.z - (z3 / 3) - (x2 + y2) * (1 + e * p.z) + f * p.z * x3
      };
    }
  },
  halvorsen: {
    id: 'halvorsen',
    name: 'Halvorsen Attractor',
    description: 'A cyclically symmetric strange attractor described by Halvorsen.',
    equationDescription: 'dx/dt = -ax - 4y - 4z - y²\ndy/dt = -ay - 4z - 4x - z²\ndz/dt = -az - 4x - 4y - x²',
    visualizationType: 'attractor',
    scale: 5.0,
    center: { x: -1.5, y: -1.5, z: -1.5 },
    speedMultiplier: 0.6,
    startPoint: { x: 1, y: 0, z: 0 },
    color: '#ca8a04', 
    colors: ['#000000', '#271a0c', '#713f12', '#a16207', '#ca8a04', '#fef08a'], // Old Gold: Void -> Deep Brown -> Saddle Brown -> Gold -> Bright Gold -> Pale Yellow
    defaultParams: {
      a: { name: 'a', value: 1.4, min: 1, max: 2, step: 0.01, description: 'Damping parameter' }
    },
    ode: (p: Point3D, params: Record<string, number>) => {
      const a = params.a;
      return {
        dx: -a * p.x - 4 * p.y - 4 * p.z - p.y * p.y,
        dy: -a * p.y - 4 * p.z - 4 * p.x - p.z * p.z,
        dz: -a * p.z - 4 * p.x - 4 * p.y - p.x * p.x
      };
    }
  },
  sprottB: {
    id: 'sprottB',
    name: 'Sprott B',
    description: 'One of the simplest chaotic flows found by J.C. Sprott. It generates a beautiful cylindrical particle dispersion.',
    equationDescription: 'dx/dt = ayz\ndy/dt = x - y\ndz/dt = b - xy',
    visualizationType: 'attractor',
    scale: 1.2,
    center: { x: 0, y: 0, z: 0 },
    speedMultiplier: 1.2,
    startPoint: { x: 0.1, y: 0.1, z: 0.1 },
    color: '#be123c', 
    colors: ['#000000', '#4c0519', '#881337', '#be123c', '#fb7185', '#fff1f2'], // Dried Blood: Void -> Dark Maroon -> Crimson -> Rose -> Pink -> White
    defaultParams: {
      a: { name: 'a', value: 0.4, min: 0, max: 1, step: 0.01, description: 'Parameter a' },
      b: { name: 'b', value: 1.2, min: 0, max: 2, step: 0.01, description: 'Parameter b' },
    },
    ode: (p: Point3D, params: Record<string, number>) => {
      const { a, b } = params;
      return {
        dx: a * p.y * p.z,
        dy: p.x - p.y,
        dz: b - p.x * p.y
      };
    }
  },
  rossler: {
    id: 'rossler',
    name: 'Rössler Attractor',
    description: 'The Rössler attractor is the attractor for the Rössler system, a system of three non-linear ordinary differential equations.',
    equationDescription: 'dx/dt = -y - z\ndy/dt = x + ay\ndz/dt = b + z(x - c)',
    visualizationType: 'attractor',
    scale: 12.0,
    center: { x: 0, y: 0, z: 2.0 },
    speedMultiplier: 1.0,
    color: '#c2410c',
    colors: ['#000000', '#2a1b15', '#7c2d12', '#c2410c', '#fdba74', '#ffffff'], // Rust & Bone: Void -> Dark Brown -> Rust -> Deep Orange -> Peach -> White
    defaultParams: {
      a: { name: 'a', value: 0.2, min: 0, max: 1, step: 0.01, description: 'Influence of y on dy' },
      b: { name: 'b', value: 0.2, min: 0, max: 2, step: 0.01, description: 'Constant offset for dz' },
      c: { name: 'c', value: 5.7, min: 0, max: 20, step: 0.1, description: 'Threshold for z' },
    },
    ode: (p: Point3D, params: Record<string, number>) => {
      const a = params.a;
      const b = params.b;
      const c = params.c;
      return {
        dx: -p.y - p.z,
        dy: p.x + a * p.y,
        dz: b + p.z * (p.x - c)
      };
    }
  },
  dadras: {
    id: 'dadras',
    name: 'Dadras Attractor',
    description: 'A chaotic system that generates a unique "bow tie" or figure-eight shape.',
    equationDescription: 'dx/dt = y - ax + byz\ndy/dt = cy - xz + z\ndz/dt = dxy - hz',
    visualizationType: 'attractor',
    scale: 5.5,
    center: { x: 0, y: 0, z: 0 },
    speedMultiplier: 1.0,
    startPoint: { x: 1.1, y: 2.1, z: -2.0 },
    color: '#525252',
    colors: ['#000000', '#171717', '#404040', '#525252', '#a3a3a3', '#e5e5e5'], // Obsidian: Void -> Jet Black -> Charcoal -> Dark Grey -> Light Grey -> White
    defaultParams: {
      a: { name: 'a', value: 3, min: 1, max: 5, step: 0.1, description: 'Parameter a' },
      b: { name: 'b', value: 2.7, min: 1, max: 5, step: 0.1, description: 'Parameter b' },
      c: { name: 'c', value: 1.7, min: 1, max: 5, step: 0.1, description: 'Parameter c' },
      d: { name: 'd', value: 2, min: 1, max: 5, step: 0.1, description: 'Parameter d' },
      h: { name: 'h', value: 9, min: 5, max: 15, step: 0.1, description: 'Parameter h' },
    },
    ode: (p: Point3D, params: Record<string, number>) => {
      return {
        dx: p.y - params.a * p.x + params.b * p.y * p.z,
        dy: params.c * p.y - p.x * p.z + p.z,
        dz: params.d * p.x * p.y - params.h * p.z
      };
    }
  },
  chen: {
    id: 'chen',
    name: 'Chen Attractor',
    description: 'The Chen system is a chaotic system that shares some similarities with the Lorenz system but has a more complex topological structure.',
    equationDescription: 'dx/dt = a(y - x)\ndy/dt = (c - a)x - xz + cy\ndz/dt = xy - bz',
    visualizationType: 'attractor',
    scale: 18.0,
    center: { x: 0, y: 0, z: 22 },
    speedMultiplier: 0.8,
    color: '#b45309',
    colors: ['#000000', '#271206', '#78350f', '#b45309', '#d6d3d1', '#ffffff'], // Polished Copper: Void -> Dark Wood -> Bronze -> Copper -> Grey-White -> White
    defaultParams: {
      a: { name: 'a', value: 35, min: 0, max: 50, step: 0.1, description: 'Parameter a' },
      b: { name: 'b', value: 3, min: 0, max: 10, step: 0.1, description: 'Parameter b' },
      c: { name: 'c', value: 28, min: 0, max: 100, step: 0.1, description: 'Parameter c' },
    },
    ode: (p: Point3D, params: Record<string, number>) => {
      const a = params.a;
      const b = params.b;
      const c = params.c;
      return {
        dx: a * (p.y - p.x),
        dy: (c - a) * p.x - p.x * p.z + c * p.y,
        dz: p.x * p.y - b * p.z
      };
    }
  },
  newtonLeipnik: {
    id: 'newtonLeipnik',
    name: 'Newton-Leipnik',
    description: 'A double strange attractor that features two symmetric chaotic bands.',
    equationDescription: 'dx/dt = -ax + y + 10yz\ndy/dt = -x - 0.4y + 5xz\ndz/dt = bz - 5xy',
    visualizationType: 'attractor',
    scale: 0.35,
    center: { x: 0, y: 0, z: 0 },
    speedMultiplier: 0.8,
    startPoint: { x: 0.349, y: 0, z: -0.160 },
    color: '#701a75',
    colors: ['#000000', '#2e0209', '#4a044e', '#701a75', '#d946ef', '#f5d0fe'], // Vintage Wine: Void -> Dark Plum -> Mulberry -> Magenta -> Pink -> Pale Pink
    defaultParams: {
        a: { name: 'a', value: 0.4, min: 0, max: 1, step: 0.01, description: 'Parameter a' },
        b: { name: 'b', value: 0.175, min: 0, max: 1, step: 0.001, description: 'Parameter b' }
    },
    ode: (p: Point3D, params: Record<string, number>) => {
      return {
        dx: -params.a * p.x + p.y + 10 * p.y * p.z,
        dy: -p.x - 0.4 * p.y + 5 * p.x * p.z,
        dz: params.b * p.z - 5 * p.x * p.y
      };
    }
  },
  rabinovichFabrikant: {
    id: 'rabinovichFabrikant',
    name: 'Rabinovich-Fabrikant',
    description: 'Known for its complex topology and sensitivity. Highly unstable.',
    equationDescription: 'dx/dt = y(z - 1 + x²) + γx\ndy/dt = x(3z + 1 - x²) + γy\ndz/dt = -2z(α + xy)',
    visualizationType: 'attractor',
    scale: 0.4, 
    center: { x: 0, y: 0, z: 0.5 },
    speedMultiplier: 0.15,
    startPoint: { x: -0.1, y: 1.0, z: 0.1 }, 
    color: '#f59e0b',
    colors: ['#000000', '#451a03', '#92400e', '#d97706', '#f59e0b', '#fef3c7'], // Ember: Void -> Burnt Wood -> Rust -> Orange -> Amber -> Pale Yellow
    defaultParams: {
        alpha: { name: 'α', value: 0.14, min: 0, max: 2, step: 0.01, description: 'Alpha' },
        gamma: { name: 'γ', value: 0.1, min: 0, max: 1, step: 0.01, description: 'Gamma' }
    },
    ode: (p: Point3D, params: Record<string, number>) => {
      const x2 = p.x * p.x;
      return {
        dx: p.y * (p.z - 1 + x2) + params.gamma * p.x,
        dy: p.x * (3 * p.z + 1 - x2) + params.gamma * p.y,
        dz: -2 * p.z * (params.alpha + p.x * p.y)
      };
    }
  },
  ikeda: {
    id: 'ikeda',
    name: 'Ikeda Map',
    description: 'A discrete-time dynamical system that models light circulating in a non-linear optical resonator.',
    equationDescription: 't = 0.4 - 6/(1 + x² + y²)\nx_next = 1 + u(x cos t - y sin t)\ny_next = u(x sin t + y cos t)',
    visualizationType: 'map',
    scale: 0.8,
    center: { x: 0, y: 0, z: 0 },
    speedMultiplier: 1.0, 
    startPoint: { x: 0, y: 0, z: 0 },
    color: '#a8a29e',
    colors: ['#000000', '#1c1917', '#44403c', '#78716c', '#d6d3d1', '#f5f5f4'], // Desert Sand: Void -> Dark Earth -> Taupe -> Beige -> Sand -> Off White
    defaultParams: {
      u: { name: 'u', value: 0.9, min: 0.6, max: 1.0, step: 0.01, description: 'Parameter u' }
    },
    map: (p: Point3D, params: Record<string, number>) => {
      const u = params.u;
      const t = 0.4 - 6 / (1 + p.x * p.x + p.y * p.y);
      return {
        x: 1 + u * (p.x * Math.cos(t) - p.y * Math.sin(t)),
        y: u * (p.x * Math.sin(t) + p.y * Math.cos(t)),
        z: p.z 
      };
    }
  },
  henonHeiles: {
    id: 'henonHeiles',
    name: 'Hénon-Heiles System',
    description: 'A Hamiltonian system originally describing the motion of a star around a galactic center.',
    equationDescription: 'dx/dt = px, dy/dt = py\ndpx/dt = -x - 2xy\ndpy/dt = -y - (x² - y²)',
    visualizationType: 'attractor',
    scale: 0.4, 
    center: { x: 0, y: 0, z: 0 },
    speedMultiplier: 0.5, 
    startPoint: { x: 0, y: 0, z: 0, w: 0.3 }, 
    color: '#991b1b',
    colors: ['#000000', '#200505', '#450a0a', '#7f1d1d', '#991b1b', '#d1d5db'], // Crimson Ghost: Void -> Very Dark Red -> Blood Red -> Dark Red -> Red -> Grey
    defaultParams: {
      energy: { name: 'E (Scaling)', value: 1.0, min: 0.1, max: 2.0, step: 0.1, description: 'Scaling Factor' }
    },
    ode: (p: Point3D, params: Record<string, number>) => {
      const px = p.z;
      const py = p.w || 0;
      return {
        dx: px,
        dy: py,
        dz: -p.x - 2 * p.x * p.y, 
        dw: -p.y - (p.x * p.x - p.y * p.y) 
      };
    }
  },
  thorneZytkow: {
    id: 'thorneZytkow',
    name: 'Gumowski-Mira Map',
    description: 'A map generating star-like or galaxy structures often associated with astrophysical chaos.',
    equationDescription: 'x_next = y + ay(1 - 0.05y²) + f(x)\ny_next = -x + f(x_next)',
    visualizationType: 'map',
    scale: 8.0, 
    center: { x: -1, y: 0, z: 0 },
    speedMultiplier: 2.0,
    startPoint: { x: 1, y: 1, z: 0 },
    color: '#b91c1c',
    colors: ['#000000', '#2d1810', '#7c2d12', '#b91c1c', '#fdba74', '#ffffff'], // Baked Clay: Void -> Dark Clay -> Rust -> Terra Cotta -> Light Peach -> White
    defaultParams: {
      a: { name: 'a', value: 0.009, min: -0.01, max: 0.02, step: 0.0001, description: 'Parameter a' },
      mu: { name: 'μ', value: -0.48, min: -1, max: 1, step: 0.01, description: 'Parameter mu' },
    },
    map: (p: Point3D, params: Record<string, number>) => {
      const { a, mu } = params;
      const f = (val: number) => mu * val + (2 * (1 - mu) * val * val) / (1 + val * val);
      
      const x_n = p.x;
      const y_n = p.y;
      
      const x_next = y_n + a * y_n * (1 - 0.05 * y_n * y_n) + f(x_n);
      const y_next = -x_n + f(x_next);
      
      return { x: x_next, y: y_next, z: 0 };
    }
  }
};
