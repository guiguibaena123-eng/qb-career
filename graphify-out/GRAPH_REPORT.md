# Graph Report - qb-career  (2026-11-05)

## Corpus Check
- 112 files · ~448,231 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .log 2, (none) 1, .webmanifest 1)

## Summary
- 1438 nodes · 5017 edges · 72 communities (48 shown, 24 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 111 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e0e014c2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draft/ui.ts
- Rng
- league.ts
- updateSave
- Player
- CarreiraMenu.ts
- tv.ts
- sprites.ts
- CarreiraMenu
- index.html (shell do jogo QB Career)
- .create
- CombineStage
- stage.ts
- .project
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
- CombinePasse
- Hud
- GameState
- PlayerSave.ts
- MainMenu.ts
- getSave
- scoring.ts
- TeamRepository.ts
- CombineBase
- MatchScene.ts
- primeBoard.ts
- tvText
- Combine3Cones
- compilerOptions
- Components
- Feedback
- PlayerTest.ts
- Pane
- Intro
- LiveUi
- Combine40
- CarrierControl
- Fx
- config.ts
- label
- season.ts
- LiveUiHandlers
- 3.2 Combine (com a gameplay dos testes)
- manifest.json
- gradcard.ts
- vibrate
- jerseyArt.ts
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- phaser
- PARTE 0 — REGRAS GLOBAIS
- QB Career — Ordem de execução no Claude Code
- Product
- PlayerFace
- QB Career 🏈
- ResultCard
- Menus do QB Career (fora de campo)
- PlayerBody.ts

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 131 edges
2. `getSave()` - 97 edges
3. `tvText()` - 85 edges
4. `plate()` - 76 edges
5. `phaser` - 70 edges
6. `Player` - 59 edges
7. `CarreiraMenu` - 51 edges
8. `plateShadow()` - 51 edges
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

## Communities (72 total, 24 thin omitted)

### Community 0 - "draft/ui.ts"
Cohesion: 0.12
Nodes (31): collarTexture(), COMMISH, commissionerBody(), FORE_LEN, FORE_PIVOT_Y, foreArmTexture(), hex(), jacket() (+23 more)

### Community 1 - "Rng"
Cohesion: 0.13
Nodes (22): todInfo, finishTexture(), makeBandTexture(), makeRowTexture(), rowGeom(), stairsU(), DriveRow, simulateDrive() (+14 more)

### Community 2 - "league.ts"
Cohesion: 0.15
Nodes (22): add(), boxFor(), clampInt(), conferenceSeeds(), CONFS, divisionOf(), divisionTable(), DIVS (+14 more)

### Community 3 - "updateSave"
Cohesion: 0.27
Nodes (4): hexNum(), updateSave(), CareerCreate, collegeKit()

### Community 4 - "Player"
Cohesion: 0.11
Nodes (18): FIELD, Player, difficulty, LiveEvents, LivePlay, Phase, Receiver, separatePlayers() (+10 more)

### Community 5 - "CarreiraMenu.ts"
Cohesion: 0.07
Nodes (39): AwardWinner, PLAYOFF_SPOTS, StatLine, PGame, Round, ROUND_INFO, ROUNDS, finalInfo() (+31 more)

### Community 6 - "tv.ts"
Cohesion: 0.10
Nodes (30): Do:, CombineHub, fmtRaw(), KIT_NAMES, portrait(), portraitTexture(), BugOpts, CardOpts (+22 more)

### Community 7 - "sprites.ts"
Cohesion: 0.13
Nodes (16): BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD, HOLD_LEGS, HOLD_TORSO, kit() (+8 more)

### Community 8 - "CarreiraMenu"
Cohesion: 0.19
Nodes (11): CarreiraMenu, f1(), groupOf(), grpOf(), hex(), nf(), ovc(), fillPlate() (+3 more)

### Community 9 - "index.html (shell do jogo QB Career)"
Cohesion: 0.50
Nodes (4): #game container, index.html (shell do jogo QB Career), PWA manifest.webmanifest + icons, /src/main.ts (entry script)

### Community 10 - ".create"
Cohesion: 0.14
Nodes (11): KIT_IDS, kitAccents(), KitId, kitInfo(), shade(), pick(), KitDef, BodyLook (+3 more)

### Community 12 - "stage.ts"
Cohesion: 0.23
Nodes (9): Actor, ActorLook, hexStr(), makeLookTexture(), PLAYER_SCALE, Pose, sidelineOptions, Billboard (+1 more)

### Community 13 - ".project"
Cohesion: 0.19
Nodes (5): FieldRenderer, Grandstand, pointAt(), fillQuad(), wallQuad()

### Community 14 - "Projection"
Cohesion: 0.08
Nodes (22): COLORS, playoffLogo, SPRITE_SCALE, drawGoalPost(), drawPylon(), p, BillboardLayer, p (+14 more)

### Community 15 - "grandstand.ts"
Cohesion: 0.08
Nodes (31): finalGame, matchConfig, venue, CityPiece, CitySpec, DOMES, isDome(), Stadium (+23 more)

### Community 16 - "Ball"
Cohesion: 0.08
Nodes (8): Ball, g0, g1, p, POSES, Frame, Replay, Tag

### Community 17 - "Player.ts"
Cohesion: 0.21
Nodes (15): Role, Side, Slot, Attributes, BASE, drawDive(), drawDiveFlat(), drawDiveUp() (+7 more)

### Community 18 - "CombinePasse.ts"
Cohesion: 0.11
Nodes (24): RecvKey, hexStr(), a, b, c, d, groundArrow(), groundArrowHead() (+16 more)

### Community 19 - "daytime.ts"
Cohesion: 0.18
Nodes (15): CAMERA, guestTeam(), hostTeam(), CORNERS, pickTimeOfDay(), RGB, shadowLights(), SkyWeather (+7 more)

### Community 20 - "Sideline.ts"
Cohesion: 0.20
Nodes (13): MATCH_SEED, AREA, BENCH, fx(), fy(), Side, Sideline, STAND_GAP (+5 more)

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, @fontsource/saira-condensed, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite (+13 more)

### Community 24 - "PARTE 5 — PERSONALIZAR (uniforme travado pelo time)"
Cohesion: 0.25
Nodes (8): 5.1 Layout, 5.2 Kits travados (`kits.ts`), 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 5 — PERSONALIZAR (uniforme travado pelo time), build(), cityOf(), deriveKits()

### Community 28 - "PlayerSave.ts"
Cohesion: 0.16
Nodes (18): activeSlot(), calcOvr(), CareerState, CombineResult, defaultSave(), deleteSlot(), keyOf(), migrateLook() (+10 more)

### Community 29 - "MainMenu.ts"
Cohesion: 0.09
Nodes (35): applyMatchup(), getFavorite(), logoKey(), PrimeKey, saveMatchConfig(), setFavorite(), TeamConfig, toConfig() (+27 more)

### Community 30 - "getSave"
Cohesion: 0.14
Nodes (39): Award, awardsReady(), awardsRecap(), DEF, defScore(), finalMvp(), lineOf(), OFF (+31 more)

### Community 31 - "scoring.ts"
Cohesion: 0.08
Nodes (26): attrsFromCombine(), clamp(), projection(), QB_AVG, qbRanking(), score40(), scoreArm(), scoreCones() (+18 more)

### Community 32 - "TeamRepository.ts"
Cohesion: 0.12
Nodes (35): finalScore(), BY_ID, PHOTO, TeamRepository, TEAMS, TEAM_LIST, podium(), contractValue() (+27 more)

### Community 34 - "MatchScene.ts"
Cohesion: 0.09
Nodes (28): FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS, RouteDef, RouteKind (+20 more)

### Community 35 - "primeBoard.ts"
Cohesion: 0.27
Nodes (13): buildPrimeBoard(), football(), hex(), mix(), outline(), poly(), Prime, primeKind (+5 more)

### Community 36 - "tvText"
Cohesion: 0.13
Nodes (20): forcePanel(), brand(), infoPanel(), mix(), primaryButton(), sideButtons(), UI_DEPTH, College (+12 more)

### Community 38 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 39 - "Components"
Cohesion: 0.07
Nodes (26): Abas da carreira, Colors, Components, Design System: QB Career (menus), Destaque "é você", Do's and Don'ts, Don't:, Elevation & Depth (+18 more)

### Community 41 - "PlayerTest.ts"
Cohesion: 0.27
Nodes (8): BEARD_COUNT, CELL, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, SHAPE, SKINS, PlayerTest

### Community 48 - "config.ts"
Cohesion: 0.24
Nodes (12): broadcast, CLOCK_RATE, FONT_LABEL, FONT_TITLE, matchRecords, QUARTER_SECONDS, TEAMS, TEX_PX (+4 more)

### Community 49 - "label"
Cohesion: 0.17
Nodes (5): backButton(), KickUi, GlassButton, label(), title()

### Community 50 - "season.ts"
Cohesion: 0.09
Nodes (30): LeaguePlayer, COACHES, FINAL_WEEK, FIRST, Game, KICKOFFS, LAST, mi() (+22 more)

### Community 52 - "3.2 Combine (com a gameplay dos testes)"
Cohesion: 0.40
Nodes (4): 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS

### Community 53 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 54 - "gradcard.ts"
Cohesion: 0.53
Nodes (5): gradCard(), GradOpts, gradTexture(), path(), rgba()

### Community 58 - "jerseyArt.ts"
Cohesion: 0.53
Nodes (5): css(), JerseyOpts, jerseyTexture(), lum(), mix()

### Community 59 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.15
Nodes (12): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 2 — DADOS E ESTADO (+4 more)

### Community 60 - "phaser"
Cohesion: 0.13
Nodes (25): phaser, Attempt, grade(), TESTS, GAME_H, GAME_W, RES, boot() (+17 more)

### Community 61 - "PARTE 0 — REGRAS GLOBAIS"
Cohesion: 0.40
Nodes (5): PARTE 0 — REGRAS GLOBAIS, Projeto existente, Qualidade e desempenho, REGRA Nº 0 — TUDO EM CÓDIGO, NADA DE IA (com exceção dos assets fornecidos), Regras de marca

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

## Knowledge Gaps
- **247 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+242 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 373 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `MatchScene.ts`, `Player`, `CarreiraMenu.ts`, `tvText`, `ResultCard`, `Feedback`, `Intro`, `LiveUi`, `CarrierControl`, `Fx`, `Ball`, `label`, `CombinePasse.ts`, `daytime.ts`, `Weather`, `vibrate`, `Hud`, `MainMenu.ts`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `phaser` connect `phaser` to `draft/ui.ts`, `Rng`, `CarreiraMenu.ts`, `tv.ts`, `sprites.ts`, `stage.ts`, `Projection`, `grandstand.ts`, `Ball`, `Player.ts`, `CombinePasse.ts`, `daytime.ts`, `Sideline.ts`, `package.json`, `PlayerSave.ts`, `MainMenu.ts`, `scoring.ts`, `TeamRepository.ts`, `MatchScene.ts`, `primeBoard.ts`, `tvText`, `PlayerTest.ts`, `Pane`, `config.ts`, `gradcard.ts`, `jerseyArt.ts`, `PlayerBody.ts`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `draft/ui.ts`, `league.ts`, `updateSave`, `CarreiraMenu.ts`, `tv.ts`, `CarreiraMenu`, `.create`, `stage.ts`, `MatchScene`, `PlayerSave.ts`, `scoring.ts`, `TeamRepository.ts`, `CombineBase`, `MatchScene.ts`, `tvText`, `Combine3Cones`, `Combine40`, `label`, `season.ts`, `phaser`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _247 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11586452762923351 - nodes in this community are weakly interconnected._
- **Should `Rng` be split into smaller, more focused modules?**
  _Cohesion score 0.12773109243697478 - nodes in this community are weakly interconnected._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.11347517730496454 - nodes in this community are weakly interconnected._