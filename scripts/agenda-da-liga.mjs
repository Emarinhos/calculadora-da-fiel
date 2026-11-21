// Data, horário e transmissão de TODOS os jogos restantes da liga (o simulador mostra a briga inteira, não só o Corinthians).
//
//   node scripts/agenda-da-liga.mjs [AAAA-MM-DD]
//
// 1) Data e horário: agenda da ESPN, dia a dia, de hoje até DIAS_A_FRENTE (a ESPN responde aos servidores do GitHub e
//    acompanha as remarcações da CBF). Jogo que a ESPN não mostra fica com a data que já tinha.
// 2) Transmissão: matéria do ge "veja onde assistir ao vivo aos jogos da Nª rodada", achada no RSS do Brasileirão. Sai
//    no começo de cada rodada; antes disso a tela mostra "TV a definir". Quando a ESPN não tem o jogo, a data e o horário
//    da matéria também valem. Jogo do Corinthians que a matéria não lista continua com scripts/confirmar-transmissao.mjs.
// Fonte fora do ar não apaga nada: só grava o que leu. Só escreve o arquivo se algum jogo mudou.
import fs from 'node:fs';
import { validarEstado } from '../src/lib/estado.js';
import { atualizarAgenda } from '../src/lib/aplicar.js';
import { somaDias } from '../src/lib/agenda.js';
import { urlPlacar, diaDaEspn, lerAgendaEspn } from '../src/lib/espn.js';
import { lerRodadaGe } from '../src/lib/transmissao-ge.js';

const RSS_BRASILEIRAO = 'https://ge.globo.com/rss/ge/futebol/brasileirao-serie-a/';
const DIAS_A_FRENTE = 21;
const arquivoEstado = new URL('../public/estado.json', import.meta.url);
const UA = { 'user-agent': 'Mozilla/5.0' };

const hojeEmBrasilia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const chave = (g) => `${g.mandante}|${g.visitante}`;
const textoDaPagina = (html) => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&mdash;/g, '—');

async function baixar(url, tipo = 'text') {
  const resp = await fetch(url, { headers: UA });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return tipo === 'json' ? resp.json() : resp.text();
}

/** Matérias de rodada no RSS: [{ rodada, url, ano, mes }]. */
function materiasDeRodada(xml) {
  const itens = [];
  for (const [, bloco] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const titulo = bloco.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
    const url = (bloco.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '').trim();
    const r = titulo.match(/onde assistir[^<]*?jogos da (\d{1,2})ª rodada/i);
    const d = url.match(/\/noticia\/(\d{4})\/(\d{2})\/\d{2}\//);
    if (r && d) itens.push({ rodada: Number(r[1]), url, ano: Number(d[1]), mes: Number(d[2]) });
  }
  return itens;
}

async function main() {
  const estado = JSON.parse(fs.readFileSync(arquivoEstado, 'utf8'));
  const hoje = process.argv[2] || hojeEmBrasilia();
  const jogos = estado.liga.jogos;
  const clubes = estado.liga.tabela.map((t) => t.clube);
  const porChave = new Map(jogos.map((g) => [chave(g), g]));
  const agenda = new Map(); // chave → campos novos

  // 1) ESPN: data e horário (inclui ontem: jogo adiado ou remarcado para trás ainda aparece)
  let diasLidos = 0;
  for (let i = -1; i <= DIAS_A_FRENTE; i++) {
    const dia = diaDaEspn(somaDias(hoje, i));
    try {
      for (const a of lerAgendaEspn(await baixar(urlPlacar(dia), 'json'))) {
        const g = porChave.get(chave(a));
        if (g) agenda.set(chave(g), { rodada: g.rodada, mandante: g.mandante, visitante: g.visitante, data: a.data, hora: a.hora });
      }
      diasLidos++;
    } catch (e) {
      console.error(`aviso: ESPN ${dia}: ${e.message}`);
    }
  }
  console.log(`ESPN: ${diasLidos} dias lidos, ${agenda.size} de ${jogos.length} jogos com data.`);

  // 2) ge: transmissão das rodadas que ainda têm jogo
  const rodadas = new Set(jogos.map((g) => g.rodada));
  let materias = [];
  try {
    materias = materiasDeRodada(await baixar(RSS_BRASILEIRAO)).filter((m) => rodadas.has(m.rodada));
  } catch (e) {
    console.error(`aviso: sem o RSS do Brasileirão no ge (${e.message}); transmissão fica como estava.`);
  }
  const vistas = new Set();
  for (const m of materias) {
    if (vistas.has(m.rodada)) continue; // o RSS vem do mais novo para o mais antigo: vale a matéria mais recente
    vistas.add(m.rodada);
    try {
      const lidos = lerRodadaGe(textoDaPagina(await baixar(m.url)), clubes, m.ano, m.mes);
      let comTv = 0;
      for (const l of lidos) {
        const g = porChave.get(chave(l));
        if (!g) continue;
        const item = agenda.get(chave(g)) ?? { rodada: g.rodada, mandante: g.mandante, visitante: g.visitante };
        if (item.data === undefined && l.data) { item.data = l.data; item.hora = l.hora; }
        if (l.tv || l.streaming) {
          item.tv = l.tv;
          item.streaming = l.streaming;
          item.tvConsultadaEm = hoje;
          comTv++;
        }
        agenda.set(chave(g), item);
      }
      console.log(`ge R${m.rodada}: ${lidos.length} jogos na matéria, ${comTv} com transmissão (${m.url})`);
    } catch (e) {
      console.error(`aviso: ge R${m.rodada}: não consegui ler a matéria (${e.message}).`);
    }
  }

  // Só o que mudou: sem isso, a data de atualização mudaria a cada execução
  const mudou = (a) => {
    const g = porChave.get(chave(a));
    return ['data', 'hora', 'tv', 'streaming', 'tvConsultadaEm'].some((c) => a[c] !== undefined && (g[c] ?? null) !== (a[c] ?? null));
  };
  const mudancas = [...agenda.values()].filter(mudou);
  if (!mudancas.length) { console.log('agenda da liga: nada mudou.'); return; }
  for (const a of mudancas) {
    const g = porChave.get(chave(a));
    const antes = [g.data, g.hora, g.tv, g.streaming].map((x) => x ?? '–').join(' ');
    const depois = [a.data ?? g.data, a.hora ?? g.hora, a.tv ?? g.tv, a.streaming ?? g.streaming].map((x) => x ?? '–').join(' ');
    if (antes !== depois) console.log(`R${a.rodada} ${a.mandante} x ${a.visitante}: ${antes} → ${depois}`);
  }

  const novo = atualizarAgenda(estado, mudancas, hoje);
  const { ok, erros } = validarEstado(novo);
  if (!ok) { console.error('NÃO gravei: estado ficaria inválido:\n- ' + erros.join('\n- ')); process.exit(1); }
  fs.writeFileSync(arquivoEstado, JSON.stringify(novo, null, 2) + '\n');
  console.log(`agenda da liga: ${mudancas.length} jogo(s) atualizado(s).`);
}

await main();
