---
version: 1
slug: "src-scenes-mainmenu-ts"
primary_target: "src/scenes/MainMenu.ts"
related_targets: ["src/scenes/CarreiraMenu.ts","src/scenes/CareerSlots.ts","src/scenes/CareerCreate.ts","src/scenes/PreJogo.ts"]
---

# Menus do QB Career (fora de campo)

Scope: menu inicial, Partida Rápida (confronto, detalhes, grade de times), Treino Livre, saves, criação do QB, menu da carreira (todas as abas) e pré-jogo. Mode: operate. Público geral no celular, retrato, uma mão. Tarefa principal: chegar ao jogo rápido; profundidade da carreira sob demanda. Restrições: Phaser canvas (não HTML), 390×844 lógico, offline, o jogo em campo não muda.

## Direction contract

THESIS: Os menus são a transmissão do jogo. Cada tela entra como um pacote gráfico de TV (placar no canto, tarjas, vinheta, telestrador) por cima da "imagem ao vivo" do estádio. Recusa o padrão do gênero: fundo azul de vidro com cartões arredondados empilhados e brilhos neon.

OWN-WORLD: Tinta de transmissão #0B0E14 sob a imagem do estádio escurecida, que pan lento. Placas brancas (#F3F5F7) com texto em tinta são o conteúdo principal; amarelo de primeira descida #FFC400 marca a seleção e o telestrador; vermelho AO VIVO #E0263C só para o ponto ao vivo e alertas; verde #2FBF62 só como cor de STATUS (vitória, nota alta, meta concluída), nunca decoração; as cores dos programas de horário nobre aparecem só como selo; as cores dos times entram como blocos chapados que seguram o logo. Cortes diagonais de 12° em toda placa, nenhum canto arredondado. Família Saira Condensed (500/700/800), caixa-alta, dois tamanhos por tela.

STORY: A pessoa abre e vê a chamada da transmissão com o estádio do seu time ao fundo. Entende em um olhar as três atrações (Partida Rápida, Carreira, Treino), toca numa tarja e a vinheta leva à próxima tela; escolhas ficam circuladas pelo telestrador e o placar no topo sempre diz onde ela está e leva de volta.

FIRST VIEWPORT: Placar fino no topo (ponto AO VIVO + QB CAREER + time da casa). Abertura do programa: bloco "QB" em placa amarela e "CAREER" branco enorme, cortados na diagonal, no terço de cima, sobre o estádio. Embaixo, tarjas empilhadas a toda largura: PARTIDA RÁPIDA (maior, bloco na cor do time com o confronto KC × BUF à direita), CARREIRA (com o resumo do save), TREINO LIVRE; dificuldade em três segmentos. Rodapé: faixa de notícias rolando.

FORM: Pacote gráfico de transmissão esportiva de TV; candidato 1 da minha lista (pick do usuário sobre a Prancheta sorteada); seed 1497a408.

SIGNATURE: Vinheta de transição: três faixas diagonais (amarelo, cor do time, tinta) varrem a tela em ~420ms e trocam a tela por baixo, em toda navegação. Telestrador: a escolha é circulada por um traço amarelo que se desenha. Movimento: tarjas entram deslizando da esquerda em cascata curta; nada quica.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
