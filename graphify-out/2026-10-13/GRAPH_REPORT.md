# Graph Report - qb-career  (2026-10-13)

## Corpus Check
- 101 files · ~198,068 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .webmanifest 1)

## Summary
- 1254 nodes · 4220 edges · 58 communities (44 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6d4d7cee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- .details
- PlayerFace
- LivePlay
- getSave
- Rng
- MatchScene.ts
- package.json
- title
- field.ts
- compilerOptions
- draft/ui.ts
- config.ts
- grandstand.ts
- LiveUi
- season.ts
- PreJogo.ts
- MainMenu.ts
- league.ts
- CarreiraMenu.ts
- CarreiraMenu
- Projection
- Sideline.ts
- CombineHub.ts
- stage.ts
- Player
- CombineForca
- MatchScene
- daytime.ts
- QB Career — Ordem de execução no Claude Code
- Hud
- Player.ts
- PlayerBody.ts
- billboards.ts
- manifest.json
- .endPlay
- passing.ts
- CombinePasse.ts
- .buildLive
- .project
- jerseyArt.ts
- Fx
- .create
- CombineStage
- 7.2 Como trabalhar (uma etapa por vez)
- DefenseScreen
- Pane
- KickUi
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- main.ts
- groundfx.ts
- .buildPersFixed
- live.ts
- CarrierControl
- LiveUiHandlers
- PlayerBody

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 121 edges
2. `title()` - 91 edges
3. `label()` - 87 edges
4. `getSave()` - 79 edges
5. `phaser` - 68 edges
6. `GlassButton` - 64 edges
7. `Player` - 58 edges
8. `CarreiraMenu` - 46 edges
9. `GAME_W` - 38 edges
10. `GAME_H` - 34 edges

## Surprising Connections (you probably didn't know these)
- `Etapa 7 — PERSONALIZAR` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerFace.ts
- `5.4 Rosto dentro do capacete` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerFace.ts
- `5.3 Opções editáveis (`LookOptions`)` --references--> `LookOptions`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerSave.ts
- `5.2 Kits travados (`kits.ts`)` --references--> `deriveKits()`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/data/TeamRepository.ts
- `Etapa 3 — Criação da carreira` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerBody.ts

## Import Cycles
- None detected.

## Communities (58 total, 14 thin omitted)

### Community 0 - ".details"
Cohesion: 0.10
Nodes (18): applyMatchup(), logoKey(), TeamConfig, toConfig(), autoUniform(), BY_ID, colorDist(), css() (+10 more)

### Community 1 - "PlayerFace"
Cohesion: 0.26
Nodes (7): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), PlayerFace, portrait(), portraitTexture()

### Community 2 - "LivePlay"
Cohesion: 0.14
Nodes (9): LiveEvents, LivePlay, separatePlayers(), arrive(), dist(), nearest(), pursue(), seek() (+1 more)

### Community 3 - "getSave"
Cohesion: 0.16
Nodes (20): finishCareerMatch(), activeSlot(), calcOvr(), CareerState, CombineResult, defaultSave(), deleteSlot(), getSave() (+12 more)

### Community 4 - "Rng"
Cohesion: 0.24
Nodes (5): pickScheme(), DriveRow, simulateDrive(), spotName(), Rng

### Community 5 - "MatchScene.ts"
Cohesion: 0.12
Nodes (26): CLOCK_RATE, FIELD, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS (+18 more)

### Community 6 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 7 - "title"
Cohesion: 0.18
Nodes (10): brand(), primaryButton(), sideButtons(), UI_DEPTH, hexNum(), CareerCreate, collegeKit(), GlassButton (+2 more)

### Community 8 - "field.ts"
Cohesion: 0.22
Nodes (11): COLORS, playoffLogo, drawGoalPost(), drawPylon(), p, a, b, c (+3 more)

