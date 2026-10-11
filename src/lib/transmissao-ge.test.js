import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acharMateria, extrairTransmissao } from './transmissao-ge.js';
import { transmissaoAConsultar } from './agenda.js';
import { estadoSemConsulta } from './_fixtures.js';

const TEXTO = 'Palmeiras e Corinthians se enfrentam às 17h30 (de Brasília) deste domingo, no Nubank Parque. O ge acompanha todos os lances em Tempo Real ; a TV Globo , ge tv e Premiere transmitem ao vivo. + Veja a tabela completa do Brasileirão. O Sportv exibe outro jogo.';

test('extrai horário, TV e streaming da frase de transmissão', () => {
  assert.deepEqual(extrairTransmissao(TEXTO), { hora: '17:30', tv: 'Globo e Premiere', streaming: 'ge tv' });
});

test('SporTV e Premiere; sem frase de transmissão não devolve TV (não deduz)', () => {
  assert.equal(extrairTransmissao('Jogo às 20h. O SporTV e o Premiere transmitem ao vivo.').tv, 'SporTV e Premiere');
  assert.deepEqual(extrairTransmissao('Jogo às 21h30 no estádio. O SporTV mostra os melhores momentos.'), { hora: '21:30', tv: null, streaming: null });
});

test('matéria certa: título com os dois clubes e "onde assistir", data da URL perto do jogo', () => {
  const itens = [
    { titulo: 'Palpites e dicas para Palmeiras x Corinthians pelo Brasileirão', url: 'https://ge.globo.com/x/noticia/2026/10/09/a.ghtml' },
    { titulo: 'Palmeiras x Corinthians: onde assistir ao vivo, horário e escalações', url: 'https://ge.globo.com/x/noticia/2026/10/11/b.ghtml' },
    { titulo: 'Vitória x Corinthians: onde assistir', url: 'https://ge.globo.com/x/noticia/2026/10/19/c.ghtml' },
  ];
  const jogo = { mandante: 'Palmeiras', visitante: 'Corinthians', data: '2026-10-11' };
  assert.equal(acharMateria(itens, jogo).url, itens[1].url);
  assert.equal(acharMateria(itens, { ...jogo, data: '2026-10-30' }), undefined); // matéria de outra data não vale
  assert.equal(acharMateria(itens, { mandante: 'Corinthians', visitante: 'Vitória', data: '2026-10-19' }).url, itens[2].url);
});

test('apelidos do ge: Atlético-MG', () => {
  const itens = [{ titulo: 'Atlético-MG x Corinthians: onde assistir', url: 'https://ge.globo.com/x/noticia/2026/11/20/a.ghtml' }];
  assert.ok(acharMateria(itens, { mandante: 'Atlético Mineiro', visitante: 'Corinthians', data: '2026-11-20' }));
});

test('gatilho: um dia antes e no dia do jogo, até confirmar', () => {
  const e = estadoSemConsulta();
  assert.equal(transmissaoAConsultar(e, '2026-10-10').length, 1);
  assert.equal(transmissaoAConsultar(e, '2026-10-11').length, 1);
  assert.equal(transmissaoAConsultar(e, '2026-10-09').length, 0);
});
