# Graph Report - qb-career  (2026-10-13)

## Corpus Check
- 101 files · ~199,135 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .webmanifest 1)

## Summary
- 1259 nodes · 4241 edges · 63 communities (47 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 98 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `af2bdb7f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- TeamRepository.ts
- PlayerFace
- Player
- PlayerSave.ts
- draft/ui.ts
- MatchScene.ts
- package.json
- getSave
- daytime.ts
- compilerOptions
- DraftEscolhido.ts
- config.ts
- grandstand.ts
- LiveUi
- season.ts
- PreJogo.ts
- MainMenu.ts
- league.ts
- CarreiraMenu.ts
- CarreiraMenu
- Projection
- Sideline.ts
- scoring.ts
- CareerCreate.ts
- vibrate
- Combine40
- CombinePasse.ts
- world.ts
- QB Career — Ordem de execução no Claude Code
- Hud
- Player.ts
- PlayerBody.ts
- Combine3Cones
- manifest.json
- MatchScene
- passing.ts
- stage.ts
- Feedback
- .project
- jerseyArt.ts
- Fx
- .create
- Ball
- GameState
- main.ts
- Pane
- CombineForca
- KickUi
- Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira
- title
- groundfx.ts
- .buildPersFixed
- live.ts
- Boot.ts
- CarrierControl
- LiveUiHandlers
- Intro
- gradcard.ts
- Daylight
- .startKick
- 3.2 Combine (com a gameplay dos testes)

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 126 edges
2. `title()` - 92 edges
3. `label()` - 88 edges
4. `getSave()` - 79 edges
5. `phaser` - 68 edges
6. `GlassButton` - 64 edges
7. `Player` - 58 edges
8. `CarreiraMenu` - 46 edges
9. `GAME_W` - 38 edges
10. `GAME_H` - 34 edges

## Surprising Connections (you probably didn't know these)
- `Etapa 7 — PERSONALIZAR` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerFace.ts
- `5.4 Rosto dentro do capacete` --references--> `PlayerFace`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerFace.ts
- `5.3 Opções editáveis (`LookOptions`)` --references--> `LookOptions`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerSave.ts
- `Etapa 3 — Criação da carreira` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → src/player/PlayerBody.ts
- `3.2 Combine (com a gameplay dos testes)` --references--> `PlayerBody`  [INFERRED]
  docs/carreira/prompt-qb-career-final.md → src/player/PlayerBody.ts

## Import Cycles
- None detected.

## Communities (63 total, 16 thin omitted)

### Community 0 - "TeamRepository.ts"
Cohesion: 0.08
Nodes (30): 5.1 Layout, 5.2 Kits travados (`kits.ts`), 5.3 Opções editáveis (`LookOptions`), 5.4 Rosto dentro do capacete, PARTE 5 — PERSONALIZAR (uniforme travado pelo time), applyMatchup(), logoKey(), TeamConfig (+22 more)

### Community 1 - "PlayerFace"
Cohesion: 0.26
Nodes (7): 1.1 Corpo em camadas (tint em runtime), 1.2 Rostos em sprite (grade 48 px, ×4), 1.3 Figura de terno (Draft), PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`), PlayerFace, portrait(), portraitTexture()

### Community 2 - "Player"
Cohesion: 0.15
Nodes (10): Player, LiveEvents, LivePlay, separatePlayers(), arrive(), dist(), nearest(), pursue() (+2 more)

### Community 3 - "PlayerSave.ts"
Cohesion: 0.16
Nodes (17): activeSlot(), Attrs, CareerState, CombineResult, DEFAULT_LOOK, deleteSlot(), keyOf(), migrateLook() (+9 more)

### Community 4 - "draft/ui.ts"
Cohesion: 0.12
Nodes (31): collarTexture(), COMMISH, commissionerBody(), FORE_LEN, FORE_PIVOT_Y, foreArmTexture(), hex(), jacket() (+23 more)

### Community 5 - "MatchScene.ts"
Cohesion: 0.10
Nodes (28): CLOCK_RATE, FIELD, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS (+20 more)

### Community 6 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 7 - "getSave"
Cohesion: 0.23
Nodes (7): brand(), hexNum(), finishCareerMatch(), getSave(), updateSave(), CareerCreate, collegeKit()

### Community 8 - "daytime.ts"
Cohesion: 0.11
Nodes (22): COLORS, SPRITE_SCALE, drawGoalPost(), drawPylon(), p, p, q, CORNERS (+14 more)

### Community 9 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 10 - "DraftEscolhido.ts"
Cohesion: 0.16
Nodes (27): TeamRepository, fgOn(), podium(), contractValue(), currentDraft(), DraftInfo, draftOrder(), FIRST (+19 more)

