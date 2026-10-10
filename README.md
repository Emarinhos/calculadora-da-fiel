# Calculadora da Fiel

Simulador de rebaixamento do Corinthians no Brasileirão 2026. O torcedor marca vitória, empate ou
derrota nos jogos que faltam e vê, na hora, o **risco real de rebaixamento**, os pontos projetados
e a distância até o corte.

**No ar:** https://emarinhos.github.io/calculadora-da-fiel/ (GitHub Pages, atualizado a cada push na `main`).

## O que o app faz

- **Risco de rebaixamento em %**: probabilidade de o Corinthians terminar entre os 4 últimos,
  calculada por uma simulação do campeonato inteiro (ver [Como o percentual funciona](#como-o-percentual-funciona)).
  Faixas: abaixo de 10% *situação confortável*; de 10% a 40% *risco moderado*; 40% ou mais *zona de perigo*
  (o vermelho do brasão só aparece nessa faixa). Um carimbo inclinado mostra a faixa.
- **Marcar V/E/D** em cada jogo restante. Clicar de novo no mesmo botão desmarca.
- **Contador de pontos**: `pontos da tabela + pontos das suas marcações → projetados`
  (vitória 3, empate 1, derrota 0). Uma legenda mostra a conta, por exemplo
  "32 na tabela + 5 dos 3 jogos marcados = 37 pts". Os jogos sem marcação entram pelo que o modelo espera.
- **Em disputa**: pontos que ainda podem ser feitos (3 por jogo aberto), com quantos jogos e pontos
  você já marcou.
- **Para risco abaixo de 10%**: total de pontos finais necessário (calculado das simulações) e quantos
  faltam a partir do seu cenário ("faltam 12 de 27"). Com todos os jogos já marcados mostra "já garantido"
  ou "fora de alcance", nunca uma meta impossível.
- **Lacuna até o corte**, desenhada numa escala: zona de rebaixamento hachurada, linha vermelha do corte
  (mediana do 16º colocado nas simulações) e marcador da projeção.
- **Cenários** (botões): otimista, pessimista e realista (ver [Cenários](#cenários)). Os botões ficam
  vazados e **só ficam pretos quando aquele cenário está de fato marcado nos jogos**: mudar um jogo à mão
  apaga o destaque, e refazer o cenário exato à mão o acende de novo. O estado é exposto em `aria-pressed`.
- **Resetar**: no topo e, no celular, também no rodapé fixo (desabilitado enquanto não há marcações).
- **Rodapé fixo (celular)**: pontos, projeção, risco e variação em pp ficam visíveis enquanto se rola pelos jogos.
- **Celular enxuto**: abaixo de 1024 px as legendas são reduzidas ao essencial e **nenhuma fonte é declarada**
  (sem "ogol.com.br", sem "Listras = risco", sem a explicação das simulações nem a dos cenários). Só ficam
  linhas curtas, como "16º após a rodada 29 · corte 43 pts", "Com 3 jogos marcados" e "32 na tabela + 5 pts
  marcados". No desktop as legendas completas e as fontes continuam. O aviso de "dados embutidos" aparece nos dois.
- **Carimbo sem sobreposição**: o carimbo da faixa de risco sobe só sobre o número; a legenda do percentual
  vem sempre abaixo dele, então os dois nunca se encostam (testado em larguras de 320 a 430 px e nas três faixas).
- **Cada jogo (ingresso)**: rodada, casa/fora, adversário, **forma recente** contra ele (últimos
  confrontos, do mais novo ao mais antigo) e **data, horário, TV e streaming** da transmissão.
- **Jogo encerrado**: aparece travado ("Encerrado 1×0", botões desabilitados). O resultado real não pode
  ser alterado nem entra nas marcações.
- **Últimas notícias**: no desktop, um bloco "Últimas notícias" (5 mais recentes) acima da lista de confrontos;
  no celular, um letreiro que corre no rodapé, acima da barra fixa, como painel de bolsa (pausa ao tocar; sem
  animação se o aparelho pedir menos movimento). Cada item abre a matéria ou o post original em outra aba.
  Fontes: feeds RSS do ge (Corinthians) e do Meu Timão, atualizados a cada 2 horas pelo GitHub Actions (`.github/workflows/noticias.yml`), sem depender do Claude aberto. O bloco some se não houver notícias.
- **Dados reais atualizados sozinhos** (ver [Dados reais](#dados-reais-e-atualização-automática)).
- **Identidade visual** própria: Fjalla One em versalete, preto e creme, escudo do clube ao lado do título,
  e as **listras da camisa no topo cuja espessura acompanha o risco** (mais preto = mais perigo).

## Rodar e testar

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # gera dist/
npm run preview          # serve o build
npm run lint             # oxlint
npm test                 # testes unitários do modelo, estado, agenda e cenários
npm run validar:estado   # valida public/estado.json
```

`predev`, `prebuild` e `pretest` rodam `scripts/sync-embutido.mjs` sozinhos (ver abaixo).
Os testes de navegador (Playwright) usados no desenvolvimento não fazem parte do repositório.

## Como o percentual funciona

O risco é a **probabilidade de terminar entre os 4 últimos**, estimada por simulação
(`src/lib/simulacao.js`): o campeonato inteiro é sorteado **20 mil vezes** a partir da tabela atual
dos 20 times e dos jogos que faltam na liga.

- A força de ataque e de defesa de cada time vem dos gols da própria tabela (gols por jogo),
  com encolhimento em direção à média da liga (equivale a 10 jogos de confiança, porque ~29 jogos é pouco).
- Gols esperados do mandante = média da liga × fator de mando (1,3) × ataque dele × defesa do visitante
  (e o inverso para o visitante). Cada jogo restante é sorteado por distribuição de Poisson.
- Os jogos que o usuário marca viram resultado fixo, com o placar sorteado dentro daquele resultado.
- A tabela final usa os critérios da CBF (pontos, vitórias, saldo de gols, gols pró).
- **Risco** = fração das simulações em que o Corinthians termina de 17º a 20º.
  **Projeção** = média dos pontos finais. **Corte** = mediana dos pontos do 16º colocado.

Os sorteios são determinísticos (mesma entrada, mesmo percentual) e, ao marcar um jogo, só muda o que
essa marcação muda. Simular qualquer clube dá riscos que somam exatamente 4 rebaixados (testado).

**Importante:** o risco mostrado depois de marcar jogos é *condicional a eles*. Por isso um cenário com
todos os jogos marcados dá um risco bem menor que o inicial: o valor inicial inclui a incerteza dos
próprios jogos do Corinthians.

**Limites:** o modelo não sabe de lesões, técnico novo nem momento recente, e não usa confronto direto como
desempate. É uma estimativa, não uma certeza.

> Até o commit `b99acc0` o percentual vinha de uma curva logística em torno de um corte fixo de 45 pontos
> (74,5%). Ela foi substituída por esta simulação (hoje ~29%). Os scripts `.cjs` da raiz ainda são dessa fase.

## Cenários

- **Otimista / pessimista:** melhor e pior resultado dos **últimos 5 confrontos** com cada rival, numa janela
  de até 5 anos (`src/lib/cenarios.js`, dados em `src/lib/h2h.js`, fonte ogol.com.br). Otimista: V se o
  Corinthians venceu ao menos um desses jogos, senão E. Pessimista: D se perdeu ao menos um, senão E.
  Rival sem histórico na janela fica sem marcação.
- **Realista:** o resultado mais provável de cada jogo pelo mesmo modelo da simulação, escolhendo a
  combinação mais provável que soma **exatamente os pontos projetados** (`cenarioRealista` em
  `src/lib/analise.js`; programação dinâmica, com teste de força bruta).

## Dados reais e atualização automática

Tudo vem de `public/estado.json` (versão 2). Jogo com resultado preenchido fica **travado** no app.

| Campo | O que é |
|---|---|
| `pontos`, `jogosDisputados` | tabela do Corinthians, já incluindo os jogos travados |
| `base` | pontos e jogos disputados antes do primeiro jogo da lista `jogos` |
| `jogos` | jogos do Corinthians; `resultado` (V/E/D) e `placar` preenchidos = encerrado e travado |
| `posicao`, `posicaoRodada` | posição na tabela no **fim** da última rodada registrada |
| `liga.tabela` | classificação dos 20 times (pts, j, v, e, d, gp, gc) |
| `liga.jogos` | todos os jogos que ainda faltam na liga, com `data`, `hora`, `tv`, `streaming` e `tvConsultadaEm` |
| `historico` | posição e pontos a cada rodada registrada |
| `noticias` | (opcional) até 12 itens `{ titulo, fonte, url, data }`, só recentes (até 7 dias); guarda título e link, nunca o texto |

`src/lib/estado.js` valida tudo (contas da tabela, 38 jogos por time, coerência com os jogos do Corinthians,
ordem das rodadas). Se o arquivo falhar ou for inválido, o app usa a cópia embutida
`src/lib/estado-embutido.json` e avisa na tela. Essa cópia é gerada de `public/estado.json` por
`scripts/sync-embutido.mjs` antes de `dev`, `build` e `test`. Não edite a cópia à mão.

### A tarefa diária

Uma tarefa agendada do Claude Code (id `atualizar-estado-corinthians`, **todos os dias às 8h**, roda enquanto
o app do Claude estiver aberto; se estiver fechado, roda na próxima abertura) faz três coisas:

1. **Resultados**: coleta os placares dos jogos encerrados e trava o resultado do Corinthians
   (o do Corinthians exige duas fontes). No dia seguinte ao jogo.
2. **Posição**: só registrada **no fim de cada rodada**, quando todos os jogos dela terminaram
   (na prática, na manhã seguinte ao último jogo).
3. **Transmissão**: horário, TV e streaming são consultados **exatamente um dia antes de cada jogo do
   Corinthians**. Quem decide o que consultar hoje é o código (`node scripts/transmissao-do-dia.mjs`,
   regra em `src/lib/agenda.js`), não o agente. Se a consulta do dia anterior não confirmar, há um reforço
   no dia do jogo. Até lá a TV aparece na tela como "a confirmar". Remarcações de data entram sem marcar a
   transmissão como confirmada.

O agente só **coleta** dados. Quem faz as contas é `scripts/aplicar-resultados.mjs`, que atualiza tabela,
jogos restantes e o jogo travado, e **só grava se tudo fechar**: o jogo precisa estar entre os restantes,
a tabela calculada precisa bater com a da fonte (pontos, jogos e gols), a rodada precisa ter terminado
(para a posição), a posição informada precisa bater com a calculada pela tabela e o estado final precisa
ser válido. Depois a tarefa valida (`npm run validar:estado`), roda os testes, gera o build e faz commit
e push só de `public/estado.json`, `src/lib/estado-embutido.json` e `docs/atualizacoes-estado.md`.
O push dispara a publicação.

Cada execução que muda algo deixa uma linha em `docs/atualizacoes-estado.md` (o arquivo é criado na
primeira atualização) e guarda cópia de segurança em `.backup-estado/` (não versionada).

Calendário previsto da posição (jogos pelo calendário do ogol, sujeito a remarcação): R30 em 13/10,
R31 em 20/10, R32 em 27/10, R33 em 31/10, R34 em 07/11, R35 em 19/11, R36 em 21/11, R37 em 28/11 e
R38 em 03/12.

### Notícias (a cada 2 horas, sem depender do Claude)

O workflow `.github/workflows/noticias.yml` roda **a cada 2 horas** (cron `17 */2 * * *`, em UTC) nos servidores
do GitHub, e também sob demanda (aba Actions → "Atualizar notícias" → Run workflow).

1. `scripts/atualizar-noticias.mjs` lê o RSS do ge (`ge.globo.com/rss/ge/futebol/times/corinthians/`, data tirada da
   URL da matéria) e o RSS do Meu Timão (`www.meutimao.com.br/feed`, data do `pubDate` no horário de Brasília),
   pega até 8 itens de cada, junta com as notícias já gravadas, remove repetidas (mesmo link) e as com mais de
   7 dias, ordena da mais nova para a mais antiga e guarda no máximo 12 em `noticias`.
2. O estado inteiro é validado antes de gravar; se ficaria inválido, nada é gravado.
3. Se `public/estado.json` mudou, o workflow faz commit só dele e de `src/lib/estado-embutido.json` e chama o
   `pages.yml` (push feito com o `GITHUB_TOKEN` não dispara outros workflows, por isso o deploy é chamado de propósito).
   Se não houve notícia nova, termina sem commit e sem republicar.
4. Se um feed falhar (ex.: bloqueio anti-robô do Meu Timão), o script avisa no log e segue com o outro e com o
   que já estava gravado.

A notícia chega ao site em até 2 horas depois de sair; quem está com o app aberto vê em até mais 30 minutos
(intervalo de recarga do `estado.json`). Guardamos só título curto, fonte, data e o link original, nunca o texto.
O script ainda aceita um arquivo JSON com posts do X (`node scripts/atualizar-noticias.mjs posts.json`), mas isso só
vale rodando local: o X exige navegador e não é usado no agendamento.

## Estrutura do projeto

```
public/estado.json            dados reais (fonte da verdade)
src/App.jsx                   tela
src/assets/escudo.png         escudo (fundo transparente)
src/lib/simulacao.js          Monte Carlo (Poisson), probabilidades por jogo
src/lib/analise.js            risco, faixas, corte, cenário realista, soma das marcações
src/lib/cenarios.js, h2h.js   cenários otimista/pessimista e histórico de confrontos
src/lib/estado.js             validação e carga do estado
src/lib/noticias.js           notícias: mesclar, validar, título curto, notícia por adversário
src/lib/aplicar.js            aplica resultados, posição e agenda (funções puras)
src/lib/agenda.js             gatilho da transmissão (um dia antes)
src/lib/estado-embutido.json  cópia de public/estado.json (gerada)
scripts/aplicar-resultados.mjs  grava resultados/posição/agenda com todas as conferências
scripts/transmissao-do-dia.mjs  quais jogos têm a transmissão para consultar hoje
scripts/atualizar-noticias.mjs  grava `noticias` (RSS do ge e do Meu Timão; posts do X opcionais em JSON)
scripts/validar-estado.mjs      valida public/estado.json
scripts/sync-embutido.mjs       copia o estado para a cópia embutida
.github/workflows/pages.yml     validação, testes, build e publicação
.github/workflows/noticias.yml  a cada 2 h: atualiza as notícias, faz commit e chama o deploy
```

### Testes (`npm test`, mais de 80 testes em `src/lib/`)

| Arquivo | O que cobre |
|---|---|
| `simulacao.test.js` | determinismo, riscos somando 4 rebaixados, ordem sensata, marcações respeitadas, desempenho |
| `analise.test.js` | faixas de risco, textos, corte, projeção, jogo travado fora da conta |
| `soma.test.js` | soma das marcações ao placar (V=3, E=1, D=0) |
| `realista.test.js` | cenário realista (força bruta), probabilidades por jogo, agenda |
| `cenarios.test.js` | últimos 5 confrontos, janela de 5 anos, cenários otimista/pessimista |
| `estado.test.js` | validação do estado e da liga, carga com falha de arquivo |
| `aplicar.test.js` | aplicação de resultados, posição, agenda e conferência com a fonte |
| `noticias.test.js` | mesclar/recentes/repetidas, validação, RSS do ge e do Meu Timão, posts do X, notícia por adversário |
| `agenda.test.js` | gatilho de um dia antes, reforço, remarcação |
| `_fixtures.js` | apoio: uma rodada completa de resultados para os testes |

Os arquivos `generate-table.cjs`, `screenshot.cjs`, `test-glow.cjs` e `validate-fixes.cjs`, na raiz, são
**legados** da fase anterior (modelo logístico e gráfico em arco): não fazem parte do fluxo atual.

## Publicação

GitHub Pages via `.github/workflows/pages.yml`: todo push na `main` valida o estado, roda os testes,
gera o build e publica. Se `public/estado.json` for inválido ou um teste falhar, nada é publicado. O build usa
caminhos relativos (`base: './'`), então funciona em subpasta.

## Limitações conhecidas

- A atualização de resultados, posição e transmissão depende do app do Claude estar aberto às 8h. As notícias não: rodam no GitHub.
- As notícias dependem dos feeds do ge e do Meu Timão; o GitHub pode atrasar execuções agendadas em horário de pico
  e desativa o agendamento após 60 dias sem atividade no repositório (os commits automáticos contam como atividade).
- Posição só muda no fim da rodada; jogo adiado dentro de uma rodada atrasa a posição dela
  (hoje só o Chapecoense × Vasco, da R21, está adiado e não bloqueia as próximas).
- Emissoras e horários vêm do calendário do ogol (que lê logos de TV); só valem como confirmados depois
  da consulta de um dia antes.
- As marcações de V/E/D de cada pessoa ficam só no navegador dela (não são salvas nem compartilhadas).
- O modelo é uma estimativa: ver [Limites](#como-o-percentual-funciona).

## Histórico de mudanças

| Commit | Data | O que mudou |
|---|---|---|
| `b99acc0` | 09/10/2026 | Primeira versão publicada: identidade visual (Fjalla One em versalete, preto e creme, listras, ingressos, carimbo), cenários otimista/pessimista pelos últimos 5 confrontos, `public/estado.json` com jogos encerrados travados, validador, testes e publicação no GitHub Pages. |
| `84cbc89` | 09/10/2026 | **Risco real por simulação** do campeonato (substitui a curva logística), tabela de 20 times e 91 jogos restantes, corte e projeção simulados, blocos "em disputa" e "para risco abaixo de 10%", `scripts/aplicar-resultados.mjs` com conferência contra a tabela da fonte. |
| `2c5872d` | 09/10/2026 | Escudo no cabeçalho, remoção da etiqueta "Ao vivo", data/horário/TV em cada jogo, botão **Cenário realista**, aviso de que o risco com jogos marcados é condicional. |
| `a690aa7` | 09/10/2026 | **Transmissão consultada um dia antes do jogo** (`src/lib/agenda.js`, `scripts/transmissao-do-dia.mjs`), campo de streaming, "a confirmar" até a consulta, escudo recortado de verdade (fundo transparente, sem faixa cinza). |
| `ffad0c9` | 09/10/2026 | Botão **Resetar também no rodapé** do celular. |
| `e1540df` | 09/10/2026 | **Contador soma as marcações** ao placar atual (tabela + pontos marcados), legenda da conta, "em disputa" mostra os marcados. |
| `7d96d48` | 09/10/2026 | README completo: funções, dados, tarefa diária, estrutura, testes e histórico. |
| `25a8fe9` | 09/10/2026 | Botões de cenário só ficam pretos quando o cenário está de fato marcado (antes o Otimista era sempre preto); hover dos botões de ação passou a um tom leve para não parecer "marcado" no celular. |
| (este) | 09/10/2026 | Versão de celular com legendas reduzidas e sem fontes; carimbo de risco não sobrepõe mais a legenda do percentual; "para risco abaixo de 10%" passa a dizer "fora de alcance" quando todos os jogos já estão marcados. |
| `1eb8861` | 10/10/2026 | **Últimas notícias**: bloco acima dos confrontos no desktop e letreiro no rodapé do celular; campo `noticias` no estado, validado; `src/lib/noticias.js` e `scripts/atualizar-noticias.mjs`. |
| `7c195bd` | 10/10/2026 | **Notícias a cada 2 horas pelo GitHub Actions** (`noticias.yml`), sem depender do Claude aberto; feeds RSS do ge e do Meu Timão; commit só se mudou e deploy chamado no final. |
| (este) | 10/10/2026 | README: seção "Notícias", limitações e histórico. |
