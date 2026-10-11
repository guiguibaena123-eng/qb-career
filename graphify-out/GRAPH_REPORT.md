# Graph Report - qb-career  (2026-10-11)

## Corpus Check
- 87 files · ~160,749 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .webmanifest 1)

## Summary
- 1022 nodes · 3252 edges · 60 communities (40 shown, 20 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05ade36a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MainMenu.ts
- draft/ui.ts
- LivePlay
- title
- GameState
- MatchScene.ts
- package.json
- sprites.ts
- CombinePasse
- compilerOptions
- DraftEscolhido.ts
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
- Player
- Weather
- Sideline.ts
- daytime.ts
- Hud
- Player.ts
- PlayerBody.ts
- RecvKey
- manifest.json
- MatchScene
- CombinePasse.ts
- live.ts
- CareerCreate.ts
- Projection
- CarrierControl
- passing.ts
- .opponentDrive
- CombineForca
- CombineBase
- logic.ts
- billboards.ts
- Intro
- Combine3Cones
- Grandstand
- CombineStage
- Ball
- careerAssets.ts
- Feedback
- PARTE 5 — PERSONALIZAR (uniforme travado pelo time)
- LiveUiHandlers
- ResultCard
- Menu

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
- `Etapa 3 — Criação da carreira` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerBody.ts
- `3.2 Combine (com a gameplay dos testes)` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerBody.ts
- `7.2 Como trabalhar (uma etapa por vez)` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerBody.ts

## Import Cycles
- None detected.

## Communities (60 total, 20 thin omitted)

### Community 0 - "MainMenu.ts"
Cohesion: 0.08
Nodes (31): applyMatchup(), logoKey(), saveMatchConfig(), TeamConfig, toConfig(), WeatherChoice, CityPiece, CitySpec (+23 more)

### Community 1 - "draft/ui.ts"
Cohesion: 0.09
Nodes (36): BY_ID, CareerTeam, PHOTO, TEAMS, collarTexture(), COMMISH, commissionerBody(), FORE_LEN (+28 more)

### Community 2 - "LivePlay"
Cohesion: 0.14
Nodes (9): LiveEvents, LivePlay, separatePlayers(), arrive(), dist(), nearest(), pursue(), seek() (+1 more)

### Community 3 - "title"
Cohesion: 0.12
Nodes (25): finalScore(), grade(), gradeColor(), projection(), brand(), primaryButton(), hexNum(), calcOvr() (+17 more)

### Community 4 - "GameState"
Cohesion: 0.17
Nodes (6): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS, GameState

### Community 5 - "MatchScene.ts"
Cohesion: 0.09
Nodes (26): CLOCK_RATE, FIELD, matchConfig, QUARTER_SECONDS, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS (+18 more)

### Community 6 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 7 - "sprites.ts"
Cohesion: 0.13
Nodes (19): TEX_PX, BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD, HOLD_LEGS, HOLD_TORSO (+11 more)

### Community 8 - "CombinePasse"
Cohesion: 0.20
Nodes (4): forcePanel(), pill(), CombinePasse, Tag

### Community 9 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 10 - "DraftEscolhido.ts"
Cohesion: 0.18
Nodes (20): TeamRepository, podium(), currentDraft(), money(), ord(), bigButton(), board(), commissioner() (+12 more)

### Community 12 - "grandstand.ts"
Cohesion: 0.09
Nodes (34): stadiumOf(), StandModelId, buildRows(), finishTexture(), HAIR, makeBandTexture(), makeRowTexture(), MODELS (+26 more)

### Community 15 - "config.ts"
Cohesion: 0.27
Nodes (15): phaser, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, RES, TEAMS, boot() (+7 more)

### Community 16 - "PlayerSave.ts"
Cohesion: 0.18
Nodes (12): Attempt, QB_AVG, score40(), scoreCones(), SKIP_SCORE, TESTS, timeScore(), Attrs (+4 more)

### Community 18 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.13
Nodes (15): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+7 more)

### Community 19 - "stage.ts"
Cohesion: 0.14
Nodes (18): Actor, ActorLook, hexStr(), MID, playerLook(), bottomShade(), infoPanel(), sideButtons() (+10 more)

### Community 22 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.17
Nodes (11): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), PARTE 0 — REGRAS GLOBAIS, PARTE 2 — DADOS E ESTADO, PARTE 4 — MENU DA CARREIRA (CarreiraMenu), Projeto existente, Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira (+3 more)

### Community 23 - "PlayerFace"
Cohesion: 0.19
Nodes (9): Etapa 2 — Jogador em camadas e rosto, 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), PlayerBody, topLayers(), bustTexture() (+1 more)

### Community 24 - "3.2 Combine (com a gameplay dos testes)"
Cohesion: 0.40
Nodes (4): 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS

### Community 25 - "Player"
Cohesion: 0.21
Nodes (3): Player, vibrate(), Lane

### Community 27 - "Sideline.ts"
Cohesion: 0.20
Nodes (13): MATCH_SEED, AREA, BENCH, fx(), fy(), Side, Sideline, sidelineOptions (+5 more)

