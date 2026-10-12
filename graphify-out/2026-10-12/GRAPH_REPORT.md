# Graph Report - qb-career  (2026-10-11)

## Corpus Check
- 90 files · ~167,563 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .webmanifest 1)

## Summary
- 1086 nodes · 3478 edges · 58 communities (37 shown, 21 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b3bcb1e9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- teams.ts
- draft/ui.ts
- Player
- title
- GameState
- MatchScene.ts
- package.json
- Sideline.ts
- CombinePasse
- compilerOptions
- DraftEscolhido.ts
- Fx
- grandstand.ts
- Combine40
- DefenseScreen
- config.ts
- stage.ts
- LiveUi
- QB Career — Ordem de execução no Claude Code
- CarreiraMenu
- KickUi
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- PlayerFace
- PlayerBody
- vibrate
- projection.ts
- getSave
- daytime.ts
- .buildBottom
- Hud
- Player.ts
- PlayerBody.ts
- groundfx.ts
- manifest.json
- passing.ts
- .build
- live.ts
- CareerCreate.ts
- Projection
- CarrierControl
- MeterBar
- MatchScene
- CombineForca
- CombineBase
- logic.ts
- Tag
- Intro
- Combine3Cones
- Grandstand
- CombineStage
- Ball
- main.ts
- Feedback
- TeamRepository.ts
- LiveUiHandlers
- ResultCard

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 117 edges
2. `title()` - 82 edges
3. `label()` - 74 edges
4. `phaser` - 60 edges
5. `Player` - 58 edges
6. `getSave()` - 57 edges
7. `GlassButton` - 57 edges
8. `GAME_W` - 36 edges
9. `GAME_H` - 32 edges
10. `vibrate()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Etapa 7 — PERSONALIZAR` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerFace.ts
- `5.4 Rosto dentro do capacete` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerFace.ts
- `Etapa 3 — Criação da carreira` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerBody.ts
- `7.2 Como trabalhar (uma etapa por vez)` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerBody.ts
- `Etapa 2 — Jogador em camadas e rosto` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerFace.ts

## Import Cycles
- None detected.

## Communities (58 total, 21 thin omitted)

### Community 0 - "teams.ts"
Cohesion: 0.12
Nodes (18): applyMatchup(), TeamConfig, toConfig(), contrast(), autoUniform(), BY_ID, colorDist(), css() (+10 more)

### Community 1 - "draft/ui.ts"
Cohesion: 0.12
Nodes (31): collarTexture(), COMMISH, commissionerBody(), FORE_LEN, FORE_PIVOT_Y, foreArmTexture(), hex(), jacket() (+23 more)

### Community 2 - "Player"
Cohesion: 0.14
Nodes (10): Player, LiveEvents, LivePlay, separatePlayers(), arrive(), dist(), nearest(), pursue() (+2 more)

### Community 3 - "title"
Cohesion: 0.12
Nodes (16): forcePanel(), bottomShade(), infoPanel(), pill(), primaryButton(), sideButtons(), UI_DEPTH, backButton() (+8 more)

### Community 4 - "GameState"
Cohesion: 0.17
Nodes (6): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS, GameState

### Community 5 - "MatchScene.ts"
Cohesion: 0.10
Nodes (28): CLOCK_RATE, FIELD, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS (+20 more)

### Community 6 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 7 - "Sideline.ts"
Cohesion: 0.08
Nodes (34): MATCH_SEED, TEX_PX, AREA, BENCH, fx(), fy(), Side, Sideline (+26 more)

### Community 8 - "CombinePasse"
Cohesion: 0.20
Nodes (6): CombinePasse, groundRing(), arcAt(), riskColor(), statusOf(), Throw

### Community 9 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 10 - "DraftEscolhido.ts"
Cohesion: 0.19
Nodes (19): TeamRepository, podium(), currentDraft(), ord(), bigButton(), board(), commissioner(), draftScene() (+11 more)

### Community 12 - "grandstand.ts"
Cohesion: 0.08
Nodes (40): CityPiece, CitySpec, Stadium, stadiumOf(), STADIUMS, STAND_IDS, STAND_NAMES, StandModelId (+32 more)

### Community 15 - "config.ts"
Cohesion: 0.21
Nodes (20): phaser, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, matchConfig, QUARTER_SECONDS, saveMatchConfig() (+12 more)

### Community 16 - "stage.ts"
Cohesion: 0.15
Nodes (24): Attempt, grade(), gradeColor(), QB_AVG, score40(), scoreCones(), SKIP_SCORE, TESTS (+16 more)

### Community 18 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.13
Nodes (15): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+7 more)

### Community 19 - "CarreiraMenu"
Cohesion: 0.15
Nodes (6): Pane, nextGame(), schedule(), CarreiraMenu, hex(), ovc()

### Community 22 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.13
Nodes (14): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), 5.1 Layout, 5.4 Rosto dentro do capacete, PARTE 0 — REGRAS GLOBAIS, PARTE 2 — DADOS E ESTADO, PARTE 4 — MENU DA CARREIRA (CarreiraMenu) (+6 more)

