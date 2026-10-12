import test from 'node:test';
import assert from 'node:assert';
import { validarEstado } from './estado.js';
import { ESTADO_EMBUTIDO } from './_fixtures.js';
import { classificacao, calcularRiscos, comRiscos, riscoVigente, proximoDuelo, linhasDaTabela, jogosDaTabela } from './liga.js';
import { estadoAposR30, clone } from './_fixtures.js';

const SIMS = 4000; // rápido nos testes; o app grava com 20 mil

test('classificação: 20 linhas, posições 1..20, ordem por pontos, vitórias, saldo e gols pró', () => {
  const c = classificacao(ESTADO_EMBUTIDO);
  assert.strictEqual(c.length, 20);
  assert.deepStrictEqual(c.map((t) => t.pos), Array.from({ length: 20 }, (_, i) => i + 1));
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1];
    const b = c[i];
    const ka = [a.pts, a.v, a.saldo, a.gp];
    const kb = [b.pts, b.v, b.saldo, b.gp];
    const cmp = ka.findIndex((x, j) => x !== kb[j]);
    assert.ok(cmp === -1 || ka[cmp] > kb[cmp], `${a.clube} deve vir antes de ${b.clube}`);
  }
});

test('desempate pela regra da CBF: pontos iguais, mais vitórias na frente', () => {
  const e = clone(ESTADO_EMBUTIDO);
  const [x, y] = e.liga.tabela.slice(0, 2);
  Object.assign(x, { pts: 40, v: 10, e: 10, d: 9, j: 29, gp: 30, gc: 30 });
  Object.assign(y, { pts: 40, v: 11, e: 7, d: 11, j: 29, gp: 30, gc: 30 });
  const c = classificacao(e);
  assert.ok(c.findIndex((t) => t.clube === y.clube) < c.findIndex((t) => t.clube === x.clube));
});

test('riscos: determinísticos, entre 0 e 100 e somam ~400% (4 rebaixados por temporada)', () => {
  const a = calcularRiscos(ESTADO_EMBUTIDO, { sims: SIMS });
  const b = calcularRiscos(ESTADO_EMBUTIDO, { sims: SIMS });
  assert.deepStrictEqual(a, b);
  const v = Object.values(a.clubes);
  assert.strictEqual(v.length, 20);
  assert.ok(v.every((x) => x >= 0 && x <= 100));
  const soma = v.reduce((s, x) => s + x, 0);
  assert.ok(Math.abs(soma - 400) < 1.5, `soma dos riscos = ${soma}`);
});

test('risco gravado vale só para a tabela em que foi calculado', () => {
  const e = comRiscos(ESTADO_EMBUTIDO, { sims: SIMS });
  assert.ok(riscoVigente(e));
  assert.ok(validarEstado(e).ok);
  const depois = estadoAposR30();
  depois.liga.risco = e.liga.risco; // risco da tabela antiga colado na tabela nova
  assert.strictEqual(riscoVigente(depois), false);
  assert.ok(jogosDaTabela(depois) > jogosDaTabela(e));
  const linhas = linhasDaTabela(depois);
  assert.ok(linhas.every((l) => l.risco === null)); // sem risco vigente, a tela não mostra número velho
});

test('validação recusa risco com clube faltando ou fora de 0 a 100', () => {
  const e = comRiscos(ESTADO_EMBUTIDO, { sims: SIMS });
  const a = clone(e); delete a.liga.risco.clubes.Flamengo;
  assert.strictEqual(validarEstado(a).ok, false);
  const b = clone(e); b.liga.risco.clubes.Flamengo = 120;
  assert.strictEqual(validarEstado(b).ok, false);
  const c = clone(e); c.liga.risco.clubes.Fantasma = 5;
  assert.strictEqual(validarEstado(c).ok, false);
});

test('duelo restante com o Corinthians: rodada e mando; clube sem jogo restante = null', () => {
  const e = ESTADO_EMBUTIDO;
  const restantes = e.liga.jogos.filter((g) => g.mandante === 'Corinthians' || g.visitante === 'Corinthians');
  const comDuelo = e.liga.tabela.filter((t) => t.clube !== 'Corinthians' && proximoDuelo(e, t.clube));
  assert.strictEqual(comDuelo.length, restantes.length); // cada rival aparece uma vez no returno
  const g = restantes[0];
  const rival = g.mandante === 'Corinthians' ? g.visitante : g.mandante;
  assert.deepStrictEqual(proximoDuelo(e, rival), { rodada: g.rodada, casa: g.mandante === 'Corinthians' });
  assert.strictEqual(proximoDuelo(e, 'Fantasma'), null);
});

test('linhas da tabela: Corinthians marcado, zona de rebaixamento nos 4 últimos', () => {
  const linhas = linhasDaTabela(comRiscos(ESTADO_EMBUTIDO, { sims: SIMS }));
  assert.strictEqual(linhas.filter((l) => l.eu).length, 1);
  assert.deepStrictEqual(linhas.filter((l) => l.zona).map((l) => l.pos), [17, 18, 19, 20]);
  assert.ok(linhas.every((l) => typeof l.risco === 'number'));
});
