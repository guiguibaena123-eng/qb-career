---
name: QB Career
description: Menus do jogo como a transmissão da partida — pacote gráfico de TV sobre a imagem ao vivo do estádio.
colors:
  broadcast-ink: "#0B0E14"
  ink-plate: "#161B25"
  ink-raised: "#222936"
  rule: "#2E3747"
  studio-white: "#F3F5F7"
  first-down-yellow: "#FFC400"
  on-air-red: "#E0263C"
  status-green: "#2FBF62"
  text-muted: "#93A0B6"
  text-dim: "#7D89A3"
  text-on-white: "#46516A"
typography:
  display:
    fontFamily: "Saira Condensed, Arial Narrow, sans-serif"
    fontSize: "88px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "1px"
  headline:
    fontFamily: "Saira Condensed, Arial Narrow, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    letterSpacing: "0.8px"
  title:
    fontFamily: "Saira Condensed, Arial Narrow, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    letterSpacing: "0.6px"
  body:
    fontFamily: "Saira Condensed, Arial Narrow, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "0.6px"
  label:
    fontFamily: "Saira Condensed, Arial Narrow, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "1.4px"
rounded:
  none: "0px"
spacing:
  gutter: "16px"
  stack: "4px"
  section: "26px"
components:
  plate-primary:
    backgroundColor: "{colors.first-down-yellow}"
    textColor: "{colors.broadcast-ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
    height: "58px"
  plate-team-action:
    textColor: "{colors.studio-white}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
    height: "62px"
  tarja-white:
    backgroundColor: "{colors.studio-white}"
    textColor: "{colors.broadcast-ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
    height: "74px"
  plate-option:
    backgroundColor: "{colors.ink-plate}"
    textColor: "{colors.studio-white}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    height: "44px"
  plate-option-selected:
    backgroundColor: "{colors.ink-raised}"
    textColor: "{colors.first-down-yellow}"
  tab-selected:
    backgroundColor: "{colors.first-down-yellow}"
    textColor: "{colors.broadcast-ink}"
    height: "36px"
  score-bug:
    backgroundColor: "{colors.broadcast-ink}"
    textColor: "{colors.studio-white}"
    typography: "{typography.title}"
    height: "40px"
---

# Design System: QB Career (menus)

## Overview

**Creative North Star: "A Transmissão"**

Fora de campo, o jogo é a transmissão dele mesmo. Cada menu é um pacote gráfico de TV esportiva colocado por cima da "imagem ao vivo" do estádio do seu time: placar no canto dizendo onde você está, tarjas que entram deslizando, vinheta entre as telas e o telestrador do comentarista marcando o que você escolheu. A densidade é de transmissão: muita informação, organizada em placas firmes, nunca em cartões flutuantes.

Dentro da partida, os menus por cima do jogo também usam o pacote: pausa, escolha da 4ª descida e a campanha simulada do adversário (`src/ui/DefenseScreen.ts`, com a velocidade 1X/2X no topo), assim como a interface dos testes do Combine (`src/combine/ui.ts`, `forcePanel.ts`). Primeira abertura: escolha do time do coração (grade dos 32), que vem pronto na Partida Rápida e se troca pela placa SEU TIME da página inicial.

Os placares de horário nobre e dos playoffs (`src/ui/primeBoard.ts`) são exceção dentro do campo: cada transmissão é um pacote próprio na fonte de transmissão (Quinta à noite = LED neon; Domingo à noite = gala dourada com estandarte; Segunda à noite = times empilhados com faixa de alerta; Playoffs = chave do mata-mata; QFL Bowl = ouro sobre mármore), todos com a bola de posse ao lado da sigla de quem ataca. O placar comum continua pixel.

O sistema substitui por completo o visual anterior (vidro azul, cantos arredondados, fonte pixel nos menus) em todo o caminho fora de campo: carregamento, menus, criação do QB, Combine (lista, cartões de instrução e de resultado dos testes), Draft (placas, telão, barra e botões; a arte do palco continua em pixel art), carreira e pré-jogo. Continuam do jogo: os jogadores em pixel art, os logos dos times, o palco do Draft e tudo o que acontece em campo (incluindo o placar dos testes do Combine), que não usa este sistema.

