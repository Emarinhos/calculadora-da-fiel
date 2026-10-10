/**
 * Últimas notícias (campo opcional `noticias` de public/estado.json).
 *
 * Cada item: { titulo, fonte, url, data }, com `data` AAAA-MM-DD. Só guardamos título curto, veículo,
 * data e o link da matéria/post original; o texto nunca é copiado.
 */

export const MAX_NOTICIAS = 12;
export const IDADE_MAXIMA_DIAS = 7;
export const TAMANHO_TITULO = 120;
const EPOCH_X_MS = 1288834974657; // início da contagem dos ids de post do X

const DIA_MS = 24 * 60 * 60 * 1000;

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Data (AAAA-MM-DD, UTC) embutida no id de um post do X (id >> 22 = ms desde a época do X). */
export function dataDoIdDoX(id) {
  const ms = Number(BigInt(id) >> 22n) + EPOCH_X_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Título de uma linha: tira links, espaços repetidos e corta no limite sem quebrar palavra. */
export function tituloCurto(texto, max = TAMANHO_TITULO) {
  const limpo = String(texto).replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  if (limpo.length <= max) return limpo;
  const corte = limpo.slice(0, max - 1);
  return `${corte.slice(0, corte.lastIndexOf(' ') > 40 ? corte.lastIndexOf(' ') : corte.length).replace(/[\s,;:.-]+$/, '')}…`;
}

/** Junta listas de notícias: sem repetidas (mesmo link), só as recentes, mais novas primeiro. */
export function mesclarNoticias(listas, hoje, { max = MAX_NOTICIAS, idadeMaxDias = IDADE_MAXIMA_DIAS } = {}) {
  const limite = Date.parse(hoje) - idadeMaxDias * DIA_MS;
  const vistas = new Set();
  return listas
    .flat()
    .filter((n) => {
      if (!n || vistas.has(n.url) || Date.parse(n.data) < limite) return false;
      vistas.add(n.url);
      return true;
    })
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
    .slice(0, max);
}

/** Notícias que citam o adversário no título (sem diferenciar acento ou maiúscula). */
export function noticiasDoJogo(noticias, adversario, max = 1) {
  if (!Array.isArray(noticias) || !adversario) return [];
  const alvo = semAcento(adversario);
  return noticias.filter((n) => semAcento(n.titulo).includes(alvo)).slice(0, max);
}

/** Valida o campo `noticias` (opcional). `erro(msg)` recebe cada problema. */
export function validarNoticias(noticias, erro, ehData) {
  if (noticias === undefined) return;
  if (!Array.isArray(noticias)) { erro('noticias deve ser uma lista'); return; }
  if (noticias.length > 30) erro(`noticias tem ${noticias.length} itens (máximo 30)`);
  noticias.forEach((n, i) => {
    const nome = `noticias[${i}]`;
    if (typeof n?.titulo !== 'string' || !n.titulo.trim() || n.titulo.length > 200) erro(`${nome}: titulo ausente ou longo demais`);
    if (typeof n?.fonte !== 'string' || !n.fonte.trim()) erro(`${nome}: fonte ausente`);
    if (typeof n?.url !== 'string' || !/^https:\/\/[^\s]+$/.test(n.url)) erro(`${nome}: url precisa ser https`);
    if (!ehData(n?.data)) erro(`${nome}: data inválida (use AAAA-MM-DD)`);
  });
}
