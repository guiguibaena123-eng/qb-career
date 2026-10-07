# Graph Report - qb-career  (2026-10-07)

## Corpus Check
- 46 files · ~43,953 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: (none) 1)

## Summary
- 564 nodes · 1566 edges · 20 communities (13 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c14a8415`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- field.ts
- MatchScene
- live.ts
- config.ts
- Weather
- Player.ts
- package.json
- sprites.ts
- Hud
- compilerOptions
- CarrierControl
- Fx
- MatchScene.ts
- LiveUiHandlers
- grandstand.ts
- Sideline.ts
- projection.ts
- Projection
- LiveUi
- GameState

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 114 edges
2. `Player` - 55 edges
3. `label()` - 31 edges
4. `phaser` - 29 edges
5. `GlassButton` - 28 edges
6. `title()` - 28 edges
7. `Projection` - 25 edges
8. `Rng` - 22 edges
9. `vibrate()` - 21 edges
10. `LivePlay` - 19 edges

## Surprising Connections (you probably didn't know these)
- `MatchScene` --references--> `RecvKey`  [EXTRACTED]
  src/scenes/MatchScene.ts → src/data/plays.ts
- `Receiver` --references--> `RecvKey`  [EXTRACTED]
  src/systems/live.ts → src/data/plays.ts
- `Read` --references--> `RecvKey`  [EXTRACTED]
  src/systems/passing.ts → src/data/plays.ts
- `Ball` --references--> `Player`  [EXTRACTED]
  src/entities/Ball.ts → src/entities/Player.ts
- `MatchScene` --references--> `Ball`  [EXTRACTED]
  src/scenes/MatchScene.ts → src/entities/Ball.ts

## Import Cycles
- None detected.

## Communities (20 total, 7 thin omitted)

### Community 0 - "field.ts"
Cohesion: 0.15
Nodes (13): COLORS, drawGoalPost(), drawPylon(), p, a, b, c, d (+5 more)

### Community 1 - "MatchScene"
Cohesion: 0.07
Nodes (9): Player, MatchScene, tipText(), vibrate(), Read, readThrow(), statusOf(), Lane (+1 more)

### Community 2 - "live.ts"
Cohesion: 0.07
Nodes (27): FIELD, blockAssignments(), difficulty, DifficultyDef, Level, LEVELS, ORDER, LiveEvents (+19 more)

### Community 3 - "config.ts"
Cohesion: 0.06
Nodes (30): @fontsource/press-start-2p, @fontsource/silkscreen, phaser, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, matchConfig (+22 more)

### Community 4 - "Weather"
Cohesion: 0.16
Nodes (3): Weather, helmet(), Intro

### Community 5 - "Player.ts"
Cohesion: 0.06
Nodes (31): SPRITE_SCALE, Role, Side, Slot, Ball, g0, p, Attributes (+23 more)

### Community 6 - "package.json"
Cohesion: 0.11
Nodes (17): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+9 more)

### Community 7 - "sprites.ts"
Cohesion: 0.14
Nodes (18): TeamConfig, BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD, HOLD_LEGS, HOLD_TORSO (+10 more)

### Community 9 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 12 - "MatchScene.ts"
Cohesion: 0.06
Nodes (40): CLOCK_RATE, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS, RecvKey (+32 more)

### Community 14 - "grandstand.ts"
Cohesion: 0.15
Nodes (13): AWAY_ROWS, EXITS, Grandstand, HAIR, makeRowTexture(), OTHER, pa, pb (+5 more)

### Community 15 - "Sideline.ts"
Cohesion: 0.22
Nodes (12): MATCH_SEED, AREA, BENCH, fx(), fy(), Side, Sideline, SPRITE_KEYS (+4 more)

### Community 16 - "projection.ts"
Cohesion: 0.23
Nodes (7): CAMERA, BillboardLayer, PLANE, toPlaneX(), rgb(), StadiumShader, World

## Knowledge Gaps
- **85 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+80 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 160 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `live.ts`, `config.ts`, `Weather`, `Player.ts`, `Hud`, `CarrierControl`, `Fx`, `MatchScene.ts`, `projection.ts`, `LiveUi`?**
  _High betweenness centrality (0.243) - this node is a cross-community bridge._
- **Why does `phaser` connect `config.ts` to `field.ts`, `Player.ts`, `package.json`, `sprites.ts`, `MatchScene.ts`, `grandstand.ts`, `Sideline.ts`, `projection.ts`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `Player` connect `MatchScene` to `live.ts`, `CarrierControl`, `MatchScene.ts`, `Player.ts`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `field.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14761904761904762 - nodes in this community are weakly interconnected._
- **Should `MatchScene` be split into smaller, more focused modules?**
  _Cohesion score 0.06641697877652934 - nodes in this community are weakly interconnected._
- **Should `live.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07103825136612021 - nodes in this community are weakly interconnected._