**Key Characteristics:**
- Toda placa corta na diagonal (12°); não existe canto arredondado.
- Tinta de transmissão por baixo, placas claras para o conteúdo que se lê, amarelo de primeira descida para o que está escolhido.
- As cores dos times entram como blocos chapados que seguram o logo.
- Uma fonte só, condensada e pesada, em caixa-alta.

## Colors

Paleta contida de transmissão: tinta e branco de estúdio fazem o trabalho, um amarelo marca a escolha e as cores dos times dão a vida.

### Primary
- **Amarelo de Primeira Descida** (first-down-yellow): seleção (aba ativa, botão PRÓXIMO, VS, OVR), o traço e o círculo do telestrador, o selo QB da abertura. É a única cor de destaque da interface.

### Secondary
- **Vermelho No Ar** (on-air-red): só o ponto AO VIVO pulsando, o botão de apagar armado e resultados de derrota.
- **Verde de Status** (status-green): só status — vitória, nota alta, meta concluída, PRONTO. Nunca enfeite.

### Neutral
- **Tinta de Transmissão** (broadcast-ink): fundo, placar do topo, véu sobre a foto do estádio.
- **Placa de Tinta** (ink-plate) e **Placa Elevada** (ink-raised): placas de opção e conteúdo; a elevada marca a opção escolhida.
- **Fio** (rule): contornos de 1px e o fio dos cabeçalhos de seção.
- **Branco de Estúdio** (studio-white): placas de conteúdo de leitura (tarjas do menu, save, tarjas do pré-jogo, sua linha na tabela), sempre com texto em tinta.
- **Texto apagado** (text-muted, text-dim) sobre tinta; **texto sobre branco** (text-on-white) nas placas claras.

### Named Rules
**A Regra do Amarelo Único.** Amarelo marca escolha ou ação principal; se tudo está amarelo, nada está escolhido.
**A Regra das Cores dos Times.** Cor de time aparece chapada, segurando logo ou número (bloco, painel do confronto, botão JOGAR), nunca como brilho ou degradê. Cor escura de time sobre tinta é clareada antes de virar barra (`onInk`).

## Typography

**Display Font:** Saira Condensed (Arial Narrow, sans-serif), pesos 600/700/800, embutida (offline).

**Character:** condensada e pesada como o lettering de placar de TV; tudo em caixa-alta, com respiro de letra maior nos rótulos pequenos. Todo texto nasce de `tvText`, que mede a linha com as maiúsculas acentuadas (senão o acento de Á/Í/Ç é cortado).

### Hierarchy
- **Display** (800, 88–98px): só a abertura (QB / CAREER) e as posições do treino (QB / RB).
- **Headline** (800, 25–30px): títulos das tarjas e dos botões de ação.
- **Title** (800, 15–22px): placar do topo, nomes de times, opções.
- **Body** (600, 13–16px): linhas de apoio e dados.
- **Label** (700, 11–13px, espaçamento 1–2px): selos e cabeçalhos de seção.

### Named Rules
**A Regra da Caixa-Alta.** Interface em caixa-alta; minúscula só em nomes próprios digitados pelo jogador.

## Layout

Tela de celular em retrato (390×844 lógico, desenhada a 2×). Margem lateral de 16px; placas lado a lado separadas por 4px; seções separadas por ~26px com o cabeçalho de seção (nome + fio + traço amarelo). O placar do topo ocupa y 14–54 em toda tela; a ação principal fica embaixo, ao alcance do polegar (y ≈ 790). Listas longas (times, elenco, tabela, jogos) rolam dentro de painéis e passam por baixo do degradê do botão de baixo.

## Elevation & Depth

Profundidade por camadas de placa: placa elevada (ink-raised) sobre placa de tinta, sobre o véu do estádio. Sombras são deslocadas para baixo e macias (três camadas de preto a 7%/12%/20%, deslocadas 2/4/7px) — nunca bloco duro.

## Shapes

