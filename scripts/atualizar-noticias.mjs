// Atualiza o campo `noticias` de public/estado.json.
//
//   node scripts/atualizar-noticias.mjs [posts-x.json]
//
//  - ge: lê o RSS oficial do Corinthians no ge.globo (título e link; a data vem da URL da matéria).
//  - Meu Timão: lê o RSS do site (a data é a do pubDate, no horário de Brasília).
//  - X (opcional, só rodando local): o agente coleta os posts do @MeuTimao no navegador e passa um arquivo JSON opcional
//    [{ "id": "2108915744087920953", "texto": "..." }]. A data sai do id do post; o texto vira título curto.
//  - Mantém as notícias já gravadas que ainda são recentes, tira repetidas e grava só se o estado ficar válido.
import fs from 'node:fs';
import { validarEstado } from '../src/lib/estado.js';
import { dataDoIdDoX, mesclarNoticias, tituloCurto } from '../src/lib/noticias.js';

const RSS_GE = 'https://ge.globo.com/rss/ge/futebol/times/corinthians/';
const RSS_MEUTIMAO = 'https://www.meutimao.com.br/feed';
const PERFIL_X = 'MeuTimao';
const MESES = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
const arquivoEstado = new URL('../public/estado.json', import.meta.url);

const entidades = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
const decodificar = (s) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => entidades[m]).trim();

/** Itens do RSS do ge: { titulo, fonte, url, data }. A data é a do caminho /noticia/AAAA/MM/DD/ da URL. */
export function noticiasDoRss(xml) {
  const itens = [];
  for (const [, bloco] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const titulo = bloco.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const url = bloco.match(/<link>([\s\S]*?)<\/link>/)?.[1];
    const d = url?.match(/\/noticia\/(\d{4})\/(\d{2})\/(\d{2})\//);
    if (!titulo || !url || !d) continue;
    itens.push({ titulo: tituloCurto(decodificar(titulo)), fonte: 'ge', url: decodificar(url), data: `${d[1]}-${d[2]}-${d[3]}` });
  }
  return itens;
}

/** Itens do RSS do Meu Timão. Data = dia escrito no pubDate ("Sat, 10 Oct 2026 12:47:00 -0300" → 2026-10-10). */
export function noticiasDoRssMeuTimao(xml) {
  const itens = [];
  for (const [, bloco] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const titulo = bloco.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const url = bloco.match(/<link>([\s\S]*?)<\/link>/)?.[1];
    const d = bloco.match(/<pubDate>\s*\w+, (\d{1,2}) (\w{3}) (\d{4})/);
    if (!titulo || !url || !d || !MESES[d[2]]) continue;
    itens.push({ titulo: tituloCurto(decodificar(titulo)), fonte: 'Meu Timão', url: decodificar(url), data: `${d[3]}-${MESES[d[2]]}-${d[1].padStart(2, '0')}` });
  }
  return itens;
}

export function noticiasDoX(posts) {
  return posts
    .filter((p) => /^\d{10,}$/.test(String(p.id)) && p.texto?.trim())
    .map((p) => ({ titulo: tituloCurto(p.texto), fonte: 'Meu Timão', url: `https://x.com/${PERFIL_X}/status/${p.id}`, data: dataDoIdDoX(String(p.id)) }));
}

async function main() {
  const estado = JSON.parse(fs.readFileSync(arquivoEstado, 'utf8'));
  const hoje = new Date().toISOString().slice(0, 10);

  const ler = async (nome, url, parse) => {
    try {
      const resp = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return parse(await resp.text()).slice(0, 8);
    } catch (e) {
      console.error(`aviso: não consegui ler o RSS do ${nome} (${e.message}); mantendo o que já existe.`);
      return [];
    }
  };
  const ge = await ler('ge', RSS_GE, noticiasDoRss);
  const mt = await ler('Meu Timão', RSS_MEUTIMAO, noticiasDoRssMeuTimao);

  const arquivoX = process.argv[2];
  const x = arquivoX ? noticiasDoX(JSON.parse(fs.readFileSync(arquivoX, 'utf8'))) : [];

  const novas = mesclarNoticias([ge, mt, x, estado.noticias ?? []], hoje);
  const proximo = { ...estado, noticias: novas };
  const { ok, erros } = validarEstado(proximo);
  if (!ok) {
    console.error('NÃO gravei: estado ficaria inválido:\n- ' + erros.join('\n- '));
    process.exit(1);
  }
  fs.writeFileSync(arquivoEstado, JSON.stringify(proximo, null, 2) + '\n');
  console.log(`noticias: ${novas.length} gravadas (${ge.length} do ge, ${mt.length} do Meu Timão, ${x.length} do X nesta rodada).`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) await main();
