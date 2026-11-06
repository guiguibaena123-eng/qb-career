# Graph Report - qb-career  (2026-11-06)

## Corpus Check
- 117 files · ~468,080 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .log 2, (none) 1, .webmanifest 1)

## Summary
- 1562 nodes · 5370 edges · 75 communities (55 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 114 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b47c376f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- draft/ui.ts
- getSave
- league.ts
- updateSave
- Player
- CarreiraMenu.ts
- tv.ts
- sprites.ts
- .teamPage
- index.html (shell do jogo QB Career)
- CarreiraMenu
- MenuMusic
- MatchSfx
- Grandstand
- Projection
- grandstand.ts
- Ball
- Player.ts
- RecvKey
- daytime.ts
- stage.ts
- MatchScene
- Weather
- package.json
- combine/ui.ts
- Tag
- projection.ts
- main.ts
- PlayerSave.ts
- MainMenu.ts
- awards.ts
- MatchBridge.ts
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
- Fx
- config.ts
- label
- season.ts
- LiveUiHandlers
- 3.2 Combine (com a gameplay dos testes)
- manifest.json
- Hud
- polish.py
- vibrate
- addCanvasTex
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- CombineResultado.ts
- .showFinal
- QB Career — Ordem de execução no Claude Code
- Product
- PlayerFace
- GameState
- QB Career 🏈
- wipeTo
- PARTE 0 — REGRAS GLOBAIS
- Menus do QB Career (fora de campo)
- PlayerBody.ts
- CREDITOS.md

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 134 edges
2. `tvText()` - 103 edges
3. `getSave()` - 98 edges
4. `plate()` - 88 edges
5. `phaser` - 71 edges
6. `Player` - 60 edges
7. `CarreiraMenu` - 60 edges
8. `plateShadow()` - 59 edges
9. `TvButton` - 56 edges
10. `GAME_W` - 41 edges

## Surprising Connections (you probably didn't know these)
- `Etapa 7 — PERSONALIZAR` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerFace.ts
- `5.4 Rosto dentro do capacete` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerFace.ts
- `5.3 Opções editáveis (`LookOptions`)` --references--> `LookOptions`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerSave.ts
- `Etapa 1 — Base do projeto` --references--> `PlayerSave`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerSave.ts
- `Named Rules` --references--> `onInk()`  [INFERRED]
  DESIGN.md → src/ui/tv.ts

## Import Cycles
- 3-file cycle: `src/career/awards.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 3-file cycle: `src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/league.ts`
- 3-file cycle: `src/career/playoffs.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/playoffs.ts`
- 4-file cycle: `src/career/awards.ts -> src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 4-file cycle: `src/career/awards.ts -> src/career/playoffs.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 4-file cycle: `src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/playoffs.ts -> src/career/league.ts`
- 5-file cycle: `src/career/awards.ts -> src/career/playoffs.ts -> src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`

## Communities (75 total, 20 thin omitted)

### Community 0 - "draft/ui.ts"
Cohesion: 0.12
Nodes (31): collarTexture(), COMMISH, commissionerBody(), FORE_LEN, FORE_PIVOT_Y, foreArmTexture(), hex(), jacket() (+23 more)

### Community 1 - "getSave"
Cohesion: 0.17
Nodes (16): KitId, nextGame(), devSimWeeks(), finishCareerMatch(), startCareerMatch(), getSave(), KIT_NAMES, PreJogo (+8 more)

### Community 2 - "league.ts"
Cohesion: 0.13
Nodes (26): add(), boxFor(), clampInt(), conferenceSeeds(), CONFS, divisionOf(), divisionTable(), DIVS (+18 more)

### Community 3 - "updateSave"
Cohesion: 0.27
Nodes (4): hexNum(), updateSave(), CareerCreate, collegeKit()

### Community 4 - "Player"
Cohesion: 0.11
Nodes (17): Player, difficulty, LiveEvents, LivePlay, Phase, Receiver, separatePlayers(), RouteRunner (+9 more)

### Community 5 - "CarreiraMenu.ts"
Cohesion: 0.08
Nodes (30): KIT_IDS, kitAccents(), shade(), StatLine, finalInfo(), passerRating(), seasonOver(), seasonResult() (+22 more)

### Community 6 - "tv.ts"
Cohesion: 0.15
Nodes (16): UI_DEPTH, RES, DriveResult, DefenseOpts, football(), portrait(), BugOpts, C (+8 more)

### Community 7 - "sprites.ts"
Cohesion: 0.13
Nodes (18): BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD, HOLD_LEGS, HOLD_TORSO, kit() (+10 more)

### Community 8 - ".teamPage"
Cohesion: 0.21
Nodes (8): f1(), grpOf(), hex(), nf(), ovc(), fillPlate(), label(), strokePlate()

### Community 9 - "index.html (shell do jogo QB Career)"
Cohesion: 0.50
Nodes (4): #game container, index.html (shell do jogo QB Career), PWA manifest.webmanifest + icons, /src/main.ts (entry script)

### Community 10 - "CarreiraMenu"
Cohesion: 0.22
Nodes (4): kitInfo(), LookOptions, CarreiraMenu, groupOf()

### Community 11 - "MenuMusic"
Cohesion: 0.17
Nodes (7): Deck, fade(), MenuMusic, music, SILENCE, TRACKS, xfadeAt()

### Community 12 - "MatchSfx"
Cohesion: 0.13
Nodes (6): BANK, LoopLayer, LOOPS, MatchSfx, MIX, sfx

### Community 13 - "Grandstand"
Cohesion: 0.30
Nodes (4): Grandstand, pointAt(), wallQuad(), shadeNum()

### Community 14 - "Projection"
Cohesion: 0.12
Nodes (14): COLORS, finalGame, drawGoalPost(), drawPylon(), p, a, b, c (+6 more)

### Community 15 - "grandstand.ts"
Cohesion: 0.07
Nodes (45): MATCH_SEED, CityPiece, CitySpec, DOMES, isDome(), Stadium, stadiumOf(), STADIUMS (+37 more)

### Community 16 - "Ball"
Cohesion: 0.09
Nodes (4): Ball, Feedback, Throw, Replay

### Community 17 - "Player.ts"
Cohesion: 0.10
Nodes (36): SPRITE_SCALE, TEX_PX, Role, Side, Slot, Attributes, BASE, capsule() (+28 more)

### Community 18 - "RecvKey"
Cohesion: 0.22
Nodes (9): RecvKey, groundArrow(), groundArrowHead(), groundOval(), groundPath(), groundRing(), groundSegment(), arcAt() (+1 more)

### Community 19 - "daytime.ts"
Cohesion: 0.17
Nodes (16): guestTeam(), hostTeam(), matchConfig, CORNERS, pickTimeOfDay(), RGB, shadowLights(), SkyWeather (+8 more)

### Community 20 - "stage.ts"
Cohesion: 0.13
Nodes (17): ActorLook, AREA, BENCH, fx(), fy(), Side, Sideline, sidelineOptions (+9 more)

### Community 21 - "MatchScene"
Cohesion: 0.07
Nodes (7): careerMatch(), MatchScene, pickScheme(), readText(), tipText(), spotName(), pickWeather()

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, @fontsource/saira-condensed, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite (+13 more)

### Community 24 - "combine/ui.ts"
Cohesion: 0.08
Nodes (22): forcePanel(), Actor, CombineStage, hexStr(), MID, playerLook(), bottomShade(), brand() (+14 more)

### Community 26 - "projection.ts"
Cohesion: 0.12
Nodes (16): CAMERA, g0, g1, makeBallTexture(), p, byLen, fillQuad(), tmp (+8 more)

### Community 27 - "main.ts"
Cohesion: 0.12
Nodes (12): boot(), Boot, CareerHub, CareerTest, DraftEspera, PlayerTest, careerAssetCounts(), GROUPS (+4 more)

### Community 28 - "PlayerSave.ts"
Cohesion: 0.16
Nodes (19): activeSlot(), Attrs, CareerState, CombineResult, deleteSlot(), keyOf(), migrateLook(), parse() (+11 more)

### Community 29 - "MainMenu.ts"
Cohesion: 0.06
Nodes (46): 5.2 Kits travados (`kits.ts`), applyMatchup(), getFavorite(), logoKey(), PrimeKey, saveMatchConfig(), setFavorite(), TeamConfig (+38 more)

### Community 30 - "awards.ts"
Cohesion: 0.13
Nodes (35): Award, awardsReady(), awardsRecap(), AwardWinner, DEF, defScore(), finalMvp(), lineOf() (+27 more)

### Community 31 - "MatchBridge.ts"
Cohesion: 0.17
Nodes (13): PLAYOFF_SPOTS, simScore(), PGame, Round, ROUND_INFO, ROUNDS, PRIME, playoffLogo (+5 more)

### Community 32 - "DraftEspera.ts"
Cohesion: 0.16
Nodes (28): TeamRepository, podium(), contractValue(), currentDraft(), DraftInfo, draftOrder(), FIRST, LAST (+20 more)

### Community 34 - "MatchScene.ts"
Cohesion: 0.08
Nodes (35): CLOCK_RATE, FIELD, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS (+27 more)

### Community 35 - "primeBoard.ts"
Cohesion: 0.27
Nodes (13): buildPrimeBoard(), football(), hex(), mix(), outline(), poly(), Prime, primeKind (+5 more)

### Community 36 - "tvText"
Cohesion: 0.17
Nodes (7): glassCard(), DefenseScreen, plate(), plateShadow(), scoreBug(), ticker(), tvText()

### Community 38 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 39 - "Components"
Cohesion: 0.07
Nodes (26): Abas da carreira, Colors, Components, Design System: QB Career (menus), Destaque "é você", Do's and Don'ts, Don't:, Elevation & Depth (+18 more)

### Community 40 - "CombineForca"
Cohesion: 0.29
Nodes (3): clamp(), scoreArm(), CombineForca

### Community 41 - "CareerCreate.ts"
Cohesion: 0.17
Nodes (13): College, COLLEGES, BEARD_COUNT, CELL, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, SHAPE (+5 more)

### Community 45 - "Combine40"
Cohesion: 0.26
Nodes (3): score40(), timeScore(), Combine40

### Community 48 - "config.ts"
Cohesion: 0.23
Nodes (18): phaser, broadcast, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, matchRecords, QUARTER_SECONDS (+10 more)

### Community 49 - "label"
Cohesion: 0.17
Nodes (6): calcOvr(), defaultSave(), backButton(), ResultCard, GlassButton, label()

### Community 50 - "season.ts"
Cohesion: 0.10
Nodes (30): COACHES, contractOf(), faceFor(), FINAL_WEEK, FIRST, Game, KICKOFFS, LAST (+22 more)

### Community 52 - "3.2 Combine (com a gameplay dos testes)"
Cohesion: 0.40
Nodes (4): 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS

### Community 53 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 55 - "polish.py"
Cohesion: 0.11
Nodes (6): apply_row(), band_map(), narrow(), runs(), shift_cols(), widen()

### Community 58 - "addCanvasTex"
Cohesion: 0.23
Nodes (12): addCanvasTex(), gradCard(), GradOpts, gradTexture(), path(), rgba(), css(), JerseyOpts (+4 more)

### Community 59 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.17
Nodes (11): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), 5.1 Layout, 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 2 — DADOS E ESTADO, PARTE 4 — MENU DA CARREIRA (CarreiraMenu) (+3 more)

### Community 60 - "CombineResultado.ts"
Cohesion: 0.15
Nodes (20): Attempt, attrsFromCombine(), finalScore(), grade(), projection(), QB_AVG, qbRanking(), SKIP_SCORE (+12 more)

### Community 62 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.15
Nodes (12): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR, Etapa 8 — Ligar ao gameplay existente (+4 more)

### Community 63 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 64 - "PlayerFace"
Cohesion: 0.16
Nodes (14): Etapa 2 — Jogador em camadas e rosto, Etapa 3 — Criação da carreira, 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite (+6 more)

### Community 66 - "QB Career 🏈"
Cohesion: 0.29
Nodes (6): A partida, Como rodar, Como é a carreira, Estrutura do projeto, QB Career 🏈, Tudo feito em código

### Community 67 - "wipeTo"
Cohesion: 0.60
Nodes (5): Do:, reduced(), runWipe(), wipe(), wipeTo()

### Community 68 - "PARTE 0 — REGRAS GLOBAIS"
Cohesion: 0.40
Nodes (5): PARTE 0 — REGRAS GLOBAIS, Projeto existente, Qualidade e desempenho, REGRA Nº 0 — TUDO EM CÓDIGO, NADA DE IA (com exceção dos assets fornecidos), Regras de marca

### Community 70 - "PlayerBody.ts"
Cohesion: 0.12
Nodes (22): KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite(), crop() (+14 more)

## Knowledge Gaps
- **265 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+260 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 406 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `getSave`, `Player`, `Ball`, `RecvKey`, `daytime.ts`, `Weather`, `Tag`, `main.ts`, `MainMenu.ts`, `MatchBridge.ts`, `MatchScene.ts`, `tvText`, `Intro`, `LiveUi`, `CarrierControl`, `Fx`, `label`, `Hud`, `vibrate`, `.showFinal`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `phaser` connect `config.ts` to `draft/ui.ts`, `getSave`, `CarreiraMenu.ts`, `tv.ts`, `sprites.ts`, `Projection`, `grandstand.ts`, `Player.ts`, `daytime.ts`, `stage.ts`, `package.json`, `combine/ui.ts`, `projection.ts`, `main.ts`, `PlayerSave.ts`, `MainMenu.ts`, `MatchBridge.ts`, `DraftEspera.ts`, `MatchScene.ts`, `primeBoard.ts`, `CareerCreate.ts`, `Pane`, `addCanvasTex`, `CombineResultado.ts`, `PlayerBody.ts`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `draft/ui.ts`, `league.ts`, `updateSave`, `CarreiraMenu.ts`, `.teamPage`, `CarreiraMenu`, `stage.ts`, `MatchScene`, `combine/ui.ts`, `PlayerSave.ts`, `awards.ts`, `MatchBridge.ts`, `DraftEspera.ts`, `MatchScene.ts`, `tvText`, `Combine3Cones`, `CombineForca`, `CareerCreate.ts`, `Combine40`, `config.ts`, `label`, `season.ts`, `CombineResultado.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _265 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11586452762923351 - nodes in this community are weakly interconnected._
- **Should `league.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12535612535612536 - nodes in this community are weakly interconnected._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.11193339500462535 - nodes in this community are weakly interconnected._