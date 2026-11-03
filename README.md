# QB Career 🏈

Jogo de futebol americano em **pixel art** onde você cria um quarterback e o leva do Combine ao título da **QFL**, uma liga fictícia com 32 times. Feito com **Phaser 3 + TypeScript + Vite**, roda no navegador (inclusive no celular) e funciona **offline**.

## Como é a carreira

1. **Criação**: escolha nome, rosto, cabelo, corpo e faculdade do seu QB.
2. **Combine**: quatro provas jogáveis (40 jardas, 3 cones, força e passe) que definem seus atributos e seu overall.
3. **Draft**: espere pela ligação, veja o anúncio e descubra qual time te escolheu.
4. **Menu da carreira**: estádio do seu time e abas de jogos, elenco, tabela da liga, estatísticas, prêmios e títulos, além de uma aba para personalizar o visual dentro do uniforme do time.
5. **Partidas**: jogue cada semana com pré-jogo, clima e jogos em horário nobre com placar exclusivo.
6. **Playoffs e QFL Bowl**: chave completa até a final, com comemoração do campeão.
7. **Temporadas sem fim**: seu QB evolui, renova contrato e acumula histórico, prêmios (MVP, OPOY, DPOY, novatos e outros) e títulos.

## A partida

- Jogadas de passe e de corrida com rotas e características próprias (Quick Game, Deep Shot, Corner Flood, Draw, Counter, Sweep...).
- Controle por joystick na tela: correr, mergulhar, juke e spin.
- Chutes com barra de precisão (PAT, field goal e punt) e decisão na 4ª descida.
- Clima que muda o jogo: chuva, neve e estádios cobertos.
- Três dificuldades: fácil, normal e difícil.
- Abertura com apresentação dos times, cara ou coroa e kickoff animado.
- **Partida Rápida**: escolha os times, o clima e a dificuldade e jogue sem carreira.

## Tudo feito em código

Os gráficos do jogo são desenhados por código: campo, arquibancadas, clima, interface e placares. O jogador é montado em camadas (corpo, rosto, uniforme e equipamentos), coloridas na hora conforme o time. As únicas imagens prontas são os sprites dessas camadas, os logos e as miniaturas dos estádios, que ficam em `public/`.

## Como rodar

Você precisa do [Node.js](https://nodejs.org/) instalado.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`). Para abrir no celular, use o endereço de rede mostrado, com o celular no mesmo Wi-Fi.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` | Gera a versão final em `dist/` |
| `npm run typecheck` | Verifica erros de tipo no TypeScript |

## Estrutura do projeto

```
src/
  scenes/       telas do jogo (menu, criação, Combine, Draft, carreira, partida)
  career/       liga, temporada, playoffs, prêmios, troféus e uniformes
  combine/      provas do Combine e pontuação
  draft/        lógica e arte do Draft
  player/       jogador em camadas e rosto
  systems/      motor da partida (IA, passe, corrida, tackle, clima, estádio...)
  ui/           botões, HUD, placares e painéis
  data/         times, faculdades e títulos
  state/        save do jogador
public/         sprites, logos, estádios, ícones e service worker
docs/           planejamento do projeto
graphify-out/   mapa do código (abra graph.html no navegador)
```

O progresso fica salvo no próprio navegador (localStorage), com vários espaços de save.
