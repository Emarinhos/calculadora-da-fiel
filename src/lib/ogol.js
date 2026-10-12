/**
 * Leitura das páginas do ogol.com.br (fonte dos resultados e da tabela). Funções puras sobre o HTML já baixado.
 * Quem faz as requisições é scripts/atualizar-resultados.mjs.
 */

export const URL_EDICAO = 'https://www.ogol.com.br/edicao/brasileirao-serie-a-2026/210277';
export const urlCalendario = (page) => `${URL_EDICAO}/calendario?fase_in=0&equipa=0&estado=&filtro=&op=calendario&page=${page}`;
/** Páginas do calendário no ogol: 4 = rodadas 16–21, 5 = 21–26, 6 = 26–30, 7 = 31–35, 8 = 36–38. */
export const PAGINAS_CALENDARIO = [4, 5, 6, 7, 8];

/** HTML → texto com as células separadas por "|" (sem script, estilo e tags). */
export function textoDaPagina(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '|')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .replace(/[\s|]*\|[\s|]*/g, '|');
}

/**
 * Jogos de uma página de calendário: [{ rodada, data, hora, mandante, visitante, gm, gv }] só dos que têm placar.
 * Jogo sem placar aparece como "vs" ou "ADI" e é ignorado.
 */
export function lerCalendario(html) {
  const t = textoDaPagina(html);
  const jogos = [];
  const re = /(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})\|([^|]+)\|(\d+)-(\d+)\|([^|]+)\|R(\d+)\|h2h/g;
  for (const m of t.matchAll(re)) {
    jogos.push({ rodada: Number(m[7]), data: m[1], hora: m[2], mandante: m[3].trim(), visitante: m[6].trim(), gm: Number(m[4]), gv: Number(m[5]) });
  }
  return jogos;
}

/** Tabela da página principal da edição: [{ pos, clube, pts, j, gp, gc }]. */
export function lerTabela(html) {
  const t = textoDaPagina(html);
  const i = t.indexOf('|Tabela|P|J|V|E|D|GM|GC|SG|');
  if (i < 0) return [];
  const fim = t.indexOf('ver classifica', i);
  const trecho = t.slice(i, fim > 0 ? fim : undefined);
  const re = /\|(\d{1,2})\|([^|]+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|(\d+)\|[+-]?\d+\|[a-z]/g;
  return [...trecho.matchAll(re)].map((m) => ({ pos: Number(m[1]), clube: m[2].trim(), pts: Number(m[3]), j: Number(m[4]), gp: Number(m[8]), gc: Number(m[9]) }));
}
