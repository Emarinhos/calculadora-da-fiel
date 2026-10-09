import test from 'node:test';
import assert from 'node:assert';
import { ESTADO_EMBUTIDO } from './estado.js';
import { simular, forcas, pontosParaRisco, PARAMETROS } from './simulacao.js';

const { tabela, jogos } = ESTADO_EMBUTIDO.liga;
const indicesCorinthians = jogos.map((g, i) => [g, i]).filter(([g]) => g.mandante === 'Corinthians' || g.visitante === 'Corinthians').map(([, i]) => i);
const marcasTodas = (r) => Object.fromEntries(indicesCorinthians.map((i) => [i, r]));

test('simulação é determinística: mesmo input, mesmo percentual', () => {
  const a = simular({ tabela, jogos });
  const b = simular({ tabela, jogos });
  assert.strictEqual(a.risco, b.risco);
  assert.strictEqual(a.projecao, b.projecao);
});

test('os riscos dos 20 times somam 4 rebaixados (400%)', () => {
  const soma = tabela.reduce((s, t) => s + simular({ tabela, jogos, clube: t.clube, sims: 4000 }).risco, 0);
  assert(Math.abs(soma - 400) < 1e-6, `soma ${soma}`);
});

test('ordem sensata: lanterna quase certa, líder quase zero', () => {
  const r = (clube) => simular({ tabela, jogos, clube, sims: 6000 }).risco;
  assert(r('Chapecoense') > 95);
  assert(r('Flamengo') < 1);
  assert(r('Remo') > r('Grêmio'));
  assert(r('Grêmio') > r('Corinthians') || r('Internacional') > r('Corinthians'));
});

test('risco do Corinthians no estado atual fica em faixa plausível (15% a 45%)', () => {
  const { risco } = simular({ tabela, jogos });
  assert(risco > 15 && risco < 45, `risco ${risco}`);
});

test('marcações são respeitadas: tudo V, tudo E, tudo D', () => {
  const v = simular({ tabela, jogos, marcas: marcasTodas('V') });
  const e = simular({ tabela, jogos, marcas: marcasTodas('E') });
  const d = simular({ tabela, jogos, marcas: marcasTodas('D') });
  assert(Math.abs(v.projecao - 59) < 1e-9, `vitórias: ${v.projecao}`); // 32 + 9 × 3
  assert(Math.abs(e.projecao - 41) < 1e-9, `empates: ${e.projecao}`); // 32 + 9
  assert(Math.abs(d.projecao - 32) < 1e-9, `derrotas: ${d.projecao}`);
  assert(v.risco < e.risco && e.risco < d.risco);
  assert(v.risco < 0.5);
  assert(d.risco > 99.9);
});

test('marcar um jogo como V reduz o risco e como D aumenta', () => {
  const base = simular({ tabela, jogos }).risco;
  const v = simular({ tabela, jogos, marcas: { [indicesCorinthians[0]]: 'V' } }).risco;
  const d = simular({ tabela, jogos, marcas: { [indicesCorinthians[0]]: 'D' } }).risco;
  assert(v < base && base < d, `${v} < ${base} < ${d}`);
});

test('corte estimado é inteiro e fica em faixa realista', () => {
  const { corte } = simular({ tabela, jogos });
  assert(Number.isInteger(corte));
  assert(corte >= 38 && corte <= 48, `corte ${corte}`);
});

test('pontosParaRisco: quanto mais exigente o alvo, mais pontos', () => {
  const s = simular({ tabela, jogos });
  const p50 = pontosParaRisco(s, 0.5);
  const p30 = pontosParaRisco(s, 0.3);
  const p10 = pontosParaRisco(s, 0.1);
  assert(p50 <= p30 && p30 <= p10, `${p50} ${p30} ${p10}`);
  assert(p10 > 40 && p10 < 50, `p10 ${p10}`);
});

test('forças: poucos jogos puxam o time para a média (encolhimento)', () => {
  const t = [
    { clube: 'A', pts: 0, j: 2, v: 0, e: 0, d: 2, gp: 8, gc: 0 },
    { clube: 'B', pts: 0, j: 40, v: 0, e: 0, d: 40, gp: 160, gc: 0 },
    { clube: 'C', pts: 0, j: 40, v: 0, e: 0, d: 40, gp: 40, gc: 200 },
  ];
  const { mapa } = forcas(t);
  // A e B têm o mesmo ataque bruto (4 gols/jogo), mas A só jogou 2 vezes
  assert(mapa.get('A').ataque < mapa.get('B').ataque);
});

test('desempenho: 20 mil simulações em menos de 2 segundos', () => {
  const t0 = performance.now();
  simular({ tabela, jogos, sims: PARAMETROS.sims });
  assert(performance.now() - t0 < 2000);
});
