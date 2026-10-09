import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { ESTADO_EMBUTIDO, validarEstado, jogosDoApp, contextoDe, carregarEstado } from './estado.js';
import { calculateRisk, pontosProjetados, riscoBaseline } from './risk.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

/** Estado depois de a rodada 30 acabar: Corinthians venceu o Palmeiras por 1x0. */
function estadoAposR30() {
  const e = clone(ESTADO_EMBUTIDO);
  e.pontos = 35;
  e.jogosDisputados = 30;
  e.posicao = 14;
  e.posicaoRodada = 30;
  e.posicaoAtualizadaEm = '2026-10-12';
  e.atualizadoEm = '2026-10-12';
  e.jogos[0].resultado = 'V';
  e.jogos[0].placar = { gc: 1, ga: 0 };
  e.historico = [{ rodada: 30, posicao: 14, pontos: 35, atualizadoEm: '2026-10-12' }];
  return e;
}

test('estado embutido e public/estado.json são válidos', () => {
  assert.deepStrictEqual(validarEstado(ESTADO_EMBUTIDO), { ok: true, erros: [] });
  const arquivo = JSON.parse(fs.readFileSync(new URL('../../public/estado.json', import.meta.url), 'utf8'));
  const r = validarEstado(arquivo);
  assert(r.ok, r.erros.join('; '));
});

test('estado após a rodada 30 é válido', () => {
  const r = validarEstado(estadoAposR30());
  assert(r.ok, r.erros.join('; '));
});

test('validação recusa pontos que não batem com os jogos encerrados', () => {
  const e = estadoAposR30();
  e.pontos = 34;
  const r = validarEstado(e);
  assert.strictEqual(r.ok, false);
  assert(r.erros.some((m) => m.includes('pontos')));
});

test('validação recusa resultado que não bate com o placar', () => {
  const e = estadoAposR30();
  e.jogos[0].placar = { gc: 0, ga: 2 };
  assert.strictEqual(validarEstado(e).ok, false);
});

test('validação recusa jogo encerrado depois de jogo aberto', () => {
  const e = estadoAposR30();
  e.jogos[0].resultado = null; e.jogos[0].placar = null;
  e.jogos[1].resultado = 'E'; e.jogos[1].placar = { gc: 1, ga: 1 };
  e.pontos = 33; e.jogosDisputados = 30;
  const r = validarEstado(e);
  assert.strictEqual(r.ok, false);
  assert(r.erros.some((m) => m.includes('ordem')));
});

test('validação recusa jogosDisputados inconsistente, posição absurda e lixo', () => {
  const a = estadoAposR30(); a.jogosDisputados = 31;
  assert.strictEqual(validarEstado(a).ok, false);
  const b = estadoAposR30(); b.posicao = 25;
  assert.strictEqual(validarEstado(b).ok, false);
  assert.strictEqual(validarEstado(null).ok, false);
  assert.strictEqual(validarEstado({}).ok, false);
});

test('jogoDoApp marca como travado só quem tem resultado', () => {
  const jogos = jogosDoApp(estadoAposR30());
  assert.strictEqual(jogos[0].locked, true);
  assert.strictEqual(jogos[0].result, 'V');
  assert(jogos.slice(1).every((j) => !j.locked && j.result === null));
});

test('jogo travado NÃO conta duas vezes nos pontos projetados', () => {
  const e = estadoAposR30();
  const abertos = jogosDoApp(e).filter((j) => !j.locked);
  const ctx = contextoDe(e);
  // 35 pts em 30 jogos, 8 jogos abertos sem marcação: 35 + 8 * (35/30)
  assert(Math.abs(pontosProjetados(abertos, ctx) - (35 + 8 * (35 / 30))) < 1e-9);
  // marcando V num jogo aberto, soma 3 sobre os 35, e não 3 + 3 do jogo travado
  abertos[0].result = 'V';
  assert(Math.abs(pontosProjetados(abertos, ctx) - (35 + 3 + 7 * (35 / 30))) < 1e-9);
});

test('o baseline acompanha o estado: depois de uma vitória o risco baseline cai', () => {
  const antes = riscoBaseline();
  const e = estadoAposR30();
  const abertos = jogosDoApp(e).filter((j) => !j.locked);
  const depois = riscoBaseline(abertos, contextoDe(e));
  assert(depois < antes, `esperava ${depois} < ${antes}`);
  assert.strictEqual(depois, calculateRisk(abertos, contextoDe(e)));
});

test('carregarEstado: usa o arquivo quando válido', async () => {
  const e = estadoAposR30();
  const r = await carregarEstado({ fetchImpl: async () => ({ ok: true, json: async () => e }) });
  assert.strictEqual(r.origem, 'arquivo');
  assert.strictEqual(r.estado.pontos, 35);
});

test('carregarEstado: cai no embutido se o arquivo falhar ou for inválido', async () => {
  const falha = await carregarEstado({ fetchImpl: async () => { throw new Error('offline'); } });
  assert.strictEqual(falha.origem, 'embutido');
  assert.match(falha.aviso, /offline/);
  const http = await carregarEstado({ fetchImpl: async () => ({ ok: false, status: 404 }) });
  assert.strictEqual(http.origem, 'embutido');
  const lixo = await carregarEstado({ fetchImpl: async () => ({ ok: true, json: async () => ({ pontos: 999 }) }) });
  assert.strictEqual(lixo.origem, 'embutido');
  assert.match(lixo.aviso, /inválido/);
});
