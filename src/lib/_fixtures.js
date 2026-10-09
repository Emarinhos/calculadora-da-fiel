// Apoio aos testes: uma rodada completa de resultados e atalhos.
import { ESTADO_EMBUTIDO } from './estado.js';
import { aplicarResultados } from './aplicar.js';

export const clone = (o) => JSON.parse(JSON.stringify(o));

/** Rodada 30 inteira (10 jogos). Corinthians vence o Palmeiras por 1x0 fora. */
export const RODADA_30 = [
  { rodada: 30, mandante: 'Vasco', visitante: 'Remo', gm: 1, gv: 1 },
  { rodada: 30, mandante: 'São Paulo', visitante: 'Vitória', gm: 2, gv: 0 },
  { rodada: 30, mandante: 'Atlético Mineiro', visitante: 'Santos', gm: 1, gv: 1 },
  { rodada: 30, mandante: 'Flamengo', visitante: 'Fluminense', gm: 2, gv: 1 },
  { rodada: 30, mandante: 'Palmeiras', visitante: 'Corinthians', gm: 0, gv: 1 },
  { rodada: 30, mandante: 'Grêmio', visitante: 'Internacional', gm: 0, gv: 0 },
  { rodada: 30, mandante: 'Bahia', visitante: 'Mirassol', gm: 2, gv: 0 },
  { rodada: 30, mandante: 'Coritiba', visitante: 'Botafogo', gm: 1, gv: 2 },
  { rodada: 30, mandante: 'Chapecoense', visitante: 'Athletico Paranaense', gm: 0, gv: 3 },
  { rodada: 30, mandante: 'Red Bull Bragantino', visitante: 'Cruzeiro', gm: 1, gv: 0 },
];

export const estadoAposR30 = () => aplicarResultados(ESTADO_EMBUTIDO, RODADA_30, '2026-10-12');

/** Jogos do app (formato jogosDoApp) com `result` marcado em todos os abertos. */
export function marcarTodos(games, resultado) {
  return games.map((g) => (g.locked ? g : { ...g, result: resultado }));
}
