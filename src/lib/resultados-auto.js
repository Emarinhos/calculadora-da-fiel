import { CLUBE } from './estado.js';
import { inicioDoJogo } from './agenda.js';
import { nomesDoClube } from './transmissao-ge.js';

/**
 * Regras da atualização automática de resultados (scripts/atualizar-resultados.mjs).
 * O resultado só entra DEPOIS do jogo: a partir de apito inicial + MINUTOS_ATE_FIM. Antes disso, nem se olha.
 */

/**
 * Minutos depois do apito inicial a partir dos quais vale consultar a fonte (a ESPN diz se o jogo terminou). Quando só há o
 * ogol, que não avisa se o jogo acabou, espera-se mais (2 tempos, intervalo e acréscimos) para não pegar jogo em andamento.
 */
export const MINUTOS_ATE_FIM = 105;
export const MINUTOS_ATE_FIM_OGOL = 115;

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Janela em que vale ficar acompanhando o jogo: de 15 min antes do apito até 170 min depois (fim + folga para atrasos de fonte). */
export const ANTES_DO_JOGO_MIN = 15;
export const DEPOIS_DO_JOGO_MIN = 170;

/** Há jogo da liga ainda sem resultado cuja janela de acompanhamento está aberta agora? */
export function emJanelaDeJogo(estado, agoraMs) {
  return estado.liga.jogos.some((g) => {
    const inicio = inicioDoJogo(g);
    return inicio !== null && agoraMs >= inicio - ANTES_DO_JOGO_MIN * 60000 && agoraMs <= inicio + DEPOIS_DO_JOGO_MIN * 60000;
  });
}

/** Passados tantos dias sem resultado, o jogo deixa de ser procurado (ex.: adiado sem nova data); a nova data o traz de volta. */
export const DIAS_MAXIMOS_DE_ESPERA = 14;

/** Jogos da liga que já deveriam ter acabado e ainda não têm resultado aplicado. */
export function jogosPendentes(estado, agoraMs, minutos = MINUTOS_ATE_FIM) {
  return estado.liga.jogos.filter((g) => {
    const inicio = inicioDoJogo(g);
    if (inicio === null) return false; // sem data e hora não dá para saber se acabou
    return agoraMs >= inicio + minutos * 60000 && agoraMs - inicio <= DIAS_MAXIMOS_DE_ESPERA * 86400000;
  });
}

/**
 * Casa os jogos pendentes com os placares lidos do ogol. Devolve só os que têm placar:
 * [{ rodada, mandante, visitante, gm, gv }] (o formato de aplicarResultados).
 */
export function resultadosDosPendentes(pendentes, lidos) {
  const placar = new Map(lidos.map((l) => [`${l.rodada}|${l.mandante}|${l.visitante}`, l]));
  return pendentes
    .map((g) => placar.get(`${g.rodada}|${g.mandante}|${g.visitante}`))
    .filter(Boolean)
    .map(({ rodada, mandante, visitante, gm, gv }) => ({ rodada, mandante, visitante, gm, gv }));
}

/**
 * O placar do jogo do Corinthians está confirmado por uma SEGUNDA fonte independente?
 * `textos` = trechos de notícia (ge, Meu Timão). Vale um texto que cita o adversário e o Corinthians e traz o mesmo
 * par de gols ("Palmeiras 4 x 1 Corinthians", "goleado por 4 a 1").
 */
export function placarConfirmado(textos, { mandante, visitante, gm, gv }) {
  const adversario = mandante === CLUBE ? visitante : mandante;
  const cita = (t, clube) => nomesDoClube(clube).some((n) => t.includes(n));
  const par = new Set([String(gm), String(gv)]);
  return textos.some((bruto) => {
    const t = semAcento(bruto);
    if (!cita(t, CLUBE) || !cita(t, adversario)) return false;
    for (const m of t.matchAll(/(?<!\d)(\d{1,2})\s?(?:x|×|a)\s?(\d{1,2})(?!\d)/g)) {
      // O ogol já diz quem é mandante; aqui só importa que o mesmo par de gols apareça numa notícia sobre o jogo
      if (par.has(m[1]) && par.has(m[2]) && (m[1] !== m[2] || gm === gv)) return true;
    }
    return false;
  });
}

/** Última rodada já terminada na liga (sem jogos restantes) que ainda não teve a posição registrada, ou null. */
export function rodadaParaRegistrarPosicao(estado) {
  const comJogos = new Set(estado.liga.jogos.map((g) => g.rodada));
  const jogadas = [...new Set(estado.jogos.filter((j) => j.resultado !== null).map((j) => j.rodada))];
  const prontas = jogadas.filter((r) => r > estado.posicaoRodada && !comJogos.has(r));
  return prontas.length ? Math.max(...prontas) : null;
}
