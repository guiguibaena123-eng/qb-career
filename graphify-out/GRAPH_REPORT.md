# Graph Report - qb-career  (2026-11-04)

## Corpus Check
- 112 files · ~440,954 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .log 2, (none) 1, .webmanifest 1)

## Summary
- 1412 nodes · 4798 edges · 71 communities (55 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `550126dc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draft/ui.ts
- MatchScene
- scoring.ts
- .build
- Player
- CarreiraMenu.ts
- season.ts
- MatchScene.ts
- CarreiraMenu
- index.html (shell do jogo QB Career)
- PreJogo.ts
- stage.ts
- config.ts
- .project
- field.ts
- grandstand.ts
- Ball
- Player.ts
- groundfx.ts
- daytime.ts
- sprites.ts
- .showFinal
- Projection
- package.json
- MainMenu.ts
- Sideline.ts
- live.ts
- awards.ts
- CareerSlots.ts
- .details
- trophies.ts
- CombineForca
- CareerCreate.ts
- gradcard.ts
- PlayerSave.ts
- title
- DefenseScreen
- Hud
- compilerOptions
- Design System: QB Career (menus)
- TeamRepository.ts
- main.ts
- Combine40
- Intro
- LiveUi
- Combine3Cones
- CarrierControl
- .buildLive
- GlassButton
- GameState
- getSave
- LiveUiHandlers
- plate
- manifest.json
- .buildBottom
- vibrate
- league.ts
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- PlayerBody.ts
- .update
- QB Career — Ordem de execução no Claude Code
- Product
- PlayerFace
- PlayerTest.ts
- QB Career 🏈
- jerseyArt.ts
- PARTE 5 — PERSONALIZAR (uniforme travado pelo time)
- Menus do QB Career (fora de campo)
- Daylight

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 130 edges
2. `getSave()` - 94 edges
3. `phaser` - 70 edges
4. `title()` - 70 edges
5. `Player` - 59 edges
6. `label()` - 56 edges
7. `CarreiraMenu` - 50 edges
8. `GlassButton` - 46 edges
9. `GAME_W` - 40 edges
10. `tvText()` - 39 edges

## Surprising Connections (you probably didn't know these)
- `Etapa 7 — PERSONALIZAR` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerFace.ts
- `5.4 Rosto dentro do capacete` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerFace.ts
- `5.3 Opções editáveis (`LookOptions`)` --references--> `LookOptions`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerSave.ts
- `Named Rules` --references--> `onInk()`  [INFERRED]
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

## Communities (71 total, 16 thin omitted)

### Community 0 - "draft/ui.ts"
Cohesion: 0.07
Nodes (60): finalScore(), collarTexture(), COMMISH, commissionerBody(), FORE_LEN, FORE_PIVOT_Y, foreArmTexture(), hex() (+52 more)

### Community 2 - "scoring.ts"
Cohesion: 0.15
Nodes (19): attrsFromCombine(), clamp(), grade(), gradeColor(), projection(), QB_AVG, qbRanking(), score40() (+11 more)

### Community 3 - ".build"
Cohesion: 0.29
Nodes (3): hexNum(), CareerCreate, collegeKit()

### Community 4 - "Player"
Cohesion: 0.15
Nodes (10): Player, LiveEvents, LivePlay, separatePlayers(), arrive(), dist(), nearest(), pursue() (+2 more)

### Community 5 - "CarreiraMenu.ts"
Cohesion: 0.10
Nodes (21): CONFS, DIVS, StatLine, teamRank(), passerRating(), BEARDS, Cat, CATS (+13 more)

### Community 6 - "season.ts"
Cohesion: 0.09
Nodes (25): LeaguePlayer, TeamSeason, COACHES, FINAL_WEEK, FIRST, Game, KICKOFFS, LAST (+17 more)

### Community 7 - "MatchScene.ts"
Cohesion: 0.08
Nodes (30): CLOCK_RATE, FIELD, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS (+22 more)

### Community 8 - "CarreiraMenu"
Cohesion: 0.14
Nodes (12): Hit, Pane, CarreiraMenu, f1(), grpOf(), hex(), nf(), ovc() (+4 more)

### Community 9 - "index.html (shell do jogo QB Career)"
Cohesion: 0.50
Nodes (4): #game container, index.html (shell do jogo QB Career), PWA manifest.webmanifest + icons, /src/main.ts (entry script)

### Community 10 - "PreJogo.ts"
Cohesion: 0.23
Nodes (9): KIT_IDS, kitAccents(), KitId, shade(), KIT_NAMES, PreJogo, weatherIcon(), WX_NAME (+1 more)

### Community 11 - "stage.ts"
Cohesion: 0.09
Nodes (23): Attempt, forcePanel(), Actor, ActorLook, CombineStage, hexStr(), MID, playerLook() (+15 more)

### Community 12 - "config.ts"
Cohesion: 0.24
Nodes (17): phaser, broadcast, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, matchRecords, QUARTER_SECONDS (+9 more)

### Community 13 - ".project"
Cohesion: 0.20
Nodes (5): hostTeam(), FieldRenderer, Grandstand, pointAt(), wallQuad()

### Community 14 - "field.ts"
Cohesion: 0.12
Nodes (20): COLORS, finalGame, venue, isDome(), drawGoalPost(), drawPylon(), p, a (+12 more)

### Community 15 - "grandstand.ts"
Cohesion: 0.07
Nodes (41): MATCH_SEED, CityPiece, CitySpec, DOMES, Stadium, stadiumOf(), STADIUMS, STAND_IDS (+33 more)

### Community 16 - "Ball"
Cohesion: 0.10
Nodes (7): Ball, g0, g1, p, POSES, Frame, Replay

### Community 17 - "Player.ts"
Cohesion: 0.16
Nodes (17): Side, Slot, Attributes, BASE, drawDive(), drawDiveFlat(), drawDiveUp(), drawPlayer() (+9 more)

### Community 18 - "groundfx.ts"
Cohesion: 0.12
Nodes (16): fillQuad(), a, b, c, d, groundArrow(), groundArrowHead(), groundOval() (+8 more)

### Community 19 - "daytime.ts"
Cohesion: 0.11
Nodes (21): CAMERA, guestTeam(), matchConfig, SPRITE_SCALE, BillboardLayer, p, q, CORNERS (+13 more)

### Community 20 - "sprites.ts"
Cohesion: 0.12
Nodes (20): TeamConfig, TEX_PX, BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD, HOLD_LEGS (+12 more)

### Community 22 - "Projection"
Cohesion: 0.13
Nodes (3): Projection, toPlaneT(), Weather

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, @fontsource/saira-condensed, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite (+13 more)

### Community 24 - "MainMenu.ts"
Cohesion: 0.13
Nodes (21): brand(), saveMatchConfig(), toConfig(), WeatherChoice, contrast(), autoUniform(), BY_ID, colorDist() (+13 more)

### Community 25 - "Sideline.ts"
Cohesion: 0.21
Nodes (13): AREA, BENCH, fx(), fy(), Side, Sideline, sidelineOptions, box() (+5 more)

### Community 26 - "live.ts"
Cohesion: 0.13
Nodes (19): RecvKey, RouteKind, blockAssignments(), pickScheme(), readText(), Scheme, SchemeId, SCHEMES (+11 more)

### Community 27 - "awards.ts"
Cohesion: 0.25
Nodes (14): Award, awardsReady(), awardsRecap(), AwardWinner, DEF, defScore(), lineOf(), OFF (+6 more)

### Community 28 - "CareerSlots.ts"
Cohesion: 0.14
Nodes (17): Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, 3.2 Combine (com a gameplay dos testes), PlayerBody, activeSlot(), peekSlot(), PlayerSave, setActiveSlot() (+9 more)

### Community 29 - ".details"
Cohesion: 0.19
Nodes (9): applyMatchup(), logoKey(), teamById(), uiColor(), hexOf(), MainMenu, inkOn(), scoreBug() (+1 more)

### Community 30 - "trophies.ts"
Cohesion: 0.25
Nodes (13): pick(), seasonYear(), champion(), championOf(), gameChampions(), revealed(), teamTitles(), titlesOf() (+5 more)

### Community 32 - "CareerCreate.ts"
Cohesion: 0.12
Nodes (19): Do:, KitDef, Add, STEPS, BugOpts, C, CardOpts, drawWipe() (+11 more)

### Community 33 - "gradcard.ts"
Cohesion: 0.53
Nodes (5): gradCard(), GradOpts, gradTexture(), path(), rgba()

### Community 34 - "PlayerSave.ts"
Cohesion: 0.13
Nodes (19): finalInfo(), mi(), seasonOver(), seasonResult(), startNextSeason(), calcOvr(), CareerState, CombineResult (+11 more)

### Community 35 - "title"
Cohesion: 0.11
Nodes (12): CombineBase, playoffLogo, buildPrimeBoard(), hex(), poly(), Prime, PrimeBoard, primeKind (+4 more)

### Community 38 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 39 - "Design System: QB Career (menus)"
Cohesion: 0.09
Nodes (22): Abas da carreira, Colors, Components, Design System: QB Career (menus), Do's and Don'ts, Don't:, Elevation & Depth, Hierarchy (+14 more)

### Community 40 - "TeamRepository.ts"
Cohesion: 0.13
Nodes (18): 5.2 Kits travados (`kits.ts`), PLAYOFF_SPOTS, PGame, Round, ROUND_INFO, ROUNDS, PRIME, build() (+10 more)

### Community 41 - "main.ts"
Cohesion: 0.18
Nodes (9): RES, boot(), Boot, CareerTest, careerAssetCounts(), GROUPS, queueCareerAssets(), sharpenCareerAssets() (+1 more)

### Community 42 - "Combine40"
Cohesion: 0.19
Nodes (3): MeterBar, mix(), Combine40

### Community 47 - ".buildLive"
Cohesion: 0.08
Nodes (3): Feedback, Fx, ResultCard

### Community 48 - "GlassButton"
Cohesion: 0.10
Nodes (5): CareerHub, PlayerTest, KickUi, Menu, GlassButton

### Community 49 - "GameState"
Cohesion: 0.17
Nodes (6): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS, GameState

### Community 50 - "getSave"
Cohesion: 0.22
Nodes (22): finalMvp(), bracket, careerTeam(), conferenceOf(), contractOf(), ensureSeason(), faceFor(), newsFeed() (+14 more)

### Community 52 - "plate"
Cohesion: 0.23
Nodes (12): kitInfo(), lum(), mix(), onInk(), plate(), plateLine(), platePts(), plateShadow() (+4 more)

### Community 53 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 58 - "league.ts"
Cohesion: 0.22
Nodes (17): add(), boxFor(), clampInt(), conferenceSeeds(), divisionOf(), divisionTable(), emptyLine(), league (+9 more)

### Community 59 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.12
Nodes (15): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 3.1 Criação, 3.3 Draft, 4.1 Miniatura do estádio (foto real pixelada), PARTE 0 — REGRAS GLOBAIS, PARTE 2 — DADOS E ESTADO, PARTE 3 — FLUXO DE TELAS (+7 more)

### Community 60 - "PlayerBody.ts"
Cohesion: 0.18
Nodes (11): baseLayers(), BODY_H, BODY_SCALE, BODY_W, composite(), key(), Layer, shade() (+3 more)

### Community 61 - ".update"
Cohesion: 0.18
Nodes (3): aimFromDrag(), makeThrow(), readThrow()

### Community 62 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.15
Nodes (12): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 2 — Jogador em camadas e rosto, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR, Etapa 8 — Ligar ao gameplay existente (+4 more)

### Community 63 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 64 - "PlayerFace"
Cohesion: 0.29
Nodes (6): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), bustTexture(), PlayerFace

### Community 65 - "PlayerTest.ts"
Cohesion: 0.36
Nodes (7): BEARD_COUNT, CELL, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, SHAPE, SKINS

### Community 66 - "QB Career 🏈"
Cohesion: 0.29
Nodes (6): A partida, Como rodar, Como é a carreira, Estrutura do projeto, QB Career 🏈, Tudo feito em código

### Community 67 - "jerseyArt.ts"
Cohesion: 0.53
Nodes (5): css(), JerseyOpts, jerseyTexture(), lum(), mix()

### Community 68 - "PARTE 5 — PERSONALIZAR (uniforme travado pelo time)"
Cohesion: 0.50
Nodes (4): 5.1 Layout, 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 5 — PERSONALIZAR (uniforme travado pelo time)

## Knowledge Gaps
- **244 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+239 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 366 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `Player`, `MatchScene.ts`, `Ball`, `groundfx.ts`, `daytime.ts`, `.showFinal`, `Projection`, `MainMenu.ts`, `live.ts`, `.details`, `title`, `DefenseScreen`, `Hud`, `TeamRepository.ts`, `Intro`, `LiveUi`, `CarrierControl`, `.buildLive`, `GlassButton`, `getSave`, `.buildBottom`, `vibrate`, `.update`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `phaser` connect `config.ts` to `draft/ui.ts`, `scoring.ts`, `CarreiraMenu.ts`, `MatchScene.ts`, `CarreiraMenu`, `PreJogo.ts`, `stage.ts`, `field.ts`, `grandstand.ts`, `Ball`, `Player.ts`, `groundfx.ts`, `daytime.ts`, `sprites.ts`, `package.json`, `MainMenu.ts`, `Sideline.ts`, `CareerSlots.ts`, `CareerCreate.ts`, `gradcard.ts`, `title`, `TeamRepository.ts`, `main.ts`, `PlayerBody.ts`, `PlayerTest.ts`, `jerseyArt.ts`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `draft/ui.ts`, `MatchScene`, `scoring.ts`, `.build`, `CarreiraMenu.ts`, `season.ts`, `MatchScene.ts`, `CarreiraMenu`, `PreJogo.ts`, `stage.ts`, `config.ts`, `MainMenu.ts`, `awards.ts`, `trophies.ts`, `CombineForca`, `CareerCreate.ts`, `PlayerSave.ts`, `title`, `TeamRepository.ts`, `main.ts`, `Combine40`, `Combine3Cones`, `GlassButton`, `plate`, `league.ts`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _244 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0730282375851996 - nodes in this community are weakly interconnected._
- **Should `MatchScene` be split into smaller, more focused modules?**
  _Cohesion score 0.12941176470588237 - nodes in this community are weakly interconnected._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.14603174603174604 - nodes in this community are weakly interconnected._