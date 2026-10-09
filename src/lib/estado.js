import dadosEmbutidos from './estado-embutido.json' with { type: 'json' };

/**
 * Estado real da temporada, mantido em public/estado.json (versao 2).
 *
 *  - pontos / jogosDisputados: tabela do Corinthians JÁ incluindo os jogos travados.
 *  - base: pontos e jogos disputados no início da lista `jogos` (antes do primeiro jogo dela).
 *  - jogos: os jogos do Corinthians a partir de `base`. `resultado` null = ainda aberto;
 *    preenchido = jogo encerrado, travado para o usuário.
 *  - posicao / posicaoRodada: posição na tabela medida no fim da rodada `posicaoRodada`.
 *  - liga.tabela: classificação dos 20 times; liga.jogos: TODOS os jogos que ainda faltam
 *    na liga (a simulação de risco usa isso).
 */

export const TOTAL_RODADAS = 38;
export const CLUBE = 'Corinthians';
const PTS = { V: 3, E: 1, D: 0 };

/** Nomes que o app usa nos jogos do Corinthians, quando diferem dos da tabela da liga. */
const ALIAS_CLUBE = { 'Atlético-MG': 'Atlético Mineiro' };
export const nomeNaLiga = (nome) => ALIAS_CLUBE[nome] || nome;

export function resultadoDoPlacar({ gc, ga }) {
  if (gc > ga) return 'V';
  if (gc < ga) return 'D';
  return 'E';
}

/** Estado embutido no build (cópia de public/estado.json, sincronizada por scripts/sync-embutido.mjs): usado se o arquivo não carregar. */
export const ESTADO_EMBUTIDO = dadosEmbutidos;

const ehInt = (v) => Number.isInteger(v);
const ehData = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

function validarLiga(e, erro) {
  const liga = e.liga;
  if (!liga || !Array.isArray(liga.tabela) || !Array.isArray(liga.jogos)) {
    erro('liga.tabela e liga.jogos são obrigatórios');
    return;
  }
  const { tabela, jogos } = liga;
  if (tabela.length !== 20) erro(`liga.tabela deve ter 20 times (tem ${tabela.length})`);

  const nomes = new Set();
  let somaGp = 0;
  let somaGc = 0;
  tabela.forEach((t, i) => {
    const nome = `liga.tabela[${i}]`;
    if (typeof t.clube !== 'string' || !t.clube || nomes.has(t.clube)) erro(`${nome}: clube ausente ou repetido`);
    nomes.add(t.clube);
    const campos = ['pts', 'j', 'v', 'e', 'd', 'gp', 'gc'];
    if (!campos.every((c) => ehInt(t[c]) && t[c] >= 0)) { erro(`${nome} (${t.clube}): campos numéricos inválidos`); return; }
    if (t.pts !== 3 * t.v + t.e) erro(`${nome} (${t.clube}): pts ${t.pts} ≠ 3×${t.v} + ${t.e}`);
    if (t.j !== t.v + t.e + t.d) erro(`${nome} (${t.clube}): j ${t.j} ≠ v+e+d`);
    somaGp += t.gp;
    somaGc += t.gc;
  });
  if (somaGp !== somaGc) erro(`gols marcados (${somaGp}) e sofridos (${somaGc}) da liga deveriam ser iguais`);
  if (!nomes.has(CLUBE)) erro(`${CLUBE} não está em liga.tabela`);

  const restantes = new Map([...nomes].map((n) => [n, 0]));
  jogos.forEach((g, i) => {
    const nome = `liga.jogos[${i}]`;
    if (!ehInt(g.rodada) || g.rodada < 1 || g.rodada > TOTAL_RODADAS) erro(`${nome}: rodada inválida`);
    if (!nomes.has(g.mandante) || !nomes.has(g.visitante)) erro(`${nome}: clube desconhecido (${g.mandante} x ${g.visitante})`);
    else if (g.mandante === g.visitante) erro(`${nome}: mandante e visitante iguais`);
    else {
      restantes.set(g.mandante, restantes.get(g.mandante) + 1);
      restantes.set(g.visitante, restantes.get(g.visitante) + 1);
    }
  });
  tabela.forEach((t) => {
    if (restantes.has(t.clube) && t.j + restantes.get(t.clube) !== TOTAL_RODADAS) {
      erro(`${t.clube}: ${t.j} jogos + ${restantes.get(t.clube)} restantes ≠ ${TOTAL_RODADAS}`);
    }
  });

  // Coerência com os campos próprios do Corinthians
  const eu = tabela.find((t) => t.clube === CLUBE);
  if (eu) {
    if (eu.pts !== e.pontos) erro(`liga: Corinthians tem ${eu.pts} pts na tabela, mas estado.pontos = ${e.pontos}`);
    if (eu.j !== e.jogosDisputados) erro(`liga: Corinthians tem ${eu.j} jogos na tabela, mas estado.jogosDisputados = ${e.jogosDisputados}`);
  }
  const fixtures = jogos
    .filter((g) => g.mandante === CLUBE || g.visitante === CLUBE)
    .sort((a, b) => a.rodada - b.rodada);
  const abertos = Array.isArray(e.jogos) ? e.jogos.filter((j) => j.resultado === null) : [];
  if (fixtures.length !== abertos.length) {
    erro(`liga.jogos tem ${fixtures.length} jogos do Corinthians, mas estado.jogos tem ${abertos.length} abertos`);
  } else {
    fixtures.forEach((g, i) => {
      const a = abertos[i];
      const adversarioLiga = g.mandante === CLUBE ? g.visitante : g.mandante;
      if (g.rodada !== a.rodada || adversarioLiga !== nomeNaLiga(a.adversario) || (g.mandante === CLUBE) !== a.casa) {
        erro(`jogo aberto R${a.rodada} (${a.adversario}) não bate com liga.jogos (R${g.rodada} ${g.mandante} x ${g.visitante})`);
      }
    });
  }
}

/**
 * Valida o estado. Serve ao app (descarta arquivo corrompido) e à tarefa automática
 * (não grava nada que quebre as invariantes). Retorna { ok, erros }.
 */
export function validarEstado(e) {
  const erros = [];
  const erro = (msg) => erros.push(msg);

  if (!e || typeof e !== 'object') return { ok: false, erros: ['estado não é um objeto'] };
  if (e.versao !== 2) erro('versao deve ser 2');
  if (!ehData(e.atualizadoEm)) erro('atualizadoEm inválido (use AAAA-MM-DD)');
  if (!ehData(e.posicaoAtualizadaEm)) erro('posicaoAtualizadaEm inválido (use AAAA-MM-DD)');
  if (typeof e.fonte !== 'string' || !e.fonte) erro('fonte ausente');

  if (!e.base || !ehInt(e.base.pontos) || !ehInt(e.base.jogosDisputados)) erro('base.pontos e base.jogosDisputados devem ser inteiros');
  if (!ehInt(e.pontos) || e.pontos < 0 || e.pontos > TOTAL_RODADAS * 3) erro('pontos fora do intervalo possível');
  if (!ehInt(e.jogosDisputados) || e.jogosDisputados < 1 || e.jogosDisputados > TOTAL_RODADAS) erro('jogosDisputados inválido');
  if (!ehInt(e.posicao) || e.posicao < 1 || e.posicao > 20) erro('posicao deve estar entre 1 e 20');
  if (!ehInt(e.posicaoRodada) || e.posicaoRodada < 1 || e.posicaoRodada > TOTAL_RODADAS) erro('posicaoRodada inválida');

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

  validarLiga(e, erro);

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
