# Projeto: QB Career — Criação de carreira, Combine, Draft e Menu da carreira

O jogo **QB Career** (futebol americano mobile, estilo retrô em pixel art) já tem a **gameplay da partida pronta**. Você vai construir **tudo o que vem antes e depois da partida**, no mesmo projeto:

1. Criação do jogador (nome, faculdade, rosto, pele, cabelo, barba, confirmação).
2. Combine (4 testes jogáveis e resultado) — a única gameplay que você vai criar.
3. Draft (espera, ligação, anúncio, escolhido).
4. Menu da carreira (clube, personalizar, elenco, stats, tabela, notícias, contratos, jogos).
5. Integração com a gameplay que já existe (o botão JOGAR abre a partida e o resultado volta para o menu).

**Não refaça nem altere a gameplay da partida (a que já existe).** Só os mini-games do Combine (3.2) são novos. Antes de começar, **leia o projeto existente** (estrutura de pastas, `package.json`, cenas, `GameState`, config, fontes, como a partida é iniciada) e siga o mesmo estilo de código, a mesma stack e a mesma resolução.

---

## PARTE 0 — REGRAS GLOBAIS

### Projeto existente
- Use o **projeto atual** (Phaser 3 + TypeScript + Vite, retrato 390×844, fontes **Press Start 2P** e **Silkscreen**). Não crie outro projeto nem troque bibliotecas. Se algo diferir do que está escrito aqui, **vale o que já existe no projeto** e você me avisa.
- Preparado para empacotar com Capacitor no futuro (não precisa configurar agora).
- Estética: pixel art, bordas grossas, sombras duras, UI chunky. Liga fictícia **QFL**.

### REGRA Nº 0 — TUDO EM CÓDIGO, NADA DE IA (com exceção dos assets fornecidos)
- Lógica e gráficos **programados em código**. **Proibido:** modelos de IA, LLMs, APIs de IA, machine learning, serviços externos de geração, imagens/sprites/sons gerados por IA e qualquer chamada de rede durante o jogo.
- Mini-games do Combine, ranking, simulações e sorteios usam **algoritmos tradicionais** (regras, tabelas de probabilidade, aleatoriedade com seed). Nada de modelos treinados.
- Sons, se houver, sintetizados por código (Web Audio, chiptune). O jogo funciona **offline**.
- **Exceção — assets já prontos, usados como estão (não gere, não redesenhe, não substitua):**
  - o jogador em camadas, os rostos, o terno do Draft e as miniaturas de estádio de `qb_career_assets.zip` (Parte 1);
  - os **logos e dados de todos os times que o app já possui** (Parte 2.2).
- Todo o resto continua em código: UI, botões, cards, teclado pixel, mini-games, ícones e fallbacks.

### Qualidade e desempenho
- **60 FPS no celular.** Resposta imediata ao toque (botão afunda, brilho) e vibração (Vibration API) nas ações principais.
- Sem tempo morto: transições curtas (< 0,5s) e animações que podem ser puladas com um toque.
- Toques mínimos de 44px. Componha o jogador **uma vez e cacheie**.

### Regras de marca
- **Não usar** nomes, logos, cores ou uniformes oficiais da NFL nem de times reais.
- Os times e logos do app são do próprio projeto (Parte 2.2) e podem ser usados normalmente. Nos designs aparecem **Lobos** (laranja `#F26B1D`) e **Touros** (azul `#22406B`) apenas como exemplo — não escreva times no código.

---

## PARTE 1 — ASSETS FORNECIDOS (`qb_career_assets.zip`)

```
pack/layers/      → 132 camadas PNG em tons de cinza do corpo (grade 100×200, salvo 2×, NEAREST)
pack/draft_suit/  → camadas da figura de terno do Draft (200×400)
pack/faces/       → sheets de rostos: heads, features, facial, beards, hairmask, hairshade
pack/stadiums/    → 29 miniaturas de estádio pixeladas (179×100) + script de pixelização
```
Copie para `public/assets/layers/`, `draft_suit/`, `faces/` e `stadiums/`.

