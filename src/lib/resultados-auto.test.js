import test from 'node:test';
import assert from 'node:assert';
import { jogosPendentes, resultadosDosPendentes, placarConfirmado, rodadaParaRegistrarPosicao, emJanelaDeJogo, MINUTOS_ATE_FIM, ANTES_DO_JOGO_MIN, DEPOIS_DO_JOGO_MIN } from './resultados-auto.js';
import { ESTADO_EMBUTIDO, estadoAposR30, clone } from './_fixtures.js';

const inicio = Date.UTC(2026, 9, 11, 20, 30); // Palmeiras x Corinthians, 17h30 em Brasília
const fim = (min) => inicio + min * 60000;
const palmeiras = { rodada: 30, mandante: 'Palmeiras', visitante: 'Corinthians', gm: 4, gv: 1 };

test('pendentes: só depois de apito inicial + MINUTOS_ATE_FIM; antes disso nem se olha', () => {
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

test('janela de acompanhamento: de 15 min antes do apito até 170 min depois, só para jogo ainda sem resultado', () => {
  const um = clone(ESTADO_EMBUTIDO);
  um.liga.jogos = um.liga.jogos.filter((g) => g.mandante === 'Palmeiras' && g.visitante === 'Corinthians'); // só o jogo das 17h30
  const dentro = (ms) => emJanelaDeJogo(um, ms);
  assert.strictEqual(dentro(inicio - (ANTES_DO_JOGO_MIN + 1) * 60000), false);
  assert.strictEqual(dentro(inicio - ANTES_DO_JOGO_MIN * 60000), true);
  assert.strictEqual(dentro(inicio + 60 * 60000), true);
  assert.strictEqual(dentro(inicio + DEPOIS_DO_JOGO_MIN * 60000), true);
  assert.strictEqual(dentro(inicio + (DEPOIS_DO_JOGO_MIN + 1) * 60000), false);
  // sem jogo pendente na liga (resultado já aplicado), nunca há janela
  um.liga.jogos = [];
  assert.strictEqual(emJanelaDeJogo(um, inicio), false);
});

test('jogos a mais na fonte: aponta clubes cuja tabela da fonte tem mais jogos que a nossa', async () => {
  const { clubesComJogosAMais } = await import('./resultados-auto.js');
  const e = clone(ESTADO_EMBUTIDO);
  const fonte = e.liga.tabela.map((t) => ({ clube: t.clube, j: t.j }));
  assert.deepStrictEqual(clubesComJogosAMais(e, fonte), []);
  fonte[0].j += 1;
  assert.deepStrictEqual(clubesComJogosAMais(e, fonte), [fonte[0].clube]);
});

test('dias até hoje: n dias, do mais antigo ao mais recente, virando o mês', async () => {
  const { diasAte } = await import('./resultados-auto.js');
  assert.deepStrictEqual(diasAte('2026-11-02', 4), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
});
