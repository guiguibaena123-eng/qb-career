# Graph Report - qb-career  (2026-10-11)

## Corpus Check
- 87 files · ~160,387 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .webmanifest 1)

## Summary
- 1021 nodes · 3247 edges · 47 communities (32 shown, 15 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05ade36a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- teams.ts
- label
- Player
- getSave
- 7.2 Como trabalhar (uma etapa por vez)
- MatchScene.ts
- package.json
- Sideline.ts
- CombinePasse
- compilerOptions
- combine/ui.ts
- Fx
- grandstand.ts
- Combine40
- DefenseScreen
- config.ts
- PlayerSave.ts
- LiveUi
- QB Career — Ordem de execução no Claude Code
- stage.ts
- KickUi
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- PlayerFace
- 3.2 Combine (com a gameplay dos testes)
- Weather
- MainMenu.ts
- world.ts
- Hud
- Player.ts
- PlayerBody.ts
- manifest.json
- MatchScene
- PlayerBody
- live.ts
- Projection
- CarrierControl
- passing.ts
- Rng
- CombineForca
- title
- billboards.ts
- Intro
- Combine3Cones
- .project
- Ball

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 117 edges
2. `title()` - 77 edges
3. `label()` - 66 edges
4. `phaser` - 58 edges
5. `Player` - 58 edges
6. `GlassButton` - 55 edges
7. `getSave()` - 44 edges
8. `GAME_W` - 35 edges
9. `GAME_H` - 31 edges
10. `vibrate()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Etapa 7 — PERSONALIZAR` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerFace.ts
- `5.4 Rosto dentro do capacete` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerFace.ts
- `5.3 Opções editáveis (`LookOptions`)` --references--> `LookOptions`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerSave.ts
- `Etapa 3 — Criação da carreira` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerBody.ts
- `3.2 Combine (com a gameplay dos testes)` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerBody.ts

## Import Cycles
- None detected.

## Communities (47 total, 15 thin omitted)

### Community 0 - "teams.ts"
Cohesion: 0.15
Nodes (17): applyMatchup(), toConfig(), contrast(), autoUniform(), BY_ID, colorDist(), css(), fgOn() (+9 more)

### Community 1 - "label"
Cohesion: 0.07
Nodes (67): 5.2 Kits travados (`kits.ts`), rng(), build(), BY_ID, CareerTeam, deriveKits(), PHOTO, TeamRepository (+59 more)

### Community 2 - "Player"
Cohesion: 0.15
Nodes (10): Player, LiveEvents, LivePlay, separatePlayers(), arrive(), dist(), nearest(), pursue() (+2 more)

### Community 3 - "getSave"
Cohesion: 0.26
Nodes (4): getSave(), updateSave(), CareerCreate, CombineHub

### Community 4 - "7.2 Como trabalhar (uma etapa por vez)"
Cohesion: 0.40
Nodes (5): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS

### Community 5 - "MatchScene.ts"
Cohesion: 0.14
Nodes (20): FIELD, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS, RouteDef (+12 more)

### Community 6 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 7 - "Sideline.ts"
Cohesion: 0.10
Nodes (29): TEX_PX, AREA, BENCH, fx(), fy(), Side, Sideline, sidelineOptions (+21 more)

### Community 9 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 10 - "combine/ui.ts"
Cohesion: 0.25
Nodes (8): brand(), mix(), primaryButton(), sideButtons(), College, COLLEGES, hexNum(), collegeKit()

### Community 12 - "grandstand.ts"
Cohesion: 0.13
Nodes (23): MATCH_SEED, stadiumOf(), StandModelId, buildRows(), finishTexture(), HAIR, makeBandTexture(), makeRowTexture() (+15 more)

### Community 15 - "config.ts"
Cohesion: 0.06
Nodes (52): phaser, UI_DEPTH, CLOCK_RATE, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, logoKey() (+44 more)

### Community 16 - "PlayerSave.ts"
Cohesion: 0.14
Nodes (23): attrsFromCombine(), clamp(), finalScore(), grade(), gradeColor(), projection(), QB_AVG, qbRanking() (+15 more)

### Community 18 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.14
Nodes (14): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+6 more)

### Community 19 - "stage.ts"
Cohesion: 0.13
Nodes (17): Attempt, forcePanel(), Actor, ActorLook, CombineStage, hexStr(), MID, playerLook() (+9 more)

