# Graph Report - qb-career  (2026-10-06)

## Corpus Check
- Corpus is ~41,729 words - fits in a single context window. You may not need a graph.

## Summary
- 547 nodes · 1497 edges · 15 communities (9 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Config, Câmera e Trave
- Cena da Partida (jogadas e chutes)
- Jogadas, Rotas e Formações
- Cena: Interface, Clima e Estado
- Arquibancada e Campanha Adversária
- Bola e Poses
- Projeto npm (Phaser, Vite)
- Sprites das Laterais
- Placar (HUD) e Estado do Jogo
- Configuração TypeScript
- Controle do Corredor
- Efeitos de Tela (Fx)
- Game Feel (Feedback)
- Controles da Jogada
- Etiquetas (Tag)

## God Nodes (most connected - your core abstractions)
1. `MatchScene` - 111 edges
2. `Player` - 55 edges
3. `phaser` - 28 edges
4. `label()` - 28 edges
5. `Projection` - 25 edges
6. `GlassButton` - 25 edges
7. `title()` - 25 edges
8. `Rng` - 22 edges
9. `vibrate()` - 21 edges
10. `LivePlay` - 19 edges

## Surprising Connections (you probably didn't know these)
- `MatchScene` --references--> `RecvKey`  [EXTRACTED]
  src/scenes/MatchScene.ts → src/data/plays.ts
- `Read` --references--> `RecvKey`  [EXTRACTED]
  src/systems/passing.ts → src/data/plays.ts
- `Ball` --references--> `Player`  [EXTRACTED]
  src/entities/Ball.ts → src/entities/Player.ts
- `MatchScene` --references--> `Ball`  [EXTRACTED]
  src/scenes/MatchScene.ts → src/entities/Ball.ts
- `MatchScene` --references--> `Player`  [EXTRACTED]
  src/scenes/MatchScene.ts → src/entities/Player.ts

## Import Cycles
- None detected.

## Communities (15 total, 6 thin omitted)

### Community 0 - "Config, Câmera e Trave"
Cohesion: 0.05
Nodes (56): CAMERA, COLORS, FIELD, GAME_H, GAME_W, MATCH_SEED, SPRITE_SCALE, TEAMS (+48 more)

### Community 1 - "Cena da Partida (jogadas e chutes)"
Cohesion: 0.06
Nodes (12): RUN_PLAYS, MatchScene, pickScheme(), tipText(), vibrate(), groundArrow(), groundPath(), spotName() (+4 more)

### Community 2 - "Jogadas, Rotas e Formações"
Cohesion: 0.05
Nodes (51): FORMATION_NAME, HOT_ROUTE_CYCLE, NICKEL_425, PASS_PLAYS, PassPlay, RECV_COLORS, RecvKey, Role (+43 more)

### Community 3 - "Cena: Interface, Clima e Estado"
Cohesion: 0.06
Nodes (25): phaser, CLOCK_RATE, FONT_LABEL, FONT_TITLE, QUARTER_SECONDS, hexStr(), KEYS, QbStats (+17 more)

### Community 4 - "Arquibancada e Campanha Adversária"
Cohesion: 0.08
Nodes (15): makeRowTexture(), rowGeom(), stairsU(), DriveRow, simulateDrive(), Rng, TACKLE_RANGE, TackleResult (+7 more)

### Community 5 - "Bola e Poses"
Cohesion: 0.08
Nodes (20): Ball, g0, p, Pose, POSES, groundOval(), groundSegment(), aimFromDrag() (+12 more)

### Community 6 - "Projeto npm (Phaser, Vite)"
Cohesion: 0.10
Nodes (19): dependencies, phaser, devDependencies, @fontsource/press-start-2p, @fontsource/silkscreen, typescript, vite, name (+11 more)

### Community 7 - "Sprites das Laterais"
Cohesion: 0.13
Nodes (19): TeamConfig, BARE_HEAD, buildSidelineTextures(), COACH, HAIRS, HELMET_HEAD, HOLD_LEGS, HOLD_TORSO (+11 more)

### Community 9 - "Configuração TypeScript"
Cohesion: 0.17
Nodes (11): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+3 more)

## Knowledge Gaps
- **88 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+83 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 160 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MatchScene` connect `Cena da Partida (jogadas e chutes)` to `Config, Câmera e Trave`, `Jogadas, Rotas e Formações`, `Cena: Interface, Clima e Estado`, `Arquibancada e Campanha Adversária`, `Bola e Poses`, `Projeto npm (Phaser, Vite)`, `Placar (HUD) e Estado do Jogo`, `Controle do Corredor`, `Efeitos de Tela (Fx)`, `Game Feel (Feedback)`, `Etiquetas (Tag)`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **Why does `phaser` connect `Cena: Interface, Clima e Estado` to `Config, Câmera e Trave`, `Jogadas, Rotas e Formações`, `Arquibancada e Campanha Adversária`, `Bola e Poses`, `Projeto npm (Phaser, Vite)`, `Sprites das Laterais`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `Player` connect `Jogadas, Rotas e Formações` to `Cena da Partida (jogadas e chutes)`, `Cena: Interface, Clima e Estado`, `Arquibancada e Campanha Adversária`, `Bola e Poses`, `Controle do Corredor`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _88 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Config, Câmera e Trave` be split into smaller, more focused modules?**
  _Cohesion score 0.050615901455767075 - nodes in this community are weakly interconnected._
- **Should `Cena da Partida (jogadas e chutes)` be split into smaller, more focused modules?**
  _Cohesion score 0.06091825307950728 - nodes in this community are weakly interconnected._
- **Should `Jogadas, Rotas e Formações` be split into smaller, more focused modules?**
  _Cohesion score 0.051201671891327065 - nodes in this community are weakly interconnected._