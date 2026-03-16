# attractor-sim

**[Live Demo → attractor-sim.vercel.app](https://attractor-sim.vercel.app)**

Interactive 3D strange attractor simulator — chaotic systems rendered in real time using Runge-Kutta 4 integration, with live parameter control, per-attractor gradient palettes, and an AI-powered chaos assistant.

---

## Attractors

| Attractor | Equations | Character |
|---|---|---|
| **Lorenz** | σ(y−x), x(ρ−z)−y, xy−βz | Classic butterfly effect. The canonical strange attractor. |
| **Rössler** | −y−z, x+ay, b+z(x−c) | Spiral band folding into a single lobe. |
| **Aizawa** | (z−β)x−δy, δx+(z−β)y, γ+αz−z³/3−... | Sphere-like structure with axial tube through the centre. |
| **Chen** | a(y−x), (c−a)x−xz+cy, xy−bz | Lorenz-like topology but more complex attractor structure. |
| **Halvorsen** | −ax−4y−4z−y², −ay−4z−4x−z², −az−4x−4y−x² | Cyclically symmetric three-winged system. |
| **Dadras** | y−ax+byz, cy−xz+z, dxy−hz | Bow-tie / figure-eight form. |
| **Sprott B** | ayz, x−y, b−xy | One of the simplest known chaotic flows — cylindrical dispersion. |
| **Newton-Leipnik** | −ax+y+10yz, −x−0.4y+5xz, bz−5xy | Double strange attractor — two symmetric chaotic bands. |
| **Rabinovich-Fabrikant** | y(z−1+x²)+γx, x(3z+1−x²)+γy, −2z(α+xy) | Highly unstable. Complex topology, extreme sensitivity. |
| **Cygnus X-1** | −s(x+y), −y−sxz, sxy+v | Burke-Shaw system reframed as a stellar accretion disk. |

---

## How It Works

**Integration:** Each attractor is defined as a system of three coupled ODEs. The simulator advances the particle trajectory using **Runge-Kutta 4 (RK4)**, which gives significantly better accuracy than Euler stepping at the same step size — critical for chaotic systems where numerical error compounds exponentially.

**Rendering:** Particles are rendered onto a 2D Canvas with a custom isometric projection. Trail colour is interpolated across a per-attractor multi-stop HSL gradient palette (6–8 stops from void black through the characteristic hue to white), creating a density-shaded appearance where dense trajectory regions glow brighter.

**Parameters:** Every ODE parameter is exposed as a live slider. Changing σ on the Lorenz system or α on Rabinovich-Fabrikant updates the trajectory in real time — the system evolves from its current state rather than resetting, so you can watch the attractor deform continuously.

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
| ODE parameters | Per-attractor live sliders |

---

## Stack

`React` · `TypeScript` · `HTML5 Canvas` · `Runge-Kutta 4` · `Vite` · `Vercel`

---

## Setup

```bash
npm install
npm run dev
```

---

## Design Notes

Each attractor has a custom colour palette chosen to match its mathematical character:
- **Lorenz** — magma (void → deep red → orange → white)
- **Aizawa** — wild berry (void → dark fig → mulberry → pale rose)
- **Newton-Leipnik** — vintage wine (void → dark plum → magenta → pale pink)
- **Cygnus X-1** — deep blue-violet singularity (void → midnight → indigo → lavender → white)

Palettes are multi-stop HSL gradients interpolated against trail age — older segments fade to black, recent segments glow at full saturation.

The Rabinovich-Fabrikant system runs at 0.15× the default speed multiplier by design — it is genuinely highly unstable and diverges rapidly at normal integration speeds.

**Connection to dynamical systems ML:** The RK4 integration here is the same class of numerical method used in physics-informed simulation for RL — tyre degradation models, fuel consumption, weather state transitions. Strange attractors are the canonical demonstration of why small errors in initial conditions compound over time, which is exactly the challenge that makes Monte Carlo rollout planning necessary in stochastic control problems.
