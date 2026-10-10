import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataDoIdDoX, tituloCurto, mesclarNoticias, noticiasDoJogo, validarNoticias } from './noticias.js';
import { validarEstado, ESTADO_EMBUTIDO } from './estado.js';
import { noticiasDoRss, noticiasDoX } from '../../scripts/atualizar-noticias.mjs';

const n = (titulo, data, url = `https://ge.globo.com/${titulo}`) => ({ titulo, fonte: 'ge', url, data });
const ehData = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

test('data do id do post do X', () => {
  assert.equal(dataDoIdDoX('2108915744087920953'), '2026-10-10');
});

test('título curto: tira link, corta em palavra e não passa do limite', () => {
  assert.equal(tituloCurto('Olá   mundo https://t.co/abc'), 'Olá mundo');
  const longo = tituloCurto('palavra '.repeat(40), 60);
  assert.ok(longo.length <= 60 && longo.endsWith('…'));
});

test('mesclar: sem repetidas, só recentes, mais novas primeiro, com teto', () => {
  const r = mesclarNoticias(
    [[n('a', '2026-10-08'), n('b', '2026-10-10')], [n('a', '2026-10-08'), n('velha', '2026-09-01')]],
    '2026-10-10',
    { max: 5 },
  );
  assert.deepEqual(r.map((x) => x.titulo), ['b', 'a']);
  assert.equal(mesclarNoticias([[n('1', '2026-10-10'), n('2', '2026-10-10'), n('3', '2026-10-10')]], '2026-10-10', { max: 2 }).length, 2);
});

test('notícia do jogo: acha o adversário sem diferenciar acento ou caixa', () => {
  const lista = [n('Palpites para Palmeiras x Corinthians', '2026-10-10'), n('Bastidores do Timão', '2026-10-10')];
  assert.equal(noticiasDoJogo(lista, 'Palmeiras').length, 1);
  assert.equal(noticiasDoJogo([n('Gols do GREMIO', '2026-10-10')], 'Grêmio').length, 1);
  assert.equal(noticiasDoJogo(lista, 'Santos').length, 0);
  assert.deepEqual(noticiasDoJogo(undefined, 'Santos'), []);
});

test('validação: aceita boas, recusa url sem https e data ruim', () => {
  const erros = [];
  validarNoticias([n('ok', '2026-10-10'), { titulo: 'x', fonte: 'ge', url: 'http://x.com', data: '10/10' }], (m) => erros.push(m), ehData);
  assert.equal(erros.length, 2);
  const limpo = [];
  validarNoticias(undefined, (m) => limpo.push(m), ehData);
  assert.equal(limpo.length, 0);
});

test('estado embutido continua válido com as notícias', () => {
  assert.equal(validarEstado(ESTADO_EMBUTIDO).ok, true);
});

test('RSS do ge: título, link e data da URL; entidades decodificadas', () => {
  const xml = `<item><title>A &amp; B: "teste"</title><link>https://ge.globo.com/futebol/times/corinthians/noticia/2026/10/09/x.ghtml</link></item>
               <item><title>sem data</title><link>https://ge.globo.com/video/1</link></item>`;
  const r = noticiasDoRss(xml);
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].titulo, r[0].data, r[0].fonte], ['A & B: "teste"', '2026-10-09', 'ge']);
});

test('posts do X: data pelo id e link do post', () => {
  const r = noticiasDoX([{ id: '2108915744087920953', texto: 'Texto https://t.co/z' }, { id: 'abc', texto: 'x' }]);
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].titulo, r[0].data, r[0].url], ['Texto', '2026-10-10', 'https://x.com/MeuTimao/status/2108915744087920953']);
});
