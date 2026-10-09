import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { ESTADO_EMBUTIDO, validarEstado, jogosDoApp, carregarEstado, nomeNaLiga } from './estado.js';
import { estadoAposR30, clone } from './_fixtures.js';

const erros = (e) => validarEstado(e).erros.join(' | ');

test('estado embutido e public/estado.json são válidos e idênticos', () => {
  const r = validarEstado(ESTADO_EMBUTIDO);
  assert(r.ok, r.erros.join('; '));
  const arquivo = JSON.parse(fs.readFileSync(new URL('../../public/estado.json', import.meta.url), 'utf8'));
  assert.deepStrictEqual(arquivo, ESTADO_EMBUTIDO);
});

test('estado inicial: 20 times, 91 jogos restantes (90 + 1 adiado), Corinthians em 16º com 32 pts', () => {
  assert.strictEqual(ESTADO_EMBUTIDO.liga.tabela.length, 20);
  assert.strictEqual(ESTADO_EMBUTIDO.liga.jogos.length, 91);
  assert.strictEqual(ESTADO_EMBUTIDO.posicao, 16);
  assert.strictEqual(ESTADO_EMBUTIDO.pontos, 32);
  const ordenada = [...ESTADO_EMBUTIDO.liga.tabela].sort((a, b) => b.pts - a.pts);
  assert.strictEqual(ordenada.findIndex((t) => t.clube === 'Corinthians') + 1, 16);
});

test('estado após a rodada 30 é válido', () => {
  const r = validarEstado(estadoAposR30());
  assert(r.ok, r.erros.join('; '));
});

test('recusa pontos que não batem com os jogos encerrados', () => {
  const e = estadoAposR30(); e.pontos = 34;
  assert.match(erros(e), /pontos/);
});

test('recusa resultado que não bate com o placar', () => {
  const e = estadoAposR30(); e.jogos[0].placar = { gc: 0, ga: 2 };
  assert.match(erros(e), /não bate com o placar/);
});

test('recusa jogo encerrado depois de jogo aberto', () => {
  const e = clone(ESTADO_EMBUTIDO);
  e.jogos[1].resultado = 'E'; e.jogos[1].placar = { gc: 1, ga: 1 };
  assert.match(erros(e), /ordem/);
});

test('recusa jogosDisputados inconsistente, posição absurda e lixo', () => {
  const a = estadoAposR30(); a.jogosDisputados = 31;
  assert.strictEqual(validarEstado(a).ok, false);
  const b = estadoAposR30(); b.posicao = 25;
  assert.strictEqual(validarEstado(b).ok, false);
  assert.strictEqual(validarEstado(null).ok, false);
  assert.strictEqual(validarEstado({}).ok, false);
  const c = clone(ESTADO_EMBUTIDO); c.versao = 1;
  assert.match(erros(c), /versao/);
});

test('liga: tabela com pontos que não batem com V/E é recusada', () => {
  const e = clone(ESTADO_EMBUTIDO); e.liga.tabela[0].pts += 1;
  assert.match(erros(e), /pts/);
});

test('liga: jogo restante a menos faz o time não fechar 38 jogos', () => {
  const e = clone(ESTADO_EMBUTIDO); e.liga.jogos.splice(3, 1);
  assert.match(erros(e), /≠ 38/);
});

test('liga: clube desconhecido ou time contra si mesmo é recusado', () => {
  const a = clone(ESTADO_EMBUTIDO); a.liga.jogos[0].mandante = 'Time X';
  assert.match(erros(a), /clube desconhecido/);
  const b = clone(ESTADO_EMBUTIDO); b.liga.jogos[0].visitante = b.liga.jogos[0].mandante;
  assert.match(erros(b), /iguais/);
});

test('liga: linha do Corinthians precisa bater com pontos e jogosDisputados do estado', () => {
  const e = clone(ESTADO_EMBUTIDO);
  e.liga.tabela.find((t) => t.clube === 'Corinthians').gp += 1; // só gols: continua coerente na linha...
  e.liga.tabela.find((t) => t.clube === 'Palmeiras').gc += 1; // ...e na soma da liga
  assert(validarEstado(e).ok);
  const f = clone(ESTADO_EMBUTIDO);
  const t = f.liga.tabela.find((x) => x.clube === 'Corinthians');
  t.v += 1; t.d -= 1; t.pts += 2; // pontos da tabela divergem do estado
  assert.match(erros(f), /estado\.pontos/);
});

test('liga: jogos abertos do Corinthians precisam bater com os da liga (rodada, adversário, mando)', () => {
  const e = clone(ESTADO_EMBUTIDO);
  e.jogos[0].casa = true; // Palmeiras é fora
  assert.match(erros(e), /não bate com liga\.jogos/);
});

test('nomeNaLiga: Atlético-MG vira Atlético Mineiro', () => {
  assert.strictEqual(nomeNaLiga('Atlético-MG'), 'Atlético Mineiro');
  assert.strictEqual(nomeNaLiga('Vasco'), 'Vasco');
});

test('jogosDoApp marca como travado só quem tem resultado', () => {
  const jogos = jogosDoApp(estadoAposR30());
  assert.strictEqual(jogos[0].locked, true);
  assert.strictEqual(jogos[0].result, 'V');
  assert(jogos.slice(1).every((j) => !j.locked && j.result === null));
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
