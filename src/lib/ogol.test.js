import test from 'node:test';
import assert from 'node:assert';
import { lerCalendario, lerTabela, textoDaPagina } from './ogol.js';

// Trechos reais (simplificados) das páginas do ogol de 11/10/2026
const CAL = `<table><tr><td>2026-10-11</td><td>17:30</td><td><a>Flamengo</a></td><td><a>1-0</a></td><td><a>Fluminense</a></td><td>R30</td><td>h2h</td></tr>
<tr><td>2026-10-11</td><td>17:30</td><td><a>Palmeiras</a></td><td><a>4-1</a></td><td><a>Corinthians</a></td><td>R30</td><td>h2h</td></tr>
<tr><td>2026-10-12</td><td>16:00</td><td><a>Coritiba</a></td><td>vs</td><td><a>Botafogo</a></td><td>R30</td><td>h2h</td></tr>
<tr><td>2026-07-28</td><td>21:00</td><td><a>Chapecoense</a></td><td>ADI</td><td><a>Vasco</a></td><td>R21</td><td>h2h</td></tr></table>`;

const TAB = `<div>Tabela</div><table><tr><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GM</th><th>GC</th><th>SG</th></tr>
<tr><td>1</td><td>Flamengo</td><td>64</td><td>30</td><td>19</td><td>7</td><td>4</td><td>58</td><td>25</td><td>+33</td><td>a</td></tr>
<tr><td>16</td><td>Corinthians</td><td>32</td><td>30</td><td>8</td><td>8</td><td>14</td><td>31</td><td>38</td><td>-7</td><td>a</td></tr></table><a>ver classificação detalhada</a>`;

test('calendário: lê só jogos com placar, com rodada, data e hora', () => {
  const j = lerCalendario(CAL);
  assert.strictEqual(j.length, 2); // "vs" e "ADI" ficam de fora
  assert.deepStrictEqual(j[1], { rodada: 30, data: '2026-10-11', hora: '17:30', mandante: 'Palmeiras', visitante: 'Corinthians', gm: 4, gv: 1 });
});

test('tabela: posição, pontos, jogos e gols de cada clube', () => {
  const t = lerTabela(TAB);
  assert.strictEqual(t.length, 2);
  assert.deepStrictEqual(t[1], { pos: 16, clube: 'Corinthians', pts: 32, j: 30, gp: 31, gc: 38 });
  assert.deepStrictEqual(lerTabela('<p>sem tabela</p>'), []);
});

test('texto da página: tira script, estilo e tags', () => {
  assert.ok(!textoDaPagina('<script>var x=1</script><b>Olá</b> <i>mundo</i>').includes('var'));
});
