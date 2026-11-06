# Graph Report - qb-career  (2026-11-06)

## Corpus Check
- 117 files · ~469,223 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .log 2, (none) 1, .webmanifest 1)

## Summary
- 1566 nodes · 5381 edges · 67 communities (50 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 116 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e3201fb6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draft/ui.ts
- PreJogo.ts
- trophies.ts
- getSave
- Player
- CarreiraMenu.ts
- plateShadow
- phaser
- CarreiraMenu
- index.html (shell do jogo QB Career)
- .buildPersFixed
- MenuMusic
- MatchSfx
- .project
- Projection
- grandstand.ts
- Ball
- Player.ts
- RecvKey
- daytime.ts
- ground.ts
- MatchScene
- Weather
- package.json
- combine/ui.ts
- CombinePasse.ts
- TeamRepository.ts
- plate
- tvText
- MainMenu
- awards.ts
- DraftEspera.ts
- CombineBase
- MatchScene.ts
- PlayerTest.ts
- DefenseScreen
- PlayerSave.ts
- compilerOptions
- Components
- CombineForca
- CareerCreate.ts
- Pane
- Intro
- Combine40
- CarrierControl
- Fx
- .buildLive
- season.ts
- LiveUiHandlers
- manifest.json
- polish.py
- vibrate
- addCanvasTex
- main.ts
- QB Career — Ordem de execução no Claude Code
- Product
- PlayerFace
- QB Career 🏈
- tv.ts
- Menus do QB Career (fora de campo)
- PlayerBody.ts
- CREDITOS.md

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 134 edges
2. `tvText()` - 103 edges
3. `getSave()` - 99 edges
4. `plate()` - 88 edges
5. `phaser` - 71 edges
6. `CarreiraMenu` - 62 edges
7. `Player` - 60 edges
8. `plateShadow()` - 59 edges
9. `TvButton` - 56 edges
10. `GAME_W` - 41 edges

## Surprising Connections (you probably didn't know these)
- `Etapa 7 — PERSONALIZAR` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerFace.ts
- `5.3 Opções editáveis (`LookOptions`)` --references--> `LookOptions`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerSave.ts
- `Abas da carreira` --references--> `fit()`  [INFERRED]
  DESIGN.md → src/scenes/CarreiraMenu.ts
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

## Communities (67 total, 17 thin omitted)

### Community 0 - "draft/ui.ts"
Cohesion: 0.12
Nodes (31): collarTexture(), COMMISH, commissionerBody(), FORE_LEN, FORE_PIVOT_Y, foreArmTexture(), hex(), jacket() (+23 more)

### Community 1 - "PreJogo.ts"
Cohesion: 0.24
Nodes (7): KitId, PRIME, KIT_NAMES, PreJogo, weatherIcon(), WX_NAME, WxKind

### Community 2 - "trophies.ts"
Cohesion: 0.23
Nodes (14): pick(), seasonYear(), champion(), championOf(), gameChampions(), revealed(), teamTitles(), titlesOf() (+6 more)

### Community 3 - "getSave"
Cohesion: 0.12
Nodes (25): careerTeam(), conferenceOf(), contractOf(), ensureSeason(), finalInfo(), nextGame(), seasonOver(), seasonResult() (+17 more)

### Community 4 - "Player"
Cohesion: 0.10
Nodes (21): Player, difficulty, DifficultyDef, LEVELS, ORDER, LiveEvents, LivePlay, Phase (+13 more)

### Community 5 - "CarreiraMenu.ts"
Cohesion: 0.07
Nodes (47): add(), boxFor(), clampInt(), conferenceSeeds(), CONFS, divisionOf(), divisionTable(), DIVS (+39 more)

### Community 6 - "plateShadow"
Cohesion: 0.09
Nodes (16): forcePanel(), DriveResult, DefenseOpts, KickUi, LiveUi, Menu, MenuButton, portrait() (+8 more)

### Community 7 - "phaser"
Cohesion: 0.09
Nodes (29): phaser, ActorLook, FIELD, TeamConfig, AREA, BENCH, Side, sidelineOptions (+21 more)

### Community 8 - "CarreiraMenu"
Cohesion: 0.20
Nodes (11): CarreiraMenu, f1(), groupOf(), grpOf(), hex(), nf(), ovc(), fillPlate() (+3 more)

### Community 9 - "index.html (shell do jogo QB Career)"
Cohesion: 0.50
Nodes (4): #game container, index.html (shell do jogo QB Career), PWA manifest.webmanifest + icons, /src/main.ts (entry script)

### Community 10 - ".buildPersFixed"
Cohesion: 0.16
Nodes (6): KIT_IDS, kitAccents(), kitInfo(), shade(), LookOptions, rowSig()

### Community 11 - "MenuMusic"
Cohesion: 0.17
Nodes (7): Deck, fade(), MenuMusic, music, SILENCE, TRACKS, xfadeAt()

### Community 12 - "MatchSfx"
Cohesion: 0.13
Nodes (6): BANK, LoopLayer, LOOPS, MatchSfx, MIX, sfx

### Community 13 - ".project"
Cohesion: 0.13
Nodes (13): FieldRenderer, Grandstand, pointAt(), fillQuad(), wallQuad(), a, b, c (+5 more)

### Community 14 - "Projection"
Cohesion: 0.08
Nodes (23): COLORS, playoffLogo, g0, g1, makeBallTexture(), p, drawGoalPost(), drawPylon() (+15 more)

### Community 15 - "grandstand.ts"
Cohesion: 0.07
Nodes (48): CityPiece, CitySpec, DOMES, isDome(), Stadium, stadiumOf(), STADIUMS, STAND_IDS (+40 more)

### Community 17 - "Player.ts"
Cohesion: 0.11
Nodes (33): Side, Slot, Attributes, BASE, capsule(), CARRY_CYCLE, drawArm(), drawBall() (+25 more)

### Community 18 - "RecvKey"
Cohesion: 0.23
Nodes (5): RecvKey, groundArrow(), groundPath(), Read, statusOf()

### Community 19 - "daytime.ts"
Cohesion: 0.17
Nodes (17): CAMERA, guestTeam(), hostTeam(), matchConfig, CORNERS, pickTimeOfDay(), RGB, shadowLights() (+9 more)

### Community 20 - "ground.ts"
Cohesion: 0.29
Nodes (8): fx(), fy(), Sideline, box(), byLen, groundPoly(), groundQuad(), tmp

### Community 21 - "MatchScene"
Cohesion: 0.10
Nodes (5): careerMatch(), MatchScene, pickScheme(), tipText(), CardOpts

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, @fontsource/saira-condensed, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite (+13 more)

### Community 24 - "combine/ui.ts"
Cohesion: 0.13
Nodes (17): Actor, MID, playerLook(), bottomShade(), fieldText(), infoPanel(), pill(), primaryButton() (+9 more)

### Community 25 - "CombinePasse.ts"
Cohesion: 0.16
Nodes (11): CombinePasse, aimFromDrag(), arcAt(), ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG, riskColor() (+3 more)

### Community 26 - "TeamRepository.ts"
Cohesion: 0.29
Nodes (9): build(), BY_ID, cityOf(), contrast(), deriveKits(), PHOTO, TEAMS, fgOn() (+1 more)

### Community 27 - "plate"
Cohesion: 0.11
Nodes (23): logoKey(), setFavorite(), WeatherChoice, autoUniform(), BY_ID, colorDist(), css(), mix() (+15 more)

### Community 28 - "tvText"
Cohesion: 0.16
Nodes (16): activeSlot(), deleteSlot(), setActiveSlot(), ago(), CareerSlots, hexNum(), stageOf(), fit() (+8 more)

### Community 29 - "MainMenu"
Cohesion: 0.22
Nodes (8): applyMatchup(), getFavorite(), saveMatchConfig(), toConfig(), teamById(), uiColor(), MainMenu, arrowAfter()

### Community 30 - "awards.ts"
Cohesion: 0.23
Nodes (15): Award, awardsReady(), awardsRecap(), AwardWinner, DEF, defScore(), lineOf(), OFF (+7 more)

### Community 32 - "DraftEspera.ts"
Cohesion: 0.14
Nodes (31): finalScore(), TeamRepository, podium(), contractValue(), currentDraft(), DraftInfo, draftOrder(), FIRST (+23 more)

### Community 33 - "CombineBase"
Cohesion: 0.10
Nodes (3): CombineBase, CombineStage, hexStr()

### Community 34 - "MatchScene.ts"
Cohesion: 0.08
Nodes (39): broadcast, CLOCK_RATE, finalGame, FONT_LABEL, FONT_TITLE, MATCH_SEED, PrimeKey, QUARTER_SECONDS (+31 more)

### Community 35 - "PlayerTest.ts"
Cohesion: 0.05
Nodes (37): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS, matchRecords, calcOvr(), defaultSave() (+29 more)

### Community 37 - "PlayerSave.ts"
Cohesion: 0.18
Nodes (15): attrsFromCombine(), clamp(), projection(), qbRanking(), score40(), scoreArm(), scoreCones(), teamInterest() (+7 more)

### Community 38 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 39 - "Components"
Cohesion: 0.08
Nodes (25): Abas da carreira, Colors, Components, Design System: QB Career (menus), Destaque "é você", Do's and Don'ts, Don't:, Elevation & Depth (+17 more)

### Community 41 - "CareerCreate.ts"
Cohesion: 0.17
Nodes (13): College, COLLEGES, BEARD_COUNT, CELL, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, SHAPE (+5 more)

### Community 45 - "Combine40"
Cohesion: 0.19
Nodes (3): MeterBar, mix(), Combine40

### Community 49 - ".buildLive"
Cohesion: 0.08
Nodes (5): hexStr(), Feedback, readThrow(), ResultCard, Tag

### Community 50 - "season.ts"
Cohesion: 0.08
Nodes (40): finalMvp(), LeaguePlayer, TeamSeason, bracket, Round, COACHES, faceFor(), FINAL_WEEK (+32 more)

### Community 53 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 55 - "polish.py"
Cohesion: 0.11
Nodes (6): apply_row(), band_map(), narrow(), runs(), shift_cols(), widen()

### Community 58 - "addCanvasTex"
Cohesion: 0.23
Nodes (12): addCanvasTex(), gradCard(), GradOpts, gradTexture(), path(), rgba(), css(), JerseyOpts (+4 more)

### Community 60 - "main.ts"
Cohesion: 0.16
Nodes (16): Attempt, grade(), QB_AVG, SKIP_SCORE, TESTS, GAME_H, GAME_W, RES (+8 more)

### Community 62 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.06
Nodes (31): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 2 — Jogador em camadas e rosto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira (+23 more)

### Community 63 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 64 - "PlayerFace"
Cohesion: 0.17
Nodes (11): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), 5.1 Layout, 5.2 Kits travados (`kits.ts`), 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`) (+3 more)

### Community 66 - "QB Career 🏈"
Cohesion: 0.29
Nodes (6): A partida, Como rodar, Como é a carreira, Estrutura do projeto, QB Career 🏈, Tudo feito em código

### Community 67 - "tv.ts"
Cohesion: 0.14
Nodes (18): Do:, BugOpts, CardOpts, drawWipe(), FONT_TV, lum(), mix(), onInk() (+10 more)

### Community 70 - "PlayerBody.ts"
Cohesion: 0.12
Nodes (22): KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite(), crop() (+14 more)

## Knowledge Gaps
- **266 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+261 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 407 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `phaser` connect `phaser` to `draft/ui.ts`, `PreJogo.ts`, `getSave`, `CarreiraMenu.ts`, `plateShadow`, `.project`, `Projection`, `grandstand.ts`, `Player.ts`, `daytime.ts`, `ground.ts`, `package.json`, `combine/ui.ts`, `CombinePasse.ts`, `plate`, `tvText`, `DraftEspera.ts`, `MatchScene.ts`, `PlayerTest.ts`, `PlayerSave.ts`, `CareerCreate.ts`, `Pane`, `addCanvasTex`, `main.ts`, `tv.ts`, `PlayerBody.ts`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `MatchScene` connect `MatchScene` to `getSave`, `Player`, `plateShadow`, `Ball`, `RecvKey`, `daytime.ts`, `Weather`, `CombinePasse.ts`, `plate`, `MainMenu`, `.sync`, `MatchScene.ts`, `PlayerTest.ts`, `DefenseScreen`, `Intro`, `CarrierControl`, `Fx`, `.buildLive`, `vibrate`, `main.ts`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `draft/ui.ts`, `PreJogo.ts`, `trophies.ts`, `CarreiraMenu.ts`, `phaser`, `CarreiraMenu`, `.buildPersFixed`, `MatchScene`, `combine/ui.ts`, `tvText`, `awards.ts`, `DraftEspera.ts`, `MatchScene.ts`, `PlayerTest.ts`, `PlayerSave.ts`, `CombineForca`, `CareerCreate.ts`, `Combine40`, `season.ts`, `main.ts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _266 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11586452762923351 - nodes in this community are weakly interconnected._
- **Should `getSave` be split into smaller, more focused modules?**
  _Cohesion score 0.12403100775193798 - nodes in this community are weakly interconnected._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.09954751131221719 - nodes in this community are weakly interconnected._