import { PONTOS_ATUAIS, JOGOS_DISPUTADOS, CORTE_SEGURANCA, INITIAL_GAMES } from './data.js';

/**
 * Contexto da temporada usado pelo modelo. O padrão é o estado embutido (data.js);
 * o app passa o contexto vindo de public/estado.json, que muda a cada rodada.
 * `games` deve conter só os jogos ainda abertos: o que já foi disputado já está em `pontos`.
 */
export const CONTEXTO_PADRAO = {
  pontos: PONTOS_ATUAIS,
  jogosDisputados: JOGOS_DISPUTADOS,
  corte: CORTE_SEGURANCA,
};

/**
 * Retorna o risco do cenário baseline sem nenhuma marcação feita (cenário inicial padrão).
 */
export function riscoBaseline(games = INITIAL_GAMES, ctx = CONTEXTO_PADRAO) {
  return calculateRisk(games.map((g) => ({ ...g, result: null })), ctx);
}

/**
 * Coeficiente de inclinação da curva logística (sigmoide).
 * Controla a taxa de variação do risco ao redor da nota de corte (45 pontos).
 * Em 0.35, cada ponto próximo ao corte gera uma variação expressiva de ~8-9 pontos percentuais.
 */
export const INCLINACAO = 0.35;

/**
 * Calcula os pontos projetados somando os pontos atuais, os pontos dos jogos marcados
 * e a projeção linear baseada no aproveitamento atual (PPG) para os jogos restantes não marcados.
 */
export function pontosProjetados(games, ctx = CONTEXTO_PADRAO) {
  const ppg = ctx.pontos / ctx.jogosDisputados;
  let ptsMarcados = 0;
  let jogosNaoMarcados = 0;

  games.forEach(game => {
    if (game.result === 'V') ptsMarcados += 3;
    else if (game.result === 'E') ptsMarcados += 1;
    else if (game.result === 'D') ptsMarcados += 0;
    else jogosNaoMarcados += 1;
  });

  return ctx.pontos + ptsMarcados + (jogosNaoMarcados * ppg);
}

/**
 * Formata o texto de label com concordância gramatical estrita para singular e plural.
 * Singular: "falta 1 pt" / "1 pt de folga"
 * Plural: "faltam N pts para o corte" / "N pts de folga"
 */
export function formatDistanciaLabel(pontos, situacao) {
  const pts = Math.round(pontos);
  if (situacao === 'exato' || pts === 0) {
    return 'no corte de segurança';
  }
  if (situacao === 'abaixo') {
    return pts === 1 ? 'falta 1 pt' : `faltam ${pts} pts para o corte`;
  }
  return pts === 1 ? '1 pt de folga' : `${pts} pts de folga`;
}

/**
 * Calcula a distância em relação à nota de corte de segurança.
 * Retorna { pontos: number, situacao: 'abaixo'|'acima'|'exato', label: string }
 * onde pontos é a diferença absoluta entre pontosProjetados e CORTE_SEGURANCA.
 */
export function distanciaCorte(games, ctx = CONTEXTO_PADRAO) {
  const proj = pontosProjetados(games, ctx);
  const diff = proj - ctx.corte;
  const pontos = Math.abs(diff);

  let situacao = 'exato';
  if (diff > 0.0001) {
    situacao = 'acima';
  } else if (diff < -0.0001) {
    situacao = 'abaixo';
  }

  const label = formatDistanciaLabel(pontos, situacao);

  return {
    pontos,
    situacao,
    label
  };
}

/**
 * Calcula o percentual de risco de rebaixamento usando modelo logístico (sigmoide):
 * risco = 100 / (1 + exp(INCLINACAO * (pontosProjetados - CORTE_SEGURANCA)))
 * Clampeado estritamente entre 0.5% e 99.5%.
 */
export function calculateRisk(games, ctx = CONTEXTO_PADRAO) {
  const proj = pontosProjetados(games, ctx);
  const rawRisk = 100 / (1 + Math.exp(INCLINACAO * (proj - ctx.corte)));
  return Math.max(0.5, Math.min(99.5, rawRisk));
}

export function riskLevel(pct) {
  if (pct < 30) return { level: 'safe', label: 'Situação confortável' };
  if (pct <= 60) return { level: 'warn', label: 'Risco moderado' };
  return { level: 'danger', label: 'Zona de perigo' };
}
