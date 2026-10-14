# Graph Report - qb-career  (2026-10-13)

## Corpus Check
- 99 files · ~187,699 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .webmanifest 1)

## Summary
- 1235 nodes · 4091 edges · 61 communities (44 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb7aa49f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- teams.ts
- PlayerFace
- live.ts
- PlayerSave.ts
- CarreiraMenu.ts
- MatchScene.ts
- package.json
- getSave
- Projection
- compilerOptions
- draft/ui.ts
- config.ts
- grandstand.ts
- LiveUi
- season.ts
- .create
- scoring.ts
- Ball
- runlane.ts
- CarreiraMenu
- label
- sprites.ts
- league.ts
- stage.ts
- Player
- Rng
- RouteRunner
- daytime.ts
- QB Career — Ordem de execução no Claude Code
- Hud
- Player.ts
- PlayerBody.ts
- Grandstand
- manifest.json
- .backToPreSnap
- GameState
- title
- passing.ts
- Sideline.ts
- Weather
- Fx
- MatchScene
- MatchBridge.ts
- CombineBase
- DefenseScreen
- Pane
- Intro
- KickUi
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- main.ts
- groundfx.ts
- .buildPersFixed
- difficulty.ts
- Feedback
- CarrierControl
- LiveUiHandlers
- 3.2 Combine (com a gameplay dos testes)
- Daylight
- gradCard

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 121 edges
2. `title()` - 90 edges
3. `label()` - 86 edges
4. `getSave()` - 77 edges
5. `phaser` - 67 edges
6. `GlassButton` - 63 edges
7. `Player` - 58 edges
8. `CarreiraMenu` - 45 edges
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

## Communities (61 total, 17 thin omitted)

### Community 0 - "teams.ts"
Cohesion: 0.13
Nodes (16): applyMatchup(), TeamConfig, toConfig(), autoUniform(), BY_ID, colorDist(), css(), lum() (+8 more)

### Community 1 - "PlayerFace"
Cohesion: 0.17
Nodes (11): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), BEARD_COUNT, bustTexture(), CELL, HAIR_COLORS (+3 more)

### Community 2 - "live.ts"
Cohesion: 0.14
Nodes (13): FIELD, LiveEvents, LivePlay, Phase, separatePlayers(), arrive(), dist(), nearest() (+5 more)

### Community 3 - "PlayerSave.ts"
Cohesion: 0.15
Nodes (18): activeSlot(), calcOvr(), CareerState, CombineResult, DEFAULT_ATTRS, defaultSave(), deleteSlot(), keyOf() (+10 more)

### Community 4 - "CarreiraMenu.ts"
Cohesion: 0.09
Nodes (22): StatLine, passerRating(), DEFAULT_LOOK, BEARDS, Cat, CATS, Col, COLOR_KEYS (+14 more)

### Community 5 - "MatchScene.ts"
Cohesion: 0.13
Nodes (22): CLOCK_RATE, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS, RouteDef (+14 more)

### Community 6 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 7 - "getSave"
Cohesion: 0.14
Nodes (16): College, COLLEGES, hexNum(), FACE_COUNT, HAIR_COUNT, getSave(), updateSave(), Add (+8 more)

### Community 8 - "Projection"
Cohesion: 0.11
Nodes (17): COLORS, hostTeam(), drawGoalPost(), drawPylon(), p, a, b, c (+9 more)

### Community 9 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 10 - "draft/ui.ts"
Cohesion: 0.06
Nodes (72): finalScore(), qbRanking(), rng(), teamInterest(), build(), BY_ID, cityOf(), contrast() (+64 more)

### Community 11 - "config.ts"
Cohesion: 0.25
Nodes (17): phaser, broadcast, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, QUARTER_SECONDS, saveMatchConfig() (+9 more)

### Community 12 - "grandstand.ts"
Cohesion: 0.09
Nodes (36): CityPiece, CitySpec, Stadium, stadiumOf(), STADIUMS, STAND_IDS, STAND_NAMES, StandModelId (+28 more)

### Community 14 - "season.ts"
Cohesion: 0.10
Nodes (30): divisionOf(), careerTeam(), COACHES, conferenceOf(), ensureSeason(), faceFor(), FIRST, Game (+22 more)

### Community 15 - ".create"
Cohesion: 0.18
Nodes (10): KitId, LeaguePlayer, TeamSeason, coachOf(), RosterPlayer, Standing, CareerTeam, FaceLook (+2 more)

### Community 16 - "scoring.ts"
Cohesion: 0.14
Nodes (16): Attempt, attrsFromCombine(), clamp(), grade(), gradeColor(), projection(), QB_AVG, score40() (+8 more)

### Community 17 - "Ball"
Cohesion: 0.11
Nodes (4): Ball, CombinePasse, Throw, Replay

### Community 18 - "runlane.ts"
Cohesion: 0.67
Nodes (3): bestLane(), Lane, segDist()

### Community 19 - "CarreiraMenu"
Cohesion: 0.18
Nodes (9): conferenceSeeds(), divisionTable(), nextGame(), CarreiraMenu, f1(), grpOf(), hex(), nf() (+1 more)

### Community 20 - "label"
Cohesion: 0.21
Nodes (8): backButton(), CareerHub, CareerTest, PlayerTest, careerAssetCounts(), setupHiRes(), GlassButton, label()

### Community 22 - "sprites.ts"
Cohesion: 0.13
Nodes (19): TEX_PX, BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD, HOLD_LEGS, HOLD_TORSO (+11 more)

