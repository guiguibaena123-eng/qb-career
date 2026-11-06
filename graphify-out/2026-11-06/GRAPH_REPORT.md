# Graph Report - qb-career  (2026-11-05)

## Corpus Check
- 112 files · ~454,780 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .log 2, (none) 1, .webmanifest 1)

## Summary
- 1465 nodes · 5131 edges · 69 communities (50 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 114 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f1c5b9dc`
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
- config.ts
- CarreiraMenu
- index.html (shell do jogo QB Career)
- .drawPers
- CombineStage
- stage.ts
- .project
- Projection
- grandstand.ts
- Ball.ts
- Player.ts
- groundfx.ts
- daytime.ts
- Sideline
- MatchScene
- Weather
- package.json
- combine/ui.ts
- CombinePasse
- .update
- awards.ts
- CareerSlots.ts
- MainMenu.ts
- getSave
- scoring.ts
- DraftEspera.ts
- CombineBase
- MatchScene.ts
- primeBoard.ts
- tvText
- Combine3Cones
- compilerOptions
- Components
- CombineForca
- CareerCreate.ts
- Pane
- Intro
- LiveUi
- Combine40
- CarrierControl
- .buildLive
- phaser
- PlayerSave.ts
- season.ts
- LiveUiHandlers
- calcOvr
- manifest.json
- vibrate
- jerseyArt.ts
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- PreJogo.ts
- QB Career — Ordem de execução no Claude Code
- Product
- PlayerFace
- QB Career 🏈
- Menus do QB Career (fora de campo)
- PlayerBody.ts

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 130 edges
2. `tvText()` - 100 edges
3. `getSave()` - 97 edges
4. `plate()` - 85 edges
5. `phaser` - 70 edges
6. `Player` - 60 edges
7. `plateShadow()` - 59 edges
8. `TvButton` - 56 edges
9. `CarreiraMenu` - 51 edges
10. `GAME_W` - 41 edges

## Surprising Connections (you probably didn't know these)
- `Etapa 7 — PERSONALIZAR` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerFace.ts
- `5.4 Rosto dentro do capacete` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerFace.ts
- `Named Rules` --references--> `onInk()`  [INFERRED]
  DESIGN.md → src/ui/tv.ts
- `Destaque "é você"` --references--> `tvCard()`  [INFERRED]
  DESIGN.md → src/ui/tv.ts
- `Etapa 2 — Jogador em camadas e rosto` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerBody.ts

## Import Cycles
- 3-file cycle: `src/career/awards.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 3-file cycle: `src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/league.ts`
- 3-file cycle: `src/career/playoffs.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/playoffs.ts`
- 4-file cycle: `src/career/awards.ts -> src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 4-file cycle: `src/career/awards.ts -> src/career/playoffs.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 4-file cycle: `src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/playoffs.ts -> src/career/league.ts`
- 5-file cycle: `src/career/awards.ts -> src/career/playoffs.ts -> src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`

## Communities (69 total, 19 thin omitted)

### Community 0 - "draft/ui.ts"
Cohesion: 0.11
Nodes (32): collarTexture(), COMMISH, commissionerBody(), FORE_LEN, FORE_PIVOT_Y, foreArmTexture(), hex(), jacket() (+24 more)

### Community 1 - "Rng"
Cohesion: 0.16
Nodes (16): drawFans(), makeRowTexture(), DriveRow, simulateDrive(), spotName(), hex(), Rng, drawSky() (+8 more)

### Community 2 - "league.ts"
Cohesion: 0.14
Nodes (24): add(), boxFor(), clampInt(), conferenceSeeds(), CONFS, divisionOf(), divisionTable(), emptyLine() (+16 more)

### Community 3 - "updateSave"
Cohesion: 0.29
Nodes (4): hexNum(), updateSave(), CareerCreate, collegeKit()

### Community 4 - "Player"
Cohesion: 0.11
Nodes (17): Player, difficulty, LiveEvents, LivePlay, Phase, Receiver, separatePlayers(), RouteRunner (+9 more)

### Community 5 - "CarreiraMenu.ts"
Cohesion: 0.07
Nodes (33): DIVS, PLAYOFF_SPOTS, StatLine, PGame, ROUND_INFO, ROUNDS, passerRating(), PRIME (+25 more)

### Community 6 - "tv.ts"
Cohesion: 0.17
Nodes (14): Do:, BugOpts, CardOpts, drawWipe(), FONT_TV, reduced(), runWipe(), SLANT (+6 more)

### Community 7 - "config.ts"
Cohesion: 0.10
Nodes (29): MATCH_SEED, playoffLogo, PrimeKey, TeamConfig, TEAMS, TEX_PX, Uniform, AREA (+21 more)

### Community 8 - "CarreiraMenu"
Cohesion: 0.19
Nodes (11): CarreiraMenu, f1(), groupOf(), grpOf(), hex(), nf(), ovc(), fillPlate() (+3 more)

### Community 9 - "index.html (shell do jogo QB Career)"
Cohesion: 0.50
Nodes (4): #game container, index.html (shell do jogo QB Career), PWA manifest.webmanifest + icons, /src/main.ts (entry script)

### Community 10 - ".drawPers"
Cohesion: 0.22
Nodes (6): KIT_IDS, kitAccents(), kitInfo(), shade(), pick(), mix()

### Community 12 - "stage.ts"
Cohesion: 0.23
Nodes (8): Actor, ActorLook, hexStr(), MID, College, COLLEGES, Pose, Billboard

### Community 13 - ".project"
Cohesion: 0.18
Nodes (6): hostTeam(), FieldRenderer, Grandstand, pointAt(), wallQuad(), toPlaneX()

### Community 14 - "Projection"
Cohesion: 0.09
Nodes (21): COLORS, SPRITE_SCALE, drawGoalPost(), drawPylon(), p, BillboardLayer, p, q (+13 more)

### Community 15 - "grandstand.ts"
Cohesion: 0.06
Nodes (40): seasonWeather(), finalGame, matchConfig, venue, CityPiece, CitySpec, DOMES, isDome() (+32 more)

### Community 16 - "Ball.ts"
Cohesion: 0.11
Nodes (9): Ball, g0, g1, makeBallTexture(), p, POSES, Throw, Frame (+1 more)

### Community 17 - "Player.ts"
Cohesion: 0.12
Nodes (30): Side, Slot, Attributes, BASE, capsule(), CARRY_CYCLE, drawArm(), drawBall() (+22 more)

### Community 18 - "groundfx.ts"
Cohesion: 0.17
Nodes (14): RecvKey, fillQuad(), a, b, c, d, groundArrow(), groundArrowHead() (+6 more)

### Community 19 - "daytime.ts"
Cohesion: 0.15
Nodes (16): CAMERA, guestTeam(), CORNERS, pickTimeOfDay(), RGB, shadowLights(), SkyWeather, TimeOfDay (+8 more)

### Community 20 - "Sideline"
Cohesion: 0.38
Nodes (6): fx(), fy(), Sideline, box(), groundPoly(), groundQuad()

### Community 21 - "MatchScene"
Cohesion: 0.09
Nodes (6): careerMatch(), MatchScene, pickScheme(), readText(), tipText(), CardOpts

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, @fontsource/saira-condensed, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite (+13 more)

### Community 24 - "combine/ui.ts"
Cohesion: 0.20
Nodes (11): playerLook(), bottomShade(), brand(), fieldText(), infoPanel(), MeterBar, mix(), pill() (+3 more)

### Community 27 - "awards.ts"
Cohesion: 0.25
Nodes (14): Award, awardsReady(), awardsRecap(), AwardWinner, DEF, defScore(), lineOf(), OFF (+6 more)

### Community 28 - "CareerSlots.ts"
Cohesion: 0.22
Nodes (10): activeSlot(), recordText(), setActiveSlot(), ago(), CareerSlots, hexNum(), stageOf(), portrait() (+2 more)

### Community 29 - "MainMenu.ts"
Cohesion: 0.09
Nodes (39): 5.2 Kits travados (`kits.ts`), applyMatchup(), getFavorite(), logoKey(), saveMatchConfig(), setFavorite(), toConfig(), WeatherChoice (+31 more)

### Community 30 - "getSave"
Cohesion: 0.16
Nodes (29): finalMvp(), bracket, careerTeam(), conferenceOf(), contractOf(), ensureSeason(), finalInfo(), nextGame() (+21 more)

### Community 31 - "scoring.ts"
Cohesion: 0.12
Nodes (14): attrsFromCombine(), projection(), QB_AVG, score40(), scoreCones(), SKIP_SCORE, timeScore(), Attrs (+6 more)

### Community 32 - "DraftEspera.ts"
Cohesion: 0.14
Nodes (33): finalScore(), qbRanking(), teamInterest(), TeamRepository, podium(), contractValue(), currentDraft(), DraftInfo (+25 more)

### Community 34 - "MatchScene.ts"
Cohesion: 0.08
Nodes (35): CLOCK_RATE, FIELD, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS (+27 more)

### Community 35 - "primeBoard.ts"
Cohesion: 0.06
Nodes (28): matchRecords, QUARTER_SECONDS, backButton(), PlayerTest, GameState, gradCard(), GradOpts, gradTexture() (+20 more)

### Community 36 - "tvText"
Cohesion: 0.11
Nodes (14): forcePanel(), glassCard(), DriveResult, DefenseOpts, DefenseScreen, football(), KickUi, plate() (+6 more)

### Community 38 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 39 - "Components"
Cohesion: 0.08
Nodes (25): Abas da carreira, Colors, Components, Design System: QB Career (menus), Destaque "é você", Do's and Don'ts, Don't:, Elevation & Depth (+17 more)

### Community 40 - "CombineForca"
Cohesion: 0.29
Nodes (3): clamp(), scoreArm(), CombineForca

### Community 41 - "CareerCreate.ts"
Cohesion: 0.36
Nodes (8): BEARD_COUNT, CELL, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, SKINS, Add, STEPS

### Community 47 - ".buildLive"
Cohesion: 0.08
Nodes (3): Feedback, Fx, ResultCard

### Community 48 - "phaser"
Cohesion: 0.20
Nodes (16): phaser, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, Boot, careerAssetCounts(), GROUPS (+8 more)

### Community 49 - "PlayerSave.ts"
Cohesion: 0.23
Nodes (12): CareerState, CombineResult, DEFAULT_LOOK, defaultSave(), deleteSlot(), keyOf(), migrateLook(), parse() (+4 more)

### Community 50 - "season.ts"
Cohesion: 0.09
Nodes (30): Round, COACHES, faceFor(), FINAL_WEEK, FIRST, Game, KICKOFFS, LAST (+22 more)

### Community 52 - "calcOvr"
Cohesion: 0.13
Nodes (14): Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite (+6 more)

### Community 53 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 58 - "jerseyArt.ts"
Cohesion: 0.53
Nodes (5): css(), JerseyOpts, jerseyTexture(), lum(), mix()

### Community 59 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.13
Nodes (14): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), 5.1 Layout, 5.4 Rosto dentro do capacete, PARTE 0 — REGRAS GLOBAIS, PARTE 2 — DADOS E ESTADO, PARTE 4 — MENU DA CARREIRA (CarreiraMenu) (+6 more)

