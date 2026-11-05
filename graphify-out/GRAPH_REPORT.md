# Graph Report - qb-career  (2026-11-05)

## Corpus Check
- 112 files · ~447,377 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .log 2, (none) 1, .webmanifest 1)

## Summary
- 1431 nodes · 4988 edges · 71 communities (48 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d12ef58a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draft/ui.ts
- scoring.ts
- logic.ts
- .build
- Player
- CarreiraMenu.ts
- tv.ts
- passing.ts
- CarreiraMenu
- index.html (shell do jogo QB Career)
- .drawPers
- CombineStage
- config.ts
- Grandstand
- Projection
- grandstand.ts
- Ball
- Player.ts
- CombinePasse.ts
- daytime.ts
- Sideline.ts
- MatchScene
- Weather
- package.json
- PARTE 5 — PERSONALIZAR (uniforme travado pelo time)
- Combine3Cones.ts
- Hud
- awards.ts
- .filled
- MainMenu.ts
- getSave
- CombineForca.ts
- DraftEspera.ts
- CombineBase
- MatchScene.ts
- primeBoard.ts
- tvText
- Combine3Cones
- compilerOptions
- Components
- Tag
- PlayerTest.ts
- Pane
- Intro
- LiveUi
- Combine40
- CarrierControl
- Fx
- widgets.ts
- KickUi
- season.ts
- LiveUiHandlers
- 3.2 Combine (com a gameplay dos testes)
- manifest.json
- .create
- vibrate
- jerseyArt.ts
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- phaser
- QB Career — Ordem de execução no Claude Code
- Product
- PlayerFace
- QB Career 🏈
- ResultCard
- Menus do QB Career (fora de campo)
- PlayerBody.ts

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 131 edges
2. `getSave()` - 96 edges
3. `tvText()` - 84 edges
4. `plate()` - 75 edges
5. `phaser` - 70 edges
6. `Player` - 59 edges
7. `plateShadow()` - 51 edges
8. `CarreiraMenu` - 50 edges
9. `TvButton` - 45 edges
10. `GAME_W` - 41 edges

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

## Communities (71 total, 23 thin omitted)

### Community 0 - "draft/ui.ts"
Cohesion: 0.12
Nodes (31): collarTexture(), COMMISH, commissionerBody(), FORE_LEN, FORE_PIVOT_Y, foreArmTexture(), hex(), jacket() (+23 more)

### Community 1 - "scoring.ts"
Cohesion: 0.19
Nodes (9): attrsFromCombine(), QB_AVG, score40(), scoreCones(), SKIP_SCORE, timeScore(), Attrs, DEFAULT_ATTRS (+1 more)

### Community 2 - "logic.ts"
Cohesion: 0.24
Nodes (12): finalScore(), qbRanking(), teamInterest(), contractValue(), DraftInfo, draftOrder(), FIRST, LAST (+4 more)

### Community 3 - ".build"
Cohesion: 0.29
Nodes (3): hexNum(), CareerCreate, collegeKit()

### Community 4 - "Player"
Cohesion: 0.11
Nodes (17): FIELD, Player, LiveEvents, LivePlay, Phase, Receiver, separatePlayers(), RouteRunner (+9 more)

### Community 5 - "CarreiraMenu.ts"
Cohesion: 0.06
Nodes (55): add(), boxFor(), clampInt(), conferenceSeeds(), CONFS, divisionTable(), DIVS, emptyLine() (+47 more)

### Community 6 - "tv.ts"
Cohesion: 0.12
Nodes (30): Do:, Attempt, grade(), projection(), TESTS, CombineHub, DESC, fmtRaw() (+22 more)

### Community 7 - "passing.ts"
Cohesion: 0.14
Nodes (10): hexStr(), aimFromDrag(), ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG, Read, readThrow() (+2 more)

### Community 8 - "CarreiraMenu"
Cohesion: 0.21
Nodes (11): divisionOf(), CarreiraMenu, f1(), grpOf(), hex(), nf(), ovc(), fillPlate() (+3 more)

### Community 9 - "index.html (shell do jogo QB Career)"
Cohesion: 0.50
Nodes (4): #game container, index.html (shell do jogo QB Career), PWA manifest.webmanifest + icons, /src/main.ts (entry script)

### Community 10 - ".drawPers"
Cohesion: 0.17
Nodes (9): KIT_IDS, kitAccents(), KitId, kitInfo(), shade(), pick(), LookOptions, PreJogo (+1 more)

### Community 11 - "CombineStage"
Cohesion: 0.15
Nodes (3): Actor, CombineStage, hexStr()

### Community 12 - "config.ts"
Cohesion: 0.12
Nodes (22): ActorLook, COLORS, finalGame, FONT_LABEL, FONT_TITLE, matchConfig, playoffLogo, SPRITE_SCALE (+14 more)

### Community 13 - "Grandstand"
Cohesion: 0.39
Nodes (3): Grandstand, pointAt(), wallQuad()

### Community 14 - "Projection"
Cohesion: 0.10
Nodes (16): CAMERA, hostTeam(), g0, g1, p, drawGoalPost(), drawPylon(), p (+8 more)

### Community 15 - "grandstand.ts"
Cohesion: 0.07
Nodes (44): CityPiece, CitySpec, DOMES, isDome(), Stadium, stadiumOf(), STADIUMS, STAND_IDS (+36 more)

### Community 17 - "Player.ts"
Cohesion: 0.16
Nodes (18): Side, Slot, Attributes, BASE, drawDive(), drawDiveFlat(), drawDiveUp(), drawPlayer() (+10 more)

### Community 18 - "CombinePasse.ts"
Cohesion: 0.12
Nodes (16): RecvKey, CombinePasse, fillQuad(), a, b, c, d, groundArrow() (+8 more)

### Community 19 - "daytime.ts"
Cohesion: 0.17
Nodes (16): guestTeam(), Sideline, BillboardLayer, CORNERS, pickTimeOfDay(), RGB, ShadowLight, shadowLights() (+8 more)

### Community 20 - "Sideline.ts"
Cohesion: 0.09
Nodes (31): MATCH_SEED, TEX_PX, AREA, BENCH, fx(), fy(), Side, BARE_HEAD (+23 more)

### Community 21 - "MatchScene"
Cohesion: 0.08
Nodes (6): careerMatch(), MatchScene, tipText(), spotName(), statusOf(), CardOpts

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, @fontsource/saira-condensed, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite (+13 more)

### Community 24 - "PARTE 5 — PERSONALIZAR (uniforme travado pelo time)"
Cohesion: 0.40
Nodes (5): 5.1 Layout, 5.2 Kits travados (`kits.ts`), 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 5 — PERSONALIZAR (uniforme travado pelo time)

### Community 25 - "Combine3Cones.ts"
Cohesion: 0.22
Nodes (9): MID, playerLook(), bottomShade(), fieldText(), ARROW, BASE, CUT, Dir (+1 more)

### Community 27 - "awards.ts"
Cohesion: 0.21
Nodes (16): Award, awardsReady(), awardsRecap(), AwardWinner, DEF, defScore(), lineOf(), OFF (+8 more)

### Community 28 - ".filled"
Cohesion: 0.26
Nodes (6): activeSlot(), setActiveSlot(), ago(), CareerSlots, hexNum(), stageOf()

### Community 29 - "MainMenu.ts"
Cohesion: 0.08
Nodes (42): applyMatchup(), getFavorite(), logoKey(), PrimeKey, saveMatchConfig(), setFavorite(), TeamConfig, toConfig() (+34 more)

### Community 30 - "getSave"
Cohesion: 0.10
Nodes (43): finalMvp(), bracket, careerTeam(), conferenceOf(), contractOf(), ensureSeason(), finalInfo(), nextGame() (+35 more)

### Community 31 - "CombineForca.ts"
Cohesion: 0.20
Nodes (5): clamp(), scoreArm(), MeterBar, pill(), CombineForca

### Community 32 - "DraftEspera.ts"
Cohesion: 0.21
Nodes (19): podium(), currentDraft(), money(), ord(), bigButton(), board(), commissioner(), draftScene() (+11 more)

### Community 34 - "MatchScene.ts"
Cohesion: 0.08
Nodes (33): CLOCK_RATE, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS, Role (+25 more)

### Community 35 - "primeBoard.ts"
Cohesion: 0.13
Nodes (18): broadcast, matchRecords, QUARTER_SECONDS, GameState, buildPrimeBoard(), football(), hex(), mix() (+10 more)

### Community 36 - "tvText"
Cohesion: 0.11
Nodes (22): forcePanel(), brand(), infoPanel(), mix(), primaryButton(), sideButtons(), UI_DEPTH, College (+14 more)

### Community 38 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 39 - "Components"
Cohesion: 0.08
Nodes (25): Abas da carreira, Colors, Components, Design System: QB Career (menus), Destaque "é você", Do's and Don'ts, Don't:, Elevation & Depth (+17 more)

### Community 41 - "PlayerTest.ts"
Cohesion: 0.21
Nodes (8): backButton(), CareerHub, CareerTest, PlayerTest, careerAssetCounts(), GROUPS, label(), title()

### Community 48 - "widgets.ts"
Cohesion: 0.28
Nodes (5): TEAMS, bottomGradient(), GlassButton, GlassButtonOpts, UI

### Community 50 - "season.ts"
Cohesion: 0.10
Nodes (29): COACHES, faceFor(), FINAL_WEEK, FIRST, KICKOFFS, LAST, mi(), newsFeed() (+21 more)

### Community 52 - "3.2 Combine (com a gameplay dos testes)"
Cohesion: 0.40
Nodes (4): 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS

### Community 53 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 58 - "jerseyArt.ts"
Cohesion: 0.53
Nodes (5): css(), JerseyOpts, jerseyTexture(), lum(), mix()

### Community 59 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.11
Nodes (17): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 0 — REGRAS GLOBAIS (+9 more)

### Community 60 - "phaser"
Cohesion: 0.13
Nodes (25): phaser, GAME_H, GAME_W, RES, boot(), bustTexture(), CELL, FACE_COUNT (+17 more)

### Community 62 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.14
Nodes (14): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+6 more)