### Community 23 - "league.ts"
Cohesion: 0.16
Nodes (19): add(), boxFor(), clampInt(), CONFS, DIVS, emptyLine(), league, LeagueGame (+11 more)

### Community 24 - "stage.ts"
Cohesion: 0.15
Nodes (12): ActorLook, g0, g1, p, sidelineOptions, Billboard, BillboardLayer, p (+4 more)

### Community 26 - "Rng"
Cohesion: 0.13
Nodes (9): DriveResult, DriveRow, simulateDrive(), Rng, Drop, pickWeather(), WEATHER_INFO, WeatherKind (+1 more)

### Community 28 - "daytime.ts"
Cohesion: 0.18
Nodes (15): CAMERA, guestTeam(), CORNERS, pickTimeOfDay(), RGB, shadowLights(), SkyWeather, TimeOfDay (+7 more)

### Community 29 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.13
Nodes (15): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+7 more)

### Community 31 - "Player.ts"
Cohesion: 0.13
Nodes (21): SPRITE_SCALE, Role, Side, Slot, Attributes, BASE, drawDive(), drawDiveFlat() (+13 more)

### Community 32 - "PlayerBody.ts"
Cohesion: 0.16
Nodes (15): Etapa 2 — Jogador em camadas e rosto, KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite() (+7 more)

### Community 34 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 35 - ".backToPreSnap"
Cohesion: 0.26
Nodes (3): pickScheme(), tipText(), CardOpts

### Community 36 - "GameState"
Cohesion: 0.17
Nodes (6): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS, GameState

### Community 38 - "title"
Cohesion: 0.20
Nodes (17): forcePanel(), MID, playerLook(), bottomShade(), brand(), infoPanel(), pill(), primaryButton() (+9 more)

### Community 39 - "passing.ts"
Cohesion: 0.11
Nodes (10): aimFromDrag(), ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG, Read, readThrow(), Status (+2 more)

### Community 40 - "Sideline.ts"
Cohesion: 0.19
Nodes (14): MATCH_SEED, AREA, BENCH, fx(), fy(), Side, Sideline, STAND_GAP (+6 more)

### Community 43 - "MatchScene"
Cohesion: 0.08
Nodes (4): MatchScene, spotName(), Menu, Tag

### Community 44 - "MatchBridge.ts"
Cohesion: 0.20
Nodes (11): PRIME, matchConfig, venue, careerMatch(), CareerMatchResult, Current, finishCareerMatch(), KIT_UNI (+3 more)

### Community 45 - "CombineBase"
Cohesion: 0.05
Nodes (9): CombineBase, Actor, CombineStage, hexStr(), MeterBar, mix(), Combine3Cones, Combine40 (+1 more)

### Community 50 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.12
Nodes (16): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), 5.1 Layout, 5.2 Kits travados (`kits.ts`), 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 0 — REGRAS GLOBAIS (+8 more)

### Community 51 - "main.ts"
Cohesion: 0.15
Nodes (12): logoKey(), RES, boot(), Boot, CombineResultado, KIT_NAMES, GROUPS, queueCareerAssets() (+4 more)

### Community 52 - "groundfx.ts"
Cohesion: 0.15
Nodes (16): RecvKey, fillQuad(), a, b, c, d, groundArrow(), groundArrowHead() (+8 more)

### Community 53 - ".buildPersFixed"
Cohesion: 0.27
Nodes (6): KIT_IDS, kitAccents(), kitInfo(), shade(), pick(), LookOptions

### Community 54 - "difficulty.ts"
Cohesion: 0.29
Nodes (6): difficulty, DifficultyDef, Level, LEVELS, ORDER, TACKLE_RANGE

### Community 58 - "3.2 Combine (com a gameplay dos testes)"
Cohesion: 0.40
Nodes (4): 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS

### Community 62 - "gradCard"
Cohesion: 0.53
Nodes (5): gradCard(), GradOpts, gradTexture(), path(), rgba()

## Knowledge Gaps
- **187 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+182 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 305 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `teams.ts`, `live.ts`, `MatchScene.ts`, `config.ts`, `LiveUi`, `Ball`, `runlane.ts`, `label`, `Player`, `daytime.ts`, `Hud`, `.backToPreSnap`, `passing.ts`, `Weather`, `Fx`, `MatchBridge.ts`, `DefenseScreen`, `Intro`, `KickUi`, `groundfx.ts`, `Feedback`, `CarrierControl`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `phaser` connect `config.ts` to `PlayerFace`, `PlayerSave.ts`, `CarreiraMenu.ts`, `MatchScene.ts`, `package.json`, `getSave`, `Projection`, `draft/ui.ts`, `grandstand.ts`, `scoring.ts`, `label`, `sprites.ts`, `stage.ts`, `Rng`, `daytime.ts`, `Player.ts`, `PlayerBody.ts`, `title`, `Sideline.ts`, `MatchBridge.ts`, `Pane`, `main.ts`, `groundfx.ts`, `gradCard`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `PlayerSave.ts`, `CarreiraMenu.ts`, `MatchScene.ts`, `title`, `draft/ui.ts`, `MatchScene`, `MatchBridge.ts`, `CombineBase`, `season.ts`, `.create`, `scoring.ts`, `CarreiraMenu`, `label`, `.buildPersFixed`, `main.ts`, `league.ts`, `stage.ts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _187 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `teams.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12612612612612611 - nodes in this community are weakly interconnected._
- **Should `live.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14453781512605043 - nodes in this community are weakly interconnected._
- **Should `CarreiraMenu.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09420289855072464 - nodes in this community are weakly interconnected._