import test from 'node:test';
import assert from 'node:assert';
import { ESTADO_EMBUTIDO, jogosDoApp, validarEstado } from './estado.js';
import { cenarioRealista, transmissaoDosAbertos, analisar, fixturesDoClube } from './analise.js';
import { probabilidadesDoJogo } from './simulacao.js';
import { atualizarAgenda } from './aplicar.js';
import { estadoAposR30, clone } from './_fixtures.js';

const PTS = { V: 3, E: 1, D: 0 };
const fixtures = (e) => fixturesDoClube(e).map((i) => e.liga.jogos[i]);

test('probabilidadesDoJogo: V+E+D = 1 e mando pesa a favor de quem joga em casa', () => {
  const tabela = ESTADO_EMBUTIDO.liga.tabela;
  const emCasa = probabilidadesDoJogo({ tabela, jogo: { mandante: 'Corinthians', visitante: 'Vitória' } });
  const fora = probabilidadesDoJogo({ tabela, jogo: { mandante: 'Vitória', visitante: 'Corinthians' } });
  for (const p of [emCasa, fora]) assert(Math.abs(p.V + p.E + p.D - 1) < 1e-9);
  assert(emCasa.V > fora.V, 'jogar em casa aumenta a chance de vitória');
  assert(emCasa.D < fora.D);
});

test('probabilidadesDoJogo: o líder é favorito sobre a lanterna', () => {
  const tabela = ESTADO_EMBUTIDO.liga.tabela;
  const p = probabilidadesDoJogo({ tabela, jogo: { mandante: 'Flamengo', visitante: 'Chapecoense' }, clube: 'Flamengo' });
  assert(p.V > 0.6, `V ${p.V}`);
});

test('cenário realista: um resultado por jogo aberto, todos válidos', () => {
  const { resultados } = cenarioRealista(ESTADO_EMBUTIDO);
  assert.strictEqual(resultados.length, 9);
  assert(resultados.every((r) => ['V', 'E', 'D'].includes(r)));
});

test('cenário realista casa com a projeção: soma de pontos = pontos esperados arredondados', () => {
  const e = ESTADO_EMBUTIDO;
  const esperado = fixtures(e).reduce((s, jogo) => {
    const p = probabilidadesDoJogo({ tabela: e.liga.tabela, jogo });
    return s + 3 * p.V + p.E;
  }, 0);
  const { resultados, pontos } = cenarioRealista(e);
  assert.strictEqual(pontos, Math.round(esperado));
  assert.strictEqual(resultados.reduce((s, r) => s + PTS[r], 0), pontos);
  // e a projeção simulada (média de pontos finais) fecha com o mesmo total
  const jogos = jogosDoApp(e).map((g, i) => ({ ...g, result: resultados[i] }));
  const a = analisar(e, jogos);
  assert(Math.abs(a.projecao - (e.pontos + pontos)) < 1e-9, `${a.projecao} vs ${e.pontos + pontos}`);
  assert.strictEqual(Math.round(analisar(e, jogosDoApp(e)).projecao), e.pontos + pontos);
});

test('cenário realista é a combinação mais provável entre as que somam o mesmo total (força bruta)', () => {
  const e = ESTADO_EMBUTIDO;
  const probs = fixtures(e).map((jogo) => probabilidadesDoJogo({ tabela: e.liga.tabela, jogo }));
  const { resultados, pontos } = cenarioRealista(e);
  const logp = (rs) => rs.reduce((s, r, i) => s + Math.log(probs[i][r]), 0);
  let melhor = -Infinity;
  const letras = ['V', 'E', 'D'];
  const rec = (i, atual) => {
    if (i === probs.length) {
      if (atual.reduce((s, r) => s + PTS[r], 0) === pontos) melhor = Math.max(melhor, logp(atual));
      return;
    }
    for (const r of letras) rec(i + 1, [...atual, r]);
  };
  rec(0, []);
  assert(Math.abs(logp(resultados) - melhor) < 1e-9);
});