### Community 11 - "config.ts"
Cohesion: 0.25
Nodes (16): phaser, broadcast, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, QUARTER_SECONDS, RES (+8 more)

### Community 12 - "grandstand.ts"
Cohesion: 0.10
Nodes (32): StandModelId, TOD, todInfo, buildRows(), finishTexture(), HAIR, makeBandTexture(), makeFloodPanels() (+24 more)

### Community 14 - "season.ts"
Cohesion: 0.08
Nodes (45): PLAYOFF_SPOTS, bracket, PGame, Round, ROUND_INFO, ROUNDS, careerTeam(), COACHES (+37 more)

### Community 15 - "PreJogo.ts"
Cohesion: 0.14
Nodes (19): KIT_IDS, kitAccents(), KitId, shade(), LeaguePlayer, TeamSeason, coachOf(), nextGame() (+11 more)

### Community 16 - "MainMenu.ts"
Cohesion: 0.10
Nodes (24): finalGame, playoffLogo, saveMatchConfig(), venue, WeatherChoice, CityPiece, CitySpec, DOMES (+16 more)

### Community 17 - "league.ts"
Cohesion: 0.22
Nodes (17): add(), boxFor(), clampInt(), conferenceSeeds(), divisionOf(), divisionTable(), emptyLine(), league (+9 more)

### Community 18 - "CarreiraMenu.ts"
Cohesion: 0.10
Nodes (21): CONFS, DIVS, StatLine, teamRank(), passerRating(), BEARDS, Cat, CATS (+13 more)

### Community 19 - "CarreiraMenu"
Cohesion: 0.22
Nodes (8): mi(), CarreiraMenu, f1(), grpOf(), hex(), nf(), ovc(), gradCard()

### Community 20 - "Projection"
Cohesion: 0.11
Nodes (4): BillboardLayer, Projection, toPlaneT(), Weather

### Community 22 - "Sideline.ts"
Cohesion: 0.09
Nodes (33): MATCH_SEED, TEX_PX, AREA, BENCH, fx(), fy(), Side, Sideline (+25 more)

### Community 23 - "scoring.ts"
Cohesion: 0.19
Nodes (18): Attempt, attrsFromCombine(), clamp(), finalScore(), grade(), gradeColor(), projection(), QB_AVG (+10 more)

### Community 24 - "CareerCreate.ts"
Cohesion: 0.22
Nodes (10): BEARD_COUNT, bustTexture(), CELL, FACE_COUNT, HAIR_COLORS, HAIR_COUNT, SHAPE, SKINS (+2 more)

### Community 26 - "Combine40"
Cohesion: 0.20
Nodes (3): MeterBar, mix(), Combine40

### Community 27 - "CombinePasse.ts"
Cohesion: 0.15
Nodes (8): forcePanel(), bottomShade(), pill(), UI_DEPTH, College, COLLEGES, CombinePasse, Tag

### Community 28 - "world.ts"
Cohesion: 0.24
Nodes (9): CAMERA, guestTeam(), shadowLights(), SkyWeather, TimeOfDay, frag(), rgb(), StadiumShader (+1 more)

### Community 29 - "QB Career — Ordem de execução no Claude Code"
Cohesion: 0.14
Nodes (14): Etapa 0 — Preparação (você, 5 min), Etapa 10 — Celular (depois), Etapa 1 — Base do projeto, Etapa 3 — Criação da carreira, Etapa 4 — Combine, Etapa 5 — Draft, Etapa 6 — Menu da carreira, Etapa 7 — PERSONALIZAR (+6 more)

### Community 31 - "Player.ts"
Cohesion: 0.23
Nodes (15): Role, Attributes, BASE, drawDive(), drawDiveFlat(), drawDiveUp(), drawPlayer(), drawSide() (+7 more)

### Community 32 - "PlayerBody.ts"
Cohesion: 0.16
Nodes (15): Etapa 2 — Jogador em camadas e rosto, KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W, BodyLook, composite() (+7 more)

### Community 34 - "manifest.json"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

### Community 35 - "MatchScene"
Cohesion: 0.11
Nodes (3): MatchScene, tipText(), CardOpts

### Community 36 - "passing.ts"
Cohesion: 0.12
Nodes (10): aimFromDrag(), ballSpeed(), makeThrow(), MAX_DRAG, MIN_DRAG, Read, readThrow(), Status (+2 more)

### Community 38 - "stage.ts"
Cohesion: 0.09
Nodes (15): CombineBase, Actor, ActorLook, CombineStage, hexStr(), MID, playerLook(), Pose (+7 more)

### Community 40 - ".project"
Cohesion: 0.20
Nodes (5): hostTeam(), FieldRenderer, Grandstand, pointAt(), wallQuad()

