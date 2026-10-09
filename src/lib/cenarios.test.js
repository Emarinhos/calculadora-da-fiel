import test from 'node:test';
import assert from 'node:assert';
import { resultadoDe, confrontosRecentes, resultadoDoCenario, formaRecente } from './cenarios.js';
import { H2H } from './h2h.js';
import { ESTADO_EMBUTIDO, jogosDoApp } from './estado.js';
import { analisar } from './analise.js';

// Data fixa: os testes não dependem do relógio
const HOJE = new Date('2026-10-09T12:00:00Z');
const op = { hoje: HOJE };
const jogos = jogosDoApp(ESTADO_EMBUTIDO);
const adversarios = jogos.map((g) => g.opponent);

test('resultadoDe usa o placar dos 90 minutos', () => {
  assert.strictEqual(resultadoDe({ gc: 2, ga: 1 }), 'V');
  assert.strictEqual(resultadoDe({ gc: 0, ga: 0 }), 'E');
  assert.strictEqual(resultadoDe({ gc: 1, ga: 3 }), 'D');
});

test('todos os adversários restantes têm histórico na janela', () => {
  adversarios.forEach((nome) => {
    assert(H2H[nome], `sem dados para ${nome}`);
    assert(confrontosRecentes(nome, op).length > 0, `sem confrontos recentes para ${nome}`);
  });
});

test('confrontosRecentes: no máximo 5, mais recente primeiro', () => {
  const lista = confrontosRecentes('Palmeiras', op);
  assert.strictEqual(lista.length, 5);
  assert.strictEqual(lista[0].data, '2026-04-12');
  for (let i = 1; i < lista.length; i++) assert(lista[i - 1].data >= lista[i].data);
});

test('confrontosRecentes: descarta jogos fora da janela de 5 anos (Remo: 1996 fica de fora)', () => {
  const lista = confrontosRecentes('Remo', op);
  assert.strictEqual(lista.length, 3);
  assert(lista.every((jogo) => jogo.data >= '2021-10-09'));
});

test('formaRecente do Palmeiras', () => {
  assert.deepStrictEqual(formaRecente('Palmeiras', op), ['E', 'D', 'E', 'V', 'V']);
});

test('cenário por jogo: melhor/pior resultado dos últimos 5', () => {
  assert.strictEqual(resultadoDoCenario('Vasco', 'optimistic', op), 'V');
  assert.strictEqual(resultadoDoCenario('Vasco', 'pessimistic', op), 'E');
  assert.strictEqual(resultadoDoCenario('Botafogo', 'optimistic', op), 'E');
  assert.strictEqual(resultadoDoCenario('Botafogo', 'pessimistic', op), 'D');
  assert.strictEqual(resultadoDoCenario('Remo', 'optimistic', op), 'V');
  assert.strictEqual(resultadoDoCenario('Remo', 'pessimistic', op), 'D');
});

test('adversário sem histórico retorna null', () => {
  assert.strictEqual(resultadoDoCenario('Time Inexistente', 'optimistic', op), null);
  assert.strictEqual(resultadoDoCenario('Time Inexistente', 'pessimistic', op), null);
});

test('cenários do calendário: 25 pts no otimista, 3 pts no pessimista', () => {
  const pts = (r) => (r === 'V' ? 3 : r === 'E' ? 1 : 0);
  const soma = (tipo) => adversarios.reduce((s, nome) => s + pts(resultadoDoCenario(nome, tipo, op)), 0);
  assert.strictEqual(soma('optimistic'), 25);
  assert.strictEqual(soma('pessimistic'), 3);
});

test('o cenário otimista tem risco menor que o baseline e o pessimista, maior', () => {
  const aplica = (tipo) => jogos.map((g) => ({ ...g, result: resultadoDoCenario(g.opponent, tipo, op) }));
  const base = analisar(ESTADO_EMBUTIDO, jogos).risco;
  assert(analisar(ESTADO_EMBUTIDO, aplica('optimistic')).risco < base);
  assert(analisar(ESTADO_EMBUTIDO, aplica('pessimistic')).risco > base);
});
