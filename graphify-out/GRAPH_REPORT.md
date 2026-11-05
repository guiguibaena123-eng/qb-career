# Graph Report - qb-career  (2026-11-05)

## Corpus Check
- 112 files · ~446,455 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .log 2, (none) 1, .webmanifest 1)

## Summary
- 1427 nodes · 4937 edges · 73 communities (53 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7328ee0d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draft/ui.ts
- MainMenu.ts
- tvText
- LivePlay
- CarreiraMenu.ts
- plateShadow
- passing.ts
- CarreiraMenu
- index.html (shell do jogo QB Career)
- PreJogo.ts
- title
- MatchScene.ts
- .project
- Projection
- grandstand.ts
- Ball
- Player.ts
- groundfx.ts
- daytime.ts
- Sideline.ts
- .endPlay
- Weather
- package.json
- PARTE 5 — PERSONALIZAR (uniforme travado pelo time)
- Player
- live.ts
- awards.ts
- PlayerSave.ts
- TvButton
- trophies.ts
- scoring.ts
- tv.ts
- gradcard.ts
- plays.ts
- primeBoard.ts
- DefenseScreen
- Feedback
- compilerOptions
- Components
- Tag
- main.ts
- Pane
- label
- LiveUi
- billboards.ts
- FIELD
- Fx
- Menu
- FaceLook
- getSave
- LiveUiHandlers
- 3.2 Combine (com a gameplay dos testes)
- manifest.json
- .create
- .startLive
- Daylight
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- CareerCreate.ts
- MatchScene
- QB Career — Ordem de execução no Claude Code
- Product
- PlayerFace
- QB Career 🏈
- ResultCard
- Menus do QB Career (fora de campo)
- PlayerBody.ts
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

## Communities (73 total, 20 thin omitted)

### Community 0 - "draft/ui.ts"
Cohesion: 0.06
Nodes (73): 5.2 Kits travados (`kits.ts`), finalScore(), build(), BY_ID, cityOf(), contrast(), deriveKits(), PHOTO (+65 more)

### Community 2 - "MainMenu.ts"
Cohesion: 0.18
Nodes (15): PrimeKey, saveMatchConfig(), TeamConfig, WeatherChoice, autoUniform(), BY_ID, colorDist(), css() (+7 more)

### Community 3 - "tvText"
Cohesion: 0.15
Nodes (10): kitInfo(), updateSave(), CareerCreate, mix(), plate(), plateLine(), platePts(), sectionHead() (+2 more)

### Community 4 - "LivePlay"
Cohesion: 0.21
Nodes (8): LivePlay, separatePlayers(), arrive(), dist(), nearest(), pursue(), seek(), steer()

### Community 5 - "CarreiraMenu.ts"
Cohesion: 0.06
Nodes (53): add(), boxFor(), clampInt(), conferenceSeeds(), CONFS, divisionOf(), divisionTable(), DIVS (+45 more)

### Community 6 - "plateShadow"
Cohesion: 0.12
Nodes (18): Attempt, grade(), projection(), TESTS, Boot, CombineHub, DESC, fmtRaw() (+10 more)

### Community 7 - "passing.ts"
Cohesion: 0.15
Nodes (8): RecvKey, ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG, Read, Status, STATUS_COLOR

### Community 8 - "CarreiraMenu"
Cohesion: 0.22
Nodes (10): CarreiraMenu, f1(), grpOf(), hex(), nf(), ovc(), fillPlate(), label() (+2 more)

### Community 9 - "index.html (shell do jogo QB Career)"
Cohesion: 0.50
Nodes (4): #game container, index.html (shell do jogo QB Career), PWA manifest.webmanifest + icons, /src/main.ts (entry script)

### Community 10 - "PreJogo.ts"
Cohesion: 0.18
Nodes (14): KIT_IDS, kitAccents(), KitId, shade(), ROUND_INFO, PRIME, KitDef, KIT_NAMES (+6 more)

### Community 11 - "title"
Cohesion: 0.08
Nodes (28): forcePanel(), Actor, ActorLook, CombineStage, hexStr(), MID, playerLook(), bottomShade() (+20 more)

### Community 12 - "MatchScene.ts"
Cohesion: 0.16
Nodes (32): phaser, Round, broadcast, CLOCK_RATE, finalGame, FONT_LABEL, FONT_TITLE, GAME_H (+24 more)

### Community 13 - ".project"
Cohesion: 0.20
Nodes (4): FieldRenderer, Grandstand, pointAt(), wallQuad()

### Community 14 - "Projection"
Cohesion: 0.09
Nodes (22): CAMERA, COLORS, g0, g1, p, drawGoalPost(), drawPylon(), p (+14 more)

### Community 15 - "grandstand.ts"
Cohesion: 0.07
Nodes (45): CityPiece, CitySpec, DOMES, isDome(), Stadium, stadiumOf(), STADIUMS, STAND_IDS (+37 more)

### Community 16 - "Ball"
Cohesion: 0.15
Nodes (3): Ball, Throw, Replay

### Community 17 - "Player.ts"
Cohesion: 0.16
Nodes (18): Side, Slot, Attributes, BASE, drawDive(), drawDiveFlat(), drawDiveUp(), drawPlayer() (+10 more)

### Community 18 - "groundfx.ts"
Cohesion: 0.20
Nodes (13): fillQuad(), a, b, c, d, groundArrow(), groundArrowHead(), groundOval() (+5 more)

### Community 19 - "daytime.ts"
Cohesion: 0.17
Nodes (15): guestTeam(), hostTeam(), CORNERS, pickTimeOfDay(), RGB, shadowLights(), SkyWeather, TimeChoice (+7 more)

### Community 20 - "Sideline.ts"
Cohesion: 0.09
Nodes (31): TEX_PX, AREA, BENCH, fx(), fy(), Side, Sideline, sidelineOptions (+23 more)

### Community 21 - ".endPlay"
Cohesion: 0.19
Nodes (3): tipText(), statusOf(), CardOpts

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, @fontsource/saira-condensed, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite (+13 more)

### Community 24 - "PARTE 5 — PERSONALIZAR (uniforme travado pelo time)"
Cohesion: 0.50
Nodes (4): 5.1 Layout, 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 5 — PERSONALIZAR (uniforme travado pelo time)

### Community 25 - "Player"
Cohesion: 0.18
Nodes (4): Player, LiveEvents, Receiver, RouteRunner

### Community 26 - "live.ts"
Cohesion: 0.26
Nodes (9): difficulty, DifficultyDef, Level, LEVELS, ORDER, Phase, TACKLE_RANGE, TackleResult (+1 more)

### Community 27 - "awards.ts"
Cohesion: 0.24
Nodes (14): Award, awardsReady(), AwardWinner, DEF, defScore(), lineOf(), OFF, offScore() (+6 more)

### Community 28 - "PlayerSave.ts"
Cohesion: 0.14
Nodes (21): activeSlot(), calcOvr(), CareerState, CombineResult, DEFAULT_LOOK, defaultSave(), deleteSlot(), keyOf() (+13 more)

### Community 29 - "TvButton"
Cohesion: 0.18
Nodes (11): applyMatchup(), logoKey(), toConfig(), teamById(), uiColor(), hexOf(), MainMenu, arrowAfter() (+3 more)

### Community 30 - "trophies.ts"
Cohesion: 0.25
Nodes (12): champion(), championOf(), gameChampions(), revealed(), teamTitles(), titlesOf(), Trophy, trophyCase() (+4 more)

### Community 31 - "scoring.ts"
Cohesion: 0.05
Nodes (18): CombineBase, attrsFromCombine(), clamp(), QB_AVG, qbRanking(), score40(), scoreArm(), scoreCones() (+10 more)

### Community 32 - "tv.ts"
Cohesion: 0.16
Nodes (16): Do:, BugOpts, CardOpts, drawWipe(), FONT_TV, reduced(), runWipe(), SLANT (+8 more)

### Community 33 - "gradcard.ts"
Cohesion: 0.53
Nodes (5): gradCard(), GradOpts, gradTexture(), path(), rgba()

### Community 34 - "plays.ts"
Cohesion: 0.12
Nodes (18): FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS, Role, RouteDef (+10 more)

### Community 35 - "primeBoard.ts"
Cohesion: 0.10
Nodes (16): GameState, Hud, buildPrimeBoard(), football(), hex(), mix(), outline(), poly() (+8 more)

### Community 38 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 39 - "Components"
Cohesion: 0.08
Nodes (25): Abas da carreira, Colors, Components, Design System: QB Career (menus), Destaque "é você", Do's and Don'ts, Don't:, Elevation & Depth (+17 more)

### Community 41 - "main.ts"
Cohesion: 0.15
Nodes (10): RES, boot(), backButton(), CareerHub, CareerTest, PlayerTest, careerAssetCounts(), GROUPS (+2 more)

### Community 43 - "label"
Cohesion: 0.19
Nodes (3): Intro, KickUi, label()

### Community 45 - "billboards.ts"
Cohesion: 0.33
Nodes (4): SPRITE_SCALE, Billboard, p, q

### Community 46 - "FIELD"
Cohesion: 0.16
Nodes (5): FIELD, bestLane(), Lane, segDist(), CarrierControl

### Community 49 - "FaceLook"
Cohesion: 0.40
Nodes (3): BodyLook, FaceLook, LookOptions

### Community 50 - "getSave"
Cohesion: 0.12
Nodes (41): awardsRecap(), finalMvp(), bracket, careerTeam(), COACHES, conferenceOf(), contractOf(), ensureSeason() (+33 more)

### Community 52 - "3.2 Combine (com a gameplay dos testes)"
Cohesion: 0.40
Nodes (4): 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS

### Community 53 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 59 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.15
Nodes (12): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), PARTE 0 — REGRAS GLOBAIS, PARTE 2 — DADOS E ESTADO, PARTE 4 — MENU DA CARREIRA (CarreiraMenu), PARTE 6 — INTEGRAÇÃO COM A GAMEPLAY EXISTENTE, Projeto existente (+4 more)