### Community 41 - "jerseyArt.ts"
Cohesion: 0.53
Nodes (5): css(), JerseyOpts, jerseyTexture(), lum(), mix()

### Community 44 - "Ball"
Cohesion: 0.11
Nodes (8): Ball, g0, g1, p, POSES, Throw, Frame, Replay

### Community 45 - "GameState"
Cohesion: 0.17
Nodes (6): 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe), 7.2 Como trabalhar (uma etapa por vez), 7.3 Critérios de aceite, 7.4 Critério de pronto, PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS, GameState

### Community 46 - "main.ts"
Cohesion: 0.20
Nodes (6): boot(), CombineHub, DraftAnuncio, DraftEscolhido, DraftTelefone, patchText()

### Community 47 - "Pane"
Cohesion: 0.15
Nodes (3): Hit, Pane, finalInfo()

### Community 50 - "Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira"
Cohesion: 0.15
Nodes (12): 2.1 Um único save do jogador, 2.2 Registro de times e logos (espaço preparado para todos os times), 4.1 Miniatura do estádio (foto real pixelada), PARTE 0 — REGRAS GLOBAIS, PARTE 2 — DADOS E ESTADO, PARTE 4 — MENU DA CARREIRA (CarreiraMenu), PARTE 6 — INTEGRAÇÃO COM A GAMEPLAY EXISTENTE, Projeto existente (+4 more)

### Community 51 - "title"
Cohesion: 0.11
Nodes (14): primaryButton(), sideButtons(), calcOvr(), defaultSave(), backButton(), CareerHub, CareerTest, PlayerTest (+6 more)

### Community 52 - "groundfx.ts"
Cohesion: 0.16
Nodes (15): RecvKey, fillQuad(), a, b, c, d, groundArrow(), groundArrowHead() (+7 more)

### Community 53 - ".buildPersFixed"
Cohesion: 0.36
Nodes (3): kitInfo(), pick(), LookOptions

### Community 54 - "live.ts"
Cohesion: 0.17
Nodes (11): difficulty, DifficultyDef, Level, LEVELS, ORDER, Phase, Receiver, RouteRunner (+3 more)

### Community 55 - "Boot.ts"
Cohesion: 0.33
Nodes (4): Boot, GROUPS, queueCareerAssets(), sharpenCareerAssets()

### Community 59 - "gradcard.ts"
Cohesion: 0.60
Nodes (4): GradOpts, gradTexture(), path(), rgba()

### Community 63 - "3.2 Combine (com a gameplay dos testes)"
Cohesion: 0.40
Nodes (4): 3.1 Criação, 3.2 Combine (com a gameplay dos testes), 3.3 Draft, PARTE 3 — FLUXO DE TELAS

## Knowledge Gaps
- **189 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 307 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `MatchScene` to `TeamRepository.ts`, `Player`, `MatchScene.ts`, `LiveUi`, `season.ts`, `PreJogo.ts`, `MainMenu.ts`, `Projection`, `vibrate`, `CombinePasse.ts`, `world.ts`, `Hud`, `passing.ts`, `Feedback`, `Fx`, `.create`, `Ball`, `KickUi`, `title`, `groundfx.ts`, `live.ts`, `CarrierControl`, `Intro`, `.startKick`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `phaser` connect `config.ts` to `PlayerFace`, `PlayerSave.ts`, `draft/ui.ts`, `MatchScene.ts`, `package.json`, `daytime.ts`, `DraftEscolhido.ts`, `grandstand.ts`, `season.ts`, `PreJogo.ts`, `MainMenu.ts`, `CarreiraMenu.ts`, `Sideline.ts`, `scoring.ts`, `CareerCreate.ts`, `CombinePasse.ts`, `world.ts`, `Player.ts`, `PlayerBody.ts`, `stage.ts`, `jerseyArt.ts`, `Ball`, `main.ts`, `Pane`, `title`, `groundfx.ts`, `Boot.ts`, `gradcard.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `getSave()` connect `getSave` to `PlayerSave.ts`, `draft/ui.ts`, `MatchScene.ts`, `DraftEscolhido.ts`, `config.ts`, `season.ts`, `PreJogo.ts`, `league.ts`, `CarreiraMenu.ts`, `CarreiraMenu`, `scoring.ts`, `CareerCreate.ts`, `CombinePasse.ts`, `Combine3Cones`, `stage.ts`, `.create`, `CombineForca`, `title`, `.buildPersFixed`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TeamRepository.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08215488215488216 - nodes in this community are weakly interconnected._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.14603174603174604 - nodes in this community are weakly interconnected._
- **Should `draft/ui.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._