### Community 63 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 64 - "PlayerFace"
Cohesion: 0.33
Nodes (5): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), PlayerFace

### Community 66 - "QB Career 🏈"
Cohesion: 0.29
Nodes (6): A partida, Como rodar, Como é a carreira, Estrutura do projeto, QB Career 🏈, Tudo feito em código

### Community 70 - "PlayerBody.ts"
Cohesion: 0.16
Nodes (15): Etapa 2 — Jogador em camadas e rosto, KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite() (+7 more)

## Knowledge Gaps
- **246 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+241 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 373 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `Player`, `CarreiraMenu.ts`, `passing.ts`, `Ball`, `CombinePasse.ts`, `daytime.ts`, `Weather`, `Hud`, `MainMenu.ts`, `getSave`, `MatchScene.ts`, `tvText`, `Tag`, `PlayerTest.ts`, `Intro`, `LiveUi`, `CarrierControl`, `Fx`, `widgets.ts`, `KickUi`, `.create`, `vibrate`, `ResultCard`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `phaser` connect `phaser` to `draft/ui.ts`, `scoring.ts`, `CarreiraMenu.ts`, `tv.ts`, `config.ts`, `Projection`, `grandstand.ts`, `Player.ts`, `CombinePasse.ts`, `daytime.ts`, `Sideline.ts`, `package.json`, `Combine3Cones.ts`, `MainMenu.ts`, `CombineForca.ts`, `DraftEspera.ts`, `MatchScene.ts`, `primeBoard.ts`, `tvText`, `PlayerTest.ts`, `Pane`, `widgets.ts`, `jerseyArt.ts`, `PlayerBody.ts`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `draft/ui.ts`, `scoring.ts`, `logic.ts`, `.build`, `Player`, `CarreiraMenu.ts`, `tv.ts`, `CarreiraMenu`, `.drawPers`, `config.ts`, `MatchScene`, `Combine3Cones.ts`, `awards.ts`, `CombineForca.ts`, `DraftEspera.ts`, `CombineBase`, `MatchScene.ts`, `tvText`, `Combine3Cones`, `PlayerTest.ts`, `Combine40`, `season.ts`, `.create`, `phaser`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _246 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11586452762923351 - nodes in this community are weakly interconnected._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.1125886524822695 - nodes in this community are weakly interconnected._
- **Should `CarreiraMenu.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06487434248977206 - nodes in this community are weakly interconnected._