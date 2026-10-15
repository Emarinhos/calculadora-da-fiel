# Calculadora da Fiel

Simulador de rebaixamento do Corinthians no Brasileirão 2026. O torcedor marca vitória, empate ou
derrota nos jogos que faltam e vê, na hora, o **risco real de rebaixamento**, os pontos projetados
e a distância até o corte.

**No ar:** https://emarinhos.github.io/calculadora-da-fiel/ (GitHub Pages, atualizado a cada push na `main`).

## O que o app faz

- **Três objetivos: rebaixamento, Sul-Americana e Libertadores.** Chips no topo do painel mostram a chance de cada um (o número
  cresce com a chance). **Arrastar o painel para a esquerda avança e para a direita volta** (celular); no desktop há botões ‹ ›
  e os próprios chips. O número grande, o texto da distância, o cartão de meta, a **régua** e a coluna da tabela seguem o objetivo:
  - **Régua:** escala única para todos os objetivos visíveis (do placar de hoje ao maior entre o máximo possível e os cortes),
    então ao trocar de objetivo só o corte se desloca. No rebaixamento: "Rebaixamento ↔ Segurança", zona hachurada à esquerda do
    corte. Nas vagas: "Fora da zona ↔ Sul-Americana/Libertadores", zona hachurada à direita do corte ("Vaga 49"). A parte acima do
    máximo possível aparece esmaecida. As marcações de V/E/D movem a projeção na régua e mudam a chance.
  - **Quando as vagas aparecem:** só com chance real (>= 0,1%). Hoje a Libertadores é inalcançável (corte ~62 pts, máximo possível
    do Corinthians 56) e some; reaparece se as marcações a tornarem possível. O rebaixamento sempre aparece.
  - **Regra de vagas usada (2026, CBF; confira no regulamento):** Libertadores = 1º–5º (4 em fase de grupos e 1 na preliminar);
    Sul-Americana = os 6 melhores seguintes, contada como "11º ou melhor". O campeão da Copa do Brasil, da Libertadores e da
    Sul-Americana pode deslocar essas faixas (efeito cascata); os limites estão em `PARAMETROS` (`vagaLibertadores`, `vagaSulamericana`).
  - **Meta de pontos:** rebaixamento = pontos para risco abaixo de 10%; vagas = pontos para 50% de chance da vaga.
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
- **Tema claro por padrão**: o app é sempre creme e preto, mesmo com o celular em modo escuro (a página declara
  `color-scheme: light`, então o navegador não inverte as cores). Um botão discreto (lua/sol) ao lado do Resetar, no topo
  e no rodapé do celular, liga o fundo escuro; a escolha fica salva no aparelho (`localStorage`, chave `tema`).
  O tema escuro troca as variáveis de cor em `src/index.css` (`:root[data-theme='dark']`).
  A página declara `color-scheme: only light` (no `<meta>` e no CSS) para o navegador **não escurecer por conta própria**
  (o escurecimento forçado do Samsung Internet repintava o app com cores erradas; o `only` é o que o impede nas versões
  recentes, a partir da 24.0.6.15). Só quando a pessoa liga o nosso botão a página declara `dark`.
- **Independente do aparelho**: a fonte Fjalla One vem do próprio app (`@fontsource/fjalla-one`, licença OFL), sem
  Google Fonts, então não falha com bloqueio de rede ou economia de dados. A página tem `translate="no"` (o tradutor
  automático não mexe em "Corinthians"). Com letra grande no Android (equivale a ~1,5× em tela de 250 px) não há rolagem
  lateral: o contador de pontos e o título usam `clamp()`, o cabeçalho quebra os botões para a linha de baixo e o
  texto do rodapé fixo é cortado com reticências em vez de empurrar os botões.
- **Resetar**: botão discreto com ícone de seta circular, ao lado do botão de tema, no topo e, no celular, também no rodapé fixo
  (no rodapé fica desabilitado enquanto não há marcações).
- **Ao vivo**: durante o jogo (do horário marcado até 130 minutos depois, em horário de Brasília) uma bolinha vermelha pisca
  ao lado da data e hora do ingresso; conferido a cada 30 segundos, sem animação se o aparelho pedir menos movimento.