### 1.1 Corpo em camadas (tint em runtime)
Cada camada é cinza claro/escuro; pinte com **multiply** usando a cor desejada. Todas as camadas têm o mesmo tamanho e ficam empilhadas em `0,0`. Exibição a **1.5×** (150×300).

Ordem de empilhamento (baixo → cima): `shadow`, `skin`, `pads`, `pants`, `pstripe`, `knee`, `sock`, `sstripe`, `cleat`, `cacc`, `under_*`, `jersey_short|mid`, `collar`, `sleeve_*`, `yoke`, números `nf_0..9` (preenchimento) e `no_0..9` (contorno), `asl_*` (manga de braço), `glove_*`, `wrist_*`, `towel_*`, `nroll_*`, bloco do **rosto em sprite** (ver 1.2), `hair_*`, `beard_*`, capacete (`helmet_classic|speed|compact`, `hdet`, `hgloss`, `hstripe_*`, `decal_*`, `visor`, `mask_qb|rb|wr|ol`, `chin_two|four`, `mouth_*`, `eyeblack_*`).

No Phaser: use `Phaser.GameObjects.Image` por camada com `setTint(cor)` (multiply é o comportamento padrão do tint) — ou um `RenderTexture` que compõe e cacheia o jogador. **Cacheie a composição**; recompor só quando o visual mudar.

Os números do uniforme usam sprites 14×20 (px de arte); dois dígitos nas posições x=[37,49], um dígito x=43, y=58 (arte). O **número do QB é 12**.

### 1.2 Rostos em sprite (grade 48 px, ×4)
- `heads` 768×192 = 4 formatos de cabeça.
- `features` 3840×192 = 20 rostos (olhos, nariz, boca). Mapa cabeça↔rosto: `SHAPE=[0,1,2,3,1,0,0,1,2,3,0,1,2,0,3,1,0,2,3,1]`.
- `facial` 3840 = sobrancelhas.
- `beards` 9216 = 4 formatos × 12 barbas.
- `hairmask` / `hairshade` 5952 = 31 cabelos (máscara pintável + sombreado).
- Cada elemento é recortado por offset horizontal (`-índice × 192px` na sheet escalada).
- Pele: 8 cores. Cabelo/barba: 7 cores. 31 cabelos. 12 barbas.
- **Padrão do jogador novo:** rosto 0, pele 5 (`#8D5524`), cabelo 27 (dreads com degradê), cor 0 (`#15110F`), barba 6 (barba curta).

O **mesmo bloco de rosto** é usado: nas telas de criação (rosto/pele/cabelo/barba), no card de confirmação, na figura de terno do Draft (`scale 0.5`) e dentro do capacete no menu (`scale 0.375`, `left 39px; top 7px` sobre a grade do corpo). Crie **um componente `PlayerFace`** que recebe o look e é reutilizado em todos esses lugares — assim o rosto é idêntico em qualquer tela.

### 1.3 Figura de terno (Draft)
Camadas: `dr_trou` (`#2B3560`), `dr_shoes`, `dr_head` (só pescoço), `dr_shirt`, `dr_tie` (cor do time), `dr_jacket` (`#3A4E8A`), `dr_jersey` (cor do time, segurada na frente), `dr_jcollar`, `dr_jsleeve`, `dr_det`, números 12, `dr_hands`, e por cima o `PlayerFace`.

---

## PARTE 2 — DADOS E ESTADO

### 2.1 Um único save do jogador
Tudo abaixo vive em **um objeto persistido** (localStorage agora, Capacitor Preferences depois). As telas **não** guardam estado próprio. Se o projeto já tiver um sistema de save, **estenda-o** em vez de criar outro.

```ts
interface PlayerSave {
  name: string;            // "SILVA"
  firstName: string;
  number: 12;
  college: { id: string; name: string; colors: [string,string] }; // Pinecrest Lenhadores, verde #2E7D4F / dourado #E8C547
  face: number;            // 0..19
  skin: number;            // 0..7
  hair: number;            // 0..30
  hairColor: number;       // 0..6
  beard: number;           // 0..11
  look: LookOptions;       // opções do PERSONALIZAR (ver 5.3)
  attrs: { arm: number; accuracy: number; reading: number; speed: number };
  ovr: number;
  combine?: CombineResult;
  draft?: { teamId: string; pick: number; round: number; contract: { years: number; value: number } };
  career: CareerState;     // clube, temporada, semana, calendário, retrospecto…
}
```

