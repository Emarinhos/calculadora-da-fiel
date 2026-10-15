// Atualiza sozinho, logo depois dos jogos, resultados, tabela, posição e riscos em public/estado.json. Sem depender do Claude.
//
//   node scripts/atualizar-resultados.mjs
//
// Gatilho: o workflow resultados.yml. Este script só age sobre jogos cujo apito inicial foi há MINUTOS_ATE_FIM minutos ou mais
// (src/lib/resultados-auto.js); se não há nenhum, termina na hora.
// Fontes, em ordem: ESPN (API pública, aceita os servidores do GitHub; diz se o jogo terminou) e ogol (reserva; bloqueia os
// servidores do GitHub com HTTP 403, mas funciona rodando local). O jogo do Corinthians exige uma segunda fonte (notícias).
// Segurança (a mesma do aplicar-resultados.mjs): só grava se a tabela calculada bater, conta a conta, com a tabela da fonte
// e se o estado final for válido. Qualquer dúvida = não grava e tenta de novo na próxima execução.
// Alerta: se NENHUMA fonte responde e há jogo encerrado há mais de HORAS_ATE_ALERTAR sem resultado, a execução falha de
// propósito (o GitHub avisa por e-mail). Fonte fora do ar por pouco tempo é só aviso.
import fs from 'node:fs';
import { CLUBE, validarEstado } from '../src/lib/estado.js';
import { aplicarResultados, compararComFonte, posicaoCalculada, registrarPosicao } from '../src/lib/aplicar.js';
import { comRiscos } from '../src/lib/liga.js';
import { inicioDoJogo } from '../src/lib/agenda.js';
import { URL_EDICAO, PAGINAS_CALENDARIO, urlCalendario, lerCalendario, lerTabela } from '../src/lib/ogol.js';
import { urlPlacar, diaDaEspn, lerPlacar, URL_TABELA_ESPN, lerTabelaEspn } from '../src/lib/espn.js';
import { jogosPendentes, resultadosDosPendentes, placarConfirmado, rodadaParaRegistrarPosicao, MINUTOS_ATE_FIM, MINUTOS_ATE_FIM_OGOL } from '../src/lib/resultados-auto.js';

const arquivoEstado = new URL('../public/estado.json', import.meta.url);
const arquivoLog = new URL('../docs/atualizacoes-estado.md', import.meta.url);
const UA = { 'user-agent': 'Mozilla/5.0' };
const FEEDS_NOTICIAS = ['https://ge.globo.com/rss/ge/futebol/times/corinthians/', 'https://www.meutimao.com.br/feed'];
const HORAS_ATE_ALERTAR = 8;

