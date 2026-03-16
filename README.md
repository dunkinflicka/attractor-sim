# attractor-sim

Interactive 3D strange attractor simulator — 10 chaotic systems rendered in real time using Runge-Kutta 4 integration, with live parameter control and per-attractor gradient palettes.

---

## Attractors

| Attractor | Equations | Character |
|---|---|---|
| **Lorenz** | σ(y−x), x(ρ−z)−y, xy−βz | Classic butterfly. Sensitive to initial conditions. |
| **Rössler** | −y−z, x+ay, b+z(x−c) | Spiral band folding into a single lobe. |
| **Aizawa** | (z−β)x−δy, δx+(z−β)y, γ+αz−z³/3−... | Sphere-like with axial tube structure. |
| **Chen** | a(y−x), (c−a)x−xz+cy, xy−bz | Lorenz-like but more complex topology. |
| **Halvorsen** | −ax−4y−4z−y², −ay−4z−4x−z², −az−4x−4y−x² | Cyclically symmetric three-winged system. |
| **Dadras** | y−ax+byz, cy−xz+z, dxy−hz | Bow-tie / figure-eight form. |
| **Sprott B** | ayz, x−y, b−xy | Minimal chaotic flow — cylindrical dispersion. |
| **Newton-Leipnik** | −ax+y+10yz, −x−0.4y+5xz, bz−5xy | Double strange attractor — two symmetric chaotic bands. |
| **Rabinovich-Fabrikant** | y(z−1+x²)+γx, x(3z+1−x²)+γy, −2z(α+xy) | Highly sensitive topology. |
| **Cygnus X-1** | −s(x+y), −y−sxz, sxy+v | Burke-Shaw system reframed as an accretion disk. |

---

## How It Works

**Integration:** Each attractor is defined as a system of three ODEs. The simulator advances the particle trajectory using **Runge-Kutta 4 (RK4)**, which gives significantly better accuracy than Euler stepping at the same step size — important for chaotic systems where numerical error compounds exponentially.

**Rendering:** Particles are rendered onto a 2D Canvas with a custom isometric projection. Trail colour is interpolated across a per-attractor multi-stop HSL gradient palette (6–8 stops from void black through the characteristic hue to white), creating the density-shaded appearance where dense regions glow brighter.

**Parameters:** Every ODE parameter is exposed as a live slider. Changing σ on the Lorenz attractor, or α on Rabinovich-Fabrikant, updates the trajectory in real time — the system evolves from its current state rather than resetting.

---

## Controls

| Control | Function |
|---|---|
| Attractor selector | Switch between all 10 systems |
| Play / Pause / Reset | Simulation state |
| Speed | dt multiplier — lower = more detailed trace |
| Trail length | Max particle history points |
| Particle size / opacity | Visual density tuning |
| Zoom | Viewport scale |
| ODE parameters | Per-attractor — see equations above |

---

## Stack

`React` · `TypeScript` · `HTML5 Canvas` · `Runge-Kutta 4` · `Vite`

---

## Setup

```bash
npm install
npm run dev
```

---

## Design Notes

Each attractor has a custom colour palette chosen to match its mathematical character — Lorenz is magma (deep red → orange → white), Newton-Leipnik is vintage wine (plum → magenta → pale pink), Cygnus X-1 is a deep blue-violet singularity palette. Palettes are multi-stop HSL gradients interpolated against trail age, so older segments fade to black and recent segments glow at full saturation.

The Rabinovich-Fabrikant system runs at 0.15× the default speed multiplier by design — it is genuinely highly unstable and diverges rapidly at normal integration speeds.