**Regra de ouro:** o jogador criado é o mesmo que aparece na confirmação, no Draft, no menu e na partida (cores, número, pele, cabelo e capacete). Mudou o rosto na criação → muda em todos.

⚠️ **Inconsistência a corrigir:** o card de confirmação mostra **OVR 62**, mas o cabeçalho do menu mostra **OVR 74** (e o HUD da partida mostra 68). Derive o OVR de uma função `calcOvr(attrs)` e mostre o mesmo valor em todo lugar (o OVR de rookie deve ser ~62; menu e HUD evoluem a partir dele).

### 2.2 Registro de times e logos (espaço preparado para todos os times)

O app **já possui todos os times e os logos prontos de cada um**. **Não crie, redesenhe nem gere logos**: use exatamente os que já existem. O jogo **não** deve ter times escritos no código: crie (ou reaproveite, se já existir) um **registro de times** que carrega o que o app já tem, e todas as telas (menu e Draft) leem dele.

```ts
interface TeamDef {
  id: string;                 // "lobos"
  city: string;               // "Denver"
  name: string;               // "Lobos"
  abbr: string;               // "LOB"
  league?: string;            // liga/conferência/divisão de origem
  colors: { primary: string; secondary: string; accent?: string }; // hex
  logo: { large: string; small?: string };   // caminhos em public/assets/teams/<id>/
  stadium: { name: string; capacity: number; image?: string };  // image = chave de pack/stadiums (ex.: "denver")
  kits?: Partial<Record<'home'|'away'|'night', KitDef>>;         // opcional: sobrescreve os kits derivados
  ovr?: number;               // força do time
}
```
- **Fonte dos dados:** crie um `TeamRepository` (adaptador). Primeiro **inspecione onde o app guarda a lista de times e logos** (JSON, pasta de assets ou API) e ligue o adaptador a isso; se ainda não estiver no projeto do jogo, importe para `public/assets/teams/manifest.json` + `public/assets/teams/<id>/logo.png` (e `logo_small.png`, se existir). Não copie times à mão.
- **Qualquer quantidade de times:** tabela, calendário, Draft, ELENCO e adversários funcionam com N times (não presuma 8 nem 32). Telas só recebem `teamId`.
- **Logo ausente ou quebrado:** fallback em código — selo redondo com a sigla (`abbr`) nas cores do time.
- **Onde os logos aparecem:** cabeçalho do menu, aba CLUBE (escudo grande), JOGOS (os dois times do próximo jogo), TABELA (uma linha por time), NOTÍCIAS, CONTRATOS, ELENCO, DraftEspera/Telefone/Anúncio (telão e ligação) e DraftEscolhido (ao lado da jersey). Exiba sempre pixelado (`setFilter NEAREST`; HTML `image-rendering: pixelated`) e use `logo.small` em listas.
- **Kits derivados das cores do time:** se `kits` não vier no registro, gere com `deriveKits(team)`:
  - **Casa:** camisa `primary`, número `secondary` (ou branco, o que tiver contraste), calça e listras `secondary`, capacete `primary`.
  - **Fora:** camisa branca, número `primary`, calça branca ou `primary`, capacete branco ou `primary`.
  - **Noite:** base escura (`#262938`), número e listras `primary`, capacete escuro.
  - Garanta contraste mínimo entre camisa e número (se ficar baixo, troque por branco/preto). Os kits continuam **travados** para o jogador (5.2).
- **Estádio por time:** `stadium.image` aponta para uma das 29 miniaturas de `pack/stadiums/` (4.1). Sem imagem → placeholder em código.
- **Draft e time do jogador:** o time que escolhe o jogador é **sorteado/derivado do registro** (resultado do Combine, ordem de picks). "Lobos, pick 8" é só o exemplo do design.

---

## PARTE 3 — FLUXO DE TELAS