const buscar = async (url) => {
  const resp = await fetch(url, { headers: UA });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} em ${url}`);
  return resp.text();
};
const emBrasilia = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
const horaEmBrasilia = (d) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d);

/** Itens (título + descrição, sem tags) dos feeds de notícia, para a segunda fonte do jogo do Corinthians. */
async function textosDeNoticias() {
  const textos = [];
  for (const url of FEEDS_NOTICIAS) {
    try {
      const xml = await buscar(url);
      for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        textos.push(item.replace(/<!\[CDATA\[|\]\]>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' '));
      }
    } catch (e) {
      console.error(`aviso: sem o feed ${url} (${e.message})`);
    }
  }
  return textos;
}

// Cada fonte entrega os placares dos jogos pendentes ([{ rodada, mandante, visitante, gm, gv }], só encerrados) e a tabela
const FONTES = [
  {
    nome: 'ESPN',
    async placares(pendentes) {
      const dias = new Set(pendentes.flatMap((g) => [diaDaEspn(g.data), diaDaEspn(g.data, 1)]));
      const lidos = [];
      for (const dia of dias) lidos.push(...lerPlacar(JSON.parse(await buscar(urlPlacar(dia)))));
      const porPar = new Map(pendentes.map((g) => [`${g.mandante}|${g.visitante}`, g]));
      return lidos
        .filter((l) => l.encerrado && porPar.has(`${l.mandante}|${l.visitante}`))
        .map((l) => ({ rodada: porPar.get(`${l.mandante}|${l.visitante}`).rodada, mandante: l.mandante, visitante: l.visitante, gm: l.gm, gv: l.gv }));
    },
    async tabela() { return lerTabelaEspn(JSON.parse(await buscar(URL_TABELA_ESPN))); },
  },
  {
    nome: 'ogol',
    minutos: MINUTOS_ATE_FIM_OGOL, // sem aviso de "encerrado": espera mais para não pegar jogo em andamento
    async placares(pendentes) {
      const lidos = [];
      for (const page of PAGINAS_CALENDARIO) lidos.push(...lerCalendario(await buscar(urlCalendario(page))));
      return resultadosDosPendentes(pendentes, lidos);
    },
    async tabela() { return lerTabela(await buscar(URL_EDICAO)); },
  },
];

/** Tenta cada fonte em ordem; devolve a primeira que responde (mesmo com lista vazia) ou null se todas falharem. */
async function primeiraQueResponde(nomeDaTarefa, tarefa) {
  for (const fonte of FONTES) {
    try {
      return { fonte, valor: await tarefa(fonte) };
    } catch (e) {
      console.error(`aviso: ${nomeDaTarefa} pela ${fonte.nome} falhou (${e.message}).`);
    }
  }
  return null;
}

async function main() {
  const estado = JSON.parse(fs.readFileSync(arquivoEstado, 'utf8'));
  // AGORA_ISO só serve para testar o script como se fosse outro horário
  const agora = process.env.AGORA_ISO ? new Date(process.env.AGORA_ISO) : new Date();
  const hoje = emBrasilia(agora);

  const pendentes = jogosPendentes(estado, agora.getTime());
  if (!pendentes.length) { console.log('resultados: nenhum jogo terminou desde a última atualização.'); return; }

  // 1) Placares
  const lido = await primeiraQueResponde('leitura dos placares', (fonte) => {
    const aptos = fonte.minutos ? jogosPendentes(estado, agora.getTime(), fonte.minutos) : pendentes;
    return aptos.length ? fonte.placares(aptos) : [];
  });
  if (!lido) {
    const maisAntigo = Math.min(...pendentes.map((g) => inicioDoJogo(g)));
    const horas = (agora.getTime() - maisAntigo) / 3600000;
    if (horas > HORAS_ATE_ALERTAR) {
      console.error(`ALERTA: nenhuma fonte respondeu e há jogo encerrado há ${Math.round(horas)} h sem resultado aplicado.`);
      process.exit(1);
    }
    console.error('aviso: nenhuma fonte respondeu agora; tento de novo na próxima execução.');
    return;
  }
  let resultados = lido.valor;
  if (!resultados.length) { console.log(`resultados: ${pendentes.length} jogo(s) por conferir, mas a ${lido.fonte.nome} ainda não tem placar final.`); return; }

  // 2) Jogo do Corinthians exige uma segunda fonte; sem ela, ele e os jogos seguintes dele esperam
  const doTime = resultados.filter((r) => r.mandante === CLUBE || r.visitante === CLUBE).sort((a, b) => a.rodada - b.rodada);
  if (doTime.length) {
    const textos = await textosDeNoticias();
    const barrados = [];
    for (const r of doTime) {
      if (barrados.length || !placarConfirmado(textos, r)) {
        barrados.push(r);
        console.log(`resultados: ${r.mandante} ${r.gm}x${r.gv} ${r.visitante} (R${r.rodada}) ainda sem segunda fonte; espero a próxima execução.`);
      }
    }
    resultados = resultados.filter((r) => !barrados.includes(r));
    if (!resultados.length) return;
  }

  // 3) Aplica e confere a tabela inteira contra a da fonte
  const tab = await primeiraQueResponde('leitura da tabela', async (fonte) => {
    const t = await fonte.tabela();
    if (t.length !== 20) throw new Error(`tabela veio com ${t.length} times`);
    return t;
  });
  if (!tab) { console.error('aviso: sem tabela de nenhuma fonte; não grava.'); return; }
  const tabelaFonte = tab.valor;
  let novo = aplicarResultados(estado, resultados, hoje);
  const divergencias = compararComFonte(novo, tabelaFonte);
  if (divergencias.length) {
    console.log(`resultados: a tabela calculada ainda não bate com a da ${tab.fonte.nome} (provavelmente há jogo em andamento ou fonte atrasada); tento de novo depois:\n- ` + divergencias.slice(0, 5).join('\n- '));
    return;
  }

  // 4) Posição: só no fim da rodada, e só se a calculada bater com a da fonte
  const rodadaFechada = rodadaParaRegistrarPosicao(novo);
  let posicaoTexto = '';
  if (rodadaFechada) {
    const daFonte = tabelaFonte.find((t) => t.clube === CLUBE)?.pos;
    const calculada = posicaoCalculada(novo);
    if (daFonte === calculada) {
      novo = registrarPosicao(novo, { rodada: rodadaFechada, posicao: calculada, hoje });
      posicaoTexto = ` Rodada ${rodadaFechada} encerrada: Corinthians em ${calculada}º.`;
    } else {
      console.log(`resultados: posição calculada (${calculada}º) difere da da ${tab.fonte.nome} (${daFonte}º); não registrei a rodada ${rodadaFechada}.`);
    }
  }

  // 5) Riscos de todos os clubes com a tabela nova
  novo = comRiscos(novo);
  const { ok, erros } = validarEstado(novo);
  if (!ok) { console.error('NÃO gravei: estado ficaria inválido:\n- ' + erros.join('\n- ')); process.exit(1); }

  fs.writeFileSync(arquivoEstado, JSON.stringify(novo, null, 2) + '\n');
  const lista = resultados.map((r) => `${r.mandante} ${r.gm}x${r.gv} ${r.visitante}`).join('; ');
  const linha = `- ${hoje} ${horaEmBrasilia(agora)} (automático, ${lido.fonte.nome}): ${lista}.${posicaoTexto} Corinthians: ${novo.pontos} pts em ${novo.jogosDisputados} jogos.`;
  fs.appendFileSync(arquivoLog, `${linha}\n`);
  console.log(`resultados: ${resultados.length} resultado(s) gravado(s) (${lido.fonte.nome}).${posicaoTexto}`);
}

await main();
