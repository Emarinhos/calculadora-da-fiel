import test from 'node:test';
import assert from 'node:assert';
import { calculateRisk, pontosProjetados, distanciaCorte, formatDistanciaLabel, riskLevel, riscoBaseline, INCLINACAO } from './risk.js';
import { INITIAL_GAMES, PONTOS_ATUAIS, JOGOS_DISPUTADOS, CORTE_SEGURANCA } from './data.js';

test('calculateRisk - Modelo Logístico (Sigmoide)', async (t) => {
  await t.test('riscoBaseline retorna o risco exato do cenário sem marcações', () => {
    const base = riscoBaseline();
    assert.strictEqual(base, calculateRisk(INITIAL_GAMES));
    assert(Math.abs(base - 74.54) < 0.1, `Esperado ~74.54, obtido ${base}`);
  });

  await t.test('nenhum jogo marcado - risco calculado com base no PPG atual', () => {
    const risk = calculateRisk(INITIAL_GAMES);
    assert(Math.abs(risk - 74.54) < 0.1, `Esperado ~74.54, obtido ${risk}`);
  });

  await t.test('todas vitórias - risco próximo de, mas acima de, 0.5', () => {
    const games = INITIAL_GAMES.map(g => ({ ...g, result: 'V' }));
    const risk = calculateRisk(games);
    assert(risk > 0.5, `Risco deve ser acima de 0.5, obtido ${risk}`);
    assert(risk < 1.0, `Risco deve ser próximo de 0.5 (abaixo de 1.0), obtido ${risk}`);
  });

  await t.test('todas derrotas - risco próximo de, mas abaixo de, 99.5', () => {
    const games = INITIAL_GAMES.map(g => ({ ...g, result: 'D' }));
    const risk = calculateRisk(games);
    assert(risk < 99.5, `Risco deve ser abaixo de 99.5, obtido ${risk}`);
    assert(risk > 98.0, `Risco deve ser próximo de 99.5 (acima de 98.0), obtido ${risk}`);
  });

  await t.test('empate fora e empate em casa produzem o MESMO impacto (ambos somam 1 ponto)', () => {
    const gameAwayDraw = INITIAL_GAMES.map(g => g.id === 1 ? { ...g, result: 'E' } : g);
    const gameHomeDraw = INITIAL_GAMES.map(g => g.id === 2 ? { ...g, result: 'E' } : g);

    const ptsAway = pontosProjetados(gameAwayDraw);
    const ptsHome = pontosProjetados(gameHomeDraw);
    assert.strictEqual(ptsAway, ptsHome);

    const riskAway = calculateRisk(gameAwayDraw);
    const riskHome = calculateRisk(gameHomeDraw);
    assert.strictEqual(riskAway, riskHome);
  });

  await t.test('o impacto de uma vitória é MAIOR perto do corte do que quando muito acima dele (não-linearidade)', () => {
    const riskAt44 = 100 / (1 + Math.exp(INCLINACAO * (44 - CORTE_SEGURANCA)));
    const riskAt47 = 100 / (1 + Math.exp(INCLINACAO * (47 - CORTE_SEGURANCA)));
    const impactNearCutoff = riskAt44 - riskAt47;

    const riskAt52 = 100 / (1 + Math.exp(INCLINACAO * (52 - CORTE_SEGURANCA)));
    const riskAt55 = 100 / (1 + Math.exp(INCLINACAO * (55 - CORTE_SEGURANCA)));
    const impactFarAboveCutoff = riskAt52 - riskAt55;

    assert(impactNearCutoff > impactFarAboveCutoff * 3);
  });
});

test('distanciaCorte', async (t) => {
  await t.test('projeção abaixo do corte (cenário inicial)', () => {
    const dist = distanciaCorte(INITIAL_GAMES);
    // 41.93 pontos projetados < 45 corte
    assert.strictEqual(dist.situacao, 'abaixo');
    assert(Math.abs(dist.pontos - (CORTE_SEGURANCA - 41.931)) < 0.05);
    assert.strictEqual(dist.label, 'faltam 3 pts para o corte');
  });

  await t.test('projeção acima do corte (todas vitórias)', () => {
    const games = INITIAL_GAMES.map(g => ({ ...g, result: 'V' }));
    const dist = distanciaCorte(games);
    // 32 + 27 = 59 pontos projetados > 45 corte -> diferença de 14
    assert.strictEqual(dist.situacao, 'acima');
    assert.strictEqual(dist.pontos, 14);
    assert.strictEqual(dist.label, '14 pts de folga');
  });

  await t.test('projeção exatamente no corte', () => {
    // 32 pontos atuais + 13 pontos = 45 pontos (exato)
    // 4 vitórias (12) + 1 empate (1) + 4 derrotas (0) = 13 pontos em 9 jogos
    const games = INITIAL_GAMES.map((g, idx) => {
      if (idx < 4) return { ...g, result: 'V' };
      if (idx === 4) return { ...g, result: 'E' };
      return { ...g, result: 'D' };
    });
    const dist = distanciaCorte(games);
    assert.strictEqual(dist.situacao, 'exato');
    assert.strictEqual(dist.pontos, 0);
    assert.strictEqual(dist.label, 'no corte de segurança');
  });

  await t.test('concordância gramatical de singular/plural na label', () => {
    // Abaixo: singular vs plural
    assert.strictEqual(formatDistanciaLabel(1, 'abaixo'), 'falta 1 pt');
    assert.strictEqual(formatDistanciaLabel(4, 'abaixo'), 'faltam 4 pts para o corte');

    // Acima: singular vs plural
    assert.strictEqual(formatDistanciaLabel(1, 'acima'), '1 pt de folga');
    assert.strictEqual(formatDistanciaLabel(6, 'acima'), '6 pts de folga');

    // Exato
    assert.strictEqual(formatDistanciaLabel(0, 'exato'), 'no corte de segurança');
  });
});

test('riskLevel', async (t) => {
  await t.test('<30 (29.9) - deve retornar safe', () => {
    assert.deepStrictEqual(riskLevel(29.9), { level: 'safe', label: 'Situação confortável' });
  });

  await t.test('30 - deve retornar warn', () => {
    assert.deepStrictEqual(riskLevel(30), { level: 'warn', label: 'Risco moderado' });
  });

  await t.test('60 - deve retornar warn', () => {
    assert.deepStrictEqual(riskLevel(60), { level: 'warn', label: 'Risco moderado' });
  });

  await t.test('>60 (60.1) - deve retornar danger', () => {
    assert.deepStrictEqual(riskLevel(60.1), { level: 'danger', label: 'Zona de perigo' });
  });

  await t.test('2 vitórias produz 43.7% e deve retornar Risco moderado', () => {
    // 2 vitórias: 32 + 6 + 7*(32/29) = 45.72 pts -> risco = 43.7%
    const games = INITIAL_GAMES.map((g, idx) => idx < 2 ? { ...g, result: 'V' } : g);
    const risk = calculateRisk(games);
    assert(Math.abs(risk - 43.7) < 0.1, `Esperado ~43.7%, obtido ${risk}`);
    assert.deepStrictEqual(riskLevel(risk), { level: 'warn', label: 'Risco moderado' });
  });
});