- **Rodapé fixo (celular)**: pontos, projeção, risco e variação em pp ficam visíveis enquanto se rola pelos jogos.
- **Celular enxuto**: abaixo de 1024 px as legendas são reduzidas ao essencial e **nenhuma fonte é declarada**
  (sem "ogol.com.br", sem "Listras = risco", sem a explicação das simulações nem a dos cenários). Só ficam
  linhas curtas, como "16º após a rodada 29 · corte 43 pts", "Com 3 jogos marcados" e "32 na tabela + 5 pts
  marcados". No desktop as legendas completas e as fontes continuam. O aviso de "dados embutidos" aparece nos dois.
- **Carimbo sem sobreposição**: o carimbo da faixa de risco sobe só sobre o número; a legenda do percentual
  vem sempre abaixo dele, então os dois nunca se encostam (testado em larguras de 320 a 430 px e nas três faixas).
- **Cada jogo (ingresso)**: rodada, casa/fora, adversário, **forma recente** contra ele (últimos
  confrontos, do mais novo ao mais antigo) e **data, horário, TV e streaming** da transmissão.
- **Jogo encerrado**: aparece travado, com o placar na ordem do jogo ("Encerrado · Palmeiras 4×1 Corinthians") e o
  resultado real destacado nos botões, que ficam desabilitados. O resultado real não pode ser alterado nem entra nas marcações.
- **Jogo que já começou**: do apito inicial (data e hora de Brasília) em diante os botões de V/E/D ficam desabilitados, com o aviso
  "Em andamento · marcações encerradas" (ou "Aguardando resultado" depois da janela ao vivo) até o resultado real chegar. Os
  cenários não mexem nesse jogo, e uma marcação feita antes do apito continua valendo até lá.
- **Tabela do Brasileirão com risco de todos os clubes**: os 20 times, com posição (critérios da CBF), pontos, jogos, saldo,
  **risco de rebaixamento de cada clube** (barra + %) e uma etiqueta "Jogo R32 · fora" com o jogo que o Corinthians ainda faz
  contra aquele clube. A linha vermelha marca o corte do 16º e os 4 últimos têm uma borda vermelha. No desktop abre pelo botão
  "Ver tabela" ao lado de "Confrontos", acima da lista; no celular é a faixa da esquerda: arraste os jogos para a direita (ou use
  as abas Tabela | Jogos). O risco mostrado é o da situação atual, sem as marcações do usuário.
- **Últimas notícias**: no desktop, um bloco "Últimas notícias" (5 mais recentes) acima da lista de confrontos;
  no celular, um letreiro que corre no rodapé, acima da barra fixa, como painel de bolsa (pausa só enquanto o dedo segura; sem
  animação se o aparelho pedir menos movimento). Cada item abre a matéria ou o post original em outra aba.
  Fontes: feeds RSS do ge (Corinthians) e do Meu Timão, atualizados a cada 2 horas pelo GitHub Actions (`.github/workflows/noticias.yml`), sem depender do Claude aberto. O bloco some se não houver notícias.
