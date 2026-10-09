import { CLUBE } from './estado.js';
import { simular, pontosParaRisco } from './simulacao.js';

/** Risco abaixo do qual a situação é "confortável" e a partir do qual é "zona de perigo". */
export const LIMITE_CONFORTAVEL = 0.1;
export const LIMITE_PERIGO = 0.4;

/** Faixa de risco a partir do percentual real de rebaixamento (0 a 100). */
export function riskLevel(pct) {
  if (pct < LIMITE_CONFORTAVEL * 100) return { level: 'safe', label: 'Situação confortável' };
  if (pct < LIMITE_PERIGO * 100) return { level: 'warn', label: 'Risco moderado' };
  return { level: 'danger', label: 'Zona de perigo' };
}

/**
 * Índices, em estado.liga.jogos, dos jogos do Corinthians ainda abertos, na ordem das rodadas.
 * Correspondem 1 a 1 aos jogos abertos de estado.jogos (a validação garante).
 */
export function fixturesDoClube(estado) {
  return estado.liga.jogos
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => g.mandante === CLUBE || g.visitante === CLUBE)
    .sort((a, b) => a.g.rodada - b.g.rodada)
    .map(({ i }) => i);
}

/**
 * Roda a simulação para o estado atual e para as marcações do usuário.
 * @param estado  conteúdo de estado.json
 * @param games   jogos no formato do app (jogosDoApp), com `result` marcado nos abertos
 */
export function analisar(estado, games, { sims } = {}) {
  const abertos = games.filter((g) => !g.locked);
  const indices = fixturesDoClube(estado);
  const marcas = {};
  abertos.forEach((g, i) => {
    if (g.result) marcas[indices[i]] = g.result;
  });

  const sim = simular({ tabela: estado.liga.tabela, jogos: estado.liga.jogos, marcas, ...(sims ? { sims } : {}) });
  const projecao = sim.projecao;
  const corte = sim.corte;
  const diff = projecao - corte;
  const arredondado = Math.round(Math.abs(diff));

  return {
    risco: sim.risco,
    projecao,
    corte,
    emDisputa: abertos.length * 3,
    // total final de pontos a partir do qual o risco fica abaixo do limite "confortável"
    pontosConfortavel: pontosParaRisco(sim, LIMITE_CONFORTAVEL),
    distancia: {
      pontos: arredondado,
      situacao: arredondado === 0 ? 'exato' : diff < 0 ? 'abaixo' : 'acima',
      label: formatDistanciaLabel(arredondado, arredondado === 0 ? 'exato' : diff < 0 ? 'abaixo' : 'acima'),
    },
    sim,
  };
}

/**
 * Texto com concordância: "falta 1 pt" / "faltam N pts para o corte" / "1 pt de folga" / "N pts de folga".
 */
export function formatDistanciaLabel(pontos, situacao) {
  if (situacao === 'exato' || pontos === 0) return 'no corte de segurança';
  if (situacao === 'abaixo') return pontos === 1 ? 'falta 1 pt' : `faltam ${pontos} pts para o corte`;
  return pontos === 1 ? '1 pt de folga' : `${pontos} pts de folga`;
}

/** "29" · "<1" · ">99": evita falsa precisão nos extremos. */
export function formatarRisco(pct) {
  if (pct < 1) return '<1';
  if (pct > 99) return '>99';
  return String(Math.round(pct));
}
