// Atualiza sozinho, logo depois dos jogos, resultados, tabela, posição e riscos em public/estado.json. Sem depender do Claude.
//
//   node scripts/atualizar-resultados.mjs
//
// Gatilho: o workflow resultados.yml roda de 20 em 20 minutos nos horários de jogo. Este script só age sobre jogos cujo
// apito inicial foi há 115 minutos ou mais (src/lib/resultados-auto.js); se não há nenhum, termina na hora.
// Segurança (a mesma do aplicar-resultados.mjs): só grava se a tabela calculada bater, conta a conta, com a tabela do ogol
// e se o estado final for válido. Qualquer dúvida = não grava e tenta de novo na próxima execução.
import fs from 'node:fs';
import { CLUBE, validarEstado } from '../src/lib/estado.js';
import { aplicarResultados, compararComFonte, posicaoCalculada, registrarPosicao } from '../src/lib/aplicar.js';
import { comRiscos } from '../src/lib/liga.js';
import { URL_EDICAO, PAGINAS_CALENDARIO, urlCalendario, lerCalendario, lerTabela } from '../src/lib/ogol.js';
import { jogosPendentes, resultadosDosPendentes, placarConfirmado, rodadaParaRegistrarPosicao } from '../src/lib/resultados-auto.js';

const arquivoEstado = new URL('../public/estado.json', import.meta.url);
const arquivoLog = new URL('../docs/atualizacoes-estado.md', import.meta.url);
const UA = { 'user-agent': 'Mozilla/5.0' };
const FEEDS_NOTICIAS = ['https://ge.globo.com/rss/ge/futebol/times/corinthians/', 'https://www.meutimao.com.br/feed'];

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

async function main() {
  const estado = JSON.parse(fs.readFileSync(arquivoEstado, 'utf8'));
  // AGORA_ISO só serve para testar o script como se fosse outro horário
  const agora = process.env.AGORA_ISO ? new Date(process.env.AGORA_ISO) : new Date();
  const hoje = emBrasilia(agora);

  const pendentes = jogosPendentes(estado, agora.getTime());
  if (!pendentes.length) { console.log('resultados: nenhum jogo terminou desde a última atualização.'); return; }

  // 1) Placares no ogol (todas as páginas do calendário)
  const lidos = [];
  for (const page of PAGINAS_CALENDARIO) lidos.push(...lerCalendario(await buscar(urlCalendario(page))));
  let resultados = resultadosDosPendentes(pendentes, lidos);
  if (!resultados.length) { console.log(`resultados: ${pendentes.length} jogo(s) por conferir, mas o ogol ainda não tem placar final.`); return; }

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

  // 3) Aplica e confere a tabela inteira contra a do ogol
  const tabelaOgol = lerTabela(await buscar(URL_EDICAO));
  if (tabelaOgol.length !== 20) { console.error(`aviso: tabela do ogol veio com ${tabelaOgol.length} times; não grava.`); return; }
  let novo = aplicarResultados(estado, resultados, hoje);
  const divergencias = compararComFonte(novo, tabelaOgol);
  if (divergencias.length) {
    console.log('resultados: a tabela calculada ainda não bate com a do ogol (provavelmente há jogo em andamento); tento de novo depois:\n- ' + divergencias.slice(0, 5).join('\n- '));
    return;
  }

  // 4) Posição: só no fim da rodada, e só se a calculada bater com a do ogol
  const rodadaFechada = rodadaParaRegistrarPosicao(novo);
  let posicaoTexto = '';
  if (rodadaFechada) {
    const doOgol = tabelaOgol.find((t) => t.clube === CLUBE)?.pos;
    const calculada = posicaoCalculada(novo);
    if (doOgol === calculada) {
      novo = registrarPosicao(novo, { rodada: rodadaFechada, posicao: calculada, hoje });
      posicaoTexto = ` Rodada ${rodadaFechada} encerrada: Corinthians em ${calculada}º.`;
    } else {
      console.log(`resultados: posição calculada (${calculada}º) difere da do ogol (${doOgol}º); não registrei a rodada ${rodadaFechada}.`);
    }
  }

  // 5) Riscos de todos os clubes com a tabela nova
  novo = comRiscos(novo);
  const { ok, erros } = validarEstado(novo);
  if (!ok) { console.error('NÃO gravei: estado ficaria inválido:\n- ' + erros.join('\n- ')); process.exit(1); }

  fs.writeFileSync(arquivoEstado, JSON.stringify(novo, null, 2) + '\n');
  const lista = resultados.map((r) => `${r.mandante} ${r.gm}x${r.gv} ${r.visitante}`).join('; ');
  const linha = `- ${hoje} ${horaEmBrasilia(agora)} (automático): ${lista}.${posicaoTexto} Corinthians: ${novo.pontos} pts em ${novo.jogosDisputados} jogos.`;
  fs.appendFileSync(arquivoLog, `${linha}\n`);
  console.log(`resultados: ${resultados.length} resultado(s) gravado(s).${posicaoTexto}`);
}

await main();
