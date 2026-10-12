import test from 'node:test';
import assert from 'node:assert';
import { jogosPendentes, resultadosDosPendentes, placarConfirmado, rodadaParaRegistrarPosicao, MINUTOS_ATE_FIM } from './resultados-auto.js';
import { ESTADO_EMBUTIDO, estadoAposR30, clone } from './_fixtures.js';

const inicio = Date.UTC(2026, 9, 11, 20, 30); // Palmeiras x Corinthians, 17h30 em Brasília
const fim = (min) => inicio + min * 60000;
const palmeiras = { rodada: 30, mandante: 'Palmeiras', visitante: 'Corinthians', gm: 4, gv: 1 };

test('pendentes: só depois de apito inicial + 115 min; antes disso nem se olha', () => {
  const nomes = (ms) => jogosPendentes(ESTADO_EMBUTIDO, ms).map((g) => `${g.mandante}x${g.visitante}`);
  assert.ok(!nomes(fim(MINUTOS_ATE_FIM - 1)).includes('PalmeirasxCorinthians'));
  assert.ok(nomes(fim(MINUTOS_ATE_FIM)).includes('PalmeirasxCorinthians'));
});

test('pendentes: jogo adiado há mais de 14 dias deixa de ser procurado', () => {
  const adiado = jogosPendentes(ESTADO_EMBUTIDO, Date.UTC(2026, 9, 12, 12, 0)).find((g) => g.mandante === 'Chapecoense' && g.rodada === 21);
  assert.strictEqual(adiado, undefined);
});

test('resultados: casa pendentes com placares lidos e ignora quem não tem placar', () => {
  const pend = jogosPendentes(ESTADO_EMBUTIDO, fim(300));
  const lidos = [{ ...palmeiras, data: '2026-10-11', hora: '17:30' }];
  assert.deepStrictEqual(resultadosDosPendentes(pend, lidos), [palmeiras]);
  assert.deepStrictEqual(resultadosDosPendentes(pend, []), []);
});

test('segunda fonte do Corinthians: mesmo placar numa notícia sobre o jogo', () => {
  const textos = ['Corinthians é goleado pelo Palmeiras por 4 a 1 no Nubank Parque', 'Palmeiras 4 x 1 Corinthians | Melhores momentos | 30ª rodada'];
  assert.strictEqual(placarConfirmado(textos, palmeiras), true);
  assert.strictEqual(placarConfirmado([textos[1]], palmeiras), true);
});

test('segunda fonte: placar diferente, outro adversário ou sem o Corinthians não confirma', () => {
  assert.strictEqual(placarConfirmado(['Palmeiras 2 x 0 Corinthians'], palmeiras), false);
  assert.strictEqual(placarConfirmado(['Santos 4 x 1 Corinthians'], palmeiras), false);
  assert.strictEqual(placarConfirmado(['Palmeiras vence o Bahia por 4 a 1'], palmeiras), false);
  assert.strictEqual(placarConfirmado([], palmeiras), false);
  assert.strictEqual(placarConfirmado(['Palmeiras em 2026 a 5 pontos do líder'], palmeiras), false); // "26 a 5" não é placar
});

test('posição: só quando a rodada acabou na liga e ainda não foi registrada', () => {
  assert.strictEqual(rodadaParaRegistrarPosicao(ESTADO_EMBUTIDO), null); // rodada 30 ainda não aplicada
  const completo = estadoAposR30();
  completo.posicaoRodada = 29;
  assert.strictEqual(rodadaParaRegistrarPosicao(completo), 30);
  const faltando = clone(completo);
  faltando.liga.jogos.push({ rodada: 30, mandante: 'Vasco', visitante: 'Remo', data: '2026-10-12', hora: '16:00', tv: null });
  assert.strictEqual(rodadaParaRegistrarPosicao(faltando), null); // ainda falta jogo da rodada
});