```
Título → CarreiraNome → CarreiraFaculdade → CarreiraRosto → CarreiraPele
  → CarreiraCabelo → CarreiraBarba → CarreiraConfirmacao
  → CombineHub → (Combine40 | Combine3Cones | CombinePasse | CombineForca) → CombineResultado
  → DraftEspera → DraftTelefone → DraftAnuncio → DraftEscolhido
  → CarreiraMenu (hub da carreira) → Partida (gameplay existente) → volta ao CarreiraMenu
```

### 3.1 Criação
1. **CarreiraNome** — nome/sobrenome, teclado pixel, limite de caracteres, sobrenome vira o nome do uniforme.
2. **CarreiraFaculdade** — escolhe a faculdade (padrão: Pinecrest Lenhadores, verde/dourado). Define as cores do uniforme universitário usado na confirmação.
3. **CarreiraRosto** — grade de 20 rostos, seleção com borda, preview ao vivo do rosto.
4. **CarreiraPele** — 8 tons.
5. **CarreiraCabelo** — 31 estilos + 7 cores.
6. **CarreiraBarba** — 12 estilos (inclui "sem barba").
7. **CarreiraConfirmacao** — card de rookie: figura com uniforme da faculdade (camadas pintadas verde/dourado, número 12, rosto escolhido), nome `SILVA #12 · PINECREST LENHADORES`, OVR e 4 atributos (BRAÇO, PRECISÃO, LEITURA, VELOCIDADE). Botões **EDITAR** (volta ao nome) e **IR PARA O COMBINE**.

Cada tela de criação tem preview do jogador, botões VOLTAR/PRÓXIMO e barra de progresso de etapas.

### 3.2 Combine (com a gameplay dos testes)

O Combine tem **4 testes**, nesta ordem (como no design): **1) 40 jardas, 2) 3 cones, 3) precisão de passe, 4) força de braço**. Esta é a **única gameplay a ser criada neste prompt**; ela é curta, feita em código, com toques e arrastos, e usa o jogador do save (`PlayerBody` pequeno, com o uniforme da faculdade). A tela de fundo é o estádio vazio do design.

**Regras comuns a todos os testes**
- Cada teste dura ~15–30 s. Fluxo: cartão de instrução (2–3 s, pode pular com toque) → contagem **3-2-1** → teste → cartão de resultado com **nota 0–100**, letra (A+ a D) e comparação com a média dos QBs.
- **2 tentativas** em 40 jardas, 3 cones e força de braço (vale a melhor); **1 série** no passe. O jogador pode repetir a tentativa tocando em TENTAR DE NOVO enquanto houver tentativas.
- Feedback imediato: botão afunda, partículas de poeira, vibração a cada toque certo, textos "PERFEITO!", "BOM", "FALHOU", câmera tremendo leve no fim.
- Aleatoriedade com **seed** (reproduzível). Nada de IA.
- O progresso é salvo no `PlayerSave` ao fim de cada teste (se o app fechar, o Combine continua de onde parou).
- Cada teste devolve ao hub um objeto `{ raw, score, grade }` (valor bruto, nota 0–100, letra).

**Teste 1 — Combine40 (40 jardas)**
- Visão lateral do corredor na pista. Dois botões grandes **ESQ** e **DIR** na parte de baixo (os passos).
- **Largada:** aparece "PRONTO… JÁ!" com um atraso aleatório de 0,8–1,8 s. Tocar no instante do "JÁ!" mede o **tempo de reação** (ideal < 0,25 s). Tocar antes é **queima de largada** (+0,2 s de penalidade).
- **Corrida:** o jogador toca ESQ/DIR **alternando**. Uma barra de **cadência** mostra a zona verde de ritmo ideal; toques dentro da zona somam aceleração, toques fora do ritmo ou repetindo o mesmo lado perdem velocidade. Há uma leve fadiga nos últimos 10 jardas (ritmo acelera).
- Cronômetro em centésimos, parciais nas marcas de 10, 20 e 40 jardas.
- **Tempo final** de ~4,40 s a 5,30 s, calculado por reação + eficiência da cadência + atributo `speed` base do rookie. Nota: 4,40 s = 100, 5,30 s = 0 (linear, com limites).

