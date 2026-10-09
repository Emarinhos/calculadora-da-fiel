import { CLUBE } from './estado.js';
import { simular, pontosParaRisco, probabilidadesDoJogo } from './simulacao.js';
import { transmissaoConfirmada } from './agenda.js';

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

/**
 * Data, horário, emissora e streaming dos jogos ABERTOS do Corinthians, na mesma ordem dos jogos
 * abertos de estado.jogos. Campos ausentes vêm como null (a tela mostra "a definir").
 * `confirmada` = a transmissão já foi consultada no dia anterior ao jogo (ver tvConsultadaEm);
 * antes disso o que aparece é preliminar.
 */
export function transmissaoDosAbertos(estado) {
  return fixturesDoClube(estado).map((i) => {
    const g = estado.liga.jogos[i];
    return {
      data: g.data ?? null,
      hora: g.hora ?? null,
      tv: g.tv ?? null,
      streaming: g.streaming ?? null,
      confirmada: transmissaoConfirmada(g),
    };
  });
}

/**
 * Cenário realista: o resultado mais provável de cada jogo aberto do Corinthians, ajustado
 * para que a soma de pontos feche exatamente com a projeção (pontos esperados, arredondados).
 * É a combinação de V/E/D de maior probabilidade conjunta com esse total de pontos.
 * @returns {{resultados: string[], pontos: number}} resultados na ordem dos jogos abertos
 */
export function cenarioRealista(estado) {
  const indices = fixturesDoClube(estado);
  const probs = indices.map((i) => probabilidadesDoJogo({ tabela: estado.liga.tabela, jogo: estado.liga.jogos[i] }));
  const n = probs.length;
  if (n === 0) return { resultados: [], pontos: 0 };

  const esperado = probs.reduce((s, p) => s + 3 * p.V + p.E, 0);
  const valores = { V: 3, E: 1, D: 0 };
  const log = (x) => Math.log(Math.max(x, 1e-12));

  // dp[i][s] = melhor log-probabilidade conjunta com os i primeiros jogos somando s pontos
  const max = 3 * n;
  const dp = Array.from({ length: n + 1 }, () => new Array(max + 1).fill(-Infinity));
  const veio = Array.from({ length: n + 1 }, () => new Array(max + 1).fill(null));
  dp[0][0] = 0;
  for (let i = 0; i < n; i++) {
    for (let s = 0; s <= max; s++) {
      if (dp[i][s] === -Infinity) continue;
      for (const r of ['V', 'E', 'D']) {
        const t = s + valores[r];
        const v = dp[i][s] + log(probs[i][r]);
        if (t <= max && v > dp[i + 1][t]) { dp[i + 1][t] = v; veio[i + 1][t] = { r, de: s }; }
      }
    }
  }

  // total alvo: o mais próximo da projeção entre os totais alcançáveis
  let alvo = Math.min(max, Math.round(esperado));
  for (let d = 0; d <= max; d++) {
    if (alvo + d <= max && dp[n][alvo + d] > -Infinity) { alvo += d; break; }
    if (alvo - d >= 0 && dp[n][alvo - d] > -Infinity) { alvo -= d; break; }
  }

  const resultados = new Array(n);
  let s = alvo;
  for (let i = n; i >= 1; i--) {
    const passo = veio[i][s];
    resultados[i - 1] = passo.r;
    s = passo.de;
  }
  return { resultados, pontos: alvo };
}

/** "29" · "<1" · ">99": evita falsa precisão nos extremos. */
export function formatarRisco(pct) {
  if (pct < 1) return '<1';
  if (pct > 99) return '>99';
  return String(Math.round(pct));
}
