# Calculadora da Fiel

Simulador de rebaixamento do Corinthians no Brasileirão. O torcedor marca V/E/D nos jogos
restantes e vê o risco de rebaixamento, os pontos projetados e a distância até o corte.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # modelo de risco, cenários e estado
npm run build
```

## Como o percentual funciona

O risco é a **probabilidade de terminar entre os 4 últimos**, estimada por simulação
(`src/lib/simulacao.js`): o campeonato inteiro é sorteado 20 mil vezes.

- A força de ataque e de defesa de cada time vem dos gols da própria tabela (com
  encolhimento para a média, porque 29 jogos é pouco).
- Gols esperados do mandante = média da liga × fator de mando (1,3) × ataque dele ×
  defesa do visitante (e o inverso para o visitante). Cada jogo restante é sorteado por Poisson.
- Os jogos que o usuário marca (V/E/D) viram resultado fixo, com placar sorteado dentro daquele resultado.
- A tabela final usa os critérios da CBF (pontos, vitórias, saldo, gols pró).
- Risco = fração das simulações em que o Corinthians termina de 17º a 20º. A projeção é a
  média de pontos finais, e o corte é a mediana dos pontos do 16º colocado.

Os sorteios são determinísticos (mesma entrada, mesmo percentual) e, ao marcar um jogo,
só muda o que essa marcação muda. **Limites:** o modelo não sabe de lesões, técnico novo
nem momento recente, e não usa confronto direto como desempate. É uma estimativa, não uma certeza.

Faixas: abaixo de 10% = situação confortável; 10% a 40% = risco moderado; 40% ou mais = zona de perigo.

## Dados reais (atualizados sozinhos)

`public/estado.json` guarda a tabela dos 20 times, os jogos que faltam na liga, os resultados
já encerrados do Corinthians e a posição no fim da última rodada. Jogo com resultado
preenchido fica **travado** no app e fora das marcações.

Uma tarefa diária coleta os placares na web e roda `scripts/aplicar-resultados.mjs`, que faz
as contas, trava o resultado do Corinthians e só grava se tudo fechar (tabela calculada =
tabela da fonte, rodada realmente terminada, posição coerente). Depois valida
(`npm run validar:estado`), testa e publica. Histórico: `docs/atualizacoes-estado.md`.

`src/lib/estado-embutido.json` é uma cópia de `public/estado.json` usada se o arquivo não
carregar; é sincronizada sozinha antes de `dev`, `build` e `test`.

Cenários otimista/pessimista usam os últimos 5 confrontos com cada rival (`src/lib/h2h.js`,
fonte: ogol.com.br).

## Publicação

GitHub Pages via `.github/workflows/pages.yml`: todo push na `main` valida, testa, gera o
build e publica. Se `estado.json` for inválido ou um teste falhar, nada é publicado.
