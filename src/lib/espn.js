/**
 * Placares e tabela pela API pública da ESPN (Brasileirão Série A). É a fonte principal da atualização automática porque,
 * diferente do ogol, responde aos servidores do GitHub (o ogol devolve HTTP 403 para eles). Funções puras sobre o JSON já
 * baixado; quem faz as requisições é scripts/atualizar-resultados.mjs.
 */

const BASE = 'https://site.api.espn.com/apis';
export const urlPlacar = (diaAAAAMMDD) => `${BASE}/site/v2/sports/soccer/bra.1/scoreboard?dates=${diaAAAAMMDD}`;
export const URL_TABELA_ESPN = `${BASE}/v2/sports/soccer/bra.1/standings?season=2026`;

/** Como a ESPN escreve alguns clubes, em relação aos nomes da nossa tabela. */
const NOMES = { 'Atlético-MG': 'Atlético Mineiro', 'Athletico-PR': 'Athletico Paranaense', 'Vasco da Gama': 'Vasco' };
export const nomeDaLiga = (nomeEspn) => NOMES[nomeEspn] ?? nomeEspn;

/** 'AAAA-MM-DD' → 'AAAAMMDD', somando `dias` (a ESPN agrupa os jogos da noite no dia seguinte, em UTC). */
export function diaDaEspn(iso, dias = 0) {
  const [a, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, '0')}${String(t.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Jogos de um dia: [{ mandante, visitante, gm, gv, encerrado }]. `encerrado` só é true com o apito final (STATUS_FULL_TIME);
 * jogo em andamento, adiado ou cancelado vem como false e não deve ser aplicado.
 */
export function lerPlacar(json) {
  return (json?.events ?? []).flatMap((e) => {
    const c = e.competitions?.[0];
    const casa = c?.competitors?.find((x) => x.homeAway === 'home');
    const fora = c?.competitors?.find((x) => x.homeAway === 'away');
    if (!casa || !fora) return [];
    const tipo = e.status?.type ?? {};
    return [{
      mandante: nomeDaLiga(casa.team.displayName),
      visitante: nomeDaLiga(fora.team.displayName),
      gm: Number(casa.score),
      gv: Number(fora.score),
      encerrado: tipo.completed === true && tipo.name === 'STATUS_FULL_TIME' && Number.isInteger(Number(casa.score)) && Number.isInteger(Number(fora.score)),
    }];
  });
}

/** Tabela da ESPN: [{ pos, clube, pts, j, gp, gc }] (mesmo formato de lerTabela do ogol). */
export function lerTabelaEspn(json) {
  const entradas = json?.children?.[0]?.standings?.entries ?? [];
  return entradas.map((e) => {
    const v = Object.fromEntries((e.stats ?? []).map((s) => [s.name, s.value]));
    return { pos: Number(v.rank), clube: nomeDaLiga(e.team.displayName), pts: Number(v.points), j: Number(v.gamesPlayed), gp: Number(v.pointsFor), gc: Number(v.pointsAgainst) };
  }).sort((a, b) => a.pos - b.pos);
}