### Community 60 - "CareerCreate.ts"
Cohesion: 0.20
Nodes (14): BEARD_COUNT, CELL, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, SKINS, Add, collegeKit() (+6 more)

### Community 61 - "MatchScene"
Cohesion: 0.12
Nodes (3): hexStr(), MatchScene, readThrow()

### Community 62 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.14
Nodes (14): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+6 more)

### Community 63 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 64 - "PlayerFace"
Cohesion: 0.29
Nodes (6): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), bustTexture(), PlayerFace

### Community 66 - "QB Career 🏈"
Cohesion: 0.29
Nodes (6): A partida, Como rodar, Como é a carreira, Estrutura do projeto, QB Career 🏈, Tudo feito em código

### Community 70 - "PlayerBody.ts"
Cohesion: 0.18
Nodes (13): Etapa 2 — Jogador em camadas e rosto, baseLayers(), BODY_H, BODY_SCALE, BODY_W, composite(), key(), Layer (+5 more)

### Community 71 - "7.2 Como trabalhar (uma etapa por vez)"
Cohesion: 0.40
Nodes (5): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS

## Knowledge Gaps
- **246 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+241 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 372 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `.startKick`, `MainMenu.ts`, `LivePlay`, `passing.ts`, `MatchScene.ts`, `Ball`, `groundfx.ts`, `daytime.ts`, `.endPlay`, `Weather`, `Player`, `TvButton`, `plays.ts`, `primeBoard.ts`, `DefenseScreen`, `Feedback`, `Tag`, `main.ts`, `label`, `LiveUi`, `FIELD`, `Fx`, `Menu`, `getSave`, `.create`, `.startLive`, `ResultCard`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `phaser` connect `MatchScene.ts` to `draft/ui.ts`, `MainMenu.ts`, `CarreiraMenu.ts`, `plateShadow`, `PreJogo.ts`, `title`, `Projection`, `grandstand.ts`, `Player.ts`, `groundfx.ts`, `daytime.ts`, `Sideline.ts`, `package.json`, `PlayerSave.ts`, `tv.ts`, `gradcard.ts`, `primeBoard.ts`, `main.ts`, `Pane`, `billboards.ts`, `CareerCreate.ts`, `PlayerBody.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `draft/ui.ts`, `tvText`, `CarreiraMenu.ts`, `plateShadow`, `CarreiraMenu`, `main.ts`, `PreJogo.ts`, `title`, `MatchScene.ts`, `CareerCreate.ts`, `FaceLook`, `.create`, `awards.ts`, `PlayerSave.ts`, `trophies.ts`, `scoring.ts`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _246 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06043956043956044 - nodes in this community are weakly interconnected._
- **Should `CarreiraMenu.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06493506493506493 - nodes in this community are weakly interconnected._
- **Should `plateShadow` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._