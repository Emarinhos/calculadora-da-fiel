/**
 * Risco de rebaixamento por simulação de Monte Carlo da temporada inteira.
 *
 * Modelo (Poisson, no estilo Maher/Dixon-Coles simplificado):
 *  - força de ataque e de defesa de cada time vem dos gols da própria tabela
 *    (gols marcados e sofridos por jogo), encolhida em direção à média da liga
 *    (poucos jogos = menos confiança);
 *  - gols esperados do mandante = média da liga × fator de mando × ataque(mandante) × defesa(visitante);
 *    idem para o visitante;
 *  - cada jogo restante é sorteado; a tabela final segue os critérios da CBF
 *    (pontos, vitórias, saldo, gols pró);
 *  - risco = fração das simulações em que o clube termina entre os 4 últimos (17º ao 20º).
 *
 * Os sorteios usam números pseudoaleatórios por (simulação, jogo): o resultado é estável
 * (mesmo input = mesmo percentual) e, ao marcar um jogo, só muda o que essa marcação muda.
 *
 * O que o modelo NÃO sabe: lesões, técnico novo, sequência recente, confronto direto como
 * critério de desempate, nem qualquer jogo adiado sem data.
 */

export const PARAMETROS = {
  sims: 20000,
  mandoRazao: 1.3, // gols do mandante / gols do visitante (média da liga)
  encolhimento: 10, // "jogos de confiança" puxando cada time para a média
  maxGols: 8,
  zonaDeRebaixamento: 4,
  semente: 20261009,
};

