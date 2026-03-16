# attractor-sim

**[Live Demo → attractor-sim.vercel.app](https://attractor-sim.vercel.app)**

Interactive 3D strange attractor simulator with real-time Lyapunov exponent computation, butterfly effect visualisation, phase space projections, and screenshot export. Chaotic systems rendered using Runge-Kutta 4 integration with live parameter control and per-attractor gradient palettes.

---

## Attractors

| Attractor | Equations | Character |
|---|---|---|
| **Lorenz** | σ(y−x), x(ρ−z)−y, xy−βz | Classic butterfly effect. The canonical strange attractor. |
| **Rössler** | −y−z, x+ay, b+z(x−c) | Spiral band folding into a single lobe. |
| **Aizawa** | (z−β)x−δy, δx+(z−β)y, γ+αz−z³/3−... | Sphere-like structure with axial tube. Ring topology visible in XZ projection. |
| **Chen** | a(y−x), (c−a)x−xz+cy, xy−bz | Lorenz-like topology, more complex attractor structure. |
| **Halvorsen** | −ax−4y−4z−y², −ay−4z−4x−z², −az−4x−4y−x² | Cyclically symmetric three-winged system. |
| **Dadras** | y−ax+byz, cy−xz+z, dxy−hz | Bow-tie / figure-eight form. |
| **Sprott B** | ayz, x−y, b−xy | One of the simplest known chaotic flows. |
| **Newton-Leipnik** | −ax+y+10yz, −x−0.4y+5xz, bz−5xy | Double strange attractor — two symmetric chaotic bands. |
| **Rabinovich-Fabrikant** | y(z−1+x²)+γx, x(3z+1−x²)+γy, −2z(α+xy) | Highly unstable. Extreme sensitivity to initial conditions. |
| **Cygnus X-1** | −s(x+y), −y−sxz, sxy+v | Burke-Shaw system reframed as a stellar accretion disk. |

---

## Features

### Lyapunov Exponent — live computation

The largest Lyapunov exponent λ is computed in real time using a two-point renormalisation scheme. Two trajectories are tracked simultaneously; their separation is measured and logged each frame, then the shadow trajectory is renormalised back to ε = 1×10⁻⁷ distance. The running average converges to the true λ₁.

A badge at the top of the screen shows the current classification:

| State | λ | Colour |
|---|---|---|
| **CHAOTIC** | λ > 0.05 | 🟠 Orange |
| **EDGE OF CHAOS** | \|λ\| ≤ 0.05 | ⬜ Silver-white |
| **STABLE** | λ < −0.05 | 🔵 Cyan |

Lorenz at default parameters registers CHAOTIC (λ ≈ +0.9). Aizawa at default parameters sits at EDGE OF CHAOS (λ ≈ −0.0001). Changing ODE parameters live updates the classification in real time.

---

### Butterfly Effect — sensitive dependence visualised

Toggling **butterfly** spawns a second trajectory starting at `startPoint + {x: 1e-7}` — offset by 0.0000001 in x. Both trajectories evolve under identical equations and parameters.

The shadow trail is rendered in the **complementary colour** of each attractor's primary palette — hue-rotated 180° with boosted saturation and lightness for maximum contrast on a black background. Lorenz (orange) gets a blue shadow. Aizawa (pink) gets a green shadow. The two trails begin indistinguishably close then diverge exponentially, making the butterfly effect geometrically visible rather than metaphorical.

---

### Phase Space Projections

Switch between four views via the bottom toolbar:

| Mode | Axes displayed | Notes |
|---|---|---|
| **3D** | Full perspective | Auto-rotates. Drag to rotate manually. |
| **XY** | x vs y | Flattens depth — shows lobe structure |
| **XZ** | x vs z | Reveals vertical layering — Aizawa ring visible here |
| **YZ** | y vs z | Cyclical view — useful for Halvorsen |

Drag rotation is disabled in 2D modes (no meaningful rotation on a flat projection). Switching projections does not reset the simulation.

---

### Screenshot Export

The **save png** button composites the full scene into a single PNG:

- Full-resolution attractor canvas at device pixel ratio
- Attractor name in the original cinematic typography
- ODE equations in monospace
- Lyapunov badge (if active) baked in with correct colouring
- Subtle watermark: `attractor-sim.vercel.app`

Filename: `{attractor-name}-{timestamp}.png`

---

## How It Works

**Integration:** Each attractor is defined as a system of three coupled ODEs. The simulator advances trajectories using **Runge-Kutta 4 (RK4)** with 4 sub-steps per frame — significantly more accurate than Euler stepping, which diverges rapidly on chaotic systems where numerical error compounds exponentially.

**Rendering:** Particles are drawn onto a 2D Canvas with perspective projection. Trail colour is interpolated across a per-attractor multi-stop HSL gradient palette (6–8 stops from void black through the characteristic hue to white). The `globalCompositeOperation = 'lighter'` blend mode creates the density-shaded glow where trails overlap.

**Lyapunov computation:** Two single-point trackers (`lypA`, `lypB`) run independently from the main trail arrays. Each frame: advance both with RK4 → measure separation → accumulate `log(dist/ε)` → renormalise shadow back to ε distance in the same direction. The running average gives λ₁.

---

## Controls

| Control | Function |
|---|---|
| Attractor selector | Switch between all systems |
| Play / Pause / Reset | Simulation state |
| Speed | dt multiplier — lower = more detailed trace |
| Trail length | Max particle history points |
| Particle size / opacity | Visual density tuning |
| Zoom | Viewport scale |
| ODE parameters | Per-attractor live sliders — Lyapunov resets on change |
| **3D / XY / XZ / YZ** | Phase space projection |
| **Butterfly** | Toggle shadow trajectory from ε offset |
| **Save PNG** | Export composited screenshot |

---

## Stack

`React` · `TypeScript` · `HTML5 Canvas` · `Runge-Kutta 4` · `Vite` · `Vercel`

---

## Setup

```bash
npm install
npm run dev
```

Requires Node 18+.

---

## Design Notes

**Complement colours for butterfly trail:** each attractor's shadow uses the HSL complement of its primary colour, computed at runtime from the `color` field in `constants.ts`. No hardcoded shadow colours — adding a new attractor automatically gets a correct complement.

**Per-attractor palettes:** void black → characteristic hue → white. Multi-stop gradients interpolated against trail position. Lorenz is magma (orange), Aizawa is wild berry (pink), Cygnus X-1 is a deep blue-violet singularity palette.

**Rabinovich-Fabrikant** runs at 0.15× the default speed multiplier — it is genuinely highly unstable and diverges at normal integration speeds.

**Connection to dynamical systems ML:** RK4 integration here is the same class of numerical method used in physics-informed simulation for reinforcement learning — tyre degradation models, fuel consumption curves, weather state Markov chains. Strange attractors are the canonical demonstration of why small errors in initial conditions compound over time, which is exactly why stochastic control problems require Monte Carlo rollout planning rather than single-trajectory forecasting.