### Community 28 - "daytime.ts"
Cohesion: 0.16
Nodes (16): CAMERA, CORNERS, pickTimeOfDay(), RGB, shadowLights(), SkyWeather, TimeOfDay, TOD (+8 more)

### Community 31 - "Player.ts"
Cohesion: 0.17
Nodes (17): Role, Side, Slot, Attributes, BASE, drawDive(), drawDiveFlat(), drawDiveUp() (+9 more)

### Community 32 - "PlayerBody.ts"
Cohesion: 0.19
Nodes (15): 5.3 Opções editáveis (`LookOptions`), KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite() (+7 more)

### Community 33 - "RecvKey"
Cohesion: 0.22
Nodes (5): RecvKey, groundArrow(), groundPath(), Receiver, statusOf()

### Community 34 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 35 - "MatchScene"
Cohesion: 0.17
Nodes (3): MatchScene, Read, readThrow()

### Community 36 - "CombinePasse.ts"
Cohesion: 0.26
Nodes (12): fillQuad(), a, b, c, d, groundArrowHead(), groundOval(), groundRing() (+4 more)

### Community 38 - "live.ts"
Cohesion: 0.16
Nodes (15): RouteKind, blockAssignments(), readText(), Scheme, SchemeId, SCHEMES, Zone, difficulty (+7 more)

### Community 39 - "CareerCreate.ts"
Cohesion: 0.25
Nodes (10): BEARD_COUNT, CELL, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, SKINS, Add, KEYS (+2 more)

### Community 40 - "Projection"
Cohesion: 0.10
Nodes (19): COLORS, g0, g1, p, drawGoalPost(), drawPylon(), p, a (+11 more)

### Community 42 - "passing.ts"
Cohesion: 0.20
Nodes (8): aimFromDrag(), ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG, Status, STATUS_COLOR, RouteRunner

### Community 43 - ".opponentDrive"
Cohesion: 0.18
Nodes (3): pickScheme(), tipText(), CardOpts

### Community 44 - "CombineForca"
Cohesion: 0.18
Nodes (6): attrsFromCombine(), clamp(), scoreArm(), MeterBar, mix(), CombineForca

### Community 46 - "logic.ts"
Cohesion: 0.28
Nodes (12): qbRanking(), rng(), teamInterest(), contractValue(), DraftInfo, draftOrder(), FIRST, LAST (+4 more)

### Community 47 - "billboards.ts"
Cohesion: 0.27
Nodes (5): SPRITE_SCALE, BillboardLayer, p, q, ShadowLight

### Community 50 - "Grandstand"
Cohesion: 0.42
Nodes (3): Grandstand, pointAt(), wallQuad()

### Community 52 - "Ball"
Cohesion: 0.13
Nodes (4): Ball, POSES, Frame, Replay

### Community 53 - "careerAssets.ts"
Cohesion: 0.29
Nodes (4): Boot, GROUPS, queueCareerAssets(), sharpenCareerAssets()

### Community 56 - "PARTE 5 — PERSONALIZAR (uniforme travado pelo time)"
Cohesion: 0.33
Nodes (6): 5.1 Layout, 5.2 Kits travados (`kits.ts`), 5.4 Rosto dentro do capacete, PARTE 5 — PERSONALIZAR (uniforme travado pelo time), build(), deriveKits()

## Knowledge Gaps
- **153 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+148 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 265 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `phaser` connect `config.ts` to `MainMenu.ts`, `draft/ui.ts`, `title`, `MatchScene.ts`, `package.json`, `sprites.ts`, `DraftEscolhido.ts`, `grandstand.ts`, `PlayerSave.ts`, `stage.ts`, `Sideline.ts`, `daytime.ts`, `Player.ts`, `PlayerBody.ts`, `CombinePasse.ts`, `CareerCreate.ts`, `Projection`, `billboards.ts`, `careerAssets.ts`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `MatchScene` connect `MatchScene` to `MainMenu.ts`, `LivePlay`, `title`, `MatchScene.ts`, `CombinePasse`, `Fx`, `DefenseScreen`, `LiveUi`, `KickUi`, `Player`, `Weather`, `daytime.ts`, `.create`, `Hud`, `RecvKey`, `CombinePasse.ts`, `live.ts`, `CarrierControl`, `.opponentDrive`, `Intro`, `Ball`, `.startKick`, `Feedback`, `ResultCard`, `Menu`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `title()` connect `title` to `MainMenu.ts`, `draft/ui.ts`, `MatchScene.ts`, `CombinePasse`, `DraftEscolhido.ts`, `Combine40`, `DefenseScreen`, `config.ts`, `PlayerSave.ts`, `LiveUi`, `stage.ts`, `KickUi`, `.create`, `Hud`, `CareerCreate.ts`, `CombineBase`, `Intro`, `CombineStage`, `ResultCard`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _153 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MainMenu.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08484848484848485 - nodes in this community are weakly interconnected._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09487179487179487 - nodes in this community are weakly interconnected._
- **Should `LivePlay` be split into smaller, more focused modules?**
  _Cohesion score 0.14408602150537633 - nodes in this community are weakly interconnected._