import { PONTOS_ATUAIS, JOGOS_DISPUTADOS, POSICAO_ATUAL, CORTE_SEGURANCA, INITIAL_GAMES } from './data.js';

/**
 * Estado real da temporada, mantido em public/estado.json.
 *
 *  - pontos / jogosDisputados: tabela do Corinthians JÁ incluindo os jogos travados.
 *  - base: pontos e jogos disputados no início da lista `jogos` (antes do primeiro jogo dela).
 *  - jogos: os jogos restantes da temporada em ordem. `resultado` null = ainda aberto;
 *    preenchido = jogo encerrado, travado para o usuário.
 *  - posicao / posicaoRodada: posição na tabela medida no fim da rodada `posicaoRodada`.
 */

export const TOTAL_RODADAS = 38;
const PTS = { V: 3, E: 1, D: 0 };

export function resultadoDoPlacar({ gc, ga }) {
  if (gc > ga) return 'V';
  if (gc < ga) return 'D';
  return 'E';
}

/** Estado embutido: usado se o arquivo não carregar ou for inválido. */
export const ESTADO_EMBUTIDO = {
  versao: 1,
  atualizadoEm: '2026-10-09',
  fonte: 'ogol.com.br',
  base: { pontos: PONTOS_ATUAIS, jogosDisputados: JOGOS_DISPUTADOS },
  pontos: PONTOS_ATUAIS,
  jogosDisputados: JOGOS_DISPUTADOS,
  posicao: POSICAO_ATUAL,
  posicaoRodada: JOGOS_DISPUTADOS,
  posicaoAtualizadaEm: '2026-10-09',
  corte: CORTE_SEGURANCA,
  jogos: INITIAL_GAMES.map((g, i) => ({
    id: g.id,
    rodada: JOGOS_DISPUTADOS + 1 + i,
    adversario: g.opponent,
    casa: g.home,
    resultado: null,
    placar: null,
  })),
  historico: [],
};

const ehInt = (v) => Number.isInteger(v);
const ehData = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/**
 * Valida o estado. Serve ao app (descarta arquivo corrompido) e à tarefa automática
 * (não grava nada que quebre as invariantes). Retorna { ok, erros }.
 */