/** Hash de 32 bits → número em [0, 1). Determinístico por (semente, sim, jogo, slot). */
function aleatorio(semente, sim, jogo, slot) {
  let h = (semente ^ Math.imul(sim + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ Math.imul(jogo + 1, 0x85ebca6b), 0xc2b2ae35) >>> 0;
  h = Math.imul(h ^ Math.imul(slot + 1, 0x27d4eb2f), 0x165667b1) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Força de ataque/defesa relativa à média da liga, com encolhimento. */
export function forcas(tabela, { encolhimento = PARAMETROS.encolhimento } = {}) {
  const jogos = tabela.reduce((s, t) => s + t.j, 0);
  const gols = tabela.reduce((s, t) => s + t.gp, 0);
  const media = gols / jogos; // gols por time por jogo
  const mapa = new Map();
  tabela.forEach((t) => {
    const w = t.j / (t.j + encolhimento);
    mapa.set(t.clube, {
      ataque: w * (t.gp / t.j / media) + (1 - w),
      defesa: w * (t.gc / t.j / media) + (1 - w),
    });
  });
  return { media, mapa };
}

function pmfPoisson(lambda, max) {
  const p = new Float64Array(max + 1);
  p[0] = Math.exp(-lambda);
  for (let k = 1; k <= max; k++) p[k] = (p[k - 1] * lambda) / k;
  return p;
}

function acumulada(pmf) {
  const c = new Float64Array(pmf.length);
  let s = 0;
  for (let i = 0; i < pmf.length; i++) { s += pmf[i]; c[i] = s; }
  c[c.length - 1] = 1; // cauda truncada vai para o último valor
  return c;
}

function sorteia(cdf, u) {
  for (let k = 0; k < cdf.length; k++) if (u <= cdf[k]) return k;
  return cdf.length - 1;
}

/**
 * Distribuição de placares condicionada a um resultado fixo do ponto de vista do `clube`
 * (V/E/D). Usada nos jogos que o usuário marcou: o resultado é dado, o placar é sorteado.
 */
function placaresCondicionados(pmfCasa, pmfFora, resultado, clubeEhMandante) {
  const itens = [];
  let total = 0;
  for (let h = 0; h < pmfCasa.length; h++) {
    for (let a = 0; a < pmfFora.length; a++) {
      const golsClube = clubeEhMandante ? h : a;
      const golsRival = clubeEhMandante ? a : h;
      const res = golsClube > golsRival ? 'V' : golsClube < golsRival ? 'D' : 'E';
      if (res !== resultado) continue;
      const p = pmfCasa[h] * pmfFora[a];
      total += p;
      itens.push({ h, a, p });
    }
  }
  let s = 0;
  const cdf = itens.map((i) => { s += i.p / total; return s; });
  cdf[cdf.length - 1] = 1;
  return { itens, cdf };
}

/**
 * Simula a temporada.
 * @param {object} p
 * @param {Array}  p.tabela  [{clube, pts, j, v, e, d, gp, gc}]
 * @param {Array}  p.jogos   jogos restantes [{rodada, mandante, visitante}]
 * @param {string} p.clube   clube analisado (padrão Corinthians)
 * @param {Object} p.marcas  {indiceDoJogoEmJogos: 'V'|'E'|'D'} resultados fixados do `clube`
 */
export function simular({ tabela, jogos, clube = 'Corinthians', marcas = {}, sims = PARAMETROS.sims, parametros = PARAMETROS }) {
  const n = tabela.length;
  const idx = new Map(tabela.map((t, i) => [t.clube, i]));
  const alvo = idx.get(clube);
  if (alvo === undefined) throw new Error(`clube ${clube} não está na tabela`);

  const { mapa } = forcas(tabela, { encolhimento: parametros.encolhimento });
  const razao = parametros.mandoRazao;
  const media = tabela.reduce((s, t) => s + t.gp, 0) / tabela.reduce((s, t) => s + t.j, 0);
  const mediaCasa = (media * 2 * razao) / (1 + razao);
  const mediaFora = (media * 2) / (1 + razao);

  // Pré-cálculo por jogo: índices, distribuições acumuladas e, se marcado, placares condicionados
  const prep = jogos.map((g, i) => {
    const m = mapa.get(g.mandante);
    const v = mapa.get(g.visitante);
    const pmfCasa = pmfPoisson(mediaCasa * m.ataque * v.defesa, parametros.maxGols);
    const pmfFora = pmfPoisson(mediaFora * v.ataque * m.defesa, parametros.maxGols);
    const base = { casa: idx.get(g.mandante), fora: idx.get(g.visitante), cdfCasa: acumulada(pmfCasa), cdfFora: acumulada(pmfFora) };
    const marca = marcas[i];
    if (marca && (base.casa === alvo || base.fora === alvo)) {
      base.cond = placaresCondicionados(pmfCasa, pmfFora, marca, base.casa === alvo);
    }
    return base;
  });

  const ptsIni = tabela.map((t) => t.pts);
  const vitIni = tabela.map((t) => t.v);
  const sgIni = tabela.map((t) => t.gp - t.gc);
  const gpIni = tabela.map((t) => t.gp);

  const pts = new Int32Array(n), vit = new Int32Array(n), sg = new Int32Array(n), gp = new Int32Array(n);
  const chave = new Float64Array(n);
  const ordem = new Float64Array(n);
  const zona = parametros.zonaDeRebaixamento;
  const corteIdx = n - zona - 1; // posição (0-based) do último time fora da zona = 16º

  let rebaixados = 0;
  let somaPontos = 0;
  const histCorte = new Int32Array(200);
  const histPtsFinais = new Int32Array(200);
  const histPtsRebaixado = new Int32Array(200);
  const histPosicao = new Int32Array(n + 1);

  for (let s = 0; s < sims; s++) {
    for (let t = 0; t < n; t++) { pts[t] = ptsIni[t]; vit[t] = vitIni[t]; sg[t] = sgIni[t]; gp[t] = gpIni[t]; }

    for (let g = 0; g < prep.length; g++) {
      const q = prep[g];
      let gc, gf;
      if (q.cond) {
        const u = aleatorio(parametros.semente, s, g, 0);
        let k = 0;
        while (k < q.cond.cdf.length - 1 && u > q.cond.cdf[k]) k++;
        gc = q.cond.itens[k].h; gf = q.cond.itens[k].a;
      } else {
        gc = sorteia(q.cdfCasa, aleatorio(parametros.semente, s, g, 0));
        gf = sorteia(q.cdfFora, aleatorio(parametros.semente, s, g, 1));
      }
      gp[q.casa] += gc; gp[q.fora] += gf;
      sg[q.casa] += gc - gf; sg[q.fora] += gf - gc;
      if (gc > gf) { pts[q.casa] += 3; vit[q.casa] += 1; }
      else if (gc < gf) { pts[q.fora] += 3; vit[q.fora] += 1; }
      else { pts[q.casa] += 1; pts[q.fora] += 1; }
    }

    // Critérios: pontos, vitórias, saldo, gols pró (+ jitter mínimo contra empate total)
    for (let t = 0; t < n; t++) {
      chave[t] = ((pts[t] * 100 + vit[t]) * 1000 + (sg[t] + 300)) * 1000 + gp[t] + aleatorio(parametros.semente, s, 9999, t) * 0.5;
    }
    let acima = 0;
    for (let t = 0; t < n; t++) if (chave[t] > chave[alvo]) acima++;
    const posicao = acima + 1;
    histPosicao[posicao] += 1;
    histPtsFinais[pts[alvo]] += 1;
    somaPontos += pts[alvo];
    if (posicao > n - zona) { rebaixados++; histPtsRebaixado[pts[alvo]] += 1; }

    // Pontos do 16º colocado (o "corte" real daquela simulação)
    for (let t = 0; t < n; t++) ordem[t] = chave[t];
    ordem.sort();
    const chave16 = ordem[n - 1 - corteIdx]; // ordem crescente: 16º colocado = (n-16)-ésimo
    // recupera os pontos pela chave: pts = floor(chave / 1e8)
    histCorte[Math.floor(chave16 / 1e8)] += 1;
  }

  const mediana = (hist) => {
    let acum = 0;
    const metade = sims / 2;
    for (let k = 0; k < hist.length; k++) { acum += hist[k]; if (acum >= metade) return k; }
    return 0;
  };

  // P(rebaixamento | pontos finais = k)
  const riscoPorPontos = (k) => (histPtsFinais[k] > 0 ? histPtsRebaixado[k] / histPtsFinais[k] : null);

  return {
    risco: (rebaixados / sims) * 100,
    projecao: somaPontos / sims,
    corte: mediana(histCorte),
    sims,
    histPtsFinais,
    histPtsRebaixado,
    histPosicao,
    riscoPorPontos,
  };
}

/**
 * Total final de pontos a partir do qual o risco condicional cai abaixo de `alvo`
 * (fração, ex.: 0.30): 1 + o maior total com risco condicional >= alvo.
 * Ignora totais com poucas simulações para não depender de ruído.
 */
export function pontosParaRisco(resultado, alvo, { minimo = 100 } = {}) {
  const { histPtsFinais, histPtsRebaixado } = resultado;
  let limite = null;
  let primeiro = null;
  for (let k = 0; k < histPtsFinais.length; k++) {
    const n = histPtsFinais[k];
    if (n < minimo) continue;
    if (primeiro === null) primeiro = k;
    if (histPtsRebaixado[k] / n >= alvo) limite = k;
  }
  return limite === null ? primeiro : limite + 1;
}