### Community 9 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 10 - "draft/ui.ts"
Cohesion: 0.05
Nodes (83): attrsFromCombine(), clamp(), finalScore(), projection(), QB_AVG, qbRanking(), rng(), score40() (+75 more)

### Community 11 - "config.ts"
Cohesion: 0.29
Nodes (14): phaser, broadcast, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, QUARTER_SECONDS, TEAMS (+6 more)

### Community 12 - "grandstand.ts"
Cohesion: 0.12
Nodes (28): StandModelId, todInfo, buildRows(), finishTexture(), HAIR, makeBandTexture(), makeFloodPanels(), makeRowTexture() (+20 more)

### Community 14 - "season.ts"
Cohesion: 0.09
Nodes (31): divisionOf(), Round, careerTeam(), COACHES, conferenceOf(), ensureSeason(), faceFor(), FINAL_WEEK (+23 more)

### Community 15 - "PreJogo.ts"
Cohesion: 0.11
Nodes (23): KIT_IDS, kitAccents(), KitId, shade(), TeamSeason, ROUND_INFO, coachOf(), nextGame() (+15 more)

### Community 16 - "MainMenu.ts"
Cohesion: 0.09
Nodes (27): seasonWeather(), finalGame, matchConfig, saveMatchConfig(), venue, WeatherChoice, CityPiece, CitySpec (+19 more)

### Community 17 - "league.ts"
Cohesion: 0.16
Nodes (21): add(), boxFor(), clampInt(), conferenceSeeds(), CONFS, divisionTable(), DIVS, emptyLine() (+13 more)

### Community 18 - "CarreiraMenu.ts"
Cohesion: 0.08
Nodes (28): PLAYOFF_SPOTS, simScore(), StatLine, bracket, PGame, ROUNDS, finalInfo(), passerRating() (+20 more)

### Community 19 - "CarreiraMenu"
Cohesion: 0.21
Nodes (7): CarreiraMenu, f1(), grpOf(), hex(), nf(), ovc(), gradCard()

### Community 20 - "Projection"
Cohesion: 0.10
Nodes (10): g0, g1, p, PLANE, Projection, ScreenPoint, toPlaneT(), toPlaneX() (+2 more)

### Community 22 - "Sideline.ts"
Cohesion: 0.09
Nodes (33): MATCH_SEED, TEX_PX, AREA, BENCH, fx(), fy(), Side, Sideline (+25 more)

### Community 23 - "CombineHub.ts"
Cohesion: 0.31
Nodes (5): grade(), gradeColor(), TESTS, CombineHub, fmtRaw()

### Community 24 - "stage.ts"
Cohesion: 0.15
Nodes (14): ActorLook, College, COLLEGES, BEARD_COUNT, bustTexture(), CELL, FACE_COUNT, HAIR_COLORS (+6 more)

### Community 25 - "Player"
Cohesion: 0.19
Nodes (3): Player, vibrate(), Lane

### Community 26 - "CombineForca"
Cohesion: 0.12
Nodes (5): scoreArm(), MeterBar, mix(), Combine40, CombineForca

### Community 28 - "daytime.ts"
Cohesion: 0.16
Nodes (15): CAMERA, guestTeam(), CORNERS, Daylight, pickTimeOfDay(), RGB, shadowLights(), SkyWeather (+7 more)

### Community 29 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.14
Nodes (14): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+6 more)

### Community 31 - "Player.ts"
Cohesion: 0.14
Nodes (20): Role, Side, Slot, Attributes, BASE, drawDive(), drawDiveFlat(), drawDiveUp() (+12 more)

### Community 32 - "PlayerBody.ts"
Cohesion: 0.20
Nodes (13): KitDef, BODY_H, BODY_SCALE, BODY_W, BodyLook, composite(), key(), Layer (+5 more)

### Community 33 - "billboards.ts"
Cohesion: 0.27
Nodes (5): SPRITE_SCALE, BillboardLayer, p, q, ShadowLight

