import test from 'node:test';
import assert from 'node:assert';
import { ESTADO_EMBUTIDO, jogosDoApp } from './estado.js';
import { analisar, riskLevel, formatDistanciaLabel, formatarRisco, fixturesDoClube } from './analise.js';
import { estadoAposR30, marcarTodos } from './_fixtures.js';

const jogosBase = jogosDoApp(ESTADO_EMBUTIDO);
const marcarUm = (games, i, resultado) => games.map((g, k) => (k === i ? { ...g, result: resultado } : g));

test('riskLevel: faixas de risco real', () => {
  assert.strictEqual(riskLevel(3).level, 'safe');
  assert.strictEqual(riskLevel(9.9).level, 'safe');
  assert.strictEqual(riskLevel(10).level, 'warn');
  assert.strictEqual(riskLevel(29).level, 'warn');
  assert.strictEqual(riskLevel(40).level, 'danger');
  assert.strictEqual(riskLevel(90).level, 'danger');
});

test('formatDistanciaLabel: concordância', () => {
  assert.strictEqual(formatDistanciaLabel(1, 'abaixo'), 'falta 1 pt');
  assert.strictEqual(formatDistanciaLabel(3, 'abaixo'), 'faltam 3 pts para o corte');
  assert.strictEqual(formatDistanciaLabel(1, 'acima'), '1 pt de folga');
  assert.strictEqual(formatDistanciaLabel(5, 'acima'), '5 pts de folga');
  assert.strictEqual(formatDistanciaLabel(0, 'exato'), 'no corte de segurança');
});

test('formatarRisco evita falsa precisão nos extremos', () => {
  assert.strictEqual(formatarRisco(0.2), '<1');
  assert.strictEqual(formatarRisco(29.4), '29');
  assert.strictEqual(formatarRisco(29.6), '30');
  assert.strictEqual(formatarRisco(99.6), '>99');
});

test('fixturesDoClube: 9 jogos do Corinthians em ordem de rodada', () => {
  const idx = fixturesDoClube(ESTADO_EMBUTIDO);
  assert.strictEqual(idx.length, 9);
  const rodadas = idx.map((i) => ESTADO_EMBUTIDO.liga.jogos[i].rodada);
  assert.deepStrictEqual(rodadas, [30, 31, 32, 33, 34, 35, 36, 37, 38]);
});

test('analisar: baseline coerente (risco, projeção, corte, em disputa)', () => {
  const a = analisar(ESTADO_EMBUTIDO, jogosBase);
  assert(a.risco > 15 && a.risco < 45, `risco ${a.risco}`);
  assert.strictEqual(a.emDisputa, 27);
  assert(Number.isInteger(a.corte));
  assert(a.projecao > 38 && a.projecao < 48);
  assert(a.pontosConfortavel > a.corte - 3 && a.pontosConfortavel < 50, `confortável ${a.pontosConfortavel}`);
});

test('marcar o 1º jogo aberto como V/D mexe no risco na direção certa', () => {
  const base = analisar(ESTADO_EMBUTIDO, jogosBase).risco;
  const v = analisar(ESTADO_EMBUTIDO, marcarUm(jogosBase, 0, 'V')).risco;
  const d = analisar(ESTADO_EMBUTIDO, marcarUm(jogosBase, 0, 'D')).risco;
  assert(v < base && base < d, `${v} < ${base} < ${d}`);
});

test('marcar jogos diferentes dá resultados diferentes (cada marcação vai para o jogo certo)', () => {
  const r0 = analisar(ESTADO_EMBUTIDO, marcarUm(jogosBase, 0, 'V')).risco;
  const r1 = analisar(ESTADO_EMBUTIDO, marcarUm(jogosBase, 1, 'V')).risco;
  assert.notStrictEqual(r0, r1);
});

test('tudo V = projeção 59; tudo D = 32', () => {
  assert(Math.abs(analisar(ESTADO_EMBUTIDO, marcarTodos(jogosBase, 'V')).projecao - 59) < 1e-9);
  assert(Math.abs(analisar(ESTADO_EMBUTIDO, marcarTodos(jogosBase, 'D')).projecao - 32) < 1e-9);
});

test('jogo travado sai da conta: depois de uma vitória real o risco cai e há 8 jogos em disputa', () => {
  const antes = analisar(ESTADO_EMBUTIDO, jogosBase);
  const e = estadoAposR30();
  const depois = analisar(e, jogosDoApp(e));
  assert.strictEqual(depois.emDisputa, 24);
  assert(depois.risco < antes.risco, `${depois.risco} < ${antes.risco}`);
  // o jogo travado não é marcável: marcar os abertos com V leva a 35 + 24 = 59 pts
  assert(Math.abs(analisar(e, marcarTodos(jogosDoApp(e), 'V')).projecao - 59) < 1e-9);
});

test('distância até o corte usa a projeção e o corte simulados', () => {
  const a = analisar(ESTADO_EMBUTIDO, jogosBase);
  const diff = Math.round(Math.abs(a.projecao - a.corte));
  assert.strictEqual(a.distancia.pontos, diff);
  assert.strictEqual(a.distancia.situacao, diff === 0 ? 'exato' : a.projecao < a.corte ? 'abaixo' : 'acima');
});