**Teste 2 — Combine3Cones (3 cones)**
- Vista de cima com 3 cones em "L". O corredor corre sozinho para o próximo cone; o jogador faz o **corte** deslizando o dedo na direção da seta **quando o anel do cone fecha** (janela PERFEITO/BOM/FALHOU).
- Sequência de ~5 cortes (frente, esquerda, direita, volta, linha de chegada).
- **Perfeito** não perde velocidade; **bom** perde pouco; **falhou** derruba o ritmo e **tocar no cone** soma +0,3 s.
- **Tempo final** de ~6,80 s a 7,80 s. Nota: 6,80 s = 100, 7,80 s = 0.

**Teste 3 — CombinePasse (precisão de passe)**
- **10 lançamentos** para alvos que se movem (argolas ou recebedores em rotas curtas, médias e longas, com velocidades diferentes).
- Controle: **passe estilingue** (arrastar para trás a partir do QB e soltar; direção = alvo, distância = força), com linha de trajetória lisa e ponto de queda nítido. **Reaproveite a mecânica de passe da gameplay existente** se for possível usá-la isolada; senão, implemente uma versão simples igual.
- Pontuação por lançamento: **centro = 100**, anel = 50–75, acerto na borda = 25, errou = 0; bônus por passar "na frente" do alvo (lead). Contador de acertos e combo na tela.
- Nota = média dos 10 lançamentos (0–100).

**Teste 4 — CombineForca (força de braço)**
- **3 lançamentos de potência** em direção ao fundo do campo. **Segure** o botão para carregar a barra de força e **solte** dentro da zona dourada (a zona se move levemente); depois um segundo toque no **timing da liberação** ajusta a precisão do giro.
- Mede a **velocidade da bola** (≈ 48–62 mph) e a **distância** (≈ 55–75 jardas); mostra o radar e a trajetória. Vale o **melhor** lançamento.
- Nota: combinação de velocidade (60%) e distância (40%), 0–100.

**CombineHub:** lista os 4 testes com status (pendente/feito), resultado parcial e nota; o botão **VER RESULTADO** só libera quando os 4 estiverem feitos (ou o jogador pode pular testes com penalidade na nota — decisão sua, documente).

**CombineResultado:** nota final do Combine (média ponderada), **ranking entre os QBs** (gere ~24 QBs por código com seed e compare), **projeção de rodada** do Draft e **interesse dos times** (os times mais interessados vêm do registro de times, com logos e uma barra de interesse). **Atualiza os atributos e o OVR** do save:
- `speed` ← 40 jardas e 3 cones;
- `accuracy` ← precisão de passe;
- `arm` ← força de braço;
- `reading` ← valor base do rookie + pequeno bônus (por exemplo, pela média geral do Combine).
- O OVR é recalculado com `calcOvr(attrs)` (2.1); o OVR do rookie fica em torno de 62 e **o mesmo valor aparece na confirmação, no menu e no HUD da partida**.

### 3.3 Draft
- **DraftEspera** — sala de espera ("green room"), suspense, ticker com picks acontecendo.
- **DraftTelefone** — o telefone toca, o time liga (logo e nome do time). Interação de atender.
- **DraftAnuncio** — telão/anúncio oficial do pick, com o time que escolheu (exemplo do design: Lobos, pick 8, 1ª rodada).
- **DraftEscolhido** — o jogador **de terno segurando a jersey do time** (figura em 1.3, jersey na cor do time com número 12 e o logo do time), com rosto idêntico ao criado. Mostra o contrato (4 anos, valor) e botão para ir ao menu.

O pick pode variar conforme o resultado do Combine (rodada/time) — mas o **visual do Draft é sempre o do time que escolheu**, cuja cor tinge a jersey e a gravata. Se o time mudar, as cores do kit mudam junto (5.2).

---

## PARTE 4 — MENU DA CARREIRA (CarreiraMenu)

Cabeçalho fixo com nome, #12, time (logo), OVR, e abas:

`CLUBE · PERSONALIZAR · ELENCO · STATS · TABELA · NOTÍCIAS · CONTRATOS · JOGOS`

