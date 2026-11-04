# Graph Report - qb-career  (2026-11-03)

## Corpus Check
- 399 files · ~206,734 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .webmanifest 1)

## Summary
- 1313 nodes · 4489 edges · 58 communities (39 shown, 19 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 84 edges (avg confidence: 0.8)
- Token cost: 75,459 input · 0 output

## Community Hubs (Navigation)
- Times e Draft
- Partida: Lances ao Vivo
- Combine: Pontuação
- Criação da Carreira
- Jogadores e Rotas
- Liga e Temporada
- Playoffs e Prêmios Finais
- Jogadas e Passe
- Menu da Carreira
- Documentos de Planejamento
- Uniformes e Ponte da Partida
- Provas do Combine
- Base de Cenas Phaser
- Campo e Traves
- Estádios e Clima
- Pixel Art dos Estádios
- Bola e Replay
- Sprites dos Jogadores
- Desenho do Gramado
- Câmera e Palco
- Texturas de Sprites
- Partida da Carreira
- Simulação de Drives
- Dependências npm
- Menu Principal e Times
- Banco Lateral
- Botões e UI Comum
- Prêmios da Temporada
- Palco e Público
- Configuração da Partida
- Títulos e Troféus
- Barra de Força
- Projeção 3D
- Inicialização do Jogo
- Painéis
- Cena Base do Combine
- Tela de Defesa
- HUD
- Config TypeScript
- Widgets de Menu
- Placar Horário Nobre
- Carregamento de Assets
- Prova 40 Jardas
- Introdução
- Joystick
- Prova 3 Cones
- Controle do Corredor
- Efeitos Visuais
- Chute
- Estado do Jogo
- Feedback de Jogo
- Controles ao Vivo
- Cartão de Resultado
- Manifesto de Assets
- Etiquetas
- Etapa Final e Aceite

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
- `index.html (shell do jogo QB Career)` --implements--> `Etapa 1 - Base do projeto`  [INFERRED]
  index.html → docs/carreira/ordem-de-execucao-claude-code.md
- `PWA manifest.webmanifest + icons` --conceptually_related_to--> `Etapa 10 - Celular (Capacitor)`  [INFERRED]
  index.html → docs/carreira/ordem-de-execucao-claude-code.md
- `Etapa 10 - Celular (Capacitor)` --references--> `PlayerSave (save unico persistido)`  [INFERRED]
  docs/carreira/ordem-de-execucao-claude-code.md → docs/carreira/prompt-qb-career-final.md
- `productionSnapshot()` --calls--> `league`  [EXTRACTED]
  src/career/awards.ts → src/career/league.ts
- `startNextSeason()` --calls--> `productionSnapshot()`  [EXTRACTED]
  src/career/season.ts → src/career/awards.ts

## Import Cycles
- 3-file cycle: `src/career/awards.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 3-file cycle: `src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/league.ts`
- 3-file cycle: `src/career/playoffs.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/playoffs.ts`
- 4-file cycle: `src/career/awards.ts -> src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 4-file cycle: `src/career/awards.ts -> src/career/playoffs.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`
- 4-file cycle: `src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/playoffs.ts -> src/career/league.ts`
- 5-file cycle: `src/career/awards.ts -> src/career/playoffs.ts -> src/career/league.ts -> src/career/season.ts -> src/career/trophies.ts -> src/career/awards.ts`

## Hyperedges (group relationships)
- **PlayerFace reutilizado para rosto identico em todas as telas** — docs_carreira_prompt_qb_career_final_playerface, docs_carreira_prompt_qb_career_final_criacao_carreira, docs_carreira_prompt_qb_career_final_draft_suit_figure, docs_carreira_prompt_qb_career_final_personalizar [EXTRACTED 1.00]
- **OVR unico via calcOvr em confirmacao, Combine, menu e HUD** — docs_carreira_prompt_qb_career_final_calcovr, docs_carreira_prompt_qb_career_final_playersave, docs_carreira_prompt_qb_career_final_combineresultado, docs_carreira_prompt_qb_career_final_matchbridge [EXTRACTED 1.00]
- **Registro de times alimenta kits, estadio e logos** — docs_carreira_prompt_qb_career_final_teamrepository, docs_carreira_prompt_qb_career_final_teamdef, docs_carreira_prompt_qb_career_final_derivekits, docs_carreira_prompt_qb_career_final_estadio_pixelado [EXTRACTED 1.00]

## Communities (58 total, 19 thin omitted)

### Community 0 - "Times e Draft"
Cohesion: 0.07
Nodes (59): build(), BY_ID, cityOf(), contrast(), deriveKits(), PHOTO, TEAMS, collarTexture() (+51 more)

### Community 1 - "Partida: Lances ao Vivo"
Cohesion: 0.07
Nodes (5): RecvKey, MatchScene, vibrate(), Read, readThrow()

### Community 2 - "Combine: Pontuação"
Cohesion: 0.06
Nodes (51): attrsFromCombine(), clamp(), finalScore(), grade(), gradeColor(), projection(), QB_AVG, qbRanking() (+43 more)

### Community 3 - "Criação da Carreira"
Cohesion: 0.06
Nodes (38): College, COLLEGES, hexNum(), KitDef, baseLayers(), BODY_H, BODY_SCALE, BODY_W (+30 more)

### Community 4 - "Jogadores e Rotas"
Cohesion: 0.10
Nodes (20): Player, difficulty, DifficultyDef, LEVELS, ORDER, LiveEvents, LivePlay, Phase (+12 more)

### Community 5 - "Liga e Temporada"
Cohesion: 0.08
Nodes (44): add(), boxFor(), clampInt(), conferenceSeeds(), CONFS, divisionOf(), divisionTable(), DIVS (+36 more)

### Community 6 - "Playoffs e Prêmios Finais"
Cohesion: 0.09
Nodes (42): finalMvp(), bracket, Round, ROUNDS, COACHES, conferenceOf(), contractOf(), ensureSeason() (+34 more)

### Community 7 - "Jogadas e Passe"
Cohesion: 0.08
Nodes (33): CLOCK_RATE, FIELD, FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS (+25 more)

### Community 8 - "Menu da Carreira"
Cohesion: 0.19
Nodes (7): CarreiraMenu, f1(), grpOf(), hex(), nf(), ovc(), gradCard()

### Community 9 - "Documentos de Planejamento"
Cohesion: 0.07
Nodes (39): QB Career - Ordem de execucao no Claude Code, Etapa 10 - Celular (Capacitor), Etapa 1 - Base do projeto, Etapa 2 - Jogador em camadas e rosto, Etapa 3 - Criacao da carreira, Etapa 4 - Combine, Etapa 5 - Draft, Etapa 6 - Menu da carreira (+31 more)

### Community 10 - "Uniformes e Ponte da Partida"
Cohesion: 0.12
Nodes (22): KIT_IDS, kitAccents(), KitId, kitInfo(), shade(), ROUND_INFO, careerTeam(), nextGame() (+14 more)

### Community 11 - "Provas do Combine"
Cohesion: 0.11
Nodes (16): forcePanel(), Actor, CombineStage, MID, playerLook(), bottomShade(), infoPanel(), pill() (+8 more)

### Community 12 - "Base de Cenas Phaser"
Cohesion: 0.25
Nodes (16): phaser, Attempt, broadcast, FONT_LABEL, FONT_TITLE, GAME_H, GAME_W, matchRecords (+8 more)

### Community 13 - "Campo e Traves"
Cohesion: 0.13
Nodes (14): COLORS, hostTeam(), drawGoalPost(), drawPylon(), p, a, b, c (+6 more)

### Community 14 - "Estádios e Clima"
Cohesion: 0.12
Nodes (26): finalGame, matchConfig, venue, isDome(), stadiumOf(), buildRows(), finishTexture(), HAIR (+18 more)

### Community 15 - "Pixel Art dos Estádios"
Cohesion: 0.12
Nodes (20): CityPiece, CitySpec, DOMES, Stadium, STADIUMS, STAND_IDS, STAND_NAMES, StandChoice (+12 more)

### Community 16 - "Bola e Replay"
Cohesion: 0.10
Nodes (9): Ball, g0, g1, p, Pose, POSES, Throw, Frame (+1 more)

### Community 17 - "Sprites dos Jogadores"
Cohesion: 0.14
Nodes (18): SPRITE_SCALE, Role, Side, Slot, Attributes, BASE, drawDive(), drawDiveFlat() (+10 more)

### Community 18 - "Desenho do Gramado"
Cohesion: 0.17
Nodes (15): blockAssignments(), fillQuad(), a, b, c, d, groundArrow(), groundArrowHead() (+7 more)

### Community 19 - "Câmera e Palco"
Cohesion: 0.17
Nodes (15): CAMERA, guestTeam(), CORNERS, pickTimeOfDay(), RGB, shadowLights(), SkyWeather, TimeOfDay (+7 more)

### Community 20 - "Texturas de Sprites"
Cohesion: 0.12
Nodes (20): TeamConfig, TEX_PX, BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD, HOLD_LEGS (+12 more)

### Community 21 - "Partida da Carreira"
Cohesion: 0.15
Nodes (4): careerMatch(), leaveCareerMatch(), tipText(), CardOpts

### Community 22 - "Simulação de Drives"
Cohesion: 0.14
Nodes (6): pickScheme(), DriveRow, simulateDrive(), spotName(), Rng, Weather

### Community 23 - "Dependências npm"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 24 - "Menu Principal e Times"
Cohesion: 0.22
Nodes (16): applyMatchup(), toConfig(), autoUniform(), BY_ID, colorDist(), css(), fgOn(), lum() (+8 more)

### Community 25 - "Banco Lateral"
Cohesion: 0.20
Nodes (13): MATCH_SEED, AREA, BENCH, fx(), fy(), Side, Sideline, STAND_GAP (+5 more)

### Community 26 - "Botões e UI Comum"
Cohesion: 0.20
Nodes (6): sideButtons(), logoKey(), backButton(), Menu, label(), title()

### Community 27 - "Prêmios da Temporada"
Cohesion: 0.21
Nodes (16): Award, awardsReady(), awardsRecap(), AwardWinner, DEF, defScore(), lineOf(), OFF (+8 more)

### Community 28 - "Palco e Público"
Cohesion: 0.15
Nodes (10): ActorLook, hexStr(), sidelineOptions, Billboard, BillboardLayer, p, q, ShadowLight (+2 more)

### Community 29 - "Configuração da Partida"
Cohesion: 0.21
Nodes (5): saveMatchConfig(), WeatherChoice, MainMenu, TimeChoice, Level

### Community 30 - "Títulos e Troféus"
Cohesion: 0.23
Nodes (14): pick(), seasonYear(), champion(), championOf(), gameChampions(), revealed(), teamTitles(), titlesOf() (+6 more)

### Community 31 - "Barra de Força"
Cohesion: 0.22
Nodes (3): MeterBar, mix(), CombineForca

### Community 32 - "Projeção 3D"
Cohesion: 0.19
Nodes (6): PLANE, Projection, ScreenPoint, toPlaneT(), toPlaneX(), q

### Community 33 - "Inicialização do Jogo"
Cohesion: 0.19
Nodes (9): RES, boot(), CareerHub, CareerTest, patchText(), GradOpts, gradTexture(), path() (+1 more)

### Community 38 - "Config TypeScript"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

### Community 39 - "Widgets de Menu"
Cohesion: 0.35
Nodes (4): brand(), primaryButton(), hexOf(), GlassButton

### Community 40 - "Placar Horário Nobre"
Cohesion: 0.24
Nodes (10): playoffLogo, buildPrimeBoard(), hex(), poly(), Prime, PrimeBoard, primeKind, Rect (+2 more)

### Community 41 - "Carregamento de Assets"
Cohesion: 0.29
Nodes (5): Boot, careerAssetCounts(), GROUPS, queueCareerAssets(), sharpenCareerAssets()

### Community 53 - "Manifesto de Assets"
Cohesion: 0.40
Nodes (4): draft_suit, faces, layers, stadiums

## Knowledge Gaps
- **188 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+183 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 306 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `Partida: Lances ao Vivo` to `Jogadores e Rotas`, `Jogadas e Passe`, `Uniformes e Ponte da Partida`, `Bola e Replay`, `Sprites dos Jogadores`, `Desenho do Gramado`, `Câmera e Palco`, `Partida da Carreira`, `Simulação de Drives`, `Menu Principal e Times`, `Botões e UI Comum`, `Configuração da Partida`, `Tela de Defesa`, `HUD`, `Widgets de Menu`, `Introdução`, `Joystick`, `Controle do Corredor`, `Efeitos Visuais`, `Chute`, `Feedback de Jogo`, `Cartão de Resultado`, `Etiquetas`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Why does `phaser` connect `Base de Cenas Phaser` to `Times e Draft`, `Combine: Pontuação`, `Criação da Carreira`, `Liga e Temporada`, `Jogadas e Passe`, `Uniformes e Ponte da Partida`, `Provas do Combine`, `Campo e Traves`, `Estádios e Clima`, `Pixel Art dos Estádios`, `Bola e Replay`, `Sprites dos Jogadores`, `Desenho do Gramado`, `Câmera e Palco`, `Texturas de Sprites`, `Dependências npm`, `Menu Principal e Times`, `Banco Lateral`, `Palco e Público`, `Projeção 3D`, `Inicialização do Jogo`, `Painéis`, `Placar Horário Nobre`, `Carregamento de Assets`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `getSave()` connect `Uniformes e Ponte da Partida` to `Times e Draft`, `Partida: Lances ao Vivo`, `Combine: Pontuação`, `Criação da Carreira`, `Liga e Temporada`, `Playoffs e Prêmios Finais`, `Jogadas e Passe`, `Menu da Carreira`, `Provas do Combine`, `Base de Cenas Phaser`, `Partida da Carreira`, `Botões e UI Comum`, `Prêmios da Temporada`, `Palco e Público`, `Títulos e Troféus`, `Barra de Força`, `Cena Base do Combine`, `Widgets de Menu`, `Prova 40 Jardas`, `Prova 3 Cones`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _188 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Times e Draft` be split into smaller, more focused modules?**
  _Cohesion score 0.07075624797143784 - nodes in this community are weakly interconnected._
- **Should `Partida: Lances ao Vivo` be split into smaller, more focused modules?**
  _Cohesion score 0.07392607392607392 - nodes in this community are weakly interconnected._
- **Should `Combine: Pontuação` be split into smaller, more focused modules?**
  _Cohesion score 0.06354642313546423 - nodes in this community are weakly interconnected._