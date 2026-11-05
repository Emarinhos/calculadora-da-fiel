import { classificacao } from './liga.js';
import { simular, distribuicaoDoJogo, PARAMETROS } from './simulacao.js';

/**
 * Simulador rodada a rodada (como o do GE): o usuário dá o placar de qualquer jogo restante da liga, a tabela é
 * recalculada na hora e as chances de cada clube saem da mesma simulação do painel, sorteando só os jogos sem palpite.
 *
 * Palpites: { [chaveDoJogo]: { gm, gv } }, gols do mandante e do visitante (inteiros ≥ 0; null = campo vazio).
 * A chave usa rodada + times, então continua valendo quando a lista de jogos muda (um jogo encerrado sai da lista
 * e o palpite dele simplesmente deixa de contar).
 */

export const SIMS_DO_SIMULADOR = 5000; // rápido no navegador; o painel usa 20 mil
export const CHAVE_LOCAL = 'simulador-palpites-v1';

export const chaveDoJogo = (g) => `${g.rodada}|${g.mandante}|${g.visitante}`;

const golsValidos = (x) => Number.isInteger(x) && x >= 0 && x <= 99;
export const placarCompleto = (p) => Boolean(p) && golsValidos(p.gm) && golsValidos(p.gv);

/** Rodadas que ainda têm jogos, em ordem. */
export const rodadasRestantes = (jogos) => [...new Set(jogos.map((g) => g.rodada))].sort((a, b) => a - b);

/**
 * Tabela com os palpites completos aplicados e os jogos que continuam em aberto.
 * @returns {{ tabela: Array, restantes: Array, aplicados: number }}
 */
export function aplicarPalpites(tabela, jogos, palpites) {
  const t = new Map(tabela.map((c) => [c.clube, { ...c }]));
  const restantes = [];
  let aplicados = 0;
  for (const g of jogos) {
    const p = palpites[chaveDoJogo(g)];
    const m = t.get(g.mandante);
    const v = t.get(g.visitante);
    if (!placarCompleto(p) || !m || !v) { restantes.push(g); continue; }
    aplicados++;
    m.j++; v.j++;
    m.gp += p.gm; m.gc += p.gv; v.gp += p.gv; v.gc += p.gm;
    if (p.gm > p.gv) { m.pts += 3; m.v++; v.d++; }
    else if (p.gm < p.gv) { v.pts += 3; v.v++; m.d++; }
    else { m.pts++; v.pts++; m.e++; v.e++; }
  }
  return { tabela: [...t.values()], restantes, aplicados };
}

/** Classificação (critérios da CBF) de uma tabela solta, com `pos` e `saldo`. */
export const ordenar = (tabela) => classificacao({ liga: { tabela } });

/** V/E/D do mandante e o placar mais provável de um jogo, pelo modelo (forças da tabela real). */
export function previsaoDoJogo(tabela, jogo) {
  const { pmfCasa, pmfFora } = distribuicaoDoJogo({ tabela, jogo });
  let casa = 0, empate = 0, fora = 0, melhor = { gm: 1, gv: 1 }, pMelhor = -1;
  for (let h = 0; h < pmfCasa.length; h++) {
    for (let a = 0; a < pmfFora.length; a++) {
      const p = pmfCasa[h] * pmfFora[a];
      if (h > a) casa += p; else if (h < a) fora += p; else empate += p;
      if (p > pMelhor) { pMelhor = p; melhor = { gm: h, gv: a }; }
    }
  }
  const total = casa + empate + fora;
  return { casa: casa / total, empate: empate / total, fora: fora / total, placar: melhor };
}

/**
 * Tabela com palpites + chances de todos os clubes, sorteando só os jogos sem palpite.
 * As forças dos times vêm sempre da tabela real.
 * @returns {{ linhas: Array, aplicados: number, restantes: number }} linhas = classificação com `chances` e `variacao`
 * (posições ganhas em relação à tabela real; positivo = subiu).
 */
export function simularComPalpites({ tabela, jogos, palpites, sims = SIMS_DO_SIMULADOR, parametros = PARAMETROS }) {
  const { tabela: nova, restantes, aplicados } = aplicarPalpites(tabela, jogos, palpites);
  const r = simular({ tabela: nova, jogos: restantes, tabelaForcas: tabela, porClube: true, sims, parametros });
  const posReal = new Map(ordenar(tabela).map((c) => [c.clube, c.pos]));
  const linhas = ordenar(nova).map((c) => ({
    ...c,
    chances: r.chancesPorClube[c.clube],
    variacao: posReal.get(c.clube) - c.pos,
  }));
  return { linhas, aplicados, restantes: restantes.length };
}

/** Palpites salvos no navegador (ou {} se não houver, se estiverem corrompidos ou sem armazenamento). */
export function lerPalpites(armazenamento = globalThis.localStorage) {
  try {
    const bruto = JSON.parse(armazenamento.getItem(CHAVE_LOCAL) || '{}');
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {};
    const limpos = {};
    for (const [k, p] of Object.entries(bruto)) {
      if (!p || typeof p !== 'object') continue;
      const gm = golsValidos(p.gm) ? p.gm : null;
      const gv = golsValidos(p.gv) ? p.gv : null;
      if (gm !== null || gv !== null) limpos[k] = { gm, gv };
    }
    return limpos;
  } catch {
    return {};
  }
}

export function salvarPalpites(palpites, armazenamento = globalThis.localStorage) {
  try { armazenamento.setItem(CHAVE_LOCAL, JSON.stringify(palpites)); } catch { /* sem armazenamento: vale só nesta visita */ }
}