- **CLUBE** — miniatura do **estádio real da cidade do time** (foto pixelada — ver 4.1; ex.: "Estádio dos Lobos · 68.000"), logo do time, informações do clube, objetivos da temporada, **amor da torcida** e **química do time**, próximo jogo em destaque.
- **JOGOS** — calendário de jogos futuros (logos dos dois times); botão **JOGAR** inicia a partida (Parte 6).
- **ELENCO** — roster com OVR, posição, contrato.
- **STATS** — estatísticas do QB (jardas, TDs, INTs, rating).
- **TABELA** — classificação da QFL por divisão (uma linha por time do registro, com logo).
- **NOTÍCIAS** — feed gerado por regras (ex.: "Silva é o novo QB titular dos Lobos").
- **CONTRATOS** — contrato atual, renovações, cláusulas.
- **PERSONALIZAR** — ver Parte 5.

Dados de clube/liga ficam em `data/` (JSON/TS), sem backend. O resultado das partidas atualiza placar, retrospecto, stats, tabela e notícias.

### 4.1 Miniatura do estádio (foto real pixelada)

A miniatura do estádio na aba CLUBE é a **foto de um estádio de futebol americano real da cidade do time**, **pixelada no mesmo estilo** da miniatura do design (foto reduzida e reamostrada em baixa resolução, `image-rendering: pixelated`). Muda automaticamente conforme o time do jogador (e o adversário, no card do próximo jogo).

**As 29 fotos já estão prontas** em `pack/stadiums/<cidade>.png` (179×100 px, RGB, já pixeladas e sem marcas visíveis, no mesmo estilo da miniatura do design — não precisa processar de novo). Cidades disponíveis: atlanta, baltimore, buffalo, charlotte, chicago, cincinnati, cleveland, dallas, denver, detroit, foxborough, green-bay, houston, indianapolis, jacksonville, kansas-city, las-vegas, los-angeles, miami, minneapolis, nashville, new-orleans, philadelphia, phoenix, pittsburgh, san-francisco, seattle, tampa, washington.

Mapeamento padrão **dos 8 times de exemplo** (editável em `data/teams.ts`; os demais times do app escolhem a imagem pelo campo `stadium.image`):

| Time | Cidade | Imagem | Nome fictício exibido | Capacidade exibida |
|---|---|---|---|---|
| Lobos | Denver | `denver.png` | Estádio dos Lobos | 68.000 |
| Touros | Dallas | `dallas.png` | Arena dos Touros | 72.000 |
| Tubarões | Miami | `miami.png` | Arena dos Tubarões | 65.000 |
| Aços | Pittsburgh | `pittsburgh.png` | Estádio dos Aços | 68.000 |
| Falcões | Atlanta | `atlanta.png` | Arena dos Falcões | 69.000 |
| Ursos | Chicago | `chicago.png` | Estádio dos Ursos | 61.000 |
| Cobras | Phoenix | `phoenix.png` | Arena das Cobras | 65.000 |
| Titãs | Nashville | `nashville.png` | Estádio dos Titãs | 69.000 |

O estádio dos Lobos (Denver) já está aplicado na tela CarreiraMenu do design.

Regras:
- **Estilo (para novas fotos):** `pack/stadiums/tools_pixelate.py` mostra o processo — recorte central na proporção **179:100**, redução com filtro *box* para **179×100**, cor cheia (sem paleta), sem suavização ao exibir. No jogo a imagem é exibida ampliada (Phaser: `setFilter NEAREST`, `roundPixels`; HTML: `image-rendering: pixelated`) em caixa de ~358×200.
- **Fotos:** as 29 imagens foram fornecidas pelo dono do projeto. Antes de publicar nas lojas, confirme os direitos de uso de cada foto (ou troque por fotos com licença livre, como Wikimedia Commons) e registre as atribuições em `public/assets/stadiums/CREDITS.md`.
- **Nomes e marcas:** nas 29 miniaturas já foram **removidos logos, letreiros e nomes** dos estádios, anúncios e textos de campo. Na UI use **nomes fictícios** (coluna acima) — não exiba nomes, logos ou marcas da NFL/times/estádios reais. Se algum logo ainda estiver legível numa foto nova, borre ou recorte antes de pixelar.
- **Dados:** `teams.ts` tem `city` e `stadium: { name, capacity, image }` por time. A aba CLUBE e o card "próximo jogo" leem daí.
- **Fallback:** se a imagem não carregar, mostre um placeholder pixel-art em código (arquibancada simples na cor do time).