### Community 34 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 36 - "passing.ts"
Cohesion: 0.28
Nodes (8): aimFromDrag(), ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG, readThrow(), Status, STATUS_COLOR

### Community 38 - "CombinePasse.ts"
Cohesion: 0.09
Nodes (17): Attempt, CombineBase, forcePanel(), Actor, MID, playerLook(), bottomShade(), infoPanel() (+9 more)

### Community 39 - ".buildLive"
Cohesion: 0.12
Nodes (3): Feedback, ResultCard, Tag

### Community 40 - ".project"
Cohesion: 0.20
Nodes (5): hostTeam(), FieldRenderer, Grandstand, pointAt(), wallQuad()

### Community 41 - "jerseyArt.ts"
Cohesion: 0.53
Nodes (5): css(), JerseyOpts, jerseyTexture(), lum(), mix()

### Community 44 - "CombineStage"
Cohesion: 0.07
Nodes (5): CombineStage, hexStr(), Ball, Throw, Replay

### Community 45 - "7.2 Como trabalhar (uma etapa por vez)"
Cohesion: 0.40
Nodes (5): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS

### Community 50 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.11
Nodes (17): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), 5.1 Layout, 5.2 Kits travados (`kits.ts`), 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 0 — REGRAS GLOBAIS (+9 more)

### Community 51 - "main.ts"
Cohesion: 0.14
Nodes (14): RES, boot(), Boot, backButton(), CareerHub, CareerTest, CombineResultado, PlayerTest (+6 more)

### Community 52 - "groundfx.ts"
Cohesion: 0.15
Nodes (15): RecvKey, fillQuad(), a, b, c, d, groundArrow(), groundArrowHead() (+7 more)

### Community 53 - ".buildPersFixed"
Cohesion: 0.36
Nodes (3): kitInfo(), pick(), LookOptions

### Community 54 - "live.ts"
Cohesion: 0.16
Nodes (11): difficulty, DifficultyDef, Level, LEVELS, ORDER, Phase, Receiver, RouteRunner (+3 more)

### Community 63 - "PlayerBody"
Cohesion: 0.22
Nodes (7): Etapa 2 — Jogador em camadas e rosto, 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS, baseLayers(), PlayerBody

## Knowledge Gaps
- **189 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 307 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `.details`, `LivePlay`, `MatchScene.ts`, `title`, `LiveUi`, `PreJogo.ts`, `MainMenu.ts`, `Projection`, `Player`, `daytime.ts`, `Hud`, `.endPlay`, `.buildLive`, `Fx`, `.create`, `CombineStage`, `DefenseScreen`, `KickUi`, `groundfx.ts`, `live.ts`, `CarrierControl`, `.startKick`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `phaser` connect `config.ts` to `PlayerFace`, `getSave`, `MatchScene.ts`, `package.json`, `title`, `field.ts`, `draft/ui.ts`, `grandstand.ts`, `PreJogo.ts`, `MainMenu.ts`, `CarreiraMenu.ts`, `Projection`, `Sideline.ts`, `CombineHub.ts`, `stage.ts`, `daytime.ts`, `Player.ts`, `PlayerBody.ts`, `billboards.ts`, `CombinePasse.ts`, `jerseyArt.ts`, `Pane`, `main.ts`, `groundfx.ts`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `MatchScene.ts`, `CombinePasse.ts`, `title`, `draft/ui.ts`, `.create`, `season.ts`, `PreJogo.ts`, `league.ts`, `CarreiraMenu.ts`, `main.ts`, `CarreiraMenu`, `.buildPersFixed`, `CombineHub.ts`, `stage.ts`, `CombineForca`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `.details` be split into smaller, more focused modules?**
  _Cohesion score 0.09948979591836735 - nodes in this community are weakly interconnected._
- **Should `LivePlay` be split into smaller, more focused modules?**
  _Cohesion score 0.14408602150537633 - nodes in this community are weakly interconnected._
- **Should `MatchScene.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11612903225806452 - nodes in this community are weakly interconnected._