### Community 23 - "PlayerFace"
Cohesion: 0.29
Nodes (6): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), bustTexture(), PlayerFace

### Community 24 - "PlayerBody"
Cohesion: 0.24
Nodes (6): Etapa 2 — Jogador em camadas e rosto, 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS, PlayerBody

### Community 26 - "projection.ts"
Cohesion: 0.11
Nodes (10): CAMERA, PLANE, ScreenPoint, toPlaneX(), q, Drop, pickWeather(), Weather (+2 more)

### Community 27 - "getSave"
Cohesion: 0.13
Nodes (26): careerTeam(), COACHES, coachOf(), conferenceOf(), ensureSeason(), FIRST, Game, KICKOFFS (+18 more)

### Community 28 - "daytime.ts"
Cohesion: 0.20
Nodes (13): CORNERS, pickTimeOfDay(), RGB, shadowLights(), SkyWeather, TimeOfDay, TOD_IDS, todInfo (+5 more)

### Community 31 - "Player.ts"
Cohesion: 0.09
Nodes (28): SPRITE_SCALE, Role, Side, Slot, g0, g1, p, Attributes (+20 more)

### Community 32 - "PlayerBody.ts"
Cohesion: 0.18
Nodes (16): 5.3 Opções editáveis (`LookOptions`), KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite() (+8 more)

### Community 33 - "groundfx.ts"
Cohesion: 0.21
Nodes (10): RecvKey, a, b, c, d, groundArrow(), groundArrowHead(), groundOval() (+2 more)

### Community 34 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 35 - "passing.ts"
Cohesion: 0.17
Nodes (8): aimFromDrag(), ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG, Read, readThrow(), Status

### Community 36 - ".build"
Cohesion: 0.28
Nodes (4): brand(), hexNum(), CareerCreate, collegeKit()

### Community 38 - "live.ts"
Cohesion: 0.16
Nodes (11): difficulty, DifficultyDef, Level, LEVELS, ORDER, Phase, Receiver, RouteRunner (+3 more)

### Community 39 - "CareerCreate.ts"
Cohesion: 0.22
Nodes (12): College, COLLEGES, BEARD_COUNT, CELL, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, SHAPE (+4 more)

### Community 40 - "Projection"
Cohesion: 0.12
Nodes (13): COLORS, drawGoalPost(), drawPylon(), p, a, b, c, d (+5 more)

### Community 43 - "MatchScene"
Cohesion: 0.12
Nodes (3): MatchScene, pickScheme(), CardOpts

### Community 44 - "CombineForca"
Cohesion: 0.29
Nodes (3): clamp(), scoreArm(), CombineForca

### Community 46 - "logic.ts"
Cohesion: 0.22
Nodes (13): finalScore(), qbRanking(), teamInterest(), contractValue(), DraftInfo, draftOrder(), FIRST, LAST (+5 more)

### Community 50 - "Grandstand"
Cohesion: 0.42
Nodes (3): Grandstand, pointAt(), wallQuad()

### Community 53 - "main.ts"
Cohesion: 0.11
Nodes (20): Hit, attrsFromCombine(), projection(), logoKey(), RES, boot(), calcOvr(), defaultSave() (+12 more)

### Community 56 - "TeamRepository.ts"
Cohesion: 0.29
Nodes (6): 5.2 Kits travados (`kits.ts`), build(), BY_ID, deriveKits(), PHOTO, TEAMS

## Knowledge Gaps
- **166 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+161 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 282 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `phaser` connect `config.ts` to `PlayerBody.ts`, `draft/ui.ts`, `groundfx.ts`, `title`, `MatchScene.ts`, `package.json`, `Sideline.ts`, `Projection`, `CareerCreate.ts`, `DraftEscolhido.ts`, `grandstand.ts`, `stage.ts`, `main.ts`, `projection.ts`, `daytime.ts`, `Player.ts`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `MatchScene` connect `MatchScene` to `teams.ts`, `Player`, `title`, `MatchScene.ts`, `CombinePasse`, `Fx`, `DefenseScreen`, `config.ts`, `LiveUi`, `KickUi`, `vibrate`, `projection.ts`, `daytime.ts`, `.buildBottom`, `Hud`, `groundfx.ts`, `passing.ts`, `live.ts`, `CarrierControl`, `Tag`, `Intro`, `Ball`, `Feedback`, `ResultCard`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `label()` connect `title` to `teams.ts`, `draft/ui.ts`, `MatchScene.ts`, `DraftEscolhido.ts`, `DefenseScreen`, `config.ts`, `stage.ts`, `CarreiraMenu`, `KickUi`, `.buildBottom`, `Hud`, `groundfx.ts`, `passing.ts`, `.build`, `CareerCreate.ts`, `MatchScene`, `CombineBase`, `Intro`, `main.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _166 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `teams.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12280701754385964 - nodes in this community are weakly interconnected._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._