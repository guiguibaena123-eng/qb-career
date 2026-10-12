# Graph Report - qb-career  (2026-10-12)

## Corpus Check
- 91 files · ~170,364 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .webmanifest 1)

## Summary
- 1109 nodes · 3550 edges · 53 communities (38 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b3bcb1e9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MainMenu.ts
- sprites.ts
- .updateCarry
- combine/ui.ts
- GameState
- ai.ts
- package.json
- Sideline.ts
- CombinePasse
- compilerOptions
- draft/ui.ts
- field.ts
- grandstand.ts
- Combine40
- DefenseScreen
- MatchScene.ts
- stage.ts
- billboards.ts
- QB Career — Ordem de execução no Claude Code
- getSave
- KickUi
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- PlayerFace
- LivePlay
- MatchScene
- Projection
- Rng
- daytime.ts
- Hud
- Player.ts
- PlayerBody.ts
- RecvKey
- manifest.json
- passing.ts
- GlassButton
- live.ts
- label
- .project
- CarrierControl
- groundfx.ts
- .backToPreSnap
- CombineForca
- title
- PARTE 5 — PERSONALIZAR (uniforme travado pelo time)
- Intro
- Combine3Cones
- Player
- PlayerSave.ts
- Feedback
- LiveUiHandlers

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 117 edges
2. `title()` - 83 edges
3. `label()` - 76 edges
4. `getSave()` - 63 edges
5. `phaser` - 60 edges
6. `GlassButton` - 59 edges
7. `Player` - 58 edges
8. `GAME_W` - 36 edges
9. `CarreiraMenu` - 34 edges
10. `GAME_H` - 32 edges

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

## Communities (53 total, 15 thin omitted)

### Community 0 - "MainMenu.ts"
Cohesion: 0.09
Nodes (32): 5.2 Kits travados (`kits.ts`), applyMatchup(), logoKey(), saveMatchConfig(), toConfig(), WeatherChoice, build(), BY_ID (+24 more)

### Community 1 - "sprites.ts"
Cohesion: 0.15
Nodes (17): TEX_PX, BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD, HOLD_LEGS, HOLD_TORSO (+9 more)

### Community 2 - ".updateCarry"
Cohesion: 0.25
Nodes (7): LiveEvents, arrive(), dist(), nearest(), pursue(), seek(), steer()

### Community 3 - "combine/ui.ts"
Cohesion: 0.29
Nodes (7): brand(), mix(), primaryButton(), College, COLLEGES, hexNum(), collegeKit()

### Community 4 - "GameState"
Cohesion: 0.17
Nodes (6): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS, GameState

### Community 5 - "ai.ts"
Cohesion: 0.13
Nodes (11): FIELD, RouteKind, ROUTES, blockAssignments(), readText(), Scheme, SchemeId, SCHEMES (+3 more)

### Community 6 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 7 - "Sideline.ts"
Cohesion: 0.17
Nodes (15): AREA, BENCH, fx(), fy(), Side, Sideline, sidelineOptions, SKINS (+7 more)

### Community 9 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 10 - "draft/ui.ts"
Cohesion: 0.07
Nodes (64): qbRanking(), rng(), teamInterest(), TeamRepository, collarTexture(), COMMISH, commissionerBody(), FORE_LEN (+56 more)

### Community 11 - "field.ts"
Cohesion: 0.19
Nodes (11): COLORS, drawPylon(), p, a, b, c, d, fieldOptions (+3 more)

### Community 12 - "grandstand.ts"
Cohesion: 0.08
Nodes (38): CityPiece, CitySpec, Stadium, stadiumOf(), STADIUMS, STAND_IDS, STAND_NAMES, StandChoice (+30 more)

### Community 15 - "MatchScene.ts"
Cohesion: 0.06
Nodes (44): phaser, UI_DEPTH, CLOCK_RATE, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, MATCH_SEED (+36 more)

### Community 16 - "stage.ts"
Cohesion: 0.13
Nodes (15): forcePanel(), Actor, ActorLook, CombineStage, MID, playerLook(), bottomShade(), pill() (+7 more)

### Community 17 - "billboards.ts"
Cohesion: 0.19
Nodes (7): SPRITE_SCALE, Side, Slot, BillboardLayer, p, q, ShadowLight

### Community 18 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.13
Nodes (15): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+7 more)

### Community 19 - "getSave"
Cohesion: 0.06
Nodes (49): KIT_IDS, kitAccents(), KitId, kitInfo(), shade(), Hit, Pane, careerTeam() (+41 more)

### Community 22 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.12
Nodes (15): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, 4.1 Miniatura do estádio (foto real pixelada), PARTE 0 — REGRAS GLOBAIS, PARTE 2 — DADOS E ESTADO (+7 more)

### Community 23 - "PlayerFace"
Cohesion: 0.29
Nodes (6): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), bustTexture(), PlayerFace