---

## PARTE 5 — PERSONALIZAR (uniforme travado pelo time)

O uniforme pertence ao time que escolheu o jogador. **O usuário não pode alterar cores do uniforme nem a fonte dos números.**

### 5.1 Layout
Prévia do jogador **fixa à esquerda** (168×330, corpo composto) e controles à direita, em categorias: **UNIFORME · ROSTO · CAPACETE · CORPO · PÉS · MÃOS · EXTRAS**.

### 5.2 Kits travados (`kits.ts`)
Três kits por time (vindos de `kits` do registro ou de `deriveKits`; exemplo do Lobos): **Casa** (laranja/branco), **Fora** (branco/azul-marinho), **Noite** (`#262938`/laranja). Cada kit define e **trava**: cor do capacete, faixa e escudo, camisa, gola, listras de manga, yoke, número (preenchimento + contorno), calça + listra. Na categoria UNIFORME o usuário só **escolhe qual kit** usar (Casa/Fora/Noite), nunca as cores.

### 5.3 Opções editáveis (`LookOptions`)
- Capacete: modelo (classic/speed/compact), acabamento (brilho/fosco), máscara (qb/rb/wr/ol) + cor, viseira, jugular.
- Corpo: comprimento da camisa, camisa de baixo, manga de braço, comprimento da calça, joelheiras, meias.
- Pés: chuteiras (+detalhes). Mãos: luvas, munhequeira. Extras: toalha, protetor de pescoço, protetor bucal, olho-negro, cabelo, barba, pele, comemoração.
- Número fixo **12**, fonte fixa.

Cada alteração atualiza a prévia na hora e é gravada em `save.look`. Ao trocar o time (transferência futura), os kits mudam de cor mas as opções editáveis permanecem.

### 5.4 Rosto dentro do capacete
O capacete tem uma janela ampla: o rosto em sprite (1.2) aparece nela, **com o mesmo rosto/pele/cabelo/barba do save**. Sempre via `PlayerFace`.

---

## PARTE 6 — INTEGRAÇÃO COM A GAMEPLAY EXISTENTE

A partida **já está pronta**; não a reescreva. Crie só uma **camada fina de integração** (`MatchBridge`), adaptando os nomes ao que o projeto já tem:

- **Iniciar partida (botão JOGAR / JOGOS):** o menu chama a cena de partida existente passando: `homeTeamId`, `awayTeamId` (do calendário), clima (se a gameplay suportar: limpo/neve/chuva), o **retrospecto** de cada time e o **jogador** (`PlayerSave`).
- **Dados do jogador na partida:** quando a gameplay permitir, use do save o **número 12**, o **tom de pele**, o **cabelo**, o **capacete** (`look`), o **kit** do time (Casa/Fora/Noite escolhido) e o OVR de `calcOvr`. O rosto não precisa aparecer em campo.
- **Times na partida:** nomes, siglas, cores e logos vêm do registro de times (2.2), não de constantes do código da gameplay. Se a gameplay tiver times fixos, **troque só essa leitura** por uma chamada ao `TeamRepository`, sem mexer na lógica de jogo.
- **Fim da partida:** a gameplay devolve ao menu um resultado (`placar`, `vencedor`, `stats do QB: comp/jardas/TD/INT`, `XP`, `confiança`). O `MatchBridge` grava isso no `PlayerSave` e atualiza **retrospecto, stats, tabela, notícias e o calendário**, e então volta ao CarreiraMenu.
- Se a gameplay ainda não expuser esses pontos de entrada e saída, adicione-os com **mudanças mínimas** (parâmetros de início e um evento/callback de fim) e me avise o que mudou.
- O OVR exibido no HUD da partida deve vir do mesmo `calcOvr` (2.1).

---

## PARTE 7 — ESTRUTURA, ORDEM DE TRABALHO E CRITÉRIOS

