import test from 'node:test';
import assert from 'node:assert';
import { simular, pontosParaVaga } from './simulacao.js';
import { analisar, objetivosVisiveis, faixaDeVaga, formatDistanciaVaga, LIMITE_VISIVEL } from './analise.js';
import { jogosDoApp } from './estado.js';
import { ESTADO_EMBUTIDO, marcarTodos } from './_fixtures.js';

const sim = (extra = {}) => simular({ tabela: ESTADO_EMBUTIDO.liga.tabela, jogos: ESTADO_EMBUTIDO.liga.jogos, sims: 6000, ...extra });

test('simulação: três objetivos pela mesma execução; cortes crescem do rebaixamento à Libertadores', () => {
  const r = sim();
  assert.strictEqual(r.chances.rebaixamento, r.risco);
  assert.ok(r.chances.libertadores <= r.chances.sulamericana, 'Libertadores é subconjunto de "Sul-Americana ou melhor"');
  assert.ok(r.cortes.rebaixamento < r.cortes.sulamericana && r.cortes.sulamericana < r.cortes.libertadores);
  assert.strictEqual(r.cortes.rebaixamento, r.corte); // o corte antigo continua sendo o do 16º
});

test('simulação: determinística (mesma entrada, mesmos números) e sem alterar o risco de antes', () => {
  assert.deepStrictEqual(sim().chances, sim().chances);
  assert.strictEqual(sim().risco, sim({ clube: 'Corinthians' }).risco);
});

test('pontos para a vaga: sobe com o objetivo e é null quando a vaga está fora de alcance', () => {
  const r = sim({ sims: 20000 });
  const sul = pontosParaVaga(r, 'sulamericana');
  assert.ok(sul !== null && sul > r.cortes.rebaixamento);
  assert.strictEqual(pontosParaVaga(r, 'libertadores'), null); // Corinthians não chega perto
});

test('marcar vitórias aumenta a chance de vaga e reduz o risco', () => {
  const g = jogosDoApp(ESTADO_EMBUTIDO);
  const base = analisar(ESTADO_EMBUTIDO, g, { sims: 4000 });
  const tudoV = analisar(ESTADO_EMBUTIDO, marcarTodos(g, 'V'), { sims: 4000 });
  assert.ok(tudoV.objetivos.rebaixamento.chance < base.objetivos.rebaixamento.chance);
  assert.ok(tudoV.objetivos.sulamericana.chance > base.objetivos.sulamericana.chance);
  assert.ok(tudoV.objetivos.libertadores.chance >= base.objetivos.libertadores.chance);
  assert.strictEqual(tudoV.maxPossivel, ESTADO_EMBUTIDO.pontos + 3 * (g.filter((x) => !x.locked).length));
});

test('visibilidade: rebaixamento sempre; vagas só com chance real (>= 0,1%)', () => {
  const g = jogosDoApp(ESTADO_EMBUTIDO);
  const base = analisar(ESTADO_EMBUTIDO, g, { sims: 4000 });
  const visiveis = objetivosVisiveis(base);
  assert.ok(visiveis.includes('rebaixamento'));
  for (const o of ['sulamericana', 'libertadores']) assert.strictEqual(visiveis.includes(o), base.objetivos[o].chance >= LIMITE_VISIVEL);
  const falso = { objetivos: { rebaixamento: { chance: 0 }, sulamericana: { chance: 0.05 }, libertadores: { chance: 0.1 } } };
  assert.deepStrictEqual(objetivosVisiveis(falso), ['rebaixamento', 'libertadores']);
});

test('textos: faixa de vaga e distância até a vaga', () => {
  assert.strictEqual(faixaDeVaga(80).label, 'Muito provável');
  assert.strictEqual(faixaDeVaga(45).label, 'Possível');
  assert.strictEqual(faixaDeVaga(12).label, 'Remota');
  assert.strictEqual(faixaDeVaga(0.3).label, 'Muito remota');
  const ctx = { corte: 49, maxPossivel: 56 };
  assert.strictEqual(formatDistanciaVaga(6, 'abaixo', ctx), 'faltam 6 pts para a vaga');
  assert.strictEqual(formatDistanciaVaga(1, 'abaixo', ctx), 'falta 1 pt para a vaga');
  assert.strictEqual(formatDistanciaVaga(3, 'acima', ctx), '3 pts acima da vaga');
  assert.strictEqual(formatDistanciaVaga(0, 'exato', ctx), 'exatamente no corte da vaga');
  assert.strictEqual(formatDistanciaVaga(19, 'abaixo', { corte: 62, maxPossivel: 56 }), 'faltam 6 pts mesmo ganhando tudo');
});
