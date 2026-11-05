# Graph Report - qb-career  (2026-11-05)

## Corpus Check
- 112 files · ~445,931 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .log 2, (none) 1, .webmanifest 1)

## Summary
- 1426 nodes · 4935 edges · 75 communities (50 shown, 25 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5f326c24`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draft/ui.ts
- MatchScene
- Projection
- .build
- Player
- CarreiraMenu.ts
- tvText
- passing.ts
- CarreiraMenu
- index.html (shell do jogo QB Career)
- .drawPers
- title
- config.ts
- FieldRenderer
- field.ts
- grandstand.ts
- Ball
- Player.ts
- groundfx.ts
- daytime.ts
- sprites.ts
- .showFinal
- Weather
- package.json
- PARTE 5 — PERSONALIZAR (uniforme travado pelo time)
- Sideline.ts
- live.ts
- awards.ts
- PlayerSave.ts
- MainMenu.ts
- trophies.ts
- CombineResultado.ts
- tv.ts
- gradcard.ts
- MatchScene.ts
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
- CombineForca
- getSave
- LiveUiHandlers
- Combine40
- manifest.json
- .create
- vibrate
- CombinePasse
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- CareerCreate.ts
- .update
- QB Career — Ordem de execução no Claude Code
- Product
- PlayerFace
- GameState
- QB Career 🏈
- jerseyArt.ts
- ResultCard
- Menus do QB Career (fora de campo)
- .refresh
- 7.2 Como trabalhar (uma etapa por vez)

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 130 edges
2. `getSave()` - 96 edges
3. `phaser` - 70 edges
4. `tvText()` - 68 edges
5. `plate()` - 61 edges
6. `Player` - 59 edges
7. `CarreiraMenu` - 50 edges
8. `title()` - 46 edges
9. `GAME_W` - 41 edges
10. `label()` - 40 edges

## Surprising Connections (you probably didn't know these)
- `5.4 Rosto dentro do capacete` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerFace.ts
- `5.3 Opções editáveis (`LookOptions`)` --references--> `LookOptions`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerSave.ts
- `Etapa 1 — Base do projeto` --references--> `PlayerSave`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerSave.ts
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
Nodes (32): collarTexture(), COMMISH, commissionerBody(), FORE_LEN, FORE_PIVOT_Y, foreArmTexture(), hex(), jacket() (+24 more)

### Community 2 - "Projection"
Cohesion: 0.17
Nodes (6): Grandstand, pointAt(), wallQuad(), Projection, toPlaneT(), toPlaneX()

### Community 3 - ".build"
Cohesion: 0.29
Nodes (3): hexNum(), CareerCreate, collegeKit()

### Community 4 - "Player"
Cohesion: 0.14
Nodes (10): Player, LiveEvents, LivePlay, separatePlayers(), arrive(), dist(), nearest(), pursue() (+2 more)

### Community 5 - "CarreiraMenu.ts"
Cohesion: 0.06
Nodes (57): add(), boxFor(), clampInt(), conferenceSeeds(), CONFS, divisionOf(), divisionTable(), DIVS (+49 more)

### Community 6 - "tvText"
Cohesion: 0.15
Nodes (24): podium(), currentDraft(), money(), ord(), bigButton(), board(), draftScene(), glassCard() (+16 more)

### Community 7 - "passing.ts"
Cohesion: 0.20
Nodes (10): g0, g1, p, aimFromDrag(), ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG (+2 more)

### Community 8 - "CarreiraMenu"
Cohesion: 0.21
Nodes (9): CarreiraMenu, f1(), grpOf(), hex(), nf(), ovc(), fillPlate(), label() (+1 more)

### Community 9 - "index.html (shell do jogo QB Career)"
Cohesion: 0.50
Nodes (4): #game container, index.html (shell do jogo QB Career), PWA manifest.webmanifest + icons, /src/main.ts (entry script)

### Community 10 - ".drawPers"
Cohesion: 0.24
Nodes (7): KIT_IDS, kitAccents(), kitInfo(), shade(), pick(), LookOptions, mix()

### Community 11 - "title"
Cohesion: 0.09
Nodes (26): Attempt, CombineBase, forcePanel(), Actor, ActorLook, CombineStage, hexStr(), MID (+18 more)

### Community 12 - "config.ts"
Cohesion: 0.20
Nodes (23): phaser, broadcast, finalGame, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, matchConfig (+15 more)

### Community 14 - "field.ts"
Cohesion: 0.17
Nodes (13): COLORS, playoffLogo, drawGoalPost(), drawPylon(), p, a, b, c (+5 more)

### Community 15 - "grandstand.ts"
Cohesion: 0.07
Nodes (44): CityPiece, CitySpec, DOMES, isDome(), Stadium, stadiumOf(), STADIUMS, STAND_IDS (+36 more)

### Community 16 - "Ball"
Cohesion: 0.14
Nodes (3): Ball, Throw, Replay

### Community 17 - "Player.ts"
Cohesion: 0.13
Nodes (20): TEX_PX, Side, Slot, Attributes, BASE, drawDive(), drawDiveFlat(), drawDiveUp() (+12 more)

### Community 18 - "groundfx.ts"
Cohesion: 0.20
Nodes (13): fillQuad(), a, b, c, d, groundArrow(), groundArrowHead(), groundOval() (+5 more)

### Community 19 - "daytime.ts"
Cohesion: 0.12
Nodes (20): CAMERA, guestTeam(), SPRITE_SCALE, BillboardLayer, p, q, CORNERS, pickTimeOfDay() (+12 more)

### Community 20 - "sprites.ts"
Cohesion: 0.13
Nodes (19): TeamConfig, BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD, HOLD_LEGS, HOLD_TORSO (+11 more)

### Community 21 - ".showFinal"
Cohesion: 0.23
Nodes (3): tipText(), statusOf(), CardOpts

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, @fontsource/saira-condensed, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite (+13 more)

### Community 24 - "PARTE 5 — PERSONALIZAR (uniforme travado pelo time)"
Cohesion: 0.40
Nodes (5): 5.1 Layout, 5.2 Kits travados (`kits.ts`), 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 5 — PERSONALIZAR (uniforme travado pelo time)

### Community 25 - "Sideline.ts"
Cohesion: 0.19
Nodes (14): MATCH_SEED, AREA, BENCH, fx(), fy(), Side, Sideline, sidelineOptions (+6 more)

### Community 26 - "live.ts"
Cohesion: 0.18
Nodes (10): difficulty, DifficultyDef, LEVELS, ORDER, Phase, Receiver, RouteRunner, TACKLE_RANGE (+2 more)

### Community 27 - "awards.ts"
Cohesion: 0.25
Nodes (14): Award, awardsReady(), awardsRecap(), AwardWinner, DEF, defScore(), lineOf(), OFF (+6 more)

### Community 28 - "PlayerSave.ts"
Cohesion: 0.16
Nodes (20): activeSlot(), calcOvr(), CareerState, CombineResult, defaultSave(), deleteSlot(), keyOf(), migrateLook() (+12 more)

### Community 29 - "MainMenu.ts"
Cohesion: 0.06
Nodes (51): 3.2 Combine (com a gameplay dos testes), KitId, applyMatchup(), logoKey(), saveMatchConfig(), toConfig(), WeatherChoice, build() (+43 more)

### Community 30 - "trophies.ts"
Cohesion: 0.25
Nodes (13): seasonYear(), champion(), championOf(), gameChampions(), revealed(), teamTitles(), titlesOf(), Trophy (+5 more)

### Community 31 - "CombineResultado.ts"
Cohesion: 0.10
Nodes (29): attrsFromCombine(), clamp(), finalScore(), grade(), projection(), QB_AVG, qbRanking(), score40() (+21 more)

### Community 32 - "tv.ts"
Cohesion: 0.12
Nodes (21): Do:, portrait(), portraitTexture(), BugOpts, CardOpts, drawWipe(), FONT_TV, plateLine() (+13 more)

### Community 33 - "gradcard.ts"
Cohesion: 0.53
Nodes (5): gradCard(), GradOpts, gradTexture(), path(), rgba()

### Community 34 - "MatchScene.ts"
Cohesion: 0.09
Nodes (31): CLOCK_RATE, FIELD, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS (+23 more)

### Community 35 - "primeBoard.ts"
Cohesion: 0.27
Nodes (13): buildPrimeBoard(), football(), hex(), mix(), outline(), poly(), Prime, primeKind (+5 more)

### Community 38 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 39 - "Components"
Cohesion: 0.08
Nodes (25): Abas da carreira, Colors, Components, Design System: QB Career (menus), Destaque "é você", Do's and Don'ts, Don't:, Elevation & Depth (+17 more)

### Community 41 - "main.ts"
Cohesion: 0.13
Nodes (12): boot(), Boot, backButton(), CareerHub, CareerTest, PlayerTest, careerAssetCounts(), GROUPS (+4 more)

### Community 47 - ".buildLive"
Cohesion: 0.10
Nodes (3): Feedback, Read, Fx

### Community 48 - "GlassButton"
Cohesion: 0.16
Nodes (3): KickUi, Menu, GlassButton

### Community 49 - "CombineForca"
Cohesion: 0.22
Nodes (3): MeterBar, mix(), CombineForca

### Community 50 - "getSave"
Cohesion: 0.11
Nodes (43): finalMvp(), bracket, careerTeam(), COACHES, conferenceOf(), contractOf(), ensureSeason(), faceFor() (+35 more)

### Community 53 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 59 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.12
Nodes (15): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 3.1 Criação, 3.3 Draft, 4.1 Miniatura do estádio (foto real pixelada), PARTE 0 — REGRAS GLOBAIS, PARTE 2 — DADOS E ESTADO, PARTE 3 — FLUXO DE TELAS (+7 more)

### Community 60 - "CareerCreate.ts"
Cohesion: 0.14
Nodes (19): KitDef, BODY_H, BODY_SCALE, BODY_W, BodyLook, composite(), key(), Layer (+11 more)

### Community 62 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.14
Nodes (13): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 2 — Jogador em camadas e rosto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira (+5 more)

### Community 63 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 64 - "PlayerFace"
Cohesion: 0.25
Nodes (7): Etapa 7 — PERSONALIZAR, 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), bustTexture(), PlayerFace

### Community 66 - "QB Career 🏈"
Cohesion: 0.29
Nodes (6): A partida, Como rodar, Como é a carreira, Estrutura do projeto, QB Career 🏈, Tudo feito em código

### Community 67 - "jerseyArt.ts"
Cohesion: 0.53
Nodes (5): css(), JerseyOpts, jerseyTexture(), lum(), mix()

### Community 70 - ".refresh"
Cohesion: 0.33
Nodes (3): baseLayers(), shade(), topLayers()

### Community 71 - "7.2 Como trabalhar (uma etapa por vez)"
Cohesion: 0.40
Nodes (5): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS

## Knowledge Gaps
- **246 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+241 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 372 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `Player`, `CarreiraMenu.ts`, `Ball`, `groundfx.ts`, `daytime.ts`, `.showFinal`, `Weather`, `live.ts`, `MainMenu.ts`, `MatchScene.ts`, `DefenseScreen`, `Hud`, `RecvKey`, `Intro`, `LiveUi`, `CarrierControl`, `.buildLive`, `GlassButton`, `getSave`, `.create`, `vibrate`, `.update`, `ResultCard`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `phaser` connect `config.ts` to `draft/ui.ts`, `CarreiraMenu.ts`, `tvText`, `passing.ts`, `title`, `field.ts`, `grandstand.ts`, `Player.ts`, `groundfx.ts`, `daytime.ts`, `sprites.ts`, `package.json`, `Sideline.ts`, `PlayerSave.ts`, `MainMenu.ts`, `CombineResultado.ts`, `tv.ts`, `gradcard.ts`, `MatchScene.ts`, `primeBoard.ts`, `main.ts`, `Pane`, `CareerCreate.ts`, `jerseyArt.ts`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `draft/ui.ts`, `MatchScene`, `.build`, `CarreiraMenu.ts`, `tvText`, `CarreiraMenu`, `.drawPers`, `title`, `config.ts`, `awards.ts`, `PlayerSave.ts`, `MainMenu.ts`, `trophies.ts`, `CombineResultado.ts`, `MatchScene.ts`, `main.ts`, `Combine3Cones`, `CombineForca`, `Combine40`, `.create`, `CareerCreate.ts`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _246 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11596638655462185 - nodes in this community are weakly interconnected._
- **Should `MatchScene` be split into smaller, more focused modules?**
  _Cohesion score 0.12643678160919541 - nodes in this community are weakly interconnected._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._