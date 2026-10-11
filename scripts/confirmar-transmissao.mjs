// Confirma sozinho a transmissão (horário, TV, streaming) dos jogos do Corinthians, sem depender do Claude.
//
//   node scripts/confirmar-transmissao.mjs [AAAA-MM-DD]
//
// Gatilho (src/lib/agenda.js): um dia antes do jogo e, se não confirmou, no dia do jogo. Para cada jogo a
// consultar hoje, procura no RSS do ge a matéria "onde assistir" daquele jogo, lê horário e emissoras e grava
// `hora`, `tv`, `streaming` e `tvConsultadaEm`. Não achou a matéria ou a frase da transmissão: não grava nada
// e tenta de novo na próxima execução (o workflow roda de 2 em 2 horas).
import fs from 'node:fs';
import { validarEstado } from '../src/lib/estado.js';
import { transmissaoAConsultar } from '../src/lib/agenda.js';
import { atualizarAgenda } from '../src/lib/aplicar.js';
import { acharMateria, extrairTransmissao } from '../src/lib/transmissao-ge.js';
import { noticiasDoRss } from './atualizar-noticias.mjs';

const RSS_GE = 'https://ge.globo.com/rss/ge/futebol/times/corinthians/';
const arquivoEstado = new URL('../public/estado.json', import.meta.url);
const UA = { 'user-agent': 'Mozilla/5.0' };

const hojeEmBrasilia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const textoDaPagina = (html) => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"');

async function main() {
  const estado = JSON.parse(fs.readFileSync(arquivoEstado, 'utf8'));
  const hoje = process.argv[2] || hojeEmBrasilia();
  const aConsultar = transmissaoAConsultar(estado, hoje);
  if (!aConsultar.length) { console.log(`transmissão: nada a consultar em ${hoje}.`); return; }

  let itens;
  try {
    const resp = await fetch(RSS_GE, { headers: UA });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    itens = noticiasDoRss(await resp.text());
  } catch (e) {
    console.error(`aviso: sem o RSS do ge (${e.message}); tento de novo na próxima execução.`);
    return;
  }

  const agenda = [];
  for (const j of aConsultar) {
    const materia = acharMateria(itens, j);
    if (!materia) { console.log(`R${j.rodada} ${j.mandante} x ${j.visitante}: matéria "onde assistir" ainda não saiu (${j.motivo}).`); continue; }
    try {
      const resp = await fetch(materia.url, { headers: UA });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { hora, tv, streaming } = extrairTransmissao(textoDaPagina(await resp.text()));
      if (!tv) { console.log(`R${j.rodada}: a matéria não diz onde passa; não gravei.`); continue; }
      const item = { rodada: j.rodada, mandante: j.mandante, visitante: j.visitante, tv, tvConsultadaEm: hoje };
      if (hora) item.hora = hora;
      if (streaming) item.streaming = streaming;
      agenda.push(item);
      console.log(`R${j.rodada} ${j.mandante} x ${j.visitante}: ${hora ?? 'hora mantida'} · TV ${tv}${streaming ? ` · ${streaming}` : ''} (${materia.url})`);
    } catch (e) {
      console.error(`aviso: R${j.rodada}: não consegui ler a matéria (${e.message}).`);
    }
  }
  if (!agenda.length) return;

  const novo = atualizarAgenda(estado, agenda, hoje);
  const { ok, erros } = validarEstado(novo);
  if (!ok) { console.error('NÃO gravei: estado ficaria inválido:\n- ' + erros.join('\n- ')); process.exit(1); }
  fs.writeFileSync(arquivoEstado, JSON.stringify(novo, null, 2) + '\n');
  console.log(`transmissão: ${agenda.length} jogo(s) confirmado(s).`);
}

await main();
