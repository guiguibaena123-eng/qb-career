# Graph Report - qb-career  (2026-10-07)

## Corpus Check
- 80 files · ~147,952 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .webmanifest 1)

## Summary
- 934 nodes · 2841 edges · 46 communities (29 shown, 17 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 89 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05ade36a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- config.ts
- stage.ts
- LivePlay
- MainMenu.ts
- grandstand.ts
- MatchScene.ts
- package.json
- sprites.ts
- Hud
- compilerOptions
- weather.ts
- Fx
- field.ts
- Projection
- MatchScene
- .build
- GameState
- Combine40
- QB Career — Ordem de execução no Claude Code
- CombineBase
- Feedback
- DefenseScreen
- PlayerFace
- LiveUi
- Sideline.ts
- .project
- PARTE 5 — PERSONALIZAR (uniforme travado pelo time)
- daytime.ts
- 7.2 Como trabalhar (uma etapa por vez)
- MeterBar
- PlayerBody.ts
- Ball
- manifest.json
- CombineForca
- CombineStage
- Player.ts
- CarrierControl
- LiveUiHandlers
- ResultCard
- live.ts
- passing.ts
- Combine3Cones
- KickUi
- Intro

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 114 edges
2. `title()` - 64 edges
3. `label()` - 57 edges
4. `Player` - 55 edges
5. `phaser` - 52 edges
6. `GlassButton` - 52 edges
7. `GAME_W` - 31 edges
8. `getSave()` - 31 edges
9. `GAME_H` - 29 edges
10. `Projection` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Etapa 7 — PERSONALIZAR` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerFace.ts
- `5.4 Rosto dentro do capacete` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerFace.ts
- `5.2 Kits travados (`kits.ts`)` --references--> `deriveKits()`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/data/TeamRepository.ts
- `Etapa 3 — Criação da carreira` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerBody.ts
- `3.2 Combine (com a gameplay dos testes)` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerBody.ts

## Import Cycles
- None detected.

## Communities (46 total, 17 thin omitted)

### Community 0 - "config.ts"
Cohesion: 0.07
Nodes (75): phaser, Attempt, forcePanel(), attrsFromCombine(), clamp(), finalScore(), grade(), gradeColor() (+67 more)

### Community 1 - "stage.ts"
Cohesion: 0.16
Nodes (16): ActorLook, College, COLLEGES, hexNum(), BEARD_COUNT, CELL, FACE_COUNT, faceCell() (+8 more)

### Community 2 - "LivePlay"
Cohesion: 0.20
Nodes (7): LivePlay, arrive(), dist(), nearest(), pursue(), seek(), steer()

### Community 3 - "MainMenu.ts"
Cohesion: 0.07
Nodes (38): applyMatchup(), saveMatchConfig(), toConfig(), WeatherChoice, CityPiece, Stadium, STADIUMS, STAND_IDS (+30 more)

### Community 4 - "grandstand.ts"
Cohesion: 0.10
Nodes (31): CitySpec, stadiumOf(), StandModelId, buildRows(), finishTexture(), HAIR, makeBandTexture(), makeRowTexture() (+23 more)

### Community 5 - "MatchScene.ts"
Cohesion: 0.10
Nodes (26): CLOCK_RATE, FIELD, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS (+18 more)

### Community 6 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 7 - "sprites.ts"
Cohesion: 0.11
Nodes (21): TeamConfig, TEX_PX, Uniform, BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 10 - "weather.ts"
Cohesion: 0.12
Nodes (8): matchConfig, ScreenPoint, q, Drop, pickWeather(), Weather, WEATHER_INFO, WeatherKind

### Community 12 - "field.ts"
Cohesion: 0.24
Nodes (10): COLORS, drawGoalPost(), drawPylon(), p, a, b, c, d (+2 more)

### Community 13 - "Projection"
Cohesion: 0.18
Nodes (4): BillboardLayer, ShadowLight, Projection, toPlaneT()

### Community 14 - "MatchScene"
Cohesion: 0.05
Nodes (19): RecvKey, Player, MatchScene, blockAssignments(), pickScheme(), tipText(), vibrate(), groundArrow() (+11 more)

### Community 16 - "GameState"
Cohesion: 0.20
Nodes (3): QUARTER_SECONDS, GameState, QbStats

### Community 18 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.14
Nodes (14): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+6 more)

### Community 22 - "DefenseScreen"
Cohesion: 0.09
Nodes (17): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, 4.1 Miniatura do estádio (foto real pixelada), PARTE 0 — REGRAS GLOBAIS, PARTE 2 — DADOS E ESTADO (+9 more)

### Community 23 - "PlayerFace"
Cohesion: 0.36
Nodes (5): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), PlayerFace

### Community 25 - "Sideline.ts"
Cohesion: 0.19
Nodes (14): MATCH_SEED, AREA, BENCH, fx(), fy(), Side, Sideline, sidelineOptions (+6 more)

### Community 26 - ".project"
Cohesion: 0.21
Nodes (5): FieldRenderer, Grandstand, pointAt(), wallQuad(), toPlaneX()

### Community 27 - "PARTE 5 — PERSONALIZAR (uniforme travado pelo time)"
Cohesion: 0.22
Nodes (9): 5.1 Layout, 5.2 Kits travados (`kits.ts`), 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 5 — PERSONALIZAR (uniforme travado pelo time), KitDef, BodyLook, FaceLook (+1 more)

### Community 28 - "daytime.ts"
Cohesion: 0.17
Nodes (15): CAMERA, CORNERS, pickTimeOfDay(), RGB, shadowLights(), SkyWeather, TimeOfDay, TOD (+7 more)

### Community 29 - "7.2 Como trabalhar (uma etapa por vez)"
Cohesion: 0.40
Nodes (5): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS

### Community 32 - "PlayerBody.ts"
Cohesion: 0.19
Nodes (13): Etapa 2 — Jogador em camadas e rosto, baseLayers(), BODY_H, BODY_SCALE, BODY_W, composite(), key(), Layer (+5 more)

### Community 33 - "Ball"
Cohesion: 0.06
Nodes (21): Ball, g0, g1, p, Pose, POSES, CombinePasse, fillQuad() (+13 more)

### Community 34 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 36 - "CombineStage"
Cohesion: 0.14
Nodes (3): Actor, CombineStage, hexStr()

### Community 38 - "Player.ts"
Cohesion: 0.13
Nodes (16): SPRITE_SCALE, Role, Side, Slot, Attributes, BASE, drawPlayer(), Look (+8 more)

### Community 45 - "live.ts"
Cohesion: 0.24
Nodes (6): difficulty, LiveEvents, Phase, TACKLE_RANGE, TackleResult, tryTackle()

### Community 49 - "passing.ts"
Cohesion: 0.20
Nodes (8): aimFromDrag(), ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG, Status, STATUS_COLOR, RouteRunner

## Knowledge Gaps
- **147 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 255 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `config.ts`, `Ball`, `LivePlay`, `MainMenu.ts`, `MatchScene.ts`, `Hud`, `CarrierControl`, `weather.ts`, `Fx`, `ResultCard`, `Feedback`, `KickUi`, `DefenseScreen`, `Intro`, `LiveUi`, `daytime.ts`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `phaser` connect `config.ts` to `PlayerBody.ts`, `stage.ts`, `Ball`, `MainMenu.ts`, `grandstand.ts`, `MatchScene.ts`, `Player.ts`, `package.json`, `sprites.ts`, `weather.ts`, `field.ts`, `Sideline.ts`, `daytime.ts`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `GlassButton` connect `config.ts` to `stage.ts`, `MainMenu.ts`, `MatchScene.ts`, `MatchScene`, `.build`, `KickUi`, `DefenseScreen`, `Intro`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `config.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06840551181102363 - nodes in this community are weakly interconnected._
- **Should `MainMenu.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06746031746031746 - nodes in this community are weakly interconnected._
- **Should `grandstand.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10336817653890824 - nodes in this community are weakly interconnected._