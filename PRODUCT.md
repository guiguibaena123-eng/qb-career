# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Público geral, jogando no celular (em pé, uma mão, sessões curtas). Quem chega pelo link público do GitHub Pages não recebe explicação: os menus precisam ser entendidos de primeira, sem tutorial.

## Product Purpose

QB Career é um jogo de futebol americano para o navegador do celular. O jogador cria um quarterback e o leva do Combine e do Draft até o título da QFL, uma liga fictícia de 32 times, temporada após temporada. Também tem Partida Rápida (escolher times, uniformes, local, clima, horário, dificuldade e estádio) e Treino Livre (QB nos alvos, RB na corrida). Sucesso: a pessoa entra, entende os menus na hora e chega ao jogo rápido. A carreira tem profundidade (elenco, tabela, estatísticas, prêmios, títulos, notícias, contratos) para quem quer voltar várias vezes.

## Positioning

Carreira completa de um QB, feita à mão: tudo (campo, arquibancadas, clima, placares, interface) é desenhado por código, e os jogadores são montados em camadas e pintados com as cores do time na hora. Funciona offline e se instala como app (PWA).

## Operating Context

- Roda no navegador do celular, em retrato (390×844 lógico, Phaser com escala para caber), offline, instalável. Endereço público: https://guiguibaena123-eng.github.io/qb-career/
- O toque é a entrada principal (botões, joystick na partida). Não há teclado na maior parte das telas; a criação do QB abre o teclado do celular para digitar.
- Saves locais: até 3 carreiras (localStorage).

## Capabilities and Constraints

- Stack: Phaser 3 + TypeScript + Vite. As interfaces são objetos do Phaser (Graphics, Text, Container) num canvas, não HTML/CSS.
- Fontes empacotadas: Saira Condensed (menus) e Press Start 2P / Silkscreen (jogo em campo), via @fontsource.
- Assets reais: logos dos 32 times (3 tamanhos), fotos de estádios (pixelizadas por código), logo da liga e do QFL Bowl, sprites em camadas do jogador, miniaturas de arquibancada.
- Nomes de times e cidades remetem à NFL; a liga se chama QFL e os nomes dos times são fictícios.
- Escopo da repaginação (2026-11-04): menu inicial, Partida Rápida (confronto, detalhes, grade de times), Treino Livre, escolha de save, criação do QB, menu da carreira (todas as abas) e pré-jogo. Ampliado em 2026-11-05 (polimento): tela de carregamento, Combine (lista, instruções e resultados) e as quatro telas do Draft. Fora do escopo: o jogo em campo (e o placar dentro dos testes do Combine).

## Brand Commitments

- Nome: QB Career. Liga: QFL. Final: QFL Bowl.
- Texto da interface em português do Brasil.
- O usuário liberou trocar por completo o estilo visual dos menus (2026-11-04). Os jogadores em pixel art, os logos e o jogo em campo continuam como estão.

## Evidence on Hand

- Logos em `public/logos/`, estádios e arte da carreira em `public/assets/`, ícones do app em `public/icons/`.
- Dados reais do jogo: times e notas (overall, ataque, defesa, especiais), faculdades, títulos por time (`src/data/`).
- Não existem depoimentos, números de jogadores ou avaliações; não inventar.

## Product Principles

1. Primeira vez sem explicação: cada menu se explica sozinho para quem nunca jogou.
2. Chegar ao jogo rápido: o caminho mais comum (jogar a próxima partida) é sempre o mais curto e o mais visível.
3. Profundidade sob demanda: a carreira tem muita informação, que aparece quando a pessoa pede, sem lotar a tela.
4. Feito à mão: os detalhes mostram cuidado e as cores dos times dão vida à interface.

## Accessibility & Inclusion

Toque com uma mão no celular: alvos grandes e textos legíveis numa tela de 390 px de largura.
