# Zom Zoms

Top-down twin-stick zombie swarm shooter prototype. PixiJS v8, started from the
`create-pixi.js` **creation-web** template (Vite + TypeScript + AssetPack).

## Play

```bash
npm install
npm run dev          # http://localhost:8080
npm run build        # production build in dist/
npm run build:embed  # one self-contained file: dist-embed/zom-zoms.html
```

Arrow keys (or WASD) move, the mouse aims, hold left click to shoot. `1` `2` `3`
swap between rifle, shotgun and railgun (debug, to prove the weapon data works).
`R` or click restarts after you get eaten. `Esc` pauses. `?res=1` forces render
resolution 1 on slow machines.

## How it is built

- `src/game/defs/` holds **data**: `zombies.ts` (speed, health, size, mass, bite,
  colours) and `weapons.ts` (fire rate, pellets, spread, damage, **pierce**,
  knockback, recoil, kick, shake, tracer). New kinds are mostly new entries.
- Shooting is **hitscan**: each pellet is a line test against zombie circles,
  sorted closest first, cut off at `pierce` (1 = closest only, `Infinity` = through
  all). Lines stop at walls but pass through gate openings. No bullet objects.
- `src/game/fx/Floor.ts` is one `RenderTexture` the size of the arena. Splats,
  corpses, gore droplets, shell casings and wall scorches are **stamped** into it
  and their sprites go straight back to a pool, so the mess is permanent but the
  sprite count never grows.
- `src/game/systems/ZombieSystem.ts`: steering through the side gates, then towards
  the player; soft crowd separation via `core/SpatialHash.ts`; knockback and
  stagger; bites. `Spawner.ts` ramps the hordes over time.
- `src/game/fx/Effects.ts`: tracers, muzzle flash, impact blooms, sparks, gore,
  casings, screen shake and camera kick. `audio/Sfx.ts` synthesises placeholder
  sounds with Web Audio.
- `src/game/Game.ts` wires the systems together on a fixed 60 Hz step.
  `src/app/screens/GameScreen.ts` hosts it inside the template's navigation;
  `src/embed.ts` hosts the same `Game` with no template, assets, workers or eval.
- All art is generated at start-up (`fx/Textures.ts`); swap in AssetPack sprites
  later without touching gameplay code.

`window.__zom` exposes the running game for debugging and automated play tests.
