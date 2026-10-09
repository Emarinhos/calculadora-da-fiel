import { CLUBE, nomeNaLiga, resultadoDoPlacar, validarEstado } from './estado.js';

const clone = (o) => JSON.parse(JSON.stringify(o));

/**
 * Aplica ao estado os resultados de jogos que terminaram:
 *  - atualiza a tabela dos dois times (pontos, jogos, V/E/D, gols);
 *  - remove o jogo de liga.jogos;
 *  - se for do Corinthians, trava o jogo em `jogos` (resultado + placar) e atualiza pontos/jogosDisputados.
 *
 * Funciona só com as contas: nada é "copiado" da tabela do site. Se alguma conta não fechar,
 * lança erro e o chamador não grava nada.
 *
 * @param estado      conteúdo de estado.json
 * @param resultados  [{rodada, mandante, visitante, gm, gv}] (gols do mandante e do visitante)
 * @param hoje        'AAAA-MM-DD'
 */
export function aplicarResultados(estado, resultados, hoje) {
  const novo = clone(estado);
  const linha = (clube) => {
    const t = novo.liga.tabela.find((x) => x.clube === clube);
    if (!t) throw new Error(`clube ${clube} não está na tabela`);
    return t;
  };

  for (const r of resultados) {
    const i = novo.liga.jogos.findIndex(
      (g) => g.rodada === r.rodada && g.mandante === r.mandante && g.visitante === r.visitante
    );
    if (i === -1) throw new Error(`jogo R${r.rodada} ${r.mandante} x ${r.visitante} não está entre os jogos restantes`);
    if (!Number.isInteger(r.gm) || !Number.isInteger(r.gv) || r.gm < 0 || r.gv < 0) {
      throw new Error(`placar inválido em R${r.rodada} ${r.mandante} x ${r.visitante}`);
    }
    novo.liga.jogos.splice(i, 1);

    const casa = linha(r.mandante);
    const fora = linha(r.visitante);
    for (const [t, gp, gc] of [[casa, r.gm, r.gv], [fora, r.gv, r.gm]]) {
      t.j += 1; t.gp += gp; t.gc += gc;
      if (gp > gc) { t.v += 1; t.pts += 3; } else if (gp < gc) t.d += 1; else { t.e += 1; t.pts += 1; }
    }

    if (r.mandante === CLUBE || r.visitante === CLUBE) {
      const aberto = novo.jogos.find((j) => j.resultado === null);
      const adversario = r.mandante === CLUBE ? r.visitante : r.mandante;
      if (!aberto || aberto.rodada !== r.rodada || nomeNaLiga(aberto.adversario) !== adversario) {
        throw new Error(`o jogo do Corinthians R${r.rodada} não é o próximo jogo aberto (ordem das rodadas)`);
      }
      const placar = r.mandante === CLUBE ? { gc: r.gm, ga: r.gv } : { gc: r.gv, ga: r.gm };
      aberto.placar = placar;
      aberto.resultado = resultadoDoPlacar(placar);
      novo.jogosDisputados += 1;
      novo.pontos += { V: 3, E: 1, D: 0 }[aberto.resultado];
    }
  }

  if (hoje) novo.atualizadoEm = hoje;
  return novo;
}

/**
 * Atualiza data/hora/emissora de jogos que ainda faltam (a CBF e as emissoras remarcam).
 * @param agenda [{rodada, mandante, visitante, data?, hora?, tv?}] (só os campos presentes mudam)
 */
export function atualizarAgenda(estado, agenda, hoje) {
  const novo = clone(estado);
  for (const a of agenda) {
    const g = novo.liga.jogos.find((x) => x.rodada === a.rodada && x.mandante === a.mandante && x.visitante === a.visitante);
    if (!g) throw new Error(`agenda: jogo R${a.rodada} ${a.mandante} x ${a.visitante} não está entre os jogos restantes`);
    for (const campo of ['data', 'hora', 'tv']) if (a[campo] !== undefined) g[campo] = a[campo];
  }
  if (hoje) novo.atualizadoEm = hoje;
  return novo;
}

/** Registra a posição medida no fim de uma rodada (e o histórico dela). */
export function registrarPosicao(estado, { rodada, posicao, hoje }) {
  const novo = clone(estado);
  const eu = novo.liga.tabela.find((t) => t.clube === CLUBE);
  novo.posicao = posicao;
  novo.posicaoRodada = rodada;
  novo.posicaoAtualizadaEm = hoje;
  novo.historico = (novo.historico || []).filter((h) => h.rodada !== rodada);
  novo.historico.push({ rodada, posicao, pontos: eu.pts, atualizadoEm: hoje });
  novo.atualizadoEm = hoje;
  return novo;
}

/**
 * Compara a tabela calculada com a tabela de uma fonte externa
 * ([{clube, pts, j, gp?, gc?}]; gols são conferidos quando informados).
 * Retorna a lista de divergências (vazia = tudo bate).
 */
export function compararComFonte(estado, tabelaFonte) {
  const divergencias = [];
  for (const f of tabelaFonte) {
    const t = estado.liga.tabela.find((x) => x.clube === f.clube);
    if (!t) { divergencias.push(`${f.clube}: clube desconhecido`); continue; }
    if (t.pts !== f.pts || t.j !== f.j) {
      divergencias.push(`${f.clube}: calculado ${t.pts} pts em ${t.j} jogos, fonte ${f.pts} pts em ${f.j} jogos`);
    }
    if ((f.gp !== undefined && t.gp !== f.gp) || (f.gc !== undefined && t.gc !== f.gc)) {
      divergencias.push(`${f.clube}: calculado ${t.gp}:${t.gc} gols, fonte ${f.gp}:${f.gc}`);
    }
  }
  return divergencias;
}

/**
 * Posição (1 a 20) de um clube pela tabela do estado, com os critérios da CBF
 * (pontos, vitórias, saldo, gols pró). Empates além disso (confronto direto, cartões)
 * não são resolvidos: nesses casos o chamador deve conferir com a fonte.
 */
export function posicaoCalculada(estado, clube = CLUBE) {
  const chave = (t) => [t.pts, t.v, t.gp - t.gc, t.gp];
  const eu = estado.liga.tabela.find((t) => t.clube === clube);
  const ke = chave(eu);
  const antes = estado.liga.tabela.filter((t) => {
    const k = chave(t);
    for (let i = 0; i < k.length; i++) { if (k[i] !== ke[i]) return k[i] > ke[i]; }
    return false;
  });
  return antes.length + 1;
}

export { validarEstado };
