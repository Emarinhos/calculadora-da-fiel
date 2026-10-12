import { CLUBE } from './estado.js';

/**
 * Regra da transmissão (data, horário, TV e streaming):
 * ela é consultada na web EXATAMENTE UM DIA ANTES de cada jogo do Corinthians. Esse é o gatilho.
 * Antes disso, o que aparece na tela é preliminar ("a confirmar").
 * Reforço: se a consulta do dia anterior falhou (nada encontrado, computador desligado),
 * tenta de novo no dia do jogo.
 */

/** Soma `n` dias a uma data AAAA-MM-DD (sem fuso: cálculo em UTC). */
export function somaDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

/** A transmissão do jogo foi consultada a partir do dia anterior a ele? */
export function transmissaoConfirmada(jogo) {
  if (!jogo.data || !jogo.tvConsultadaEm) return false;
  return jogo.tvConsultadaEm >= somaDias(jogo.data, -1);
}

/**
 * Jogos do Corinthians cuja transmissão deve ser consultada hoje.
 * @param estado conteúdo de estado.json
 * @param hoje   'AAAA-MM-DD' (data local do computador)
 * @returns [{rodada, mandante, visitante, data, motivo}]
 */
export function transmissaoAConsultar(estado, hoje) {
  const amanha = somaDias(hoje, 1);
  return estado.liga.jogos
    .filter((g) => (g.mandante === CLUBE || g.visitante === CLUBE) && g.data)
    .filter((g) => !transmissaoConfirmada(g))
    .flatMap((g) => {
      if (g.data === amanha) return [{ rodada: g.rodada, mandante: g.mandante, visitante: g.visitante, data: g.data, motivo: 'um dia antes do jogo' }];
      if (g.data === hoje) return [{ rodada: g.rodada, mandante: g.mandante, visitante: g.visitante, data: g.data, motivo: 'reforço no dia do jogo (a consulta de ontem não confirmou)' }];
      return [];
    })
    .sort((a, b) => a.rodada - b.rodada);
}

/** Duração considerada "ao vivo" a partir do apito inicial: 2 tempos, intervalo e acréscimos. */
export const DURACAO_AO_VIVO_MIN = 130;

/**
 * O jogo está acontecendo agora? Usa data e horário de Brasília (UTC-3, sem horário de verão desde 2019).
 * @param jogo   { data: 'AAAA-MM-DD', hora: 'HH:MM' | null } (item de transmissaoDosAbertos)
 * @param agoraMs instante atual em milissegundos (Date.now())
 */
export function aoVivo(jogo, agoraMs) {
  const inicio = inicioDoJogo(jogo);
  return inicio !== null && agoraMs >= inicio && agoraMs < inicio + DURACAO_AO_VIVO_MIN * 60000;
}

/** Instante do apito inicial em ms (UTC), ou null se faltar data ou horário. */
export function inicioDoJogo(jogo) {
  if (!jogo?.data || !jogo.hora) return null;
  const [a, m, d] = jogo.data.split('-').map(Number);
  const [h, min] = jogo.hora.split(':').map(Number);
  return Date.UTC(a, m - 1, d, h + 3, min);
}

/** O jogo já começou? Depois do apito inicial ninguém mais marca resultado, mesmo antes de o resultado real chegar. */
export function jogoComecou(jogo, agoraMs) {
  const inicio = inicioDoJogo(jogo);
  return inicio !== null && agoraMs >= inicio;
}
