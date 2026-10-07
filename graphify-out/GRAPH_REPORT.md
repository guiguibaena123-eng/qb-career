# Graph Report - qb-career  (2026-10-07)

## Corpus Check
- 49 files · ~73,528 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: (none) 1)

## Summary
- 593 nodes · 1720 edges · 30 communities (18 shown, 12 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6d5a24a6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Projection
- MatchScene
- Player
- MatchScene.ts
- Rng
- passing.ts
- package.json
- sprites.ts
- Hud
- compilerOptions
- CarrierControl
- Fx
- groundfx.ts
- LiveUiHandlers
- grandstand.ts
- Sideline.ts
- projection.ts
- MainMenu.ts
- LiveUi
- Player.ts
- plays.ts
- vibrate
- live.ts
- .update
- .updateCarry
- RecvKey
- .buildLive
- .startKick
- Feedback
- FIELD

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 114 edges
2. `Player` - 55 edges
3. `label()` - 34 edges
4. `phaser` - 31 edges
5. `GlassButton` - 31 edges
6. `title()` - 30 edges
7. `Projection` - 27 edges
8. `Rng` - 22 edges
9. `vibrate()` - 21 edges
10. `LivePlay` - 19 edges

## Surprising Connections (you probably didn't know these)
- `MatchScene` --references--> `RecvKey`  [EXTRACTED]
  src/scenes/MatchScene.ts → src/data/plays.ts
- `Scheme` --references--> `RecvKey`  [EXTRACTED]
  src/systems/ai.ts → src/data/plays.ts
- `Read` --references--> `RecvKey`  [EXTRACTED]
  src/systems/passing.ts → src/data/plays.ts
- `Ball` --references--> `Player`  [EXTRACTED]
  src/entities/Ball.ts → src/entities/Player.ts
- `MatchScene` --references--> `Ball`  [EXTRACTED]
  src/scenes/MatchScene.ts → src/entities/Ball.ts

## Import Cycles
- None detected.

## Communities (30 total, 12 thin omitted)

### Community 0 - "Projection"
Cohesion: 0.13
Nodes (11): COLORS, drawGoalPost(), drawPylon(), p, a, b, c, d (+3 more)

### Community 2 - "Player"
Cohesion: 0.16
Nodes (3): Player, LiveEvents, LivePlay

### Community 3 - "MatchScene.ts"
Cohesion: 0.07
Nodes (36): phaser, CLOCK_RATE, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, MATCH_SEED, matchConfig (+28 more)

### Community 4 - "Rng"
Cohesion: 0.12
Nodes (5): pickScheme(), simulateDrive(), Rng, Weather, Intro

### Community 5 - "passing.ts"
Cohesion: 0.08
Nodes (19): Ball, g0, p, Pose, POSES, aimFromDrag(), arcAt(), ballSpeed() (+11 more)

### Community 6 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 7 - "sprites.ts"
Cohesion: 0.13
Nodes (19): TeamConfig, TEX_PX, Uniform, BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD (+11 more)

### Community 9 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 12 - "groundfx.ts"
Cohesion: 0.24
Nodes (10): a, b, c, d, groundArrow(), groundArrowHead(), groundOval(), groundPath() (+2 more)

### Community 14 - "grandstand.ts"
Cohesion: 0.14
Nodes (14): AWAY_ROWS, EXITS, Grandstand, HAIR, makeRowTexture(), OTHER, pa, pb (+6 more)

### Community 15 - "Sideline.ts"
Cohesion: 0.17
Nodes (16): AREA, BENCH, fx(), fy(), Side, Sideline, SKINS, SPRITE_KEYS (+8 more)

### Community 16 - "projection.ts"
Cohesion: 0.26
Nodes (6): CAMERA, PLANE, toPlaneX(), rgb(), StadiumShader, World

### Community 17 - "MainMenu.ts"
Cohesion: 0.12
Nodes (23): applyMatchup(), logoKey(), saveMatchConfig(), toConfig(), WeatherChoice, autoUniform(), BY_ID, colorDist() (+15 more)

### Community 19 - "Player.ts"
Cohesion: 0.17
Nodes (13): SPRITE_SCALE, Side, Slot, Attributes, BASE, drawPlayer(), Look, makePlayerTexture() (+5 more)

### Community 20 - "plays.ts"
Cohesion: 0.12
Nodes (13): FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS, Role, RouteDef (+5 more)

### Community 22 - "live.ts"
Cohesion: 0.18
Nodes (13): RouteKind, blockAssignments(), readText(), Scheme, SchemeId, SCHEMES, tipText(), Zone (+5 more)

### Community 24 - ".updateCarry"
Cohesion: 0.40
Nodes (6): arrive(), dist(), nearest(), pursue(), seek(), steer()

### Community 29 - "FIELD"
Cohesion: 0.50
Nodes (4): FIELD, bestLane(), Lane, segDist()

## Knowledge Gaps
- **86 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+81 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 161 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `Player`, `MatchScene.ts`, `Rng`, `passing.ts`, `Hud`, `CarrierControl`, `Fx`, `groundfx.ts`, `projection.ts`, `MainMenu.ts`, `LiveUi`, `vibrate`, `live.ts`, `.update`, `RecvKey`, `.buildLive`, `.startKick`, `Feedback`, `FIELD`?**
  _High betweenness centrality (0.235) - this node is a cross-community bridge._
- **Why does `phaser` connect `MatchScene.ts` to `Projection`, `passing.ts`, `package.json`, `sprites.ts`, `groundfx.ts`, `grandstand.ts`, `Sideline.ts`, `projection.ts`, `MainMenu.ts`, `Player.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `Player` connect `Player` to `MatchScene`, `MatchScene.ts`, `passing.ts`, `CarrierControl`, `groundfx.ts`, `Player.ts`, `plays.ts`, `vibrate`, `live.ts`, `.update`, `.updateCarry`, `RecvKey`, `.buildLive`, `FIELD`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _86 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Projection` be split into smaller, more focused modules?**
  _Cohesion score 0.12962962962962962 - nodes in this community are weakly interconnected._
- **Should `MatchScene` be split into smaller, more focused modules?**
  _Cohesion score 0.13257575757575757 - nodes in this community are weakly interconnected._
- **Should `MatchScene.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06910866910866911 - nodes in this community are weakly interconnected._