### 7.1 Estrutura de pastas sugerida (adapte à estrutura que já existe)
```
src/
  scenes/
    career/   Nome, Faculdade, Rosto, Pele, Cabelo, Barba, Confirmacao
    combine/  Hub, Combine40, Combine3Cones, CombinePasse, CombineForca, Resultado
    draft/    Espera, Telefone, Anuncio, Escolhido
    menu/     CarreiraMenu + tabs/
  player/     PlayerSave.ts, PlayerFace.ts, PlayerBody.ts (camadas), kits.ts, deriveKits.ts, look.ts
  data/       teams.ts, TeamRepository.ts, schedule.ts, college.ts
  integration/ MatchBridge.ts
  ui/         botões, cards, teclado pixel
public/assets/ layers/, draft_suit/, faces/, stadiums/ (+ CREDITS.md), teams/<id>/logo.png + manifest.json
tools/        pixelate script (foto → miniatura pixelada)
```

### 7.2 Como trabalhar (uma etapa por vez)
**Pare ao fim de cada etapa, rode (`npm run dev`), confira o console sem erros, teste no celular e me explique de forma simples o que mudou e como testar. Só siga depois da minha aprovação.**

0. **Reconhecimento:** leia o projeto existente (estrutura, cenas, `GameState`, como a partida inicia e termina, onde estão times e logos) e me faça um resumo curto do que encontrou e do que vai reaproveitar.
1. **Base:** assets do zip em `public/assets/`, `PlayerSave` (ou extensão do save existente) e **registro de times/logos ligado aos dados que o app já tem** (2.2). Cena de teste listando os times com logos.
2. **Jogador em camadas e rosto:** `PlayerBody` (tint + cache) e `PlayerFace`. Jogador padrão com kit Casa igual ao design.
3. **Criação da carreira:** Nome → Barba → Confirmação, ligadas ao save; `calcOvr`.
4. **Combine:** hub, os 4 mini-games jogáveis (40 jardas, 3 cones, precisão de passe, força de braço) e resultado (atualiza atributos/OVR). Teste cada mini-game isolado antes de ligar ao hub.
5. **Draft:** 4 telas, figura de terno com a jersey e o logo do time, rosto idêntico.
6. **Menu da carreira:** todas as abas com dados mockados, estádios (4.1), logos e tabela com N times.
7. **PERSONALIZAR:** kits travados + opções editáveis, rosto no capacete.
8. **Integração (Parte 6):** `MatchBridge`, botão JOGAR abre a gameplay existente, resultado volta e atualiza o menu.
9. **Testes e acabamento:** 600 looks aleatórios sem erro de camada ausente; mesmo rosto em Confirmação, Draft e capacete; OVR consistente; 60 FPS; fluxo completo sem travar.
10. **(Depois)** Capacitor: empacotar, testar em aparelho e trocar localStorage por Capacitor Preferences.

- Código limpo, comentado em português, sem bibliotecas desnecessárias.
- **Lembre-se: nada de IA — tudo programado em código; os únicos assets externos são os fornecidos (Parte 1) e os logos/dados dos times do app (2.2).**

### 7.3 Critérios de aceite
- Todos os times e logos do app aparecem no jogo sem nenhum time escrito no código; logo ausente cai no selo com a sigla.
- O rosto escolhido na criação aparece **idêntico** na confirmação, no Draft e dentro do capacete.
- Nenhuma cor de uniforme nem fonte de número é editável pelo jogador.
- Pernas nunca ficam cortadas, qualquer comprimento de calça.
- OVR único e coerente em todas as telas (confirmação, menu e HUD da partida).
- A miniatura do estádio no menu corresponde ao time/cidade do jogador, no mesmo estilo de foto pixelada, com créditos das fotos registrados.
- A gameplay existente continua funcionando como antes; o resultado da partida atualiza o menu.
- Composição do jogador cacheada; 60 FPS em celular médio; offline.

### 7.4 Critério de pronto
No navegador do celular, a 60 FPS e offline: crio meu jogador, passo pelo Combine, sou escolhido no Draft por um time, chego ao menu da carreira (com estádio, tabela e logos corretos), personalizo o visual dentro do uniforme travado, toco em JOGAR, jogo a partida da gameplay existente e volto ao menu com o resultado, as estatísticas e a tabela atualizados. Tudo rápido, responsivo e fiel ao design.

Referência visual: as telas do projeto de design (CarreiraNome … CarreiraMenu, Combine*, Draft*) são a fonte da verdade de layout e cores.
