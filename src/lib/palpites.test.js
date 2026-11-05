import test from 'node:test';
import assert from 'node:assert';
import { ESTADO_EMBUTIDO } from './_fixtures.js';
import { calcularRiscos } from './liga.js';
import {
  chaveDoJogo, placarCompleto, rodadasRestantes, aplicarPalpites, ordenar, previsaoDoJogo,
  simularComPalpites, lerPalpites, salvarPalpites, CHAVE_LOCAL,
} from './palpites.js';

const { tabela, jogos } = ESTADO_EMBUTIDO.liga;
const SIMS = 3000;
const jogoDe = (clube) => jogos.find((g) => g.mandante === clube || g.visitante === clube);

test('placar só conta com os dois lados preenchidos com inteiros', () => {
  assert.ok(placarCompleto({ gm: 0, gv: 0 }));
  assert.ok(!placarCompleto({ gm: 1, gv: null }));
  assert.ok(!placarCompleto({ gm: -1, gv: 0 }));
  assert.ok(!placarCompleto({ gm: 1.5, gv: 0 }));
  assert.ok(!placarCompleto(undefined));
});

test('rodadas restantes em ordem e sem repetição', () => {
  const r = rodadasRestantes(jogos);
  assert.deepStrictEqual(r, [...r].sort((a, b) => a - b));
  assert.strictEqual(new Set(r).size, r.length);
});

test('aplicar palpite: vitória do mandante soma 3 pontos, gols e jogos; jogo sai dos restantes', () => {
  const g = jogos[0];
  const { tabela: nova, restantes, aplicados } = aplicarPalpites(tabela, jogos, { [chaveDoJogo(g)]: { gm: 3, gv: 1 } });
  const antes = (c) => tabela.find((t) => t.clube === c);
  const depois = (c) => nova.find((t) => t.clube === c);
  assert.strictEqual(aplicados, 1);
  assert.strictEqual(restantes.length, jogos.length - 1);
  assert.strictEqual(depois(g.mandante).pts, antes(g.mandante).pts + 3);
  assert.strictEqual(depois(g.mandante).v, antes(g.mandante).v + 1);
  assert.strictEqual(depois(g.mandante).gp, antes(g.mandante).gp + 3);
  assert.strictEqual(depois(g.visitante).pts, antes(g.visitante).pts);
  assert.strictEqual(depois(g.visitante).d, antes(g.visitante).d + 1);
  assert.strictEqual(depois(g.visitante).gc, antes(g.visitante).gc + 3);
  assert.strictEqual(depois(g.visitante).j, antes(g.visitante).j + 1);
  assert.strictEqual(antes(g.mandante).pts, tabela.find((t) => t.clube === g.mandante).pts, 'não altera a tabela original');
});

test('empate dá 1 ponto a cada; palpite incompleto não conta', () => {
  const a = jogos[0];
  const b = jogos.find((g) => ![a.mandante, a.visitante].includes(g.mandante) && ![a.mandante, a.visitante].includes(g.visitante));
  const { tabela: nova, aplicados } = aplicarPalpites(tabela, jogos, {
    [chaveDoJogo(a)]: { gm: 2, gv: 2 },
    [chaveDoJogo(b)]: { gm: 1, gv: null },
  });
  assert.strictEqual(aplicados, 1);
  assert.strictEqual(nova.find((t) => t.clube === a.mandante).pts, tabela.find((t) => t.clube === a.mandante).pts + 1);
  assert.strictEqual(nova.find((t) => t.clube === a.visitante).e, tabela.find((t) => t.clube === a.visitante).e + 1);
  assert.strictEqual(nova.find((t) => t.clube === b.mandante).pts, tabela.find((t) => t.clube === b.mandante).pts);
});

test('ordenar devolve 20 posições pela regra da CBF', () => {
  const o = ordenar(tabela);
  assert.deepStrictEqual(o.map((c) => c.pos), Array.from({ length: 20 }, (_, i) => i + 1));
});

test('previsão: probabilidades somam 1 e o placar mais provável é plausível', () => {
  const p = previsaoDoJogo(tabela, jogos[0]);
  assert.ok(Math.abs(p.casa + p.empate + p.fora - 1) < 1e-9);
  assert.ok(p.placar.gm <= 3 && p.placar.gv <= 3);
});

test('sem palpites, as chances batem com as gravadas pelo painel (mesma simulação)', () => {
  const r = simularComPalpites({ tabela, jogos, palpites: {}, sims: SIMS });
  const painel = calcularRiscos(ESTADO_EMBUTIDO, { sims: SIMS }).clubes;
  for (const l of r.linhas) {
    for (const k of ['rebaixamento', 'sulamericana', 'libertadores']) {
      assert.ok(Math.abs(l.chances[k] - painel[l.clube][k]) < 0.01, `${l.clube} ${k}: ${l.chances[k]} x ${painel[l.clube][k]}`);
    }
    assert.strictEqual(l.variacao, 0);
  }
  const soma = r.linhas.reduce((s, l) => s + l.chances.rebaixamento, 0);
  assert.ok(Math.abs(soma - 400) < 1e-6);
});

test('vitórias do Corinthians em todos os jogos derrubam o risco dele e o fazem subir na tabela', () => {
  const palpites = {};
  for (const g of jogos.filter((j) => j.mandante === 'Corinthians' || j.visitante === 'Corinthians')) {
    palpites[chaveDoJogo(g)] = g.mandante === 'Corinthians' ? { gm: 2, gv: 0 } : { gm: 0, gv: 2 };
  }
  const base = simularComPalpites({ tabela, jogos, palpites: {}, sims: SIMS }).linhas.find((l) => l.clube === 'Corinthians');
  const com = simularComPalpites({ tabela, jogos, palpites, sims: SIMS });
  const cor = com.linhas.find((l) => l.clube === 'Corinthians');
  assert.ok(cor.chances.rebaixamento < base.chances.rebaixamento);
  assert.ok(cor.variacao > 0);
  assert.strictEqual(com.aplicados, Object.keys(palpites).length);
  assert.ok(jogoDe('Corinthians'));
});

test('palpites salvos: ida e volta; lixo e campo vazio são descartados', () => {
  const mem = new Map();
  const armazenamento = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  salvarPalpites({ '32|A|B': { gm: 1, gv: 0 }, '32|C|D': { gm: null, gv: 2 } }, armazenamento);
  assert.deepStrictEqual(lerPalpites(armazenamento), { '32|A|B': { gm: 1, gv: 0 }, '32|C|D': { gm: null, gv: 2 } });
  mem.set(CHAVE_LOCAL, JSON.stringify({ x: { gm: 'a', gv: -3 }, y: 5 }));
  assert.deepStrictEqual(lerPalpites(armazenamento), {});
  mem.set(CHAVE_LOCAL, '{quebrado');
  assert.deepStrictEqual(lerPalpites(armazenamento), {});
  assert.deepStrictEqual(lerPalpites({ getItem: () => { throw new Error('bloqueado'); } }), {});
});
