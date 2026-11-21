/**
 * Lê a transmissão (horário, TV, streaming) de um jogo na matéria "onde assistir" do ge.globo.
 * Funções puras: quem busca a página é scripts/confirmar-transmissao.mjs.
 */

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Como o ge costuma escrever o nome do clube no título (além do nome da tabela). */
const APELIDOS = {
  'Atlético Mineiro': ['atletico-mg', 'atletico mineiro'],
  'Athletico Paranaense': ['athletico-pr', 'athletico paranaense'],
  'Red Bull Bragantino': ['bragantino'],
};
export const nomesDoClube = (clube) => [semAcento(clube), ...(APELIDOS[clube] ?? [])];
const cita = (texto, clube) => nomesDoClube(clube).some((n) => semAcento(texto).includes(n));

/**
 * Entre os itens do RSS ({ titulo, url }), acha a matéria "onde assistir" deste jogo:
 * o título cita os dois clubes e "onde assistir", e a URL é de um dia próximo ao do jogo.
 */
export function acharMateria(itens, { mandante, visitante, data }) {
  return itens.find((i) => {
    const t = semAcento(i.titulo);
    const diaNaUrl = i.url.match(/\/noticia\/(\d{4})\/(\d{2})\/(\d{2})\//);
    const dia = diaNaUrl ? `${diaNaUrl[1]}-${diaNaUrl[2]}-${diaNaUrl[3]}` : null;
    return t.includes('onde assistir') && cita(i.titulo, mandante) && cita(i.titulo, visitante) && dia !== null && Math.abs(Date.parse(dia) - Date.parse(data)) <= 2 * 86400000;
  });
}

// Emissoras e plataformas conhecidas: [como aparece no texto, nome gravado, tipo]
const CANAIS = [
  [/tv globo|\bglobo\b/i, 'Globo', 'tv'],
  [/sportv/i, 'SporTV', 'tv'],
  [/premiere/i, 'Premiere', 'tv'],
  [/\bband\b/i, 'Band', 'tv'],
  [/\bsbt\b/i, 'SBT', 'tv'],
  [/record/i, 'Record', 'tv'],
  [/espn/i, 'ESPN', 'tv'],
  [/ge tv/i, 'ge tv', 'streaming'],
  [/globoplay/i, 'Globoplay', 'streaming'],
  [/prime video|amazon/i, 'Prime Video', 'streaming'],
  [/caz[eé]\s?tv/i, 'CazéTV', 'streaming'],
  [/disney\+/i, 'Disney+', 'streaming'],
];

const listar = (nomes) => (nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0] ?? null);

/** Trecho que lista as emissoras → { tv, streaming } (nomes padronizados, na ordem de CANAIS). */
function canais(trecho) {
  const tv = [];
  const streaming = [];
  for (const [re, nome, tipo] of CANAIS) if (re.test(trecho)) (tipo === 'tv' ? tv : streaming).push(nome);
  return { tv: listar(tv), streaming: listar(streaming) };
}

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Matéria do ge "veja onde assistir ao vivo aos jogos da Nª rodada" (texto já sem tags) → um item por jogo:
 * [{ mandante, visitante, data, hora, tv, streaming }]. Cada jogo vem num bloco "Jogo: A x B · Quando: sábado,
 * 21 de novembro; · Horário: 16h30 (de Brasília); · Transmissão: ge TV, TV Globo e Premiere;".
 * @param clubes nomes dos clubes da tabela (o ge escreve "Atlético-MG", "Bragantino" etc.)
 * @param ano    ano da matéria (a data do bloco não traz ano; dezembro → janeiro passa para o ano seguinte)
 * @param mesDaMateria 1–12, para essa virada de ano
 */
export function lerRodadaGe(texto, clubes, ano, mesDaMateria = 1) {
  const limpo = texto.replace(/\s+/g, ' ');
  const padroes = clubes.map((c) => [c, new RegExp(`(?:^|[^a-z])(?:${nomesDoClube(c).map(escapar).join('|')})(?![a-z])`)]);
  const jogos = [];
  for (const bloco of limpo.split(/\bJogo\s*:/).slice(1)) {
    const iQuando = bloco.search(/\bQuando\s*:/);
    if (iQuando < 0) continue;
    // Mandante = o primeiro clube citado antes de "Quando"; visitante = o segundo
    const cabeca = semAcento(bloco.slice(0, iQuando));
    const citados = padroes.map(([c, re]) => [c, cabeca.search(re)]).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]);
    if (citados.length < 2) continue;
    const resto = bloco.slice(iQuando);
    const q = semAcento(resto).match(/quando\s*:\s*(?:[a-z-]+,\s*)?(\d{1,2})\s+de\s+([a-z]+)/);
    const mes = q ? MESES.indexOf(q[2]) + 1 : 0;
    const data = mes ? `${ano + (mes < mesDaMateria ? 1 : 0)}-${String(mes).padStart(2, '0')}-${q[1].padStart(2, '0')}` : null;
    const h = resto.match(/Hor[áa]rio\s*:\s*(\d{1,2})h(\d{2})?/i);
    const tr = resto.match(/Transmiss[ãa]o\s*:\s*([^;]*?)(?:;|\bTempo real\b|$)/i);
    jogos.push({
      mandante: citados[0][0],
      visitante: citados[1][0],
      data,
      hora: h ? `${h[1].padStart(2, '0')}:${h[2] ?? '00'}` : null,
      ...(tr ? canais(tr[1]) : { tv: null, streaming: null }),
    });
  }
  return jogos;
}

/**
 * Texto da matéria (já sem tags) → { hora: 'HH:MM'|null, tv: string|null, streaming: string|null }.
 * Só vale a frase que fala de transmissão ao vivo; sem ela não devolve TV nenhuma.
 */
export function extrairTransmissao(texto) {
  const limpo = texto.replace(/\s+/g, ' ');
  const h = limpo.match(/(?:^|\s)às\s+(\d{1,2})h(\d{2})?/i) ?? limpo.match(/\b(\d{1,2})h(\d{2})?\s*\(de Brasília\)/i);
  const hora = h ? `${h[1].padStart(2, '0')}:${h[2] ?? '00'}` : null;

  const frase = limpo.split(/(?<=[.!?])\s+/).find((f) => /transmit(e|em)\b/i.test(f) && /ao vivo/i.test(f));
  // Só o trecho até "transmitem", que é onde as emissoras vêm listadas
  return { hora, ...canais(frase ? frase.slice(0, frase.search(/transmit(e|em)\b/i) + 10) : '') };
}
