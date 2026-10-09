import test from 'node:test';
import assert from 'node:assert';
import { resultadoDe, confrontosRecentes, resultadoDoCenario, formaRecente } from './cenarios.js';
import { H2H } from './h2h.js';
import { INITIAL_GAMES } from './data.js';
import { calculateRisk } from './risk.js';

// Data fixa: os testes não dependem do relógio
const HOJE = new Date('2026-10-09T12:00:00Z');
const op = { hoje: HOJE };

test('resultadoDe usa o placar dos 90 minutos', () => {
  assert.strictEqual(resultadoDe({ gc: 2, ga: 1 }), 'V');
  assert.strictEqual(resultadoDe({ gc: 0, ga: 0 }), 'E');
  assert.strictEqual(resultadoDe({ gc: 1, ga: 3 }), 'D');
});

test('todos os adversários restantes têm histórico na janela', () => {
  INITIAL_GAMES.forEach((g) => {
    assert(H2H[g.opponent], `sem dados para ${g.opponent}`);
    assert(confrontosRecentes(g.opponent, op).length > 0, `sem confrontos recentes para ${g.opponent}`);
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
  // Vasco: V V E V V -> nunca perdeu: pior caso é empate
  assert.strictEqual(resultadoDoCenario('Vasco', 'optimistic', op), 'V');
  assert.strictEqual(resultadoDoCenario('Vasco', 'pessimistic', op), 'E');
  // Botafogo: D E E D D -> nunca venceu: melhor caso é empate
  assert.strictEqual(resultadoDoCenario('Botafogo', 'optimistic', op), 'E');
  assert.strictEqual(resultadoDoCenario('Botafogo', 'pessimistic', op), 'D');
  // Remo: só 3 jogos na janela (V V D)
  assert.strictEqual(resultadoDoCenario('Remo', 'optimistic', op), 'V');
  assert.strictEqual(resultadoDoCenario('Remo', 'pessimistic', op), 'D');
});

test('adversário sem histórico retorna null', () => {
  assert.strictEqual(resultadoDoCenario('Time Inexistente', 'optimistic', op), null);
  assert.strictEqual(resultadoDoCenario('Time Inexistente', 'pessimistic', op), null);
});

test('cenários do calendário: 25 pts no otimista, 3 pts no pessimista', () => {
  const pts = (r) => (r === 'V' ? 3 : r === 'E' ? 1 : 0);
  const soma = (tipo) => INITIAL_GAMES.reduce((s, g) => s + pts(resultadoDoCenario(g.opponent, tipo, op)), 0);
  assert.strictEqual(soma('optimistic'), 25);
  assert.strictEqual(soma('pessimistic'), 3);
});

test('o cenário otimista tem risco menor que o baseline e o pessimista, maior', () => {
  const aplica = (tipo) => INITIAL_GAMES.map((g) => ({ ...g, result: resultadoDoCenario(g.opponent, tipo, op) }));
  const base = calculateRisk(INITIAL_GAMES);
  assert(calculateRisk(aplica('optimistic')) < base);
  assert(calculateRisk(aplica('pessimistic')) > base);
});
