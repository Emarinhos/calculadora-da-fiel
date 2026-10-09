import test from 'node:test';
import assert from 'node:assert';
import { ESTADO_EMBUTIDO, validarEstado } from './estado.js';
import { somaDias, transmissaoConfirmada, transmissaoAConsultar } from './agenda.js';
import { transmissaoDosAbertos } from './analise.js';
import { atualizarAgenda } from './aplicar.js';
import { clone } from './_fixtures.js';

const consultar = (estado, hoje) => transmissaoAConsultar(estado, hoje).map((x) => `R${x.rodada}`);

test('somaDias: virada de mês, de ano e ano bissexto', () => {
  assert.strictEqual(somaDias('2026-10-31', 1), '2026-11-01');
  assert.strictEqual(somaDias('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(somaDias('2028-02-28', 1), '2028-02-29');
  assert.strictEqual(somaDias('2026-10-11', -1), '2026-10-10');
});

test('gatilho: a transmissão é consultada exatamente 1 dia antes do jogo', () => {
  // Palmeiras x Corinthians é em 2026-10-11
  assert.deepStrictEqual(consultar(ESTADO_EMBUTIDO, '2026-10-09'), []); // 2 dias antes: ainda não
  assert.deepStrictEqual(consultar(ESTADO_EMBUTIDO, '2026-10-10'), ['R30']); // 1 dia antes: SIM
  assert.strictEqual(transmissaoAConsultar(ESTADO_EMBUTIDO, '2026-10-10')[0].motivo, 'um dia antes do jogo');
});

test('gatilho: no dia do jogo só reforça se a consulta de ontem não confirmou', () => {
  assert.deepStrictEqual(consultar(ESTADO_EMBUTIDO, '2026-10-11'), ['R30']);
  assert.match(transmissaoAConsultar(ESTADO_EMBUTIDO, '2026-10-11')[0].motivo, /reforço/);
  const feito = atualizarAgenda(ESTADO_EMBUTIDO, [{ rodada: 30, mandante: 'Palmeiras', visitante: 'Corinthians', tvConsultadaEm: '2026-10-10' }]);
  assert.deepStrictEqual(consultar(feito, '2026-10-11'), []);
  assert.deepStrictEqual(consultar(feito, '2026-10-10'), []); // não consulta duas vezes
});

test('gatilho: só jogos do Corinthians e só em 1 dia', () => {
  // 10/10 tem Vasco x Remo e São Paulo x Vitória (não são do Corinthians); em 09/10 consulta 0
  assert.deepStrictEqual(consultar(ESTADO_EMBUTIDO, '2026-10-09'), []);
  assert.deepStrictEqual(consultar(ESTADO_EMBUTIDO, '2026-10-18'), ['R31']);
  assert.deepStrictEqual(consultar(ESTADO_EMBUTIDO, '2026-10-17'), []);
  assert.deepStrictEqual(consultar(ESTADO_EMBUTIDO, '2026-10-20'), []);
});

test('gatilho: jogo sem data não dispara', () => {
  const e = clone(ESTADO_EMBUTIDO);
  e.liga.jogos.forEach((g) => { g.data = null; });
  assert.deepStrictEqual(consultar(e, '2026-10-10'), []);
});

test('transmissaoConfirmada: vale se consultada a partir do dia anterior', () => {
  assert.strictEqual(transmissaoConfirmada({ data: '2026-10-11', tvConsultadaEm: '2026-10-10' }), true);
  assert.strictEqual(transmissaoConfirmada({ data: '2026-10-11', tvConsultadaEm: '2026-10-11' }), true);
  assert.strictEqual(transmissaoConfirmada({ data: '2026-10-11', tvConsultadaEm: '2026-10-09' }), false); // cedo demais
  assert.strictEqual(transmissaoConfirmada({ data: '2026-10-11', tvConsultadaEm: null }), false);
  assert.strictEqual(transmissaoConfirmada({ data: null, tvConsultadaEm: '2026-10-10' }), false);
});

test('jogo remarcado para depois: a consulta antiga deixa de valer e o novo dia anterior dispara', () => {
  let e = atualizarAgenda(ESTADO_EMBUTIDO, [{ rodada: 31, mandante: 'Corinthians', visitante: 'Vitória', tvConsultadaEm: '2026-10-18', tv: 'SporTV', streaming: 'Premiere' }]);
  assert.deepStrictEqual(consultar(e, '2026-10-18'), []);
  e = atualizarAgenda(e, [{ rodada: 31, mandante: 'Corinthians', visitante: 'Vitória', data: '2026-10-22' }]); // remarcado
  assert.strictEqual(transmissaoDosAbertos(e)[1].confirmada, false);
  assert.deepStrictEqual(consultar(e, '2026-10-21'), ['R31']);
});

test('transmissão confirmada e streaming chegam à tela', () => {
  const e = atualizarAgenda(
    ESTADO_EMBUTIDO,
    [{ rodada: 30, mandante: 'Palmeiras', visitante: 'Corinthians', hora: '17:30', tv: 'Globo', streaming: 'Globoplay, Premiere', tvConsultadaEm: '2026-10-10' }],
    '2026-10-10'
  );
  assert(validarEstado(e).ok);
  assert.deepStrictEqual(transmissaoDosAbertos(e)[0], { data: '2026-10-11', hora: '17:30', tv: 'Globo', streaming: 'Globoplay, Premiere', confirmada: true });
});

test('validação recusa streaming e tvConsultadaEm inválidos', () => {
  const a = clone(ESTADO_EMBUTIDO); a.liga.jogos[0].streaming = '';
  assert.match(validarEstado(a).erros.join(' '), /streaming inválido/);
  const b = clone(ESTADO_EMBUTIDO); b.liga.jogos[0].tvConsultadaEm = 'ontem';
  assert.match(validarEstado(b).erros.join(' '), /tvConsultadaEm inválida/);
});