### Community 26 - "Projection"
Cohesion: 0.14
Nodes (3): Projection, toPlaneT(), Weather

### Community 27 - "Rng"
Cohesion: 0.31
Nodes (4): DriveRow, simulateDrive(), spotName(), Rng

### Community 28 - "daytime.ts"
Cohesion: 0.14
Nodes (15): CAMERA, CORNERS, Daylight, pickTimeOfDay(), RGB, shadowLights(), SkyWeather, TimeOfDay (+7 more)

### Community 31 - "Player.ts"
Cohesion: 0.21
Nodes (15): hexStr(), Attributes, BASE, drawDive(), drawDiveFlat(), drawDiveUp(), drawPlayer(), drawSide() (+7 more)

### Community 32 - "PlayerBody.ts"
Cohesion: 0.15
Nodes (16): Etapa 2 — Jogador em camadas e rosto, KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite() (+8 more)

### Community 33 - "RecvKey"
Cohesion: 0.27
Nodes (8): RecvKey, groundArrow(), groundOval(), groundPath(), groundRing(), groundSegment(), arcAt(), riskColor()

### Community 34 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 35 - "passing.ts"
Cohesion: 0.15
Nodes (9): aimFromDrag(), ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG, Read, readThrow(), Status (+1 more)

### Community 36 - "GlassButton"
Cohesion: 0.21
Nodes (4): sideButtons(), updateSave(), CareerCreate, GlassButton

### Community 38 - "live.ts"
Cohesion: 0.27
Nodes (8): difficulty, DifficultyDef, LEVELS, ORDER, Phase, TACKLE_RANGE, TackleResult, tryTackle()

### Community 39 - "label"
Cohesion: 0.14
Nodes (20): RES, boot(), BEARD_COUNT, CELL, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, SKINS (+12 more)

### Community 40 - ".project"
Cohesion: 0.19
Nodes (7): drawGoalPost(), FieldRenderer, Grandstand, pointAt(), fillQuad(), wallQuad(), toPlaneX()

### Community 42 - "groundfx.ts"
Cohesion: 0.33
Nodes (5): a, b, c, d, groundArrowHead()

### Community 43 - ".backToPreSnap"
Cohesion: 0.16
Nodes (4): pickScheme(), tipText(), statusOf(), CardOpts

### Community 44 - "CombineForca"
Cohesion: 0.29
Nodes (3): clamp(), scoreArm(), CombineForca

### Community 46 - "PARTE 5 — PERSONALIZAR (uniforme travado pelo time)"
Cohesion: 0.50
Nodes (4): 5.1 Layout, 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 5 — PERSONALIZAR (uniforme travado pelo time)

### Community 49 - "Combine3Cones"
Cohesion: 0.19
Nodes (5): score40(), scoreCones(), timeScore(), infoPanel(), Combine3Cones

### Community 52 - "Player"
Cohesion: 0.09
Nodes (11): Ball, g0, g1, p, Player, POSES, Receiver, Throw (+3 more)

### Community 53 - "PlayerSave.ts"
Cohesion: 0.16
Nodes (19): Attempt, attrsFromCombine(), finalScore(), grade(), gradeColor(), projection(), QB_AVG, SKIP_SCORE (+11 more)

## Knowledge Gaps
- **176 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+171 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 291 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `phaser` connect `MatchScene.ts` to `PlayerBody.ts`, `sprites.ts`, `MainMenu.ts`, `combine/ui.ts`, `package.json`, `Sideline.ts`, `label`, `draft/ui.ts`, `field.ts`, `grandstand.ts`, `groundfx.ts`, `stage.ts`, `billboards.ts`, `getSave`, `Player`, `PlayerSave.ts`, `daytime.ts`, `Player.ts`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `MatchScene` connect `MatchScene` to `MainMenu.ts`, `ai.ts`, `CombinePasse`, `DefenseScreen`, `MatchScene.ts`, `KickUi`, `LivePlay`, `Projection`, `daytime.ts`, `.create`, `Hud`, `RecvKey`, `passing.ts`, `GlassButton`, `CarrierControl`, `.backToPreSnap`, `Intro`, `Player`, `Feedback`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `label()` connect `label` to `MainMenu.ts`, `combine/ui.ts`, `GlassButton`, `passing.ts`, `CombinePasse`, `draft/ui.ts`, `.backToPreSnap`, `title`, `DefenseScreen`, `MatchScene.ts`, `stage.ts`, `Combine3Cones`, `Intro`, `getSave`, `KickUi`, `PlayerSave.ts`, `.create`, `Hud`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _176 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MainMenu.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08646616541353383 - nodes in this community are weakly interconnected._
- **Should `sprites.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14619883040935672 - nodes in this community are weakly interconnected._
- **Should `ai.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._