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

const CLUBES = ['Palmeiras', 'Flamengo', 'Bahia', 'Coritiba', 'Botafogo', 'São Paulo', 'Red Bull Bragantino', 'Vasco', 'Atlético Mineiro', 'Corinthians', 'Remo', 'Athletico Paranaense'];
// Trecho da matéria da 36ª rodada (texto já sem tags, como sai de textoDaPagina)
const RODADA = 'O ge lista onde assistir às partidas da 36ª rodada abaixo. Jogo: Palmeiras x Flamengo Palmeiras x Flamengo: informações e palpite para o jogo '
  + 'Quando : sábado, 21 de novembro; Onde : Nubank Parque, São Paulo ; Horário : 16h30 (de Brasília); Transmissão : ge TV, TV Globo e Premiere; Tempo real : você também pode acompanhar. '
  + 'Campeonato Brasileiro 2026 Fase única X Palmeiras Flamengo Jogo: Bahia x Coritiba Quando: sábado, 21 de novembro; Onde: Arena Acelen Fonte Nova; Horário: 17h30 (de Brasília); '
  + 'Transmissão: Premiere; Tempo real Jogo: Botafogo x São Paulo Quando: segunda-feira, 23 de novembro; Onde: Nilton Santos; Horário: 20h (de Brasília); Transmissão: Amazon Prime Video; '
  + 'Jogo: Bragantino x Vasco Quando: domingo, 22 de novembro; Horário: 19h30 (de Brasília); Transmissão: SporTV e Premiere; '
  + 'Jogo: Remo x Corinthians Quando: quarta-feira, 2 de dezembro; Horário: a definir';

test('matéria da rodada: um item por jogo, mandante primeiro, com data, hora e emissoras', async () => {
  const { lerRodadaGe } = await import('./transmissao-ge.js');
  assert.deepEqual(lerRodadaGe(RODADA, CLUBES, 2026, 11), [
    { mandante: 'Palmeiras', visitante: 'Flamengo', data: '2026-11-21', hora: '16:30', tv: 'Globo e Premiere', streaming: 'ge tv' },
    { mandante: 'Bahia', visitante: 'Coritiba', data: '2026-11-21', hora: '17:30', tv: 'Premiere', streaming: null },
    { mandante: 'Botafogo', visitante: 'São Paulo', data: '2026-11-23', hora: '20:00', tv: null, streaming: 'Prime Video' },
    { mandante: 'Red Bull Bragantino', visitante: 'Vasco', data: '2026-11-22', hora: '19:30', tv: 'SporTV e Premiere', streaming: null },
    { mandante: 'Remo', visitante: 'Corinthians', data: '2026-12-02', hora: null, tv: null, streaming: null },
  ]);
});

test('matéria da rodada: dezembro → janeiro passa para o ano seguinte; texto sem blocos não devolve nada', async () => {
  const { lerRodadaGe } = await import('./transmissao-ge.js');
  const [j] = lerRodadaGe('Jogo: Bahia x Coritiba Quando: domingo, 3 de janeiro; Horário: 16h;', CLUBES, 2026, 12);
  assert.equal(j.data, '2027-01-03');
  assert.deepEqual(lerRodadaGe('Veja a tabela do Brasileirão.', CLUBES, 2026, 11), []);
});