test('cenário realista usa só jogos abertos (depois da rodada 30 são 8)', () => {
  const e = estadoAposR30();
  const { resultados, pontos } = cenarioRealista(e);
  assert.strictEqual(resultados.length, 8);
  assert.strictEqual(resultados.reduce((s, r) => s + PTS[r], 0), pontos);
});

test('cenário realista sem jogos abertos devolve vazio', () => {
  const e = clone(ESTADO_EMBUTIDO);
  e.liga.jogos = e.liga.jogos.filter((g) => g.mandante !== 'Corinthians' && g.visitante !== 'Corinthians');
  e.jogos.forEach((j) => { j.resultado = 'E'; j.placar = { gc: 0, ga: 0 }; });
  assert.deepStrictEqual(cenarioRealista(e), { resultados: [], pontos: 0 });
});

test('transmissão: data, hora e TV alinhadas com os jogos abertos', () => {
  const t = transmissaoDosAbertos(ESTADO_EMBUTIDO);
  assert.strictEqual(t.length, 9);
  assert.deepStrictEqual(t[0], { data: '2026-10-11', hora: '17:30', tv: 'Globo', streaming: null, confirmada: false }); // Palmeiras x Corinthians
  assert.deepStrictEqual(t[1], { data: '2026-10-19', hora: '20:00', tv: 'SporTV', streaming: null, confirmada: false }); // Corinthians x Vitória
  assert.deepStrictEqual(t[4], { data: '2026-11-04', hora: '21:30', tv: null, streaming: null, confirmada: false }); // São Paulo x Corinthians
  assert.deepStrictEqual(t[6], { data: '2026-11-20', hora: '21:00', tv: null, streaming: null, confirmada: false }); // Atlético Mineiro x Corinthians
  assert(t.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.data)));
});

test('transmissão: depois da rodada 30 o primeiro jogo aberto é o Vitória', () => {
  const t = transmissaoDosAbertos(estadoAposR30());
  assert.strictEqual(t.length, 8);
  assert.strictEqual(t[0].data, '2026-10-19');
});

test('validação recusa agenda inválida', () => {
  const a = clone(ESTADO_EMBUTIDO); a.liga.jogos[0].hora = '25:99';
  assert.match(validarEstado(a).erros.join(' '), /hora inválida/);
  const b = clone(ESTADO_EMBUTIDO); b.liga.jogos[0].data = '11/10/2026';
  assert.match(validarEstado(b).erros.join(' '), /data inválida/);
  const c = clone(ESTADO_EMBUTIDO); c.liga.jogos[0].tv = '';
  assert.match(validarEstado(c).erros.join(' '), /tv inválida/);
});

test('atualizarAgenda remarca data/hora/TV só dos campos informados e valida', () => {
  const novo = atualizarAgenda(
    ESTADO_EMBUTIDO,
    [{ rodada: 35, mandante: 'Corinthians', visitante: 'Botafogo', hora: '21:30', tv: 'Globo' }],
    '2026-11-01'
  );
  const g = novo.liga.jogos.find((x) => x.rodada === 35 && x.mandante === 'Corinthians');
  assert.deepStrictEqual([g.data, g.hora, g.tv], ['2026-11-18', '21:30', 'Globo']);
  assert.strictEqual(novo.atualizadoEm, '2026-11-01');
  assert(validarEstado(novo).ok);
  assert.strictEqual(ESTADO_EMBUTIDO.liga.jogos.find((x) => x.rodada === 35 && x.mandante === 'Corinthians').hora, null);
});

test('atualizarAgenda recusa jogo que não existe', () => {
  assert.throws(
    () => atualizarAgenda(ESTADO_EMBUTIDO, [{ rodada: 30, mandante: 'Remo', visitante: 'Vasco', hora: '10:00' }]),
    /não está entre os jogos restantes/
  );
});
