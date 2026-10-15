import test from 'node:test';
import assert from 'node:assert';
import { lerPlacar, lerTabelaEspn, nomeDaLiga, diaDaEspn, urlPlacar } from './espn.js';

const evento = (casa, fora, gm, gv, tipo = { name: 'STATUS_FULL_TIME', completed: true }) => ({
  status: { type: tipo },
  competitions: [{ competitors: [{ homeAway: 'home', score: String(gm), team: { displayName: casa } }, { homeAway: 'away', score: String(gv), team: { displayName: fora } }] }],
});

test('placar: nomes da ESPN viram os da nossa tabela; só encerrado conta como encerrado', () => {
  const r = lerPlacar({ events: [
    evento('Atlético-MG', 'Santos', 2, 1),
    evento('Vasco da Gama', 'Athletico-PR', 0, 0, { name: 'STATUS_IN_PROGRESS', completed: false }),
    evento('Palmeiras', 'Corinthians', 4, 1, { name: 'STATUS_POSTPONED', completed: false }),
  ] });
  assert.deepStrictEqual(r[0], { mandante: 'Atlético Mineiro', visitante: 'Santos', gm: 2, gv: 1, encerrado: true });
  assert.strictEqual(r[1].mandante, 'Vasco');
  assert.strictEqual(r[1].visitante, 'Athletico Paranaense');
  assert.strictEqual(r[1].encerrado, false); // em andamento
  assert.strictEqual(r[2].encerrado, false); // adiado
  assert.deepStrictEqual(lerPlacar({}), []);
});

test('tabela da ESPN: posição, pontos, jogos e gols no formato do ogol', () => {
  const stats = (rank, points, gamesPlayed, pointsFor, pointsAgainst) => [
    { name: 'rank', value: rank }, { name: 'points', value: points }, { name: 'gamesPlayed', value: gamesPlayed },
    { name: 'pointsFor', value: pointsFor }, { name: 'pointsAgainst', value: pointsAgainst },
  ];
  const t = lerTabelaEspn({ children: [{ standings: { entries: [
    { team: { displayName: 'Corinthians' }, stats: stats(16, 32, 30, 31, 38) },
    { team: { displayName: 'Vasco da Gama' }, stats: stats(14, 35, 29, 36, 42) },
  ] } }] });
  assert.deepStrictEqual(t, [
    { pos: 14, clube: 'Vasco', pts: 35, j: 29, gp: 36, gc: 42 },
    { pos: 16, clube: 'Corinthians', pts: 32, j: 30, gp: 31, gc: 38 },
  ]);
});

test('dia da ESPN: formato AAAAMMDD e soma de dias (virada de mês)', () => {
  assert.strictEqual(diaDaEspn('2026-10-11'), '20261011');
  assert.strictEqual(diaDaEspn('2026-10-31', 1), '20261101');
  assert.ok(urlPlacar('20261011').includes('dates=20261011'));
  assert.strictEqual(nomeDaLiga('Grêmio'), 'Grêmio');
});