export function validarEstado(e) {
  const erros = [];
  const erro = (msg) => erros.push(msg);

  if (!e || typeof e !== 'object') return { ok: false, erros: ['estado não é um objeto'] };
  if (e.versao !== 1) erro('versao deve ser 1');
  if (!ehData(e.atualizadoEm)) erro('atualizadoEm inválido (use AAAA-MM-DD)');
  if (!ehData(e.posicaoAtualizadaEm)) erro('posicaoAtualizadaEm inválido (use AAAA-MM-DD)');
  if (typeof e.fonte !== 'string' || !e.fonte) erro('fonte ausente');

  if (!e.base || !ehInt(e.base.pontos) || !ehInt(e.base.jogosDisputados)) erro('base.pontos e base.jogosDisputados devem ser inteiros');
  if (!ehInt(e.pontos) || e.pontos < 0 || e.pontos > TOTAL_RODADAS * 3) erro('pontos fora do intervalo possível');
  if (!ehInt(e.jogosDisputados) || e.jogosDisputados < 1 || e.jogosDisputados > TOTAL_RODADAS) erro('jogosDisputados inválido');
  if (!ehInt(e.posicao) || e.posicao < 1 || e.posicao > 20) erro('posicao deve estar entre 1 e 20');
  if (!ehInt(e.posicaoRodada) || e.posicaoRodada < 1 || e.posicaoRodada > TOTAL_RODADAS) erro('posicaoRodada inválida');
  if (!ehInt(e.corte) || e.corte < 20 || e.corte > 90) erro('corte inválido');

  if (!Array.isArray(e.jogos) || e.jogos.length === 0) {
    erro('jogos deve ser uma lista não vazia');
    return { ok: false, erros };
  }

  const ids = new Set();
  let viuAberto = false;
  let travados = 0;
  let somaTravados = 0;
  let rodadaAnterior = 0;

  e.jogos.forEach((j, i) => {
    const nome = `jogos[${i}]`;
    if (!ehInt(j.id) || ids.has(j.id)) erro(`${nome}: id ausente ou repetido`);
    ids.add(j.id);
    if (!ehInt(j.rodada) || j.rodada <= rodadaAnterior || j.rodada > TOTAL_RODADAS) erro(`${nome}: rodada fora de ordem`);
    rodadaAnterior = j.rodada;
    if (typeof j.adversario !== 'string' || !j.adversario) erro(`${nome}: adversario ausente`);
    if (typeof j.casa !== 'boolean') erro(`${nome}: casa deve ser true/false`);

    if (j.resultado === null) {
      viuAberto = true;
      if (j.placar !== null) erro(`${nome}: jogo aberto não pode ter placar`);
    } else if (['V', 'E', 'D'].includes(j.resultado)) {
      if (viuAberto) erro(`${nome}: jogo encerrado depois de um jogo aberto (a ordem das rodadas foi quebrada)`);
      if (!j.placar || !ehInt(j.placar.gc) || !ehInt(j.placar.ga) || j.placar.gc < 0 || j.placar.ga < 0) {
        erro(`${nome}: jogo encerrado precisa de placar {gc, ga}`);
      } else if (resultadoDoPlacar(j.placar) !== j.resultado) {
        erro(`${nome}: resultado ${j.resultado} não bate com o placar ${j.placar.gc}x${j.placar.ga}`);
      }
      travados += 1;
      somaTravados += PTS[j.resultado];
    } else {
      erro(`${nome}: resultado deve ser V, E, D ou null`);
    }
  });

  if (e.base && ehInt(e.base.pontos) && ehInt(e.base.jogosDisputados)) {
    if (e.pontos !== e.base.pontos + somaTravados) {
      erro(`pontos (${e.pontos}) deveria ser base ${e.base.pontos} + jogos encerrados ${somaTravados} = ${e.base.pontos + somaTravados}`);
    }
    if (e.jogosDisputados !== e.base.jogosDisputados + travados) {
      erro(`jogosDisputados (${e.jogosDisputados}) deveria ser ${e.base.jogosDisputados + travados}`);
    }
    if (e.base.jogosDisputados + e.jogos.length !== TOTAL_RODADAS) {
      erro(`base.jogosDisputados + quantidade de jogos deve fechar ${TOTAL_RODADAS}`);
    }
  }

  if (e.historico !== undefined) {
    if (!Array.isArray(e.historico)) erro('historico deve ser uma lista');
    else e.historico.forEach((h, i) => {
      if (!ehInt(h.rodada) || !ehInt(h.posicao) || !ehInt(h.pontos) || !ehData(h.atualizadoEm)) erro(`historico[${i}] inválido`);
    });
  }

  return { ok: erros.length === 0, erros };
}

/** Jogos no formato que o app usa. `locked` = encerrado e fixo. */
export function jogosDoApp(estado) {
  return estado.jogos.map((j) => ({
    id: j.id,
    rodada: j.rodada,
    opponent: j.adversario,
    home: j.casa,
    result: j.resultado,
    locked: j.resultado !== null,
    placar: j.placar,
  }));
}

/** Contexto numérico do modelo de risco. */
export function contextoDe(estado) {
  return { pontos: estado.pontos, jogosDisputados: estado.jogosDisputados, corte: estado.corte };
}

/**
 * Carrega public/estado.json. Se falhar ou for inválido, usa o estado embutido
 * e informa o motivo em `aviso`.
 */
export async function carregarEstado({ url = '/estado.json', fetchImpl = globalThis.fetch } = {}) {
  try {
    const resp = await fetchImpl(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const dados = await resp.json();
    const { ok, erros } = validarEstado(dados);
    if (!ok) throw new Error(`estado inválido: ${erros[0]}`);
    return { estado: dados, origem: 'arquivo', aviso: null };
  } catch (err) {
    return { estado: ESTADO_EMBUTIDO, origem: 'embutido', aviso: String(err.message || err) };
  }
}