- **Dados reais atualizados sozinhos** (ver [Dados reais](#dados-reais-e-atualização-automática)).
- **Identidade visual** própria: Fjalla One em versalete, preto e creme, escudo do clube ao lado do título,
  e as **listras da camisa no topo cuja espessura acompanha o risco** (mais preto = mais perigo; sem legenda).
  O tracejado do canhoto do ingresso é desenhado dentro do canhoto, na cor do fundo, então aparece nos dois temas.

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
| `liga.risco` | (opcional, formato 2) chances de cada clube (`rebaixamento`, `sulamericana`, `libertadores`) e a soma de jogos da tabela a que pertencem |
| `noticias` | (opcional) até 12 itens `{ titulo, fonte, url, data }`, só recentes (até 7 dias); guarda título e link, nunca o texto |

`src/lib/estado.js` valida tudo (contas da tabela, 38 jogos por time, coerência com os jogos do Corinthians,
ordem das rodadas). Se o arquivo falhar ou for inválido, o app usa a cópia embutida
`src/lib/estado-embutido.json` e avisa na tela. Essa cópia é gerada de `public/estado.json` por
`scripts/sync-embutido.mjs` antes de `dev`, `build` e `test`. Não edite a cópia à mão.

### Resultados logo depois do jogo (automático, sem depender do Claude)

O workflow `.github/workflows/resultados.yml` executa `scripts/atualizar-resultados.mjs`. A regra do gatilho
(`src/lib/resultados-auto.js`):

1. **Só age depois do jogo:** procura jogos cujo apito inicial foi há **105 minutos ou mais**. Se não há nenhum, termina na hora,
   sem gravar nada. Jogo adiado há mais de 14 dias sem resultado deixa de ser procurado.
2. **Placares pela ESPN** (`src/lib/espn.js`, API pública), que informa se o jogo **terminou** (`STATUS_FULL_TIME`); jogo em
   andamento, adiado ou cancelado é ignorado. **Reserva: ogol** (`src/lib/ogol.js`), que só entra se a ESPN falhar e espera 115 min,
   porque não avisa se o jogo acabou. **O ogol bloqueia os servidores do GitHub (HTTP 403)**; funciona rodando o script local.
3. **Jogo do Corinthians exige uma segunda fonte:** o mesmo placar numa notícia do ge ou do Meu Timão sobre o jogo. Sem isso, ele
   (e os jogos seguintes dele) esperam.
4. **Conferência total:** aplica os resultados (`aplicarResultados`) e compara a tabela calculada, conta a conta (pontos, jogos e
   gols dos 20 clubes), com a tabela da fonte (ESPN, ou ogol na reserva). Se divergir, não grava e tenta de novo.
5. **Posição só no fim da rodada:** quando todos os jogos da rodada terminaram e a posição calculada bate com a da fonte, registra
   `posicao` e `posicaoRodada`.
6. Recalcula as **chances de todos os clubes**, valida o estado, grava, anota uma linha em `docs/atualizacoes-estado.md`, faz commit e
   chama o deploy.
7. **Alerta:** se nenhuma fonte responde e há jogo encerrado há mais de 8 horas sem resultado, a execução falha de propósito (o
   GitHub manda e-mail). Fonte fora do ar por pouco tempo é só aviso, sem e-mail.

**Por que acompanha o jogo em vez de só agendar:** o GitHub dispara as execuções agendadas (`cron`) com muito atraso, na prática a
cada algumas horas e não a cada 20 minutos. Então, quando uma execução cai dentro da janela de um jogo (de 15 min antes do apito até
170 min depois), ela fica conferindo de 5 em 5 minutos até o resultado entrar, e ao fim de ~85 min chama a próxima execução se
ainda houver jogo na janela (`scripts/janela-de-jogo.mjs`). Se nenhuma execução começar durante a janela do jogo, o resultado espera
o próximo disparo do GitHub (algumas horas). O jeito de garantir o horário é um disparador externo (ver limitações).

Compartilha o grupo `estado` com o workflow de notícias, para os dois nunca gravarem ao mesmo tempo.

### Chances de todos os clubes (recalculadas a cada atualização da tabela)

O risco de cada clube sai da **mesma simulação** do risco do Corinthians (`src/lib/simulacao.js`, 20 mil sorteios do campeonato
inteiro), rodada uma vez por clube **fora do navegador** e gravada em `liga.risco` do `estado.json`
(`{ formato: 2, jogosDisputados, sims, clubes: { clube: { rebaixamento, sulamericana, libertadores } } }`). A mesma execução da
simulação devolve a chance e o corte (mediana dos pontos do 16º, 11º e 5º colocados) de cada objetivo. O app só lê e desenha: não simula nada extra, então a tela não fica mais lenta.

- `scripts/calcular-riscos.mjs` recalcula quando a tabela mudou (compara a soma de jogos disputados com a gravada) e não grava
  nada se já está em dia. A simulação é determinística, então tabela igual dá números iguais e nenhum commit à toa.
- Roda no `noticias.yml` (a cada 2 horas) e dentro de `scripts/aplicar-resultados.mjs`, logo que resultados novos mudam a tabela.
- Se a tabela mudar e o risco não for recalculado, o app não mostra número velho: a coluna fica "—" e o celular avisa "Risco em atualização".
- A posição, os pontos e os resultados continuam vindo da tarefa diária (ogol); o risco é consequência deles.

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

## Medição de uso

O site conta acessos com o **GoatCounter** (`emarinhos.goatcounter.com`): sem cookies, sem dados pessoais e sem aviso de consentimento.
O script fica em `index.html`; `src/lib/medir.js` registra cliques como eventos (`evento/...`): marcar jogo, os 3 cenários, resetar,
tema claro/escuro, abrir a tabela (desktop) e a aba da tabela (celular), e clique em notícia (bloco ou letreiro). Bloqueador de anúncios
ou falta de rede apenas desligam a medição; o app não depende dela. O painel mostra visitas, aparelho, navegador e origem.

## Estrutura do projeto

```
public/estado.json            dados reais (fonte da verdade)
src/App.jsx                   tela
src/assets/escudo.png         escudo (fundo transparente)
src/lib/simulacao.js          Monte Carlo (Poisson), probabilidades por jogo
src/lib/analise.js            risco, faixas, corte, cenário realista, soma das marcações
src/lib/cenarios.js, h2h.js   cenários otimista/pessimista e histórico de confrontos
src/lib/estado.js             validação e carga do estado
src/lib/liga.js                classificação, risco de cada clube e duelo restante com o Corinthians
src/TabelaLiga.jsx            tabela da liga na tela (coluna segue o objetivo)
src/Regua.jsx                 régua de pontos do objetivo
src/lib/espn.js                placares e tabela pela API da ESPN (fonte principal dos resultados)
src/lib/ogol.js                leitura do calendário e da tabela do ogol (reserva)
src/lib/resultados-auto.js    regras do gatilho de resultados (115 min, segunda fonte, rodada fechada)
src/lib/transmissao-ge.js      achar a matéria do jogo e extrair hora/TV/streaming
src/lib/noticias.js           notícias: mesclar, validar, título curto, notícia por adversário
src/lib/aplicar.js            aplica resultados, posição e agenda (funções puras)
src/lib/agenda.js             gatilho da transmissão (um dia antes)
src/lib/estado-embutido.json  cópia de public/estado.json (gerada)
scripts/aplicar-resultados.mjs  grava resultados/posição/agenda com todas as conferências
scripts/transmissao-do-dia.mjs  quais jogos têm a transmissão para consultar hoje
scripts/atualizar-resultados.mjs resultados, tabela, posição e chances logo após os jogos (ESPN, reserva ogol)
scripts/janela-de-jogo.mjs     diz se há jogo na janela de acompanhamento (resultados.yml)
scripts/calcular-riscos.mjs      grava o risco de todos os clubes em liga.risco
scripts/confirmar-transmissao.mjs  confirma hora/TV/streaming pela matéria "onde assistir" do ge
scripts/atualizar-noticias.mjs  grava `noticias` (RSS do ge e do Meu Timão; posts do X opcionais em JSON)
scripts/validar-estado.mjs      valida public/estado.json
scripts/sync-embutido.mjs       copia o estado para a cópia embutida
.github/workflows/pages.yml     validação, testes, build e publicação
.github/workflows/resultados.yml resultados, tabela, posição e chances; acompanha o jogo de 5 em 5 min dentro da janela
.github/workflows/noticias.yml  a cada 2 h: notícias + transmissão + riscos, commit só se mudou e chama o deploy
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
| `espn.test.js`, `ogol.test.js`, `resultados-auto.test.js` | leitura da ESPN e do ogol, janela do jogo, segunda fonte, rodada fechada |
| `objetivos.test.js` | três objetivos pela mesma simulação, cortes, pontos para a vaga, visibilidade das vagas, textos |
| `liga.test.js` | classificação e desempates, riscos (determinísticos, soma ~400%), risco vigente x velho, duelos, validação |
| `transmissao-ge.test.js` | matéria certa do jogo, horário, TV x streaming, apelidos do ge, gatilho |
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

- Resultados dependem da ESPN ter o placar e de uma notícia do ge ou do Meu Timão repetir o placar do Corinthians; se uma das
  fontes mudar o formato, o script não grava e o jogo espera (a linha de log da execução mostra o motivo).
- **O `cron` do GitHub não é pontual:** as execuções agendadas chegam a cada algumas horas. O acompanhamento dentro da janela do jogo
  compensa quando uma execução cai nela; para garantir o horário seria preciso um disparador externo (por exemplo, um agendador
  gratuito chamando a API do GitHub com um token só de Actions). Em repositório privado, o acompanhamento consome minutos de Actions. Notícias, transmissão,
  resultados e posição rodam no GitHub, sem o app do Claude.
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
| `0302014` | 09/10/2026 | Versão de celular com legendas reduzidas e sem fontes; carimbo de risco não sobrepõe mais a legenda do percentual; "para risco abaixo de 10%" passa a dizer "fora de alcance" quando todos os jogos já estão marcados. |
| `1eb8861` | 10/10/2026 | **Últimas notícias**: bloco acima dos confrontos no desktop e letreiro no rodapé do celular; campo `noticias` no estado, validado; `src/lib/noticias.js` e `scripts/atualizar-noticias.mjs`. |
| `7c195bd` | 10/10/2026 | **Notícias a cada 2 horas pelo GitHub Actions** (`noticias.yml`), sem depender do Claude aberto; feeds RSS do ge e do Meu Timão; commit só se mudou e deploy chamado no final. |
| `b421dd8` | 10/10/2026 | README: seção "Notícias", limitações e histórico. |
| `6a30f9b` | 10/10/2026 | Tema claro por padrão com botão para fundo escuro; letreiro não trava mais depois de tocar num link. |
| (este) | 10/10/2026 | Tema claro garantido em aparelhos com modo escuro forçado (`color-scheme: only light`), fonte hospedada no app, `translate="no"` e ajustes para letra grande no celular. |
| (este) | 11/10/2026 | Transmissão confirmada sozinha pelo GitHub (matéria "onde assistir" do ge, um dia antes e no dia do jogo); botão Resetar com ícone; selo da posição leva à tabela ao vivo do Google; legenda das listras removida; tracejado do ingresso volta a aparecer no tema escuro. |
| (este) | 11/10/2026 | **Tabela do Brasileirão** com risco de rebaixamento de todos os clubes e etiqueta do jogo restante contra o Corinthians (botão no desktop; faixa que se arrasta no celular); risco calculado fora do navegador e gravado em `liga.risco`. |
| (este) | 11/10/2026 | Bolinha vermelha piscando no jogo ao vivo; o selo da posição deixou de ser link para o Google (a tabela do app o substitui). |
| (este) | 12/10/2026 | Medição de uso com GoatCounter (acessos e cliques em funções, sem cookies). |
| (este) | 12/10/2026 | Rodada 30 aplicada (Palmeiras 4x1 Corinthians travado; 8 jogos restantes); jogo iniciado não aceita mais marcação; placar do jogo encerrado na ordem real; testes passam a usar uma foto congelada do estado (não quebram mais quando os dados reais mudam). |
| (este) | 12/10/2026 | **Resultados automáticos logo após os jogos** (`resultados.yml`, a cada 20 min nos horários de jogo): placar no ogol, segunda fonte para o Corinthians, conferência da tabela, posição no fim da rodada e riscos, sem depender do Claude. |
| (este) | 12/10/2026 | **Objetivos**: chances de rebaixamento, Sul-Americana e Libertadores (chips, arrastar o painel, régua e tabela por objetivo; vagas só aparecem com chance real); simulação passa a devolver chance e corte de cada objetivo e `liga.risco` ganha o formato 2. |
| (este) | 15/10/2026 | **Correção:** o ogol bloqueava os servidores do GitHub (HTTP 403) e a rotina de resultados falhava; agora a fonte principal é a ESPN (diz se o jogo terminou), com ogol de reserva, alerta só quando fica travada, e a execução acompanha o jogo de 5 em 5 minutos dentro da janela. Rodada 30 fechada (Corinthians em 16º). |
