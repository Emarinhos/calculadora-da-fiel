import test from 'node:test';
import assert from 'node:assert';
import { ESTADO_EMBUTIDO, jogosDoApp } from './estado.js';
import { analisar } from './analise.js';
import { estadoAposR30, marcarTodos } from './_fixtures.js';

const base = jogosDoApp(ESTADO_EMBUTIDO);
const marcar = (games, marcas) => games.map((g, i) => (marcas[i] ? { ...g, result: marcas[i] } : g));

test('sem marcações: o placar do cenário é a tabela (32)', () => {
  const a = analisar(ESTADO_EMBUTIDO, base);
  assert.strictEqual(a.pontosMarcados, 0);
  assert.strictEqual(a.jogosMarcados, 0);
  assert.strictEqual(a.pontosComMarcas, 32);
});

test('empate soma 1 e vitória soma 3 aos pontos atuais; derrota soma 0', () => {
  assert.strictEqual(analisar(ESTADO_EMBUTIDO, marcar(base, { 0: 'E' })).pontosComMarcas, 33);
  assert.strictEqual(analisar(ESTADO_EMBUTIDO, marcar(base, { 0: 'V' })).pontosComMarcas, 35);
  assert.strictEqual(analisar(ESTADO_EMBUTIDO, marcar(base, { 0: 'D' })).pontosComMarcas, 32);
});

test('marcações se acumulam: V + E + D + V = 7 pontos sobre os 32', () => {
  const a = analisar(ESTADO_EMBUTIDO, marcar(base, { 0: 'V', 1: 'E', 2: 'D', 3: 'V' }));
  assert.strictEqual(a.jogosMarcados, 4);
  assert.strictEqual(a.pontosMarcados, 7);
  assert.strictEqual(a.pontosComMarcas, 39);
});

test('com todos os jogos marcados, o placar do cenário é igual à projeção', () => {
  for (const r of ['V', 'E', 'D']) {
    const a = analisar(ESTADO_EMBUTIDO, marcarTodos(base, r));
    assert.strictEqual(a.jogosMarcados, 9);
    assert.strictEqual(a.pontosComMarcas, Math.round(a.projecao), `todos ${r}`);
  }
});

test('a projeção nunca fica abaixo do placar do cenário (marcas já são pontos garantidos nele)', () => {
  const a = analisar(ESTADO_EMBUTIDO, marcar(base, { 0: 'E', 4: 'V' }));
  assert(a.projecao >= a.pontosComMarcas);
});

test('depois de jogos reais travados, a soma parte dos pontos novos da tabela', () => {
  const e = estadoAposR30(); // 35 pts
  const jogos = jogosDoApp(e);
  assert.strictEqual(analisar(e, jogos).pontosComMarcas, 35);
  const a = analisar(e, jogos.map((g, i) => (i === 1 ? { ...g, result: 'E' } : g)));
  assert.strictEqual(a.pontosMarcados, 1);
  assert.strictEqual(a.pontosComMarcas, 36);
  // o jogo travado (V real) não conta como marcação do usuário
  assert.strictEqual(a.jogosMarcados, 1);
});
