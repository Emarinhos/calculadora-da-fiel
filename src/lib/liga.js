import { CLUBE } from './estado.js';
import { simular, PARAMETROS } from './simulacao.js';

/**
 * Tabela da liga para a tela: classificação, risco de rebaixamento de cada clube e o próximo duelo com o Corinthians.
 *
 * As chances de cada clube (risco de rebaixamento, Sul-Americana e Libertadores) saem da MESMA simulação do Corinthians
 * (src/lib/simulacao.js), calculada fora do navegador sempre que a tabela muda e gravada em `liga.risco` do estado
 * (formato 2: { formato, jogosDisputados, sims, clubes: { clube: { rebaixamento, sulamericana, libertadores } } }).
 * A tela só lê; não simula nada.
 */

/** Classificação com os critérios da CBF: pontos, vitórias, saldo de gols, gols pró. Retorna linhas com `pos`. */
export function classificacao(estado) {
  const chave = (t) => [t.pts, t.v, t.gp - t.gc, t.gp];
  const ordenada = [...estado.liga.tabela].sort((a, b) => {
    const ka = chave(a);
    const kb = chave(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
    return 0;
  });
  return ordenada.map((t, i) => ({ ...t, pos: i + 1, saldo: t.gp - t.gc }));
}

/** Soma dos jogos disputados na liga: identifica a "versão" da tabela a que um cálculo de risco pertence. */
export const jogosDaTabela = (estado) => estado.liga.tabela.reduce((s, t) => s + t.j, 0);

export const FORMATO_RISCO = 2;
const arredonda = (x) => Math.round(x * 100) / 100;

/** Chances (%) de cada clube: { clube: { rebaixamento, sulamericana, libertadores } }, com 2 casas decimais. */
export function calcularRiscos(estado, { sims = PARAMETROS.sims } = {}) {
  const clubes = {};
  for (const t of estado.liga.tabela) {
    const r = simular({ tabela: estado.liga.tabela, jogos: estado.liga.jogos, clube: t.clube, sims });
    clubes[t.clube] = {
      rebaixamento: arredonda(r.chances.rebaixamento),
      sulamericana: arredonda(r.chances.sulamericana),
      libertadores: arredonda(r.chances.libertadores),
    };
  }
  return { formato: FORMATO_RISCO, jogosDisputados: jogosDaTabela(estado), sims, clubes };
}

/** O risco gravado ainda vale para a tabela atual? (se a tabela mudou e o risco não foi recalculado, não vale) */
export function riscoVigente(estado) {
  const r = estado.liga.risco;
  return Boolean(r && r.formato === FORMATO_RISCO && r.jogosDisputados === jogosDaTabela(estado));
}

/** Estado com `liga.risco` recalculado. Determinístico: mesma tabela e jogos, mesmos números. */
export function comRiscos(estado, opcoes) {
  const novo = JSON.parse(JSON.stringify(estado));
  novo.liga.risco = calcularRiscos(novo, opcoes);
  return novo;
}

/** Jogo que o Corinthians ainda faz contra `clube`: { rodada, casa } ou null. */
export function proximoDuelo(estado, clube) {
  const jogo = estado.liga.jogos
    .filter((g) => (g.mandante === CLUBE && g.visitante === clube) || (g.visitante === CLUBE && g.mandante === clube))
    .sort((a, b) => a.rodada - b.rodada)[0];
  return jogo ? { rodada: jogo.rodada, casa: jogo.mandante === CLUBE } : null;
}

/** Linhas prontas para a tabela: classificação + chances (quando vigentes) + duelo restante com o Corinthians. */
export function linhasDaTabela(estado) {
  const risco = riscoVigente(estado) ? estado.liga.risco.clubes : null;
  return classificacao(estado).map((t) => ({
    ...t,
    chances: risco ? risco[t.clube] ?? null : null,
    duelo: t.clube === CLUBE ? null : proximoDuelo(estado, t.clube),
    eu: t.clube === CLUBE,
    zona: t.pos > estado.liga.tabela.length - PARAMETROS.zonaDeRebaixamento,
  }));
}
