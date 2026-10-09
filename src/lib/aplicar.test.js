import test from 'node:test';
import assert from 'node:assert';
import { ESTADO_EMBUTIDO, validarEstado } from './estado.js';
import { aplicarResultados, registrarPosicao, compararComFonte, posicaoCalculada } from './aplicar.js';
import { RODADA_30, estadoAposR30, clone } from './_fixtures.js';

test('rodada 30 completa: estado continua válido e tudo fecha', () => {
  const e = estadoAposR30();
  const r = validarEstado(e);
  assert(r.ok, r.erros.join('; '));
  assert.strictEqual(e.liga.jogos.length, ESTADO_EMBUTIDO.liga.jogos.length - 10);
  // todos os times que jogaram ganharam 1 jogo
  const antes = new Map(ESTADO_EMBUTIDO.liga.tabela.map((t) => [t.clube, t.j]));
  e.liga.tabela.forEach((t) => assert.strictEqual(t.j, antes.get(t.clube) + 1, t.clube));
});

test('Corinthians vence o Palmeiras: jogo travado, 35 pts, 30 jogos', () => {
  const e = estadoAposR30();
  assert.strictEqual(e.jogos[0].resultado, 'V');
  assert.deepStrictEqual(e.jogos[0].placar, { gc: 1, ga: 0 });
  assert.strictEqual(e.pontos, 35);
  assert.strictEqual(e.jogosDisputados, 30);
  const eu = e.liga.tabela.find((t) => t.clube === 'Corinthians');
  assert.deepStrictEqual([eu.pts, eu.j, eu.v, eu.gp, eu.gc], [35, 30, 9, 31, 34]);
  assert.strictEqual(e.atualizadoEm, '2026-10-12');
});

test('não altera o estado original (função pura)', () => {
  const copia = clone(ESTADO_EMBUTIDO);
  aplicarResultados(ESTADO_EMBUTIDO, RODADA_30, '2026-10-12');
  assert.deepStrictEqual(ESTADO_EMBUTIDO, copia);
});

test('recusa jogo que não está entre os restantes (inclusive repetido)', () => {
  const e = estadoAposR30();
  assert.throws(() => aplicarResultados(e, [RODADA_30[0]], '2026-10-13'), /não está entre os jogos restantes/);
  assert.throws(
    () => aplicarResultados(ESTADO_EMBUTIDO, [{ rodada: 30, mandante: 'Remo', visitante: 'Vasco', gm: 0, gv: 0 }], '2026-10-12'),
    /não está entre os jogos restantes/
  );
});

test('recusa travar jogo do Corinthians fora de ordem', () => {
  assert.throws(
    () => aplicarResultados(ESTADO_EMBUTIDO, [{ rodada: 31, mandante: 'Corinthians', visitante: 'Vitória', gm: 1, gv: 0 }], '2026-10-20'),
    /ordem das rodadas/
  );
});

test('recusa placar inválido', () => {
  assert.throws(
    () => aplicarResultados(ESTADO_EMBUTIDO, [{ ...RODADA_30[0], gm: -1 }], '2026-10-12'),
    /placar inválido/
  );
});

test('jogo adiado (Chapecoense x Vasco) pode ser aplicado depois', () => {
  const e = aplicarResultados(ESTADO_EMBUTIDO, [{ rodada: 21, mandante: 'Chapecoense', visitante: 'Vasco', gm: 0, gv: 2 }], '2026-10-14');
  const r = validarEstado(e);
  assert(r.ok, r.erros.join('; '));
  assert.strictEqual(e.liga.tabela.find((t) => t.clube === 'Vasco').j, 29);
  assert.strictEqual(e.pontos, 32); // Corinthians não jogou
});

test('compararComFonte aponta divergência de pontos', () => {
  const e = estadoAposR30();
  const certa = e.liga.tabela.map((t) => ({ clube: t.clube, pts: t.pts, j: t.j }));
  assert.deepStrictEqual(compararComFonte(e, certa), []);
  const errada = certa.map((t) => (t.clube === 'Flamengo' ? { ...t, pts: t.pts + 1 } : t));
  const div = compararComFonte(e, errada);
  assert.strictEqual(div.length, 1);
  assert.match(div[0], /Flamengo/);
});

test('registrarPosicao grava a posição e não duplica o histórico da rodada', () => {
  let e = registrarPosicao(estadoAposR30(), { rodada: 30, posicao: 14, hoje: '2026-10-12' });
  e = registrarPosicao(e, { rodada: 30, posicao: 13, hoje: '2026-10-13' });
  assert.strictEqual(e.posicao, 13);
  assert.strictEqual(e.posicaoRodada, 30);
  assert.strictEqual(e.historico.filter((h) => h.rodada === 30).length, 1);
  assert.deepStrictEqual(e.historico[0], { rodada: 30, posicao: 13, pontos: 35, atualizadoEm: '2026-10-13' });
  assert(validarEstado(e).ok);
});

test('compararComFonte também confere gols quando informados', () => {
  const e = estadoAposR30();
  const eu = e.liga.tabela.find((t) => t.clube === 'Corinthians');
  assert.deepStrictEqual(compararComFonte(e, [{ clube: 'Corinthians', pts: eu.pts, j: eu.j, gp: eu.gp, gc: eu.gc }]), []);
  const div = compararComFonte(e, [{ clube: 'Corinthians', pts: eu.pts, j: eu.j, gp: eu.gp + 1, gc: eu.gc }]);
  assert.strictEqual(div.length, 1);
  assert.match(div[0], /gols/);
});

test('posicaoCalculada segue pontos, vitórias, saldo e gols pró', () => {
  assert.strictEqual(posicaoCalculada(ESTADO_EMBUTIDO), 16);
  assert.strictEqual(posicaoCalculada(ESTADO_EMBUTIDO, 'Flamengo'), 1);
  assert.strictEqual(posicaoCalculada(ESTADO_EMBUTIDO, 'Chapecoense'), 20);
});
