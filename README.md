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

`src/lib/risk.js`: pontos projetados = pontos atuais + jogos marcados (V=3, E=1, D=0) +
jogos sem marcação pelo aproveitamento atual. O risco é uma curva logística em torno do
corte estimado (45 pts): `100 / (1 + e^(0,35 × (projeção − 45)))`, entre 0,5% e 99,5%.
Não considera força do adversário nem a tabela dos outros times.

## Dados reais (atualizados sozinhos)

`public/estado.json` guarda pontos, posição e os resultados já encerrados. Jogo com
resultado preenchido fica **travado** no app. Uma tarefa diária atualiza o arquivo:
resultados quando o jogo termina e posição só no fim de cada rodada. Antes de gravar,
valida com `npm run validar:estado`. Histórico de mudanças: `docs/atualizacoes-estado.md`.

Cenários otimista/pessimista usam os últimos 5 confrontos com cada rival (`src/lib/h2h.js`,
fonte: ogol.com.br).

## Publicação

GitHub Pages via `.github/workflows/pages.yml`: todo push na `main` valida, testa, gera o
build e publica. Se `estado.json` for inválido ou um teste falhar, nada é publicado.