### Community 22 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.12
Nodes (16): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), 5.1 Layout, 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 0 — REGRAS GLOBAIS, PARTE 2 — DADOS E ESTADO (+8 more)

### Community 23 - "PlayerFace"
Cohesion: 0.25
Nodes (7): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), bustTexture(), faceCell(), PlayerFace

### Community 24 - "3.2 Combine (com a gameplay dos testes)"
Cohesion: 0.40
Nodes (4): 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS

### Community 27 - "MainMenu.ts"
Cohesion: 0.11
Nodes (25): saveMatchConfig(), WeatherChoice, CityPiece, CitySpec, Stadium, STADIUMS, STAND_IDS, STAND_NAMES (+17 more)

### Community 28 - "world.ts"
Cohesion: 0.19
Nodes (9): CAMERA, pickTimeOfDay(), shadowLights(), todInfo, STAND_GAP, frag(), rgb(), StadiumShader (+1 more)

### Community 31 - "Player.ts"
Cohesion: 0.15
Nodes (18): Role, Side, Slot, Attributes, BASE, drawDive(), drawDiveFlat(), drawDiveUp() (+10 more)

### Community 32 - "PlayerBody.ts"
Cohesion: 0.21
Nodes (14): KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite(), key() (+6 more)

### Community 34 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 35 - "MatchScene"
Cohesion: 0.05
Nodes (9): hexStr(), MatchScene, Feedback, vibrate(), groundArrow(), groundArrowHead(), groundPath(), readThrow() (+1 more)

### Community 36 - "PlayerBody"
Cohesion: 0.47
Nodes (3): Etapa 2 — Jogador em camadas e rosto, PlayerBody, topLayers()

### Community 38 - "live.ts"
Cohesion: 0.17
Nodes (11): difficulty, DifficultyDef, Level, LEVELS, ORDER, Phase, Receiver, RouteRunner (+3 more)

### Community 40 - "Projection"
Cohesion: 0.08
Nodes (26): COLORS, g0, g1, p, drawGoalPost(), drawPylon(), p, a (+18 more)

### Community 42 - "passing.ts"
Cohesion: 0.18
Nodes (14): RecvKey, groundOval(), groundRing(), groundSegment(), aimFromDrag(), arcAt(), ballSpeed(), makeThrow() (+6 more)

### Community 43 - "Rng"
Cohesion: 0.16
Nodes (12): RouteKind, blockAssignments(), pickScheme(), readText(), Scheme, SchemeId, SCHEMES, Zone (+4 more)

### Community 47 - "billboards.ts"
Cohesion: 0.27
Nodes (5): SPRITE_SCALE, BillboardLayer, p, q, ShadowLight

### Community 50 - ".project"
Cohesion: 0.22
Nodes (4): FieldRenderer, Grandstand, pointAt(), wallQuad()

### Community 52 - "Ball"
Cohesion: 0.12
Nodes (5): Ball, POSES, Throw, Frame, Replay

## Knowledge Gaps
- **154 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+149 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 266 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `phaser` connect `config.ts` to `PlayerBody.ts`, `label`, `MatchScene.ts`, `package.json`, `Sideline.ts`, `Projection`, `combine/ui.ts`, `grandstand.ts`, `billboards.ts`, `PlayerSave.ts`, `stage.ts`, `MainMenu.ts`, `world.ts`, `Player.ts`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `MatchScene` connect `MatchScene` to `teams.ts`, `Player`, `MatchScene.ts`, `live.ts`, `CarrierControl`, `passing.ts`, `Rng`, `Fx`, `DefenseScreen`, `config.ts`, `Intro`, `LiveUi`, `Ball`, `KickUi`, `Weather`, `MainMenu.ts`, `world.ts`, `Hud`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `title()` connect `title` to `teams.ts`, `label`, `getSave`, `MatchScene`, `MatchScene.ts`, `combine/ui.ts`, `Combine40`, `DefenseScreen`, `config.ts`, `PlayerSave.ts`, `Combine3Cones`, `Intro`, `stage.ts`, `KickUi`, `LiveUi`, `MainMenu.ts`, `Hud`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _154 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `label` be split into smaller, more focused modules?**
  _Cohesion score 0.06739811912225706 - nodes in this community are weakly interconnected._
- **Should `MatchScene.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13538461538461538 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._