**A Regra do Corte de 12°.** Toda placa tem o canto de cima à esquerda e o de baixo à direita cortados na diagonal (inclinação de 12°, no máximo 12px). Painéis de confronto usam o corte em diagonal inteiro entre os dois times. Nada é arredondado.

## Components

### Placar do topo (score bug)
Faixa de tinta com: voltar (placa elevada com seta), ponto AO VIVO pulsando, o nome da tela e, à direita, o passo ("1 DE 2") e o bloco do seu time. É a navegação: tocar no voltar sempre leva à tela anterior.

### Tarjas do menu
Placa larga com bloco de cor (logo ou ícone desenhado) à esquerda, título em headline e linha de apoio. A principal é chapada na cor do time; as outras são placas brancas com texto em tinta. Ao toque, a placa empurra 3px para a direita e clareia.

### Opções (placas de escolha)
Placa de tinta; a escolhida vira placa elevada com texto amarelo e um traço de caneta amarelo do telestrador embaixo. Escolhas com figura em placa apertada (uniformes, times) ganham contorno amarelo de 2px e o traço sob o nome; o círculo do telestrador não é usado em grade, porque corta capacete e texto.

### Selo de horário nobre
Placa branca com texto em tinta e o nome em português (QUINTA À NOITE, DOMINGO À NOITE, SEGUNDA À NOITE, WILD CARD…), campo `pt` de `PRIME`. As cores próprias de cada programa ficam só na transmissão em campo.

### Notas (OVR e atributos)
Faixas fixas: verde ≥ 85, amarelo ≥ 75, laranja ≥ 65, abaixo disso cinza (`text-muted`). Vermelho não entra na escala de nota.

### Destaque "é você"
Placa elevada (ink-raised) com faixa amarela de 4px no topo e contorno amarelo de 2px (`tvCard` com cor amarela). Nunca misturar amarelo na tinta (vira oliva).

### Selos de status
Placa pequena chapada (verde = salvo/concluído, vermelho = armado para apagar) com ícone desenhado, logo acima do botão de baixo; some sozinha.

### Abas da carreira
Cinco abas fixas, todas visíveis (INÍCIO · MEU QB · ELENCO · LIGA · NOTÍCIAS); a ativa é amarela com texto em tinta; novidade em selo vermelho no canto. MEU QB (stats, visual, contrato, títulos) e LIGA (tabela, jogos, times, jogadores, prêmios) mostram sub-abas logo abaixo, no estilo de opção (placa elevada, texto amarelo e traço). Tocar em qualquer item de lista dá um clarão rápido sobre ele. Textos longos encolhem na horizontal para caber (`fit`), nunca saem da placa.

### Vinheta (assinatura)
Três faixas diagonais (amarelo, cor do time, tinta) varrem a tela; a tela troca por baixo da faixa de tinta (~510ms no total). Toda navegação entre telas passa por ela.

## Do's and Don'ts

### Do:
- **Do** cortar toda placa na diagonal de 12° (`plate()` em `src/ui/tv.ts`).
- **Do** marcar a escolha com o telestrador (traço de caneta sob o nome; em placas com figura, contorno amarelo + traço).
- **Do** usar placa branca com texto em tinta para conteúdo de leitura.
- **Do** passar pela vinheta (`wipe` / `wipeTo`) em toda troca de tela.
- **Do** desenhar setas e marcadores (`arrowAfter`, `star`, `trophy` em `src/ui/tv.ts`); nada de ›, ▼ ou ★ escritos.
- **Do** pedir dois toques em toda ação que não dá para desfazer (APAGAR save, PULAR teste, REINICIAR COMBINE): o primeiro arma em vermelho, o segundo confirma.

### Don't:
- **Don't** usar cantos arredondados, vidro translúcido ou degradê com brilho.
- **Don't** usar vermelho fora do AO VIVO, de apagar e de derrota, nem verde fora de status.
- **Don't** colocar rótulo pequeno em cima de título; a informação vira selo na borda da placa.
- **Don't** usar emoji ou símbolo de texto como ícone; ícones são desenhados.
