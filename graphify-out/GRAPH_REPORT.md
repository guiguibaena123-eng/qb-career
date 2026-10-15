# Graph Report - qb-career  (2026-10-15)

## Corpus Check
- 105 files · ~206,734 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .webmanifest 1)

## Summary
- 1316 nodes · 4500 edges · 61 communities (45 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 101 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77ce4ec2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- .details
- PlayerFace
- LivePlay
- PlayerSave.ts
- groundfx.ts
- MatchScene.ts
- package.json
- updateSave
- field.ts
- compilerOptions
- draft/ui.ts
- config.ts
- grandstand.ts
- LiveUi
- season.ts
- MatchBridge.ts
- getSave
- awards.ts
- CarreiraMenu.ts
- CarreiraMenu
- Projection
- Sideline.ts
- scoring.ts
- stage.ts
- Player
- CombineForca
- .buildBottom
- daytime.ts
- QB Career — Ordem de execução no Claude Code
- primeBoard.ts
- Player.ts
- PlayerBody.ts
- Combine3Cones
- manifest.json
- .endPlay
- .buildLive
- title
- DefenseScreen
- FieldRenderer
- jerseyArt.ts
- Fx
- MatchScene
- Ball
- GameState
- ai.ts
- Pane
- Weather
- KickUi
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- main.ts
- .recv
- .buildPersFixed
- live.ts
- CarrierControl
- LiveUiHandlers
- Intro
- PreJogo.ts
- Daylight
- 3.2 Combine (com a gameplay dos testes)

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 130 edges
2. `getSave()` - 94 edges
3. `title()` - 94 edges
4. `label()` - 90 edges
5. `phaser` - 69 edges
6. `GlassButton` - 64 edges
7. `Player` - 59 edges
8. `CarreiraMenu` - 50 edges
9. `GAME_W` - 39 edges
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
- 3-file cycle: `src/career/awards.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 3-file cycle: `src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/league.ts`
- 3-file cycle: `src/career/playoffs.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/playoffs.ts`
- 4-file cycle: `src/career/awards.ts -> src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 4-file cycle: `src/career/awards.ts -> src/career/playoffs.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 4-file cycle: `src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/playoffs.ts -> src/career/league.ts`
- 5-file cycle: `src/career/awards.ts -> src/career/playoffs.ts -> src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`

## Communities (61 total, 16 thin omitted)

### Community 0 - ".details"
Cohesion: 0.14
Nodes (13): applyMatchup(), logoKey(), toConfig(), autoUniform(), BY_ID, colorDist(), css(), mix() (+5 more)

### Community 1 - "PlayerFace"
Cohesion: 0.29
Nodes (6): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), bustTexture(), PlayerFace

### Community 2 - "LivePlay"
Cohesion: 0.15
Nodes (9): LiveEvents, LivePlay, separatePlayers(), arrive(), dist(), nearest(), pursue(), seek() (+1 more)

### Community 3 - "PlayerSave.ts"
Cohesion: 0.16
Nodes (18): activeSlot(), Attrs, calcOvr(), CareerState, CombineResult, defaultSave(), deleteSlot(), keyOf() (+10 more)

### Community 4 - "groundfx.ts"
Cohesion: 0.17
Nodes (14): fx(), fy(), Sideline, box(), byLen, fillQuad(), groundPoly(), groundQuad() (+6 more)

### Community 5 - "MatchScene.ts"
Cohesion: 0.10
Nodes (28): CLOCK_RATE, FIELD, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS (+20 more)

### Community 6 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 7 - "updateSave"
Cohesion: 0.29
Nodes (4): hexNum(), updateSave(), CareerCreate, collegeKit()

### Community 8 - "field.ts"
Cohesion: 0.13
Nodes (18): CAMERA, COLORS, g0, g1, p, drawGoalPost(), drawPylon(), p (+10 more)

### Community 9 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 10 - "draft/ui.ts"
Cohesion: 0.06
Nodes (70): build(), BY_ID, cityOf(), contrast(), deriveKits(), PHOTO, TeamRepository, TEAMS (+62 more)

### Community 11 - "config.ts"
Cohesion: 0.17
Nodes (26): phaser, broadcast, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, matchRecords, QUARTER_SECONDS (+18 more)

### Community 12 - "grandstand.ts"
Cohesion: 0.07
Nodes (45): finalGame, venue, CityPiece, CitySpec, DOMES, isDome(), Stadium, stadiumOf() (+37 more)

### Community 14 - "season.ts"
Cohesion: 0.09
Nodes (43): conferenceSeeds(), divisionTable(), rankTeams(), bracket, Round, ROUND_INFO, ROUNDS, COACHES (+35 more)

### Community 15 - "MatchBridge.ts"
Cohesion: 0.17
Nodes (13): KitId, careerTeam(), nextGame(), matchConfig, CareerMatchResult, Current, finishCareerMatch(), KIT_UNI (+5 more)

### Community 16 - "getSave"
Cohesion: 0.23
Nodes (17): finalMvp(), contractOf(), roster(), seasonYear(), champion(), championOf(), gameChampions(), revealed() (+9 more)

### Community 17 - "awards.ts"
Cohesion: 0.23
Nodes (15): Award, awardsReady(), awardsRecap(), AwardWinner, DEF, defScore(), lineOf(), OFF (+7 more)

### Community 18 - "CarreiraMenu.ts"
Cohesion: 0.07
Nodes (42): add(), boxFor(), clampInt(), CONFS, divisionOf(), DIVS, emptyLine(), league (+34 more)

### Community 19 - "CarreiraMenu"
Cohesion: 0.17
Nodes (9): teamRank(), CarreiraMenu, f1(), grpOf(), hex(), nf(), ovc(), gradCard() (+1 more)

### Community 20 - "Projection"
Cohesion: 0.17
Nodes (5): Grandstand, pointAt(), wallQuad(), Projection, toPlaneT()

### Community 22 - "Sideline.ts"
Cohesion: 0.10
Nodes (25): MATCH_SEED, TEX_PX, AREA, BENCH, Side, sidelineOptions, BARE_HEAD, buildSidelineTextures() (+17 more)

### Community 23 - "scoring.ts"
Cohesion: 0.15
Nodes (20): Attempt, attrsFromCombine(), clamp(), finalScore(), grade(), gradeColor(), projection(), QB_AVG (+12 more)

### Community 24 - "stage.ts"
Cohesion: 0.21
Nodes (12): ActorLook, College, COLLEGES, Pose, BEARD_COUNT, CELL, FACE_COUNT, HAIR_COLORS (+4 more)

### Community 25 - "Player"
Cohesion: 0.14
Nodes (4): Player, vibrate(), statusOf(), Lane

### Community 26 - "CombineForca"
Cohesion: 0.12
Nodes (4): MeterBar, mix(), Combine40, CombineForca

### Community 28 - "daytime.ts"
Cohesion: 0.12
Nodes (21): guestTeam(), hostTeam(), SPRITE_SCALE, Billboard, BillboardLayer, p, q, CORNERS (+13 more)

### Community 29 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.13
Nodes (15): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+7 more)

### Community 30 - "primeBoard.ts"
Cohesion: 0.12
Nodes (11): playoffLogo, Hud, buildPrimeBoard(), hex(), poly(), Prime, PrimeBoard, primeKind (+3 more)

### Community 31 - "Player.ts"
Cohesion: 0.13
Nodes (20): hexStr(), Role, Side, Slot, Attributes, BASE, drawDive(), drawDiveFlat() (+12 more)

### Community 32 - "PlayerBody.ts"
Cohesion: 0.16
Nodes (15): Etapa 2 — Jogador em camadas e rosto, KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite() (+7 more)

### Community 34 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 36 - ".buildLive"
Cohesion: 0.10
Nodes (4): Feedback, Read, readThrow(), ResultCard

### Community 38 - "title"
Cohesion: 0.08
Nodes (21): CombineBase, forcePanel(), Actor, CombineStage, MID, playerLook(), bottomShade(), brand() (+13 more)

### Community 41 - "jerseyArt.ts"
Cohesion: 0.53
Nodes (5): css(), JerseyOpts, jerseyTexture(), lum(), mix()

### Community 43 - "MatchScene"
Cohesion: 0.10
Nodes (3): careerMatch(), MatchScene, Menu

### Community 44 - "Ball"
Cohesion: 0.16
Nodes (3): Ball, Throw, Replay

### Community 45 - "GameState"
Cohesion: 0.17
Nodes (6): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS, GameState

### Community 46 - "ai.ts"
Cohesion: 0.28
Nodes (7): RouteKind, blockAssignments(), readText(), Scheme, SchemeId, SCHEMES, Zone

### Community 50 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.12
Nodes (16): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), 5.1 Layout, 5.2 Kits travados (`kits.ts`), 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 0 — REGRAS GLOBAIS (+8 more)

### Community 51 - "main.ts"
Cohesion: 0.15
Nodes (13): RES, boot(), Boot, backButton(), CareerHub, CareerTest, PlayerTest, careerAssetCounts() (+5 more)

### Community 52 - ".recv"
Cohesion: 0.28
Nodes (7): groundArrow(), groundOval(), groundPath(), groundRing(), groundSegment(), arcAt(), riskColor()

### Community 53 - ".buildPersFixed"
Cohesion: 0.27
Nodes (6): KIT_IDS, kitAccents(), kitInfo(), shade(), pick(), LookOptions

### Community 54 - "live.ts"
Cohesion: 0.15
Nodes (14): pickScheme(), difficulty, DifficultyDef, Level, LEVELS, ORDER, Phase, DriveRow (+6 more)

### Community 59 - "PreJogo.ts"
Cohesion: 0.19
Nodes (11): PRIME, FaceLook, KIT_NAMES, GradOpts, gradTexture(), path(), rgba(), portrait() (+3 more)

### Community 63 - "3.2 Combine (com a gameplay dos testes)"
Cohesion: 0.40
Nodes (4): 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS

## Knowledge Gaps
- **200 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 318 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `.details`, `LivePlay`, `MatchScene.ts`, `config.ts`, `LiveUi`, `MatchBridge.ts`, `Player`, `.buildBottom`, `daytime.ts`, `primeBoard.ts`, `.endPlay`, `.buildLive`, `DefenseScreen`, `Fx`, `Ball`, `ai.ts`, `Weather`, `KickUi`, `.recv`, `CarrierControl`, `Intro`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `phaser` connect `config.ts` to `PlayerSave.ts`, `groundfx.ts`, `MatchScene.ts`, `package.json`, `field.ts`, `draft/ui.ts`, `grandstand.ts`, `MatchBridge.ts`, `CarreiraMenu.ts`, `Sideline.ts`, `scoring.ts`, `stage.ts`, `daytime.ts`, `primeBoard.ts`, `Player.ts`, `PlayerBody.ts`, `title`, `jerseyArt.ts`, `Pane`, `main.ts`, `PreJogo.ts`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `Combine3Cones`, `PlayerSave.ts`, `MatchScene.ts`, `title`, `updateSave`, `draft/ui.ts`, `MatchScene`, `season.ts`, `MatchBridge.ts`, `awards.ts`, `CarreiraMenu.ts`, `main.ts`, `CarreiraMenu`, `.buildPersFixed`, `scoring.ts`, `stage.ts`, `CombineForca`, `PreJogo.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `.details` be split into smaller, more focused modules?**
  _Cohesion score 0.14114114114114115 - nodes in this community are weakly interconnected._
- **Should `LivePlay` be split into smaller, more focused modules?**
  _Cohesion score 0.14623655913978495 - nodes in this community are weakly interconnected._
- **Should `MatchScene.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0953058321479374 - nodes in this community are weakly interconnected._