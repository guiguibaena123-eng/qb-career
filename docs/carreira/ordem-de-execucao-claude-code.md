# QB Career — Ordem de execução no Claude Code

Arquivos necessários: `prompt-qb-career-final.md` (prompt único: carreira + Combine + Draft + menu) e a pasta `assets/` deste zip. O gameplay de partida você já tem no app, então não está incluído.

## Regra geral
- Uma etapa por vez. Só passe para a próxima quando a atual rodar sem erro e você aprovar.
- Ao fim de cada etapa, peça ao Claude Code: "rode o projeto, confira se não há erros no console e faça um commit".
- Cada prompt abaixo começa pedindo para ler os arquivos indicados.

---

## Etapa 0 — Preparação (você, 5 min)
1. Coloque `prompt-qb-career-final.md` na pasta do projeto.
2. Copie o conteúdo de `assets/` para `public/assets/` (pastas `layers/`, `draft_suit/`, `faces/`, `stadiums/`).
3. Abra o Claude Code na pasta.

## Etapa 1 — Base do projeto
> Leia `prompt-qb-career-final.md` (seções 0, 2 e 5). Crie o projeto Phaser 3 + TypeScript + Vite (390×844, retrato, fontes Press Start 2P e Silkscreen), a estrutura de pastas, o carregador de assets de `public/assets/` e o `PlayerSave` com persistência em localStorage. Implemente também o registro de times e logos (seção 2.1 do prompt de carreira) ligado aos times e logos que o app já tem. Sem telas ainda, só uma cena de teste.

Pronto quando: o projeto abre no navegador, o save grava e lê, e a cena de teste lista todos os times com seus logos.

## Etapa 2 — Jogador em camadas e rosto
> Leia `prompt-qb-career-final.md` seção 1. Implemente `PlayerBody` (camadas com tint e cache) e `PlayerFace` (sprites de rosto, pele, cabelo, barba). Cena de teste mostrando o jogador padrão com o kit Casa, e o rosto isolado.

Pronto quando: o jogador padrão aparece igual ao design (rosto 0, pele 5, cabelo 27, barba 6) e as camadas trocam sem erro.

## Etapa 3 — Criação da carreira
> Implemente as cenas Nome, Faculdade, Rosto, Pele, Cabelo, Barba e Confirmação (seção 3.1), todas ligadas ao `PlayerSave` e reutilizando `PlayerFace`/`PlayerBody`. Corrija o OVR com `calcOvr(attrs)`.

Pronto quando: o rosto escolhido aparece igual na Confirmação e o OVR é único.

## Etapa 4 — Combine
> Implemente CombineHub, os 4 testes e CombineResultado (seção 3.2). Os resultados atualizam os atributos e o OVR no save.

Pronto quando: os 4 testes funcionam, o resultado muda os atributos e salva.

## Etapa 5 — Draft
> Implemente DraftEspera, DraftTelefone, DraftAnuncio e DraftEscolhido (seção 3.3). A figura de terno segura a jersey do time com o rosto do save. Time padrão: Lobos, pick 8.

Pronto quando: o rosto do Draft é idêntico ao da criação e o fluxo termina no menu.

## Etapa 6 — Menu da carreira
> Implemente CarreiraMenu com as abas CLUBE, ELENCO, STATS, TABELA, NOTÍCIAS, CONTRATOS e JOGOS (seção 4 e 4.1). Use as miniaturas de `public/assets/stadiums/` conforme `data/teams.ts` (Lobos = Denver). Dados mockados.

Pronto quando: todas as abas abrem e o estádio muda conforme o time.

## Etapa 7 — PERSONALIZAR
> Implemente a aba PERSONALIZAR (seção 6): prévia fixa à esquerda, categorias à direita, kits travados Casa/Fora/Noite, opções editáveis gravadas em `save.look`, rosto dentro do capacete via `PlayerFace`.

Pronto quando: nenhuma cor de uniforme nem o número 12 são editáveis, e a prévia atualiza na hora.

## Etapa 8 — Ligar ao gameplay existente
> Implemente o MatchBridge conforme o prompt: o botão JOGAR do menu chama a cena de partida que já existe no app, passando o jogador salvo, o time e o adversário, e recebe o resultado de volta no save.

Pronto quando: dá para jogar uma partida a partir do menu e o resultado volta para a carreira.

## Etapa 9 — Testes e acabamento
> Rode os testes da seção 7 (600 looks aleatórios sem camada ausente), confira os critérios de aceite da seção 8 e meça o desempenho (meta: 60 fps). Liste o que falta.

## Etapa 10 — Celular (depois)
> Empacote com Capacitor, teste em um aparelho e troque o localStorage por Capacitor Preferences.

---

## Pontos de atenção
- **Estádios:** as fotos têm marcas retocadas, mas confirme os direitos de uso antes de publicar nas lojas.
- **Regra "nada de IA":** os sprites do jogador e as miniaturas dos estádios vêm do zip; todo o resto (UI, campo, ícones) é feito em código.
- **Se o Claude Code travar numa etapa:** peça para ele explicar o erro, corrigir e só então seguir. Não pule etapas.
