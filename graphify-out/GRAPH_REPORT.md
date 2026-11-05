# Graph Report - qb-career  (2026-11-05)

## Corpus Check
- 112 files · ~443,651 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .log 2, (none) 1, .webmanifest 1)

## Summary
- 1421 nodes · 4910 edges · 75 communities (50 shown, 25 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `97ae1103`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draft/ui.ts
- MatchScene
- CombineResultado.ts
- tvText
- Player
- CarreiraMenu.ts
- DraftEspera.ts
- passing.ts
- CarreiraMenu
- index.html (shell do jogo QB Career)
- .buildPersFixed
- title
- phaser
- .project
- Projection
- grandstand.ts
- stage.ts
- Player.ts
- groundfx.ts
- daytime.ts
- sprites.ts
- .showFinal
- Weather
- package.json
- TeamRepository.ts
- Sideline.ts
- live.ts
- awards.ts
- PlayerSave.ts
- MainMenu.ts
- trophies.ts
- scoring.ts
- tv.ts
- MatchScene.ts
- plays.ts
- primeBoard.ts
- DefenseScreen
- Hud
- compilerOptions
- Components
- RecvKey
- main.ts
- Pane
- Intro
- LiveUi
- Combine3Cones
- CarrierControl
- .buildLive
- GlassButton
- .startKick
- getSave
- LiveUiHandlers
- plate
- manifest.json
- .create
- vibrate
- Feedback
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- PlayerBody.ts
- .update
- QB Career — Ordem de execução no Claude Code
- Product
- PlayerFace
- Replay
- QB Career 🏈
- jerseyArt.ts
- ResultCard
- Menus do QB Career (fora de campo)
- DefenseScreen.ts
- Tag

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 130 edges
2. `getSave()` - 96 edges
3. `phaser` - 70 edges
4. `tvText()` - 64 edges
5. `plate()` - 61 edges
6. `Player` - 59 edges
7. `CarreiraMenu` - 50 edges
8. `title()` - 48 edges
9. `GAME_W` - 41 edges
10. `label()` - 40 edges

## Surprising Connections (you probably didn't know these)
- `Etapa 7 — PERSONALIZAR` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerFace.ts
- `5.4 Rosto dentro do capacete` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerFace.ts
- `5.3 Opções editáveis (`LookOptions`)` --references--> `LookOptions`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerSave.ts
- `Named Rules` --references--> `onInk()`  [INFERRED]
  DESIGN.md → src/ui/tv.ts
- `Destaque "é você"` --references--> `tvCard()`  [INFERRED]
  DESIGN.md → src/ui/tv.ts

## Import Cycles
- 3-file cycle: `src/career/awards.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 3-file cycle: `src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/league.ts`
- 3-file cycle: `src/career/playoffs.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/playoffs.ts`
- 4-file cycle: `src/career/awards.ts -> src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 4-file cycle: `src/career/awards.ts -> src/career/playoffs.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 4-file cycle: `src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/playoffs.ts -> src/career/league.ts`
- 5-file cycle: `src/career/awards.ts -> src/career/playoffs.ts -> src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`

## Communities (75 total, 25 thin omitted)

### Community 0 - "draft/ui.ts"
Cohesion: 0.12
Nodes (31): collarTexture(), COMMISH, commissionerBody(), FORE_LEN, FORE_PIVOT_Y, foreArmTexture(), hex(), jacket() (+23 more)

### Community 2 - "CombineResultado.ts"
Cohesion: 0.17
Nodes (15): Attempt, grade(), projection(), TESTS, calcOvr(), CombineHub, DESC, fmtRaw() (+7 more)

### Community 3 - "tvText"
Cohesion: 0.25
Nodes (7): hexNum(), updateSave(), Add, CareerCreate, collegeKit(), STEPS, tvText()

### Community 4 - "Player"
Cohesion: 0.15
Nodes (10): Player, LiveEvents, LivePlay, separatePlayers(), arrive(), dist(), nearest(), pursue() (+2 more)

### Community 5 - "CarreiraMenu.ts"
Cohesion: 0.07
Nodes (52): add(), boxFor(), clampInt(), conferenceSeeds(), CONFS, divisionOf(), divisionTable(), DIVS (+44 more)

### Community 6 - "DraftEspera.ts"
Cohesion: 0.20
Nodes (21): podium(), currentDraft(), money(), ord(), bigButton(), board(), commissioner(), draftScene() (+13 more)

### Community 7 - "passing.ts"
Cohesion: 0.12
Nodes (14): FIELD, ROUTES, Receiver, ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG, Status (+6 more)

### Community 8 - "CarreiraMenu"
Cohesion: 0.21
Nodes (11): CarreiraMenu, f1(), grpOf(), hex(), nf(), ovc(), arrowAfter(), fillPlate() (+3 more)

### Community 9 - "index.html (shell do jogo QB Career)"
Cohesion: 0.50
Nodes (4): #game container, index.html (shell do jogo QB Career), PWA manifest.webmanifest + icons, /src/main.ts (entry script)

### Community 10 - ".buildPersFixed"
Cohesion: 0.31
Nodes (5): KIT_IDS, kitAccents(), kitInfo(), shade(), LookOptions

### Community 11 - "title"
Cohesion: 0.11
Nodes (22): forcePanel(), Actor, MID, playerLook(), bottomShade(), brand(), infoPanel(), MeterBar (+14 more)

### Community 12 - "phaser"
Cohesion: 0.37
Nodes (10): phaser, FONT_TITLE, GAME_H, GAME_W, backButton(), MenuButton, bottomGradient(), GlassButtonOpts (+2 more)

### Community 13 - ".project"
Cohesion: 0.20
Nodes (4): FieldRenderer, Grandstand, pointAt(), toPlaneX()

### Community 14 - "Projection"
Cohesion: 0.10
Nodes (17): COLORS, drawGoalPost(), drawPylon(), p, BillboardLayer, p, q, ShadowLight (+9 more)

### Community 15 - "grandstand.ts"
Cohesion: 0.08
Nodes (40): CityPiece, CitySpec, DOMES, isDome(), Stadium, stadiumOf(), STADIUMS, STAND_IDS (+32 more)

### Community 16 - "stage.ts"
Cohesion: 0.07
Nodes (14): ActorLook, CombineStage, hexStr(), College, COLLEGES, Ball, g0, g1 (+6 more)

### Community 17 - "Player.ts"
Cohesion: 0.16
Nodes (18): SPRITE_SCALE, Attributes, BASE, drawDive(), drawDiveFlat(), drawDiveUp(), drawPlayer(), drawSide() (+10 more)

### Community 18 - "groundfx.ts"
Cohesion: 0.22
Nodes (10): a, b, c, d, groundArrowHead(), groundOval(), groundRing(), groundSegment() (+2 more)

### Community 19 - "daytime.ts"
Cohesion: 0.15
Nodes (16): guestTeam(), hostTeam(), CORNERS, Daylight, pickTimeOfDay(), RGB, shadowLights(), SkyWeather (+8 more)

### Community 20 - "sprites.ts"
Cohesion: 0.12
Nodes (20): TeamConfig, TEX_PX, BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD, HOLD_LEGS (+12 more)

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, @fontsource/saira-condensed, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite (+13 more)

### Community 24 - "TeamRepository.ts"
Cohesion: 0.16
Nodes (19): 5.2 Kits travados (`kits.ts`), toConfig(), build(), BY_ID, cityOf(), contrast(), deriveKits(), PHOTO (+11 more)

### Community 25 - "Sideline.ts"
Cohesion: 0.19
Nodes (15): AREA, BENCH, fx(), fy(), Side, Sideline, STAND_GAP, box() (+7 more)

### Community 26 - "live.ts"
Cohesion: 0.12
Nodes (18): RouteKind, blockAssignments(), readText(), Scheme, SchemeId, SCHEMES, Zone, difficulty (+10 more)

### Community 27 - "awards.ts"
Cohesion: 0.23
Nodes (15): Award, awardsReady(), awardsRecap(), AwardWinner, DEF, defScore(), lineOf(), OFF (+7 more)

### Community 28 - "PlayerSave.ts"
Cohesion: 0.16
Nodes (18): activeSlot(), CareerState, CombineResult, DEFAULT_ATTRS, DEFAULT_LOOK, defaultSave(), deleteSlot(), keyOf() (+10 more)

### Community 29 - "MainMenu.ts"
Cohesion: 0.16
Nodes (13): applyMatchup(), saveMatchConfig(), WeatherChoice, teamById(), uiColor(), Uniform, hexOf(), MainMenu (+5 more)

### Community 30 - "trophies.ts"
Cohesion: 0.23
Nodes (14): pick(), seasonYear(), champion(), championOf(), gameChampions(), revealed(), teamTitles(), titlesOf() (+6 more)

### Community 31 - "scoring.ts"
Cohesion: 0.06
Nodes (24): CombineBase, attrsFromCombine(), clamp(), finalScore(), QB_AVG, qbRanking(), score40(), scoreArm() (+16 more)

### Community 32 - "tv.ts"
Cohesion: 0.17
Nodes (15): Do:, BugOpts, CardOpts, drawWipe(), FONT_TV, reduced(), runWipe(), SLANT (+7 more)

### Community 33 - "MatchScene.ts"
Cohesion: 0.12
Nodes (29): broadcast, CAMERA, CLOCK_RATE, finalGame, FONT_LABEL, logoKey(), MATCH_SEED, matchConfig (+21 more)

### Community 34 - "plays.ts"
Cohesion: 0.13
Nodes (13): FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS, Role, RouteDef (+5 more)

### Community 35 - "primeBoard.ts"
Cohesion: 0.27
Nodes (9): buildPrimeBoard(), hex(), poly(), Prime, PrimeBoard, primeKind, Rect, seg() (+1 more)

### Community 36 - "DefenseScreen"
Cohesion: 0.18
Nodes (5): 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS, DefenseScreen

### Community 38 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 39 - "Components"
Cohesion: 0.08
Nodes (25): Abas da carreira, Colors, Components, Design System: QB Career (menus), Destaque "é você", Do's and Don'ts, Don't:, Elevation & Depth (+17 more)

### Community 40 - "RecvKey"
Cohesion: 0.30
Nodes (4): RecvKey, groundArrow(), groundPath(), statusOf()

### Community 41 - "main.ts"
Cohesion: 0.12
Nodes (10): boot(), Boot, CareerHub, CareerTest, PlayerTest, careerAssetCounts(), GROUPS, queueCareerAssets() (+2 more)

### Community 48 - "GlassButton"
Cohesion: 0.16
Nodes (3): KickUi, Menu, GlassButton

### Community 50 - "getSave"
Cohesion: 0.10
Nodes (47): finalMvp(), bracket, careerTeam(), COACHES, conferenceOf(), contractOf(), ensureSeason(), faceFor() (+39 more)

### Community 52 - "plate"
Cohesion: 0.12
Nodes (17): KitId, glassCard(), KIT_NAMES, PreJogo, portrait(), portraitTexture(), lum(), mix() (+9 more)

### Community 53 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 59 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.12
Nodes (16): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), 5.1 Layout, 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 0 — REGRAS GLOBAIS, PARTE 2 — DADOS E ESTADO (+8 more)

### Community 60 - "PlayerBody.ts"
Cohesion: 0.16
Nodes (15): Etapa 2 — Jogador em camadas e rosto, KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite() (+7 more)

### Community 62 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.11
Nodes (19): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+11 more)

### Community 63 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 64 - "PlayerFace"
Cohesion: 0.18
Nodes (10): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), bustTexture(), CELL, FACE_COUNT, HAIR_COUNT (+2 more)

### Community 66 - "QB Career 🏈"
Cohesion: 0.29
Nodes (6): A partida, Como rodar, Como é a carreira, Estrutura do projeto, QB Career 🏈, Tudo feito em código

### Community 67 - "jerseyArt.ts"
Cohesion: 0.53
Nodes (5): css(), JerseyOpts, jerseyTexture(), lum(), mix()

### Community 70 - "DefenseScreen.ts"
Cohesion: 0.60
Nodes (3): DriveResult, DriveRow, DefenseOpts

## Knowledge Gaps
- **247 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+242 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 373 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `Player`, `passing.ts`, `stage.ts`, `groundfx.ts`, `daytime.ts`, `.showFinal`, `Weather`, `live.ts`, `MainMenu.ts`, `MatchScene.ts`, `DefenseScreen`, `Hud`, `RecvKey`, `Intro`, `LiveUi`, `CarrierControl`, `.buildLive`, `GlassButton`, `.startKick`, `getSave`, `.create`, `vibrate`, `Feedback`, `.update`, `Replay`, `ResultCard`, `Tag`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `phaser` connect `phaser` to `draft/ui.ts`, `CombineResultado.ts`, `tvText`, `CarreiraMenu.ts`, `DraftEspera.ts`, `title`, `Projection`, `grandstand.ts`, `stage.ts`, `Player.ts`, `groundfx.ts`, `daytime.ts`, `sprites.ts`, `package.json`, `Sideline.ts`, `PlayerSave.ts`, `MainMenu.ts`, `tv.ts`, `MatchScene.ts`, `primeBoard.ts`, `main.ts`, `Pane`, `plate`, `PlayerBody.ts`, `PlayerFace`, `jerseyArt.ts`, `DefenseScreen.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `draft/ui.ts`, `MatchScene`, `CombineResultado.ts`, `tvText`, `CarreiraMenu.ts`, `DraftEspera.ts`, `CarreiraMenu`, `.buildPersFixed`, `title`, `phaser`, `stage.ts`, `awards.ts`, `PlayerSave.ts`, `trophies.ts`, `scoring.ts`, `MatchScene.ts`, `main.ts`, `Combine3Cones`, `plate`, `.create`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _247 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11586452762923351 - nodes in this community are weakly interconnected._
- **Should `MatchScene` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.146218487394958 - nodes in this community are weakly interconnected._