### Community 60 - "PreJogo.ts"
Cohesion: 0.11
Nodes (25): KitId, Attempt, grade(), TESTS, RES, boot(), CareerHub, CareerTest (+17 more)

### Community 62 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.15
Nodes (12): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 2 — Jogador em camadas e rosto, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR, Etapa 8 — Ligar ao gameplay existente (+4 more)

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
Cohesion: 0.14
Nodes (16): 5.3 Opções editáveis (`LookOptions`), KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite() (+8 more)

## Knowledge Gaps
- **252 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+247 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 379 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `phaser` connect `phaser` to `draft/ui.ts`, `Rng`, `CarreiraMenu.ts`, `tv.ts`, `config.ts`, `stage.ts`, `Projection`, `grandstand.ts`, `Ball.ts`, `Player.ts`, `groundfx.ts`, `daytime.ts`, `package.json`, `combine/ui.ts`, `CareerSlots.ts`, `MainMenu.ts`, `scoring.ts`, `DraftEspera.ts`, `MatchScene.ts`, `primeBoard.ts`, `tvText`, `CareerCreate.ts`, `Pane`, `jerseyArt.ts`, `PreJogo.ts`, `PlayerBody.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `MatchScene` connect `MatchScene` to `MatchScene.ts`, `primeBoard.ts`, `Player`, `CarreiraMenu.ts`, `tvText`, `Intro`, `LiveUi`, `CarrierControl`, `.buildLive`, `Ball.ts`, `groundfx.ts`, `daytime.ts`, `Weather`, `vibrate`, `CombinePasse`, `.update`, `MainMenu.ts`, `getSave`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `draft/ui.ts`, `league.ts`, `updateSave`, `CarreiraMenu.ts`, `CarreiraMenu`, `.drawPers`, `stage.ts`, `MatchScene`, `combine/ui.ts`, `awards.ts`, `scoring.ts`, `DraftEspera.ts`, `CombineBase`, `MatchScene.ts`, `primeBoard.ts`, `tvText`, `Combine3Cones`, `CombineForca`, `CareerCreate.ts`, `Combine40`, `phaser`, `PlayerSave.ts`, `season.ts`, `PreJogo.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _252 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11092436974789915 - nodes in this community are weakly interconnected._
- **Should `league.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14333333333333334 - nodes in this community are weakly interconnected._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.11497584541062802 - nodes in this community are weakly interconnected._